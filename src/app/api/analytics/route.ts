import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        watchHistory: {
          orderBy: { watchedAt: 'desc' }
        },
        reviews: {
          orderBy: { createdAt: 'desc' }
        },
        libraries: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'month';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    // Filter data by date range
    const filteredHistory = user.watchHistory.filter(
      (h: any) => new Date(h.watchedAt) >= startDate
    );

    // Calculate total watched
    const completedAnime = new Set(
      filteredHistory.filter((h: any) => h.completed).map((h: any) => h.animeId)
    );
    const totalWatched = completedAnime.size;

    // Calculate total hours
    const totalSeconds = filteredHistory.reduce((sum: number, h: any) => sum + h.duration, 0);
    const totalHours = totalSeconds / 3600;

    // Calculate average rating
    const ratings = user.reviews.map((r: any) => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
      : 0;

    // Favorite genres (mock data - would need genre info from anime API)
    const favoriteGenres = [
      { genre: 'Action', count: 15 },
      { genre: 'Adventure', count: 12 },
      { genre: 'Comedy', count: 10 },
      { genre: 'Drama', count: 8 },
      { genre: 'Fantasy', count: 7 }
    ];

    // Watching patterns by day of week
    const dayPatterns: { [key: string]: number } = {
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0,
      'Sunday': 0
    };

    filteredHistory.forEach((h: any) => {
      const day = new Date(h.watchedAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayPatterns[day] += h.duration / 3600;
    });

    const watchingPatterns = Object.entries(dayPatterns).map(([day, hours]) => ({
      day,
      hours
    }));

    // Top rated anime
    const topRatedAnime = user.reviews
      .sort((a: any, b: any) => b.rating - a.rating)
      .slice(0, 6)
      .map((r: any) => ({
        animeId: r.animeId,
        title: `Anime ${r.animeId}`, // Would fetch actual title
        rating: r.rating
      }));

    // Achievements
    const achievements = [
      {
        id: 'first-watch',
        title: 'First Watch',
        description: 'Watch your first anime',
        icon: '🎬',
        unlocked: totalWatched >= 1
      },
      {
        id: 'binge-watcher',
        title: 'Binge Watcher',
        description: 'Watch 10 anime',
        icon: '📺',
        unlocked: totalWatched >= 10,
        progress: totalWatched,
        target: 10
      },
      {
        id: 'anime-enthusiast',
        title: 'Anime Enthusiast',
        description: 'Watch 50 anime',
        icon: '⭐',
        unlocked: totalWatched >= 50,
        progress: totalWatched,
        target: 50
      },
      {
        id: 'anime-master',
        title: 'Anime Master',
        description: 'Watch 100 anime',
        icon: '👑',
        unlocked: totalWatched >= 100,
        progress: totalWatched,
        target: 100
      },
      {
        id: 'critic',
        title: 'Critic',
        description: 'Write 10 reviews',
        icon: '✍️',
        unlocked: user.reviews.length >= 10,
        progress: user.reviews.length,
        target: 10
      },
      {
        id: 'night-owl',
        title: 'Night Owl',
        description: 'Watch 100 hours',
        icon: '🦉',
        unlocked: totalHours >= 100,
        progress: Math.floor(totalHours),
        target: 100
      },
      {
        id: 'social-butterfly',
        title: 'Social Butterfly',
        description: 'Join 5 watch parties',
        icon: '🎉',
        unlocked: false,
        progress: 0,
        target: 5
      },
      {
        id: 'completionist',
        title: 'Completionist',
        description: 'Complete 25 anime series',
        icon: '🏆',
        unlocked: totalWatched >= 25,
        progress: totalWatched,
        target: 25
      },
      {
        id: 'early-bird',
        title: 'Early Bird',
        description: 'Watch anime at 6 AM',
        icon: '🌅',
        unlocked: false,
        progress: 0,
        target: 1
      }
    ];

    return NextResponse.json({
      totalWatched,
      totalHours,
      averageRating,
      favoriteGenres,
      watchingPatterns,
      topRatedAnime,
      achievements
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
