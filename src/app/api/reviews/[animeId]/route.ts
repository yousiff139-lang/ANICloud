import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ animeId: string }> }
) {
  try {
    const { animeId } = await params;
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'helpful';
    const limit = parseInt(searchParams.get('limit') || '20');

    const orderBy: any = sortBy === 'recent' 
      ? { createdAt: 'desc' }
      : { helpful: 'desc' };

    const reviews = await prisma.review.findMany({
      where: { animeId: parseInt(animeId) },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        votes: true
      },
      orderBy,
      take: limit
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ animeId: string }> }
) {
  try {
    const { animeId } = await params;
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
    const { rating, title, content, spoiler } = body;

    if (!rating || !content) {
      return NextResponse.json({ error: 'Rating and content required' }, { status: 400 });
    }

    if (rating < 1 || rating > 10) {
      return NextResponse.json({ error: 'Rating must be between 1 and 10' }, { status: 400 });
    }

    const review = await prisma.review.upsert({
      where: {
        userId_animeId: {
          userId: user.id,
          animeId: parseInt(animeId)
        }
      },
      update: {
        rating,
        title: title || null,
        content,
        spoiler: spoiler || false,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        animeId: parseInt(animeId),
        rating,
        title: title || null,
        content,
        spoiler: spoiler || false
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
