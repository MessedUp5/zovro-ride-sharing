# Zovro Community — Initial Product Requirements

## 1. Product Vision

Zovro Community is a Sri Lankan community-based carpooling platform
that helps people share planned journeys and contribute transparently
toward shared travel costs.

## 2. Core Users

### Driver
A driver publishes a journey they already intend to make, including
origin, destination, departure time and available seats.

### Passenger
A passenger searches for compatible journeys and requests a seat.

## 3. MVP Features

### Authentication and Profiles
- User registration and login
- Basic profile management
- Identity and contact verification design

### Journey Management
- Publish a planned journey
- Specify origin, destination, departure time and available seats
- View, edit or cancel eligible journeys

### Journey Discovery and Matching
- Search by origin, destination, date and time
- Identify journeys with suitable route and time overlap
- Display journey details and available seats

### Booking Management
- Request a seat on a journey
- Allow the driver to accept or decline a request
- Track booking status
- Prevent bookings beyond available capacity
- Support appropriate cancellation rules

### Community and Trust
- View community member profiles
- Display transparent shared-cost contributions
- Plan ratings, reporting and trip-sharing features

## 4. Shared-Cost Principle

The platform is intended for cost sharing, not fare-based taxi dispatch.
Contribution rules must be transparent to users.

The exact calculation, limits and applicable policies must be defined
before implementing the contribution feature.

## 5. Out of Scope for the Initial Foundation

- Instant driver dispatch
- Mandatory payment gateway integration
- Physical transport or delivery services
- Microservices
- Advanced predictive matching

These items may be reconsidered after the MVP requirements are validated.

## 6. Important Business Rules

- A journey represents a driver's planned trip.
- A passenger request does not become an accepted booking automatically.
- Only eligible journeys may receive new booking requests.
- Accepted bookings must respect available seat capacity.
- Booking status transitions must be validated by the backend.
- Users must not be able to modify another user's journey or booking
  without authorization.

## 7. Open Decisions

The following require explicit decisions before implementation:
- Whether guests can browse journeys
- Which verification methods are required for the MVP
- How shared-cost contributions are calculated
- Cancellation deadlines and rules
- Whether journeys can be recurring
- Which rating and reporting rules apply
