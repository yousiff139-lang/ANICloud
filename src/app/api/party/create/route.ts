import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
    const { animeId, episode, animeTitle, animePoster, isPublic, maxMembers } = body;

    if (!animeId || !episode || !animeTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate unique room code
    let roomCode = generateRoomCode();
    let existing = await prisma.watchParty.findUnique({ where: { roomCode } });
    while (existing) {
      roomCode = generateRoomCode();
      existing = await prisma.watchParty.findUnique({ where: { roomCode } });
    }

    // Create watch party (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const party = await prisma.watchParty.create({
      data: {
        hostId: user.id,
        animeId: parseInt(animeId),
        episode: parseInt(episode),
        animeTitle,
        animePoster: animePoster || null,
        roomCode,
        isPublic: isPublic ?? false,
        maxMembers: maxMembers || 10,
        expiresAt
      },
      include: {
        host: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Auto-join host as member
    await prisma.watchPartyMember.create({
      data: {
        userId: user.id,
        partyId: party.id,
        nickname: user.name || 'Host'
      }
    });

    return NextResponse.json(party);
  } catch (error) {
    console.error('Error creating watch party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
