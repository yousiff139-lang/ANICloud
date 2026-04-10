import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * /api/catalog — Serves the locally cached anime catalog (populated by daily_sync.py).
 * The homepage consumes this instead of making 5+ direct Jikan API calls.
 * Falls back to an empty structure if the cache file doesn't exist yet.
 */
export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'anime.json');

  if (!fs.existsSync(filePath)) {
    // No cache yet — return empty structure so the homepage can fall back to Jikan
    return NextResponse.json({
      trending: [],
      new_releases: [],
      anime_series: [],
      popular_all_time: [],
      anime_movies: [],
      last_updated: null,
      source: 'empty'
    });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    return NextResponse.json({
      trending: data.trending || [],
      new_releases: data.new_releases || [],
      anime_series: data.anime_series || [],
      popular_all_time: data.popular_all_time || [],
      anime_movies: data.anime_movies || [],
      last_updated: data.last_updated || null,
      source: 'cache'
    });
  } catch (error) {
    console.error('[Catalog API] Failed to read anime.json:', error);
    return NextResponse.json({
      trending: [],
      new_releases: [],
      anime_series: [],
      popular_all_time: [],
      anime_movies: [],
      last_updated: null,
      source: 'error'
    }, { status: 500 });
  }
}
