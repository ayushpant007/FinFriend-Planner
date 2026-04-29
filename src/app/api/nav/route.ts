import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schemeCode = searchParams.get('schemeCode');

  if (!schemeCode) {
    return NextResponse.json({ error: 'schemeCode is required' }, { status: 400 });
  }

  // Try /latest endpoint first, fall back to full history (first entry)
  const endpoints = [
    `https://api.mfapi.in/mf/${schemeCode}/latest`,
    `https://api.mfapi.in/mf/${schemeCode}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        // No caching — always fetch fresh so stale failures don't persist
        cache: 'no-store',
      });

      if (!response.ok) {
        console.warn(`[NAV] ${url} returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      // Validate we actually got NAV data
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn(`[NAV] fetch error for ${url}:`, err);
    }
  }

  // Nothing worked — return 404 so client shows "Not Available" gracefully
  return NextResponse.json(
    { error: `NAV not available for scheme ${schemeCode}` },
    { status: 404 }
  );
}
