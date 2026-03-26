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
      include: { playerSettings: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return default settings if none exist
    if (!user.playerSettings) {
      return NextResponse.json({
        autoSkipIntro: true,
        autoSkipOutro: false,
        defaultSpeed: 1.0,
        subtitleSize: 'medium',
        subtitleColor: '#FFFFFF',
        subtitleBg: 'rgba(0,0,0,0.7)',
        volume: 1.0
      });
    }

    return NextResponse.json(user.playerSettings);
  } catch (error) {
    console.error('Error fetching player settings:', error);
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
    
    const settings = await prisma.userPlayerSettings.upsert({
      where: { userId: user.id },
      update: {
        autoSkipIntro: body.autoSkipIntro ?? true,
        autoSkipOutro: body.autoSkipOutro ?? false,
        defaultSpeed: body.defaultSpeed ?? 1.0,
        subtitleSize: body.subtitleSize ?? 'medium',
        subtitleColor: body.subtitleColor ?? '#FFFFFF',
        subtitleBg: body.subtitleBg ?? 'rgba(0,0,0,0.7)',
        volume: body.volume ?? 1.0
      },
      create: {
        userId: user.id,
        autoSkipIntro: body.autoSkipIntro ?? true,
        autoSkipOutro: body.autoSkipOutro ?? false,
        defaultSpeed: body.defaultSpeed ?? 1.0,
        subtitleSize: body.subtitleSize ?? 'medium',
        subtitleColor: body.subtitleColor ?? '#FFFFFF',
        subtitleBg: body.subtitleBg ?? 'rgba(0,0,0,0.7)',
        volume: body.volume ?? 1.0
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving player settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
