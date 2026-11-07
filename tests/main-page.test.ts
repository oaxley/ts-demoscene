/*
 * @file    main-page.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Main page slider (files/server/src/main.ts) with minimal DOM stubs
 */

//----- imports
import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";

//----- helpers
class FakeElement {
    public listeners: Record<string, () => void> = {};
    public classes = new Set<string>();
    public children: FakeElement[] = [];
    public textContent = "";
    public href = "";

    public classList = {
        toggle: (name: string, on: boolean) => (on ? this.classes.add(name) : this.classes.delete(name)),
    };

    public addEventListener(type: string, cb: () => void): void {
        this.listeners[type] = cb;
    }
    public replaceChildren(...nodes: FakeElement[]): void {
        this.children = nodes;
    }
    public getContext(): { drawImage: (img: { src: string }) => void } {
        return { drawImage: (img) => drawn.push(img.src) };
    }
}

class StubImage {
    public onload?: () => void;
    private src_ = "";
    public get src(): string {
        return this.src_;
    }
    public set src(v: string) {
        this.src_ = v;
        images.push(this);
    }
}

const CONFIG = {
    "ts-a": { title: "Effect A", description: "first" },
    "ts-b": { title: "Effect B", description: "second" },
    "ts-c": { title: "Effect C", description: "third" },
};

const drawn: string[] = [];
const images: StubImage[] = [];
const elements: Record<string, FakeElement> = {};

// (re)load the main page script with the given URL hash, wait for the first effect shown
async function loadPage(hash: string, expectedDesc: string): Promise<void> {
    for (const id of ["output", "prev", "next", "effect-name", "effect-desc"]) {
        elements[id] = new FakeElement();
    }
    vi.stubGlobal("document", {
        getElementById: (id: string) => elements[id],
        createElement: () => new FakeElement(),
    });
    vi.stubGlobal("location", { hash });
    vi.stubGlobal("Image", StubImage);
    vi.stubGlobal("fetch", async () => ({ ok: true, status: 200, json: async () => CONFIG }));

    vi.resetModules();
    await import("../files/server/src/main");
    await vi.waitFor(() => expect(elements["effect-desc"].textContent).toBe(expectedDesc));
}

const name = () => elements["effect-name"].children[0];
const inactive = (id: string) => elements[id].classes.has("inactive");

//----- tests
describe("main page slider", () => {
    beforeAll(async () => {
        await loadPage("", "first");
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    test("shows the first effect", () => {
        expect(name().href).toBe("/effect/ts-a");
        expect(name().textContent).toBe("\u276F\u276F Effect A");
        expect(inactive("prev")).toBe(true);
        expect(inactive("next")).toBe(false);

        images.at(-1)!.onload!();
        expect(drawn).toEqual(["/images/screenshot/ts-a.png"]);
    });

    test("next / previous buttons", () => {
        elements.next.listeners.click();
        elements.next.listeners.click();
        expect(elements["effect-desc"].textContent).toBe("third");
        expect(inactive("prev")).toBe(false);
        expect(inactive("next")).toBe(true);

        // already at the end
        elements.next.listeners.click();
        expect(name().href).toBe("/effect/ts-c");

        elements.prev.listeners.click();
        expect(name().href).toBe("/effect/ts-b");
        expect(inactive("next")).toBe(false);
    });

    test("a stale screenshot is not drawn", () => {
        const stale = images.at(-2)!;
        drawn.length = 0;
        stale.onload!();
        expect(drawn).toEqual([]);
    });
});

describe("main page slider: start from the URL hash", () => {
    afterAll(() => {
        vi.unstubAllGlobals();
    });

    test("opens on the effect named in the hash", async () => {
        await loadPage("#ts-b", "second");
        expect(name().href).toBe("/effect/ts-b");
        expect(inactive("prev")).toBe(false);
        expect(inactive("next")).toBe(false);
    });

    test("opens on the last effect", async () => {
        await loadPage("#ts-c", "third");
        expect(inactive("next")).toBe(true);
    });

    test.each(["#nope", "#toString", "#%E0", "#"])("falls back to the first effect for %s", async (hash) => {
        await loadPage(hash, "first");
        expect(name().href).toBe("/effect/ts-a");
    });
});
