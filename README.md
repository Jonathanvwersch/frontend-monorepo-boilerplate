# Frontend Monorepo Boilerplate

## Typescript / Tsup / Turbo / NextJs

Frontend monorepo with a focus on scalability and developer experience

- Apps folder, which currently only contains a NextJs app, but can be extended to include web apps built with any other framework. The NextJs app
  currently imports code from the react-design-system package to demonstrate how to import code from a package.
- Packages folder containing all shared code, which can be extended to include any other package using the create-package command. The folder
  currently contains three example packages, which import code from one another.
- A create package script to easily allow for the creation of new packages using prompts
- Fully managed build setup using [Turborepo](https://turborepo.org/), [TypeScript](https://github.com/microsoft/TypeScript), [Tsup](https://github.com/egoist/tsup), and a custom watch script--watch.js-- to extend tsup's watch mode
- Pnpm instead of Npm to reduce disk space usage and improve performance
- Build to scale: this structure has been tested on monorepos with many apps and packages, and can handle the scale involved in building the packages, and emitting their types

## Commands

The command below will be executed on a monorepo level

| Command        | Description                                                          |
| -------------- | -------------------------------------------------------------------- |
| clean:all      | Remove installed, generated and cached folders                       |
| clean:build    | Remove build and cache folders                                       |
| ts:type-check  | Run Typescript type checker                                          |
| ts:lint        | Lint all apps and packages                                           |
| ts:lint:fix    | Run and fix (where possible) linting errors on all apps and packages |
| turbo:clean    | Run TypeScript compiler                                              |
| build          | Build all apps and packages                                          |
| build:packages | Build all packages                                                   |
| dev            | Run all apps and packages in development and watch mode              |
| update:deps    | Update all dependencies to their latest versions                     |
| create-package | Create new package with prompts                                      |
