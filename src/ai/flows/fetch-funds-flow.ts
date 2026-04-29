'use server';
/**
 * @fileOverview A flow to fetch and process mutual fund data from MFAPI.in.
 * - fetchFunds - Fetches all mutual fund schemes and groups them by fund house.
 */

import { z } from 'zod';
import type { Fund, Scheme } from '@/lib/types';

const MfApiResponseSchema = z.array(
  z.object({
    schemeCode: z.number(),
    schemeName: z.string(),
  })
);

const fundHousesWithKeywords: { name: string; keywords: string[] }[] = [
    { name: "360 ONE Mutual Fund", keywords: ["360 one", "iifl"] },
    { name: "Aditya Birla Sun Life Mutual Fund", keywords: ["aditya birla sun life", "absl", "birla sun life", "ing"] },
    { name: "Angel One Mutual Fund", keywords: ["angel one"] },
    { name: "Axis Mutual Fund", keywords: ["axis"] },
    { name: "Bajaj Finserv Mutual Fund", keywords: ["bajaj finserv"] },
    { name: "Bandhan Mutual Fund", keywords: ["bandhan", "idfc"] },
    { name: "Bank of India Mutual Fund", keywords: ["bank of india", "boi"] },
    { name: "Baroda BNP Paribas Mutual Fund", keywords: ["baroda bnp paribas", "baroda"] },
    { name: "Canara Robeco Mutual Fund", keywords: ["canara robeco"] },
    { name: "DSP Mutual Fund", keywords: ["dsp", "dsp blackrock", "dsp merrill lynch"] },
    { name: "Edelweiss Mutual Fund", keywords: ["edelweiss"] },
    { name: "Franklin Templeton Mutual Fund", keywords: ["franklin templeton", "franklin"] },
    { name: "Groww Mutual Fund", keywords: ["groww"] },
    { name: "HDFC Mutual Fund", keywords: ["hdfc"] },
    { name: "HSBC Mutual Fund", keywords: ["hsbc"] },
    { name: "Helios Mutual Fund", keywords: ["helios"] },
    { name: "ICICI Prudential Mutual Fund", keywords: ["icici prudential", "icici pru"] },
    { name: "IDBI Mutual Fund", keywords: ["idbi"] },
    { name: "Invesco Mutual Fund", keywords: ["invesco"] },
    { name: "ITI Mutual Fund", keywords: ["iti"] },
    { name: "JM Financial Mutual Fund", keywords: ["jm financial"] },
    { name: "Kotak Mahindra Mutual Fund", keywords: ["kotak mahindra", "kotak"] },
    { name: "LIC Mutual Fund", keywords: ["lic"] },
    { name: "Mahindra Manulife Mutual Fund", keywords: ["mahindra manulife"] },
    { name: "Mirae Asset Mutual Fund", keywords: ["mirae asset"] },
    { name: "Motilal Oswal Mutual Fund", keywords: ["motilal oswal"] },
    { name: "NJ Mutual Fund", keywords: ["nj"] },
    { name: "Navi Mutual Fund", keywords: ["navi"] },
    { name: "Nippon India Mutual Fund", keywords: ["nippon india", "reliance"] },
    { name: "Old Bridge Mutual Fund", keywords: ["old bridge"] },
    { name: "PGIM India Mutual Fund", keywords: ["pgim india", "principal"] },
    { name: "PPFAS Mutual Fund", keywords: ["ppfas", "parag parikh"] },
    { name: "Quant Mutual Fund", keywords: ["quant"] },
    { name: "Quantum Mutual Fund", keywords: ["quantum"] },
    { name: "SBI Mutual Fund", keywords: ["sbi", "magnum"] },
    { name: "Samco Mutual Fund", keywords: ["samco"] },
    { name: "Shriram Mutual Fund", keywords: ["shriram"] },
    { name: "Sundaram Mutual Fund", keywords: ["sundaram"] },
    { name: "Tata Mutual Fund", keywords: ["tata"] },
    { name: "Taurus Mutual Fund", keywords: ["taurus"] },
    { name: "Trust Mutual Fund", keywords: ["trust"] },
    { name: "UTI Mutual Fund", keywords: ["uti"] },
    { name: "Union Mutual Fund", keywords: ["union", "union kbc"] },
    { name: "Unifi Mutual Fund", keywords: ["unifi"] },
    { name: "WhiteOak Capital Mutual Fund", keywords: ["whiteoak capital", "yes"] },
    { name: "Zerodha Mutual Fund", keywords: ["zerodha"] },
].sort((a, b) => a.name.localeCompare(b.name));


async function processFundData(data: z.infer<typeof MfApiResponseSchema>): Promise<Fund[]> {
    const fundsMap = new Map<string, Scheme[]>();
    
    fundHousesWithKeywords.forEach(house => fundsMap.set(house.name, []));

    data.forEach(item => {
        const schemeNameLower = item.schemeName.toLowerCase();
        let bestMatch: { houseName: string; matchLength: number } | null = null;

        for (const house of fundHousesWithKeywords) {
            for (const keyword of house.keywords) {
                if (schemeNameLower.includes(keyword)) {
                    if (!bestMatch || keyword.length > bestMatch.matchLength) {
                        bestMatch = { houseName: house.name, matchLength: keyword.length };
                    }
                }
            }
        }

        if (bestMatch) {
            fundsMap.get(bestMatch.houseName)!.push({
                schemeCode: item.schemeCode,
                schemeName: item.schemeName,
            });
        } else {
            if (!fundsMap.has("Other")) {
                fundsMap.set("Other", []);
            }
            fundsMap.get("Other")!.push({
                schemeCode: item.schemeCode,
                schemeName: item.schemeName,
            });
        }
    });

    const fundsArray: Fund[] = [];
    fundsMap.forEach((schemes, fundName) => {
        if (schemes.length > 0) {
            fundsArray.push({ fundName, schemes });
        }
    });

    const otherIndex = fundsArray.findIndex(f => f.fundName === "Other");
    if (otherIndex > -1) {
        const otherFunds = fundsArray.splice(otherIndex, 1);
        fundsArray.push(otherFunds[0]);
    }

    return fundsArray;
}

const FUNDS_CACHE_TTL_MS = 60 * 60 * 1000;
let cachedFunds: { data: Fund[]; expiresAt: number } | null = null;
let inflightFundsRequest: Promise<Fund[]> | null = null;

export async function fetchFunds(): Promise<Fund[]> {
    const now = Date.now();
    if (cachedFunds && cachedFunds.expiresAt > now) {
        return cachedFunds.data;
    }
    if (inflightFundsRequest) {
        return inflightFundsRequest;
    }

    inflightFundsRequest = (async () => {
        try {
            const response = await fetch('https://api.mfapi.in/mf', {
                cache: 'no-store',
            });
            if (!response.ok) {
              throw new Error(`Failed to fetch data from MFAPI: ${response.statusText}`);
            }
            const rawData: unknown = await response.json();

            const parsedData = MfApiResponseSchema.parse(rawData);
            const processedData = await processFundData(parsedData);

            cachedFunds = { data: processedData, expiresAt: Date.now() + FUNDS_CACHE_TTL_MS };
            return processedData;
        } finally {
            inflightFundsRequest = null;
        }
    })();

    return inflightFundsRequest;
}
