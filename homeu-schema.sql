--
-- PostgreSQL database dump
--

-- \restrict removed: this was a leaked credential from a pg_dump restricted restore operation. See audit C-3.

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg12+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_rfq_requests_project_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_rfq_requests_project_type AS ENUM (
    'home',
    'condo',
    'restaurant',
    'hotel',
    'office',
    'other'
);


--
-- Name: enum_rfq_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_rfq_requests_status AS ENUM (
    'new',
    'contacted',
    'quoted',
    'closed',
    'lost'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    description character varying,
    image_id integer,
    seo_title character varying,
    seo_description character varying,
    shopify_original_url character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id integer NOT NULL,
    alt character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric
);


--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    content jsonb,
    seo_title character varying,
    seo_description character varying,
    shopify_original_url character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


--
-- Name: DaVinciOS_kv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.DaVinciOS_kv (
    id integer NOT NULL,
    key character varying NOT NULL,
    data jsonb NOT NULL
);


--
-- Name: DaVinciOS_kv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.DaVinciOS_kv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DaVinciOS_kv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.DaVinciOS_kv_id_seq OWNED BY public.DaVinciOS_kv.id;


-- DaVinciOS_locked_documents, DaVinciOS_migrations, DaVinciOS_preferences
-- and their rels tables have been removed. They were Payload CMS internal
-- tables from the original framework and are not used by the current codebase.
-- DaVinciOS_kv is kept — it stores SMTP config set via admin Settings.


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    sku character varying,
    price numeric,
    sale_price numeric,
    show_price boolean DEFAULT true,
    price_note character varying,
    description jsonb,
    dimensions character varying,
    materials character varying,
    category_id integer,
    seo_title character varying,
    seo_description character varying,
    shopify_original_url character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: products_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    media_id integer
);


--
-- Name: products_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_rels_id_seq OWNED BY public.products_rels.id;


--
-- Name: rfq_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_requests (
    id integer NOT NULL,
    customer_name character varying NOT NULL,
    email character varying,
    phone character varying NOT NULL,
    delivery_location character varying,
    project_type public.enum_rfq_requests_project_type,
    notes character varying,
    estimated_total numeric,
    status public.enum_rfq_requests_status DEFAULT 'new'::public.enum_rfq_requests_status,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: rfq_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rfq_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rfq_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rfq_requests_id_seq OWNED BY public.rfq_requests.id;


--
-- Name: rfq_requests_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_requests_items (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    product_id integer,
    product_title_snapshot character varying,
    sku_snapshot character varying,
    unit_price_snapshot numeric,
    quantity numeric DEFAULT 1 NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    email character varying NOT NULL,
    reset_password_token character varying,
    reset_password_expiration timestamp(3) with time zone,
    salt character varying,
    hash character varying,
    login_attempts numeric DEFAULT 0,
    lock_until timestamp(3) with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_sessions (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    created_at timestamp(3) with time zone,
    expires_at timestamp(3) with time zone NOT NULL
);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: pages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);


--
-- Name: DaVinciOS_kv id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_kv ALTER COLUMN id SET DEFAULT nextval('public.DaVinciOS_kv_id_seq'::regclass);


--
-- Name: DaVinciOS_locked_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents ALTER COLUMN id SET DEFAULT nextval('public.DaVinciOS_locked_documents_id_seq'::regclass);


--
-- Name: DaVinciOS_locked_documents_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels ALTER COLUMN id SET DEFAULT nextval('public.DaVinciOS_locked_documents_rels_id_seq'::regclass);


--
-- Name: DaVinciOS_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_migrations ALTER COLUMN id SET DEFAULT nextval('public.DaVinciOS_migrations_id_seq'::regclass);


--
-- Name: DaVinciOS_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_preferences ALTER COLUMN id SET DEFAULT nextval('public.DaVinciOS_preferences_id_seq'::regclass);


--
-- Name: DaVinciOS_preferences_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_preferences_rels ALTER COLUMN id SET DEFAULT nextval('public.DaVinciOS_preferences_rels_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: products_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products_rels ALTER COLUMN id SET DEFAULT nextval('public.products_rels_id_seq'::regclass);


--
-- Name: rfq_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_requests ALTER COLUMN id SET DEFAULT nextval('public.rfq_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: DaVinciOS_kv DaVinciOS_kv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_kv
    ADD CONSTRAINT DaVinciOS_kv_pkey PRIMARY KEY (id);


--
-- Name: DaVinciOS_locked_documents DaVinciOS_locked_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents
    ADD CONSTRAINT DaVinciOS_locked_documents_pkey PRIMARY KEY (id);


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_pkey PRIMARY KEY (id);


--
-- Name: DaVinciOS_migrations DaVinciOS_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_migrations
    ADD CONSTRAINT DaVinciOS_migrations_pkey PRIMARY KEY (id);


--
-- Name: DaVinciOS_preferences DaVinciOS_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_preferences
    ADD CONSTRAINT DaVinciOS_preferences_pkey PRIMARY KEY (id);


--
-- Name: DaVinciOS_preferences_rels DaVinciOS_preferences_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_preferences_rels
    ADD CONSTRAINT DaVinciOS_preferences_rels_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products_rels products_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products_rels
    ADD CONSTRAINT products_rels_pkey PRIMARY KEY (id);


--
-- Name: rfq_requests_items rfq_requests_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_requests_items
    ADD CONSTRAINT rfq_requests_items_pkey PRIMARY KEY (id);


--
-- Name: rfq_requests rfq_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_requests
    ADD CONSTRAINT rfq_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_sessions users_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_pkey PRIMARY KEY (id);


--
-- Name: categories_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_created_at_idx ON public.categories USING btree (created_at);


--
-- Name: categories_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_image_idx ON public.categories USING btree (image_id);


--
-- Name: categories_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_slug_idx ON public.categories USING btree (slug);


--
-- Name: categories_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_updated_at_idx ON public.categories USING btree (updated_at);


--
-- Name: media_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_created_at_idx ON public.media USING btree (created_at);


--
-- Name: media_filename_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX media_filename_idx ON public.media USING btree (filename);


--
-- Name: media_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_updated_at_idx ON public.media USING btree (updated_at);


--
-- Name: pages_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_created_at_idx ON public.pages USING btree (created_at);


--
-- Name: pages_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pages_slug_idx ON public.pages USING btree (slug);


--
-- Name: pages_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_updated_at_idx ON public.pages USING btree (updated_at);


--
-- Name: DaVinciOS_kv_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX DaVinciOS_kv_key_idx ON public.DaVinciOS_kv USING btree (key);


--
-- Name: DaVinciOS_locked_documents_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_created_at_idx ON public.DaVinciOS_locked_documents USING btree (created_at);


--
-- Name: DaVinciOS_locked_documents_global_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_global_slug_idx ON public.DaVinciOS_locked_documents USING btree (global_slug);


--
-- Name: DaVinciOS_locked_documents_rels_categories_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_categories_id_idx ON public.DaVinciOS_locked_documents_rels USING btree (categories_id);


--
-- Name: DaVinciOS_locked_documents_rels_media_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_media_id_idx ON public.DaVinciOS_locked_documents_rels USING btree (media_id);


--
-- Name: DaVinciOS_locked_documents_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_order_idx ON public.DaVinciOS_locked_documents_rels USING btree ("order");


--
-- Name: DaVinciOS_locked_documents_rels_pages_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_pages_id_idx ON public.DaVinciOS_locked_documents_rels USING btree (pages_id);


--
-- Name: DaVinciOS_locked_documents_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_parent_idx ON public.DaVinciOS_locked_documents_rels USING btree (parent_id);


--
-- Name: DaVinciOS_locked_documents_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_path_idx ON public.DaVinciOS_locked_documents_rels USING btree (path);


--
-- Name: DaVinciOS_locked_documents_rels_products_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_products_id_idx ON public.DaVinciOS_locked_documents_rels USING btree (products_id);


--
-- Name: DaVinciOS_locked_documents_rels_rfq_requests_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_rfq_requests_id_idx ON public.DaVinciOS_locked_documents_rels USING btree (rfq_requests_id);


--
-- Name: DaVinciOS_locked_documents_rels_users_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_rels_users_id_idx ON public.DaVinciOS_locked_documents_rels USING btree (users_id);


--
-- Name: DaVinciOS_locked_documents_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_locked_documents_updated_at_idx ON public.DaVinciOS_locked_documents USING btree (updated_at);


--
-- Name: DaVinciOS_migrations_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_migrations_created_at_idx ON public.DaVinciOS_migrations USING btree (created_at);


--
-- Name: DaVinciOS_migrations_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_migrations_updated_at_idx ON public.DaVinciOS_migrations USING btree (updated_at);


--
-- Name: DaVinciOS_preferences_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_preferences_created_at_idx ON public.DaVinciOS_preferences USING btree (created_at);


--
-- Name: DaVinciOS_preferences_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_preferences_key_idx ON public.DaVinciOS_preferences USING btree (key);


--
-- Name: DaVinciOS_preferences_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_preferences_rels_order_idx ON public.DaVinciOS_preferences_rels USING btree ("order");


--
-- Name: DaVinciOS_preferences_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_preferences_rels_parent_idx ON public.DaVinciOS_preferences_rels USING btree (parent_id);


--
-- Name: DaVinciOS_preferences_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_preferences_rels_path_idx ON public.DaVinciOS_preferences_rels USING btree (path);


--
-- Name: DaVinciOS_preferences_rels_users_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_preferences_rels_users_id_idx ON public.DaVinciOS_preferences_rels USING btree (users_id);


--
-- Name: DaVinciOS_preferences_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX DaVinciOS_preferences_updated_at_idx ON public.DaVinciOS_preferences USING btree (updated_at);


--
-- Name: products_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_category_idx ON public.products USING btree (category_id);


--
-- Name: products_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_created_at_idx ON public.products USING btree (created_at);


--
-- Name: products_rels_media_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_rels_media_id_idx ON public.products_rels USING btree (media_id);


--
-- Name: products_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_rels_order_idx ON public.products_rels USING btree ("order");


--
-- Name: products_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_rels_parent_idx ON public.products_rels USING btree (parent_id);


--
-- Name: products_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_rels_path_idx ON public.products_rels USING btree (path);


--
-- Name: products_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_slug_idx ON public.products USING btree (slug);


--
-- Name: products_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_updated_at_idx ON public.products USING btree (updated_at);


--
-- Name: rfq_requests_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfq_requests_created_at_idx ON public.rfq_requests USING btree (created_at);


--
-- Name: rfq_requests_items_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfq_requests_items_order_idx ON public.rfq_requests_items USING btree (_order);


--
-- Name: rfq_requests_items_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfq_requests_items_parent_id_idx ON public.rfq_requests_items USING btree (_parent_id);


--
-- Name: rfq_requests_items_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfq_requests_items_product_idx ON public.rfq_requests_items USING btree (product_id);


--
-- Name: rfq_requests_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rfq_requests_updated_at_idx ON public.rfq_requests USING btree (updated_at);


--
-- Name: users_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_created_at_idx ON public.users USING btree (created_at);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_sessions_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_sessions_order_idx ON public.users_sessions USING btree (_order);


--
-- Name: users_sessions_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_sessions_parent_id_idx ON public.users_sessions USING btree (_parent_id);


--
-- Name: users_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_updated_at_idx ON public.users USING btree (updated_at);


--
-- Name: categories categories_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_image_id_media_id_fk FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_categories_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_categories_fk FOREIGN KEY (categories_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_media_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_media_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_pages_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_pages_fk FOREIGN KEY (pages_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.DaVinciOS_locked_documents(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_products_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_products_fk FOREIGN KEY (products_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_rfq_requests_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_rfq_requests_fk FOREIGN KEY (rfq_requests_id) REFERENCES public.rfq_requests(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_locked_documents_rels DaVinciOS_locked_documents_rels_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_locked_documents_rels
    ADD CONSTRAINT DaVinciOS_locked_documents_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_preferences_rels DaVinciOS_preferences_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_preferences_rels
    ADD CONSTRAINT DaVinciOS_preferences_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.DaVinciOS_preferences(id) ON DELETE CASCADE;


--
-- Name: DaVinciOS_preferences_rels DaVinciOS_preferences_rels_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.DaVinciOS_preferences_rels
    ADD CONSTRAINT DaVinciOS_preferences_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products_rels products_rels_media_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products_rels
    ADD CONSTRAINT products_rels_media_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;


--
-- Name: products_rels products_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products_rels
    ADD CONSTRAINT products_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: rfq_requests_items rfq_requests_items_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_requests_items
    ADD CONSTRAINT rfq_requests_items_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.rfq_requests(id) ON DELETE CASCADE;


--
-- Name: rfq_requests_items rfq_requests_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_requests_items
    ADD CONSTRAINT rfq_requests_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: users_sessions users_sessions_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict aJHtohdDkqPqdNzS9l6iR2Ce4cxydERbEkU96vuGyxOzaDXVcmHclhwRhDDJaf7

