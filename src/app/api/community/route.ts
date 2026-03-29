import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');

    // N8N-style Automation Passthrough
    // Fetch live from the Python microservice without saving to our local DB
    const pythonEndpoint = cursor 
      ? `http://127.0.0.1:5000/api/feed?cursor=${cursor}`
      : `http://127.0.0.1:5000/api/feed`;
      
    const automationRes = await fetch(pythonEndpoint);
    if (!automationRes.ok) {
        throw new Error(`Python Automation returned ${automationRes.status}`);
    }
    
    const posts = await automationRes.json();
    return NextResponse.json(posts);
  } catch (error: any) {
    console.error('[Community GET Proxy]', error);
    return NextResponse.json({ error: 'Failed to proxy feed from Python automation', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, animeId, episode, isSpoiler, image } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const post = await prisma.communityPost.create({
      data: {
        userId: (session.user as any).id,
        content,
        animeId,
        episode,
        isSpoiler: isSpoiler || false,
        image
      },
      include: {
        user: {
          select: { id: true, name: true, profile: { select: { avatar: true } } }
        },
        _count: {
          select: { comments: true, likes: true }
        }
      }
    });

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('[Community POST]', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
