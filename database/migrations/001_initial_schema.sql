BEGIN;

-- Community member accounts.
-- Authentication-provider choices can be finalized separately.
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254),
    phone_number VARCHAR(20),
    password_hash TEXT,
    auth_provider VARCHAR(30),
    auth_subject VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_full_name_not_empty
        CHECK (LENGTH(TRIM(full_name)) > 0),

    CONSTRAINT users_auth_provider_subject_pair
        CHECK (
            (auth_provider IS NULL AND auth_subject IS NULL)
            OR
            (
                auth_provider IS NOT NULL
                AND auth_subject IS NOT NULL
            )
        )
);

CREATE UNIQUE INDEX users_email_unique_lower
    ON users (LOWER(email))
    WHERE email IS NOT NULL;

CREATE UNIQUE INDEX users_phone_unique
    ON users (phone_number)
    WHERE phone_number IS NOT NULL;

CREATE UNIQUE INDEX users_external_identity_unique
    ON users (auth_provider, auth_subject)
    WHERE auth_provider IS NOT NULL;


-- A planned journey that a driver already intends to make.
CREATE TABLE journeys (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES users(id),
    origin_name VARCHAR(255) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    departure_at TIMESTAMPTZ NOT NULL,
    seats_offered INTEGER NOT NULL,
    seats_booked INTEGER NOT NULL DEFAULT 0,
    contribution_per_seat_lkr NUMERIC(10, 2),
    notes VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT journeys_origin_lat_valid
        CHECK (origin_lat BETWEEN -90 AND 90),

    CONSTRAINT journeys_origin_lng_valid
        CHECK (origin_lng BETWEEN -180 AND 180),

    CONSTRAINT journeys_destination_lat_valid
        CHECK (destination_lat BETWEEN -90 AND 90),

    CONSTRAINT journeys_destination_lng_valid
        CHECK (destination_lng BETWEEN -180 AND 180),

    CONSTRAINT journeys_seats_offered_valid
        CHECK (seats_offered BETWEEN 1 AND 8),

    CONSTRAINT journeys_seats_booked_valid
        CHECK (seats_booked BETWEEN 0 AND seats_offered),

    CONSTRAINT journeys_contribution_valid
        CHECK (
            contribution_per_seat_lkr IS NULL
            OR contribution_per_seat_lkr >= 0
        ),

    CONSTRAINT journeys_status_valid
        CHECK (
            status IN (
                'scheduled',
                'in_progress',
                'completed',
                'cancelled'
            )
        ),

    CONSTRAINT journeys_origin_name_not_empty
        CHECK (LENGTH(TRIM(origin_name)) > 0),

    CONSTRAINT journeys_destination_name_not_empty
        CHECK (LENGTH(TRIM(destination_name)) > 0)
);

CREATE INDEX journeys_driver_id_idx
    ON journeys (driver_id);

CREATE INDEX journeys_departure_status_idx
    ON journeys (departure_at, status);

CREATE INDEX journeys_origin_coordinates_idx
    ON journeys (origin_lat, origin_lng);

CREATE INDEX journeys_destination_coordinates_idx
    ON journeys (destination_lat, destination_lng);


-- A passenger's request for seats on a planned journey.
CREATE TABLE bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    journey_id BIGINT NOT NULL
        REFERENCES journeys(id) ON DELETE RESTRICT,
    passenger_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    seats_requested INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bookings_seats_requested_valid
        CHECK (seats_requested BETWEEN 1 AND 8),

    CONSTRAINT bookings_status_valid
        CHECK (
            status IN (
                'pending',
                'accepted',
                'declined',
                'cancelled'
            )
        )
);

-- Prevent duplicate active requests, but allow re-requesting after
-- a previous request has been declined or cancelled.
CREATE UNIQUE INDEX bookings_one_active_request_per_passenger
    ON bookings (journey_id, passenger_id)
    WHERE status IN ('pending', 'accepted');

CREATE INDEX bookings_passenger_id_idx
    ON bookings (passenger_id);

CREATE INDEX bookings_journey_status_idx
    ON bookings (journey_id, status);

COMMIT;
