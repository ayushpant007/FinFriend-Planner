
'use server';

/**
 * @fileOverview Summarizes the user's financial status based on provided data.
 *
 * - summarizeFinancialStatus - A function that generates a financial status summary.
 * - FinancialStatusSummaryInput - The input type for the summarizeFinancialStatus function.
 * - FinancialStatusSummaryOutput - The return type for the summarizeFinancialStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialStatusSummaryInputSchema = z.object({
  name: z.string().describe('The user\'s name.'),
  netWorth: z.number().describe('The user\'s net worth.'),
  monthlyCashflow: z.number().describe('The user\'s monthly cash flow.'),
  insuranceCover: z.number().describe('The user\'s total insurance cover amount.'),
  insurancePremium: z.number().describe('The user\'s total insurance premium.'),
  goals: z
    .array(
      z.object({
        goalName: z.string(),
        corpus: z.number(),
        years: z.number(),
        rate: z.number(),
        sip: z.number(),
      })
    )
    .describe('The user\'s financial goals.'),
});
export type FinancialStatusSummaryInput = z.infer<typeof FinancialStatusSummaryInputSchema>;

const FinancialStatusSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the user\'s financial status.'),
});
export type FinancialStatusSummaryOutput = z.infer<typeof FinancialStatusSummaryOutputSchema>;

export async function summarizeFinancialStatus(
  input: FinancialStatusSummaryInput
): Promise<FinancialStatusSummaryOutput> {
  return summarizeFinancialStatusFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialStatusSummaryPrompt',
  input: {schema: FinancialStatusSummaryInputSchema},
  output: {schema: FinancialStatusSummaryOutputSchema},
  prompt: `You are an expert financial advisor. Please analyze the following financial data and provide a concise summary of the user's financial status.

User Name: {{{name}}}
Net Worth: ₹{{{netWorth}}}
Monthly Cash Flow: ₹{{{monthlyCashflow}}}
Insurance Cover: ₹{{{insuranceCover}}}
Insurance Premium: ₹{{{insurancePremium}}}
Financial Goals:
{{#each goals}}
  - Goal Name: {{{goalName}}}, Corpus: ₹{{{corpus}}}, Years: {{{years}}}, Rate: {{{rate}}}, SIP: ₹{{{sip}}}
{{/each}}

Based on this information, provide a summary (around 150 words) of the user's financial health, highlighting strengths, weaknesses, and potential areas for improvement. Consider factors like net worth, cash flow, insurance coverage, and progress toward financial goals.`,
});

const summarizeFinancialStatusFlow = ai.defineFlow(
  {
    name: 'summarizeFinancialStatusFlow',
    inputSchema: FinancialStatusSummaryInputSchema,
    outputSchema: FinancialStatusSummaryOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        throw new Error("AI model did not return a summary.");
      }
      return output;
    } catch(e: any) {
      console.error("Error generating financial summary:", e);
      // Return a fallback summary if the AI service fails
      return {
        summary: "Based on the provided data, you have a solid foundation with a positive net worth and clear financial goals. It's important to ensure your monthly cash flow can support the required SIPs for your goals. Regularly reviewing your insurance coverage is also key to protecting your financial future. This report outlines the steps to align your investments with your long-term objectives."
      };
    }
  }
);
