# Contributing to WatchSpace

Thank you for your interest in contributing! 🎉

## Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/watchspace.git
   cd watchspace
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. **Start development servers**
   ```bash
   bun run dev
   ```
   This runs both the SvelteKit frontend (`:5173`) and Elysia server (`:3001`) simultaneously via Turborepo.

## Project Structure

| Path                | Description                        |
| ------------------- | ---------------------------------- |
| `apps/web/`         | SvelteKit frontend                 |
| `apps/server/`      | Bun + Elysia signaling server      |
| `packages/shared/`  | Shared TypeScript types & constants|
| `docs/`             | Documentation                      |

## Development Guidelines

- **TypeScript** — All code must be written in TypeScript with strict mode enabled.
- **Formatting** — Run `bun run format` before committing. Husky will auto-lint on pre-commit.
- **Commits** — Write clear, concise commit messages in the imperative mood.
- **Tests** — Add tests for new features. Run `bun run test` to verify.

## Pull Request Process

1. Create a feature branch from `main`.
2. Make your changes and ensure all tests pass.
3. Submit a PR with a clear description of what changed and why.
4. Wait for at least one review before merging.

## Code of Conduct

Be kind, respectful, and constructive. We're all here to build something awesome together.
