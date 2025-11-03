-- Add is_active and is_archived columns to profiles table
-- Run this in your Supabase SQL Editor

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Added is_active column to profiles table';
  ELSE
    RAISE NOTICE 'is_active column already exists in profiles table';
  END IF;
END $$;

-- Add is_archived column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'is_archived') THEN
    ALTER TABLE profiles ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_archived column to profiles table';
  ELSE
    RAISE NOTICE 'is_archived column already exists in profiles table';
  END IF;
END $$;

-- Add indexes for performance (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
    RAISE NOTICE 'Created index on is_active column';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'profiles' AND column_name = 'is_archived') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_archived ON profiles(is_archived);
    RAISE NOTICE 'Created index on is_archived column';
  END IF;
END $$;

-- Update RLS policies to handle archived users (only if is_archived column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'profiles' AND column_name = 'is_archived') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

    -- Create new policies with is_archived check
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id AND is_archived = FALSE);
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id AND is_archived = FALSE);
    CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin(auth.uid()));
    CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (public.is_admin(auth.uid()));

    RAISE NOTICE 'Updated RLS policies to handle archived users';
  ELSE
    RAISE NOTICE 'is_archived column does not exist, skipping RLS policy updates';
  END IF;
END $$;