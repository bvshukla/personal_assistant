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

## API
- Users
  - `GET /api/users` — list users
  - `POST /api/users` — create a user
    - Body: `{ "name": string, "email": string, "password": string }`

## Seed Data
Insert 10 sample users.
```bash
npm run seed
```
The script lives at `scripts/seedUsers.js` and inserts users `Seed User 1..10` with emails `seeduser{n}@example.com`.

## Project Structure
```
personal_assistant/
├─ models/
│  └─ User.js
├─ routes/
│  └─ users.js
├─ scripts/
│  └─ seedUsers.js
├─ server.js
├─ package.json
├─ .env (ignored)
├─ .env.example
└─ README.md
```

## Notes
- `.env` and `node_modules/` are excluded by `.gitignore`.
- Mongoose will auto-create collections on first insert.
