import sys
import json
import requests
import re
import base64
from bs4 import BeautifulSoup
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad, pad

# Secret keys for Gogoanime/GogoCDN (Extracted from modern implementations)
GOGO_KEY = b'37911490979715163134003223491201'
GOGO_IV = b'3134003223491201'

def aes_decrypt(data, key, iv):
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(base64.b64decode(data)), AES.block_size).decode('utf-8')

def aes_encrypt(data, key, iv):
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return base64.b64encode(cipher.encrypt(pad(data.encode('utf-8'), AES.block_size))).decode('utf-8')

def get_real_stream(title, episode, mal_id=None):
    """
    Restores the "Purple Player" by extracting direct HLS links using AES decryption.
    """
    def to_slug(t):
        t = t.lower()
        t = re.sub(r'[^a-z0-9]+', '-', t)
        return t.strip('-')

    slug = to_slug(title)
    headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    mirrors = [
        "https://anitaku.to",
        "https://gogoanime3.co",
        "https://gogoanimehd.io"
    ]
    
    for base_url in mirrors:
        try:
            # 1. Get episode page
            ep_url = f"{base_url}/{slug}-episode-{episode}"
            res = requests.get(ep_url, headers=headers, timeout=8)
            
            if res.status_code != 200:
                # Try search if direct slug fails
                search_url = f"{base_url}/search.html?keyword={title.replace(' ', '%20')}"
                search_res = requests.get(search_url, headers=headers, timeout=8)
                search_soup = BeautifulSoup(search_res.text, 'html.parser')
                result_link = search_soup.find('p', class_='name')
                if result_link and result_link.find('a'):
                    new_slug = result_link.find('a')['href'].replace('/category/', '')
                    ep_url = f"{base_url}/{new_slug}-episode-{episode}"
                    res = requests.get(ep_url, headers=headers, timeout=8)
            
            if res.status_code != 200: continue
            
            soup = BeautifulSoup(res.text, 'html.parser')
            iframe = soup.find('iframe')
            if not iframe: continue
            
            iframe_url = iframe.get('src') or iframe.get('data-video')
            if not iframe_url: continue
            if not iframe_url.startswith('http'): iframe_url = 'https:' + iframe_url
            
            # 2. Extract ID for AES
            v_id = re.search(r'id=([^&]+)', iframe_url)
            if not v_id: continue
            v_id = v_id.group(1)
            
            # 3. Decrypt the GogoCDN stream (Pure Extraction)
            # The referer must be the iframe URL itself for the AJAX to work
            ajax_headers = { **headers, 'Referer': iframe_url, 'X-Requested-With': 'XMLHttpRequest' }
            
            # Encrypt the ID as Gogo expects
            encrypted_id = aes_encrypt(v_id, GOGO_KEY, GOGO_IV)
            
            # Fetch the stream sources via AJAX
            ajax_base = iframe_url.split('/embed')[0]
            ajax_url = f"{ajax_base}/encrypt-ajax.php?id={encrypted_id}&alias={v_id}"
            
            ajax_res = requests.get(ajax_url, headers=ajax_headers, timeout=8)
            data = ajax_res.json()
            
            # Decrypt response
            if 'data' in data:
                decrypted = aes_decrypt(data['data'], GOGO_KEY, GOGO_IV)
                source_data = json.loads(decrypted)
                
                # We want the .m3u8 link (the "Smooth" one)
                master_hls = None
                for s in source_data.get('source', []):
                    if s.get('file', '').endswith('.m3u8'):
                        master_hls = s['file']
                        break
                
                if master_hls:
                    return {
                        "master": master_hls,
                        "resolutions": { "1080p": master_hls },
                        "type": "hls", # This triggers our PURPLE player
                        "referer": iframe_url 
                    }
                    
            # Fallback to direct iframe if HLS decryption fails (still better than nothing)
            return {
                "master": iframe_url,
                "resolutions": { "1080p": iframe_url },
                "type": "iframe",
                "referer": iframe_url
            }

        except Exception:
            continue

    # Secondary: VidSrc Mirror as reliable last resort
    if mal_id:
        vidsrc = f"https://vidsrc.net/embed/anime/{mal_id}/{episode}"
        return { "master": vidsrc, "type": "iframe" }

    # Absolute fallback
    fallback = "https://www.2embed.cc/embed/anime/" + (str(mal_id) if mal_id else "1")
    return { "master": fallback, "type": "iframe" }

if __name__ == "__main__":
    title_arg = sys.argv[1] if len(sys.argv) > 1 else "One Piece"
    ep_arg = sys.argv[2] if len(sys.argv) > 2 else "1071"
    mal_id_arg = sys.argv[3] if len(sys.argv) > 3 else None
    
    data = get_real_stream(title_arg, ep_arg, mal_id_arg)
    print(json.dumps(data))
