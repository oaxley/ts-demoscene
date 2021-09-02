/*
 * @file    interfaces.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Generic interfaces
 */

//----- 2D geometry
export interface Size {
    width: number,
    height: number
}

export interface Point2D {
    x: number,
    y: number
}

export interface Rect {
    x: number,
    y: number,
    w: number,
    h: number
}

//----- 3D geometry
export interface Point3D {
    x: number,
    y: number,
    z: number
}
