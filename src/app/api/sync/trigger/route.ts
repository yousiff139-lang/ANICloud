import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

let syncInProgress = false;

/**
 * /api/sync/trigger — Triggers a background sync cycle.
 * Can be called by Railway cron, the instrumentation hook, or manually.
 * Prevents concurrent runs.
 */
export async function POST() {
  if (syncInProgress) {
    return NextResponse.json({ status: 'already_running', message: 'A sync is already in progress.' });
  }

  const pythonScript = path.join(process.cwd(), 'backend', 'daily_sync.py');

  if (!fs.existsSync(pythonScript)) {
    return NextResponse.json({ status: 'error', message: 'daily_sync.py not found' }, { status: 404 });
  }

  syncInProgress = true;

  // Run in background — don't await
  exec(`python "${pythonScript}"`, { cwd: process.cwd(), timeout: 30 * 60 * 1000 }, (error, stdout, stderr) => {
    syncInProgress = false;
    if (error) {
      console.error('[SyncTrigger] Sync failed:', error.message);
      console.error('[SyncTrigger] stderr:', stderr);
    } else {
      console.log('[SyncTrigger] Sync completed successfully.');
      console.log('[SyncTrigger] stdout:', stdout.slice(-500));
    }
  });

  return NextResponse.json({ status: 'started', message: 'Background sync started.' });
}

// Also support GET for easy browser/cron triggering
export async function GET() {
  return POST();
}
