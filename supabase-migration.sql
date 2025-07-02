-- Migration script to update existing locations table to match new UI schema
-- This script safely updates the table structure without losing data

-- First, let's check what columns exist and add missing ones
DO $$
BEGIN
  -- Add country column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'country') THEN
    ALTER TABLE public.locations ADD COLUMN country TEXT DEFAULT '';
  END IF;

  -- Add lat column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'lat') THEN
    ALTER TABLE public.locations ADD COLUMN lat DECIMAL(10, 8);
  END IF;

  -- Add lng column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'lng') THEN
    ALTER TABLE public.locations ADD COLUMN lng DECIMAL(11, 8);
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'status') THEN
    ALTER TABLE public.locations ADD COLUMN status TEXT DEFAULT 'wishlist';
  END IF;

  -- Add date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'date') THEN
    ALTER TABLE public.locations ADD COLUMN date TEXT;
  END IF;

  -- Add photos column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'photos') THEN
    ALTER TABLE public.locations ADD COLUMN photos TEXT[] DEFAULT '{}';
  END IF;

  -- Migrate data from old columns to new columns if they exist
  -- Copy latitude to lat if latitude exists and lat is null
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'latitude') THEN
    UPDATE public.locations SET lat = latitude WHERE lat IS NULL AND latitude IS NOT NULL;
  END IF;

  -- Copy longitude to lng if longitude exists and lng is null
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'longitude') THEN
    UPDATE public.locations SET lng = longitude WHERE lng IS NULL AND longitude IS NOT NULL;
  END IF;

  -- Copy type to status if type exists and status is default
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'type') THEN
    UPDATE public.locations SET status = type WHERE status = 'wishlist' AND type IS NOT NULL;
  END IF;

  -- Copy visited_at to date if visited_at exists and date is null
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'visited_at') THEN
    UPDATE public.locations SET date = TO_CHAR(visited_at::date, 'YYYY-MM') WHERE date IS NULL AND visited_at IS NOT NULL;
  END IF;

  -- Extract country from name if country is empty and name contains comma
  UPDATE public.locations 
  SET country = TRIM(SPLIT_PART(name, ',', -1))
  WHERE country = '' AND name LIKE '%,%';

  -- If no comma in name, use the name as country
  UPDATE public.locations 
  SET country = name
  WHERE country = '' AND name NOT LIKE '%,%';

END $$;

-- Add constraints for the new columns
ALTER TABLE public.locations 
  ALTER COLUMN status SET DEFAULT 'wishlist',
  ALTER COLUMN notes SET DEFAULT '',
  ALTER COLUMN photos SET DEFAULT '{}';

-- Add check constraint for status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'locations_status_check'
  ) THEN
    ALTER TABLE public.locations ADD CONSTRAINT locations_status_check 
    CHECK (status IN ('visited', 'wishlist'));
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_locations_type;
CREATE INDEX IF NOT EXISTS idx_locations_status ON public.locations(status);

-- Remove old columns if they exist (optional - uncomment if you want to clean up)
-- ALTER TABLE public.locations DROP COLUMN IF EXISTS latitude;
-- ALTER TABLE public.locations DROP COLUMN IF EXISTS longitude;
-- ALTER TABLE public.locations DROP COLUMN IF EXISTS type;
-- ALTER TABLE public.locations DROP COLUMN IF EXISTS visited_at;
-- ALTER TABLE public.locations DROP COLUMN IF EXISTS description;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'locations' 
ORDER BY ordinal_position; 