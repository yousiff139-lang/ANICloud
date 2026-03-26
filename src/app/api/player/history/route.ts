import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const { animeId, episode, duration, totalDuration, completed } = body;

    // Update or create watch history
    const history = await prisma.watchHistory.upsert({
      where: {
        userId_animeId_episode: {
          userId: user.id,
          animeId: parseInt(animeId),
          episode: parseInt(episode)
        }
      },
      update: {
        duration: parseInt(duration),
        totalDuration: parseInt(totalDuration),
        completed: completed ?? false,
        watchedAt: new Date()
      },
      create: {
        userId: user.id,
        animeId: parseInt(animeId),
        episode: parseInt(episode),
        duration: parseInt(duration),
        totalDuration: parseInt(totalDuration),
        completed: completed ?? false
      }
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error saving watch history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');
    const episode = searchParams.get('episode');

    if (animeId && episode) {
      // Get specific episode history
      const history = await prisma.watchHistory.findFirst({
        where: {
          userId: user.id,
          animeId: parseInt(animeId),
          episode: parseInt(episode)
        }
      });
      return NextResponse.json(history);
    }

    if (animeId) {
      // Get all episodes for an anime
      const history = await prisma.watchHistory.findMany({
        where: {
          userId: user.id,
          animeId: parseInt(animeId)
        },
        orderBy: { episode: 'asc' }
      });
      return NextResponse.json(history);
    }

    // Get recent watch history
    const history = await prisma.watchHistory.findMany({
      where: { userId: user.id },
      orderBy: { watchedAt: 'desc' },
      take: 50
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching watch history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
