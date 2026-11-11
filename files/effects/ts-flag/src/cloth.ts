/*
 * @file    cloth.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   3D cloth: a grid of points moved by Verlet integration and held by links
 *
 *          Every point remembers its previous position, so its speed is (pos - prev).
 *          A step moves the free points with their speed and the forces (gravity, wind),
 *          then the links are relaxed a few times: each link pulls or pushes its two ends
 *          back to its rest length. The links cannot stretch, so the cloth never explodes
 *          and keeps its size whatever the forces.
 *
 *          The first column (x = origin.x) is pinned to the pole. A few passes are not enough
 *          to carry the pole's hold along 30 links, so each point is also tied to every pinned
 *          point by a "long range attachment" (Kim, Chentanez, Müller 2012): it can never be
 *          further from a pinned point than it is at rest (it can come closer, when the cloth folds).
 */

//----- imports
import { Point3D } from "library/core/interfaces";

//----- globals
export const SUBSTEPS = 16; // sub-steps per step (forces are 1/SUBSTEPS^2 each)
export const ITERATIONS = 2; // link relaxation passes per sub-step
const DAMPING = 0.99; // fraction of the speed kept from one step to the next
const SUB_DAMPING = Math.pow(DAMPING, 1 / SUBSTEPS); // same, per sub-step
const SHEAR = 0.5; // stiffness of the diagonal links (fraction of the correction applied)
const BEND = 0.1; // stiffness of the links 2 apart: soft, so the cloth can fold
const ANCHORS = 3; // long range attachments per point
const SKIN = 0.1; // drag of the wind along the cloth (pulls the hanging flag out)
const EPSILON = 1e-9; // below this, a length or a normal is degenerate
const RIPPLE = 0.02; // rest pose ripple in z (fraction of the spacing): lets the cloth fold out of its plane

//----- interfaces
// force per unit of cloth surface, along the wind direction (acceleration per step)
export interface Wind {
    x: number;
    y: number;
    z: number;
}

//----- class
export class Cloth {
    //----- members
    public readonly cols: number; // grid size
    public readonly rows: number;
    public readonly pos: Float64Array; // current positions (x, y, z per point)

    private readonly spacing_: number; // distance between two neighbours at rest
    private readonly rest_: Float64Array; // rest pose
    private readonly prev_: Float64Array; // previous positions
    private readonly force_: Float64Array; // wind force per point (scratch)
    private readonly pinned_: Uint8Array; // =1 when the point is attached to the pole

    private readonly linkA_: Uint16Array; // links: first end, second end, rest length
    private readonly linkB_: Uint16Array;
    private readonly linkLen_: Float64Array;
    private readonly structural_: Uint8Array; // =1 for the links between direct neighbours
    private readonly stiffness_: Float64Array; // fraction of the correction applied per pass
    private readonly anchor_: Uint16Array; // long range attachments: point index of the anchor (3 per point)
    private readonly tether_: Float64Array; // ... and its rest distance

    //----- methods
    /* constructor
     *
     * Args:
     *      cols, rows : grid size
     *      spacing    : distance between two neighbours
     *      origin     : position of the top-left point; the cloth lies flat in the plane z = origin.z
     */
    constructor(cols: number, rows: number, spacing: number, origin: Point3D) {
        this.cols = cols;
        this.rows = rows;
        this.spacing_ = spacing;

        const n = cols * rows;
        this.pos = new Float64Array(n * 3);
        this.rest_ = new Float64Array(n * 3);
        this.prev_ = new Float64Array(n * 3);
        this.force_ = new Float64Array(n * 3);
        this.pinned_ = new Uint8Array(n);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                this.rest_[i * 3] = origin.x + c * spacing;
                this.rest_[i * 3 + 1] = origin.y + r * spacing;
                // invisible ripple: a perfectly flat cloth could never leave its plane
                this.rest_[i * 3 + 2] = origin.z + RIPPLE * spacing * Math.sin(c * 1.7 + r * 0.9);
                this.pinned_[i] = c === 0 ? 1 : 0;
            }
        }

        // links: structural (1 apart), shear (diagonals), bend (2 apart),
        // listed from the pole outward so a relaxation pass carries the pole's hold along the cloth
        const a: number[] = [];
        const b: number[] = [];
        const structural: number[] = [];
        const stiffness: number[] = [];
        const add = (c0: number, r0: number, c1: number, r1: number, k: number) => {
            if (c1 >= 0 && c1 < cols && r1 >= 0 && r1 < rows) {
                a.push(r0 * cols + c0);
                b.push(r1 * cols + c1);
                structural.push(k === 1 ? 1 : 0);
                stiffness.push(k);
            }
        };
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                add(c, r, c + 1, r, 1);
                add(c, r, c, r + 1, 1);
                add(c, r, c + 1, r + 1, SHEAR);
                add(c, r, c + 1, r - 1, SHEAR);
                add(c, r, c + 2, r, BEND);
                add(c, r, c, r + 2, BEND);
            }
        }
        this.linkA_ = Uint16Array.from(a);
        this.linkB_ = Uint16Array.from(b);
        this.structural_ = Uint8Array.from(structural);
        this.stiffness_ = Float64Array.from(stiffness);
        this.linkLen_ = new Float64Array(a.length);
        for (let k = 0; k < a.length; k++) {
            this.linkLen_[k] = this.distance(this.rest_, a[k], b[k]);
        }

        // long range attachments: the top and bottom of the pole, and the pole point of the same row
        this.anchor_ = new Uint16Array(n * ANCHORS);
        this.tether_ = new Float64Array(n * ANCHORS);
        for (let i = 0; i < n; i++) {
            const anchors = [0, (rows - 1) * cols, Math.floor(i / cols) * cols];
            for (let k = 0; k < ANCHORS; k++) {
                this.anchor_[i * ANCHORS + k] = anchors[k];
                this.tether_[i * ANCHORS + k] = this.distance(this.rest_, i, anchors[k]);
            }
        }

        this.reset();
    }

    // back to the rest pose, not moving
    public reset(): void {
        this.pos.set(this.rest_);
        this.prev_.set(this.rest_);
    }

    /* one step of the simulation
     *
     * Args:
     *      gravity : downward acceleration (y down)
     *      wind    : wind force, or null when there is no wind
     */
    public step(gravity: number, wind: Wind | null): void {
        const pos = this.pos;
        const prev = this.prev_;
        const force = this.force_;
        const n = this.cols * this.rows;

        const dt2 = 1 / (SUBSTEPS * SUBSTEPS);

        for (let sub = 0; sub < SUBSTEPS; sub++) {
            force.fill(0);
            if (wind) {
                this.windForces(wind);
            }

            // Verlet: next = pos + speed * DAMPING + acceleration * dt^2
            for (let i = 0; i < n; i++) {
                if (this.pinned_[i]) continue;
                for (let k = i * 3; k < i * 3 + 3; k++) {
                    const p = pos[k];
                    pos[k] = p + (p - prev[k]) * SUB_DAMPING + force[k] * dt2;
                    prev[k] = p;
                }
                pos[i * 3 + 1] += gravity * dt2;
            }

            // links back to their rest length
            for (let it = 0; it < ITERATIONS; it++) {
                this.relax((it & 1) === 1);
                this.attach();
            }
        }
    }

    // the largest relative stretch (or compression) of a link between direct neighbours
    // (the diagonal and bend links get shorter when the cloth folds, that is expected)
    public maxStretch(): number {
        let max = 0;
        for (let k = 0; k < this.linkLen_.length; k++) {
            if (!this.structural_[k]) continue;
            const len = this.distance(this.pos, this.linkA_[k], this.linkB_[k]);
            max = Math.max(max, Math.abs(len - this.linkLen_[k]) / this.linkLen_[k]);
        }
        return max;
    }

    // sum of the squared speeds of the points
    public kineticEnergy(): number {
        let sum = 0;
        for (let k = 0; k < this.pos.length; k++) {
            const v = this.pos[k] - this.prev_[k];
            sum += v * v;
        }
        return sum;
    }

    // distance between points a and b of an array of positions
    private distance(p: Float64Array, a: number, b: number): number {
        return Math.hypot(p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]);
    }

    /* wind on every cell: the part of the wind along the cell normal, times the cell area
     * (a cell facing the wind is pushed, a cell edge-on is not), shared by the 4 corners;
     * plus a small drag along the wind on every point
     */
    private windForces(wind: Wind): void {
        const { cols, rows, pos } = this;
        const force = this.force_;
        const scale = 1 / (2 * this.spacing_ * this.spacing_);

        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const i00 = (r * cols + c) * 3;
                const i10 = i00 + 3;
                const i01 = i00 + cols * 3;
                const i11 = i01 + 3;

                // normal = cross product of the diagonals (length = 2 x area)
                const ax = pos[i11] - pos[i00];
                const ay = pos[i11 + 1] - pos[i00 + 1];
                const az = pos[i11 + 2] - pos[i00 + 2];
                const bx = pos[i01] - pos[i10];
                const by = pos[i01 + 1] - pos[i10 + 1];
                const bz = pos[i01 + 2] - pos[i10 + 2];
                const nx = ay * bz - az * by;
                const ny = az * bx - ax * bz;
                const nz = ax * by - ay * bx;
                const len = Math.hypot(nx, ny, nz);
                if (len < EPSILON) continue;

                // n (n.w) / (2 |n| spacing^2), shared by the 4 corners
                const k = ((nx * wind.x + ny * wind.y + nz * wind.z) * scale) / (len * 4);
                const fx = nx * k;
                const fy = ny * k;
                const fz = nz * k;
                force[i00] += fx;
                force[i00 + 1] += fy;
                force[i00 + 2] += fz;
                force[i10] += fx;
                force[i10 + 1] += fy;
                force[i10 + 2] += fz;
                force[i01] += fx;
                force[i01 + 1] += fy;
                force[i01 + 2] += fz;
                force[i11] += fx;
                force[i11 + 1] += fy;
                force[i11 + 2] += fz;
            }
        }

        for (let i = 0; i < force.length; i += 3) {
            force[i] += wind.x * SKIN;
            force[i + 1] += wind.y * SKIN;
            force[i + 2] += wind.z * SKIN;
        }
    }

    // long range attachments: pull every free point back within its rest distance of each pinned point
    private attach(): void {
        const pos = this.pos;
        const anchor = this.anchor_;
        const tether = this.tether_;

        for (let i = 0; i < this.cols * this.rows; i++) {
            if (this.pinned_[i]) continue;
            const ip = i * 3;
            for (let j = i * ANCHORS; j < (i + 1) * ANCHORS; j++) {
                const ia = anchor[j] * 3;
                const dx = pos[ip] - pos[ia];
                const dy = pos[ip + 1] - pos[ia + 1];
                const dz = pos[ip + 2] - pos[ia + 2];
                const max = tether[j];
                const len2 = dx * dx + dy * dy + dz * dz;
                if (len2 <= max * max) continue;

                const k = max / Math.sqrt(len2);
                pos[ip] = pos[ia] + dx * k;
                pos[ip + 1] = pos[ia + 1] + dy * k;
                pos[ip + 2] = pos[ia + 2] + dz * k;
            }
        }
    }

    // one relaxation pass over all the links, from the pole outward (or backward: alternating the
    // order spreads the corrections both ways)
    private relax(backward: boolean): void {
        const pos = this.pos;
        const pinned = this.pinned_;
        const count = this.linkLen_.length;

        for (let j = 0; j < count; j++) {
            const k = backward ? count - 1 - j : j;
            const a = this.linkA_[k];
            const b = this.linkB_[k];
            const ia = a * 3;
            const ib = b * 3;
            const dx = pos[ib] - pos[ia];
            const dy = pos[ib + 1] - pos[ia + 1];
            const dz = pos[ib + 2] - pos[ia + 2];
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (len < EPSILON) continue;

            const corr = ((len - this.linkLen_[k]) / len) * this.stiffness_[k];
            const pa = pinned[a];
            const pb = pinned[b];
            if (pa && pb) continue;

            // both free: half each; one pinned: the other one does all the move
            const ka = pa ? 0 : pb ? corr : corr * 0.5;
            const kb = pb ? 0 : pa ? corr : corr * 0.5;
            pos[ia] += dx * ka;
            pos[ia + 1] += dy * ka;
            pos[ia + 2] += dz * ka;
            pos[ib] -= dx * kb;
            pos[ib + 1] -= dy * kb;
            pos[ib + 2] -= dz * kb;
        }
    }
}
