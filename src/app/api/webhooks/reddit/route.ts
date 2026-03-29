import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

// In production, this should be in .env
const AUTOMATION_SECRET = process.env.REDDIT_AUTOMATION_SECRET || 'anicloud-secret-bot-key-2026';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${AUTOMATION_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized automation access' }, { status: 401 });
    }

    const body = await request.json();
    const { posts } = body;

    if (!Array.isArray(posts)) {
      return NextResponse.json({ error: 'Invalid payload, expected array of posts' }, { status: 400 });
    }

    let insertedCount = 0;

    for (const post of posts) {
      // 1. Generate a pseudo-email for the reddit author
      const pseudoEmail = `${post.author.toLowerCase()}@reddit.anicloud.com`;
      
      // 2. Find or create the organic pseudo-user
      let user = await prisma.user.findUnique({
        where: { email: pseudoEmail }
      });

      if (!user) {
        // Hash a dummy password securely just to fulfill the schema requirement
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10);
        
        user = await prisma.user.create({
          data: {
            name: post.author,
            email: pseudoEmail,
            password: hashedPassword,
            profile: {
              create: {
                // Generate a probabilistic avatar based on their reddit username length
                avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${post.author}&backgroundColor=b6e3f4,c0aede,d1d4f9`
              }
            }
          }
        });
      }

      // 3. Prevent strict exact duplicates
      const existingPost = await prisma.communityPost.findFirst({
        where: {
          content: { contains: post.title.substring(0, 20) }, // Use title snippet to match
          userId: user.id
        }
      });

      if (!existingPost) {
        // 4. Create the organic community post
        // Build the content dynamically: Title + Content + Subreddit source
        let finalContent = `**${post.title}**\n\n`;
        if (post.content && post.content.trim() !== '') {
           finalContent += `${post.content}\n\n`;
        }
        finalContent += `*Originally discussed on r/${post.subreddit}*`;

        await prisma.communityPost.create({
          data: {
            userId: user.id,
            content: finalContent,
            image: post.image || null,
            isSpoiler: post.isSpoiler || false,
          }
        });
        insertedCount++;
      }
    }

    return NextResponse.json({ success: true, inserted: insertedCount });
  } catch (error: any) {
    console.error('[Webhooks Reddit ERROR]', error);
    return NextResponse.json({ error: 'Failed to process reddit sync', details: error.message }, { status: 500 });
  }
}
