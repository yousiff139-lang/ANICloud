import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const parties = await prisma.watchParty.findMany({
      where: {
        isPublic: true,
        expiresAt: { gt: new Date() }
      },
      include: {
        host: { select: { id: true, name: true, profile: { select: { avatar: true } } } },
        members: { select: { id: true, nickname: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(parties);
  } catch (error: any) {
    console.error('[Social GET]', error);
    return NextResponse.json({ error: 'Failed to fetch public parties' }, { status: 500 });
  }
}
