# 🗺️ Travel Map

A simple and intuitive map-based travel tracking application built with Next.js, React, and Supabase. Track your visited destinations and wishlist locations with an interactive world map.

![Travel Map Screenshot](https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=Travel+Map+Screenshot)

## ✨ Features

- **🌍 Interactive World Map** - View all your destinations on a beautiful Leaflet map
- **📍 Location Search** - Find cities and places with OpenStreetMap geocoding
- **📊 Travel Statistics** - Track countries and continents visited
- **📸 Photo Management** - Add and manage photos for each destination
- **📝 Notes & Memories** - Keep detailed notes about your travels
- **🎯 Status Tracking** - Mark destinations as visited or wishlist
- **🔍 Filtering** - Filter by visited, wishlist, or view all destinations
- **📱 Responsive Design** - Works perfectly on desktop and mobile
- **🔐 User Authentication** - Secure login with Supabase Auth
- **💾 Data Persistence** - All data stored securely in Supabase

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Map**: Leaflet.js with OpenStreetMap
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Geocoding**: OpenStreetMap Nominatim API

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works great!)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/travel-map.git
   cd travel-map
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from Settings > API
   - Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Set up the database**
   - Go to your Supabase SQL Editor
   - Run the contents of `supabase-schema-final.sql`
   - Or use `supabase-migration.sql` if you have an existing table

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Login with demo credentials: `demo@example.com` / `demo123`

## 🗄️ Database Schema

The application uses a simple schema with two main tables:

### `users` table
- User profiles linked to Supabase Auth
- Stores email and display name

### `locations` table
- `id` - Unique identifier
- `user_id` - Links to user
- `name` - Location name
- `country` - Country name
- `lat` / `lng` - Coordinates
- `status` - 'visited' or 'wishlist'
- `date` - Visit date (YYYY-MM format)
- `notes` - Travel notes
- `photos` - Array of photo URLs
- `created_at` / `updated_at` - Timestamps

## 🎯 Usage

### Adding Destinations
1. Click "Add New" button
2. Search for a location using the search bar
3. Select from the dropdown suggestions
4. Choose status (visited/wishlist)
5. Add visit date if visited
6. Upload photos and add notes
7. Save your destination

### Managing Destinations
- **Click on map markers** to view/edit destinations
- **Filter destinations** using the status buttons
- **Edit any destination** by clicking on it
- **Delete destinations** using the trash icon in edit mode

### Travel Statistics
- View countries and continents visited
- Stats update automatically as you add destinations
- Only visited destinations count toward statistics

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Customization
- **Map styling**: Modify `src/components/TravelMap.tsx`
- **UI components**: Edit shadcn/ui components in `src/components/ui/`
- **Database schema**: Update SQL files and run migrations
- **Authentication**: Modify `src/lib/auth.ts` for custom auth logic

## 📁 Project Structure

```
travel-map/
├── src/
│   ├── app/                 # Next.js app router
│   │   └── page.tsx       # Next.js page component
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── TravelMap.tsx   # Interactive map component
│   │   └── DestinationModal.tsx # Add/edit destination modal
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx # Authentication context
│   └── lib/                # Utility functions
│       ├── auth.ts         # Authentication logic
│       ├── destinations.ts # Database operations
│       └── supabase.ts     # Supabase client
├── supabase-schema-*.sql   # Database schema files
└── SUPABASE_SETUP.md       # Detailed setup guide
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms
- **Netlify**: Similar to Vercel setup
- **Railway**: Great for full-stack deployment
- **Self-hosted**: Deploy Next.js app with your preferred hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Leaflet.js** for the interactive map functionality
- **OpenStreetMap** for map tiles and geocoding
- **shadcn/ui** for beautiful UI components
- **Supabase** for the backend infrastructure
- **Next.js** for the amazing React framework

## 📞 Support

If you have any questions or need help:
- Open an issue on GitHub
- Check the [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed setup instructions
- Review the troubleshooting section below

## 🔧 Troubleshooting

### Common Issues

**"Invalid URL" error**
- Check your `.env.local` file has correct Supabase URL
- Ensure no trailing slashes in the URL

**"Column does not exist" error**
- Run the migration script: `supabase-migration.sql`
- Check that all required columns exist in your database

**Authentication issues**
- Verify your Supabase project settings
- Check that RLS policies are enabled
- Ensure environment variables are set correctly

**Map not loading**
- Check browser console for errors
- Verify Leaflet CSS is loaded
- Ensure internet connection for map tiles

---

**Happy Traveling! 🌍✈️**
