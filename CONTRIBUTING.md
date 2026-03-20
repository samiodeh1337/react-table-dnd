# Contributing to react-table-dnd

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Setup

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/react-table-dnd.git
   cd react-table-dnd
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Start** the dev server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Create a branch from `main` using one of these prefixes:

| Prefix       | Use for                        |
| ------------ | ------------------------------ |
| `feat/`      | New features                   |
| `fix/`       | Bug fixes                      |
| `refactor/`  | Code refactoring               |
| `docs/`      | Documentation changes          |
| `chore/`     | Tooling, CI, dependency updates |

Example: `feat/virtual-scroll-improvements`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `style`

Examples:
- `feat(drag): add horizontal auto-scroll support`
- `fix(column): prevent drag outside container bounds`
- `docs: update README with virtual scroll example`

### Code Style

- Code is auto-formatted with **Prettier** on commit via Husky + lint-staged
- Run `npm run format` to format all files manually
- Run `npm run lint` to check for linting errors
- Run `npm run format:check` to verify formatting without writing

### Making Changes

1. Create your feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Ensure your code is formatted: `npm run format`
4. Ensure linting passes: `npm run lint`
5. Build the library to check for errors: `npm run build`
6. Commit your changes following the commit convention above
7. Push to your fork: `git push origin feat/my-feature`
8. Open a **Pull Request** against `main`

## Pull Request Guidelines

- Fill out the PR template completely
- Keep PRs focused — one feature or fix per PR
- Update `CHANGELOG.md` for user-facing changes
- Ensure CI checks pass
- Be responsive to review feedback

## Reporting Bugs

Use the [Bug Report](https://github.com/samiodeh1337/react-table-dnd/issues/new?template=bug_report.md) template. Include:

- Steps to reproduce
- Expected vs actual behavior
- A minimal reproduction (CodeSandbox/StackBlitz link is ideal)

## Requesting Features

Use the [Feature Request](https://github.com/samiodeh1337/react-table-dnd/issues/new?template=feature_request.md) template. Describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Project Structure

```
src/
├── Components/          # Core table components
│   ├── TableContainer/  # Main container + useTable hook
│   ├── TableHeader.tsx  # Header row
│   ├── TableBody.tsx    # Body rows
│   ├── BodyRow.tsx      # Individual row
│   ├── ColumnCell.tsx   # Header cell
│   ├── RowCell.tsx      # Body cell
│   ├── Draggable.tsx    # Drag wrapper
│   ├── DragHandle.tsx   # Drag handle component
│   └── index.ts         # Public exports
├── hooks/               # Custom hooks
│   ├── useAutoScroll.ts
│   ├── useDragContextEvents.tsx
│   └── useLongPress.ts
└── examples/            # Demo examples (docs site)
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
