--
-- PostgreSQL database dump
--

\restrict PYOs4RyaegAa8gDrvNpVqw3QODgFJCajjfoiF4QfT1D3hJyobhPto7hvV8w1yLf

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-17 18:09:06

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 16423)
-- Name: drivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drivers (
    driver_id integer NOT NULL,
    driver_uid character varying(255) NOT NULL,
    full_name character varying(100),
    status character varying(20) DEFAULT 'offline'::character varying,
    latitude numeric(9,6),
    longitude numeric(9,6),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.drivers OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16422)
-- Name: drivers_driver_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.drivers_driver_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drivers_driver_id_seq OWNER TO postgres;

--
-- TOC entry 4946 (class 0 OID 0)
-- Dependencies: 223
-- Name: drivers_driver_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.drivers_driver_id_seq OWNED BY public.drivers.driver_id;


--
-- TOC entry 222 (class 1259 OID 16405)
-- Name: rides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rides (
    ride_id integer NOT NULL,
    rider_uid character varying(255) NOT NULL,
    pickup_address text,
    drop_address text,
    pickup_lat double precision,
    pickup_lng double precision,
    drop_lat double precision,
    drop_lng double precision,
    fare_lkr numeric(10,2),
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    driver_uid character varying(255),
    driver_current_lat double precision,
    driver_current_lng double precision,
    driver_lat double precision,
    driver_lng double precision
);


ALTER TABLE public.rides OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16404)
-- Name: rides_ride_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rides_ride_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rides_ride_id_seq OWNER TO postgres;

--
-- TOC entry 4947 (class 0 OID 0)
-- Dependencies: 221
-- Name: rides_ride_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rides_ride_id_seq OWNED BY public.rides.ride_id;


--
-- TOC entry 220 (class 1259 OID 16390)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    firebase_uid character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    phone_number character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(255),
    password text,
    user_type character varying(20) DEFAULT 'rider'::character varying,
    current_lat double precision,
    current_lng double precision
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4948 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4771 (class 2604 OID 16426)
-- Name: drivers driver_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers ALTER COLUMN driver_id SET DEFAULT nextval('public.drivers_driver_id_seq'::regclass);


--
-- TOC entry 4768 (class 2604 OID 16408)
-- Name: rides ride_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rides ALTER COLUMN ride_id SET DEFAULT nextval('public.rides_ride_id_seq'::regclass);


--
-- TOC entry 4765 (class 2604 OID 16393)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4940 (class 0 OID 16423)
-- Dependencies: 224
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drivers (driver_id, driver_uid, full_name, status, latitude, longitude, created_at) FROM stdin;
1	test-driver-123	John Doe	online	6.927100	79.861200	2026-05-13 22:09:01.658626
\.


--
-- TOC entry 4938 (class 0 OID 16405)
-- Dependencies: 222
-- Data for Name: rides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rides (ride_id, rider_uid, pickup_address, drop_address, pickup_lat, pickup_lng, drop_lat, drop_lng, fare_lkr, status, created_at, driver_uid, driver_current_lat, driver_current_lng, driver_lat, driver_lng) FROM stdin;
56	22	Mattakkuliya, Colombo, Colombo District, Western Province, 01500, Sri Lanka	Perahera Mawatha, Weekanda, Slave Island, Colombo, Colombo District, Western Province, 00200, Sri Lanka	6.9742399952913505	79.87675648199213	6.916814641196045	79.85374484638449	1795.08	accepted	2026-05-16 18:29:27.78742	21	6.965941	79.870644	\N	\N
\.


--
-- TOC entry 4936 (class 0 OID 16390)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, firebase_uid, first_name, last_name, phone_number, created_at, email, password, user_type, current_lat, current_lng) FROM stdin;
22	6y8ikclJNwYxOXaMVyiZ5xkjCpX2	M	N	+94778863705	2026-05-13 11:20:25.091881	6y8ikclJNwYxOXaMVyiZ5xkjCpX2@zovro.com	$2b$10$cuK51Vm5kuXmF68oVxr0/OT5xUzwT5ZfFDztPV/md3ZzPlsPQUD5K	rider	\N	\N
21	PO6YeCgcPsc9RRnqZxsHjgDb8lH3	V	M	+94775947863	2026-05-12 23:30:00.571237	PO6YeCgcPsc9RRnqZxsHjgDb8lH3@zovro.com	$2b$10$9WcnJ0liyyQuWFrxr74d.O3TGVwd7kx6X0jzVYSn.xCynTtpeM/Iy	driver	6.965941	79.870644
\.


--
-- TOC entry 4949 (class 0 OID 0)
-- Dependencies: 223
-- Name: drivers_driver_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.drivers_driver_id_seq', 1, true);


--
-- TOC entry 4950 (class 0 OID 0)
-- Dependencies: 221
-- Name: rides_ride_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rides_ride_id_seq', 56, true);


--
-- TOC entry 4951 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 22, true);


--
-- TOC entry 4785 (class 2606 OID 16434)
-- Name: drivers drivers_driver_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_driver_uid_key UNIQUE (driver_uid);


--
-- TOC entry 4787 (class 2606 OID 16432)
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (driver_id);


--
-- TOC entry 4783 (class 2606 OID 16416)
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (ride_id);


--
-- TOC entry 4775 (class 2606 OID 16418)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4777 (class 2606 OID 16401)
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- TOC entry 4779 (class 2606 OID 16403)
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 4781 (class 2606 OID 16399)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


-- Completed on 2026-05-17 18:09:08

--
-- PostgreSQL database dump complete
--

\unrestrict PYOs4RyaegAa8gDrvNpVqw3QODgFJCajjfoiF4QfT1D3hJyobhPto7hvV8w1yLf

