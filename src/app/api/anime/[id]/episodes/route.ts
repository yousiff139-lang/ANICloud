import { NextResponse } from 'next/server';
import { ANIME } from '@consumet/extensions';
import { getSimilarityScore } from '@/lib/match';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const EPISODES_CACHE_PATH = path.join(process.cwd(), 'data', 'episodes_cache.json');

// Helper: check if cached data is still fresh (within 24 hours)
function getCachedEpisodes(id: string): any[] | null {
  try {
    if (!fs.existsSync(EPISODES_CACHE_PATH)) return null;

    const raw = fs.readFileSync(EPISODES_CACHE_PATH, 'utf-8');
    const cache = JSON.parse(raw);
    const entry = cache[id];

    if (!entry || !entry.episodes || entry.error) return null;

    // Check freshness: 24 hours
    if (entry.cached_at) {
      const cachedAt = new Date(entry.cached_at).getTime();
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (now - cachedAt > twentyFourHours) return null; // Stale
    }

    if (entry.episodes.length > 0) {
      console.log(`[EpisodeAggregator] ⚡ Cache HIT for ID: ${id} (${entry.episodes.length} episodes)`);
      return entry.episodes;
    }

    return null;
  } catch {
    return null;
  }
}

// Save episodes back to cache for future requests
function saveToCache(id: string, episodes: any[], title: string) {
  try {
    const dir = path.dirname(EPISODES_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let cache: any = {};
    if (fs.existsSync(EPISODES_CACHE_PATH)) {
      cache = JSON.parse(fs.readFileSync(EPISODES_CACHE_PATH, 'utf-8'));
    }

    cache[id] = {
      title,
      episodes,
      count: episodes.length,
      cached_at: new Date().toISOString()
    };

    fs.writeFileSync(EPISODES_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`[EpisodeAggregator] 💾 Saved ${episodes.length} episodes to cache for ID: ${id}`);
  } catch (err) {
    console.error('[EpisodeAggregator] Cache save error:', err);
  }
}

// Fetch ALL episode pages from Jikan (paginated, 25 per page)
// Critical for One Piece (1000+), Naruto (500+), Detective Conan (1000+)
async function fetchAllJikanEpisodes(id: string): Promise<any[]> {
  const allEpisodes: any[] = [];
  let page = 1;
  const maxPages = 50; // 50 * 25 = 1250 episodes safety limit

  while (page <= maxPages) {
    try {
      const response = await axios.get(`${JIKAN_BASE_URL}/anime/${id}/episodes`, {
        params: { page },
        timeout: 10000
      });

      const data = response.data;
      if (!data || !data.data || data.data.length === 0) break;

      allEpisodes.push(...data.data);

      // Jikan's has_next_page flag is broken (often falsely says false),
      // so we rely solely on whether data.data.length === 0 to break the loop.

      page++;

      // Respect Jikan rate limits (3 req/sec)
      await new Promise(resolve => setTimeout(resolve, 400));
    } catch (err: any) {
      console.error(`[EpisodeAggregator] Jikan page ${page} fetch error:`, err.message);

      // If we got rate-limited, wait and retry once
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers['retry-after'] || '3');
        console.log(`[EpisodeAggregator] Rate limited, waiting ${retryAfter + 1}s...`);
        await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
        continue; // Retry same page
      }

      break; // Other errors: stop pagination
    }
  }

  console.log(`[EpisodeAggregator] Fetched ${allEpisodes.length} episodes across ${page} pages from Jikan`);
  return allEpisodes;
}

export async function GET(
  request: Request,
  context: any
) {
  const params = await context.params;
  const { id } = params;
  
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const titleEn = searchParams.get('titleEn');
  const queryYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  // ────────────────────────────────────────────────────────────
  // FAST PATH: Serve from local cache (populated by daily_sync)
  // ────────────────────────────────────────────────────────────
  const cached = getCachedEpisodes(id);
  if (cached) {
    return NextResponse.json(cached);
  }

  // ────────────────────────────────────────────────────────────
  // SLOW PATH: Live fetch from Jikan (ALL pages) + Provider
  // ────────────────────────────────────────────────────────────
  try {
    // 1. Fetch ALL episodes from Jikan with full pagination
    console.log(`[EpisodeAggregator] Cache MISS → Fetching ALL Jikan pages for ID: ${id}`);
    const jikanEpisodes = await fetchAllJikanEpisodes(id);

    // If we don't have a title, we can't reliably fetch from providers
    if (!title) {
      // Still save to cache for next time
      if (jikanEpisodes.length > 0) {
        saveToCache(id, jikanEpisodes, `ID:${id}`);
      }
      return NextResponse.json(jikanEpisodes);
    }

    // 2. Fetch Provider Availability (Hianime prioritized for episode counts)
    console.log(`[EpisodeAggregator] Cross-referencing streaming providers for "${title}"...`);
    let providerEpisodes: any[] = [];
    
    try {
      // Test multiple providers to bypass failures (Hianime is currently missing One Piece)
      const providerClasses = [ANIME.Hianime, ANIME.AnimeKai, ANIME.AnimeUnity];
      let bestMatch: any = null;
      let highestScore = -1;
      let activeProvider: any = null;

      for (const ProviderClass of providerClasses) {
        if (providerEpisodes.length > 0) break; // Break if we already successfully pulled episodes from another provider

        try {
          const provider = new ProviderClass();
          const searchQueries = [title, titleEn].filter(Boolean) as string[];
          
          bestMatch = null; // reset for this provider
          highestScore = -1;

          for (const query of searchQueries) {
            const results = await provider.search(query);
            if (!results.results) continue;

            for (const res of results.results) {
              let score = getSimilarityScore(title, res.title.toString());
              if (queryYear && res.releaseDate && parseInt(res.releaseDate) === queryYear) score += 50;
              
              if (score > highestScore) {
                highestScore = score;
                bestMatch = res;
                activeProvider = provider;
              }
            }
            if (highestScore > 150) break;
          }

          if (bestMatch && highestScore > 70) {
            console.log(`[EpisodeAggregator] Found match on ${provider.name || 'Provider'}: ${bestMatch.title} (Score: ${highestScore})`);
            const animeInfo = await activeProvider.fetchAnimeInfo(bestMatch.id);
            providerEpisodes = animeInfo.episodes || [];
          }
        } catch (providerErr) {
          console.warn(`[EpisodeAggregator] Provider loop caught error for ${ProviderClass.name}, trying next...`);
        }
      }
    } catch (globalErr) {
      console.warn('[EpisodeAggregator] Provider fetch failed, continuing with Jikan data only');
    }

    // 3. Merging Engineering
    // We prefer Jikan metadata (titles, thumbnails) but Provider availability
    const mergedEpisodes = [...jikanEpisodes];
    const jikanCount = jikanEpisodes.length;
    const providerCount = providerEpisodes.length;

    if (providerCount > jikanCount) {
      console.log(`[EpisodeAggregator] Provider has MORE episodes (${providerCount}) than Jikan (${jikanCount}). Adding placeholders.`);
      for (let i = jikanCount + 1; i <= providerCount; i++) {
        mergedEpisodes.push({
          mal_id: i,
          number: i,
          title: `Episode ${i}`,
          filler: false,
          recap: false,
          is_placeholder: true // Flag for frontend
        });
      }
    }

    // Save to cache for future requests
    if (mergedEpisodes.length > 0) {
      saveToCache(id, mergedEpisodes, title);
    }

    return NextResponse.json(mergedEpisodes);

  } catch (error: any) {
    console.error(`[EpisodeAggregator] Error:`, error.message);
    // Fallback to Jikan with full pagination
    try {
      const fallbackEpisodes = await fetchAllJikanEpisodes(id);
      if (fallbackEpisodes.length > 0) {
        saveToCache(id, fallbackEpisodes, title || `ID:${id}`);
      }
      return NextResponse.json(fallbackEpisodes);
    } catch {
      return NextResponse.json([]);
    }
  }
}
