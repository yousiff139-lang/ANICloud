import { NextResponse } from 'next/server';
import { ANIME } from '@consumet/extensions';

export const dynamic = 'force-dynamic';

// Simple in-memory cache to prevent redundant searches and waterfalls
const STREAM_CACHE = new Map<string, { data: any, timestamp: number }>();
const PROVIDER_ID_CACHE = new Map<string, string>(); // title -> providerId
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function getSimilarityScore(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 100;
  return ((maxLength - distance) / maxLength) * 100;
}

export async function GET(
  request: Request,
  context: any
) {
  const params = await context.params;
  const { id, episode } = params;
  
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Anime';
  const titleEn = searchParams.get('titleEn');
  const yearParam = searchParams.get('year');
  const queryYear = yearParam ? parseInt(yearParam) : undefined;

  const cacheKey = `${id}-${episode}`;
  const now = Date.now();

  // Check cache first
  const cached = STREAM_CACHE.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    console.log(`🚀 Cache Hit: MAL_ID=${id}, EP=${episode}`);
    return NextResponse.json(cached.data);
  }

  console.log(`📡 Stream Request: MAL_ID=${id}, EP=${episode}, Title=${title}, TitleEn=${titleEn}, Year=${queryYear}`);

  if (!id || id === 'undefined' || !episode || episode === 'undefined') {
    return NextResponse.json({ error: 'Missing ID or Episode' }, { status: 400 });
  }

  let finalAnimeInfo: any = null;
  const epNum = parseInt(episode);

  try {
    const providers = [
      { name: 'hianime', instance: new ANIME.Hianime() },
      { name: 'animepahe', instance: new ANIME.AnimePahe() }
    ];
    (providers[1].instance as any).baseUrl = "https://animepahe.com";

    const searchQueries = [title];
    if (titleEn && titleEn !== 'undefined') searchQueries.unshift(titleEn);

    // 1. Matching Engineering: Resolve the best provider ID across all sources
    let bestMatch: any = null;
    let highestScore = -1;
    let winningProvider: any = null;

    const queryToUse = searchQueries[0].replace(/\(TV\)/g, '').trim();
    const exactTargetLower = queryToUse.toLowerCase();

    console.log(`🔍 AGGREGATOR: Starting vast provider search for "${queryToUse}"...`);

    for (const p of providers) {
      try {
        const results = await p.instance.search(queryToUse);
        if (!results.results || results.results.length === 0) continue;

        for (const res of results.results) {
          if (!res.title) continue;
          let score = getSimilarityScore(exactTargetLower, res.title);
          
          if (queryYear && res.releaseDate && parseInt(res.releaseDate) === queryYear) {
            score += 50;
          }

          const resTitle = res.title.toLowerCase();
          if (resTitle === exactTargetLower || resTitle.replace(/[^a-z0-9]/g, '') === exactTargetLower.replace(/[^a-z0-9]/g, '')) {
            score += 200;
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatch = res;
            winningProvider = p;
          }
        }
      } catch (err) {
        console.warn(`⚠️ Provider ${p.name} search failed:`, err);
      }
    }

    if (bestMatch && winningProvider) {
      console.log(`🏆 Winner: [${winningProvider.name}] ${bestMatch.title} (ID: ${bestMatch.id}) Score: ${highestScore}`);
      
      const animeInfo = await winningProvider.instance.fetchAnimeInfo(bestMatch.id);
      finalAnimeInfo = animeInfo;

      let targetEp = animeInfo.episodes?.find((e: any) => e.number === epNum);
      
      if (!targetEp && animeInfo.episodes && animeInfo.episodes.length >= epNum) {
        targetEp = animeInfo.episodes[epNum - 1];
      }

      if (targetEp) {
        console.log(`🎬 Fetching sources from ${winningProvider.name} for episode ${epNum}...`);
        const sourcesData = await winningProvider.instance.fetchEpisodeSources(targetEp.id);
        
        if (sourcesData.sources && sourcesData.sources.length > 0) {
          const resolutions: Record<string, string> = {};
          let masterUrl = sourcesData.sources[0].url;

          sourcesData.sources.forEach((s: any) => {
            const q = s.quality || 'default';
            resolutions[q] = s.url;
            if (q === '1080p' || q.includes('1080')) masterUrl = s.url;
          });

          const forceMp4 = (u: string) => {
            if (u.includes('.m3u8') && u.includes('/stream/')) {
              return u.replace('/stream/', '/mp4/').replace(/\/uwu\.m3u8.*/, '');
            }
            return u;
          };

          const result = {
            master: forceMp4(masterUrl),
            resolutions: Object.fromEntries(Object.entries(resolutions).map(([k, v]) => [k, forceMp4(v)])),
            type: winningProvider.name === 'animepahe' ? 'mp4' : 'hls',
            referer: winningProvider.name === 'animepahe' ? "https://kwik.cx/" : (sourcesData.headers?.Referer || ""),
            episodes: animeInfo.episodes,
            subtitles: sourcesData.subtitles || []
          };

          STREAM_CACHE.set(cacheKey, { data: result, timestamp: now });
          return NextResponse.json(result);
        }
      }
    }

    // 2. Python Fallback
    console.log("🐍 Falling back to Python Gogoanime Extractor...");
    const { execSync } = require('child_process');
    const pythonResult = execSync(`python backend/stream_extractor.py "${queryToUse}" ${episode} ${id}`).toString();
    const parsed = JSON.parse(pythonResult);

    if (parsed && parsed.master && !parsed.master.includes('test-streams.mux.dev')) {
       return NextResponse.json({ ...parsed, episodes: finalAnimeInfo?.episodes || [] });
    }

    throw new Error("No valid streams found");

  } catch (error) {
    console.error('❌ Aggregator failed:', error);
    const fallback = `https://www.2embed.cc/embed/anime/${id}?ep=${episode}`;
    return NextResponse.json({
      master: fallback,
      resolutions: { "1080p": fallback, "720p": fallback, "480p": fallback },
      type: "iframe",
      episodes: finalAnimeInfo?.episodes || []
    });
  }
}
