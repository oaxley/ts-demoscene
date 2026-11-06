/*
 * @file    dom.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Minimal browser API stubs to run the effects under Node (tests only)
 *
 * Provides: ImageData, Image (decoding the real assets from disk), a canvas
 * element with a 2D context, `window` and `document.createElement("canvas")`.
 */

//----- imports
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

//----- globals
const ROOT = path.resolve(__dirname, "../..");

//----- ImageData
export class FakeImageData {
    public readonly data: Uint8ClampedArray;
    public readonly width: number;
    public readonly height: number;

    constructor(a: number | Uint8ClampedArray, b: number, c?: number) {
        if (typeof a === "number") {
            this.width = a;
            this.height = b;
            this.data = new Uint8ClampedArray(a * b * 4);
        } else {
            this.data = a;
            this.width = b;
            this.height = c ?? a.length / 4 / b;
        }
    }
}

//----- assets
// map a public URL (/images/assets/<effect>.<file>) back to the source file
export function resolveAsset(url: string): string {
    const m = /^\/images\/assets\/(ts-[^.]+)\.(.+)$/.exec(url);
    if (!m) {
        throw new Error(`Unknown asset URL: ${url}`);
    }
    return path.join(ROOT, "files/effects", m[1], "assets", m[2]);
}

// decode an image file into RGBA pixels
function decode(file: string): { width: number; height: number; data: Uint8ClampedArray } {
    const buffer = fs.readFileSync(file);
    if (file.endsWith(".png")) {
        const png = PNG.sync.read(buffer);
        return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
    }
    const img = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
    return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
}

//----- Image
export class FakeImage {
    public width = 0;
    public height = 0;
    public data: Uint8ClampedArray = new Uint8ClampedArray(0);
    public onload: ((ev: unknown) => void) | null = null;
    public onerror: ((ev: unknown) => void) | null = null;
    private src_ = "";

    public get src(): string {
        return this.src_;
    }

    public set src(url: string) {
        this.src_ = url;
        setTimeout(() => {
            try {
                const img = decode(resolveAsset(url));
                this.width = img.width;
                this.height = img.height;
                this.data = img.data;
            } catch (e) {
                this.onerror?.(e);
                return;
            }
            this.onload?.({});
        }, 0);
    }
}

//----- Canvas
export class FakeContext2D {
    public buffer: Uint8ClampedArray;

    constructor(private canvas: FakeCanvas) {
        this.buffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    }

    private ensure(): void {
        const len = this.canvas.width * this.canvas.height * 4;
        if (this.buffer.length !== len) {
            this.buffer = new Uint8ClampedArray(len);
        }
    }

    // copy a rectangle of RGBA pixels into the canvas buffer
    private blit(src: Uint8ClampedArray, sw: number, sh: number, dx: number, dy: number): void {
        this.ensure();
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        // fast path: same size, at the origin
        if (dx === 0 && dy === 0 && sw === cw && sh === ch) {
            this.buffer.set(src.subarray(0, this.buffer.length));
            return;
        }
        for (let y = 0; y < sh; y++) {
            const ty = dy + y;
            if (ty < 0 || ty >= ch) continue;
            for (let x = 0; x < sw; x++) {
                const tx = dx + x;
                if (tx < 0 || tx >= cw) continue;
                const s = (y * sw + x) << 2;
                const d = (ty * cw + tx) << 2;
                this.buffer[d] = src[s];
                this.buffer[d + 1] = src[s + 1];
                this.buffer[d + 2] = src[s + 2];
                this.buffer[d + 3] = src[s + 3];
            }
        }
    }

    public putImageData(img: FakeImageData, dx: number, dy: number): void {
        this.blit(img.data, img.width, img.height, dx, dy);
    }

    public drawImage(img: FakeImage, dx: number, dy: number): void {
        this.blit(img.data, img.width, img.height, dx, dy);
    }

    public getImageData(sx: number, sy: number, sw: number, sh: number): FakeImageData {
        this.ensure();
        const out = new FakeImageData(sw, sh);
        const cw = this.canvas.width;
        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const s = ((sy + y) * cw + (sx + x)) << 2;
                const d = (y * sw + x) << 2;
                out.data[d] = this.buffer[s];
                out.data[d + 1] = this.buffer[s + 1];
                out.data[d + 2] = this.buffer[s + 2];
                out.data[d + 3] = this.buffer[s + 3];
            }
        }
        return out;
    }

    public clearRect(): void {
        this.ensure();
        this.buffer.fill(0);
    }
}

export class FakeCanvas {
    public width: number;
    public height: number;
    private context_: FakeContext2D | undefined;

    constructor(width = 300, height = 150) {
        this.width = width;
        this.height = height;
    }

    public getContext(kind: string): FakeContext2D {
        if (kind !== "2d") {
            throw new Error(`Unsupported context: ${kind}`);
        }
        if (!this.context_) {
            this.context_ = new FakeContext2D(this);
        }
        return this.context_;
    }
}

//----- install
export function installDom(): void {
    const g = globalThis as any;
    g.ImageData = FakeImageData;
    g.Image = FakeImage;
    g.window = g;
    g.document = {
        createElement: (tag: string) => {
            if (tag !== "canvas") {
                throw new Error(`Unsupported element: ${tag}`);
            }
            return new FakeCanvas();
        },
    };
    g.requestAnimationFrame = () => 0;
}
