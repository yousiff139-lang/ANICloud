import { NextResponse } from 'next/server';
import { ANIME } from '@consumet/extensions';

export const dynamic = 'force-dynamic';

// Simple in-memory cache to prevent redundant searches and waterfalls
// In a serverless env (Vercel), this persists across hot lambda invocations.
// In a long-running server (Railway/Docker), this lasts until restart.
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

  console.log(`📡 Stream Request: MAL_ID=${id}, EP=${episode}, Title=${title}, TitleEn=${titleEn}`);

  if (!id || id === 'undefined' || !episode || episode === 'undefined') {
    return NextResponse.json({ error: 'Missing ID or Episode' }, { status: 400 });
  }

  let animeInfo: any = null;

  try {
    const epNum = parseInt(episode);
    const provider = new ANIME.AnimePahe();
    (provider as any).baseUrl = "https://animepahe.com";
    
    let animeId = PROVIDER_ID_CACHE.get(title) || (titleEn ? PROVIDER_ID_CACHE.get(titleEn) : undefined);

    if (!animeId) {
      let searchResults: any = { results: [] };
      let usedTitle = '';
      let exactTargetLower = '';

      if (titleEn && titleEn !== 'undefined') {
        usedTitle = titleEn.replace(/\(TV\)/g, '').trim();
        exactTargetLower = usedTitle.toLowerCase();
        console.log(`🎬 Searching AnimePahe (PRIMARY_EN) for "${usedTitle}"...`);
        searchResults = await provider.search(usedTitle);
      }

      if (!searchResults.results || searchResults.results.length === 0) {
        usedTitle = title.replace(/\(TV\)/g, '').trim();
        exactTargetLower = usedTitle.toLowerCase();
        console.log(`🎬 Searching AnimePahe (FALLBACK_ROMAJI) for "${usedTitle}"...`);
        searchResults = await provider.search(usedTitle);
      }

      if (searchResults.results && searchResults.results.length > 0) {
        let bestMatch = searchResults.results[0];
        let highestScore = -1;
        
        for (const res of searchResults.results) {
          if (!res.title) continue;
          
          let score = getSimilarityScore(exactTargetLower, res.title);
          
          if (queryYear && res.releaseDate && res.releaseDate === queryYear) {
            score += 50;
          }
          
          const resTitle = res.title.toLowerCase();
          if (resTitle === exactTargetLower || resTitle.replace(/[^a-z0-9]/g, '') === exactTargetLower.replace(/[^a-z0-9]/g, '')) {
            score += 200;
          }
          
          console.log(`[FuzzyMatch] Evaluated "${res.title}" with score: ${score.toFixed(2)}`);
          
          if (score > highestScore) {
            highestScore = score;
            bestMatch = res;
          }
        }
        animeId = bestMatch.id;
        if (animeId) {
          PROVIDER_ID_CACHE.set(title, animeId);
          if (titleEn) PROVIDER_ID_CACHE.set(titleEn, animeId);
        }
      }
    }

    if (animeId) {
      console.log(`🎬 Target: ID: ${animeId}`);
      animeInfo = await provider.fetchAnimeInfo(animeId);

      let targetEp = animeInfo?.episodes?.find((e: any) => e.number === epNum);
      
      if (!targetEp && animeInfo?.episodes && animeInfo.episodes.length >= epNum) {
        targetEp = animeInfo.episodes[epNum - 1]; 
        console.log(`⚠️ Absolute episode number mismatch. Falling back to relative index: AnimePahe Ep ${targetEp.number}`);
      }

      if (targetEp) {
        console.log(`🎬 Fetching sources for ${targetEp.id}...`);
        const sourcesData = await provider.fetchEpisodeSources(targetEp.id);
        
        if (sourcesData.sources && sourcesData.sources.length > 0) {
          let masterUrl = '';
          const resolutions: Record<string, string> = {};

          for (const src of sourcesData.sources) {
            let quality = src.quality || 'default';
            
            if (quality.includes('1080p')) quality = '1080p';
            else if (quality.includes('720p')) quality = '720p';
            else if (quality.includes('480p')) quality = '480p';
            else if (quality.includes('360p')) quality = '360p';

            resolutions[quality] = src.url;
            masterUrl = src.url;
          }

          if (!masterUrl) masterUrl = resolutions['1080p'] || resolutions['720p'] || resolutions['default'] || sourcesData.sources[0].url;
          if (!resolutions['1080p']) resolutions['1080p'] = masterUrl;
          if (!resolutions['720p']) resolutions['720p'] = masterUrl;
          if (!resolutions['480p']) resolutions['480p'] = masterUrl;

          const forceMp4 = (u: string) => {
            if (u.includes('.m3u8') && u.includes('/stream/')) {
              return u.replace('/stream/', '/mp4/').replace(/\/uwu\.m3u8.*/, '');
            }
            return u;
          };

          masterUrl = forceMp4(masterUrl);
          for (const key in resolutions) {
            resolutions[key] = forceMp4(resolutions[key]);
          }

          console.log(`✅ Success! Extracted AnimePahe Stream: ${masterUrl.substring(0, 60)}...`);

          const result = {
            master: masterUrl,
            resolutions,
            type: 'mp4', 
            referer: "https://kwik.cx/",
            episodes: animeInfo.episodes,
            subtitles: sourcesData.subtitles || [],
          };

          // Cache the final result
          STREAM_CACHE.set(cacheKey, { data: result, timestamp: now });

          return NextResponse.json(result);
        }
      }
    }
    
    console.warn(`⚠️ No anime found on AnimePahe`);
    return NextResponse.json({ error: 'Anime not found' }, { status: 404 });

  } catch (error) {
    console.error('❌ Stream extraction failed completely:', error);
    
    const fallback = `https://www.2embed.cc/embed/anime/${id}?ep=${episode}`;
    return NextResponse.json({
      master: fallback,
      resolutions: { "1080p": fallback, "720p": fallback, "480p": fallback },
      type: "iframe",
      episodes: animeInfo?.episodes
    });
  }
}
