-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table
CREATE TABLE public.locations (
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
CREATE TABLE public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_locations_user_id ON public.locations(user_id);
CREATE INDEX idx_locations_type ON public.locations(type);
CREATE INDEX idx_photos_location_id ON public.photos(location_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for locations table
CREATE POLICY "Users can view own locations" ON public.locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locations" ON public.locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locations" ON public.locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own locations" ON public.locations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for photos table
CREATE POLICY "Users can view photos from own locations" ON public.photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert photos to own locations" ON public.photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photos from own locations" ON public.photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos from own locations" ON public.photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.locations 
      WHERE locations.id = photos.location_id 
      AND locations.user_id = auth.uid()
    )
  );

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); 