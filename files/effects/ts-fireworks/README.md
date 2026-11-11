# _Fireworks_

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)

## **Algorithm**

The left side shows a sprite centred on a full-height white band. The sprite is scaled
down only if it does not fit the band.

On the right side, a rocket is launched from the bottom every 30 frames. It rises under
its initial speed and gravity, then bursts into 40 to 80 sparks in a random bright colour.
The sparks fall under gravity and fade out over about 1.5 seconds. Particles live in a
fixed pool of typed arrays; the random generator is seeded, so every run is identical.

## **License**

All the code are under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
