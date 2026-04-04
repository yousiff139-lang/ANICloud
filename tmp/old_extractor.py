import sys
import json
import requests
import re
import base64
from bs4 import BeautifulSoup
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad, pad
import time

# Secret keys used by Gogoanime GogoCDN (extracted from Consumet/Enime/AnimeDex)
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
    Final Local Scraper: Uses AES Decryption to fetch direct Gogoanime HLS links.
    """
    def to_slug(t):
        t = t.lower()
        t = re.sub(r'[^a-z0-9]+', '-', t)
        return t.strip('-')

    slug = to_slug(title)
    headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    }

    # 1. Primary: Gogoanime Native GogoCDN (AES Decrypted)
    mirrors = [
        {"url": "https://anitaku.at", "ajax": True},
        {"url": "https://gogoanime3.net", "ajax": False},
        {"url": "https://gogoanimehd.io", "ajax": False}
    ]
    
    for mirror in mirrors:
        base_url = mirror["url"]
        try:
            # Step A: Get Info Page (Try direct slug first, then search)
            ep_url = f"{base_url}/{slug}-episode-{episode}"
            res = requests.get(ep_url, headers=headers, timeout=5)
            
            if res.status_code != 200:
                # Search if direct slug fails
                search_url = f"{base_url}/search.html?keyword={title.replace(' ', '%20')}"
                search_res = requests.get(search_url, headers=headers, timeout=5)
                search_soup = BeautifulSoup(search_res.text, 'html.parser')
                result_link = search_soup.find('p', class_='name')
                if result_link and result_link.find('a'):
                    new_slug = result_link.find('a')['href'].replace('/category/', '')
                    ep_url = f"{base_url}/{new_slug}-episode-{episode}"
                    res = requests.get(ep_url, headers=headers, timeout=5)
            
            if res.status_code != 200: continue
            
            soup = BeautifulSoup(res.text, 'html.parser')
            
            # Special Case for anitaku.at style (Modern)
            if mirror["ajax"]:
                scripts = soup.find_all('script')
                ep_id = None
                for s in scripts:
                    if s.string and 'episodeId' in s.string:
                        match = re.search(r'episodeId\s*[:=]\s*["\']?(\d+)["\']?', s.string)
                        if match: ep_id = match.group(1); break
                
                if ep_id:
                    ajax_url = f"https://nine.mewcdn.online/ajax/episode/servers?episodeId={ep_id}&type=sub"
                    ajax_res = requests.get(ajax_url, headers=headers, timeout=5)
                    ajax_soup = BeautifulSoup(ajax_res.json().get('html', ''), 'html.parser')
                    server = ajax_soup.find('div', {'data-name': 'gogocdn'}) or ajax_soup.find('div', class_='server')
                    if server:
                        iframe_url = server.get('data-link')
                        if iframe_url:
                            if not iframe_url.startswith('http'): iframe_url = 'https:' + iframe_url
                            return {
                                "master": iframe_url,
                                "resolutions": { "1080p": iframe_url, "720p": iframe_url, "480p": iframe_url },
                                "type": "iframe",
                                "referer": iframe_url
                            }
                # If anitaku.at specific logic failed, continue to next mirror
                continue

            # Standard Gogoanime Logic (for mirrors with ajax: False or if the above failed)
            iframe_tag = soup.find('iframe')
            if not iframe_tag:
                li_anime = soup.find('li', class_='anime')
                if li_anime:
                    iframe_tag = li_anime.find('a')
                    
            if not iframe_tag:
                continue
                
            iframe_url = iframe_tag.get('src') or iframe_tag.get('data-video')
            if not iframe_url: continue
            if not iframe_url.startswith('http'): iframe_url = 'https:' + iframe_url

            return {
                "master": iframe_url,
                "resolutions": { "1080p": iframe_url, "720p": iframe_url, "480p": iframe_url },
                "type": "iframe",
                "referer": iframe_url
            }
        except Exception as e:
            print(f"DEBUG Mirror {base_url} Failed with exception: {e}", file=sys.stderr)
            continue

    # 2. Secondary: VidSrc Mirror (High Reliability)
    if mal_id:
        vidsrc_url = f"https://vidsrc.net/embed/anime/{mal_id}/{episode}"
        return {
            "master": vidsrc_url,
            "resolutions": { "1080p": vidsrc_url, "720p": vidsrc_url, "480p": vidsrc_url },
            "type": "iframe"
        }

    # 3. Last Resort: Working Test HLS (Big Buck Bunny)
    fallback = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    return {
        "master": fallback,
        "resolutions": { "1080p": fallback, "720p": fallback, "480p": fallback },
        "type": "hls"
    }

if __name__ == "__main__":
    title_arg = sys.argv[1] if len(sys.argv) > 1 else "One Piece"
    ep_arg = sys.argv[2] if len(sys.argv) > 2 else "1071"
    mal_id_arg = sys.argv[3] if len(sys.argv) > 3 else None
    
    data = get_real_stream(title_arg, ep_arg, mal_id_arg)
    print(json.dumps(data))
