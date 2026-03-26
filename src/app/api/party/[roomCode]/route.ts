import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const party = await prisma.watchParty.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: {
        host: {
          select: { id: true, name: true, email: true }
        },
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    return NextResponse.json(party);
  } catch (error) {
    console.error('Error fetching party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Only host can delete
    if (party.hostId !== user.id) {
      return NextResponse.json({ error: 'Only host can end party' }, { status: 403 });
    }

    await prisma.watchParty.delete({
      where: { id: party.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
