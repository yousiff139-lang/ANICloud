/**
 * Next.js Server Instrumentation Hook
 * Runs once on server startup. Checks if the local anime cache is stale (>24h)
 * and triggers a background sync if needed.
 */
export async function register() {
  // Only run on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const fs = await import('fs');
    const path = await import('path');

    const animePath = path.join(process.cwd(), 'data', 'anime.json');
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    let needsSync = true;

    try {
      if (fs.existsSync(animePath)) {
        const raw = fs.readFileSync(animePath, 'utf-8');
        const data = JSON.parse(raw);
        
        if (data.last_updated) {
          const lastUpdated = new Date(data.last_updated).getTime();
          const age = Date.now() - lastUpdated;
          
          if (age < TWENTY_FOUR_HOURS) {
            console.log(`[Instrumentation] Anime cache is fresh (${Math.round(age / 3600000)}h old). Skipping sync.`);
            needsSync = false;
          } else {
            console.log(`[Instrumentation] Anime cache is stale (${Math.round(age / 3600000)}h old). Triggering sync...`);
          }
        }
      } else {
        console.log('[Instrumentation] No anime cache found. Triggering initial sync...');
      }
    } catch (e) {
      console.error('[Instrumentation] Error checking cache:', e);
    }

    if (needsSync) {
      // Trigger sync after a short delay to let the server finish starting
      setTimeout(async () => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const res = await fetch(`${baseUrl}/api/sync/trigger`, { method: 'POST' });
          const result = await res.json();
          console.log('[Instrumentation] Sync trigger result:', result);
        } catch (err) {
          console.error('[Instrumentation] Failed to trigger sync:', err);
          
          // Direct fallback: run Python script directly
          try {
            const { exec } = await import('child_process');
            const scriptPath = path.join(process.cwd(), 'backend', 'daily_sync.py');
            
            if (fs.existsSync(scriptPath)) {
              console.log('[Instrumentation] Attempting direct Python execution...');
              exec(`python "${scriptPath}"`, { cwd: process.cwd(), timeout: 30 * 60 * 1000 }, (error, stdout, stderr) => {
                if (error) {
                  console.error('[Instrumentation] Direct sync failed:', error.message);
                } else {
                  console.log('[Instrumentation] Direct sync completed.');
                }
              });
            }
          } catch (directErr) {
            console.error('[Instrumentation] Direct execution also failed:', directErr);
          }
        }
      }, 10000); // 10 second delay
    }
  }
}
