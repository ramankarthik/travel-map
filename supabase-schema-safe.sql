-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  type TEXT CHECK (type IN ('visited', 'wishlist')) NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(type);
CREATE INDEX IF NOT EXISTS idx_photos_location_id ON public.photos(location_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Function to safely create policies (only if they don't exist)
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
  table_name text,
  policy_name text,
  policy_sql text
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = table_name 
    AND policyname = policy_name
  ) THEN
    EXECUTE policy_sql;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create policies safely for users table
SELECT create_policy_if_not_exists(
  'users',
  'Users can view own profile',
  'CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id)'
);

SELECT create_policy_if_not_exists(
  'users',
  'Users can update own profile',
  'CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id)'
);

SELECT create_policy_if_not_exists(
  'users',
  'Users can insert own profile',
  'CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id)'
);

-- Create policies safely for locations table
SELECT create_policy_if_not_exists(
  'locations',
  'Users can view own locations',
  'CREATE POLICY "Users can view own locations" ON public.locations FOR SELECT USING (auth.uid() = user_id)'
);

SELECT create_policy_if_not_exists(
  'locations',
  'Users can insert own locations',
  'CREATE POLICY "Users can insert own locations" ON public.locations FOR INSERT WITH CHECK (auth.uid() = user_id)'
);

SELECT create_policy_if_not_exists(
  'locations',
  'Users can update own locations',
  'CREATE POLICY "Users can update own locations" ON public.locations FOR UPDATE USING (auth.uid() = user_id)'
);

SELECT create_policy_if_not_exists(
  'locations',
  'Users can delete own locations',
  'CREATE POLICY "Users can delete own locations" ON public.locations FOR DELETE USING (auth.uid() = user_id)'
);

-- Create policies safely for photos table
SELECT create_policy_if_not_exists(
  'photos',
  'Users can view photos from own locations',
  'CREATE POLICY "Users can view photos from own locations" ON public.photos FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  )'
);

SELECT create_policy_if_not_exists(
  'photos',
  'Users can insert photos to own locations',
  'CREATE POLICY "Users can insert photos to own locations" ON public.photos FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  )'
);

SELECT create_policy_if_not_exists(
  'photos',
  'Users can update photos from own locations',
  'CREATE POLICY "Users can update photos from own locations" ON public.photos FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  )'
);

SELECT create_policy_if_not_exists(
  'photos',
  'Users can delete photos from own locations',
  'CREATE POLICY "Users can delete photos from own locations" ON public.photos FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  )'
);

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

-- Function to safely create triggers
CREATE OR REPLACE FUNCTION create_trigger_if_not_exists(
  trigger_name text,
  table_name text,
  trigger_sql text
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = trigger_name
  ) THEN
    EXECUTE trigger_sql;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers safely
SELECT create_trigger_if_not_exists(
  'handle_users_updated_at',
  'public.users',
  'CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()'
);

SELECT create_trigger_if_not_exists(
  'handle_locations_updated_at',
  'public.locations',
  'CREATE TRIGGER handle_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()'
);

-- Clean up helper functions
DROP FUNCTION IF EXISTS create_policy_if_not_exists(text, text, text);
DROP FUNCTION IF EXISTS create_trigger_if_not_exists(text, text, text);

-- Note: We're not creating the auth.users trigger here because it requires special permissions
-- Instead, we'll handle user creation manually in the application code 