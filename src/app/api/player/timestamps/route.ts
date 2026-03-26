import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get('animeId');
    const episode = searchParams.get('episode');

    if (!animeId || !episode) {
      return NextResponse.json({ error: 'Missing animeId or episode' }, { status: 400 });
    }

    const timestamps = await prisma.animeTimestamps.findUnique({
      where: {
        animeId_episode: {
          animeId: parseInt(animeId),
          episode: parseInt(episode)
        }
      }
    });

    if (!timestamps) {
      return NextResponse.json(null);
    }

    return NextResponse.json(timestamps);
  } catch (error) {
    console.error('Error fetching timestamps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { animeId, episode, introStart, introEnd, outroStart, outroEnd, credits } = body;

    if (!animeId || !episode) {
      return NextResponse.json({ error: 'Missing animeId or episode' }, { status: 400 });
    }

    const timestamps = await prisma.animeTimestamps.upsert({
      where: {
        animeId_episode: {
          animeId: parseInt(animeId),
          episode: parseInt(episode)
        }
      },
      update: {
        introStart: introStart ? parseInt(introStart) : null,
        introEnd: introEnd ? parseInt(introEnd) : null,
        outroStart: outroStart ? parseInt(outroStart) : null,
        outroEnd: outroEnd ? parseInt(outroEnd) : null,
        credits: credits ? parseInt(credits) : null
      },
      create: {
        animeId: parseInt(animeId),
        episode: parseInt(episode),
        introStart: introStart ? parseInt(introStart) : null,
        introEnd: introEnd ? parseInt(introEnd) : null,
        outroStart: outroStart ? parseInt(outroStart) : null,
        outroEnd: outroEnd ? parseInt(outroEnd) : null,
        credits: credits ? parseInt(credits) : null
      }
    });

    return NextResponse.json(timestamps);
  } catch (error) {
    console.error('Error saving timestamps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
