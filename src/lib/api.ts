import axios from 'axios';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Use an instance with a strict timeout to prevent infinite loading spinners
// when the free Jikan API hangs or gets rate-limited.
const api = axios.create({
  timeout: 8000 // 8 seconds max wait time
});

export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  year?: number;
  synopsis: string;
  images: {
    webp: {
      large_image_url: string;
      small_image_url?: string;
    }
  };
  trailer?: {
    youtube_id: string;
    url: string;
    embed_url: string;
  };
  score: number;
  genres: { name: string }[];
}

const removeDuplicates = (animes: Anime[]): Anime[] => {
  if (!animes || !Array.isArray(animes)) return [];
  const seen = new Set();
  return animes.filter(anime => {
    if (seen.has(anime.mal_id)) return false;
    seen.add(anime.mal_id);
    return true;
  });
};

// ─── Catalog API (Primary data source for homepage) ────────────────────────
// Fetches from our local cache populated by daily_sync.py

export interface CatalogData {
  trending: Anime[];
  new_releases: Anime[];
  anime_series: Anime[];
  popular_all_time: Anime[];
  anime_movies: Anime[];
  last_updated: string | null;
  source: string;
}

export const getCatalog = async (): Promise<CatalogData> => {
  try {
    const response = await axios.get('/api/catalog', { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.warn('[API] Catalog cache unavailable, will fall back to Jikan');
    return {
      trending: [],
      new_releases: [],
      anime_series: [],
      popular_all_time: [],
      anime_movies: [],
      last_updated: null,
      source: 'fallback'
    };
  }
};

// ─── Jikan Direct Calls (fallbacks when cache is empty) ────────────────────

export const getTrendingAnime = async (page: number = 1): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?filter=airing&limit=24&page=${page}`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getAnimeSeries = async (page: number = 1): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?type=tv&limit=24&page=${page}`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getPopularAllTime = async (page: number = 1): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?filter=bypopularity&limit=24&page=${page}`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getAnimeMovies = async (page: number = 1): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?type=movie&limit=24&page=${page}`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getNewReleases = async (page: number = 1): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/seasons/now?limit=24&page=${page}`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getLastSeasonAnime = async (page: number = 1): Promise<Anime[]> => {
  try {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    let year = now.getFullYear();
    let season: 'winter' | 'spring' | 'summer' | 'fall';

    // Winter: 0,1,2 | Spring: 3,4,5 | Summer: 6,7,8 | Fall: 9,10,11
    if (month >= 0 && month <= 2) {
      season = 'fall';
      year -= 1;
    } else if (month >= 3 && month <= 5) {
      season = 'winter';
    } else if (month >= 6 && month <= 8) {
      season = 'spring';
    } else {
      season = 'summer';
    }

    const response = await api.get(`${JIKAN_BASE_URL}/seasons/${year}/${season}?limit=24&page=${page}`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export interface SearchOptions {
  q?: string;
  genres?: string;
  rating?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
}

export const searchAnime = async (options: SearchOptions | string): Promise<{ data: Anime[], pagination?: any }> => {
  try {
    const opts = typeof options === 'string' ? { q: options } : options;
    const params = new URLSearchParams({ limit: '24' }); // bumped to 24 for a better infinite scroll grid
    
    if (opts.q) params.append('q', opts.q);
    if (opts.genres) params.append('genres', opts.genres);
    if (opts.rating) params.append('rating', opts.rating);
    if (opts.type) params.append('type', opts.type);
    if (opts.start_date) params.append('start_date', opts.start_date);
    if (opts.end_date) params.append('end_date', opts.end_date);
    if (opts.page) params.append('page', opts.page.toString());

    const response = await api.get(`${JIKAN_BASE_URL}/anime?${params.toString()}`);
    
    // Filter out promotional specials, recaps, and music videos that don't have real episodes
    if (response.data && response.data.data) {
      const filtered = response.data.data.filter((anime: any) => 
        anime.type !== 'Special' && anime.type !== 'Music' && anime.type !== 'Promo' && anime.type !== 'CM'
      );
      response.data.data = removeDuplicates(filtered);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error searching anime:', error);
    return { data: [] };
  }
};

export const getAnimeById = async (id: number): Promise<Anime | null> => {
  try {
    // 1. Try local data first (it might have the optimized synced trailer)
    try {
      const localRes = await axios.get('/api/anime');
      const localData = localRes.data;
      
      let found = null;
      for (const key in localData) {
        if (Array.isArray(localData[key])) {
          found = localData[key].find((a: any) => a.mal_id === id);
          if (found) break;
        }
      }

      if (found && found.trailer?.embed_url?.includes('youtube-nocookie.com')) {
        console.log(`[API] Found optimized local trailer for ID: ${id}`);
        return found;
      }
    } catch (localErr) {
      console.warn(`[API] Local cache bypassed for ID: ${id}`);
    }

    // 2. Fallback to Jikan for fresh details
    const response = await api.get(`${JIKAN_BASE_URL}/anime/${id}/full`);
    return response.data.data;
  } catch (error) {
    console.error(`[API] Error fetching anime ${id}:`, error);
    return null;
  }
};

// ─── Episode Fetching (uses local API with full pagination) ────────────────
// Calls our server-side episodes endpoint which serves from cache or
// fetches ALL pages from Jikan (critical for 500+ episode anime)

export const getEpisodes = async (id: number, title?: string, titleEn?: string, year?: number) => {
  try {
    // Build query params for provider cross-referencing
    const params = new URLSearchParams();
    if (title) params.append('title', title);
    if (titleEn) params.append('titleEn', titleEn);
    if (year) params.append('year', year.toString());

    const queryStr = params.toString();
    const url = `/api/anime/${id}/episodes${queryStr ? '?' + queryStr : ''}`;

    const response = await axios.get(url, { timeout: 15000 });
    return response.data || [];
  } catch (error) {
    console.warn(`[API] Local episodes API failed for ${id}, falling back to Jikan paginated fetch`);
    
    // Direct Jikan fallback WITH full pagination
    return await fetchAllJikanEpisodes(id);
  }
};

// Paginate through ALL Jikan episode pages (25 per page)
// Critical for One Piece (1000+), Naruto (500+), etc.
async function fetchAllJikanEpisodes(id: number): Promise<any[]> {
  const allEpisodes: any[] = [];
  let page = 1;
  const maxPages = 50; // Safety limit (50 * 25 = 1250 episodes max)

  try {
    while (page <= maxPages) {
      const response = await api.get(`${JIKAN_BASE_URL}/anime/${id}/episodes?page=${page}`);
      const data = response.data;

      if (!data || !data.data || data.data.length === 0) break;

      allEpisodes.push(...data.data);

      // Jikan's has_next_page flag is broken (often falsely says false),
      // so we rely solely on whether data.data.length === 0 to break the loop.

      page++;

      // Respect Jikan rate limits (3 req/sec)
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  } catch (error) {
    console.error(`[API] Jikan paginated fetch failed at page ${page}:`, error);
  }

  return allEpisodes;
}

export interface StreamData {
  master: string;
  resolutions: Record<string, string>;
  type?: 'hls' | 'youtube' | 'iframe' | 'mp4';
  referer?: string;
  episodes?: any[];
  error?: string;
}

// Real streaming URL helper (Queries our Python backend proxy)
export const getStreamUrl = async (malId: number, epNum: number, title?: string, titleEn?: string, year?: number): Promise<StreamData> => {
  const queryTitle = title || 'Anime';
  const yearParam = year ? `&year=${year}` : '';
  try {
    const res = await fetch(`/api/stream/${malId}/${epNum}?title=${encodeURIComponent(queryTitle)}&titleEn=${encodeURIComponent(titleEn || '')}${yearParam}`, { 
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Fetch stream error:', err);
    const fallback = "https://vid-edge-1.vidsrc.to/vidsrc.m3u8";
    return {
      master: fallback,
      resolutions: { "1080p": fallback, "720p": fallback, "480p": fallback },
      type: 'hls'
    };
  }
};
