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
      include: {
        profile: true,
        watchHistory: {
          orderBy: { watchedAt: 'desc' },
          take: 10
        },
        libraries: {
          orderBy: { addedAt: 'desc' }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        subscription: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate stats
    const totalWatched = user.watchHistory.filter(h => h.completed).length;
    const totalHours = user.watchHistory.reduce((sum, h) => sum + (h.duration / 3600), 0);

    // Exclude sensitive data - Using any cast due to persistent prisma client type lag
    const { password, twoFactorSecret, ...safeUser } = user as any;

    return NextResponse.json({
      ...safeUser,
      plan: user.subscription?.plan || 'free',
      subscriptionStatus: user.subscription?.status || 'none',
      user: {
        twoFactorEnabled: (user as any).twoFactorEnabled
      },
      stats: {
        totalWatched,
        totalHours: Math.round(totalHours * 10) / 10,
        totalInLibrary: user.libraries.length,
        totalReviews: user.reviews.length
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
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
    const { name, bio, avatar, banner, location, website, isPublic } = body;

    // Update User name first
    if (name) {
      console.log(`[Profile API] Updating user name to: ${name}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { name }
      });
    }

    console.log(`[Profile API] Upserting user profile for: ${user.id}`);
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: bio || null,
        avatar: avatar || null,
        banner: banner || null,
        location: location || null,
        website: website || null,
        isPublic: isPublic !== undefined ? isPublic : true,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        bio: bio || null,
        avatar: avatar || null,
        banner: banner || null,
        location: location || null,
        website: website || null,
        isPublic: isPublic !== undefined ? isPublic : true
      }
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
