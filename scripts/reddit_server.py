from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import time

app = Flask(__name__)
CORS(app)

HEADERS = {
    'User-Agent': 'windows:anicloud-n8n-automation:v1.0.0 (by /u/anicloud_dev)'
}

def clean_reddit_image(post):
    url = post.get('url', '')
    if url.endswith(('.jpg', '.jpeg', '.png', '.gif')):
        return url
    if 'preview' in post and 'images' in post['preview']:
        try:
            src = post['preview']['images'][0]['source']['url']
            return src.replace('&amp;', '&')
        except Exception:
            pass
    return None

@app.route('/api/feed', methods=['GET'])
def get_feed():
    # Retrieve cursor from Next.js (which comes from frontend scroll)
    cursor = request.args.get('cursor', '')
    
    url = "https://www.reddit.com/r/anime+Animemes/hot.json?limit=10"
    if cursor and cursor.startswith('t3_'):
        url += f"&after={cursor}"
        
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return jsonify({'error': f'Reddit returned {resp.status_code}'}), 500
            
        data = resp.json()
        children = data.get('data', {}).get('children', [])
        
        formatted_posts = []
        for child in children:
            post = child.get('data', {})
            
            if post.get('stickied', False):
                continue
                
            author = post.get('author', 'Anonymous')
            
            # Formulate the Next.js expected schema perfectly
            formatted_posts.append({
                "id": post.get('name'), # This 'name' (e.g. t3_pxvz2) becomes the next cursor for infinite scroll!
                "content": f"**{post.get('title', '')}**\n\n{post.get('selftext', '')[:500]}",
                "image": clean_reddit_image(post),
                "isSpoiler": post.get('spoiler', False),
                "createdAt": time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime(post.get('created_utc', time.time()))),
                "user": {
                    "id": author,
                    "name": author,
                    "profile": {
                        "avatar": f"https://api.dicebear.com/7.x/notionists/svg?seed={author}&backgroundColor=b6e3f4,c0aede,d1d4f9"
                    }
                },
                "_count": {
                    "comments": post.get('num_comments', 0),
                    "likes": post.get('ups', 0)
                }
            })
            
        return jsonify(formatted_posts)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run the microservice on port 5000
    app.run(host='127.0.0.1', port=5000)
