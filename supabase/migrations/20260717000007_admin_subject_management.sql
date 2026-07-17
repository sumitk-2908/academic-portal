-- Migration: Add CRUD RLS policies for subjects and modules for admins
-- file: supabase/migrations/20260717000007_admin_subject_management.sql

-- Subjects policies
CREATE POLICY "Admins can insert subjects" ON public.subjects
FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM public.admins WHERE (admins.user_id = auth.uid()) )));

CREATE POLICY "Admins can update subjects" ON public.subjects
FOR UPDATE USING ((EXISTS ( SELECT 1 FROM public.admins WHERE (admins.user_id = auth.uid()) )));

CREATE POLICY "Admins can delete subjects" ON public.subjects
FOR DELETE USING ((EXISTS ( SELECT 1 FROM public.admins WHERE (admins.user_id = auth.uid()) )));

-- Modules policies
CREATE POLICY "Admins can insert modules" ON public.modules
FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM public.admins WHERE (admins.user_id = auth.uid()) )));

CREATE POLICY "Admins can update modules" ON public.modules
FOR UPDATE USING ((EXISTS ( SELECT 1 FROM public.admins WHERE (admins.user_id = auth.uid()) )));

CREATE POLICY "Admins can delete modules" ON public.modules
FOR DELETE USING ((EXISTS ( SELECT 1 FROM public.admins WHERE (admins.user_id = auth.uid()) )));
