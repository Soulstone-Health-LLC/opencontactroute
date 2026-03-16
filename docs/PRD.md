# Product Requirements Document — OpenContactRoute

**Version:** 1.0
**Date:** March 16, 2026
**License:** AGPL-3.0-only
**Stack:** MongoDB · Express · React · Node.js (MERN)

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Users and Roles](#3-users-and-roles)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Models](#5-data-models)
6. [API Specification](#6-api-specification)
7. [Admin Interface](#7-admin-interface)
8. [Consumer Widget](#8-consumer-widget)
9. [Embedding](#9-embedding)
10. [Reporting](#10-reporting)
11. [Authentication and Authorization](#11-authentication-and-authorization)
12. [Accessibility — WCAG 2.1 AA](#12-accessibility--wcag-21-aa)
13. [UI Framework — Bootstrap 5](#13-ui-framework--bootstrap-5)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment](#15-deployment)
16. [Open Source and Licensing](#16-open-source-and-licensing)
17. [Out of Scope / Future Phases](#17-out-of-scope--future-phases)

---

## 1. Purpose and Scope

OpenContactRoute is an open-source, single-tenant web application that replaces static health plan contact pages with a guided experience. Users answer three prompts — who they are, which plan or network they interact with, and what type of assistance they need — and are presented with the correct contact pathway, including phone numbers, IVR steps, portal links, email addresses, and operational notes.

This PRD covers:

- The **REST API backend** (Node.js, Express, MongoDB)
- The **admin interface** (React, Bootstrap 5)
- The **consumer-facing guided widget** (React, Bootstrap 5)
- **Reporting** functionality for administrators
- **Embedding** the widget into external digital properties
- **Testing**, **accessibility**, and **deployment** requirements

---

## 2. Goals and Non-Goals

### Goals

- Provide a guided 3-step contact routing experience for members, providers, employers, brokers, and vendors
- Provide a web-based admin interface for managing audiences, plans, topics, and contact pathways
- Support draft and published pathway states with an audit trail
- Support embeddable deployment via iframe and JavaScript widget
- Provide transactional and utilization reporting for administrators
- Be self-hostable via Docker Compose with a single command
- Meet WCAG 2.1 AA accessibility standards throughout
- Maintain a clean, auditable open-source codebase under AGPL-3.0

### Non-Goals

- Multi-tenant architecture (each deployment is one health plan instance)
- Collecting or transmitting member PHI or PII through the guided widget
- Native mobile applications (the widget must be mobile-responsive but is web-based)
- Real-time notification systems
- AI-based routing or natural language input (future phase)

---

## 3. Users and Roles

### Consumer (Unauthenticated)

The end user of the guided widget — a member, provider, employer, broker, or vendor/partner. No login required. The widget is fully public-facing. No personal data is collected from this user.

### Admin (Authenticated)

Full access to the application.

- User management: create, view, edit, activate/deactivate, and delete user accounts
- Full CRUD on all content: audiences, plans, topics, contact pathways
- Access to all reports
- Access to system settings (instance name, branding, embed configuration)

### Super User (Authenticated)

Full content access without user management rights.

- Full CRUD on audiences, plans, topics, contact pathways
- Access to all reports
- Cannot access user management screens

### User (Authenticated)

Operational staff with read and edit access.

- Can view, create, and edit audiences, plans, topics, and contact pathways
- Cannot delete any records
- Cannot access user management screens
- Access to reports

### Role Summary Table

| Capability                    | Admin | Super User | User |
| ----------------------------- | :---: | :--------: | :--: |
| View content (pathways, etc.) |   ✓   |     ✓      |  ✓   |
| Create content                |   ✓   |     ✓      |  ✓   |
| Edit content                  |   ✓   |     ✓      |  ✓   |
| Delete content                |   ✓   |     ✓      |  ✗   |
| Publish / unpublish pathways  |   ✓   |     ✓      |  ✗   |
| View reports                  |   ✓   |     ✓      |  ✓   |
| Manage users                  |   ✓   |     ✗      |  ✗   |
| System settings               |   ✓   |     ✗      |  ✗   |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      React Frontend                     │
│                                                         │
│   ┌───────────────────┐   ┌─────────────────────────┐  │
│   │   Admin Interface │   │   Consumer Widget        │  │
│   │   (protected)     │   │   (public, embeddable)   │  │
│   └────────┬──────────┘   └──────────┬──────────────┘  │
└────────────┼────────────────────────┼──────────────────┘
             │ REST API                │ REST API (public)
             ▼                         ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js / Express API (v1)                 │
│                                                         │
│  /api/v1/users       /api/v1/persons                    │
│  /api/v1/audiences   /api/v1/plans                      │
│  /api/v1/topics      /api/v1/pathways                   │
│  /api/v1/reports     /api/v1/widget (public)            │
└───────────────────────┬─────────────────────────────────┘
                        │ Mongoose ODM
                        ▼
              ┌──────────────────┐
              │    MongoDB       │
              └──────────────────┘
```

### Key Conventions

- All API routes are versioned under `/api/v1/`
- Authentication uses JWT delivered as an `httpOnly` cookie
- Passport.js with `passport-jwt` handles token verification
- `express-async-handler` wraps all async controller functions
- In-memory MongoDB (`mongodb-memory-server`) is used for all tests
- ES Modules (`"type": "module"`) throughout the backend
- Node.js ≥ 24.0.0 required

---

## 5. Data Models

#### User

| Field           | Type    | Notes                                                                                                                                             |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`         | String  | Required, unique, lowercase                                                                                                                       |
| `password_hash` | String  | bcryptjs, 10 rounds. No password policy is enforced by the application — complexity requirements are a business-level decision left to operators. |
| `is_active`     | Boolean | Default `true`                                                                                                                                    |
| `user_role`     | String  | `user` \| `super user` \| `admin`                                                                                                                 |
| `createdAt`     | Date    | Auto (timestamps)                                                                                                                                 |
| `updatedAt`     | Date    | Auto (timestamps)                                                                                                                                 |

> `createdAt` and `updatedAt` are Mongoose auto-timestamps that provide a lightweight on-document record of when a document was first created and last modified. They are **not** duplicates of the AuditLog — they serve different purposes. `createdAt`/`updatedAt` answer "when?" at a glance from the document itself; the AuditLog answers "who changed what and how?" via a richer separate record. Both are kept.

#### Person (User Profile)

Separated from `User` for security. A Person profile is created for every user account.

| Field         | Type     | Notes                                         |
| ------------- | -------- | --------------------------------------------- |
| `user_id`     | ObjectId | Ref: User, required, unique                   |
| `first_name`  | String   | Required, max 50                              |
| `middle_name` | String   | Optional, max 50                              |
| `last_name`   | String   | Required, max 50                              |
| `suffix`      | String   | Enum: Jr., Sr., II, III, IV, V, MD, PhD, Esq. |
| `is_active`   | Boolean  | Default `true`                                |
| `created_by`  | ObjectId | Ref: User                                     |
| `updated_by`  | ObjectId | Ref: User                                     |
| `createdAt`   | Date     | Auto (timestamps)                             |
| `updatedAt`   | Date     | Auto (timestamps)                             |
| **Virtuals**  |          | `full_name`, `display_name`                   |

---

#### Audience

Represents who is interacting with the health plan (e.g., Member, Provider).

| Field         | Type     | Notes                               |
| ------------- | -------- | ----------------------------------- |
| `name`        | String   | Required, unique                    |
| `slug`        | String   | URL-safe identifier, auto-generated |
| `description` | String   | Optional                            |
| `is_active`   | Boolean  | Default `true`                      |
| `sort_order`  | Number   | Controls display order in widget    |
| `created_by`  | ObjectId | Ref: User                           |
| `updated_by`  | ObjectId | Ref: User                           |
| `createdAt`   | Date     | Auto (timestamps)                   |
| `updatedAt`   | Date     | Auto (timestamps)                   |

#### Plan

Represents a plan or network type (e.g., Commercial, Medicare Advantage).

| Field         | Type     | Notes                               |
| ------------- | -------- | ----------------------------------- |
| `name`        | String   | Required, unique                    |
| `slug`        | String   | URL-safe identifier, auto-generated |
| `description` | String   | Optional                            |
| `is_active`   | Boolean  | Default `true`                      |
| `sort_order`  | Number   | Controls display order in widget    |
| `created_by`  | ObjectId | Ref: User                           |
| `updated_by`  | ObjectId | Ref: User                           |
| `createdAt`   | Date     | Auto (timestamps)                   |
| `updatedAt`   | Date     | Auto (timestamps)                   |

#### Topic

Represents a support topic (e.g., Claims, Prior Authorization).

| Field         | Type     | Notes                               |
| ------------- | -------- | ----------------------------------- |
| `name`        | String   | Required, unique                    |
| `slug`        | String   | URL-safe identifier, auto-generated |
| `description` | String   | Optional                            |
| `is_active`   | Boolean  | Default `true`                      |
| `sort_order`  | Number   | Controls display order in widget    |
| `created_by`  | ObjectId | Ref: User                           |
| `updated_by`  | ObjectId | Ref: User                           |
| `createdAt`   | Date     | Auto (timestamps)                   |
| `updatedAt`   | Date     | Auto (timestamps)                   |

#### ContactPathway

The core document linking an audience + plan + topic to a contact method.

| Field          | Type     | Notes                                       |
| -------------- | -------- | ------------------------------------------- |
| `audience_id`  | ObjectId | Ref: Audience, required                     |
| `plan_id`      | ObjectId | Ref: Plan, required                         |
| `topic_id`     | ObjectId | Ref: Topic, required                        |
| `department`   | String   | Optional                                    |
| `phone`        | String   | Optional, E.164 or display format           |
| `ivr_steps`    | [String] | Ordered list of IVR navigation instructions |
| `portal_url`   | String   | Optional                                    |
| `email`        | String   | Optional                                    |
| `fax`          | String   | Optional                                    |
| `notes`        | String   | Operational notes                           |
| `is_delegated` | Boolean  | Default `false`                             |
| `vendor_name`  | String   | Required if `is_delegated` is `true`        |
| `status`       | String   | `draft` \| `published`, default `draft`     |
| `published_at` | Date     | Set when status changes to `published`      |
| `created_by`   | ObjectId | Ref: User                                   |
| `updated_by`   | ObjectId | Ref: User                                   |
| `createdAt`    | Date     | Auto (timestamps)                           |
| `updatedAt`    | Date     | Auto (timestamps)                           |

Compound index on `{ audience_id, plan_id, topic_id }` — enforces one pathway per combination.

#### PathwayEvent (Reporting)

Immutable event log created when the consumer widget displays a pathway. No PII is stored.

| Field          | Type     | Notes                                        |
| -------------- | -------- | -------------------------------------------- |
| `pathway_id`   | ObjectId | Ref: ContactPathway                          |
| `audience_id`  | ObjectId | Ref: Audience (denormalized for query speed) |
| `plan_id`      | ObjectId | Ref: Plan (denormalized)                     |
| `topic_id`     | ObjectId | Ref: Topic (denormalized)                    |
| `occurred_at`  | Date     | Default: now                                 |
| `embed_source` | String   | Optional referrer or embed identifier        |

No `updatedAt` — this collection is append-only.

#### AuditLog

An append-only record of every create, update, and delete action taken on managed resources. Written automatically by a shared Mongoose plugin — not manually in individual controllers. No PII is stored beyond user identity.

| Field         | Type     | Notes                                                             |
| ------------- | -------- | ----------------------------------------------------------------- |
| `resource`    | String   | Model name, e.g. `"ContactPathway"`, `"Audience"`                 |
| `resource_id` | ObjectId | The document that was changed                                     |
| `action`      | String   | `create` \| `update` \| `delete`                                  |
| `changed_by`  | ObjectId | Ref: User                                                         |
| `changed_at`  | Date     | Default: now                                                      |
| `changes`     | [Object] | Array of `{ field, old_value, new_value }` — populated on updates |

No `updatedAt` — this collection is append-only. Indexed on `{ resource, resource_id }` for efficient per-document history queries, on `{ changed_by }` for per-user activity queries, and on `{ changed_at: -1 }` for chronological reporting.

### Audit Log Plugin

A single reusable Mongoose plugin (`auditLogPlugin`) handles audit logging as a cross-cutting concern — no audit logic lives in individual controllers. The plugin is located at `backend/utils/auditLogPlugin.js` and hooks into the following Mongoose lifecycle events:

- **`pre('save')` / `post('save')`** — covers `Model.create()` and `doc.save()`. Captures a `create` entry with no field diffs on new documents; captures an `update` entry with field-level diffs on existing documents.
- **`pre('findOneAndUpdate')` / `post('findOneAndUpdate')`** — covers `findByIdAndUpdate()`. Fetches the original document before the update, then diffs old vs. new field values post-update.
- **`pre('findOneAndDelete')` / `post('findOneAndDelete')`** — covers `findByIdAndDelete()`. Captures a `delete` entry with no changes array.

Fields prefixed with `_` and internal Mongoose fields (`__v`, `createdAt`, `updatedAt`) are excluded from diffs.

Plugin errors are caught and logged to the console — they never interrupt the originating database operation.

The plugin is applied to the following schemas:

- `User`
- `Person`
- `Audience`
- `Plan`
- `Topic`
- `ContactPathway`

Applying it to a schema requires a single line:

```js
audienceSchema.plugin(auditLogPlugin);
```

**Passing `changed_by`:**

- For document save operations: set `doc._changedBy = req.user._id` before calling `doc.save()`
- For query operations: pass `_changedBy: req.user._id` in the options object passed to `findByIdAndUpdate()` or `findByIdAndDelete()`
- For public endpoints where no authenticated user exists (e.g., registration): `changed_by` is recorded as `null`

Controllers are responsible for supplying the user ID; the plugin is responsible for recording it.

---

## 6. API Specification

All routes are prefixed `/api/v1/`. Protected routes require a valid JWT in the `Authorization: Bearer <token>` header or the `jwt` httpOnly cookie.

### Health Check

| Method | Route     | Access | Description                             |
| ------ | --------- | ------ | --------------------------------------- |
| GET    | `/health` | Public | Returns `{ status: "ok" }` and HTTP 200 |

### Users — `/api/v1/users`

| Method | Route             | Access  | Description                         |
| ------ | ----------------- | ------- | ----------------------------------- |
| POST   | `/register`       | Public  | Register a new user account         |
| POST   | `/auth`           | Public  | Authenticate and receive JWT cookie |
| POST   | `/logout`         | Private | Clear JWT cookie                    |
| GET    | `/profile`        | Private | Get authenticated user's account    |
| GET    | `/`               | Admin   | List all users                      |
| GET    | `/:id`            | Admin   | Get user by ID                      |
| PUT    | `/:id`            | Admin   | Update user account                 |
| PUT    | `/:id/activate`   | Admin   | Activate a user account             |
| PUT    | `/:id/deactivate` | Admin   | Deactivate a user account           |

### Persons — `/api/v1/persons`

| Method | Route           | Access            | Description               |
| ------ | --------------- | ----------------- | ------------------------- |
| POST   | `/`             | Private           | Create a person profile   |
| GET    | `/`             | Admin, Super User | List all persons          |
| GET    | `/profile`      | Private           | Get own person profile    |
| PUT    | `/profile`      | Private           | Update own person profile |
| GET    | `/user/:userId` | Private           | Get person by user ID     |
| GET    | `/:id`          | Admin, Super User | Get person by ID          |
| PUT    | `/:id`          | Admin             | Update a person profile   |

### Audiences — `/api/v1/audiences`

| Method | Route  | Access            | Description        |
| ------ | ------ | ----------------- | ------------------ |
| POST   | `/`    | Admin, Super User | Create an audience |
| GET    | `/`    | Private           | List all audiences |
| GET    | `/:id` | Private           | Get audience by ID |
| PUT    | `/:id` | Admin, Super User | Update an audience |
| DELETE | `/:id` | Admin, Super User | Delete an audience |

### Plans — `/api/v1/plans`

| Method | Route  | Access            | Description    |
| ------ | ------ | ----------------- | -------------- |
| POST   | `/`    | Admin, Super User | Create a plan  |
| GET    | `/`    | Private           | List all plans |
| GET    | `/:id` | Private           | Get plan by ID |
| PUT    | `/:id` | Admin, Super User | Update a plan  |
| DELETE | `/:id` | Admin, Super User | Delete a plan  |

### Topics — `/api/v1/topics`

| Method | Route  | Access            | Description     |
| ------ | ------ | ----------------- | --------------- |
| POST   | `/`    | Admin, Super User | Create a topic  |
| GET    | `/`    | Private           | List all topics |
| GET    | `/:id` | Private           | Get topic by ID |
| PUT    | `/:id` | Admin, Super User | Update a topic  |
| DELETE | `/:id` | Admin, Super User | Delete a topic  |

### Contact Pathways — `/api/v1/pathways`

| Method | Route            | Access            | Description                       |
| ------ | ---------------- | ----------------- | --------------------------------- |
| POST   | `/`              | Admin, Super User | Create a pathway (default: draft) |
| GET    | `/`              | Private           | List all pathways                 |
| GET    | `/:id`           | Private           | Get pathway by ID                 |
| PUT    | `/:id`           | Admin, Super User | Update a pathway                  |
| PUT    | `/:id/publish`   | Admin, Super User | Publish a pathway                 |
| PUT    | `/:id/unpublish` | Admin, Super User | Revert pathway to draft           |
| DELETE | `/:id`           | Admin, Super User | Delete a pathway                  |

### Widget (Public) — `/api/v1/widget`

| Method | Route                                         | Access | Description                                      |
| ------ | --------------------------------------------- | ------ | ------------------------------------------------ |
| GET    | `/audiences`                                  | Public | List active audiences for step 1                 |
| GET    | `/plans?audience=<id>`                        | Public | List active plans for a given audience           |
| GET    | `/topics?audience=<id>&plan=<id>`             | Public | List active topics for a given audience + plan   |
| GET    | `/pathway?audience=<id>&plan=<id>&topic=<id>` | Public | Retrieve the published pathway for a combination |
| POST   | `/event`                                      | Public | Record a PathwayEvent (no PII)                   |

### Reporting — `/api/v1/reports`

| Method | Route               | Access  | Description                                 |
| ------ | ------------------- | ------- | ------------------------------------------- |
| GET    | `/pathway-views`    | Private | Pathway view counts over a date range       |
| GET    | `/top-pathways`     | Private | Most frequently accessed pathways           |
| GET    | `/top-topics`       | Private | Most frequently selected topics             |
| GET    | `/top-audiences`    | Private | Most frequently selected audiences          |
| GET    | `/top-plans`        | Private | Most frequently selected plan/network types |
| GET    | `/pathway-coverage` | Private | Pathways defined vs. possible combinations  |
| GET    | `/content-audit`    | Private | Pathways in draft, published, last updated  |
| GET    | `/audit-log`        | Admin   | Full audit log across all resources         |

---

## 7. Admin Interface

The admin interface is a React single-page application served at the application root and protected by authentication. It uses Bootstrap 5 for layout and components.

### Pages and Flows

#### Authentication

- **Login page** — email and password form; redirects to dashboard on success; displays inline validation errors
- **Logout** — clears JWT cookie and redirects to login

#### Dashboard

- Summary cards: total published pathways, total audiences, plans, topics
- Quick links to recently updated pathways
- Shortcut to reports

#### User Management _(Admin only)_

- Paginated list of users showing name, email, role, status, last updated
- Create user form (email, password, role) — Person profile form follows immediately on creation
- Edit user: role, active status
- Activate / deactivate toggle

> User accounts are never permanently deleted. Deactivation is the only removal mechanism, preserving historical audit trail integrity.

#### My Profile

- View and edit own Person profile (name, suffix)
- Accessible to all authenticated roles

#### Audiences

- Paginated, searchable list with name, slug, status, sort order, last updated
- Create / edit form with inline validation
- Activate / deactivate toggle
- Delete with confirmation _(Admin and Super User only)_
- Drag-and-drop reordering of sort order

#### Plans

- Same structure as Audiences

#### Topics

- Same structure as Audiences

#### Contact Pathways

- Filterable list by audience, plan, topic, status (draft / published), last updated
- Create / edit form:
  - Audience, plan, topic selectors (dropdowns)
  - Department, phone, portal URL, email, fax fields
  - IVR steps as an ordered list with add/remove/reorder controls
  - Delegated vendor toggle — reveals vendor name field when enabled
  - Operational notes textarea
  - Status indicator (draft / published)
- Publish / unpublish action with confirmation
- Delete with confirmation _(Admin and Super User only)_
- Preview mode — shows exactly what the consumer widget will render for the pathway

#### Reporting

- Described in [Section 10](#10-reporting)

#### System Settings _(Admin only)_

- Instance display name shown in widget header and admin nav
- Logo upload (displayed in admin header and widget)
- Embed configuration: allowed embed domains / origins

### General Admin UX Requirements

- All forms display inline field-level validation messages
- All destructive actions (delete, deactivate, unpublish) require a confirmation dialog
- Forms display a "last updated by [name] on [date]" audit note where applicable
- All list views support text search and are paginated (default 25 per page)
- All tables are sortable by primary columns
- The interface must be fully responsive and usable on tablet and desktop

---

## 8. Consumer Widget

The consumer widget is the public-facing guided experience. It is a React component served at a versioned public route (e.g., `/v1/widget`) and is also embeddable.

### Guided Flow

The widget presents three sequential steps:

**Step 1 — Who are you?**
Renders active audiences in configured sort order as selectable cards or buttons.

**Step 2 — Which plan or network?**
Renders active plans filtered to those with at least one published pathway for the selected audience.

**Step 3 — What do you need help with?**
Renders active topics filtered to those with at least one published pathway for the selected audience + plan combination.

**Result — Contact Pathway**
Renders the published pathway including:

- Department name
- Phone number (click-to-call link on mobile)
- IVR steps rendered as a numbered list
- Portal URL as a clearly labeled external link
- Email as a mailto link
- Fax number
- Vendor name (if delegated)
- Operational notes
- A "Start Over" action to reset the widget

If no published pathway exists for a combination, the widget displays a friendly fallback message directing the user to contact the health plan's main line.

### Query-String Pre-selection

The widget accepts query-string parameters to pre-populate selections, enabling deep-linking from portal pages:

- `?audience=<slug>` — pre-selects step 1
- `?audience=<slug>&plan=<slug>` — pre-selects steps 1 and 2
- `?audience=<slug>&plan=<slug>&topic=<slug>` — presents the result directly

### Pathway Event Logging

When a result pathway is rendered, the widget fires a `POST /api/v1/widget/event` with the `pathway_id`, `audience_id`, `plan_id`, `topic_id`, and optional `embed_source`. No user data or PII is transmitted.

---

## 9. Embedding

### Option 1 — Hosted iframe

```html
<iframe
  src="https://your-instance.example.com/v1/widget"
  width="100%"
  height="600"
  frameborder="0"
  title="Contact Support Directory"
>
</iframe>
```

Deep-link example:

```html
<iframe
  src="https://your-instance.example.com/v1/widget?audience=provider&plan=medicare-advantage"
  ...
>
</iframe>
```

### Option 2 — JavaScript Widget Snippet

```html
<div id="ocr-widget"></div>
<script src="https://your-instance.example.com/v1/widget.js"></script>
<script>
  OCRWidget.init({
    container: "#ocr-widget",
    audience: "provider", // optional pre-selection
  });
</script>
```

### Embedding Requirements

- The widget embed URL is versioned (`/v1/`) from day one
- Admin system settings define allowed embed origins; the API enforces `Content-Security-Policy` and CORS accordingly
- The widget must render correctly in all major browsers (Chrome, Firefox, Safari, Edge) and be responsive from 320px width upward
- The iframe approach requires no JavaScript dependency on the host page

---

## 10. Reporting

Reporting is available to all authenticated roles. Reports are rendered within the admin interface and draw from the `PathwayEvent` collection plus content metadata.

### Utilization Reports

| Report                      | Description                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------- |
| **Pathway Views Over Time** | Line chart of total pathway views by day/week/month over a configurable date range |
| **Top Pathways**            | Table of most-viewed pathways ranked by view count                                 |
| **Top Topics**              | Bar chart of most-selected support topics                                          |
| **Top Audiences**           | Bar chart of most-selected audience types                                          |
| **Top Plans**               | Bar chart of most-selected plan/network types                                      |

### Transactional / Content Reports

| Report               | Description                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pathway Coverage** | Grid showing all audience + plan + topic combinations; indicates which have a published pathway, which are in draft, and which have no pathway configured |
| **Content Audit**    | List of all pathways with current status, last updated date, and last updated by — sortable and filterable; useful for identifying stale content          |
| **Draft Pathways**   | Filtered list of all pathways currently in draft status                                                                                                   |

### Audit Log Report _(Admin only)_

A searchable, paginated view of the `AuditLog` collection available exclusively to admin users. Supports filtering by:

- Resource type (e.g., ContactPathway, Audience)
- Specific resource ID (to see the full change history of one record)
- User (to see all changes made by a specific administrator)
- Action (create, update, delete)
- Date range

Each row displays the resource type, resource ID, action, changed by (person display name), changed at, and an expandable detail view showing the field-level diff (old value → new value).

### Reporting Requirements

- All reports support date range filtering (default: last 30 days)
- Reports are rendered client-side using data returned from the `/api/v1/reports` endpoints
- No third-party analytics SDKs or external data transmission
- The `PathwayEvent` collection is append-only; no event records are updated or deleted

---

## 11. Authentication and Authorization

### Overview

- Passwords are hashed with `bcryptjs` (10 rounds)
- JWT is signed with `JWT_SECRET`, expires in 30 days, and is delivered as an `httpOnly`, `SameSite=strict` cookie
- `passport-jwt` extracts the token from the `Authorization: Bearer` header
- The `protect` middleware verifies the JWT and populates `req.user`

### Role Enforcement Middleware

A `requireRole(...roles)` middleware factory checks `req.user.user_role` against an allowed list and returns HTTP 403 if the role is insufficient. This middleware is applied per-route in addition to `protect`.

```javascript
router.delete(
  "/:id",
  protect,
  requireRole("admin", "super user"),
  deleteAudience,
);
```

### Cookie-Based and Header-Based Token Support

The JWT is delivered as an `httpOnly` cookie. Both cookie extraction and `Authorization: Bearer` header extraction are supported so that the hosted widget and external API consumers both work.

### Logout

`POST /api/v1/users/logout` clears the `jwt` cookie.

### Password Policy

Passwords must be at least 12 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character. This is enforced on registration and any password change.

---

## 12. Accessibility — WCAG 2.1 AA

Both the admin interface and the consumer widget must conform to WCAG 2.1 Level AA. The following requirements apply throughout.

### Perceivable

- All non-text content has a text alternative (`alt` attributes on images, `aria-label` on icon-only buttons)
- Color is never the sole means of conveying information (e.g., status indicators include both color and text/icon)
- Text contrast ratio meets a minimum of 4.5:1 for normal text and 3:1 for large text
- All form inputs have visible, persistent labels (not placeholder-only)

### Operable

- All functionality is operable via keyboard alone
- Focus order follows a logical reading sequence
- Focus is always visible with a high-contrast focus ring
- No content flashes more than 3 times per second
- The guided widget is navigable with keyboard (Tab/Enter/Space for selections, Escape to restart)
- Skip navigation links are provided in the admin layout

### Understandable

- Form validation errors identify the specific field and describe the error in plain language
- All error messages are associated with their field via `aria-describedby`
- Language is declared on the `<html>` element (`lang="en"` by default)
- Confirmation dialogs clearly state the action and its consequence

### Robust

- Semantic HTML elements are used throughout (`<button>`, `<nav>`, `<main>`, `<header>`, `<section>`)
- ARIA roles and attributes are used only where native HTML semantics are insufficient
- All interactive components (modals, dropdowns, accordions) implement the correct ARIA patterns
- The application is tested with at least one screen reader (NVDA on Windows or VoiceOver on macOS) as part of pre-release validation

---

## 13. UI Framework — Bootstrap 5

### Usage

The admin interface and consumer widget are built with **Bootstrap 5** (no jQuery dependency). Bootstrap is included as an npm package (`bootstrap`) and its SCSS is imported into the project build to allow theme customization.

### Customization

A Bootstrap theme file (`src/styles/_theme.scss`) overrides Bootstrap's CSS custom properties to match the health plan's branding. At minimum, the following are configurable via admin system settings and injected as CSS variables at runtime:

- `--bs-primary` — primary action color
- `--bs-body-font-family` — base font family
- Logo image (uploaded via admin)

### Component Usage Guidelines

| Need                            | Bootstrap Component                                   |
| ------------------------------- | ----------------------------------------------------- |
| Page layout                     | Container, Row, Col grid                              |
| Navigation                      | Navbar, Offcanvas sidebar                             |
| Forms                           | Form controls with `.form-label`, `.invalid-feedback` |
| Confirmation dialogs            | Modal                                                 |
| Status badges (draft/published) | Badge                                                 |
| Alerts and inline feedback      | Alert with ARIA `role="alert"`                        |
| Pathway step selections         | Card or Button group                                  |
| Tables (admin lists)            | Table with `.table-responsive` wrapper                |
| Loading states                  | Spinner with `aria-label`                             |
| Drag-and-drop sort order        | Custom implementation (no Bootstrap dependency)       |

### Responsive Breakpoints

The admin interface targets tablet (≥768px) and desktop (≥1200px) as primary viewports. The consumer widget targets all viewports from mobile (≥320px) upward.

---

## 14. Testing Strategy

### Backend — Jest + Supertest

The backend uses **Jest** with **Supertest** for integration testing and **mongodb-memory-server** for an in-memory MongoDB instance. Tests are located in `backend/tests/` and run with `npm test`.

#### Test Organization

Each API resource has a dedicated test file:

```
backend/tests/
  users.test.js
  persons.test.js
  audiences.test.js
  plans.test.js
  topics.test.js
  pathways.test.js
  widget.test.js
  reports.test.js
```

#### Coverage Requirements

Each test file must cover:

- **Happy path** — successful creation, retrieval, update, deletion
- **Validation errors** — missing required fields, invalid formats, duplicate constraints
- **Authentication** — protected routes return 401 without a valid token
- **Authorization** — role-restricted routes return 403 for insufficient roles
- **Not found** — requests for non-existent resources return 404
- **Business rules** — e.g., published pathway required for widget endpoint to return a result; draft pathway returns no result from widget

#### Test Setup Conventions

- `setEnv.js` — sets `JWT_SECRET`, `NODE_ENV=test`, `PORT` before any module is loaded
- `setup.js` — starts `MongoMemoryServer` before all tests, clears all collections between each test, disconnects after all tests
- Helper functions within each test file create and authenticate users as needed

### Frontend — Vitest + React Testing Library

The frontend uses **Vitest** and **React Testing Library** for unit and integration tests.

#### Coverage Requirements

- All form components — validation behavior, submission, and error display
- Guided widget flow — each step transition, query-string pre-selection, and result rendering
- Role-based rendering — components that conditionally render based on user role
- Accessibility — `axe-core` via `jest-axe` (or `vitest-axe`) on all page-level components to catch WCAG violations automatically

### End-to-End

Playwright is used for critical end-to-end flows:

- Full guided widget flow (all 3 steps to result)
- Admin login, create pathway, publish pathway, and verify it appears in widget
- Embed iframe rendering test

### CI

All tests must pass before any merge to `main`. The test command in `package.json` is `npm test` in both `backend/` and `frontend/`.

---

## 15. Deployment

### Docker Compose (Self-Hosted)

The repository root contains a `docker-compose.yaml` that defines three services:

| Service    | Description                  | Port  |
| ---------- | ---------------------------- | ----- |
| `backend`  | Node.js/Express API          | 3001  |
| `frontend` | React app (served via Nginx) | 3000  |
| `mongodb`  | MongoDB                      | 27017 |

A single `docker compose up --build` starts the full stack. A seed script (`backend/scripts/seed.js`) can be run after first start to populate demo data.

### Environment Variables

Documented in `.env.sample` at the repository root. Required variables:

| Variable         | Description                                |
| ---------------- | ------------------------------------------ |
| `MONGO_HOST`     | MongoDB hostname                           |
| `MONGO_USERNAME` | MongoDB username                           |
| `MONGO_PASSWORD` | MongoDB password                           |
| `MONGO_DATABASE` | MongoDB database name                      |
| `JWT_SECRET`     | Secret for JWT signing (min 32 characters) |
| `NODE_ENV`       | `development` \| `production`              |
| `FRONTEND_URL`   | Allowed CORS origin for the frontend       |
| `PORT`           | API server port (default 3001)             |

### Health Check

`GET /health` returns `{ "status": "ok" }` and HTTP 200. Used by Docker health checks and monitoring.

### Observability

- Structured JSON logging via **Winston** — log level configurable via `LOG_LEVEL` env var
- Unhandled errors are logged with stack trace in development; stack is omitted in production

---

## 16. Open Source and Licensing

- License: **AGPL-3.0-only**
- Any deployment of OpenContactRoute (including managed hosting) that modifies the source code must make those modifications available under the same license
- The repository includes `LICENSE`, `README.md`, and `CONTRIBUTING.md`
- `CONTRIBUTING.md` documents the development workflow, test requirements, and the process for proposing that custom work be generalized and merged into the core project
- A `CODE_OF_CONDUCT.md` is included to set community expectations

---

## 17. Out of Scope / Future Phases

The following items are explicitly out of scope for the initial release and are noted for future consideration:

| Item                                   | Notes                                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| Multi-language / i18n support          | English only for initial release                                   |
| AI-based or NLP routing                | Potential Phase 2 enhancement to the guided flow                   |
| Native mobile apps                     | Widget is mobile-responsive; native apps are a separate workstream |
| SSO / SAML / OAuth login               | Admin login is email/password + JWT for initial release            |
| Automated pathway staleness alerts     | Could be derived from content audit report in a future release     |
| Custom pathway report export (CSV/PDF) | Nominated for Phase 2                                              |
| Webhook or API push integrations       | Future capability for health plan system integrations              |
| Multi-instance or SaaS mode            | Architecture is intentionally single-tenant                        |
