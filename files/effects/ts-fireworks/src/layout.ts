/*
 * @file    layout.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Layout of the white band and the sprite on the left half
 */

//----- globals
export const BAND_MARGIN = 20;

//----- interfaces
export interface Layout {
    bandWidth: number;
    spriteX: number;
    spriteY: number;
    spriteW: number;
    spriteH: number;
}

//----- functions
// sprite scaled to fit the screen height and the left half (minus margins), centred in the band
export function layout(screenW: number, screenH: number, spriteW: number, spriteH: number): Layout {
    const half = screenW / 2;
    const scale = Math.min(1, screenH / spriteH, (half - 2 * BAND_MARGIN) / spriteW);
    const w = Math.round(spriteW * scale);
    const h = Math.round(spriteH * scale);
    const bandWidth = w + 2 * BAND_MARGIN;

    return {
        bandWidth: bandWidth,
        spriteX: Math.floor((half - bandWidth) / 2) + BAND_MARGIN,
        spriteY: Math.floor((screenH - h) / 2),
        spriteW: w,
        spriteH: h,
    };
}
