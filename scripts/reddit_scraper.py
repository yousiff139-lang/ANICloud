import requests
import time
import json
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
SUBREDDITS = ['anime', 'Animemes', 'animenews']
FETCH_LIMIT = 5 # Number of posts to fetch per subreddit each cycle
SLEEP_INTERVAL = 600 # 10 minutes (600 seconds)

WEBHOOK_URL = 'http://localhost:3000/api/webhooks/reddit'
# Secret MUST match the one in src/app/api/webhooks/reddit/route.ts
API_SECRET = 'anicloud-secret-bot-key-2026'

headers = {
    # Reddit blocks standard Python user agents, so we need a custom one.
    'User-Agent': 'windows:anicloud-community-sync:v1.0.0 (by /u/anicloud_dev)'
}

def clean_reddit_image(post):
    """Attempt to extract an image URL from a Reddit post object safely."""
    url = post.get('url', '')
    if url.endswith(('.jpg', '.jpeg', '.png', '.gif')):
        return url
    # Check for gallery or preview images
    if 'preview' in post and 'images' in post['preview']:
        try:
            # Get the unescaped URL of the highest resolution preview
            src = post['preview']['images'][0]['source']['url']
            return src.replace('&amp;', '&')
        except Exception:
            pass
    return None

def fetch_and_sync():
    all_extracted_posts = []

    for sub in SUBREDDITS:
        logging.info(f"Fetching hot posts from r/{sub}...")
        try:
            url = f"https://www.reddit.com/r/{sub}/hot.json?limit={FETCH_LIMIT}"
            resp = requests.get(url, headers=headers, timeout=10)
            
            if resp.status_code != 200:
                logging.error(f"Failed to fetch r/{sub}: HTTP {resp.status_code}")
                continue
                
            data = resp.json()
            posts = data.get('data', {}).get('children', [])
            
            for child in posts:
                post = child.get('data', {})
                
                # Filter out sticky/pinned mod posts completely to keep it organic
                if post.get('stickied', False):
                    continue
                
                extracted = {
                    'title': post.get('title', ''),
                    'content': post.get('selftext', '')[:1000], # Trucate massive text walls
                    'author': post.get('author', 'Anonymous'),
                    'subreddit': sub,
                    'isSpoiler': post.get('spoiler', False),
                    'image': clean_reddit_image(post)
                }
                
                all_extracted_posts.append(extracted)
                
            time.sleep(1) # Be polite to Reddit APIs between subreddits
                
        except Exception as e:
            logging.error(f"Exception while scraping r/{sub}: {str(e)}")

    if not all_extracted_posts:
        logging.warning("No posts extracted this cycle.")
        return

    logging.info(f"Successfully scraped {len(all_extracted_posts)} organic posts. Syncing to ANICloud...")

    try:
        # POST to the ANICloud Next.js Webhook
        sync_resp = requests.post(
            WEBHOOK_URL,
            headers={"Authorization": f"Bearer {API_SECRET}", "Content-Type": "application/json"},
            json={"posts": all_extracted_posts},
            timeout=15
        )
        
        if sync_resp.status_code == 200:
            result = sync_resp.json()
            logging.info(f"Sync Success! Inserted {result.get('inserted')} new posts into the global timeline.")
        else:
            logging.error(f"Sync Failed: HTTP {sync_resp.status_code} - {sync_resp.text}")
    except Exception as e:
        logging.error(f"Failed to connect to local Next.js server at {WEBHOOK_URL}: {str(e)}")

def main():
    logging.info("Starting ANICloud Reddit Organic Scraper Bot...")
    while True:
        fetch_and_sync()
        logging.info(f"Sleeping for {SLEEP_INTERVAL} seconds before next refresh cycle...")
        try:
            time.sleep(SLEEP_INTERVAL)
        except KeyboardInterrupt:
            logging.info("Scraper manually stopped by user.")
            break

if __name__ == '__main__':
    main()
