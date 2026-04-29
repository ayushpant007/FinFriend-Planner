import { config } from 'dotenv';
config();

import '@/ai/flows/financial-status-summary.ts';
import '@/ai/flows/fetch-funds-flow.ts';
import '@/ai/flows/fund-returns-flow.ts';
import '@/ai/flows/analyze-factsheet-flow.ts';
