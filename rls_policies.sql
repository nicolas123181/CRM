-- ============================================
-- Row Level Security (RLS) Policies
-- Mini-CRM Database for SoftControl
-- ============================================
-- This script configures security policies for role-based access control
-- Run this AFTER schema.sql in Supabase SQL Editor

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS eventos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles
    FOR SELECT
    USING (is_admin(auth.uid()));

-- Only admins can insert profiles (for creating admin users manually)
CREATE POLICY "Admins can insert profiles"
    ON profiles
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON profiles
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
    ON profiles
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- CLIENTS TABLE POLICIES
-- ============================================

-- All authenticated users can view clients
CREATE POLICY "Authenticated users can view clients"
    ON clients
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admins can insert clients
CREATE POLICY "Admins can insert clients"
    ON clients
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can update clients
CREATE POLICY "Admins can update clients"
    ON clients
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete clients
CREATE POLICY "Admins can delete clients"
    ON clients
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- PRODUCTS TABLE POLICIES
-- ============================================

-- All authenticated users can view products
CREATE POLICY "Authenticated users can view products"
    ON products
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admins can insert products
CREATE POLICY "Admins can insert products"
    ON products
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can update products
CREATE POLICY "Admins can update products"
    ON products
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete products
CREATE POLICY "Admins can delete products"
    ON products
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- LICENSES TABLE POLICIES
-- ============================================

-- All authenticated users can view licenses
CREATE POLICY "Authenticated users can view licenses"
    ON licenses
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admins can insert licenses
CREATE POLICY "Admins can insert licenses"
    ON licenses
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can update licenses
CREATE POLICY "Admins can update licenses"
    ON licenses
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete licenses
CREATE POLICY "Admins can delete licenses"
    ON licenses
    FOR DELETE
    USING (is_admin(auth.uid()));

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify policies are working correctly

-- Check if RLS is enabled on all tables
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public';

-- View all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================
-- EVENTOS TABLE POLICIES
-- ============================================
-- If your project uses the "eventos" table, apply these policies too.
-- They allow authenticated users to read events and admins to write.

DO $$
BEGIN
    IF to_regclass('public.eventos') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view eventos" ON eventos';
        EXECUTE 'CREATE POLICY "Authenticated users can view eventos" ON eventos FOR SELECT USING (auth.uid() IS NOT NULL)';

        EXECUTE 'DROP POLICY IF EXISTS "Admins can insert eventos" ON eventos';
        EXECUTE 'CREATE POLICY "Admins can insert eventos" ON eventos FOR INSERT WITH CHECK (is_admin(auth.uid()))';

        EXECUTE 'DROP POLICY IF EXISTS "Admins can update eventos" ON eventos';
        EXECUTE 'CREATE POLICY "Admins can update eventos" ON eventos FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))';

        EXECUTE 'DROP POLICY IF EXISTS "Admins can delete eventos" ON eventos';
        EXECUTE 'CREATE POLICY "Admins can delete eventos" ON eventos FOR DELETE USING (is_admin(auth.uid()))';
    END IF;
END $$;

-- ============================================
-- GLOBAL RLS HARDENING (ALL PUBLIC TABLES)
-- ============================================
-- Goal:
-- - Admins can edit everything (INSERT/UPDATE/DELETE) across all public tables.
-- - Non-admin users cannot edit any table, even if legacy permissive policies exist.
-- - Authenticated users can still read data.
--
-- This block is idempotent and can be re-run safely.

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);

        -- Read access for authenticated users
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'global_read_authenticated', tbl.tablename);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)',
            'global_read_authenticated',
            tbl.tablename
        );

        -- Admin permissive access to all operations
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'global_admin_all', tbl.tablename);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))',
            'global_admin_all',
            tbl.tablename
        );

        -- Restrictive write guards: block non-admin writes regardless of legacy policies
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'global_admin_only_insert_guard', tbl.tablename);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()))',
            'global_admin_only_insert_guard',
            tbl.tablename
        );

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'global_admin_only_update_guard', tbl.tablename);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))',
            'global_admin_only_update_guard',
            tbl.tablename
        );

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'global_admin_only_delete_guard', tbl.tablename);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()))',
            'global_admin_only_delete_guard',
            tbl.tablename
        );
    END LOOP;
END $$;
