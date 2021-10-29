# *Easy Rotozoomer*

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)

## **Screenshot**

![screenshot](../../images/screenshot/ts-rotozoom.screenshot.png)

## **Texture**

For this effect, you need a texture that is mostly squared and a length being a multiple of a
power of 2.

## **Algorithm**

For each pixels (x,y), you perform a standard rotation at a predefine angle and map it back to 
the original coordinates of the texture.

On the 2D plan, a rotation can be expressed with

``` javascript
xb = Math.floor( x * Math.cos(angle) - y * Math.sin(angle) )
yb = Math.floor( x * Math.sin(angle) + y * Math.cos(angle) )
```

To spice things up, and add a forward and back movement towards the camera, you can multiply these
values by sin(angle + 1).

The coordinates are then map back to the texture coordinates with a modulo, so the texture repeats
itself on the screen.

## **License**

All the code are under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
