-- Revert RPCs and index added for reference link handling
DROP FUNCTION IF EXISTS public.reference_requests_get_by_token(uuid);
DROP FUNCTION IF EXISTS public.reference_requests_submit(uuid, jsonb);
DROP INDEX IF EXISTS public.reference_requests_token_unique;