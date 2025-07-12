CREATE TABLE public.inventories (
	id SERIAL PRIMARY KEY,
	item_id INT REFERENCES public.items (id) ON DELETE CASCADE NOT NULL,
	user_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	amount BIGINT,
	parameter JSONB DEFAULT '{}'::JSONB NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT parameter_size_limit CHECK (pg_column_size(parameter) <= 1048576)
);

GRANT INSERT (item_id, user_id, amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT UPDATE (amount, parameter) ON TABLE public.inventories TO authenticated;
GRANT DELETE, SELECT ON TABLE public.inventories TO authenticated;
GRANT SELECT ON TABLE public.inventories TO anon;

CREATE OR REPLACE FUNCTION public.check_inventory_update()
RETURNS TRIGGER AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.projects AS p
		JOIN public.items AS i ON p.id = i.project_id
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
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
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
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
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
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
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
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
		JOIN public.oauth2_apps AS oa ON oa.client_id = (auth.jwt() ->> 'client_id')::UUID
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

GRANT USAGE, SELECT ON SEQUENCE public.inventories_id_seq TO authenticated;
