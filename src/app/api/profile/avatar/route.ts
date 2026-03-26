import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true }
    });

    if (!user?.profile?.avatar) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const avatar = user.profile.avatar;

    // Handle data:image/... base64 strings
    if (avatar.startsWith('data:')) {
      const matches = avatar.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
    }

    // Handle URLs
    return NextResponse.redirect(avatar);
  } catch (error) {
    console.error('[Avatar API Error]:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
