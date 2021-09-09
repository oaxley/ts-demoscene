/*
 * @file    utils.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Utility functions
 */

//----- functions

/* convert an angle from degrees to radians
 *
 * Args
 *  angle: the angle in degrees ([0, 360])
 *
 * Returns
 *  the angle in radians
 */
export function radians(angle: number): number {
    return angle * Math.PI / 180.0;
}

/* convert an angle from radians to degrees
 *
 * Args
 *  angle: the angle in radians [0, 2*PI]
 *
 * Returns
 *  the angle in degrees
 */
export function degrees(angle: number): number {
    return angle * 180 / Math.PI;
}

