const GEMINI_API_KEYS = [
  process.env.GOOGLE_GENAI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter((key): key is string => !!key && key.trim() !== '');

let currentKeyIndex = 0;
const rateLimitedKeys = new Set<number>();
const rateLimitResetTime: Record<number, number> = {};

const RATE_LIMIT_COOLDOWN_MS = 60000;

export function getCurrentApiKey(): string {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }
  
  const now = Date.now();
  for (const [keyIndexStr, resetTime] of Object.entries(rateLimitResetTime)) {
    const keyIndex = parseInt(keyIndexStr);
    if (now >= resetTime) {
      rateLimitedKeys.delete(keyIndex);
      delete rateLimitResetTime[keyIndex];
    }
  }

  const availableKeys = GEMINI_API_KEYS.map((_, index) => index)
    .filter(index => !rateLimitedKeys.has(index));

  if (availableKeys.length === 0) {
    console.log('[GeminiKeyManager] All keys are rate limited, using first available key anyway');
    currentKeyIndex = 0;
    rateLimitedKeys.clear();
  } else {
    if (!availableKeys.includes(currentKeyIndex)) {
      currentKeyIndex = availableKeys[0];
    }
  }

  return GEMINI_API_KEYS[currentKeyIndex];
}

export function rotateToNextKey(): string {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  rateLimitedKeys.add(currentKeyIndex);
  rateLimitResetTime[currentKeyIndex] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  console.log(`[GeminiKeyManager] Marked key ${currentKeyIndex + 1} as rate limited`);

  const availableKeys = GEMINI_API_KEYS.map((_, index) => index)
    .filter(index => !rateLimitedKeys.has(index));

  if (availableKeys.length === 0) {
    console.log('[GeminiKeyManager] All keys exhausted, resetting and using key 1');
    rateLimitedKeys.clear();
    currentKeyIndex = 0;
  } else {
    currentKeyIndex = availableKeys[0];
    console.log(`[GeminiKeyManager] Rotated to key ${currentKeyIndex + 1}`);
  }

  return GEMINI_API_KEYS[currentKeyIndex];
}

export function getKeyCount(): number {
  return GEMINI_API_KEYS.length;
}

export function getCurrentKeyIndex(): number {
  return currentKeyIndex + 1;
}

export function getKeyStatus(): { total: number; available: number; rateLimited: number[] } {
  const now = Date.now();
  for (const [keyIndexStr, resetTime] of Object.entries(rateLimitResetTime)) {
    const keyIndex = parseInt(keyIndexStr);
    if (now >= resetTime) {
      rateLimitedKeys.delete(keyIndex);
      delete rateLimitResetTime[keyIndex];
    }
  }

  return {
    total: GEMINI_API_KEYS.length,
    available: GEMINI_API_KEYS.length - rateLimitedKeys.size,
    rateLimited: Array.from(rateLimitedKeys).map(i => i + 1),
  };
}
