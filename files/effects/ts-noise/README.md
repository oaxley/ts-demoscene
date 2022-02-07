# *A Noisy Apparition*

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)

## **Screenshot**

![screenshot](screenshot.png)

## **Algorithm**

A 2D noise map is created by using the Simplex algorithm.
Then, for every frame, we go through the whole screen and if the current noise value at the point (X, Y)
is higher or equal to a threshold, we show the pixel.

The threshold is increased by a small increment at every frame and if it reaches 1.0 or 0.0, the increment
is reversed.

## **License**

All the code are under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
