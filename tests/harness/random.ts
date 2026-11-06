/*
 * @file    random.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Deterministic Math.random replacement (tests only)
 */

// mulberry32 PRNG
export function seedRandom(seed: number): void {
    let a = seed >>> 0;
    Math.random = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
