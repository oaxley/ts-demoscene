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

/* map a value from a value domain to another one
 *
 * Args
 *  value   : the value to map
 *  src_low : the lowest boundary for 'value' in its current domain
 *  src_high: the highest boundary for 'value' in its current domain
 *  dst_low : the destination lowest boundary
 *  dst_high: the destination highest boundary
 *
 * Returns
 *  the new value within the destination domain
 */
export function map(value: number, src_low: number, src_high: number, dst_low: number, dst_high: number): number {
    let src_range = src_high - src_low;
    let dst_range = dst_high - dst_low;

    return dst_low + (1.0 * dst_range * (value - src_low)) / src_range;
}

/* constrain a value between a range
 *
 * Args
 *  value: the value to constrain
 *  min  : the lowest acceptable boundary
 *  max  : the highest acceptable boundaary
 *
 * Returns
 *  the new value within the boundaries
 */
export function constrain(value: number, min: number, max: number): number {
    if (value < min)
        return min
    else {
        if (value > max)
            return max
        else
            return value
    }
}

/* normalize a value between [0,1]
 *
 * Args
 *  value: the value to normalize
 *  low  : the lowest boundary of the value
 *  high : the highest boundary for this value
 *
 * Returns
 *  the value clamped between 0.0 and 1.0
 */
export function norm(value: number, low: number, high: number): number {
    return (value - low) / (high - low);
}

/* perform a linear interpolation between two values
 *
 * Args
 *  source: the initial value
 *  target: the target value
 *  amount: a number between [0,1] where we should interpolate
 *
 * Returns
 *  the interpolated value
 */
export function lerp(source: number, target: number, amount: number): number {
    return source + (target - source) * amount;
}
