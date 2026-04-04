import { NextResponse } from 'next/server';
import { ANIME } from '@consumet/extensions';
import fs from 'fs';
import path from 'path';
import { getSimilarityScore } from '@/lib/match';

export const dynamic = 'force-dynamic';

const MAPPING_FILE = path.join(process.cwd(), 'data', 'provider_mapping.json');

// Memory Cache for active session
const STREAM_CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours for stable streams

function getStoredMapping() {
  try {
    if (fs.existsSync(MAPPING_FILE)) {
      return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    }
  } catch (e) {
    console.error("[StreamAPI] Error reading mapping file:", e);
  }
  return {};
}

function saveMapping(malId: string, mapping: any) {
  try {
    const fullMapping = getStoredMapping();
    fullMapping[malId] = { ...fullMapping[malId], ...mapping };
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(fullMapping, null, 2));
  } catch (e) {
    console.error("[StreamAPI] Error writing mapping file:", e);
  }
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
  const queryYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

  const cacheKey = `${id}-${episode}`;
  const now = Date.now();

  // 1. Session Cache Check
  const cached = STREAM_CACHE.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    console.log(`🚀 Instant Cache Hit: MAL_ID=${id}, EP=${episode}`);
    return NextResponse.json(cached.data);
  }

  console.log(`📡 Stable Stream Request: MAL_ID=${id}, EP=${episode}, Title=${title}`);

  if (!id || id === 'undefined' || !episode || episode === 'undefined') {
    return NextResponse.json({ error: 'Missing ID or Episode' }, { status: 400 });
  }

  const epNum = parseInt(episode);
  const mapping = getStoredMapping()[id] || {};
  let finalResult: any = null;

  try {
    const hianime = new ANIME.Hianime();
    const animepahe = new ANIME.AnimePahe();
    (animepahe as any).baseUrl = "https://animepahe.com";

    // 2. STABILITY Step: Use Pre-Resolved IDs if available (No Search Lag)
    if (mapping.hianimeId || mapping.animepaheId) {
      console.log(`✅ IDs Resolved from Mapping: Hia=${mapping.hianimeId}, Pahe=${mapping.animepaheId}`);
      
      const fetchAttempt = async (provider: any, providerId: string, name: string) => {
        try {
          if (!providerId) return null;
          const info = await provider.fetchAnimeInfo(providerId);
          const targetEp = info.episodes?.find((e: any) => e.number === epNum) || info.episodes?.[epNum - 1];
          if (!targetEp) return null;
          
          const sources = await provider.fetchEpisodeSources(targetEp.id);
          if (sources.sources?.length > 0) {
            return {
              master: sources.sources[0].url.replace('/stream/', '/mp4/'),
              type: name === 'animepahe' ? 'mp4' : 'hls',
              referer: name === 'animepahe' ? "https://kwik.cx/" : (sources.headers?.Referer || ""),
              episodes: info.episodes
            };
          }
        } catch (e) { return null; }
      };

      // Faster Parallel Attempt
      const results = await Promise.all([
        fetchAttempt(hianime, mapping.hianimeId, 'hianime'),
        fetchAttempt(animepahe, mapping.animepaheId, 'animepahe')
      ]);
      finalResult = results.find(r => r !== null);
    }

    // 3. Fallback/Search Step: If mapping missing or direct fetch failed
    if (!finalResult) {
      console.log(`🔍 Mapping missing/failed. Identifying stability IDs for "${title}"...`);
      const searchQueries = [title, titleEn].filter(Boolean) as string[];
      
      const findBestId = async (provider: any, queries: string[]) => {
        for (const q of queries) {
          try {
            const results = await provider.search(q);
            const best = results.results?.find((res: any) => getSimilarityScore(title, res.title.toString()) > 75);
            if (best) return best.id;
          } catch (e) {}
        }
        return null;
      };

      const [hId, pId] = await Promise.all([
        mapping.hianimeId ? Promise.resolve(mapping.hianimeId) : findBestId(hianime, searchQueries),
        mapping.animepaheId ? Promise.resolve(mapping.animepaheId) : findBestId(animepahe, searchQueries)
      ]);

      if (hId || pId) {
        saveMapping(id, { hianimeId: hId, animepaheId: pId });
        // Recurse once with new IDs for zero-lag next request
        const retryResults = await Promise.all([
          hId ? fetchAttemptSilently(hianime, hId, 'hianime', epNum) : Promise.resolve(null),
          pId ? fetchAttemptSilently(animepahe, pId, 'animepahe', epNum) : Promise.resolve(null)
        ]);
        finalResult = retryResults.find(r => r !== null);
      }
    }

    // 4. ULTIMATE Stability: Python Gogoanime Fallback
    if (!finalResult) {
      console.log("🐍 Fallback: Invoking Stable Python GogoSource...");
      const { execSync } = require('child_process');
      const pythonRes = execSync(`python backend/stream_extractor.py "${title}" ${episode} ${id}`).toString();
      finalResult = JSON.parse(pythonRes);
    }

    if (finalResult && finalResult.master) {
      STREAM_CACHE.set(cacheKey, { data: finalResult, timestamp: now });
      return NextResponse.json(finalResult);
    }

    throw new Error("Aggregator Stability Failure");

  } catch (error: any) {
    console.error('❌ Stream Stabilization Failed:', error.message);
    const fallback = `https://www.2embed.cc/embed/anime/${id}?ep=${episode}`;
    return NextResponse.json({
      master: fallback,
      type: "iframe",
      resolutions: { "1080p": fallback }
    });
  }
}

async function fetchAttemptSilently(provider: any, providerId: string, name: string, epNum: number) {
  try {
    const info = await provider.fetchAnimeInfo(providerId);
    const targetEp = info.episodes?.find((e: any) => e.number === epNum) || info.episodes?.[epNum - 1];
    if (!targetEp) return null;
    const sources = await provider.fetchEpisodeSources(targetEp.id);
    if (sources.sources?.length > 0) {
      return {
        master: sources.sources[0].url.replace('/stream/', '/mp4/'),
        type: name === 'animepahe' ? 'mp4' : 'hls',
        referer: name === 'animepahe' ? "https://kwik.cx/" : (sources.headers?.Referer || ""),
        episodes: info.episodes
      };
    }
  } catch (e) {}
  return null;
}
