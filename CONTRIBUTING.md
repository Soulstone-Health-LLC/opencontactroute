# Contributing to OpenContactRoute

Thank you for your interest in contributing! This document explains how to get involved.

---

## Reporting Bugs

Please use the [Bug Report issue template](.github/ISSUE_TEMPLATE/bug_report.md) when filing a bug. Include:

- A clear description of the problem
- Steps to reproduce it
- What you expected to happen vs. what actually happened
- Your environment (OS, Node.js version, Docker version)

For security vulnerabilities, **do not open a public issue**. See [SECURITY.md](SECURITY.md) instead.

---

## Requesting Features

Use the [Feature Request issue template](.github/ISSUE_TEMPLATE/feature_request.md). Describe the problem you're trying to solve and your proposed solution. Check existing issues first to avoid duplicates.

---

## Development Setup

1. Fork the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/opencontactroute.git
   cd opencontactroute
   ```

2. Copy the sample environment file and configure it:

   ```bash
   cp .env.sample .env
   # Edit .env with your local values
   ```

3. Start the dev stack:

   ```bash
   make up
   ```

4. (Optional) Seed demo data:

   ```bash
   make seed
   ```

5. Install dependencies locally if you want to run tests outside Docker:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

---

## Making Changes

- **Branch from `main`**: create a feature branch with a descriptive name, e.g. `feat/add-csv-export` or `fix/widget-routing-bug`.
- **Keep pull requests focused**: one logical change per PR. Split large changes into separate PRs.
- **Write or update tests**: all new backend behavior should have a corresponding test in `backend/tests/`. Frontend components should have a corresponding test using Vitest + Testing Library.
- **Tests must pass**: run both test suites before opening a PR.

  ```bash
  cd backend && npm test
  cd frontend && npm test
  ```

- **Follow existing code style**: the codebase uses ES modules throughout, async/await, and Express async handlers. Match the patterns already in use.
- **Do not commit `.env` files** or any real credentials.

---

## Pull Request Process

1. Open a PR against the `main` branch using the [PR template](.github/pull_request_template.md).
2. Fill out the checklist in the template.
3. A maintainer will review your PR and may request changes.
4. Once approved, a maintainer will merge it.

---

## License

By contributing, you agree that your contributions will be licensed under the [AGPLv3](LICENSE).
