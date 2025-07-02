# Supabase Setup for Travel Map

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name for your project (e.g., "travel-map")
3. Set a database password
4. Choose a region close to you
5. Wait for the project to be created

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon/public key
3. Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 3. Set Up the Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy the contents of `supabase-schema-fixed.sql` and run it
3. This will create the necessary tables and policies without permission issues

## 4. Enable Row Level Security (RLS)

The schema already includes RLS policies, but make sure they're enabled:
- Go to Authentication > Policies
- Verify that RLS is enabled for all tables

## 5. Test the Connection

1. Start your development server: `npm run dev`
2. Try logging in with the demo credentials:
   - Email: `demo@example.com`
   - Password: `demo123`

## 6. Create Real Users (Optional)

To use real Supabase authentication instead of the demo mode:

1. Go to Authentication > Users in your Supabase dashboard
2. Create a new user or enable sign-up
3. Update the auth logic in `src/lib/auth.ts` to remove the demo fallback

## Troubleshooting

### Permission Error (42501: must be owner of table users)

If you get this error when running the SQL schema:

1. **Use the corrected schema**: Use `supabase-schema-fixed.sql` instead of `supabase-schema.sql`
2. **The fixed schema**: 
   - Removes the problematic trigger on `auth.users`
   - Uses `IF NOT EXISTS` to avoid conflicts
   - Handles user creation manually in the app code
   - Includes proper policy cleanup

### Other Common Issues

- **CORS errors**: Check your Supabase project settings
- **Authentication fails**: Verify your environment variables
- **Database operations fail**: Check that the schema was applied correctly

## Demo Mode

The app currently supports a demo mode that works without Supabase:
- Uses local storage for user session
- Stores destinations in memory (not persistent)
- Perfect for testing the UI and functionality

To switch to full Supabase mode, update the auth logic and remove demo fallbacks.

## Schema Changes Made

The corrected schema (`supabase-schema-fixed.sql`) includes:

1. **IF NOT EXISTS** clauses to prevent conflicts
2. **Policy cleanup** with DROP IF EXISTS
3. **Removed auth.users trigger** (handled manually in app)
4. **Conflict handling** in user creation function
5. **Proper trigger management** with DROP IF EXISTS

This should resolve the permission error you encountered! 