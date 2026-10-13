
# Zovro Community

**A community-based carpooling platform for sharing planned journeys.**

Zovro Community is a full-stack application being rebuilt to help people travelling in similar directions coordinate journeys and share travel costs. Instead of focusing on instant ride-hailing, the platform is designed around planned trips, passenger requests, and driver-approved bookings.

> **Project status:** Active development. The initial database schema, backend foundation, and authentication API are implemented. Journey management, route matching, booking workflows, and frontend integration remain planned development work.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Current Features](#current-features)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Development Roadmap](#development-roadmap)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Zovro Community aims to make everyday travel more collaborative by connecting drivers who already plan to travel with passengers whose journeys are compatible.

The platform is being designed around:

- **Planned journeys:** Drivers publish journey details in advance.
- **Journey discovery:** Passengers find journeys that suit their intended routes and schedules.
- **Seat requests:** Passengers request available seats, subject to driver approval.
- **Shared travel costs:** Travellers can coordinate transparent contributions toward journey expenses.
- **Community and trust:** Future improvements will focus on user profiles, verification, ratings, and reporting.

The initial release focuses on the core carpooling workflow. A mandatory payment gateway and physical transportation integrations are outside the current MVP scope.

## How It Works

1. **Publish:** A driver creates a planned journey with origin, destination, departure time, and available seats.
2. **Discover:** A passenger searches for journeys compatible with their intended route and schedule.
3. **Request:** The passenger requests a seat on a suitable journey.
4. **Approve:** The driver reviews the request and accepts or declines it.
5. **Coordinate:** Participants use the journey details to coordinate their shared trip.

These steps describe the intended product workflow. Features that have not yet been implemented are listed in the roadmap below.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript and CSS
- React Router
- Leaflet and React Leaflet for map-related functionality

### Backend

- Node.js
- Express
- REST API
- JSON Web Tokens (JWT)
- bcrypt for password hashing
- Express Rate Limit for authentication endpoint protection

### Database

- PostgreSQL
- SQL schema migrations
- `pg` connection pool

### Development Tools

- Git and GitHub
- npm
- Environment-based configuration

---

## Architecture

Zovro is maintained as a monorepo containing the frontend, backend, database migrations, and project documentation.

```text
zovro-ride-sharing/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── journeys/
│   │   │   ├── matching/
│   │   │   ├── bookings/
│   │   │   └── community/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── React application and existing client code
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seeds/
├── docs/
│   ├── architecture/
│   └── product/
├── .gitignore
└── README.md
```

The new community backend is organized by feature so that authentication, journeys, matching, bookings, and community functionality can evolve independently within a modular monolith.

The existing legacy backend entry point is retained separately while the new backend is developed and validated.

---

## Current Features

### Implemented

- [x] Initial project architecture and directory structure
- [x] Product requirements and architecture documentation
- [x] PostgreSQL connection pool and environment configuration
- [x] Initial database migration for users, journeys, and bookings
- [x] API health endpoint with database connectivity checks
- [x] User registration
- [x] Password hashing with bcrypt
- [x] User login and credential validation
- [x] JWT-based authentication
- [x] Protected authenticated-user profile endpoint
- [x] Authentication input validation and error responses
- [x] Rate limiting for registration and login

### In Development / Planned

- [ ] Journey creation, updating, and cancellation
- [ ] Journey discovery and filtering
- [ ] Route and departure-time compatibility matching
- [ ] Booking requests and driver approval
- [ ] Seat availability management
- [ ] Shared travel-cost information
- [ ] Frontend integration with the new community API
- [ ] Community profiles, verification, ratings, and reporting
- [ ] Expanded automated tests

---

## API Reference

The new community API runs separately from the legacy backend.

**Default local API address:** `http://127.0.0.1:4001`

All application endpoints use the `/api` prefix.

| Method | Endpoint | Purpose | Status |
|---|---|---|---|
| GET | `/api/health` | Check API and database health | Implemented |
| POST | `/api/auth/register` | Register a user | Implemented |
| POST | `/api/auth/login` | Authenticate a user | Implemented |
| GET | `/api/auth/me` | Retrieve the authenticated user's profile | Implemented |

### Authentication

Registration and login return a JWT access token after successful authentication.

For protected endpoints, send the token in the request header:

```http
Authorization: Bearer <access-token>
```

Access tokens are currently configured with a one-hour lifetime.

### Error Responses

API errors use a structured JSON response. For example:

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "A valid access token is required."
  }
}
```

Additional journey and booking endpoints will be documented as they are implemented.

---

## Getting Started

### Prerequisites

Install the following tools before running the application:

- Node.js with npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/MessedUp5/zovro-ride-sharing.git
cd zovro-ride-sharing
```

### 2. Choose the Development Branch

The community rebuild is currently developed on a dedicated branch.

```bash
git switch rebuild/zovro-community
```

### 3. Configure the Backend

Install backend dependencies:

```bash
cd backend
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Edit `backend/.env` and replace the placeholder database credentials and JWT secret with suitable local development values.

Never commit your real `.env` file.

### 4. Configure PostgreSQL

Create a dedicated local PostgreSQL role and database for Zovro Community, then configure `DATABASE_URL` in `backend/.env` to point to that database.

Apply the initial migration from the repository root:

```bash
cd ~/Desktop/zovro-ride-sharing

set -a
source backend/.env
set +a

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f database/migrations/001_initial_schema.sql

unset DATABASE_URL
```

Run the initial migration only against a newly created development database where the schema has not already been applied. Do not run it repeatedly against an existing database without checking the migration state.

### 5. Start the Community Backend

From the `backend` directory, run:

```bash
npm run dev:community
```

The server is configured to listen on:

`http://127.0.0.1:4001`

Check the health endpoint in another terminal:

```bash
curl -i http://127.0.0.1:4001/api/health
```

A healthy response should return HTTP `200` with a JSON body similar to:

```json
{
  "status": "ok",
  "service": "zovro-community-api",
  "database": "connected"
}
```

### 6. Start the Frontend

Open another terminal:

```bash
cd ~/Desktop/zovro-ride-sharing/frontend
npm install
npm run dev
```

Vite will display the local frontend URL in the terminal.

**Note:** The existing frontend is still being transitioned to the new community workflow. Starting it does not mean that the new authentication and carpooling APIs are already integrated into the UI.

### Backend Development Commands

Run these commands from `backend/`:

| Command | Description |
|---|---|
| `npm run dev:community` | Start the new community API with Node.js watch mode |
| `npm run dev:legacy` | Start the legacy backend with Node.js watch mode |
| `npm start` | Start the legacy backend entry point |

Use `npm run dev:community` when developing the new Zovro Community backend.

---

## Environment Configuration

The new backend uses `backend/.env.example` as the template for local configuration.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign access tokens |
| `PORT` | API port; defaults to `4001` in the development configuration |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS |
| `DATABASE_SSL` | Controls whether PostgreSQL SSL is enabled |

Use the values and validation rules in `backend/src/config/env.js` and `backend/.env.example` as the source of truth.

Keep real credentials out of source control. Use a strong, unique JWT secret of at least 32 characters, and never reuse production secrets in development.

---

## Development Roadmap

Development is planned in the following order:

1. **Project foundation and authentication** — establish configuration, database access, registration, login, and protected API routes.
2. **Journey management** — allow authenticated drivers to publish and manage planned journeys.
3. **Journey discovery and matching** — filter journeys and identify compatible routes and departure times.
4. **Booking workflow** — support seat requests, driver decisions, and seat availability.
5. **Frontend integration** — connect the client to the new API and implement the core carpooling experience.
6. **Community and trust features** — introduce additional profile, verification, feedback, and reporting capabilities.
7. **Quality and deployment** — expand automated tests, review security, and prepare deployment configuration.

Roadmap items may change as the implementation and testing progress.

---

## Security

- Passwords are hashed before storage.
- Authentication uses signed JWT access tokens.
- Registration and login endpoints have rate limits.
- User input is validated by the API.
- Database queries use parameterized statements where applicable.
- Local environment files and credentials must not be committed.
- Production deployment will require additional security review and configuration.

Do not use this development setup as a production deployment without appropriate testing and security hardening.

---

## Contributing

Contributions and suggestions are welcome.

For development changes:

1. Create a feature branch from the appropriate development branch.
2. Keep changes focused on a specific feature or fix.
3. Test the affected functionality.
4. Review the changes before committing.
5. Open a pull request with a clear summary, testing details, and any known limitations.

The current community rebuild is being developed on `rebuild/zovro-community` while the existing `main` branch is preserved.

---

## License

The repository currently contains its existing license configuration. Confirm the intended project license before redistributing or reusing the software.
