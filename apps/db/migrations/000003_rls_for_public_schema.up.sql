ALTER TABLE public.blocked ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_select
    ON public.blocked
    AS PERMISSIVE
    FOR SELECT
    USING (
        auth.grant() = 'password' AND 
        auth.uid() = blocker_id
    );

CREATE POLICY blocked_delete
    ON public.blocked
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND 
        auth.uid() = blocker_id
    );

CREATE POLICY blocked_insert
    ON public.blocked
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND 
        auth.uid() = blocker_id AND 
        auth.uid() <> blocked_id
    );  

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY friends_select_permissive
    ON public.friends
    AS PERMISSIVE 
    FOR SELECT
    USING (
        (
            (
                auth.grant() = 'authorization_code' AND 
                'friends.read' = ANY(auth.jwt()->>'scopes'::ARRAY) AND 
                (auth.uid() = requester_id OR auth.uid() = addressee_id) AND
                is_accepted = TRUE
            )
            OR 
            (
                auth.grant() = 'password' AND
                (SELECT is_private FROM public.profiles WHERE user_id = auth.uid()) = FALSE AND
                is_accepted = TRUE
            )
            OR
            (
                auth.grant() = 'password' AND
                (auth.uid() = requester_id OR auth.uid() = addressee_id)
            )
        )
    );

CREATE POLICY friends_select_restrictive
    ON public.friends
    AS RESTRICTIVE
    FOR SELECT
    USING (
        auth.grant() = 'client_credentials'
    );

CREATE POLICY friends_delete
    ON public.friends
    AS PERMISSIVE
    FOR DELETE
    USING (
        auth.grant() = 'password' AND 
        (auth.uid() = requester_id OR auth.uid() = addressee_id)
    );

CREATE POLICY friends_insert
    ON public.friends
    AS PERMISSIVE
    FOR INSERT
    WITH CHECK (
        auth.grant() = 'password' AND 
        auth.uid() = requester_id AND 
        auth.uid() <> addressee_id AND 
        is_accepted = FALSE
    );

CREATE POLICY friends_update
    ON public.friends
    AS PERMISSIVE
    FOR UPDATE
    WITH CHECK (
        auth.grant() = 'password' AND
        auth.uid() <> requester_id AND
        auth.uid() = addressee_id AND 
        is_accepted = TRUE
    );


