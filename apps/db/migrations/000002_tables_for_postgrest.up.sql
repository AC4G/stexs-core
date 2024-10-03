CREATE TABLE public.items (	    id SERIAL PRIMARY KEY,
	name CITEXT NOT NULL,
	parameter JSONB DEFAULT '{}'::JSONB NOT NULL,
	description VARCHAR(800),
	project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
	creator_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
	is_private BOOLEAN DEFAULT FALSE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_items_combination UNIQUE (name, project_id),
	CONSTRAINT name_max_length CHECK (length(name) <= 50),
	CONSTRAINT parameter_size_limit CHECK (pg_column_size(parameter) <= 1048576),
	CONSTRAINT name_allowed_characters CHECK (name ~ '^[^\s]+(\s[^\s]+)*$')
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
	amount BIGINT,
	parameter JSONB DEFAULT '{}'::JSONB NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT parameter_size_limit CHECK (pg_column_size(parameter) <= 1048576)
);

GRANT INSERT (item_id, user_id, amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT UPDATE (amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT DELETE ON TABLE public.inventories TO authenticated;
GRANT SELECT ON TABLE public.inventories TO anon;
GRANT SELECT ON TABLE public.inventories TO authenticated;

CREATE OR REPLACE FUNCTION public.get_distinct_projects_from_inventory(
	user_id_param UUID,
	pointer INT DEFAULT NULL,
	limit_param INT DEFAULT 10,
	search_param TEXT DEFAULT NULL
)
RETURNS TABLE (
	id INT, 
	name CITEXT, 
	organization_name CITEXT
)
AS $$
BEGIN
	RETURN QUERY
	SELECT DISTINCT ON (projects.id)
		projects.id AS id,
		projects.name AS name,
		organizations.name AS organization_name
	FROM inventories
	JOIN items ON inventories.item_id = items.id
	JOIN projects ON items.project_id = projects.id
	JOIN organizations ON projects.organization_id = organizations.id
	WHERE inventories.user_id = user_id_param
		AND (pointer IS NULL OR projects.id > pointer)
		AND (search_param IS NULL OR projects.name ILIKE '%' || search_param || '%')
	ORDER BY projects.id
	LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_distinct_projects_from_inventory(UUID, INT, INT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_distinct_projects_from_inventory(UUID, INT, INT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_inventory_update()
RETURNS TRIGGER AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.projects AS p
		JOIN public.items AS i ON p.id = i.project_id
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
		WHERE i.id = NEW.item_id
			AND (
				oa.project_id = p.id OR
				oa.project_id IS NULL
			)
			AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
	) THEN
		RETURN NEW;
	END IF;

	IF OLD.amount IS NULL OR 
	EXISTS (
		SELECT 1
		FROM public.items AS i
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
		WHERE i.id = NEW.item_id
			AND (
				i.is_private IS TRUE OR
				i.unique IS TRUE
			)
			AND oa.project_id IS NULL
	) OR
	NEW.amount > OLD.amount OR NEW.parameter IS DISTINCT FROM OLD.parameter THEN
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_inventory_update_trigger
BEFORE UPDATE ON public.inventories
FOR EACH ROW 
EXECUTE FUNCTION public.check_inventory_update();

CREATE OR REPLACE FUNCTION public.check_inventory_delete()
RETURNS TRIGGER AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.projects AS p
		JOIN public.items AS i ON p.id = i.project_id
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
		WHERE i.id = NEW.item_id
			AND (
				oa.project_id = p.id OR
				oa.project_id IS NULL
			)
			AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
	) THEN
		RETURN NEW;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM public.items AS i
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
		WHERE i.id = NEW.item_id
			AND (
				i.is_private IS TRUE OR
				i.unique IS TRUE
			)
			AND oa.project_id IS NULL
	) THEN
		RETURN NULL;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_inventory_delete_trigger
BEFORE DELETE ON public.inventories
FOR EACH ROW 
EXECUTE FUNCTION public.check_inventory_delete();

CREATE OR REPLACE FUNCTION public.check_inventory_insert()
RETURNS TRIGGER AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.projects AS p
		JOIN public.items AS i ON p.id = i.project_id
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt()->>'client_id')::UUID
		WHERE i.id = NEW.item_id
			AND (
				oa.project_id = p.id OR
				oa.project_id IS NULL
			)
			AND p.organization_id = (auth.jwt() ->> 'organization_id')::INT
	) THEN
		RETURN NEW;
	END IF;

	RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_inventory_insert_trigger
BEFORE INSERT ON public.inventories
FOR EACH ROW 
EXECUTE FUNCTION public.check_inventory_insert();
 


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
		WHERE user_id = NEW.friend_id 
			AND friend_id = NEW.user_id
	) THEN
		INSERT INTO public.friends (user_id, friend_id)
		VALUES (NEW.friend_id, NEW.user_id);

		DELETE FROM public.friend_requests
		WHERE addressee_id = NEW.user_id 
			AND requester_id = NEW.friend_id;
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
  friends_count INT;
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
		WHERE user_id = OLD.friend_id 
			AND friend_id = OLD.user_id
	) THEN 
		DELETE FROM public.friends
		WHERE user_id = OLD.friend_id 
			AND friend_id = OLD.user_id;
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

CREATE OR REPLACE FUNCTION public.insert_friend_request_into_notifications()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.addressee_id IS NOT NULL THEN
		INSERT INTO public.notifications (
			user_id,
			type,
			friend_request_id
		) VALUES (
			NEW.addressee_id,
			'friend_request',
			NEW.id
		);
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_request_changed_trigger
  AFTER INSERT OR DELETE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_friend_request_into_notifications();

CREATE OR REPLACE FUNCTION public.check_friend_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  friend_request_count INT;
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
GRANT SELECT ON TABLE public.blocked TO anon;

CREATE OR REPLACE FUNCTION public.delete_friend_request_or_friend_if_exists()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM public.friend_requests
	WHERE (requester_id = NEW.blocker_id AND addressee_id = NEW.blocked_id)
		OR (requester_id = NEW.blocked_id AND addressee_id = NEW.blocker_id);

	DELETE FROM public.friends
	WHERE (user_id = NEW.blocker_id AND friend_id = NEW.blocked_id)
		OR (user_id = NEW.blocked_id AND friend_id = NEW.blocker_id);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_friend_request_or_friend_if_exists_trigger
BEFORE INSERT ON public.blocked
FOR EACH ROW
EXECUTE FUNCTION public.delete_friend_request_or_friend_if_exists();



CREATE TABLE public.organization_members (
	id SERIAL PRIMARY KEY,
	organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
	member_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
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

CREATE OR REPLACE FUNCTION public.delete_organization_request()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM public.organization_requests
	WHERE organization_id = NEW.organization_id AND addressee_id = NEW.member_id;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_organization_request_trigger
AFTER INSERT ON public.organization_members
FOR EACH ROW 
EXECUTE FUNCTION public.delete_organization_request();



CREATE TABLE public.organization_requests (
	id SERIAL PRIMARY KEY,
	organization_id INT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
	addressee_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_organization_requests_combination UNIQUE (organization_id, addressee_id),
	CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (organization_id, addressee_id, role) ON TABLE public.organization_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.organization_requests TO authenticated;
GRANT DELETE ON TABLE public.organization_requests TO authenticated;
GRANT SELECT ON TABLE public.organization_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_organization_request_into_notifications()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO public.notifications (
		user_id,
		type,
		organization_request_id
	) VALUES (
		NEW.addressee_id,
		'organization_request',
		NEW.id
	);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_request_changed_trigger
  AFTER INSERT ON public.organization_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_organization_request_into_notifications();

CREATE OR REPLACE FUNCTION public.check_organization_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  organization_request_count INT;
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
	INSERT INTO public.organization_members (organization_id, member_id, role)
	VALUES (NEW.id, auth.uid(), 'Owner');

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
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_project_members_combination UNIQUE (project_id, member_id),
	CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (project_id, member_id, role) ON TABLE public.project_members TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_members TO authenticated;
GRANT DELETE ON TABLE public.project_members TO authenticated;
GRANT SELECT ON TABLE public.project_members TO anon;
GRANT SELECT ON TABLE public.project_members TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_project_request()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM public.project_requests
	WHERE project_id = NEW.project_id 
		AND addressee_id = NEW.member_id;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_members_insert_trigger
AFTER INSERT ON public.project_members
FOR EACH ROW 
EXECUTE FUNCTION public.delete_project_request();



CREATE TABLE public.project_requests (
	id SERIAL PRIMARY KEY,
	project_id INT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
	addressee_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_project_requests_combination UNIQUE (project_id, addressee_id),
	CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (project_id, addressee_id, role) ON TABLE public.project_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_requests TO authenticated;
GRANT DELETE ON TABLE public.project_requests TO authenticated;
GRANT SELECT ON TABLE public.project_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_project_request_into_notifications()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO public.notifications (
		user_id,
		type,
		project_request_id
	) VALUES (
		NEW.addressee_id,
		'project_request',
		NEW.id
	);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_request_changed_trigger
  AFTER INSERT ON public.project_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_project_request_into_notifications();

CREATE OR REPLACE FUNCTION public.check_project_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  project_request_count INT;
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
$$ LANGUAGE plpgsql;GRANT DELETE ON TABLE public.oauth2_app_scopes TO authenticated;

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
		FROM public.projects AS p
		WHERE p.id = NEW.id
	);

	user_role := (
		SELECT om.role
		FROM public.organization_members AS om
		WHERE om.organization_id = org_id
			AND om.member_id = auth.uid()
	);

	INSERT INTO public.project_members (
		project_id, 
		member_id, 
		role
	)
	SELECT 
		NEW.id, 
		auth.uid(), 
		user_role;

	IF user_role <> 'Owner' THEN
		INSERT INTO public.project_members (
			project_id, 
			member_id, 
			role
		)
		SELECT 
			NEW.id, 
			om.member_id, 
			'Owner'
		FROM public.organization_members AS om
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



CREATE TABLE public.notifications (
	id SERIAL PRIMARY KEY,
	user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
	message TEXT,
	type VARCHAR(100) NOT NULL,
	seen BOOLEAN DEFAULT FALSE NOT NULL,
	friend_request_id INT REFERENCES public.friend_requests(id) ON DELETE CASCADE UNIQUE,
	organization_request_id INT REFERENCES public.organization_requests(id) ON DELETE CASCADE UNIQUE,
	project_request_id INT REFERENCES public.project_requests(id) ON DELETE CASCADE UNIQUE,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CHECK (type in ('message', 'friend_request', 'organization_request', 'project_request')),
	CHECK (
		(friend_request_id IS NOT NULL)::INT +
		(organization_request_id IS NOT NULL)::INT +
		(project_request_id IS NOT NULL)::INT <= 1
	)
);

GRANT UPDATE (seen) ON TABLE public.notifications TO authenticated;
GRANT INSERT ON TABLE public.notifications TO authenticated;
GRANT DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;



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
GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO authenticated;
