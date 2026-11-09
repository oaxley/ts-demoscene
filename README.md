# ts-demoscene

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)
![Typescript](https://img.shields.io/badge/Typescript-5.9-blue?style=flat-square)

---

## **90's Demoscene effects**

An attempt to recreate all the old demoscene effects from the 90s in Typescript with the HTML Canvas element.

![screenshot](effects.png)

## **Effects**

- [Brush Ink](./files/effects/ts-brush/README.md)
- [Bump Mapping](./files/effects/ts-bump/README.md)
- [Texture Cube](./files/effects/ts-cube/README.md)
- [FireCube](./files/effects/ts-flames/README.md)
- [Glenz](./files/effects/ts-glenz/README.md)
- [Lens](./files/effects/ts-lens/README.md)
- [Light Rays](./files/effects/ts-lightrays/README.md)
- [Metaballs](./files/effects/ts-metaball/README.md)
- [Moire](./files/effects/ts-moire/README.md)
- [Noise](./files/effects/ts-noise/README.md)
- [Plasma](./files/effects/ts-plasma/README.md)
- [Raster](./files/effects/ts-raster/README.md)
- [Rotozoom](./files/effects/ts-rotozoom/README.md)
- [Scroller](./files/effects/ts-scroller/README.md)
- [Smoke](./files/effects/ts-smoke/README.md)
- [Sprites](./files/effects/ts-sprites/README.md)
- [Starfield](./files/effects/ts-starfield/README.md)
- [Tunnel](./files/effects/ts-tunnel/README.md)
- [Twister](./files/effects/ts-twister/README.md)
- [Water](./files/effects/ts-water/README.md)

---

## NodeJS / Typescript / esbuild

### NodeJS installation (taken from [here](https://nodejs.org/en/download/package-manager))

```bash
# installs nvm (Node Version Manager)
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# restart the shell
$ exec $SHELL

# download and install Node.js 20 or later
$ nvm install 22

# verifies the Node.js version
$ node -v
```

### Dependencies installation

```bash
# install all the dependencies (Typescript, esbuild, ...)
$ npm install
```

## Compile & Running

### Compiling the effects

```bash
# development build (with source maps)
$ npm run build

# production build (minified)
$ npm run build:prod
```

All the files will be stored in a `public` directory.

### Running

```bash
$ npm start
```

An Express backend will start and listen for connections on `localhost:8080`
(use the `HOST` and `PORT` environment variables to change it).

### Development

```bash
# rebuild on changes and restart the server
$ npm run dev
```

### Checks & Tests

```bash
# type checking and linting
$ npm run typecheck
$ npm run lint

# all the tests: frame-hash regression tests (every effect must render the
# same pixels as the references stored in tests/golden), library unit tests,
# server routes and main page (run `npm run build` first for the bundle and
# server tests, they are skipped otherwise)
$ npm test

# update the references (only when a visual change is intended)
$ npm run test:update

# rough per-frame timing of every effect
$ BENCH=1 npx vitest run tests/perf.test.ts --silent=false
```

A `Makefile` is also available (`make build`, `make run`, `make test`, ...).

---

## License

This program is under the **Apache License 2.0**.  
A copy of the license is available [here](https://choosealicense.com/licenses/apache-2.0/).
