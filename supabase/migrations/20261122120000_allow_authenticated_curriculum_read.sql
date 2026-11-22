-- Allow signed-in users to read only active curriculum modules and published topics.
-- Curriculum content is shared; student progress and submissions remain separately protected.
CREATE POLICY modules_select_active_for_authenticated
ON public.modules
FOR SELECT
TO authenticated
USING (is_active IS TRUE);

CREATE POLICY topics_select_published_for_authenticated
ON public.topics
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1
    FROM public.modules AS parent_module
    WHERE parent_module.id = topics.module_id
      AND parent_module.is_active IS TRUE
  )
);
