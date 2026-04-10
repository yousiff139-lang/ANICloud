"""
ANICloud Production Orchestrator v2.0
=====================================
Entry point for all ANICloud background automation.
Runs the daily sync engine on a clean 24-hour cycle.
"""

import os
import sys
import time
import subprocess
import threading
from datetime import datetime, timedelta

# Add backend to path so we can import daily_sync
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

from daily_sync import run_full_sync, CYCLE_INTERVAL_HOURS

def run_link_health_bot():
    """Start background link health monitoring (non-blocking)."""
    try:
        bot_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'link_status_bot.py')
        if os.path.exists(bot_path):
            subprocess.Popen([sys.executable, bot_path])
            print("  ✅ Link Health Bot started")
        else:
            print("  ⚠️  Link Health Bot not found, skipping")
    except Exception as e:
        print(f"  ❌ Link Health Bot failed to start: {e}")


def main():
    print("=" * 60)
    print("  ANICloud Production Orchestrator v2.0")
    print("  Mode: 24-Hour Autonomous Content Pipeline")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Start background services
    run_link_health_bot()

    # Main sync loop (runs immediately, then every 24h)
    while True:
        run_full_sync()

        next_run = datetime.now() + timedelta(hours=CYCLE_INTERVAL_HOURS)
        print(f"\n  💤 Next sync: {next_run.strftime('%Y-%m-%d %H:%M:%S')} ({CYCLE_INTERVAL_HOURS}h)")
        print("  " + "-" * 56)
        time.sleep(CYCLE_INTERVAL_HOURS * 3600)


if __name__ == "__main__":
    main()
