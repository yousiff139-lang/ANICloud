import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ─── Reddit OAuth2 Token Cache ───────────────────────────────────────────────
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getRedditAccessToken(): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('[Reddit OAuth] No REDDIT_CLIENT_ID/SECRET found — skipping OAuth.');
    return null;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'web:anicloud-community:v2.0.0 (by /u/anicloud_dev)',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      console.error('[Reddit OAuth] Token fetch failed:', res.status, await res.text());
      return null;
    }

    const json = await res.json();
    cachedToken = {
      access_token: json.access_token,
      expires_at: Date.now() + json.expires_in * 1000,
    };
    return cachedToken.access_token;
  } catch (err) {
    console.error('[Reddit OAuth] Token fetch error:', err);
    return null;
  }
}

// ─── Fallback curated posts ───────────────────────────────────────────────────
// Shown when Reddit is unreachable, keeping the feed alive
const FALLBACK_POSTS = [
  {
    id: 'fallback_1',
    content: '**Welcome to ANICloud Community!** 🎉\n\nShare your anime thoughts, theories, and recommendations. The community feed is loading — check back soon!',
    image: null,
    isSpoiler: false,
    createdAt: new Date().toISOString(),
    user: { id: 'anicloud', name: 'ANICloud Bot', profile: { avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=anicloud&backgroundColor=b6e3f4' } },
    _count: { comments: 0, likes: 42 },
  },
  {
    id: 'fallback_2',
    content: '**🔥 What anime are you watching this season?**\n\nDrop your current favourites below! The community wants to know.',
    image: null,
    isSpoiler: false,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    user: { id: 'anicloud', name: 'ANICloud Bot', profile: { avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=anicloud&backgroundColor=b6e3f4' } },
    _count: { comments: 7, likes: 128 },
  },
];

// ─── Post mapper ──────────────────────────────────────────────────────────────
function mapRedditPost(child: any) {
  const post = child.data;
  const author = post.author || 'Anonymous';

  let image: string | null = null;
  const postUrl = post.url || '';
  if (/\.(jpeg|jpg|gif|png|webp)$/i.test(postUrl)) {
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
      name: `u/${author}`,
      profile: {
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${author}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      },
    },
    _count: { comments: post.num_comments || 0, likes: post.ups || 0 },
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const limit = url.searchParams.get('limit') || '10';

    // 1. Try Reddit OAuth2 (most reliable from cloud servers)
    const token = await getRedditAccessToken();

    const redditApiUrl = new URL('https://oauth.reddit.com/r/anime+Animemes/hot');
    redditApiUrl.searchParams.set('limit', limit);
    redditApiUrl.searchParams.set('raw_json', '1');
    if (cursor && cursor.startsWith('t3_')) {
      redditApiUrl.searchParams.set('after', cursor);
    }

    const headers: Record<string, string> = {
      'User-Agent': 'web:anicloud-community:v2.0.0 (by /u/anicloud_dev)',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use oauth.reddit.com if we have a token, otherwise fall back to www.reddit.com
    const fetchUrl = token
      ? redditApiUrl.toString()
      : `https://www.reddit.com/r/anime+Animemes/hot.json?limit=${limit}${cursor ? `&after=${cursor}` : ''}&raw_json=1`;

    const redditRes = await fetch(fetchUrl, {
      headers,
      // Railway suggests short timeouts to avoid 502s
      signal: AbortSignal.timeout(8000),
    });

    if (!redditRes.ok) {
      const body = await redditRes.text().catch(() => '');
      console.error(`[Community GET] Reddit responded ${redditRes.status}: ${body.substring(0, 200)}`);
      // Return fallback instead of error so the UI doesn't break
      return NextResponse.json(cursor ? [] : FALLBACK_POSTS);
    }

    const data = await redditRes.json();
    const children: any[] = data?.data?.children || [];

    const posts = children
      .filter((child: any) => !child.data.stickied && child.data.author !== 'AutoModerator')
      .map(mapRedditPost);

    return NextResponse.json(posts.length > 0 ? posts : (cursor ? [] : FALLBACK_POSTS));
  } catch (error: any) {
    console.error('[Community GET]', error.message);
    // Never crash — return fallback so community page always loads
    return NextResponse.json(FALLBACK_POSTS);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
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
        image,
      },
      include: {
        user: {
          select: { id: true, name: true, profile: { select: { avatar: true } } },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('[Community POST]', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
