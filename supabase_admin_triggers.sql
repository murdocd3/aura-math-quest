-- SQL ADMINISTRATOR TRIGGERS & POLICIES FOR SUPABASE SQL EDITOR
-- Run this script in your Supabase SQL Editor (New Query -> Run) to fix all administrative issues:
-- 1. Syncs user deletion and password changes from public.users to auth.users.
-- 2. Removes orphaned authentication records (allowing you to recreate deleted users like "manu").
-- 3. Grants full RLS bypass permissions to admin accounts using a recursive-safe checker.

-- =========================================================================
-- STEP 1: CLEAN UP ORPHANED AUTH USERS
-- Delete auth records of users who were deleted from the public users table.
-- Explicitly cast auth.users.id (UUID) to text to compare with public.users.id.
-- =========================================================================
DELETE FROM auth.users 
WHERE id::text NOT IN (SELECT id FROM public.users)
  AND email LIKE '%@auramathquest.local';


-- =========================================================================
-- STEP 2: CREATE DELETION & PASSWORD UPDATE TRIGGERS
-- =========================================================================

-- Trigger to delete auth record when public profile is deleted
CREATE OR REPLACE FUNCTION public.handle_delete_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id::uuid;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_public_user_deleted ON public.users;
CREATE TRIGGER on_public_user_deleted
  AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_user();

-- Trigger to handle password updates (Sync password changes from public.users to auth.users using bcrypt)
CREATE OR REPLACE FUNCTION public.handle_update_user_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS DISTINCT FROM OLD.password AND NEW.password IS NOT NULL AND NEW.password <> '' THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(NEW.password, gen_salt('bf'))
    WHERE id = NEW.id::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_public_user_password_updated ON public.users;
CREATE TRIGGER on_public_user_password_updated
  AFTER UPDATE OF password ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_user_password();


-- =========================================================================
-- STEP 3: CONFIGURE SECURE RLS POLICIES FOR ADMIN CHECKS
-- Bypasses auth.jwt() metadata constraints by checking database roles directly.
-- Casts auth.uid() (UUID) to text to query public.users.
-- =========================================================================

-- Safe checker function to avoid infinite RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply policies on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to view profiles" ON public.users;
CREATE POLICY "Allow authenticated to view profiles" ON public.users
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow users to manage their own profile" ON public.users;
CREATE POLICY "Allow users to manage their own profile" ON public.users
  FOR ALL TO authenticated 
  USING (auth.uid()::text = id OR public.is_admin())
  WITH CHECK (auth.uid()::text = id OR public.is_admin());

-- Re-apply policies on game_states table
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to view game states" ON public.game_states;
CREATE POLICY "Allow authenticated to view game states" ON public.game_states
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to manage their own game state" ON public.game_states;
CREATE POLICY "Allow users to manage their own game state" ON public.game_states
  FOR ALL TO authenticated 
  USING (auth.uid()::text = user_id OR public.is_admin())
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

-- Re-apply policies on pets table
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to view pets" ON public.pets;
CREATE POLICY "Allow authenticated to view pets" ON public.pets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to manage their own pets" ON public.pets;
CREATE POLICY "Allow users to manage their own pets" ON public.pets
  FOR ALL TO authenticated 
  USING (auth.uid()::text = user_id OR public.is_admin())
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());

-- Re-apply policies on math_statistics table
ALTER TABLE public.math_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own statistics" ON public.math_statistics;
CREATE POLICY "Allow users to manage their own statistics" ON public.math_statistics
  FOR ALL TO authenticated 
  USING (auth.uid()::text = user_id OR public.is_admin())
  WITH CHECK (auth.uid()::text = user_id OR public.is_admin());
