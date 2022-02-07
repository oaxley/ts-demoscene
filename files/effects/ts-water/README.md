# *A new Wave*

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)

## **Screenshot**

![screenshot](screenshot.png)


## **Algorithm**

The algorithm is very close to the flames effect, which is a kind of blur.

For a point on the screen (x,y), we add the 4 surrounding values and we divide by 2.  
This result in a value that is twice the average. Then we substract the previous value at the same spot.

``` javascript
cur[x][y] = ((old[x-1][y] + old[x][y+1] + old[x][y-1] + old[x+1][y]) / 2.0) - cur[x][y];
```
If the previous value was lower than the average, then the new value will makes the wave goes up.  
Respectively, if the previous value was higher, the wave will goes down.

As the time passed, a damping factor is applied to the effect so the wave dies progressively.

Every 10 Frames, we add a random rain droplet which animates the effect.

## **License**

All the code are under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
