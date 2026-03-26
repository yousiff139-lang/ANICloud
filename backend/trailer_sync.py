import requests
import json
import os
import time
from datetime import datetime

ANIME_FILE = "data/anime.json"

def fetch_trailers_for_trending():
    print(f"[{datetime.now()}] Running Trailer Automation Engine...")
    
    if not os.path.exists(ANIME_FILE):
        print("Anime database not found. Skipping.")
        return

    with open(ANIME_FILE, 'r', encoding='utf-8') as f:
        anime_list = json.load(f)

    updated_count = 0
    trending_list = anime_list.get('trending', [])
    for anime in trending_list[:20]:  # Focus on top 20 for now
        if 'trailer' not in anime or not anime['trailer']:
            print(f"Fetching trailer for: {anime['title']}...")
            try:
                # Re-fetch specific anime from Jikan to get full trailer details
                response = requests.get(f"https://api.jikan.moe/v4/anime/{anime['mal_id']}/full")
                data = response.json().get('data', {})
                trailer = data.get('trailer', {})
                
                if trailer.get('youtube_id'):
                    anime['trailer'] = {
                        'youtube_id': trailer['youtube_id'],
                        'url': trailer['url'],
                        'embed_url': trailer['embed_url']
                    }
                    updated_count += 1
                time.sleep(1)  # Respect rate limit
            except Exception as e:
                print(f"Error fetching {anime['title']}: {e}")

    if updated_count > 0:
        with open(ANIME_FILE, 'w', encoding='utf-8') as f:
            json.dump(anime_list, f, indent=2)
        print(f"Successfully synced {updated_count} new trailers.")
    else:
        print("No new trailers found or sync not required.")

if __name__ == "__main__":
    fetch_trailers_for_trending()
