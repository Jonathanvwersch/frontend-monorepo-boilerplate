# Frontend Monorepo Boilerplate

## Typescript / Tsup / Turbo / NextJs

Frontend monorepo with a focus on scalability and developer experience

- Apps folder, which currently only contains a NextJs app, but can be extended to include any other app
- Packages folder containing all shared code, which can be extended to include any other package using the create-package command
- Fully managed build setup using [Turborepo](https://turborepo.org/), [TypeScript](https://github.com/microsoft/TypeScript), [Tsup](https://github.com/egoist/tsup), and a custom watch scrip--watch.js-- to extend Tsup's watch mode
- Pnpm instead of Npm to reduce disk space usage and improve performance
- Build to scale: this structure has been tested on monorepo's with many apps and packages, and can handle the scale involved in building the packages, and emitting their types

## Commands

Bellow commands will be executed on monorepo level - on all apps and packages where npm script exists.

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
| dev            | Run all apps and packages in development and watchmode               |
| update:deps    | Update all dependencies to their latest versions                     |
| create-package | Create new package with prompts                                      |
