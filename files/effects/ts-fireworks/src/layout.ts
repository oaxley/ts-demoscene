/*
 * @file    layout.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Layout of the sprite on the left half (pinned bottom-left)
 */

//----- globals
export const SPRITE_HEIGHT_RATIO = 0.9; // the sprite fills 90% of the screen height

//----- interfaces
export interface Layout {
    spriteX: number;
    spriteY: number;
    spriteW: number;
    spriteH: number;
}

//----- functions
// sprite at 90% of the screen height (aspect kept), pinned bottom-left
export function layout(screenH: number, spriteW: number, spriteH: number): Layout {
    const scale = (screenH * SPRITE_HEIGHT_RATIO) / spriteH;
    const w = Math.round(spriteW * scale);
    const h = Math.round(spriteH * scale);

    return {
        spriteX: 0,
        spriteY: screenH - h,
        spriteW: w,
        spriteH: h,
    };
}
