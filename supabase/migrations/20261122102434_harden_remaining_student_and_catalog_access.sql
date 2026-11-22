-- Harden remaining exposed public tables with explicit row-level access.
-- Students can read only their own records. Admins manage operational records.
-- Static game catalogs are readable; only admins can change catalog entries.
-- Login throttling remains isolated in private.student_login_attempts.

alter table public.enrollments enable row level security;
alter table public.game_items enable row level security;
alter table public.invoices enable row level security;
alter table public.pet_cosmetics enable row level security;
alter table public.student_assessment_unlocks enable row level security;
alter table public.student_inventory enable row level security;
alter table public.student_pet_inventory enable row level security;
alter table public.topic_progress enable row level security;

create policy enrollments_select_self_or_admin on public.enrollments for select to authenticated
using ((student_id = (select auth.uid()) and private.is_student_actor()) or private.is_admin_actor());
create policy enrollments_admin_insert on public.enrollments for insert to authenticated with check (private.is_admin_actor());
create policy enrollments_admin_update on public.enrollments for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy enrollments_admin_delete on public.enrollments for delete to authenticated using (private.is_admin_actor());

create policy game_items_catalog_read on public.game_items for select to anon, authenticated using (true);
create policy game_items_admin_insert on public.game_items for insert to authenticated with check (private.is_admin_actor());
create policy game_items_admin_update on public.game_items for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy game_items_admin_delete on public.game_items for delete to authenticated using (private.is_admin_actor());

create policy invoices_select_self_or_admin on public.invoices for select to authenticated
using ((student_id = (select auth.uid()) and private.is_student_actor()) or private.is_admin_actor());
create policy invoices_admin_insert on public.invoices for insert to authenticated with check (private.is_admin_actor());
create policy invoices_admin_update on public.invoices for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy invoices_admin_delete on public.invoices for delete to authenticated using (private.is_admin_actor());

create policy pet_cosmetics_catalog_read on public.pet_cosmetics for select to anon, authenticated using (is_active = true);
create policy pet_cosmetics_admin_insert on public.pet_cosmetics for insert to authenticated with check (private.is_admin_actor());
create policy pet_cosmetics_admin_update on public.pet_cosmetics for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy pet_cosmetics_admin_delete on public.pet_cosmetics for delete to authenticated using (private.is_admin_actor());

create policy student_assessment_unlocks_select_self_or_admin on public.student_assessment_unlocks for select to authenticated
using ((student_id = (select auth.uid()) and private.is_student_actor()) or private.is_admin_actor());
create policy student_assessment_unlocks_admin_insert on public.student_assessment_unlocks for insert to authenticated with check (private.is_admin_actor());
create policy student_assessment_unlocks_admin_update on public.student_assessment_unlocks for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy student_assessment_unlocks_admin_delete on public.student_assessment_unlocks for delete to authenticated using (private.is_admin_actor());

create policy student_inventory_select_self_or_admin on public.student_inventory for select to authenticated
using ((student_id = (select auth.uid()) and private.is_student_actor()) or private.is_admin_actor());
create policy student_inventory_admin_insert on public.student_inventory for insert to authenticated with check (private.is_admin_actor());
create policy student_inventory_admin_update on public.student_inventory for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy student_inventory_admin_delete on public.student_inventory for delete to authenticated using (private.is_admin_actor());

create policy student_pet_inventory_select_self_or_admin on public.student_pet_inventory for select to authenticated
using ((student_id = (select auth.uid()) and private.is_student_actor()) or private.is_admin_actor());
create policy student_pet_inventory_admin_insert on public.student_pet_inventory for insert to authenticated with check (private.is_admin_actor());
create policy student_pet_inventory_admin_update on public.student_pet_inventory for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy student_pet_inventory_admin_delete on public.student_pet_inventory for delete to authenticated using (private.is_admin_actor());

create policy topic_progress_select_self_or_admin on public.topic_progress for select to authenticated
using ((student_id = (select auth.uid()) and private.is_student_actor()) or private.is_admin_actor());
create policy topic_progress_admin_insert on public.topic_progress for insert to authenticated with check (private.is_admin_actor());
create policy topic_progress_admin_update on public.topic_progress for update to authenticated using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy topic_progress_admin_delete on public.topic_progress for delete to authenticated using (private.is_admin_actor());

revoke all privileges on table
  public.enrollments, public.game_items, public.invoices, public.pet_cosmetics,
  public.student_assessment_unlocks, public.student_inventory,
  public.student_pet_inventory, public.topic_progress
from anon, authenticated;

grant select, insert, update, delete on table
  public.enrollments, public.game_items, public.invoices, public.pet_cosmetics,
  public.student_assessment_unlocks, public.student_inventory,
  public.student_pet_inventory, public.topic_progress
to authenticated;

grant select on table public.game_items, public.pet_cosmetics to anon;
