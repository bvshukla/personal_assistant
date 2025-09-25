# Personal Assistant API (Node.js + Express + Mongoose)

A simple REST API backed by MongoDB using Mongoose.

## Prerequisites
- Node.js 18+
- MongoDB running locally or a connection string to a remote MongoDB cluster

## Setup
1. Install dependencies
   ```bash
   npm install
   ```
2. Configure environment
   - Copy `.env.example` to `.env` and adjust values as needed
   ```bash
   cp .env.example .env
   ```
   - Default `.env` expects local MongoDB at `mongodb://localhost:27017/node_mongodb_app`

## Run
- Development
  ```bash
  npm run dev
  ```
- Production
  ```bash
  npm start
  ```

Server starts on `http://localhost:3001` by default.

## Auth
- All `/api/*` routes require a header: `x-user-id: <User _id>`
- This is a simple demo header-based auth. Replace with JWT/session in production.

## API
- Users
  - `GET /api/users` — list users
  - `POST /api/users` — create a user
    - Body: `{ "name": string, "email": string, "password": string }`
  - `GET /api/users/summary` — summary for current user (appointments + followups)
  - `GET /api/users/:id/summary` — summary for specific user (requires `x-user-id` to match `:id`)

- Appointments
  - `GET /api/appointments?page&limit&sort&order` — list current user's appointments
  - `GET /api/appointments/:id` — get single appointment (owner only)
  - `POST /api/appointments` — create (owner set from header)
    - Body: `{ title, startAt, endAt, location?, notes? }`
  - `PATCH /api/appointments/:id` — update (owner only)
  - `DELETE /api/appointments/:id` — delete (owner only, cascades followups)
  - Validations: `endAt > startAt`, optional future and business hours checks via env

- Teams
  - `GET /api/teams?page&limit&sort&order&owner&member` — list teams (default: owned by or include current user)
  - `POST /api/teams` — create; owner must be current user
  - `PATCH /api/teams/:id` — update (owner only, ensures owner in members)
  - `POST /api/teams/:id/members` — add members (owner only)
  - `DELETE /api/teams/:id/members/:userId` — remove member (owner only, cannot remove owner)
  - `DELETE /api/teams/:id` — delete (owner only)

- Follow-ups
  - `GET /api/followups?page&limit&sort&order&appointment&assignee&completed` — list
    - If `appointment` not provided, lists followups for current user's appointments
  - `GET /api/appointments/:appointmentId/followups` — list for an appointment (owner only)
  - `GET /api/followups/:id` — get single (owner only)
  - `POST /api/followups` or `/api/appointments/:appointmentId/followups` — create
    - Body: `{ appointment?, title, description?, assignee?, dueAt? }`
    - Defaults `assignee` to appointment owner if omitted; enforces `dueAt >= appointment.endAt`
  - `PATCH /api/followups/:id` — update (owner only)
  - `DELETE /api/followups/:id` — delete (owner only)
  - Index: unique `(appointment, title)`

## Seeding
- 10 sample users:
  ```bash
  npm run seed
  ```
- Realistic demo data (users, teams, appointments, followups):
  ```bash
  npm run seed:demo
  ```

## Testing
- Uses Jest + Supertest + mongodb-memory-server
- Run tests:
  ```bash
  npm test
  ```

## Linting
```bash
npm run lint
```

## CI
- GitHub Actions workflow runs lint and tests on push/PR to `main`.

## Project Structure
```
personal_assistant/
├─ models/
│  ├─ User.js
│  ├─ Appointment.js
│  ├─ Team.js
│  └─ FollowUpItem.js
├─ routes/
│  ├─ users.js
│  ├─ appointments.js
│  ├─ teams.js
│  └─ followups.js
├─ middleware/
│  └─ auth.js
├─ scripts/
│  ├─ seedUsers.js
│  └─ seedDemo.js
├─ tests/
│  └─ app.test.js
├─ .github/workflows/ci.yml
├─ server.js
├─ package.json
├─ .env (ignored)
├─ .env.example
└─ README.md
```

## Notes
- `.env` and `node_modules/` are excluded by `.gitignore`.
- Mongoose auto-creates indexes in development; ensure indexes exist in production.
