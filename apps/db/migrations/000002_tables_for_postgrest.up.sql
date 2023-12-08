CREATE OR REPLACE FUNCTION public.graphql_subscription()
RETURNS TRIGGER AS $$
DECLARE
  event_name TEXT;
  topic_template TEXT;
  id_column_name TEXT;
  id_value TEXT;
BEGIN
    event_name := TG_ARGV[0];
    topic_template := TG_ARGV[1];
    id_column_name := TG_ARGV[2];

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('SELECT ($1).%I', id_column_name) INTO id_value USING NEW;
    ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('SELECT ($1).%I', id_column_name) INTO id_value USING OLD;
    END IF;

    PERFORM pg_notify(format('graphql:%s:%s', topic_template, id_value), json_build_object('event', event_name)::TEXT);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parameter JSONB DEFAULT '{}'::JSONB NOT NULL,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
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
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    amount INT DEFAULT '0'::BIGINT NOT NULL,
    parameter JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_inventories_combination UNIQUE (item_id, user_id)
);

GRANT INSERT (item_id, user_id, amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT UPDATE (amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT DELETE ON TABLE public.inventories TO authenticated;
GRANT SELECT ON TABLE public.inventories TO anon;
GRANT SELECT ON TABLE public.inventories TO authenticated;



CREATE TABLE public.friends (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_friends_combination UNIQUE (user_id, friend_id)
);  

GRANT INSERT (user_id, friend_id) ON TABLE public.friends TO authenticated;
GRANT DELETE ON TABLE public.friends TO authenticated;
GRANT SELECT ON TABLE public.friends TO anon;
GRANT SELECT ON TABLE public.friends TO authenticated;

CREATE OR REPLACE FUNCTION public.friend_insert()
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
EXECUTE FUNCTION public.friend_insert();

CREATE OR REPLACE FUNCTION public.check_friends_limit()
RETURNS TRIGGER AS $$
DECLARE
  friends_count INTEGER;
BEGIN
    SELECT COUNT(1) INTO friends_count
    FROM public.friends
    WHERE user_id = NEW.user_id;

    IF friends_count = 1000 THEN
        RAISE sqlstate 'P0001' USING
                message = 'Friend limit exceeded',
                detail = 'User has reached 1000 friends',
                hint = 'Remove some friends for new ones';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_friends_limit_trigger
BEFORE INSERT ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.check_friends_limit();

CREATE OR REPLACE FUNCTION public.friend_delete()
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
EXECUTE FUNCTION public.friend_delete();



CREATE TABLE public.friend_requests (
    id SERIAL PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX unique_friend_requests_combination
ON public.friend_requests ((LEAST(requester_id, addressee_id)), (GREATEST(requester_id, addressee_id)));

GRANT INSERT (requester_id, addressee_id) ON TABLE public.friend_requests TO authenticated;
GRANT DELETE ON TABLE public.friend_requests TO authenticated;
GRANT SELECT ON TABLE public.friend_requests TO authenticated;

CREATE TRIGGER friend_request_changed_trigger
  AFTER INSERT OR DELETE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.graphql_subscription('friendRequestChanged', 'friend_requests', 'addressee_id');

CREATE OR REPLACE FUNCTION public.check_friend_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  friend_request_count INTEGER;
BEGIN
  SELECT COUNT(1) INTO friend_request_count
  FROM public.friend_requests
  WHERE addressee_id = NEW.addressee_id;

  IF friend_request_count = 100 THEN
    RAISE sqlstate 'P0001' USING
            message = 'Friend request limit exceeded',
            detail = 'User has 100 friend requests',
            hint = 'Ask your friend to make place for your friend request';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_friend_request_limit_trigger
BEFORE INSERT ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_friend_request_limit();

CREATE OR REPLACE FUNCTION public.check_accept_friend_requests_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        (SELECT accept_friend_requests FROM public.profiles WHERE user_id = NEW.addressee_id) = FALSE
    ) THEN
        RAISE sqlstate 'P0001' USING
            message = 'User doesn''t accept friend requests',
            hint = 'Ask your friend to send a friend request to you instead';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_accept_friend_requests_before_insert_trigger
BEFORE INSERT ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_accept_friend_requests_before_insert();



CREATE TABLE public.blocked (
    id SERIAL PRIMARY KEY,
    blocker_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_blocked_combination UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

GRANT INSERT (blocker_id, blocked_id) ON TABLE public.blocked TO authenticated;
GRANT DELETE ON TABLE public.blocked TO authenticated;
GRANT SELECT ON TABLE public.blocked TO authenticated;



CREATE TABLE public.organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_organization_members_combination UNIQUE (organization_id, member_id),
    CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (organization_id, member_id, role) ON TABLE public.organization_members TO authenticated;
GRANT UPDATE (role) ON TABLE public.organization_members TO authenticated;
GRANT DELETE ON TABLE public.organization_members TO authenticated;
GRANT SELECT ON TABLE public.organization_members TO anon;
GRANT SELECT ON TABLE public.organization_members TO authenticated;



CREATE TABLE public.organization_requests (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_organization_requests_combination UNIQUE (organization_id, addressee_id),
    CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (organization_id, addressee_id, role) ON TABLE public.organization_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.organization_requests TO authenticated;
GRANT DELETE ON TABLE public.organization_requests TO authenticated;
GRANT SELECT ON TABLE public.organization_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.check_organization_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  organization_request_count INTEGER;
BEGIN
  SELECT COUNT(1) INTO organization_request_count
  FROM public.organization_requests
  WHERE addressee_id = NEW.addressee_id;

  IF organization_request_count = 100 THEN
    RAISE sqlstate 'P0001' USING
            message = 'Organization join request limit exceeded',
            detail = 'User has 100 organization join requests',
            hint = 'Ask the user to make place for your organization join request';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organization_request_limit_trigger
BEFORE INSERT ON public.organization_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_organization_request_limit();

CREATE OR REPLACE FUNCTION public.make_organization_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF (auth.uid() IS NOT NULL) THEN
        INSERT INTO public.organization_members (organization_id, member_id, role)
        VALUES (NEW.id, auth.uid(), 'Owner');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER make_organization_creator_as_owner_trigger
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.make_organization_creator_as_owner();



CREATE TABLE public.project_members (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_project_members_combination UNIQUE (project_id, member_id),
    CHECK (role IN ('Member', 'Admin', 'Editor', 'Moderator', 'Owner'))
);

GRANT INSERT (project_id, member_id, role) ON TABLE public.project_members TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_members TO authenticated;
GRANT DELETE ON TABLE public.project_members TO authenticated;
GRANT SELECT ON TABLE public.project_members TO anon;
GRANT SELECT ON TABLE public.project_members TO authenticated;



CREATE TABLE public.project_requests (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(255) DEFAULT 'Member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_project_requests_combination UNIQUE (project_id, addressee_id),
    CHECK (role IN ('Member', 'Admin', 'Editor', 'Moderator', 'Owner'))
);

GRANT INSERT (project_id, addressee_id, role) ON TABLE public.project_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_requests TO authenticated;
GRANT DELETE ON TABLE public.project_requests TO authenticated;
GRANT SELECT ON TABLE public.project_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.check_project_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  project_request_count INTEGER;
BEGIN
  SELECT COUNT(1) INTO project_request_count
  FROM public.project_requests
  WHERE addressee_id = NEW.addressee_id;

  IF project_request_count = 100 THEN
    RAISE sqlstate 'P0001' USING
            message = 'Project join request limit exceeded',
            detail = 'User has 100 project join requests',
            hint = 'Ask the user to make place for your project join request';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_project_request_limit_trigger
BEFORE INSERT ON public.project_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_project_request_limit();

CREATE OR REPLACE FUNCTION public.make_project_creator_a_member()
RETURNS TRIGGER AS $$
DECLARE
    org_id INT;
    user_role TEXT;
BEGIN
    org_id := (
        SELECT p.organization_id
        FROM public.projects p
        WHERE p.id = NEW.id
    );

    user_role := (
        SELECT om.role
        FROM public.organization_members om
        WHERE om.organization_id = org_id
        AND om.member_id = auth.uid()
    );

    INSERT INTO public.project_members (project_id, member_id, role)
    SELECT NEW.id, auth.uid(), user_role;

    IF user_role <> 'Owner' THEN
        INSERT INTO public.project_members (project_id, member_id, role)
        SELECT NEW.id, om.member_id, 'Owner'
        FROM public.organization_members om
        WHERE om.organization_id = org_id
        AND om.role = 'Owner';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER make_project_creator_a_member_trigger
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.make_project_creator_a_member();



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
