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

export const getTrendingAnime = async (): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?filter=airing&limit=10`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getAnimeSeries = async (): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?type=tv&limit=15`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getPopularAllTime = async (): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?filter=bypopularity&limit=15`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getAnimeMovies = async (): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/top/anime?type=movie&limit=15`);
    return removeDuplicates(response.data.data);
  } catch (error) {
    return [];
  }
};

export const getNewReleases = async (): Promise<Anime[]> => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/seasons/now?limit=15`);
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

export const getEpisodes = async (id: number) => {
  try {
    const response = await api.get(`${JIKAN_BASE_URL}/anime/${id}/episodes`);
    return response.data.data;
  } catch (error) {
    return [];
  }
};

export interface StreamData {
  master: string;
  resolutions: Record<string, string>;
  type?: 'hls' | 'youtube' | 'iframe' | 'mp4';
  referer?: string;
  episodes?: any[];
  error?: string;
}

// Real streaming URL helper (Queries our Python backend proxy)
export const getStreamUrl = async (malId: number, epNum: number, title?: string, titleEn?: string): Promise<StreamData> => {
  const queryTitle = title || 'Anime';
  try {
    const res = await fetch(`/api/stream/${malId}/${epNum}?title=${encodeURIComponent(queryTitle)}&titleEn=${encodeURIComponent(titleEn || '')}`, { 
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
