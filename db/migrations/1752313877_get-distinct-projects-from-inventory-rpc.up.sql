CREATE OR REPLACE FUNCTION public.get_distinct_projects_from_inventory(
	user_id_param UUID,
	last_project_id INT DEFAULT NULL,
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
		AND (last_project_id IS NULL OR projects.id > last_project_id)
		AND (search_param IS NULL OR projects.name ILIKE '%' || search_param || '%')
	ORDER BY projects.id ASC
	LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_distinct_projects_from_inventory(UUID, INT, INT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_distinct_projects_from_inventory(UUID, INT, INT, TEXT) TO authenticated;
