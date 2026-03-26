'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Edit2, Clock, Star, BookMarked, MessageSquare, Loader2, Save } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  profile: {
    bio: string | null;
    avatar: string | null;
    banner: string | null;
    location: string | null;
    website: string | null;
    isPublic: boolean;
  } | null;
  stats: {
    totalWatched: number;
    totalHours: number;
    totalInLibrary: number;
    totalReviews: number;
  };
  watchHistory: Array<{
    animeId: number;
    episode: number;
    watchedAt: string;
  }>;
  reviews: Array<{
    id: string;
    animeId: number;
    rating: number;
    title: string | null;
    content: string;
    createdAt: string;
  }>;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    avatar: '',
    banner: '',
    location: '',
    website: '',
    isPublic: true
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      loadProfile();
    }
  }, [status]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data.profile) {
          setFormData({
            bio: data.profile.bio || '',
            avatar: data.profile.avatar || '',
            banner: data.profile.banner || '',
            location: data.profile.location || '',
            website: data.profile.website || '',
            isPublic: data.profile.isPublic
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setEditing(false);
        await update(); // Trigger NextAuth session refresh
        loadProfile();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14]">
        <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pb-20">
      {/* Banner */}
      <div className="relative h-64 w-full">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: profile.profile?.banner
              ? `url(${profile.profile.banner})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0E14]" />
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-20 relative z-10">
        {/* Profile Header */}
        <div className="flex items-end gap-6 mb-8">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-neonCyan to-pulsingViolet p-1">
            <div className="w-full h-full rounded-2xl bg-[#0B0E14] flex items-center justify-center overflow-hidden">
              {profile.profile?.avatar ? (
                <img src={profile.profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-white/40" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{profile.name || 'Anonymous User'}</h1>
            <p className="text-white/60">{profile.email}</p>
            {profile.profile?.location && (
              <p className="text-sm text-white/40 mt-1">📍 {profile.profile.location}</p>
            )}
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="px-6 py-3 glass text-white hover:bg-white hover:text-black rounded-xl font-bold transition-all flex items-center gap-2 border border-white/10 hover:border-white shadow-lg"
          >
            {editing ? <><Save size={18} /> Save</> : <><Edit2 size={18} /> Edit Profile</>}
          </button>
        </div>

        {/* Bio Section */}
        {editing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-6 border border-white/10 mb-8 space-y-4"
          >
            <div>
              <label className="block text-sm font-bold mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan resize-none"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Avatar URL</label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Banner URL</label>
                <input
                  type="text"
                  value={formData.banner}
                  onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, Country"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neonCyan"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 accent-neonCyan"
              />
              <span className="text-sm">Make profile public</span>
            </label>
          </motion.div>
        ) : (
          profile.profile?.bio && (
            <div className="glass rounded-xl p-6 border border-white/10 mb-8">
              <p className="text-white/70 leading-relaxed">{profile.profile.bio}</p>
            </div>
          )
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <StatCard icon={<Clock />} label="Hours Watched" value={profile.stats.totalHours.toFixed(1)} />
          <StatCard icon={<Star />} label="Completed" value={profile.stats.totalWatched} />
          <StatCard icon={<BookMarked />} label="In Library" value={profile.stats.totalInLibrary} />
          <StatCard icon={<MessageSquare />} label="Reviews" value={profile.stats.totalReviews} />
        </div>

        {/* Recent Reviews */}
        {profile.reviews.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Recent Reviews</h2>
            <div className="space-y-4">
              {profile.reviews.map((review) => (
                <div key={review.id} className="glass rounded-xl p-6 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-neonCyan font-bold">{review.rating}/10</span>
                    <span className="text-white/40 text-sm">
                      • {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && <h3 className="font-bold mb-2">{review.title}</h3>}
                  <p className="text-white/70 line-clamp-3">{review.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="glass rounded-xl p-6 border border-white/5 text-center">
      <div className="flex justify-center mb-3 text-neonCyan">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  );
}
