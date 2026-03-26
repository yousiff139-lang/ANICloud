# 🔌 Integration Guide - Social Features

Quick guide to integrate the new social features into your ANICloud application.

---

## 🎬 Subtitle Player Integration

### Replace NebulaPlayer with SubtitlePlayer

**Before:**
```tsx
import NebulaPlayer from '@/components/NebulaPlayer';

<NebulaPlayer
  url={streamUrl}
  poster={posterUrl}
  title={title}
  type="hls"
/>
```

**After:**
```tsx
import SubtitlePlayer from '@/components/SubtitlePlayer';

<SubtitlePlayer
  url={streamUrl}
  poster={posterUrl}
  title={title}
  animeId={animeId}
  episode={episodeNumber}
  type="hls"
  onProgress={(time, duration) => {
    // Optional: Track watch progress
    console.log(`Watched ${time}s of ${duration}s`);
  }}
/>
```

**Features Added:**
- Multi-language subtitle support (EN, AR, JA)
- Subtitle customization (size, color)
- HLS streaming support
- Progress tracking

---

## ⭐ Reviews Integration

### Add Reviews to Anime Detail Page

**File:** `src/app/anime/[id]/page.tsx`

```tsx
import ReviewSection from '@/components/ReviewSection';

export default function AnimeDetail() {
  const { id } = useParams();
  const anime = // ... fetch anime data
  
  return (
    <div>
      {/* Existing anime info */}
      
      {/* Add Reviews Section */}
      <ReviewSection animeId={anime.mal_id} />
    </div>
  );
}
```

**Features:**
- Review list with sorting
- Write review form
- Vote on reviews
- Spoiler protection

---

## 🤖 AI Recommendations

### Add to Home Page

**File:** `src/app/page.tsx`

```tsx
import RecommendationsSection from '@/components/RecommendationsSection';

export default function HomePage() {
  return (
    <div>
      {/* Existing sections */}
      
      {/* Add Recommendations (only shows for logged-in users) */}
      <RecommendationsSection />
      
      {/* Other sections */}
    </div>
  );
}
```

**Features:**
- Personalized recommendations
- Match percentage
- Recommendation reasons
- Auto-hides if not logged in

---

## 👤 Profile Link

### Add Profile Link to Navigation

**File:** `src/components/Navbar.tsx` (or your navigation component)

```tsx
import { useSession } from 'next-auth/react';
import { User } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const { data: session } = useSession();
  
  return (
    <nav>
      {/* Existing nav items */}
      
      {session && (
        <Link href="/profile">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/10">
            <User size={18} />
            Profile
          </button>
        </Link>
      )}
    </nav>
  );
}
```

---

## 📤 Subtitle Upload

### Add Upload Button to Watch Page

**File:** `src/app/watch/[id]/[episode]/page.tsx`

```tsx
import SubtitleUpload from '@/components/SubtitleUpload';

export default function WatchEpisode() {
  const { id, episode } = useParams();
  
  return (
    <div>
      {/* Video Player */}
      <SubtitlePlayer {...props} />
      
      {/* Add Upload Button */}
      <div className="mt-4">
        <SubtitleUpload
          animeId={Number(id)}
          episode={Number(episode)}
          onSuccess={() => {
            // Optional: Reload subtitles
            console.log('Subtitle uploaded!');
          }}
        />
      </div>
    </div>
  );
}
```

---

## 🔗 Complete Integration Example

### Full Watch Page with All Features

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SubtitlePlayer from '@/components/SubtitlePlayer';
import SubtitleUpload from '@/components/SubtitleUpload';
import { getAnimeById, getStreamUrl } from '@/lib/api';

export default function WatchEpisode() {
  const { id, episode } = useParams();
  const [anime, setAnime] = useState(null);
  const [streamData, setStreamData] = useState(null);

  useEffect(() => {
    // Load anime and stream data
    const loadData = async () => {
      const animeData = await getAnimeById(Number(id));
      const stream = await getStreamUrl(Number(id), Number(episode));
      setAnime(animeData);
      setStreamData(stream);
    };
    loadData();
  }, [id, episode]);

  const handleProgress = async (time: number, duration: number) => {
    // Save watch progress to API
    await fetch('/api/player/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        animeId: Number(id),
        episode: Number(episode),
        duration: time,
        totalDuration: duration,
        completed: time / duration > 0.9
      })
    });
  };

  if (!anime || !streamData) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player with Subtitles */}
      <SubtitlePlayer
        url={streamData.url}
        poster={anime.images.webp.large_image_url}
        title={`${anime.title} - Episode ${episode}`}
        animeId={Number(id)}
        episode={Number(episode)}
        type="hls"
        onProgress={handleProgress}
      />

      {/* Episode Info & Upload */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{anime.title}</h1>
            <p className="text-white/60">Episode {episode}</p>
          </div>
          
          {/* Subtitle Upload */}
          <SubtitleUpload
            animeId={Number(id)}
            episode={Number(episode)}
            onSuccess={() => {
              alert('Subtitle uploaded successfully!');
            }}
          />
        </div>

        {/* Episode Description */}
        <div className="glass rounded-xl p-6">
          <p className="text-white/70">{anime.synopsis}</p>
        </div>
      </div>
    </div>
  );
}
```

### Full Anime Detail Page with Reviews

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ReviewSection from '@/components/ReviewSection';
import { getAnimeById } from '@/lib/api';

export default function AnimeDetail() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);

  useEffect(() => {
    const loadAnime = async () => {
      const data = await getAnimeById(Number(id));
      setAnime(data);
    };
    loadAnime();
  }, [id]);

  if (!anime) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      {/* Hero Section */}
      <div className="relative h-[60vh]">
        <img
          src={anime.images.webp.large_image_url}
          alt={anime.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 -mt-40 relative z-10 pb-20">
        {/* Anime Info */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">{anime.title}</h1>
          <p className="text-lg text-white/70 mb-6">{anime.synopsis}</p>
          
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 bg-neonCyan/20 text-neonCyan rounded-xl">
              ⭐ {anime.score}
            </span>
            <span className="text-white/60">{anime.type}</span>
            <span className="text-white/60">{anime.episodes} Episodes</span>
          </div>
        </div>

        {/* Episodes List */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Episodes</h2>
          {/* Episode list here */}
        </div>

        {/* Reviews Section */}
        <ReviewSection animeId={anime.mal_id} />
      </div>
    </div>
  );
}
```

### Home Page with Recommendations

```tsx
'use client';

import { useState, useEffect } from 'react';
import RecommendationsSection from '@/components/RecommendationsSection';
import { getTrendingAnime } from '@/lib/api';

export default function HomePage() {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    const loadTrending = async () => {
      const data = await getTrendingAnime();
      setTrending(data);
    };
    loadTrending();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <section className="mb-20">
          <h1 className="text-6xl font-bold mb-4">Welcome to ANICloud</h1>
          <p className="text-xl text-white/60">Your ultimate anime streaming platform</p>
        </section>

        {/* AI Recommendations (only for logged-in users) */}
        <RecommendationsSection />

        {/* Trending Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Trending Now</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {trending.map((anime) => (
              <div key={anime.mal_id}>
                {/* Anime card */}
              </div>
            ))}
          </div>
        </section>

        {/* Other sections */}
      </div>
    </div>
  );
}
```

---

## 🎨 Styling Notes

All components use the existing design system:

- **Colors:**
  - `neonCyan` - Primary accent
  - `pulsingViolet` - Secondary accent
  - `glass` - Glass morphism effect

- **Animations:**
  - Framer Motion for smooth transitions
  - Hover effects on interactive elements

- **Responsive:**
  - Mobile-first design
  - Breakpoints: `md:`, `lg:`

---

## 🔐 Authentication

All features require authentication:

```tsx
import { useSession } from 'next-auth/react';

const { data: session } = useSession();

if (!session) {
  return <div>Please log in to access this feature</div>;
}
```

---

## 📊 API Usage

### Fetch Recommendations
```typescript
const res = await fetch('/api/recommendations');
const data = await res.json();
// { recommendations: [...], watchedCount: 10, genrePreferences: {...} }
```

### Submit Review
```typescript
const res = await fetch(`/api/reviews/${animeId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rating: 9,
    title: 'Amazing anime!',
    content: 'This is the best anime I have ever watched...',
    spoiler: false
  })
});
```

### Update Profile
```typescript
const res = await fetch('/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bio: 'Anime enthusiast',
    avatar: 'https://...',
    location: 'Tokyo, Japan',
    isPublic: true
  })
});
```

### Upload Subtitle
```typescript
const content = await file.text();
const res = await fetch('/api/subtitles/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    animeId: 21,
    episode: 5,
    language: 'en',
    content: content,
    format: 'vtt'
  })
});
```

---

## ✅ Testing Checklist

- [ ] Subtitle player loads and plays video
- [ ] Subtitles can be selected and customized
- [ ] Reviews can be submitted and voted on
- [ ] Profile page displays correctly
- [ ] Profile can be edited and saved
- [ ] Recommendations appear for logged-in users
- [ ] Subtitle upload works with valid files
- [ ] All features require authentication
- [ ] Mobile responsive design works
- [ ] No console errors

---

## 🐛 Troubleshooting

**Subtitles not loading?**
- Check API route: `/api/subtitles/[animeId]/[episode]`
- Verify database has subtitle entries
- Check browser console for errors

**Reviews not submitting?**
- Ensure user is authenticated
- Check rating is between 1-10
- Verify content is not empty

**Recommendations not showing?**
- User must be logged in
- User must have watch history
- Check `/api/recommendations` response

**Profile not saving?**
- Verify authentication
- Check all fields are valid
- Look for validation errors in response

---

**Need help? Check the main documentation or create an issue!** 🚀
