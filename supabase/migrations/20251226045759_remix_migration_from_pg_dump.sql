CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'cashier'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'kaspi',
    'split'
);


--
-- Name: session_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_status AS ENUM (
    'active',
    'completed'
);


--
-- Name: tariff_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tariff_type AS ENUM (
    'hourly',
    'package'
);


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


SET default_table_access_method = heap;

--
-- Name: cashiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    pin text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: controller_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.controller_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    taken_at timestamp with time zone DEFAULT now() NOT NULL,
    returned_at timestamp with time zone,
    cost integer DEFAULT 0
);


--
-- Name: drink_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drink_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    drink_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    total_price integer NOT NULL,
    payment_method public.payment_method DEFAULT 'cash'::public.payment_method NOT NULL,
    cash_amount integer DEFAULT 0,
    kaspi_amount integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: drinks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drinks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    payment_method public.payment_method NOT NULL,
    cash_amount integer DEFAULT 0,
    kaspi_amount integer DEFAULT 0,
    total_amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    reserved_for timestamp with time zone NOT NULL,
    customer_name text,
    phone text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: session_drinks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_drinks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    drink_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    total_price integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    tariff_type public.tariff_type NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    status public.session_status DEFAULT 'active'::public.session_status NOT NULL,
    game_cost integer DEFAULT 0,
    controller_cost integer DEFAULT 0,
    drink_cost integer DEFAULT 0,
    total_cost integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cashier_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    total_cash integer DEFAULT 0 NOT NULL,
    total_kaspi integer DEFAULT 0 NOT NULL,
    total_games integer DEFAULT 0 NOT NULL,
    total_controllers integer DEFAULT 0 NOT NULL,
    total_drinks integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: stations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    zone text NOT NULL,
    station_number integer NOT NULL,
    hourly_rate integer NOT NULL,
    package_rate integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stations_station_number_check CHECK (((station_number >= 1) AND (station_number <= 8))),
    CONSTRAINT stations_zone_check CHECK ((zone = ANY (ARRAY['vip'::text, 'hall'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    cashier_id uuid
);


--
-- Name: cashiers cashiers_pin_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashiers
    ADD CONSTRAINT cashiers_pin_key UNIQUE (pin);


--
-- Name: cashiers cashiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashiers
    ADD CONSTRAINT cashiers_pkey PRIMARY KEY (id);


--
-- Name: controller_usage controller_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controller_usage
    ADD CONSTRAINT controller_usage_pkey PRIMARY KEY (id);


--
-- Name: drink_sales drink_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drink_sales
    ADD CONSTRAINT drink_sales_pkey PRIMARY KEY (id);


--
-- Name: drinks drinks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drinks
    ADD CONSTRAINT drinks_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: session_drinks session_drinks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_drinks
    ADD CONSTRAINT session_drinks_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- Name: stations stations_station_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_station_number_key UNIQUE (station_number);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: controller_usage controller_usage_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controller_usage
    ADD CONSTRAINT controller_usage_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: drink_sales drink_sales_drink_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drink_sales
    ADD CONSTRAINT drink_sales_drink_id_fkey FOREIGN KEY (drink_id) REFERENCES public.drinks(id);


--
-- Name: drink_sales drink_sales_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drink_sales
    ADD CONSTRAINT drink_sales_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: payments payments_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: payments payments_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: reservations reservations_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: reservations reservations_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: session_drinks session_drinks_drink_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_drinks
    ADD CONSTRAINT session_drinks_drink_id_fkey FOREIGN KEY (drink_id) REFERENCES public.drinks(id);


--
-- Name: session_drinks session_drinks_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_drinks
    ADD CONSTRAINT session_drinks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: sessions sessions_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id);


--
-- Name: shifts shifts_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.cashiers(id);


--
-- Name: user_roles user_roles_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.cashiers(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: controller_usage Authenticated users can create controller usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create controller usage" ON public.controller_usage FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: drink_sales Authenticated users can create drink sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create drink sales" ON public.drink_sales FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: payments Authenticated users can create payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: reservations Authenticated users can create reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create reservations" ON public.reservations FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: session_drinks Authenticated users can create session drinks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create session drinks" ON public.session_drinks FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: sessions Authenticated users can create sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: shifts Authenticated users can create shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create shifts" ON public.shifts FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: reservations Authenticated users can delete reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete reservations" ON public.reservations FOR DELETE TO authenticated USING (true);


--
-- Name: controller_usage Authenticated users can update controller usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update controller usage" ON public.controller_usage FOR UPDATE TO authenticated USING (true);


--
-- Name: reservations Authenticated users can update reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update reservations" ON public.reservations FOR UPDATE TO authenticated USING (true);


--
-- Name: sessions Authenticated users can update sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update sessions" ON public.sessions FOR UPDATE TO authenticated USING (true);


--
-- Name: shifts Authenticated users can update shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update shifts" ON public.shifts FOR UPDATE TO authenticated USING (true);


--
-- Name: controller_usage Authenticated users can view controller usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view controller usage" ON public.controller_usage FOR SELECT TO authenticated USING (true);


--
-- Name: drink_sales Authenticated users can view drink sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view drink sales" ON public.drink_sales FOR SELECT TO authenticated USING (true);


--
-- Name: payments Authenticated users can view payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view payments" ON public.payments FOR SELECT TO authenticated USING (true);


--
-- Name: reservations Authenticated users can view reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view reservations" ON public.reservations FOR SELECT TO authenticated USING (true);


--
-- Name: session_drinks Authenticated users can view session drinks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view session drinks" ON public.session_drinks FOR SELECT TO authenticated USING (true);


--
-- Name: sessions Authenticated users can view sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view sessions" ON public.sessions FOR SELECT TO authenticated USING (true);


--
-- Name: shifts Authenticated users can view shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view shifts" ON public.shifts FOR SELECT TO authenticated USING (true);


--
-- Name: cashiers Cashiers are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cashiers are publicly readable" ON public.cashiers FOR SELECT USING (true);


--
-- Name: drinks Drinks are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drinks are publicly readable" ON public.drinks FOR SELECT USING (true);


--
-- Name: stations Stations are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stations are publicly readable" ON public.stations FOR SELECT USING (true);


--
-- Name: user_roles Users can insert own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: cashiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cashiers ENABLE ROW LEVEL SECURITY;

--
-- Name: controller_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.controller_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: drink_sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drink_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: drinks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: reservations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

--
-- Name: session_drinks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_drinks ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: stations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;