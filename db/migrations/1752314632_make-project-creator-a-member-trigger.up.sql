CREATE OR REPLACE FUNCTION public.make_project_creator_a_member()
RETURNS TRIGGER AS $$
DECLARE
	org_id INT;
	user_role TEXT;
BEGIN
	IF auth.uid() IS NULL THEN
		RETURN NULL;
	END IF;

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
