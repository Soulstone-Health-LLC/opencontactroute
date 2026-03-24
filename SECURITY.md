# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in OpenContactRoute, please disclose it responsibly by emailing **<rodney@soulstonehealth.com>**. Include as much detail as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any proof-of-concept code or screenshots (if applicable)
- Your name/handle if you would like credit (optional)

You can expect an acknowledgement within **3 business days** and a resolution timeline communicated within **10 business days**.

We take all security reports seriously. We will work with you to understand and resolve the issue before any public disclosure.

---

## Supported Versions

| Version        | Supported |
| -------------- | --------- |
| `main` branch  | Yes       |
| Older releases | No        |

We only actively maintain the `main` branch. Please ensure you are running the latest code before reporting an issue.

---

## Security Considerations for Operators

When deploying OpenContactRoute, keep the following in mind:

- **JWT_SECRET**: Use a long (≥ 32 character), randomly generated string. Never reuse secrets across environments.
- **ADMIN_PASSWORD**: Use a strong, unique password. Do not use the value from `.env.sample`.
- **Demo seed accounts**: Running `make seed` creates well-known demo accounts (`superuser@example.com`, `member@example.com`) with publicly documented passwords. **Remove or change these accounts before exposing your instance to the internet.**
- **MongoDB**: The development `docker-compose.yaml` exposes MongoDB port `27017` to the host for convenience. Ensure this port is not publicly accessible in any internet-facing environment.
- **TLS**: The production stack uses Caddy for automatic TLS. Always deploy behind HTTPS in production; never expose the backend API directly on HTTP to the internet.
- **NODE_ENV**: Set to `production` in production deployments. This enables secure cookie flags and other hardened settings.
