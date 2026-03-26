import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ animeId: string; episode: string }> }
) {
  try {
    const { animeId, episode } = await params;
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language');

    const where: any = {
      animeId: parseInt(animeId),
      episode: parseInt(episode)
    };

    if (language) {
      where.language = language;
    }

    const subtitles = await prisma.subtitle.findMany({
      where,
      orderBy: [
        { isOfficial: 'desc' },
        { isVerified: 'desc' },
        { downloads: 'desc' }
      ]
    });

    return NextResponse.json(subtitles);
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ animeId: string; episode: string }> }
) {
  try {
    const { animeId, episode } = await params;
    const body = await req.json();
    const { language, label, url, format, uploadedBy, isOfficial } = body;

    if (!language || !label || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const subtitle = await prisma.subtitle.create({
      data: {
        animeId: parseInt(animeId),
        episode: parseInt(episode),
        language,
        label,
        url,
        format: format || 'vtt',
        uploadedBy: uploadedBy || null,
        isOfficial: isOfficial || false
      }
    });

    return NextResponse.json(subtitle);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Subtitle already exists' }, { status: 409 });
    }
    console.error('Error creating subtitle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
