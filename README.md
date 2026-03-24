# OpenContactRoute

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**OpenContactRoute** is an open-source healthcare contact routing platform that helps health plans guide members to the right contact channel for their specific need — the right plan, audience segment, and topic all resolve to a single, unambiguous pathway.

Built by [Soulstone Health LLC](https://soulstonehealth.com) on the MERN stack with Docker and Caddy.

---

## Features

- **Widget** — Embeddable, public-facing routing interface that walks a member through audience → plan → topic selection and presents the correct contact pathway (phone, online portal, address, vendor contact)
- **Admin portal** — Full CRUD management of audiences, plans, topics, contact pathways, and users
- **Role-based access control** — `admin`, `super user`, and `user` roles with granular permissions
- **Pathway content audit** — Identifies published pathways with missing or stale contact information
- **Reporting dashboard** — Top pathways, topics, plans, audiences by event volume; date-range filtering; CSV export
- **Audit log** — Immutable record of all data changes with actor and timestamp
- **Site configuration** — Branding (logo, org name, primary color) configurable at runtime
- **Docker-first** — Dev and production environments fully containerized; Caddy handles TLS automatically

---

## Tech Stack

| Layer            | Technology                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| Frontend         | React 19, Vite, Bootstrap 5, React Router v7                                |
| Backend          | Node.js 24+, Express 5, Passport JWT                                        |
| Database         | MongoDB 8 (Mongoose ODM)                                                    |
| Reverse proxy    | Caddy v2 (automatic HTTPS)                                                  |
| Containerization | Docker Compose                                                              |
| Testing          | Jest + MongoDB Memory Server (backend), Vitest + Testing Library (frontend) |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) v24+ (for local development without Docker)
- [Make](https://www.gnu.org/software/make/) (optional, but the `Makefile` wraps all common commands)

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/Soulstone-Health-LLC/opencontactroute.git
cd opencontactroute

# 2. Copy and configure environment variables
cp .env.sample .env
# Edit .env and fill in all values before continuing

# 3. Start the development stack
make up

# 4. (Optional) Seed the database with demo data
make seed
```

The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:3001`.

> **Security note:** `make seed` creates two well-known demo accounts:
>
> - `superuser@example.com` / `SuperUser!Demo1`
> - `member@example.com` / `Member!Demo1234`
>
> These credentials are public knowledge. **Do not run `make seed` against a public-facing instance** without immediately changing or removing these accounts afterward.

---

## Environment Variables

Copy `.env.sample` to `.env` and populate the following variables:

| Variable           | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `MONGO_USERNAME`   | MongoDB username                                              |
| `MONGO_PASSWORD`   | MongoDB password                                              |
| `MONGO_DATABASE`   | MongoDB database name (e.g. `opencontactroute`)               |
| `MONGO_HOST`       | MongoDB host (use `mongodb` in Docker, `localhost` otherwise) |
| `JWT_SECRET`       | Long random string for signing JWT tokens                     |
| `ADMIN_EMAIL`      | Email address for the initial admin user                      |
| `ADMIN_PASSWORD`   | Password for the initial admin user                           |
| `ADMIN_FIRST_NAME` | First name of the initial admin user                          |
| `ADMIN_LAST_NAME`  | Last name of the initial admin user                           |
| `NODE_ENV`         | `development` or `production`                                 |
| `PORT`             | Backend API port (default: `3001`)                            |
| `FRONTEND_URL`     | Frontend origin for CORS (e.g. `http://localhost:3000`)       |
| `LOG_LEVEL`        | Winston log level (e.g. `info`, `debug`)                      |
| `DOMAIN`           | Your public domain name (used by Caddy for TLS)               |
| `CADDY_TLS_EMAIL`  | Email address Caddy uses for Let's Encrypt                    |

---

## Makefile Reference

| Command           | Description                                     |
| ----------------- | ----------------------------------------------- |
| `make up`         | Build and start the dev stack (detached)        |
| `make start`      | Start already-built containers                  |
| `make stop`       | Stop all containers                             |
| `make restart`    | Restart all containers                          |
| `make logs`       | Tail logs for all services                      |
| `make api`        | Tail backend logs only                          |
| `make seed`       | Run the database seed script                    |
| `make demo`       | Alias for `make seed`                           |
| `make clean`      | Stop and remove containers, volumes, and images |
| `make prod-up`    | Build and start the production stack            |
| `make prod-start` | Start the already-built production stack        |
| `make prod-stop`  | Stop the production stack                       |
| `make prod-logs`  | Tail production logs                            |
| `make prod-seed`  | Run seed script against the production database |

---

## Running Tests

```bash
# Backend (Jest + in-memory MongoDB — no running database required)
cd backend && npm test

# Frontend (Vitest + Testing Library)
cd frontend && npm test
```

---

## Production Deployment

```bash
cp .env.sample .env
# Fill in all production values — especially DOMAIN, CADDY_TLS_EMAIL, and a strong JWT_SECRET
make prod-up
make prod-seed   # Only on first deploy; see security note above
```

Caddy will automatically obtain and renew a TLS certificate for the configured `DOMAIN`.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

---

## Security

To report a vulnerability, please see [SECURITY.md](SECURITY.md). **Do not open a public GitHub issue for security vulnerabilities.**

---

## License

OpenContactRoute is licensed under the [GNU Affero General Public License v3.0](LICENSE). In plain terms: you are free to use, modify, and distribute this software, but any modified version you deploy as a network service must also be released under AGPL-3.0.
