CREATE TABLE public.items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parameter JSONB DEFAULT '{}'::JSONB,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT unique_items_combination UNIQUE (name, project_id)
);

GRANT INSERT (name, parameter, project_id, creator_id, is_private) ON TABLE public.items TO authenticated;
GRANT UPDATE (name, parameter, project_id, creator_id, is_private) ON TABLE public.items TO authenticated;
GRANT DELETE ON TABLE public.items TO authenticated;
GRANT SELECT ON TABLE public.items TO anon;
GRANT SELECT ON TABLE public.items TO authenticated;



CREATE TABLE public.inventories (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INT DEFAULT '0'::bigint,
    parameter JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CONSTRAINT unique_inventories_combination UNIQUE (item_id, user_id)
);

GRANT INSERT (item_id, user_id, amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT UPDATE (amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT DELETE ON TABLE public.inventories TO authenticated;
GRANT SELECT ON TABLE public.inventories TO anon;
GRANT SELECT ON TABLE public.inventories TO authenticated;



CREATE TABLE public.friends (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_friends_combination UNIQUE (user_id, friend_id)
);  

GRANT INSERT (user_id, friend_id) ON TABLE public.friends TO authenticated;
GRANT DELETE ON TABLE public.friends TO authenticated;
GRANT SELECT ON TABLE public.friends TO anon;
GRANT SELECT ON TABLE public.friends TO authenticated;

CREATE OR REPLACE FUNCTION friend_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.friends
        WHERE user_id = NEW.friend_id AND friend_id = NEW.user_id
    ) THEN
        INSERT INTO public.friends (user_id, friend_id)
        VALUES (NEW.friend_id, NEW.user_id);

        DELETE FROM public.friend_requests
        WHERE addressee_id = NEW.user_id AND requester_id = NEW.friend_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_insert_trigger
AFTER INSERT ON public.friends
FOR EACH ROW 
EXECUTE FUNCTION friend_insert();

CREATE OR REPLACE FUNCTION friend_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.friends
        WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id
    ) THEN 
        DELETE FROM public.friends
        WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_delete_trigger
AFTER DELETE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION friend_delete();



CREATE TABLE public.friend_requests (
    id SERIAL PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX unique_friend_requests_combination
ON public.friend_requests ((LEAST(requester_id, addressee_id)), (GREATEST(requester_id, addressee_id)));

GRANT INSERT (requester_id, addressee_id) ON TABLE public.friend_requests TO authenticated;
GRANT DELETE ON TABLE public.friend_requests TO authenticated;
GRANT SELECT ON TABLE public.friend_requests TO anon;
GRANT SELECT ON TABLE public.friend_requests TO authenticated;



CREATE TABLE public.blocked (
    id SERIAL PRIMARY KEY,
    blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_blocked_combination UNIQUE (blocker_id, blocked_id)
);

GRANT INSERT (blocker_id, blocked_id) ON TABLE public.blocked TO authenticated;
GRANT DELETE ON TABLE public.blocked TO authenticated;
GRANT SELECT ON TABLE public.blocked TO anon;
GRANT SELECT ON TABLE public.blocked TO authenticated;



CREATE TABLE public.organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CHECK (role IN ('Member', 'Admin', 'Moderator'))
);

GRANT INSERT (organization_id, member_id, role) ON TABLE public.organization_members TO authenticated;
GRANT UPDATE (role) ON TABLE public.organization_members TO authenticated;
GRANT DELETE ON TABLE public.organization_members TO authenticated;
GRANT SELECT ON TABLE public.organization_members TO anon;
GRANT SELECT ON TABLE public.organization_members TO authenticated;



CREATE TABLE public.organization_requests (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CHECK (role IN ('Member', 'Admin', 'Moderator'))
);

GRANT INSERT (organization_id, addressee_id, role) ON TABLE public.organization_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.organization_requests TO authenticated;
GRANT DELETE ON TABLE public.organization_requests TO authenticated;
GRANT SELECT ON TABLE public.organization_requests TO anon;
GRANT SELECT ON TABLE public.organization_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.make_user_member_of_organization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.organization_members (organization_id, member_id, role)
    VALUES (NEW.id, auth.uid(), 'Admin');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER make_user_member_of_organization_trigger
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.make_user_member_of_organization();



CREATE TABLE public.project_members (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CHECK (role IN ('Member', 'Admin', 'Editor', 'Moderator'))
);

GRANT INSERT (project_id, member_id, role) ON TABLE public.project_members TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_members TO authenticated;
GRANT DELETE ON TABLE public.project_members TO authenticated;
GRANT SELECT ON TABLE public.project_members TO anon;
GRANT SELECT ON TABLE public.project_members TO authenticated;

CREATE TABLE public.project_requests (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    CHECK (role IN ('Member', 'Admin', 'Moderator'))
);

GRANT INSERT (project_id, addressee_id, role) ON TABLE public.project_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_requests TO authenticated;
GRANT DELETE ON TABLE public.project_requests TO authenticated;
GRANT SELECT ON TABLE public.project_requests TO anon;
GRANT SELECT ON TABLE public.project_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.make_user_member_of_project()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.project_members (project_id, member_id, role)
    VALUES (NEW.id, auth.uid(), 'Admin');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER make_user_member_of_project_trigger
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.make_user_member_of_project();



GRANT USAGE, SELECT ON SEQUENCE public.blocked_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.friends_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.friend_requests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.inventories_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.items_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.oauth2_app_scopes_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.oauth2_apps_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.organization_members_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.organizations_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.organization_requests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_members_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.projects_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_requests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.scopes_id_seq TO authenticated;
