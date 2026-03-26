import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ plan: 'free', status: 'active' });
    }

    // All logged-in users are now "ultimate" (all features accessible)
    return NextResponse.json({
      plan: 'ultimate',
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: null
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ plan: 'free', status: 'active' });
  }
}
