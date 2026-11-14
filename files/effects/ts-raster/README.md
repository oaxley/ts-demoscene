# _Oops Raster Bars_

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)

## **Screenshot**

![screenshot](screenshot.png)

## **Algorithm**

Four horizontal bars are drawn over a black background, each 50 pixels thick and as wide as the screen. The bars are drawn in the order violet, yellow, green, red, so the red bar ends up on top. This is a nod to the old days, when these bars were drawn line by line by the CRT beam of the VGA controller.

Each bar has its own colour, and its brightness depends on the row inside the bar:

- Red: `(v, 0, 0)`
- Green: `(0, v, 0)`
- Yellow: `(v, v, 0)`
- Violet: `(v, 0, v)`

where `v = min(index * 10, 255)` and `index` is the distance from the bar's edge. The brightness rises from black at the edges to full colour in the middle of the bar, which gives the bar its gradient. The top half of the bar is drawn with the gradient going one way and the bottom half with it going the other way, so the bar looks rounded.

Each bar moves vertically on a sine wave. Its position is `ymax + (ymax - BAR_SIZE) * sin(angle)`, where `ymax` is half the screen height. Each bar has its own angle (0.6, 0.4, 0.2 and 0.0 radians for red, green, yellow and violet), and the angle grows by `0.03` radians per frame. When it passes `2π`, it restarts at 0. The different starting angles make the bars move out of phase.

After the bars are drawn, the screen is overlaid with a sprite pinned to the top-right corner.

## **License**

All the code are under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
