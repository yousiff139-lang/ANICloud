import requests
import json
import os
import time
from datetime import datetime

DATA_DIR = "data"
ANIME_FILE = os.path.join(DATA_DIR, "anime.json")

def validate_links():
    print(f"[{datetime.now()}] Starting Broken Link Validation...")
    if not os.path.exists(ANIME_FILE):
        print("No anime database found. Skipping.")
        return

    try:
        with open(ANIME_FILE, 'r', encoding='utf-8') as f:
            anime_list = json.load(f)
    except:
        return

    re_scrape_needed = []
    
    for anime in anime_list:
        # Mock streaming link check
        # In a real scenario, we'd check the .m3u8 or provider URL
        streaming_url = anime.get('streaming_url')
        if not streaming_url:
            continue
            
        try:
            response = requests.head(streaming_url, timeout=5)
            if response.status_code == 404:
                print(f"ALERT: Broken link detected for {anime['title']} (404)")
                re_scrape_needed.append(anime['mal_id'])
        except Exception as e:
            print(f"Error checking {anime['title']}: {e}")
            re_scrape_needed.append(anime['mal_id'])

    if re_scrape_needed:
        print(f"Triggering re-scrape for {len(re_scrape_needed)} titles...")
        # Placeholder for scraping logic (e.g., Nyaa.si integration)
    else:
        print("All active links verified.")

if __name__ == "__main__":
    validate_links()
