import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dataDir = path.join(process.cwd(), 'data');
  const logPath = path.join(dataDir, 'sync_log.json');
  const animePath = path.join(dataDir, 'anime.json');
  const episodesPath = path.join(dataDir, 'episodes_cache.json');

  const status: any = {
    healthy: false,
    last_sync: null,
    anime_catalog: { exists: false, categories: 0, last_updated: null },
    episodes_cache: { exists: false, total_anime: 0, total_episodes: 0 },
    recent_logs: [],
  };

  try {
    // Check anime catalog
    if (fs.existsSync(animePath)) {
      const animeData = JSON.parse(fs.readFileSync(animePath, 'utf-8'));
      status.anime_catalog.exists = true;
      status.anime_catalog.last_updated = animeData.last_updated || null;
      status.anime_catalog.categories = Object.keys(animeData).filter(
        (k) => k !== 'last_updated' && Array.isArray(animeData[k])
      ).length;
    }

    // Check episodes cache
    if (fs.existsSync(episodesPath)) {
      const epsData = JSON.parse(fs.readFileSync(episodesPath, 'utf-8'));
      const meta = epsData._meta || {};
      status.episodes_cache.exists = true;
      status.episodes_cache.total_anime = meta.total_anime || 0;
      status.episodes_cache.total_episodes = meta.total_episodes_cached || 0;
      status.episodes_cache.last_full_sync = meta.last_full_sync || null;
    }

    // Check sync logs
    if (fs.existsSync(logPath)) {
      const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      status.recent_logs = Array.isArray(logs) ? logs.slice(-5) : [];
      if (status.recent_logs.length > 0) {
        const last = status.recent_logs[status.recent_logs.length - 1];
        status.last_sync = last.timestamp;
        status.healthy = last.status === 'success';
      }
    }

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ ...status, error: 'Failed to read sync status' }, { status: 500 });
  }
}
