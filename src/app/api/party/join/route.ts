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
    const { roomCode, nickname } = body;

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    // Find party
    const party = await prisma.watchParty.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: {
        members: true,
        host: {
          select: { id: true, name: true }
        }
      }
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date() > party.expiresAt) {
      return NextResponse.json({ error: 'Party has expired' }, { status: 410 });
    }

    // Check if full
    if (party.members.length >= party.maxMembers) {
      return NextResponse.json({ error: 'Party is full' }, { status: 403 });
    }

    // Check if already a member
    const existingMember = await prisma.watchPartyMember.findUnique({
      where: {
        userId_partyId: {
          userId: user.id,
          partyId: party.id
        }
      }
    });

    if (existingMember) {
      // Reactivate if inactive
      if (!existingMember.isActive) {
        await prisma.watchPartyMember.update({
          where: { id: existingMember.id },
          data: { isActive: true, lastSeen: new Date() }
        });
      }
      return NextResponse.json({ party, member: existingMember });
    }

    // Join party
    const member = await prisma.watchPartyMember.create({
      data: {
        userId: user.id,
        partyId: party.id,
        nickname: nickname || user.name || 'Guest'
      }
    });

    // Send system message
    await prisma.watchPartyMessage.create({
      data: {
        partyId: party.id,
        userId: user.id,
        username: 'System',
        message: `${member.nickname} joined the party`,
        type: 'system'
      }
    });

    return NextResponse.json({ party, member });
  } catch (error) {
    console.error('Error joining watch party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
