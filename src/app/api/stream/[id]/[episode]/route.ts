import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple in-memory cache for the current session to ensure instant replay
const STREAM_CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours for stable streams

export async function GET(
  request: Request,
  context: any
) {
  const params = await context.params;
  const { id, episode } = params;
  
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Anime';
  const titleEn = searchParams.get('titleEn');

  const cacheKey = `${id}-${episode}`;
  const now = Date.now();

  // 1. Session Cache Check
  const cached = STREAM_CACHE.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    console.log(`🚀 Smooth Cache Hit: MAL_ID=${id}, EP=${episode}`);
    return NextResponse.json(cached.data);
  }

  console.log(`📡 Smooth Stream Request: MAL_ID=${id}, EP=${episode}, Title=${title}`);

  if (!id || id === 'undefined' || !episode || episode === 'undefined') {
    return NextResponse.json({ error: 'Missing ID or Episode' }, { status: 400 });
  }

  try {
    // 2. Primary: Invoke the Stable Python GogoSource (The "Smooth" Method)
    console.log("🐍 Invoking Python Stream Extractor...");
    const { execSync } = require('child_process');
    
    // We try with the title first as it's the most reliable for Gogoanime
    const queryTitle = (titleEn && titleEn !== 'undefined') ? titleEn : title;
    const pythonRes = execSync(`python backend/stream_extractor.py "${queryTitle}" ${episode} ${id}`).toString();
    const finalResult = JSON.parse(pythonRes);

    if (finalResult && finalResult.master && !finalResult.master.includes('test-streams.mux.dev')) {
      STREAM_CACHE.set(cacheKey, { data: finalResult, timestamp: now });
      return NextResponse.json(finalResult);
    }

    throw new Error("Smooth Method Failure");

  } catch (error: any) {
    console.error('❌ Smooth Extraction Failed:', error.message);
    // 3. Last Resort: 2embed Iframe
    const fallback = `https://www.2embed.cc/embed/anime/${id}?ep=${episode}`;
    const fallbackResult = {
      master: fallback,
      type: "iframe",
      resolutions: { "1080p": fallback },
      episodes: []
    };
    return NextResponse.json(fallbackResult);
  }
}
