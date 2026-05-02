# Ethara Project Tracker

Ethara is a full-stack project management web app for creating projects, managing teams, assigning tasks, and tracking delivery progress with role-based access.

## Features

- Signup and login with JWT authentication
- Admin and Member roles
- Admin project creation and team assignment
- Admin task creation and assignment
- Member task status updates
- Dashboard with project count, task count, completion, and overdue work
- React workspace with Dashboard, Projects, Tasks, and Team views
- Express REST API with MongoDB relationships and validation

## Tech Stack

- Frontend: React, Vite, Lucide icons
- Backend: Node.js, Express
- Database: MongoDB Atlas with Mongoose
- Auth: JWT and bcrypt

## Local Setup

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
```

The backend reads configuration from `server/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5001
CORS_ORIGIN=http://localhost:5173
```

For local frontend development, create `client/.env`:

```env
VITE_API_URL=http://localhost:5001
```

## Run

Build the React client:

```bash
cd client
npm run build
```

Start the backend server:

```bash
cd server
npm run dev
```

Open the URL printed in the terminal, usually:

```text
http://localhost:5001
```

If `5001` is busy, stop the old server or change `PORT` in `server/.env`. The Vite dev proxy expects the backend on `5001` by default.

For frontend development with hot reload:

```bash
cd client
npm run dev
```

## Railway Deployment

Deploy this repo as two Railway services.

Backend service:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Variables:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CORS_ORIGIN` set to your deployed frontend URL

Frontend service:

- Root directory: `client`
- Build command: `npm install && npm run build`
- Start command: `npm run preview -- --port $PORT`
- Variables:
  - `VITE_API_URL` set to your deployed backend URL

The backend also exposes `/health` for a simple deployment health check.

## Fixing Vite Proxy ECONNREFUSED

Run the backend before using the Vite frontend:

```bash
cd server
npm run dev
```

Then in another terminal:

```bash
cd client
npm run dev
```

If you deploy the backend separately, set `VITE_API_URL` in the frontend service to the backend Railway URL.

## Roles

Admin users can create projects, add team members, create tasks, assign tasks, and update task details.

Member users can view their assigned work and update task status.
