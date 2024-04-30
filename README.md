# ts-demoscene

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)
![Typescript](https://img.shields.io/badge/Typescript-4.4.2-blue?style=flat-square)

---

## **90's Demoscene effects**

An attempt to recreate all the old demoscene effects from the 90s in Typescript with the HTML Canvas element.

![screenshot](effects.png)

## **Effects**

- [FireCube](./files/effects/ts-flames/README.md)
- [Lens](./files/effects/ts-lens/README.md)
- [Metaballs](./files/effects/ts-metaball/README.md)
- [Moire](./files/effects/ts-moire/README.md)
- [Rotozoom](./files/effects/ts-rotozoom/README.md)
- [Tunnel](./files/effects/ts-tunnel/README.md)
- [Plasma](./files/effects/ts-plasma/README.md)
- [Twister](./files/effects/ts-twister/README.md)
- [Sprites](./files/effects/ts-sprites/README.md)
- [Starfield](./files/effects/ts-starfield/README.md)
- [Glenz](./files/effects/ts-glenz/README.md)
- [Smoke](./files/effects/ts-smoke/README.md)
- [Raster](./files/effects/ts-raster/README.md)
- [Noise](./files/effects/ts-noise/README.md)
- [Scroller](./files/effects/ts-scroller/README.md)
- [Water](./files/effects/ts-water/README.md)


---

## NodeJS / Typescript / Webpack

### NodeJS installation (taken from [here](https://nodejs.org/en/download/package-manager))

``` bash
# installs nvm (Node Version Manager)
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# restart the shell
$ exec $SHELL

# download and install Node.js (you may need to restart the terminal)
$ nvm install 20

# verifies the right Node.js version is in the environment
$ node -v # should print `v20.18.0`

# verifies the right npm version is in the environment
$ npm -v # should print `10.8.2`
```

### Typescript installation

``` bash
# install Typescript
$ npm install typescript

# verify the installed version
$ npx tsc --version # should print `Version 4.4.4`
```

### Webpack installation

``` bash
# install webpack
$ npm install webpack

# check the version
$ npx webpack --version # should print `webpack: 5.95.0`
```

---

## License

This program is under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).