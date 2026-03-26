import os
import json
import time
import requests
from datetime import datetime

# Configuration
JIKAN_BASE_URL = "https://api.jikan.moe/v4"
DATA_DIR = "data"
ANIME_FILE = os.path.join(DATA_DIR, "anime.json")

def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def fetch_data(endpoint, params=None):
    try:
        url = f"{JIKAN_BASE_URL}/{endpoint}"
        response = requests.get(url, params=params)
        response.raise_for_status()
        time.sleep(1) # Rate limiting respect
        return response.json().get('data', [])
    except Exception as e:
        print(f"Error fetching {endpoint}: {e}")
        return []

def run_ingestion():
    print(f"[{datetime.now()}] Starting Refined Content Ingestion...")
    ensure_data_dir()
    
    # 1. Trending (Currently Airing)
    trending = fetch_data("top/anime", {"filter": "airing", "limit": 20})
    
    # 2. Anime Series (Explicit TV type)
    anime_series = fetch_data("top/anime", {"type": "tv", "limit": 20})
    
    # 3. Popular All Time (By Popularity)
    popular_all_time = fetch_data("top/anime", {"filter": "bypopularity", "limit": 20})
    
    # 4. Anime Movies (Explicit Movie type)
    anime_movies = fetch_data("top/anime", {"type": "movie", "limit": 20})
    
    # 5. New Releases (Seasons now)
    new_releases = fetch_data("seasons/now", {"limit": 20})

    # Combine into a structured database
    database = {
        "trending": trending,
        "anime_series": anime_series,
        "popular_all_time": popular_all_time,
        "anime_movies": anime_movies,
        "new_releases": new_releases,
        "last_updated": datetime.now().isoformat()
    }

    with open(ANIME_FILE, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2, ensure_ascii=False)
    
    print(f"Ingestion complete. Database updated at {ANIME_FILE}")

if __name__ == "__main__":
    run_ingestion()
