// Multi-source anime data aggregator

import { Anime } from './api';
import { getCached, CacheKeys, CacheTTL } from './cache';

export interface AnimeSource {
  name: string;
  priority: number;
  fetchAnime: (id: number) => Promise<Anime | null>;
  fetchEpisodes: (id: number) => Promise<any[]>;
  fetchStream: (id: number, episode: number) => Promise<any>;
}

// Jikan API Source (MyAnimeList)
const jikanSource: AnimeSource = {
  name: 'Jikan',
  priority: 1,
  fetchAnime: async (id: number) => {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
      const data = await res.json();
      return data.data;
    } catch (error) {
      console.error('[Jikan] Error fetching anime:', error);
      return null;
    }
  },
  fetchEpisodes: async (id: number) => {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/episodes`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error('[Jikan] Error fetching episodes:', error);
      return [];
    }
  },
  fetchStream: async () => {
    // Jikan doesn't provide streams
    return null;
  }
};

// AniList API Source
const anilistSource: AnimeSource = {
  name: 'AniList',
  priority: 2,
  fetchAnime: async (id: number) => {
    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            averageScore
            episodes
            genres
            status
          }
        }
      `;

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { id } })
      });

      const data = await res.json();
      
      // Convert to Jikan format
      if (data.data?.Media) {
        const media = data.data.Media;
        return {
          mal_id: media.id,
          title: media.title.romaji,
          title_english: media.title.english,
          images: {
            webp: {
              large_image_url: media.coverImage.extraLarge || media.coverImage.large
            }
          },
          synopsis: media.description,
          score: media.averageScore / 10,
          episodes: media.episodes,
          genres: media.genres.map((g: string) => ({ name: g })),
          status: media.status
        } as any;
      }
      
      return null;
    } catch (error) {
      console.error('[AniList] Error fetching anime:', error);
      return null;
    }
  },
  fetchEpisodes: async () => {
    // AniList doesn't provide detailed episode info
    return [];
  },
  fetchStream: async () => {
    // AniList doesn't provide streams
    return null;
  }
};

// Gogoanime Source (via your backend)
const gogoSource: AnimeSource = {
  name: 'Gogoanime',
  priority: 3,
  fetchAnime: async () => {
    // Gogoanime doesn't provide anime info
    return null;
  },
  fetchEpisodes: async () => {
    // Would integrate with your backend
    return [];
  },
  fetchStream: async (id: number, episode: number) => {
    try {
      // This would call your existing stream extraction backend
      const res = await fetch(`/api/stream/${id}/${episode}`);
      return await res.json();
    } catch (error) {
      console.error('[Gogoanime] Error fetching stream:', error);
      return null;
    }
  }
};

// All available sources
const sources: AnimeSource[] = [jikanSource, anilistSource, gogoSource];

// Aggregate anime data from multiple sources
export async function getAggregatedAnime(id: number): Promise<Anime | null> {
  const cacheKey = CacheKeys.anime(id);
  
  return getCached(cacheKey, async () => {
    // Try each source in priority order
    for (const source of sources.sort((a, b) => a.priority - b.priority)) {
      try {
        const anime = await source.fetchAnime(id);
        if (anime) {
          console.log(`[Aggregator] Fetched anime ${id} from ${source.name}`);
          return anime;
        }
      } catch (error) {
        console.error(`[Aggregator] ${source.name} failed:`, error);
      }
    }
    
    return null;
  }, CacheTTL.LONG);
}

// Aggregate episodes from multiple sources
export async function getAggregatedEpisodes(id: number): Promise<any[]> {
  const cacheKey = CacheKeys.episodes(id);
  
  return getCached(cacheKey, async () => {
    const allEpisodes: any[] = [];
    
    // Collect episodes from all sources
    for (const source of sources) {
      try {
        const episodes = await source.fetchEpisodes(id);
        if (episodes.length > 0) {
          console.log(`[Aggregator] Fetched ${episodes.length} episodes from ${source.name}`);
          allEpisodes.push(...episodes);
        }
      } catch (error) {
        console.error(`[Aggregator] ${source.name} failed:`, error);
      }
    }
    
    // Deduplicate and sort
    const uniqueEpisodes = Array.from(
      new Map(allEpisodes.map(ep => [ep.mal_id || ep.number, ep])).values()
    );
    
    return uniqueEpisodes.sort((a, b) => (a.number || 0) - (b.number || 0));
  }, CacheTTL.LONG);
}

// Aggregate stream from multiple sources
export async function getAggregatedStream(id: number, episode: number): Promise<any> {
  const cacheKey = CacheKeys.stream(id, episode);
  
  return getCached(cacheKey, async () => {
    // Try each source in priority order
    for (const source of sources.sort((a, b) => a.priority - b.priority)) {
      try {
        const stream = await source.fetchStream(id, episode);
        if (stream) {
          console.log(`[Aggregator] Fetched stream from ${source.name}`);
          return stream;
        }
      } catch (error) {
        console.error(`[Aggregator] ${source.name} failed:`, error);
      }
    }
    
    return { error: 'No stream available from any source' };
  }, CacheTTL.SHORT);
}

// Health check for all sources
export async function checkSourcesHealth(): Promise<{ [key: string]: boolean }> {
  const health: { [key: string]: boolean } = {};
  
  await Promise.all(
    sources.map(async (source) => {
      try {
        // Try to fetch a popular anime (Naruto - ID: 20)
        const result = await source.fetchAnime(20);
        health[source.name] = result !== null;
      } catch {
        health[source.name] = false;
      }
    })
  );
  
  return health;
}

// Get source statistics
export function getSourceStats() {
  return sources.map(source => ({
    name: source.name,
    priority: source.priority,
    capabilities: {
      anime: source.fetchAnime !== null,
      episodes: source.fetchEpisodes !== null,
      stream: source.fetchStream !== null
    }
  }));
}
