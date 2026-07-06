import { NextResponse } from 'next/server';

/** Normalise a scheme name for fuzzy comparison */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(fund|scheme|plan|regular|direct|growth|idcw|dividend|reinvestment|payout|option|ret|dir|reg|formerly|known|as)\b/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Return how many words from `needle` appear in `haystack` */
function wordOverlap(needle: string, haystack: string): number {
  const needleWords = normaliseName(needle).split(' ').filter(Boolean);
  const haystackNorm = normaliseName(haystack);
  return needleWords.filter(w => w.length > 2 && haystackNorm.includes(w)).length;
}

/** Determine plan type from a scheme name: 'direct', 'regular', or 'unknown' */
function planType(name: string): 'direct' | 'regular' | 'unknown' {
  const lower = name.toLowerCase();
  if (/\b(direct|dir)\b/.test(lower)) return 'direct';
  if (/\b(regular|reg|ret)\b/.test(lower)) return 'regular';
  return 'unknown';
}

/** Search mfapi.in for the best-matching scheme code for a given name.
 *  Prefers Growth plans and respects direct/regular distinction. */
async function searchCorrectSchemeCode(schemeName: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(schemeName.split(' ').slice(0, 4).join(' '));
    const res = await fetch(`https://api.mfapi.in/mf/search?q=${query}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const results: { schemeCode: string; schemeName: string }[] = await res.json();
    if (!results || results.length === 0) return null;

    const expectedPlan = planType(schemeName);

    let best: { schemeCode: string; score: number } | null = null;
    for (const r of results) {
      const lower = r.schemeName.toLowerCase();
      // Exclude IDCW / dividend plans — we always want Growth
      if (/\b(idcw|dividend|quarterly|monthly|weekly|annual|bonus)\b/.test(lower)) continue;

      let score = wordOverlap(schemeName, r.schemeName);

      // Boost for matching plan type (direct vs regular)
      const rPlan = planType(r.schemeName);
      if (expectedPlan !== 'unknown' && rPlan === expectedPlan) score += 0.5;

      // Boost for explicit "growth" in name
      if (/\bgrowth\b/.test(lower)) score += 0.3;

      if (!best || score > best.score) {
        best = { schemeCode: r.schemeCode, score };
      }
    }
    return best && best.score > 0 ? best.schemeCode : null;
  } catch {
    return null;
  }
}

/** Fetch NAV from mfapi.in for a given schemeCode, return parsed data or null */
async function fetchFromMFAPI(schemeCode: string): Promise<Record<string, unknown> | null> {
  const endpoints = [
    `https://api.mfapi.in/mf/${schemeCode}/latest`,
    `https://api.mfapi.in/mf/${schemeCode}`,
  ];
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) {
        console.warn(`[NAV] ${url} returned ${response.status}`);
        continue;
      }
      const data = await response.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn(`[NAV] fetch error for ${url}:`, err);
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schemeCode = searchParams.get('schemeCode');
  const schemeName = searchParams.get('schemeName') || '';

  if (!schemeCode) {
    return NextResponse.json({ error: 'schemeCode is required' }, { status: 400 });
  }

  // Step 1: Fetch with the CSV-provided scheme code
  let data = await fetchFromMFAPI(schemeCode);

  // Step 2: If we have a scheme name, validate the returned fund name matches.
  //         If it doesn't (i.e. the CSV had a wrong/shared scheme code for a
  //         completely different fund), search mfapi.in for the correct code.
  //         We do NOT switch codes just because the data is old — stale data
  //         from mfapi.in for the correct fund is still the correct fund's data.
  if (data && schemeName) {
    const returnedName: string =
      (data as Record<string, unknown> & { meta?: { scheme_name?: string } }).meta
        ?.scheme_name || '';
    const overlap = wordOverlap(schemeName, returnedName);
    const needleWords = normaliseName(schemeName).split(' ').filter(w => w.length > 2);
    const matchRatio = needleWords.length > 0 ? overlap / needleWords.length : 1;

    if (matchRatio < 0.4) {
      console.warn(
        `[NAV] Scheme code ${schemeCode} returned "${returnedName}" but expected "${schemeName}" ` +
        `(overlap ${overlap}/${needleWords.length}). Searching for correct code…`,
      );
      const correctCode = await searchCorrectSchemeCode(schemeName);
      if (correctCode && correctCode !== schemeCode) {
        console.log(`[NAV] Found corrected scheme code: ${correctCode} for "${schemeName}"`);
        const correctedData = await fetchFromMFAPI(correctCode);
        if (correctedData) {
          const correctedName: string =
            (correctedData as Record<string, unknown> & { meta?: { scheme_name?: string } }).meta
              ?.scheme_name || '';
          const correctedOverlap = wordOverlap(schemeName, correctedName);
          const correctedRatio = needleWords.length > 0 ? correctedOverlap / needleWords.length : 0;
          if (correctedRatio >= 0.3) {
            data = correctedData;
          } else {
            console.warn(
              `[NAV] Corrected code ${correctCode} returned "${correctedName}" — ` +
              `still doesn't match "${schemeName}" (ratio ${correctedRatio.toFixed(2)}). Keeping original.`,
            );
          }
        }
      }
    }
  }

  if (!data && schemeName) {
    // fetchFromMFAPI returned nothing — try searching by name as last resort
    console.warn(`[NAV] No data for scheme code ${schemeCode}. Trying name search for "${schemeName}"…`);
    const correctCode = await searchCorrectSchemeCode(schemeName);
    if (correctCode) {
      data = await fetchFromMFAPI(correctCode);
    }
  }

  if (data) {
    return NextResponse.json(data);
  }

  return NextResponse.json(
    { error: `NAV not available for scheme ${schemeCode}` },
    { status: 404 },
  );
}
