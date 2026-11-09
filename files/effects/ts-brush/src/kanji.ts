/*
 * @file    kanji.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Stroke data for 生きがい (ikigai) and its layout on the screen
 *
 * Stroke data: KanjiVG (https://github.com/KanjiVG/kanjivg) © Ulrich Apel, CC BY-SA 3.0.
 * Each stroke is the centre line of the brush, as an SVG path on a 109x109 grid,
 * in the correct stroke order.
 */

//----- imports
import { Point2D } from "library/core/interfaces";
import { samplePath } from "library/maths/svgpath";

//----- globals
export const KANJI_GRID = 109; // KanjiVG coordinate grid
const CELL = 140; // size of a character on the screen (pixels)

// 4 characters x their strokes, in writing order
export const WORD: string[][] = [
    // 生 (0751f)
    [
        "M31.26,25.89c0.36,1.36,0.35,2.65-0.05,3.79c-2.34,6.69-7.24,17.22-14.96,24.19",
        "M31.13,40.67c2.37,0.33,4.03,0.07,5.64-0.12c9.5-1.1,25.15-4.12,35.35-5.83c2.51-0.42,4.86-0.73,7.38-0.33",
        "M52.31,12.63c1.28,1.28,2.01,3.12,2.01,5.23c0,4.01,0,65.14,0,69.77",
        "M29.38,64.03c2.64,0.67,5.38,0.31,8.04-0.02C49.45,62.51,62.16,61,72.5,59.86c2.38-0.26,4.99-0.76,7.38-0.23",
        "M15.75,90.25c3.04,0.75,6.21,0.94,8.4,0.8C40.62,90,68.12,86.5,83.3,85.75c3.63-0.18,7.68,0,10.07,0.73",
    ],
    // き (0304d)
    [
        "M30.5,30.25c1.88,0.75,4.64,1.06,5.88,0.88c6.75-1,22.25-4.5,26.5-6c2.17-0.76,3.5-1.25,4.88-2.12",
        "M36.25,48.7c2.01,0.85,4.97,1.2,6.29,0.99c7.23-1.13,23.82-5.09,28.37-6.79c2.32-0.86,3.75-1.41,5.22-2.4",
        "M42,14.12c1.5,0.88,3.13,2.94,4,5.12c5.5,13.76,16,29.26,26.37,40.76c7.64,8.47,9.12,9.38-6,3.88",
        "M33.75,83.25c10.62,9.75,27.25,8.62,38.12,5",
    ],
    // が (0304c)
    [
        "M24.62,38.62c1.88,1.62,4.65,2.33,8.62,1c25.5-8.5,29.5-4.13,29.5,7.62c0,9.38-1.24,17.46-4.25,25.25c-7.62,19.76-10.87,17.39-16.12,10.89",
        "M48.5,17.5c1,1.38,1.29,4.7,0.5,7.12c-5,15.25-18.02,40.93-19.62,43.88c-3.12,5.75-6.38,11.88-9.38,16.25",
        "M77.37,31.62c7.5,6.88,13.25,15.75,15,24.88",
        "M80.5,18.25c2.75,1.75,6,5.38,7.75,8.5",
        "M86.87,13.38c3.06,1.57,6.68,4.82,8.62,7.62",
    ],
    // い (03044)
    [
        "M21.5,29.66c2.01,2.17,2.61,4.68,2.17,7.43c-3.09,19.16-1.03,32.01,7.93,41.45c6.12,6.45,6.26,3.14,7.04-5.21",
        "M72.96,36.51c9.44,8.05,17.79,18.82,18.41,33.83",
    ],
];

//----- interfaces
// a stroke ready to be drawn
export interface Stroke {
    char: number; // index of the character in WORD
    points: Point2D[]; // screen coordinates, evenly spaced
}

//----- functions

/* lay the word out on one centred row and sample its strokes
 *
 * Args:
 *      width, height: screen size
 *      step         : distance between two points on the screen (pixels)
 *
 * Returns:
 *      all the strokes, in writing order
 */
export function layoutWord(width: number, height: number, step: number): Stroke[] {
    const scale = CELL / KANJI_GRID;
    const x0 = (width - WORD.length * CELL) / 2;
    const y0 = (height - CELL) / 2;

    const strokes: Stroke[] = [];
    WORD.forEach((paths, char) => {
        const ox = x0 + char * CELL;
        for (const d of paths) {
            const points = samplePath(d, step / scale).map((p) => ({ x: ox + p.x * scale, y: y0 + p.y * scale }));
            strokes.push({ char, points });
        }
    });

    return strokes;
}
