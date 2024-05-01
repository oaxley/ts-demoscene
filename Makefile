.PHONY: clean build run

clean:
	@rm -rf public

build:
	@npx webpack --mode development

run:
	@npm start