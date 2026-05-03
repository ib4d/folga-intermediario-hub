--
-- PostgreSQL database dump
--

\restrict f1xwqCvGvHm8u18ZZFfZbQDGnfdqzu7Q59SH1jbnFRNHmQ1bpNqSYP728f6b8yK

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: CandidateStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CandidateStatus" AS ENUM (
    'RECOPILANDO_DOCS',
    'EN_REVISION_LEGAL',
    'REVISION_ADICIONAL',
    'DOCUMENTACION_PENDIENTE',
    'APROBADO',
    'RECHAZADO',
    'CONTRATADO',
    'RETIRADO',
    'EN_POLONIA'
);


ALTER TYPE public."CandidateStatus" OWNER TO postgres;

--
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DocumentType" AS ENUM (
    'PASSPORT',
    'KARTA_POBYTU',
    'PESEL',
    'DECYZJA_WOJEWODY',
    'CV',
    'OTHER'
);


ALTER TYPE public."DocumentType" OWNER TO postgres;

--
-- Name: LocationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LocationStatus" AS ENUM (
    'EN_ORIGEN',
    'EN_TRANSITO',
    'EN_POLONIA'
);


ALTER TYPE public."LocationStatus" OWNER TO postgres;

--
-- Name: Plan; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Plan" AS ENUM (
    'FREE',
    'STARTER',
    'PRO',
    'BUSINESS',
    'ENTERPRISE'
);


ALTER TYPE public."Plan" OWNER TO postgres;

--
-- Name: RecruitmentSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RecruitmentSource" AS ENUM (
    'WHATSAPP',
    'EMAIL',
    'REFERRAL',
    'GOOGLE_ADS',
    'WEBSITE',
    'OTHER'
);


ALTER TYPE public."RecruitmentSource" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'SUPERADMIN',
    'ADMIN',
    'INTERMEDIARIO',
    'LEGAL',
    'LOGISTICA'
);


ALTER TYPE public."Role" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ApiKey; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ApiKey" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    "keyHash" text NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ApiKey" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text NOT NULL,
    details jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "organizationId" text NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: Candidate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Candidate" (
    id text NOT NULL,
    "firstName" text,
    "lastName" text,
    email text,
    phone text,
    gender text,
    "dateOfBirth" timestamp(3) without time zone,
    "birthPlace" text,
    "birthCountry" text,
    citizenship text,
    nationality text,
    "heightCm" integer,
    country text DEFAULT 'COL'::text NOT NULL,
    "locationStatus" public."LocationStatus" DEFAULT 'EN_ORIGEN'::public."LocationStatus" NOT NULL,
    "polishAddress" text,
    "polishCity" text,
    "passportNumber" text,
    "passportIssueDate" timestamp(3) without time zone,
    "passportExpiry" timestamp(3) without time zone,
    "passportBiometric" boolean,
    "kartaPobytuNumber" text,
    "kartaPobytuIssueDate" timestamp(3) without time zone,
    "kartaPobytuExpiry" timestamp(3) without time zone,
    "kartaPobytuType" text,
    "peselNumber" text,
    "voivodatoNumber" text,
    "voivodatoIssueDate" timestamp(3) without time zone,
    "voivodatoExpiry" timestamp(3) without time zone,
    "voivodatoStatus" text,
    "recruitmentSource" public."RecruitmentSource",
    "recruiterId" text,
    "arrivalDate" timestamp(3) without time zone,
    accommodation text,
    "accommodationNotes" text,
    "arrivalNotes" text,
    status public."CandidateStatus" DEFAULT 'RECOPILANDO_DOCS'::public."CandidateStatus" NOT NULL,
    "rejectionReason" text,
    notes text,
    paid400pln boolean DEFAULT false NOT NULL,
    "paymentDate" timestamp(3) without time zone,
    "gdprConsent" boolean DEFAULT false NOT NULL,
    "gdprConsentDate" timestamp(3) without time zone,
    "intermediaryId" text NOT NULL,
    "selfRegistered" boolean DEFAULT false NOT NULL,
    "registrationToken" text,
    "ocrProcessed" boolean DEFAULT false NOT NULL,
    "ocrSource" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dataRetentionUntil" timestamp(3) without time zone,
    "isArchived" boolean DEFAULT false NOT NULL,
    "organizationId" text NOT NULL,
    "reviewNotes" text,
    score integer,
    "scoreLevel" text,
    "scoreUpdatedAt" timestamp(3) without time zone
);


ALTER TABLE public."Candidate" OWNER TO postgres;

--
-- Name: Document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    type public."DocumentType" NOT NULL,
    number text,
    "issuerCountry" text,
    "issueDate" timestamp(3) without time zone,
    "expiryDate" timestamp(3) without time zone,
    url text NOT NULL,
    "extractedData" jsonb,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verifiedById" text,
    "ocrStatus" text,
    "candidateId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "organizationId" text NOT NULL
);


ALTER TABLE public."Document" OWNER TO postgres;

--
-- Name: Lead; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Lead" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    status text DEFAULT 'NEW'::text NOT NULL,
    source text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Lead" OWNER TO postgres;

--
-- Name: LogisticsEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LogisticsEvent" (
    id text NOT NULL,
    "candidateId" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "arrivalDate" timestamp(3) without time zone,
    confirmed boolean DEFAULT false NOT NULL,
    "flightOrTrain" text,
    "organizationId" text NOT NULL,
    "pickedUpBy" text,
    terminal text,
    "transportType" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LogisticsEvent" OWNER TO postgres;

--
-- Name: Membership; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Membership" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "organizationId" text NOT NULL,
    role public."Role" DEFAULT 'INTERMEDIARIO'::public."Role" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Membership" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "candidateId" text,
    type text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "taxId" text,
    country text,
    plan public."Plan" DEFAULT 'FREE'::public."Plan" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "logoUrl" text,
    "primaryColor" text,
    "secondaryColor" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "referralCode" text,
    "referredById" text
);


ALTER TABLE public."Organization" OWNER TO postgres;

--
-- Name: Outreach; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Outreach" (
    id text NOT NULL,
    "leadId" text NOT NULL,
    step integer NOT NULL,
    message text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    reply text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "organizationId" text NOT NULL
);


ALTER TABLE public."Outreach" OWNER TO postgres;

--
-- Name: StatusHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StatusHistory" (
    id text NOT NULL,
    "candidateId" text NOT NULL,
    "fromStatus" public."CandidateStatus" NOT NULL,
    "toStatus" public."CandidateStatus" NOT NULL,
    "changedBy" text,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "organizationId" text NOT NULL
);


ALTER TABLE public."StatusHistory" OWNER TO postgres;

--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    plan public."Plan" NOT NULL,
    status text NOT NULL,
    "currentPeriodStart" timestamp(3) without time zone,
    "currentPeriodEnd" timestamp(3) without time zone,
    provider text,
    "providerCustomerId" text,
    "providerSubscriptionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Subscription" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "passwordHash" text,
    role public."Role" DEFAULT 'INTERMEDIARIO'::public."Role" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isPlatformAdmin" boolean DEFAULT false NOT NULL,
    "organizationId" text,
    settings jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: Workflow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Workflow" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "triggerType" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Workflow" OWNER TO postgres;

--
-- Name: WorkflowStep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."WorkflowStep" (
    id text NOT NULL,
    "workflowId" text NOT NULL,
    type text NOT NULL,
    config jsonb NOT NULL,
    "order" integer NOT NULL
);


ALTER TABLE public."WorkflowStep" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: ApiKey; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ApiKey" (id, "organizationId", name, "keyHash", "lastUsedAt", "revokedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "userId", action, entity, "entityId", details, "createdAt", "organizationId") FROM stdin;
\.


--
-- Data for Name: Candidate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Candidate" (id, "firstName", "lastName", email, phone, gender, "dateOfBirth", "birthPlace", "birthCountry", citizenship, nationality, "heightCm", country, "locationStatus", "polishAddress", "polishCity", "passportNumber", "passportIssueDate", "passportExpiry", "passportBiometric", "kartaPobytuNumber", "kartaPobytuIssueDate", "kartaPobytuExpiry", "kartaPobytuType", "peselNumber", "voivodatoNumber", "voivodatoIssueDate", "voivodatoExpiry", "voivodatoStatus", "recruitmentSource", "recruiterId", "arrivalDate", accommodation, "accommodationNotes", "arrivalNotes", status, "rejectionReason", notes, paid400pln, "paymentDate", "gdprConsent", "gdprConsentDate", "intermediaryId", "selfRegistered", "registrationToken", "ocrProcessed", "ocrSource", "createdAt", "updatedAt", "dataRetentionUntil", "isArchived", "organizationId", "reviewNotes", score, "scoreLevel", "scoreUpdatedAt") FROM stdin;
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Document" (id, type, number, "issuerCountry", "issueDate", "expiryDate", url, "extractedData", "isVerified", "verifiedById", "ocrStatus", "candidateId", "createdAt", "updatedAt", "organizationId") FROM stdin;
\.


--
-- Data for Name: Lead; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Lead" (id, "organizationId", name, email, phone, company, status, source, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LogisticsEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LogisticsEvent" (id, "candidateId", notes, "createdAt", "arrivalDate", confirmed, "flightOrTrain", "organizationId", "pickedUpBy", terminal, "transportType", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Membership; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Membership" (id, "userId", "organizationId", role, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "candidateId", type, message, "isRead", "createdAt", "organizationId", "userId") FROM stdin;
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Organization" (id, name, slug, "taxId", country, plan, "isActive", "logoUrl", "primaryColor", "secondaryColor", "createdAt", "updatedAt", "referralCode", "referredById") FROM stdin;
\.


--
-- Data for Name: Outreach; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Outreach" (id, "leadId", step, message, "sentAt", reply, "createdAt", "organizationId") FROM stdin;
\.


--
-- Data for Name: StatusHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StatusHistory" (id, "candidateId", "fromStatus", "toStatus", "changedBy", reason, "createdAt", "organizationId") FROM stdin;
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Subscription" (id, "organizationId", plan, status, "currentPeriodStart", "currentPeriodEnd", provider, "providerCustomerId", "providerSubscriptionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, name, "passwordHash", role, "isActive", "createdAt", "updatedAt", "isPlatformAdmin", "organizationId", settings) FROM stdin;
\.


--
-- Data for Name: Workflow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Workflow" (id, "organizationId", name, "isActive", "triggerType", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WorkflowStep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."WorkflowStep" (id, "workflowId", type, config, "order") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
46a81ab8-f459-4855-bb55-ee65eee3f525	3cf9343f80c3ef067715b3b8247fe01ce7f75911ad62f30056394d33abdf4233	2026-05-03 05:23:05.480033+00	20260501185054_add_hrappka_fields_statushistory_auditlog	\N	\N	2026-05-03 05:23:05.190934+00	1
\.


--
-- Name: ApiKey ApiKey_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApiKey"
    ADD CONSTRAINT "ApiKey_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Candidate Candidate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: Lead Lead_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_pkey" PRIMARY KEY (id);


--
-- Name: LogisticsEvent LogisticsEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogisticsEvent"
    ADD CONSTRAINT "LogisticsEvent_pkey" PRIMARY KEY (id);


--
-- Name: Membership Membership_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: Outreach Outreach_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outreach"
    ADD CONSTRAINT "Outreach_pkey" PRIMARY KEY (id);


--
-- Name: StatusHistory StatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StatusHistory"
    ADD CONSTRAINT "StatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WorkflowStep WorkflowStep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WorkflowStep"
    ADD CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY (id);


--
-- Name: Workflow Workflow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Workflow"
    ADD CONSTRAINT "Workflow_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AuditLog_id_organizationId_key" ON public."AuditLog" USING btree (id, "organizationId");


--
-- Name: Candidate_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Candidate_id_organizationId_key" ON public."Candidate" USING btree (id, "organizationId");


--
-- Name: Candidate_organizationId_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Candidate_organizationId_email_idx" ON public."Candidate" USING btree ("organizationId", email);


--
-- Name: Candidate_registrationToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Candidate_registrationToken_key" ON public."Candidate" USING btree ("registrationToken");


--
-- Name: Document_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Document_id_organizationId_key" ON public."Document" USING btree (id, "organizationId");


--
-- Name: Lead_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Lead_id_organizationId_key" ON public."Lead" USING btree (id, "organizationId");


--
-- Name: Membership_userId_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON public."Membership" USING btree ("userId", "organizationId");


--
-- Name: Organization_referralCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Organization_referralCode_key" ON public."Organization" USING btree ("referralCode");


--
-- Name: Organization_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Organization_slug_key" ON public."Organization" USING btree (slug);


--
-- Name: Outreach_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Outreach_id_organizationId_key" ON public."Outreach" USING btree (id, "organizationId");


--
-- Name: StatusHistory_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StatusHistory_id_organizationId_key" ON public."StatusHistory" USING btree (id, "organizationId");


--
-- Name: Subscription_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Subscription_id_organizationId_key" ON public."Subscription" USING btree (id, "organizationId");


--
-- Name: Subscription_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Subscription_organizationId_key" ON public."Subscription" USING btree ("organizationId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Workflow_id_organizationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Workflow_id_organizationId_key" ON public."Workflow" USING btree (id, "organizationId");


--
-- Name: ApiKey ApiKey_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApiKey"
    ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Candidate Candidate_intermediaryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Candidate Candidate_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Candidate"
    ADD CONSTRAINT "Candidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Document Document_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."Candidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Document Document_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Lead Lead_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LogisticsEvent LogisticsEvent_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogisticsEvent"
    ADD CONSTRAINT "LogisticsEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."Candidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LogisticsEvent LogisticsEvent_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogisticsEvent"
    ADD CONSTRAINT "LogisticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Membership Membership_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Membership Membership_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."Candidate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Organization Organization_referredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Outreach Outreach_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outreach"
    ADD CONSTRAINT "Outreach_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."Lead"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Outreach Outreach_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outreach"
    ADD CONSTRAINT "Outreach_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StatusHistory StatusHistory_candidateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StatusHistory"
    ADD CONSTRAINT "StatusHistory_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES public."Candidate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StatusHistory StatusHistory_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StatusHistory"
    ADD CONSTRAINT "StatusHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subscription Subscription_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkflowStep WorkflowStep_workflowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WorkflowStep"
    ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES public."Workflow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Workflow Workflow_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Workflow"
    ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict f1xwqCvGvHm8u18ZZFfZbQDGnfdqzu7Q59SH1jbnFRNHmQ1bpNqSYP728f6b8yK

