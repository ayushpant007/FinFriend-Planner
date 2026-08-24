import 'server-only';

import { supabaseJson } from './supabase-connector';

type JsonObject = Record<string, unknown>;

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asInteger(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

export async function saveInvestorAndReport(input: {
  reportId: string;
  personalDetails: JsonObject;
  plannerData: JsonObject;
  detailedReport?: JsonObject | null;
  sipReport?: JsonObject | null;
}) {
  const email = asText(input.personalDetails.email)?.toLowerCase();
  const name = asText(input.personalDetails.name);
  if (!email || !name) {
    throw new Error('Investor name and email are required before saving.');
  }

  const investor = {
    name,
    email,
    dob: asText(input.personalDetails.dob),
    mobile: asText(input.personalDetails.mobile),
    dependents: asInteger(input.personalDetails.dependents),
    retirement_age: asInteger(input.personalDetails.retirementAge),
    arn: asText(input.personalDetails.arn),
    updated_at: new Date().toISOString(),
  };

  const investorResult = await supabaseJson<JsonObject[]>(
    '/rest/v1/investors?on_conflict=email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(investor),
    },
  );

  if (!investorResult.response.ok || !investorResult.data?.[0]?.id) {
    throw new Error(
      `Failed to save investor: ${JSON.stringify(investorResult.data)}`,
    );
  }

  const investorId = investorResult.data[0].id;
  const reportResult = await supabaseJson<JsonObject[]>(
    '/rest/v1/investor_reports?on_conflict=report_id',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        investor_id: investorId,
        report_id: input.reportId,
        report_type: 'financial',
        planner_data: input.plannerData,
        detailed_report: input.detailedReport ?? null,
        sip_report: input.sipReport ?? null,
        generated_at: new Date().toISOString(),
      }),
    },
  );

  if (!reportResult.response.ok) {
    throw new Error(
      `Failed to save investor report: ${JSON.stringify(reportResult.data)}`,
    );
  }

  return { investorId, reportId: input.reportId };
}

export async function saveInvestorProfile(input: {
  personalDetails: JsonObject;
  plannerData: JsonObject;
}) {
  const email = asText(input.personalDetails.email)?.toLowerCase();
  const name = asText(input.personalDetails.name);
  if (!email || !name) {
    throw new Error('Investor name and email are required before saving.');
  }

  const investorResult = await supabaseJson<JsonObject[]>(
    '/rest/v1/investors?on_conflict=email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        name,
        email,
        dob: asText(input.personalDetails.dob),
        mobile: asText(input.personalDetails.mobile),
        dependents: asInteger(input.personalDetails.dependents),
        retirement_age: asInteger(input.personalDetails.retirementAge),
        arn: asText(input.personalDetails.arn),
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (!investorResult.response.ok || !investorResult.data?.[0]?.id) {
    throw new Error(
      `Failed to save investor: ${JSON.stringify(investorResult.data)}`,
    );
  }

  return { investorId: investorResult.data[0].id };
}