REVOKE ALL ON public.items FROM anon;
REVOKE ALL ON public.inventories FROM anon;
REVOKE ALL ON public.friends FROM anon;
REVOKE ALL ON public.blocked FROM anon;
REVOKE ALL ON public.organization_members FROM anon;
REVOKE ALL ON public.project_members FROM anon;

REVOKE USAGE, SELECT ON SEQUENCE public.items_id_seq FROM anon;

DROP TABLE public.project_members;
DROP TABLE public.organization_members;
DROP TABLE public.blocked;
DROP TABLE public.friends;
DROP TABLE public.inventories;
DROP TABLE public.items;

REVOKE ALL ON SEQUENCES FROM anon;
REVOKE ALL ON TABLES FROM anon;
