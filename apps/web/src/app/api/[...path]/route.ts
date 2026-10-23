import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${API_URL}/api${targetPath}${search}`;

  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  }

  // Forward cookie header
  const cookie = req.headers.get('cookie');
  if (cookie) {
    headers.set('cookie', cookie);
  }

  const method = req.method;
  let body: BodyInit | null = null;
  if (!['GET', 'HEAD'].includes(method)) {
    body = await req.arrayBuffer();
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      // @ts-expect-error duplex required for streaming in Node fetch
      duplex: 'half',
      cache: 'no-store',
    });

    const outHeaders = new Headers();
    for (const [key, value] of upstreamRes.headers.entries()) {
      outHeaders.set(key, value);
    }

    outHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    outHeaders.set('X-Accel-Buffering', 'no');

    // Forward Set-Cookie headers
    const headersWithCookies = upstreamRes.headers as unknown as { getSetCookie?: () => string[] };
    const cookieList = typeof headersWithCookies.getSetCookie === 'function' ? headersWithCookies.getSetCookie() : null;
    if (cookieList && cookieList.length > 0) {
      for (const c of cookieList) {
        outHeaders.append('set-cookie', c);
      }
    } else {
      const setCookie = upstreamRes.headers.get('set-cookie');
      if (setCookie) {
        outHeaders.set('set-cookie', setCookie);
      }
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: outHeaders,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: `Proxy connection failed to ${API_URL}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      },
      { status: 502 },
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
