-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table (matching the actual UI fields)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  status TEXT CHECK (status IN ('visited', 'wishlist')) NOT NULL,
  date TEXT, -- YYYY-MM format for visited dates
  notes TEXT DEFAULT '',
  photos TEXT[] DEFAULT '{}', -- Array of photo URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON public.locations(status);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Function to handle user creation (this will be called manually when needed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (they will fail silently if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_users_updated_at') THEN
    CREATE TRIGGER handle_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_locations_updated_at') THEN
    CREATE TRIGGER handle_locations_updated_at
      BEFORE UPDATE ON public.locations
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create policies safely using DO blocks
DO $$
BEGIN
  -- Users table policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  
  -- Locations table policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can view own locations') THEN
    CREATE POLICY "Users can view own locations" ON public.locations FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can insert own locations') THEN
    CREATE POLICY "Users can insert own locations" ON public.locations FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can update own locations') THEN
    CREATE POLICY "Users can update own locations" ON public.locations FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can delete own locations') THEN
    CREATE POLICY "Users can delete own locations" ON public.locations FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Note: We're not creating the auth.users trigger here because it requires special permissions
-- Instead, we'll handle user creation manually in the application code 