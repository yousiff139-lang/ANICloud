import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  const referer = searchParams.get('referer');

  if (!targetUrl) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  try {
    // Build minimal headers — complex Sec-Fetch headers can trigger CDN anti-bot
    // if the TLS fingerprint (Node.js) doesn't match the claimed browser.
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };

    if (referer) {
      headers['Referer'] = referer;
      try {
        const refererUrl = new URL(referer);
        headers['Origin'] = refererUrl.origin;
      } catch (e) {}
    }

    // Forward the Range header to allow HTML5 video seeking
    const range = req.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(targetUrl, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 206) {
      console.error(`Proxy: ${response.status} for ${targetUrl.substring(0, 80)}...`);
      return new NextResponse(`Remote server error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Handle M3U8 playlists — rewrite all URLs to go through our proxy
    const isM3U8 = contentType.includes('mpegurl') ||
                   contentType.includes('m3u8') ||
                   targetUrl.includes('.m3u8');

    if (isM3U8) {
      const bodyBuffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(bodyBuffer);
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();

        // Rewrite URI="..." in EXT-X-KEY and EXT-X-MAP tags
        if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
            let absoluteUri = uri;
            if (!absoluteUri.startsWith('http')) {
              absoluteUri = new URL(absoluteUri, baseUrl).toString();
            }
            return `URI="/api/proxy?url=${encodeURIComponent(absoluteUri)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}"`;
          });
        }

        // Skip other comment lines and empty lines
        if (trimmed.startsWith('#') || trimmed === '') {
          return line;
        }

        // Rewrite segment/playlist URLs
        let absoluteUrl = trimmed;
        if (!absoluteUrl.startsWith('http')) {
          absoluteUrl = new URL(absoluteUrl, baseUrl).toString();
        }

        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
      });

      return new NextResponse(rewrittenLines.join('\n'), {
        status: response.status,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    // For .mp4 chunks, .ts segments, and binary data — STREAM directly!
    // We must pass the streaming headers back to the browser so the <video> tag knows it can seek.
    const resHeaders = new Headers();
    resHeaders.set('Content-Type', contentType || 'application/octet-stream');
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Headers', '*');
    
    if (response.headers.has('Content-Length')) resHeaders.set('Content-Length', response.headers.get('Content-Length')!);
    if (response.headers.has('Accept-Ranges')) resHeaders.set('Accept-Ranges', response.headers.get('Accept-Ranges')!);
    if (response.headers.has('Content-Range')) resHeaders.set('Content-Range', response.headers.get('Content-Range')!);
    if (response.headers.has('Cache-Control')) resHeaders.set('Cache-Control', response.headers.get('Cache-Control')!);

    // Next.js handles proxying the ReadableStream intrinsically. No memory leaks!
    return new NextResponse(response.body, {
      status: response.status, // Crucial for 206 Partial Content
      headers: resHeaders
    });

  } catch (error: any) {
    console.error(`Proxy error for ${targetUrl?.substring(0, 80)}: ${error.message}`);
    return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
  }
}

