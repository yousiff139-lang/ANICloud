import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');

    const redditUrl = new URL('https://www.reddit.com/r/anime+Animemes/hot.json?limit=10');
    if (cursor && cursor.startsWith('t3_')) {
       redditUrl.searchParams.append('after', cursor);
    }
    
    // N8N-style Automation Passthrough directly inside Next.js!
    // This allows it to work perfectly on Railway without needing a separate Python server
    const redditRes = await fetch(redditUrl.toString(), {
       headers: { 'User-Agent': 'windows:anicloud-n8n-automation:v1.0.0 (by /u/anicloud_dev)' }
    });

    if (!redditRes.ok) {
        throw new Error(`Reddit returned ${redditRes.status}`);
    }
    
    const data = await redditRes.json();
    const children = data?.data?.children || [];
    
    const posts = children.filter((child: any) => !child.data.stickied).map((child: any) => {
       const post = child.data;
       const author = post.author || 'Anonymous';
       
       // Image parsing (replicating the python logic)
       let image = null;
       const postUrl = post.url || '';
       if (postUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
          image = postUrl;
       } else if (post.preview?.images?.[0]?.source?.url) {
          image = post.preview.images[0].source.url.replace(/&amp;/g, '&');
       }
       
       return {
          id: post.name,
          content: `**${post.title || ''}**\n\n${(post.selftext || '').substring(0, 500)}`,
          image,
          isSpoiler: post.spoiler || false,
          createdAt: new Date((post.created_utc || Date.now() / 1000) * 1000).toISOString(),
          user: {
             id: author,
             name: author,
             profile: { avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${author}&backgroundColor=b6e3f4,c0aede,d1d4f9` }
          },
          _count: { comments: post.num_comments || 0, likes: post.ups || 0 }
       };
    });

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
