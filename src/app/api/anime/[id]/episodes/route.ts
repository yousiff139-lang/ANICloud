import { NextResponse } from 'next/server';
import { ANIME } from '@consumet/extensions';
import { getSimilarityScore } from '@/lib/match';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

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

  try {
    // 1. Fetch Official Metadata (Jikan)
    console.log(`[EpisodeAggregator] Fetching Jikan metadata for ID: ${id}`);
    const jikanRes = await axios.get(`${JIKAN_BASE_URL}/anime/${id}/episodes`);
    const jikanEpisodes = jikanRes.data.data || [];

    // If we don't have a title, we can't reliably fetch from providers, so return Jikan only
    if (!title) {
      return NextResponse.json(jikanEpisodes);
    }

    // 2. Fetch Provider Availability (Hianime prioritized for episode counts)
    console.log(`[EpisodeAggregator] Cross-referencing streaming providers for "${title}"...`);
    const hianime = new ANIME.Hianime();
    const searchQueries = [title, titleEn].filter(Boolean) as string[];
    
    let bestMatch: any = null;
    let highestScore = -1;

    for (const query of searchQueries) {
      const results = await hianime.search(query);
      if (!results.results) continue;

      for (const res of results.results) {
        let score = getSimilarityScore(title, res.title.toString());
        if (queryYear && res.releaseDate && parseInt(res.releaseDate) === queryYear) score += 50;
        
        if (score > highestScore) {
          highestScore = score;
          bestMatch = res;
        }
      }
      if (highestScore > 150) break;
    }

    let providerEpisodes: any[] = [];
    if (bestMatch && highestScore > 70) {
      console.log(`[EpisodeAggregator] Found provider match: ${bestMatch.title} (Score: ${highestScore})`);
      const animeInfo = await hianime.fetchAnimeInfo(bestMatch.id);
      providerEpisodes = animeInfo.episodes || [];
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

    return NextResponse.json(mergedEpisodes);

  } catch (error: any) {
    console.error(`[EpisodeAggregator] Error:`, error.message);
    // Fallback to Jikan metadata only if aggregation fails
    try {
      const fallback = await axios.get(`${JIKAN_BASE_URL}/anime/${id}/episodes`);
      return NextResponse.json(fallback.data.data || []);
    } catch {
      return NextResponse.json([]);
    }
  }
}
