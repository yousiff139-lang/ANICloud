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
    const { reviewId, isHelpful } = body;

    if (!reviewId || isHelpful === undefined) {
      return NextResponse.json({ error: 'Review ID and vote required' }, { status: 400 });
    }

    // Check if already voted
    const existingVote = await prisma.reviewVote.findUnique({
      where: {
        userId_reviewId: {
          userId: user.id,
          reviewId
        }
      }
    });

    if (existingVote) {
      // Update vote
      if (existingVote.isHelpful !== isHelpful) {
        await prisma.$transaction([
          prisma.reviewVote.update({
            where: { id: existingVote.id },
            data: { isHelpful }
          }),
          prisma.review.update({
            where: { id: reviewId },
            data: {
              helpful: existingVote.isHelpful ? { decrement: 1 } : { increment: 1 },
              unhelpful: existingVote.isHelpful ? { increment: 1 } : { decrement: 1 }
            }
          })
        ]);
      }
    } else {
      // Create new vote
      await prisma.$transaction([
        prisma.reviewVote.create({
          data: {
            userId: user.id,
            reviewId,
            isHelpful
          }
        }),
        prisma.review.update({
          where: { id: reviewId },
          data: {
            helpful: isHelpful ? { increment: 1 } : undefined,
            unhelpful: !isHelpful ? { increment: 1 } : undefined
          }
        })
      ]);
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error voting on review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
