# _A new Wave_

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)

## **Screenshot**

![screenshot](screenshot.png)

## **Algorithm**

The effect is a 2D wave simulation with two height buffers of integers, `state1` and `state2`. Each frame, one of them is the current buffer and the other holds the previous frame. The roles are swapped at the end of every update.

For each point (x, y) that is not on the border of the screen, the new height is computed from the previous frame's four neighbours:

```typescript
cur[p] = ((old[p - 1] + old[p + 1] + old[p - width] + old[p + width]) >> 1) - cur[p];
```

The four neighbours are summed and halved, which gives twice their average. The current value at the point is subtracted from it. If the point was lower than its neighbours, the wave pushes it up, and if it was higher, the wave pulls it down. This is the same kind of averaging used in the flames effect, combined with the previous value to make it oscillate.

Each frame, the height is damped by about 1/128 of its value (`cur -= cur >> 7`), so the waves die out over time.

To show the water, each pixel is drawn from the background picture (`ts-water.background.png`) at a shifted position. The shift is proportional to the wave height, so the picture looks refracted:

- `r = 1024 - height`
- the source coordinates are `width + (x - width) * r / 1024` and `height + (y - height) * r / 1024`, clamped to the screen.

A flat surface (height 0) gives `r = 1024`, so the source coordinates equal `(x, y)` and the picture is shown undistorted. Where the surface is raised or lowered, the source is shifted, which produces the wave pattern.

Every 10 frames, a random drop is added to the current buffer: a block of 15 points (5 columns by 3 rows) around a random position, each raised by a height between 100 and 300. This keeps the surface moving.

Edge pixels are not updated, which stops the waves from wrapping around or leaving the buffer.

## **License**

All the code are under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
