# Contributing

Node 18 or newer.

```bash
git clone https://github.com/<you>/react-table-dnd.git
cd react-table-dnd
npm install
npm run dev          # docs site with the live demos
npm test             # unit tests
npm run lint && npm run format:check && npm run build
```

Prettier runs on commit.

## Branches and commits

Branch from `main` with one of `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, for example `feat/virtual-scroll`.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(drag): add horizontal auto-scroll`, `fix(column): keep the drag inside the container`, `docs: virtual scroll example`.

## Pull requests

- One feature or fix per PR.
- Add user-facing changes to `CHANGELOG.md`.

## Bugs and features

Use the [bug report](https://github.com/samiodeh1337/react-table-dnd/issues/new?template=bug_report.md) or [feature request](https://github.com/samiodeh1337/react-table-dnd/issues/new?template=feature_request.md) template. For a bug, a minimal reproduction (CodeSandbox or StackBlitz) helps most.

## License

Contributions are licensed under the [MIT License](LICENSE).
