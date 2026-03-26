'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Clock, Star, Calendar, Award, 
  BarChart3, PieChart, Activity, Loader2 
} from 'lucide-react';

interface AnalyticsData {
  totalWatched: number;
  totalHours: number;
  averageRating: number;
  favoriteGenres: { genre: string; count: number }[];
  watchingPatterns: { day: string; hours: number }[];
  topRatedAnime: { animeId: number; title: string; rating: number }[];
  recentActivity: { date: string; count: number }[];
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      loadAnalytics();
    }
  }, [status, timeRange]);

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14]">
        <Loader2 className="text-neonCyan w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pb-20">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
              <BarChart3 className="text-neonCyan" />
              Your Analytics
            </h1>
            <p className="text-white/60">Track your anime watching journey</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' },
              { value: 'all', label: 'All Time' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as any)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  timeRange === option.value
                    ? 'bg-neonCyan text-black'
                    : 'glass hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<Star className="text-yellow-400" />}
            label="Anime Watched"
            value={analytics.totalWatched}
            trend="+12%"
          />
          <StatCard
            icon={<Clock className="text-neonCyan" />}
            label="Hours Watched"
            value={`${analytics.totalHours.toFixed(1)}h`}
            trend="+8%"
          />
          <StatCard
            icon={<TrendingUp className="text-green-400" />}
            label="Avg Rating"
            value={analytics.averageRating.toFixed(1)}
            trend="+0.3"
          />
          <StatCard
            icon={<Award className="text-pulsingViolet" />}
            label="Achievements"
            value={analytics.achievements.filter(a => a.unlocked).length}
            trend={`/${analytics.achievements.length}`}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Favorite Genres */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <PieChart className="text-neonCyan" />
              Favorite Genres
            </h3>
            <div className="space-y-4">
              {analytics.favoriteGenres.slice(0, 5).map((genre, idx) => {
                const maxCount = analytics.favoriteGenres[0]?.count || 1;
                const percentage = (genre.count / maxCount) * 100;
                
                return (
                  <div key={genre.genre}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{genre.genre}</span>
                      <span className="text-white/60">{genre.count} anime</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-neonCyan to-pulsingViolet"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Watching Patterns */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="text-pulsingViolet" />
              Watching Patterns
            </h3>
            <div className="space-y-4">
              {analytics.watchingPatterns.map((pattern, idx) => {
                const maxHours = Math.max(...analytics.watchingPatterns.map(p => p.hours));
                const percentage = (pattern.hours / maxHours) * 100;
                
                return (
                  <div key={pattern.day}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{pattern.day}</span>
                      <span className="text-white/60">{pattern.hours.toFixed(1)}h</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-pulsingViolet to-neonCyan"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Rated Anime */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Star className="text-yellow-400" />
            Your Top Rated Anime
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {analytics.topRatedAnime.slice(0, 6).map((anime, idx) => (
              <motion.div
                key={anime.animeId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => router.push(`/anime/${anime.animeId}`)}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neonCyan to-pulsingViolet flex items-center justify-center font-bold text-lg">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{anime.title}</h4>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Star size={12} className="fill-current" />
                    {anime.rating}/10
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Award className="text-pulsingViolet" />
            Achievements
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.achievements.map((achievement, idx) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-neonCyan/20 to-pulsingViolet/20 border-neonCyan/30'
                    : 'bg-white/5 border-white/10 opacity-50'
                }`}
              >
                <div className="text-4xl mb-3">{achievement.icon}</div>
                <h4 className="font-bold mb-1">{achievement.title}</h4>
                <p className="text-xs text-white/60 mb-3">{achievement.description}</p>
                
                {!achievement.unlocked && achievement.progress !== undefined && achievement.target && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/40">Progress</span>
                      <span className="text-white/60">{achievement.progress}/{achievement.target}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neonCyan to-pulsingViolet"
                        style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {achievement.unlocked && (
                  <div className="flex items-center gap-1 text-xs text-neonCyan font-bold">
                    <Award size={12} />
                    Unlocked!
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string | number; trend: string }) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white/60">{icon}</div>
        <span className="text-xs text-green-400 font-bold">{trend}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  );
}
