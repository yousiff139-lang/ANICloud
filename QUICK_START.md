# 🚀 ANICloud - Quick Start Guide

Get your anime streaming platform up and running in minutes!

---

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git

---

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 3. Configure Environment

Create `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

# Optional: Stripe (for payments)
STRIPE_SECRET_KEY="your-stripe-secret-key"
NEXT_PUBLIC_STRIPE_PUBLIC_KEY="your-stripe-public-key"
```

### 4. Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## 🎯 Key Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Main landing page |
| Discover | `/discover` | Advanced anime search |
| Seasonal | `/seasonal` | Seasonal anime calendar |
| Library | `/library` | Your saved anime |
| Profile | `/profile` | User profile & stats |
| Analytics | `/analytics` | Watch analytics |
| Premium | `/premium` | Subscription plans |
| Watch | `/watch/[id]/[episode]` | Video player |
| Anime Details | `/anime/[id]` | Anime information |
| Watch Party | `/party/[roomCode]` | Social watching |

---

## 🔑 Key Features

### For Users
- ✅ Browse and search anime
- ✅ Watch with subtitles (EN/AR/JA)
- ✅ Create watch parties
- ✅ Write reviews
- ✅ Get AI recommendations
- ✅ Track watch history
- ✅ Customize profile
- ✅ View analytics

### For Developers
- ✅ TypeScript throughout
- ✅ Next.js 15 App Router
- ✅ Prisma ORM
- ✅ Socket.io for real-time
- ✅ PWA support
- ✅ Caching system
- ✅ Multi-source aggregation

---

## 🛠️ Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# Reset database
npx prisma migrate reset
```

---

## 📁 Project Structure

```
src/
├── app/              # Next.js pages & API routes
│   ├── api/         # API endpoints
│   ├── anime/       # Anime pages
│   ├── watch/       # Watch pages
│   ├── discover/    # Discovery page
│   ├── seasonal/    # Seasonal page
│   ├── analytics/   # Analytics page
│   ├── premium/     # Premium page
│   ├── profile/     # Profile page
│   └── party/       # Watch party pages
├── components/      # React components
├── lib/            # Utility libraries
│   ├── api.ts      # API client
│   ├── auth.ts     # Authentication
│   ├── cache.ts    # Caching system
│   ├── socket.ts   # Socket.io
│   └── ...
└── ...
```

---

## 🎨 Customization

### Colors (Tailwind Config)

```javascript
// tailwind.config.js
colors: {
  neonCyan: '#00D9FF',
  pulsingViolet: '#B026FF',
  // Add your colors
}
```

### Branding

Update these files:
- `public/manifest.json` - App name & description
- `public/icon-*.png` - App icons
- `src/app/layout.tsx` - Site metadata

---

## 🔐 Authentication

### Create Account

```typescript
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

### Sign In

```typescript
POST /api/auth/signin
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

## 📡 API Examples

### Get Anime

```typescript
GET /api/anime?search=naruto
```

### Save to Library

```typescript
POST /api/library
{
  "animeId": 20,
  "title": "Naruto",
  "image": "https://..."
}
```

### Create Watch Party

```typescript
POST /api/party/create
{
  "animeId": 20,
  "episode": 1,
  "animeTitle": "Naruto",
  "maxMembers": 10,
  "isPublic": false
}
```

### Submit Review

```typescript
POST /api/reviews/20
{
  "rating": 9,
  "title": "Amazing!",
  "content": "Best anime ever...",
  "spoiler": false
}
```

---

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate elements |
| `Enter` | Select/activate |
| `Space` | Play/pause video |
| `Ctrl+K` | Search (when implemented) |
| `F` | Fullscreen video |
| `M` | Mute/unmute |
| `←/→` | Seek video |

---

## 🐛 Troubleshooting

### Database Issues

```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

---

## 📦 Production Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t anicloud .

# Run container
docker run -p 3000:3000 anicloud
```

### Manual

```bash
# Build
npm run build

# Start
npm start
```

---

## 🔧 Configuration

### Database (Production)

Update `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

### Push Notifications

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Add to `.env`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key"
VAPID_PRIVATE_KEY="your-private-key"
```

### Stripe Payments

1. Create Stripe account
2. Get API keys
3. Add to `.env`
4. Configure webhooks

---

## 📚 Documentation

- **FEATURES_ROADMAP.md** - Feature list
- **IMPLEMENTATION_PROGRESS.md** - Progress tracker
- **INTEGRATION_GUIDE.md** - Integration examples
- **SOCIAL_FEATURES_SUMMARY.md** - Social features
- **FINAL_IMPLEMENTATION_SUMMARY.md** - Complete overview

---

## 🆘 Getting Help

### Common Issues

1. **Can't sign in?**
   - Check database connection
   - Verify NEXTAUTH_SECRET is set
   - Clear browser cookies

2. **Videos won't play?**
   - Check stream URL
   - Verify CORS settings
   - Try different browser

3. **Subtitles not loading?**
   - Check subtitle API
   - Verify file format (VTT/SRT)
   - Check browser console

4. **Watch party not syncing?**
   - Check Socket.io connection
   - Verify both users in same room
   - Check network/firewall

---

## ✅ Quick Test Checklist

After setup, test these:

- [ ] Home page loads
- [ ] Can search anime
- [ ] Can create account
- [ ] Can sign in
- [ ] Can watch video
- [ ] Subtitles work
- [ ] Can add to library
- [ ] Can write review
- [ ] Profile page works
- [ ] Analytics display

---

## 🎉 You're Ready!

Your ANICloud platform is now running with:

- ✅ 12 major features
- ✅ Real-time watch parties
- ✅ AI recommendations
- ✅ Multi-language subtitles
- ✅ Analytics dashboard
- ✅ PWA support
- ✅ Accessibility features
- ✅ Monetization ready

**Happy streaming! 🍿**

---

## 📞 Support

For issues or questions:
1. Check documentation
2. Review code comments
3. Test in different browser
4. Check browser console
5. Verify environment variables

---

**Version:** 1.0.0  
**Last Updated:** March 24, 2026
