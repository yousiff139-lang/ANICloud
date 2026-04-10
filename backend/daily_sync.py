"""
ANICloud Daily Sync Engine v2.0
================================
Automated 24-hour content pipeline that:
  1. Fetches the full anime catalog across all categories (with pagination)
  2. Pre-caches episode lists for every unique anime
  3. Syncs trailers for trending titles
  4. Writes everything to data/anime.json and data/episodes_cache.json

Respects Jikan API rate limits: max 3 requests/second, 60 requests/minute.
"""

import os
import json
import time
import sys
import io
import requests
import traceback

# Fix Windows console encoding for Unicode output
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from datetime import datetime, timedelta

# ─── Configuration ────────────────────────────────────────────────────────────
JIKAN_BASE_URL = "https://api.jikan.moe/v4"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
ANIME_FILE = os.path.join(DATA_DIR, "anime.json")
EPISODES_FILE = os.path.join(DATA_DIR, "episodes_cache.json")
LOG_FILE = os.path.join(DATA_DIR, "sync_log.json")

CYCLE_INTERVAL_HOURS = 24
RATE_LIMIT_DELAY = 0.4  # 400ms between requests (safe for 3 req/sec)
MAX_PAGES_PER_CATEGORY = 5  # 5 pages × 25 items = up to 125 per category
ITEMS_PER_PAGE = 25

# ─── Helpers ──────────────────────────────────────────────────────────────────

_request_count = 0
_minute_start = time.time()

def rate_limited_get(url, params=None, retries=3):
    """GET with automatic Jikan rate-limit handling and retry logic."""
    global _request_count, _minute_start

    # Per-minute throttle: if we've hit 55 requests in the current minute, wait
    now = time.time()
    if now - _minute_start < 60 and _request_count >= 55:
        wait = 60 - (now - _minute_start) + 1
        print(f"  [WAIT] Rate limit cooldown: waiting {wait:.0f}s...")
        time.sleep(wait)
        _request_count = 0
        _minute_start = time.time()

    if now - _minute_start >= 60:
        _request_count = 0
        _minute_start = time.time()

    for attempt in range(retries):
        try:
            time.sleep(RATE_LIMIT_DELAY)
            response = requests.get(url, params=params, timeout=15)

            _request_count += 1

            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 5))
                print(f"  [WARN] 429 Rate Limited. Backing off {retry_after}s (attempt {attempt+1}/{retries})")
                time.sleep(retry_after + 1)
                continue

            response.raise_for_status()
            return response.json()

        except requests.exceptions.Timeout:
            print(f"  [TIMEOUT] Timeout on {url} (attempt {attempt+1}/{retries})")
            time.sleep(2)
        except requests.exceptions.RequestException as e:
            print(f"  [ERROR] Request error: {e} (attempt {attempt+1}/{retries})")
            time.sleep(2)

    return None


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def load_json(filepath, default=None):
    if default is None:
        default = {}
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return default


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save_log(log_entry):
    log = load_json(LOG_FILE, [])
    if not isinstance(log, list):
        log = []
    log.append(log_entry)
    # Keep only last 30 entries
    save_json(LOG_FILE, log[-30:])


# ─── Phase 1: Anime Catalog Fetch ────────────────────────────────────────────

CATEGORIES = {
    "trending":        {"endpoint": "top/anime",    "params": {"filter": "airing"}},
    "anime_series":    {"endpoint": "top/anime",    "params": {"type": "tv"}},
    "popular_all_time":{"endpoint": "top/anime",    "params": {"filter": "bypopularity"}},
    "anime_movies":    {"endpoint": "top/anime",    "params": {"type": "movie"}},
    "new_releases":    {"endpoint": "seasons/now",   "params": {}},
}


def fetch_category(name, config):
    """Fetch all pages for a single category."""
    all_items = []
    seen_ids = set()

    for page in range(1, MAX_PAGES_PER_CATEGORY + 1):
        params = {**config["params"], "limit": ITEMS_PER_PAGE, "page": page}
        url = f"{JIKAN_BASE_URL}/{config['endpoint']}"

        result = rate_limited_get(url, params)
        if not result or "data" not in result:
            break

        items = result["data"]
        if not items:
            break

        for item in items:
            mid = item.get("mal_id")
            if mid and mid not in seen_ids:
                seen_ids.add(mid)
                all_items.append(item)

        # Check if there are more pages
        pagination = result.get("pagination", {})
        if not pagination.get("has_next_page", False):
            break

        print(f"    Page {page}: +{len(items)} items (total: {len(all_items)})")

    return all_items


def sync_anime_catalog():
    """Phase 1: Fetch full anime catalog across all categories."""
    print("\n" + "="*60)
    print("  PHASE 1: Anime Catalog Sync")
    print("="*60)

    database = load_json(ANIME_FILE, {})
    total_new = 0

    for name, config in CATEGORIES.items():
        print(f"\n  >> Category: {name}")
        items = fetch_category(name, config)
        old_count = len(database.get(name, []))
        database[name] = items
        diff = len(items) - old_count
        total_new += max(diff, 0)
        print(f"    [OK] {len(items)} anime fetched (delta {diff:+d})")

    database["last_updated"] = datetime.now().isoformat()
    save_json(ANIME_FILE, database)

    print(f"\n  [DONE] Catalog sync complete. {total_new} new entries added.")
    return database


# ─── Phase 2: Episode Pre-Cache ──────────────────────────────────────────────

def get_all_unique_anime(database):
    """Extract all unique anime IDs across all categories."""
    seen = {}
    for key, items in database.items():
        if key in ("last_updated",) or not isinstance(items, list):
            continue
        for anime in items:
            mid = anime.get("mal_id")
            if mid and mid not in seen:
                seen[mid] = anime.get("title", f"ID:{mid}")
    return seen


def sync_episodes(database):
    """Phase 2: Pre-fetch and cache episode lists for all unique anime."""
    print("\n" + "="*60)
    print("  PHASE 2: Episode Cache Sync")
    print("="*60)

    # Load existing cache
    cache = load_json(EPISODES_FILE, {})
    all_anime = get_all_unique_anime(database)

    print(f"  Found {len(all_anime)} unique anime to process")

    fetched = 0
    skipped = 0
    errors = 0

    for mal_id, title in all_anime.items():
        str_id = str(mal_id)

        # Skip if already cached and cache is less than 24h old
        if str_id in cache:
            cached_at = cache[str_id].get("cached_at", "")
            if cached_at:
                try:
                    last = datetime.fromisoformat(cached_at)
                    if datetime.now() - last < timedelta(hours=24):
                        skipped += 1
                        continue
                except ValueError:
                    pass

        # Fetch episodes from Jikan
        url = f"{JIKAN_BASE_URL}/anime/{mal_id}/episodes"
        result = rate_limited_get(url)

        if result and "data" in result:
            episodes = result["data"]
            # Also fetch page 2+ if pagination indicates more
            pagination = result.get("pagination", {})
            page = 2
            while pagination.get("has_next_page", False) and page <= 10:
                next_result = rate_limited_get(url, {"page": page})
                if next_result and "data" in next_result:
                    episodes.extend(next_result["data"])
                    pagination = next_result.get("pagination", {})
                    page += 1
                else:
                    break

            cache[str_id] = {
                "title": title,
                "episodes": episodes,
                "count": len(episodes),
                "cached_at": datetime.now().isoformat()
            }
            fetched += 1

            if fetched % 25 == 0:
                print(f"    [PROGRESS] {fetched} fetched, {skipped} skipped, {errors} errors")
                # Intermediate save every 25 fetches
                save_json(EPISODES_FILE, cache)
        else:
            errors += 1
            # Still cache the error so we don't retry immediately
            cache[str_id] = {
                "title": title,
                "episodes": [],
                "count": 0,
                "cached_at": datetime.now().isoformat(),
                "error": True
            }

    cache["_meta"] = {
        "last_full_sync": datetime.now().isoformat(),
        "total_anime": len(all_anime),
        "total_episodes_cached": sum(
            entry.get("count", 0)
            for key, entry in cache.items()
            if key != "_meta" and isinstance(entry, dict)
        )
    }

    save_json(EPISODES_FILE, cache)

    print(f"\n  [DONE] Episode sync complete:")
    print(f"     Fetched: {fetched} | Skipped (fresh): {skipped} | Errors: {errors}")
    print(f"     Total episodes cached: {cache['_meta']['total_episodes_cached']}")

    return fetched, skipped, errors


# ─── Phase 3: Trailer Sync ───────────────────────────────────────────────────

def sync_trailers(database):
    """Phase 3: Fill in missing trailers for trending anime."""
    print("\n" + "="*60)
    print("  PHASE 3: Trailer Sync")
    print("="*60)

    trending = database.get("trending", [])
    updated = 0

    for anime in trending[:30]:  # Top 30 trending
        if not anime.get("trailer") or not anime["trailer"].get("youtube_id"):
            title = anime.get("title", "Unknown")
            mal_id = anime.get("mal_id")
            print(f"    [FETCH] Fetching trailer for: {title}")

            result = rate_limited_get(f"{JIKAN_BASE_URL}/anime/{mal_id}/full")
            if result and "data" in result:
                trailer = result["data"].get("trailer", {})
                if trailer.get("youtube_id"):
                    anime["trailer"] = {
                        "youtube_id": trailer["youtube_id"],
                        "url": trailer.get("url", ""),
                        "embed_url": trailer.get("embed_url", "")
                    }
                    updated += 1

    if updated > 0:
        save_json(ANIME_FILE, database)

    print(f"  [OK] Synced {updated} new trailers")
    return updated


# ─── Main Cycle ──────────────────────────────────────────────────────────────

def run_full_sync():
    """Execute one complete sync cycle: Catalog → Episodes → Trailers."""
    start_time = time.time()
    cycle_start = datetime.now()
    print("\n" + "="*60)
    print("  ANICloud Daily Sync Engine v2.0")
    print(f"  Started: {cycle_start.strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    ensure_data_dir()

    try:
        # Phase 1: Anime Catalog
        database = sync_anime_catalog()

        # Phase 2: Episode Cache
        ep_fetched, ep_skipped, ep_errors = sync_episodes(database)

        # Phase 3: Trailers
        trailers_synced = sync_trailers(database)

        elapsed = time.time() - start_time
        minutes = elapsed / 60

        # Save log
        log_entry = {
            "timestamp": cycle_start.isoformat(),
            "duration_minutes": round(minutes, 1),
            "categories_synced": len(CATEGORIES),
            "episodes_fetched": ep_fetched,
            "episodes_skipped": ep_skipped,
            "episodes_errors": ep_errors,
            "trailers_synced": trailers_synced,
            "status": "success"
        }
        save_log(log_entry)

        print("\n" + "="*60)
        print("  SYNC CYCLE COMPLETE")
        print(f"  Duration: {minutes:.1f} minutes")
        print(f"  Next run in {CYCLE_INTERVAL_HOURS} hours")
        print("="*60)

    except Exception as e:
        traceback.print_exc()
        elapsed = time.time() - start_time
        save_log({
            "timestamp": cycle_start.isoformat(),
            "duration_minutes": round(elapsed / 60, 1),
            "status": "error",
            "error": str(e)
        })
        print(f"\n  [FAIL] Sync cycle failed: {e}")


def main():
    """Main loop: run sync immediately, then every 24 hours."""
    print("="*60)
    print("  ANICloud Daily Sync Engine")
    print("  Cycle: Every 24 hours")
    print(f"  Data Dir: {DATA_DIR}")
    print("="*60)

    while True:
        run_full_sync()

        next_run = datetime.now() + timedelta(hours=CYCLE_INTERVAL_HOURS)
        print(f"\n  [SLEEP] Sleeping until {next_run.strftime('%Y-%m-%d %H:%M:%S')} ({CYCLE_INTERVAL_HOURS}h)...")
        time.sleep(CYCLE_INTERVAL_HOURS * 3600)


if __name__ == "__main__":
    main()
