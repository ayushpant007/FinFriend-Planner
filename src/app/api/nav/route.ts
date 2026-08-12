import { NextResponse } from 'next/server';

function normaliseSchemeName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\babsl\b/g, 'aditya birla sun life')
    .replace(/\bicici\s+pru\b/g, 'icici prudential')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(fund|scheme|plan|regular|direct|growth|idcw|dividend|reinvestment|payout|option|ret|dir|reg|formerly|known|as|mutual)\b/g,
      '',
    )
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function hasPlanMismatch(selectedName: string, selectedPlan: string, returnedName: string): boolean {
  const selected = `${selectedName} ${selectedPlan}`.toLowerCase();
  const returned = returnedName.toLowerCase();
  const selectedIsDirect = /\b(direct|dir)\b/.test(selected);
  const selectedIsRegular = /\b(regular|reg|ret)\b/.test(selected);
  const returnedIsDirect = /\b(direct|dir)\b/.test(returned);

  if (selectedIsDirect !== returnedIsDirect) return true;
  if (selectedIsRegular && returnedIsDirect) return true;
  if (!/\binstitutional\b/.test(selected) && /\binstitutional\b/.test(returned)) return true;
  if (!/\b(idcw|dividend|payout|reinvestment)\b/.test(selected) &&
      /\b(idcw|dividend|payout|reinvestment)\b/.test(returned)) return true;
  return false;
}

function isSameScheme(selectedName: string, selectedPlan: string, returnedName: string): boolean {
  if (hasPlanMismatch(selectedName, selectedPlan, returnedName)) return false;
  const expected = new Set(normaliseSchemeName(selectedName));
  const actual = new Set(normaliseSchemeName(returnedName));
  if (expected.size === 0 || actual.size === 0) return false;
  const overlap = [...expected].filter(word => actual.has(word)).length;
  return overlap / expected.size >= 0.6;
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
  const plan = searchParams.get('plan') || '';

  if (!schemeCode) {
    return NextResponse.json({ error: 'schemeCode is required' }, { status: 400 });
  }

  // The selected scheme row is the source of truth. Do not replace its code
  // using a fuzzy name search: similarly named funds and plan variants can
  // otherwise return another fund's NAV.
  const data = await fetchFromMFAPI(schemeCode);

  if (data && schemeName) {
    const returnedName =
      (data as Record<string, unknown> & { meta?: { scheme_name?: string } }).meta?.scheme_name || '';
    if (returnedName && !isSameScheme(schemeName, plan, returnedName)) {
      console.warn(
        `[NAV] Row "${schemeName}" used scheme code ${schemeCode}; provider returned "${returnedName}". ` +
        'Rejecting the response because the row code does not identify the selected scheme.',
      );
      return NextResponse.json(
        { error: `Scheme code ${schemeCode} does not match selected scheme "${schemeName}"` },
        { status: 409 },
      );
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
