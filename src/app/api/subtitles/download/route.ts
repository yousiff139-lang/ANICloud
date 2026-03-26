import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subtitleId } = body;

    if (!subtitleId) {
      return NextResponse.json({ error: 'Subtitle ID required' }, { status: 400 });
    }

    // Increment download count
    const subtitle = await prisma.subtitle.update({
      where: { id: subtitleId },
      data: {
        downloads: {
          increment: 1
        }
      }
    });

    return NextResponse.json(subtitle);
  } catch (error) {
    console.error('Error tracking subtitle download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
