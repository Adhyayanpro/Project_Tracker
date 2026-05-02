# Project Tracker

A full-stack project management app where users can create projects, manage teams, assign tasks, and track progress with Admin and Member roles.

Live app: https://projecttracker-production-c377.up.railway.app/

## Tech Stack

- React, Vite, CSS
- Node.js, Express
- MongoDB, Mongoose
- JWT, bcrypt

## Run Locally

Install dependencies:

```bash
npm run install:all
```

Create `server/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5001
CORS_ORIGIN=http://localhost:5173
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5001
```

Start the backend:

```bash
npm run dev:server
```

Start the frontend in another terminal:

```bash
npm run dev:client
```

Open:

```text
http://localhost:5173
```
