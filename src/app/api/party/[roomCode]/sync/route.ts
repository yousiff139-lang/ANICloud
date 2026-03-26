import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
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

    const party = await prisma.watchParty.findUnique({
      where: { roomCode: roomCode.toUpperCase() }
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    // Only host can control playback
    if (party.hostId !== user.id) {
      return NextResponse.json({ error: 'Only host can control playback' }, { status: 403 });
    }

    const body = await req.json();
    const { currentTime, isPlaying } = body;

    const updated = await prisma.watchParty.update({
      where: { id: party.id },
      data: {
        currentTime: currentTime !== undefined ? parseFloat(currentTime) : party.currentTime,
        isPlaying: isPlaying !== undefined ? isPlaying : party.isPlaying
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error syncing party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
