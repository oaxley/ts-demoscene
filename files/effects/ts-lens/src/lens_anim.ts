/*
 * @file    lens_anim.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Lens Animation Class
 */

//----- imports
import { Surface } from "library/gfx/surface";

//----- globals
const MARGIN = 2; // extra pixels around the lens for the outer half of the rim

// bubble layers, drawn in this order (same look as the original canvas version)
interface BubbleLayer {
    color: [number, number, number]; // r, g, b
    alpha: number; // layer opacity
    radius: number; // ratio of the lens radius
    width?: number; // stroke width in pixels (undefined: filled disc)
    arc?: [number, number]; // angle range in radians (clockwise from +x, y down)
}

const BUBBLE: BubbleLayer[] = [
    { color: [0, 0, 196], alpha: 0.1, radius: 1 }, // tint
    { color: [128, 128, 196], alpha: 0.5, radius: 1, width: 2 }, // rim
    { color: [0, 0, 144], alpha: 0.2, radius: 0.75, width: 5, arc: [1.7453, 3.536] }, // highlight
];

//----- class
export class LensAnimation {
    //----- members
    private surface_: Surface; // the drawing surface
    private transMap_: Int32Array; // deformation map
    private inv_: Uint16Array; // bubble: background weight (0..256) per pixel
    private add_: Uint32Array; // bubble: premultiplied color per pixel (0x00BBGGRR)
    private src_: Uint32Array; // source pixels (scratch)
    private dst_: Uint32Array; // transformed pixels (scratch)
    private zoom_: number; // lens magnification
    private radius_: number; // lens radius
    private size_: number; // lens box size (diameter + margins)

    //----- methods
    constructor(surface: Surface, radius: number, zoom: number) {
        // set the vars
        this.surface_ = surface;
        this.radius_ = radius;
        this.size_ = radius * 2 + MARGIN * 2;
        this.zoom_ = zoom;

        const length = this.size_ * this.size_;
        this.transMap_ = new Int32Array(length);
        this.inv_ = new Uint16Array(length);
        this.add_ = new Uint32Array(length);
        this.src_ = new Uint32Array(length);
        this.dst_ = new Uint32Array(length);

        // compute the transformation map and the bubble overlay
        this.transMap();
        this.bubble();
    }

    // transformation map
    private transMap(): void {
        // temporary vars
        const d = this.size_;
        const h = this.radius_ + MARGIN; // offset of the lens center in the box
        const r2 = this.radius_ * this.radius_;
        const s = Math.sqrt(r2 - this.zoom_ * this.zoom_);
        const s2 = s * s;

        // compute the map
        for (let y = -h; y < h; y++) {
            const y2 = y * y;

            for (let x = -h; x < h; x++) {
                const x2 = x * x;
                let a = x;
                let b = y;

                // point inside the circle gets magnified
                if (x2 + y2 < s2) {
                    const z = Math.sqrt(r2 - x2 - y2);
                    a = Math.floor((x * this.zoom_) / (z + 0.5));
                    b = Math.floor((y * this.zoom_) / (z + 0.5));
                }

                // transformation map
                this.transMap_[(y + h) * d + (x + h)] = (b + h) * d + (a + h);
            }
        }
    }

    // bubble overlay: composite the layers once, with anti-aliased edges
    private bubble(): void {
        const d = this.size_;
        const h = this.radius_ + MARGIN;
        const clamp = (v: number) => Math.min(1, Math.max(0, v));

        for (let y = -h; y < h; y++) {
            for (let x = -h; x < h; x++) {
                // sample at the pixel center
                const px = x + 0.5;
                const py = y + 0.5;
                const dist = Math.hypot(px, py);

                let angle = Math.atan2(py, px);
                if (angle < 0) angle += 2 * Math.PI;

                // premultiplied color and opacity of the overlay ("source-over")
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;

                for (const layer of BUBBLE) {
                    const radius = layer.radius * this.radius_;
                    let coverage =
                        layer.width === undefined
                            ? clamp(radius + 0.5 - dist)
                            : clamp(layer.width / 2 + 0.5 - Math.abs(dist - radius));

                    if (layer.arc && (angle < layer.arc[0] || angle > layer.arc[1])) {
                        coverage = 0;
                    }

                    const alpha = layer.alpha * coverage;
                    r = layer.color[0] * alpha + r * (1 - alpha);
                    g = layer.color[1] * alpha + g * (1 - alpha);
                    b = layer.color[2] * alpha + b * (1 - alpha);
                    a = alpha + a * (1 - alpha);
                }

                // background weight in 1/256th; rounded down so a channel never exceeds 255
                const i = (y + h) * d + (x + h);
                this.inv_[i] = Math.floor(256 * (1 - a));
                this.add_[i] = (Math.floor(b) << 16) | (Math.floor(g) << 8) | Math.floor(r);
            }
        }
    }

    // compute the lens effect at a certain position
    public compute(xc: number, yc: number): void {
        // temporary vars
        const d = this.size_;

        // ensure values are uint32
        xc = xc >>> 0;
        yc = yc >>> 0;

        // retrieve the upper corner of the lens box
        const xl = xc - this.radius_ - MARGIN;
        const yl = yc - this.radius_ - MARGIN;

        // retrieve the current pixels
        const src = this.src_;
        const dst = this.dst_;
        const map = this.transMap_;
        const inv = this.inv_;
        const add = this.add_;
        this.surface_.readBlock(xl, yl, d, d, src);

        // magnify and blend the bubble over the result
        for (let i = 0; i < dst.length; i++) {
            const p = src[map[i]];
            const k = inv[i];

            if (k === 256) {
                dst[i] = p;
                continue;
            }

            const c = add[i];
            const r = (((p & 0xff) * k) >> 8) + (c & 0xff);
            const g = ((((p >>> 8) & 0xff) * k) >> 8) + ((c >>> 8) & 0xff);
            const b = ((((p >>> 16) & 0xff) * k) >> 8) + ((c >>> 16) & 0xff);
            dst[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
        }

        // apply the transformation
        this.surface_.writeBlock(dst, xl, yl, d, d);
    }
}
