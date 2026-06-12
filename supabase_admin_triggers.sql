-- SQL TRIGGER FOR SUPABASE SQL EDITOR
-- Run this script in the Supabase SQL Editor to make the Admin actions function properly (Excluir, Editar Senha).
-- This script synchronizes changes made on the public "users" table with the system "auth.users" table.

-- 1. Trigger to handle user deletion (Cascade delete from auth.users when a user is deleted from public.users)
CREATE OR REPLACE FUNCTION public.handle_delete_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_public_user_deleted ON public.users;
CREATE TRIGGER on_public_user_deleted
  AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_user();

-- 2. Trigger to handle password updates (Sync password changes from public.users to auth.users using bcrypt)
CREATE OR REPLACE FUNCTION public.handle_update_user_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS DISTINCT FROM OLD.password AND NEW.password IS NOT NULL AND NEW.password <> '' THEN
    UPDATE auth.users 
    SET encrypted_password = crypt(NEW.password, gen_salt('bf'))
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_public_user_password_updated ON public.users;
CREATE TRIGGER on_public_user_password_updated
  AFTER UPDATE OF password ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_user_password();
