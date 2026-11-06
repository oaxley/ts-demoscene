.PHONY: install clean build prod watch run dev check test

install:
	@npm install

clean:
	@npm run clean

build:
	@npm run build

prod:
	@npm run build:prod

watch:
	@npm run watch

run:
	@npm start

dev:
	@npm run dev

check:
	@npm run typecheck
	@npm run lint

test:
	@npm test
