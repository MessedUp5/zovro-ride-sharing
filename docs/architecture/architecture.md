# Zovro Community — System Architecture

## 1. Architecture Style

Zovro Community uses a modular monolith backend and a feature-based
frontend architecture.

The backend is deployed as one application, with business capabilities
organized into separate modules. The frontend is organized by product
features to keep related UI, state and API interactions together.

## 2. Technology Stack

### Frontend
- React
- Vite
- React Router
- Axios for HTTP communication
- Leaflet for maps when required

### Backend
- Node.js
- Express
- REST API
- Socket.IO for real-time functionality when required

### Database
- PostgreSQL
- Version-controlled SQL migrations
- A dedicated database access layer

## 3. Frontend Organization

The frontend is organized into:
- app: application setup and routing
- components: reusable UI components
- features/auth: authentication and account flows
- features/journeys: publishing and discovering journeys
- features/matching: journey matching interfaces
- features/bookings: seat requests and booking management
- features/community: profiles, ratings and trust features
- layouts: shared page layouts
- pages: route-level page components
- services: API clients and external integrations
- styles: global styles and design tokens

## 4. Backend Organization

The backend is organized into:
- config: environment and application configuration
- middleware: authentication, validation and error handling
- modules: domain-specific application modules
- database: connection management and database utilities
- app.js: Express application configuration
- server.js: server startup

Where appropriate, each backend module separates:
- routes: HTTP endpoint definitions
- controllers: HTTP request and response handling
- services: business rules and workflows
- repositories: database queries
- validation: request input validation

## 5. Core Domain Modules

- Auth: registration, login and identity
- Journeys: planned journeys published by drivers
- Matching: candidate journeys based on route and time compatibility
- Bookings: seat requests, acceptance, rejection and cancellation
- Community: profiles, ratings, reports and trust features

## 6. Request Flow

1. The React frontend sends an HTTP request.
2. Express routes the request and applies middleware.
3. A controller validates and interprets the HTTP request.
4. A service applies the relevant business rules.
5. A repository accesses PostgreSQL.
6. The API returns a structured response.

## 7. Core Product Principle

Drivers publish journeys they already intend to make.
Passengers discover compatible journeys and request available seats.
Drivers decide whether to accept or decline each request.

Zovro Community is a planned-journey carpooling platform, not primarily
an instant ride-dispatch service.

## 8. Architecture Constraints

- Keep secrets out of source control.
- Use environment variables for environment-specific configuration.
- Validate untrusted input on the backend.
- Enforce booking and seat-capacity rules on the backend.
- Use database transactions for operations that must remain consistent.
- Do not introduce microservices without a demonstrated need.
- Add real-time communication only where the product requires it.
