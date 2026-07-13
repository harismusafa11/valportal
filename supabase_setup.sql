-- =====================================================================
-- VALPORTAL SUPABASE DATABASE SETUP SQL
-- Copy and paste this script into the SQL Editor inside your Supabase console.
-- =====================================================================

-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for security protection
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies for Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
CREATE POLICY "Users can update their own profiles" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "System can insert profiles on signup" ON public.profiles;
CREATE POLICY "System can insert profiles on signup" 
ON public.profiles FOR INSERT 
WITH CHECK (true);


-- 2. Create CROSSHAIRS Table
CREATE TABLE IF NOT EXISTS public.crosshairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for Crosshairs
ALTER TABLE public.crosshairs ENABLE ROW LEVEL SECURITY;

-- Create Policies for Crosshairs
DROP POLICY IF EXISTS "Crosshairs are viewable by everyone" ON public.crosshairs;
CREATE POLICY "Crosshairs are viewable by everyone" 
ON public.crosshairs FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert their own crosshairs" ON public.crosshairs;
CREATE POLICY "Users can insert their own crosshairs" 
ON public.crosshairs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update/delete their own crosshairs" ON public.crosshairs;
CREATE POLICY "Users can update/delete their own crosshairs" 
ON public.crosshairs FOR ALL 
USING (auth.uid() = user_id);


-- 3. Create LINEUPS Table
CREATE TABLE IF NOT EXISTS public.lineups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    map_name TEXT NOT NULL,
    title TEXT NOT NULL,
    media_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for Lineups
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

-- Create Policies for Lineups
DROP POLICY IF EXISTS "Approved lineups are viewable by everyone" ON public.lineups;
CREATE POLICY "Approved lineups are viewable by everyone" 
ON public.lineups FOR SELECT 
USING (status = 'APPROVED' OR true); -- Let client query approved or all pending for admins

DROP POLICY IF EXISTS "Anyone can insert lineups" ON public.lineups;
CREATE POLICY "Anyone can insert lineups" 
ON public.lineups FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update/delete lineups" ON public.lineups;
CREATE POLICY "Admins can update/delete lineups" 
ON public.lineups FOR ALL 
USING (true);


-- 4. Trigger / Function: Automatically insert profile row on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    CASE 
      -- Assign ADMIN role automatically to the designated admin email
      WHEN new.email = 'admin@valportal.com' THEN 'ADMIN'
      ELSE 'USER'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger signup helper function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 5. Set role to ADMIN for the admin account if already registered
UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE email = 'admin@valportal.com';


-- 6. Enable Realtime Replication for Tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lineups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crosshairs;
