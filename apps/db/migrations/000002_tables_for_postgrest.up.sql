CREATE TABLE public.items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parameter JSONB DEFAULT '{}'::JSONB,
    project_id INT REFERENCES public.projects(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

CREATE TABLE public.inventories (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INT DEFAULT '0'::bigint,
    parameter JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

CREATE TABLE public.friends (
    id SERIAL PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

CREATE TABLE public.blocked (
    id SERIAL PRIMARY KEY,
    blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

CREATE TABLE public.project_members (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
