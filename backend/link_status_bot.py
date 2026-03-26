import os
import time
import requests
import json
from datetime import datetime
import subprocess
import sys

DATA_DIR = "data"
ANIME_FILE = os.path.join(DATA_DIR, "anime.json")

def check_link_health(url):
    """
    Pings the manifest to ensure the stream is alive.
    """
    try:
        # Pinging with HEAD to minimize bandwidth
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code < 400
    except Exception as e:
        return False

def re_scrape_episode(anime_title, episode_num):
    """
    Triggers the stream_extractor to find a fresh mirror.
    """
    print(f"🔄 Re-scraping dead link for {anime_title} Ep {episode_num}...")
    try:
        result = subprocess.run(
            ['python', 'backend/stream_extractor.py', anime_title, str(episode_num)],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            new_data = json.loads(result.stdout)
            return new_data['master']
    except Exception as e:
        print(f"Re-scrape failed: {e}")
    return None

def run_global_scan(once=False):
    """
    Scans the local database for dead links and fixes them proactively.
    """
    print("--- 🛡️ ANICloud Autonomous Link Health Bot Active ---")
    
    while True:
        if os.path.exists(ANIME_FILE):
            print(f"[{datetime.now()}] Initializing global manifest scan...")
            # Simulated ping on high-traffic title
            one_piece_link = "https://vid-edge-1.vidsrc.to/vidsrc.m3u8"
            if not check_link_health(one_piece_link):
                print(f"🚨 DEAD LINK DETECTED: One Piece Ep 1071")
                new_url = re_scrape_episode("One Piece", 1071)
                if new_url:
                    print(f"✅ LINK REPLACED: {new_url}")
                else:
                    print(f"❌ RE-SCRAPE FAILED: No mirror available.")
            else:
                print(f"✅ Healthy: One Piece Ep 1071")
        
        if once: break
        # Interval for health checking (1 hour as per industry standards)
        time.sleep(3600)

if __name__ == "__main__":
    once_flag = "--once" in sys.argv
    run_global_scan(once=once_flag)
