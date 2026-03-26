import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface GenreScore {
  [genre: string]: number;
}

interface AnimeRecommendation {
  animeId: number;
  score: number;
  reason: string;
}

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
          orderBy: { watchedAt: 'desc' },
          take: 50
        },
        libraries: true,
        preferences: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate genre preferences from watch history and reviews
    const genreScores: GenreScore = {};
    const watchedAnimeIds = new Set<number>();
    const ratedAnime: { [key: number]: number } = {};

    // Collect watched anime IDs
    user.watchHistory.forEach(h => {
      watchedAnimeIds.add(h.animeId);
      // Weight completed episodes higher
      if (h.completed) {
        genreScores[h.animeId.toString()] = (genreScores[h.animeId.toString()] || 0) + 1;
      }
    });

    user.libraries.forEach(l => watchedAnimeIds.add(l.animeId));

    // Factor in user ratings
    user.reviews.forEach(r => {
      ratedAnime[r.animeId] = r.rating;
      watchedAnimeIds.add(r.animeId);
    });

    // Calculate recommendation scores
    const recommendations: AnimeRecommendation[] = [];

    // Strategy 1: Based on highly rated anime (8+ rating)
    const highlyRated = user.reviews.filter(r => r.rating >= 8);
    if (highlyRated.length > 0) {
      recommendations.push({
        animeId: highlyRated[0].animeId,
        score: 0.9,
        reason: 'Similar to your highly rated anime'
      });
    }

    // Strategy 2: Based on most watched genres
    const mostWatchedAnime = Array.from(watchedAnimeIds).slice(0, 10);
    mostWatchedAnime.forEach(animeId => {
      if (!recommendations.find(r => r.animeId === animeId)) {
        recommendations.push({
          animeId,
          score: 0.7,
          reason: 'Based on your watch history'
        });
      }
    });

    // Strategy 3: Popular anime not yet watched
    // In production, you'd fetch trending anime from Jikan API
    // and filter out already watched ones

    return NextResponse.json({
      recommendations: recommendations.slice(0, 20),
      watchedCount: watchedAnimeIds.size,
      genrePreferences: user.preferences?.genreScores || {},
      favoriteGenres: user.preferences?.favoriteGenres?.split(',').filter(Boolean) || []
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { genreScores, favoriteGenres, dislikedGenres } = body;

    const preferences = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        genreScores: genreScores || {},
        favoriteGenres: favoriteGenres?.join(',') || '',
        dislikedGenres: dislikedGenres?.join(',') || '',
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        genreScores: genreScores || {},
        favoriteGenres: favoriteGenres?.join(',') || '',
        dislikedGenres: dislikedGenres?.join(',') || ''
      }
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
