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

export async function getInvestorReport(reportId: string) {
  const encodedReportId = encodeURIComponent(reportId);
  const result = await supabaseJson<JsonObject[]>(
    `/rest/v1/investor_reports?select=planner_data,detailed_report,sip_report&report_id=eq.${encodedReportId}&limit=1`,
  );

  if (!result.response.ok) {
    throw new Error(`Failed to load investor report: ${JSON.stringify(result.data)}`);
  }

  const report = result.data?.[0];
  if (!report) return null;

  return {
    plannerData: (report.planner_data as JsonObject | null) ?? null,
    detailedReport: (report.detailed_report as JsonObject | null) ?? null,
    sipReport: (report.sip_report as JsonObject | null) ?? null,
  };
}

export async function listInvestors() {
  const result = await supabaseJson<JsonObject[]>(
    '/rest/v1/investors?select=id,name,email,mobile,converted,updated_at,investor_reports(report_id,generated_at)&order=updated_at.desc',
  );
  if (!result.response.ok) {
    throw new Error(`Failed to load investors: ${JSON.stringify(result.data)}`);
  }
  return (result.data ?? []).map((investor) => {
    const reports = Array.isArray(investor.investor_reports)
      ? (investor.investor_reports as JsonObject[]).sort(
          (a, b) => new Date(String(b.generated_at)).getTime() - new Date(String(a.generated_at)).getTime(),
        )
      : [];
    return {
      id: investor.id,
      name: investor.name,
      email: investor.email,
      mobile: investor.mobile,
      converted: investor.converted === true,
      updatedAt: investor.updated_at,
      latestReportId: reports[0]?.report_id ?? null,
    };
  });
}

export async function updateInvestorConverted(id: string, converted: boolean) {
  const result = await supabaseJson<JsonObject[]>(
    `/rest/v1/investors?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ converted, updated_at: new Date().toISOString() }),
    },
  );
  if (!result.response.ok) {
    throw new Error(`Failed to update client: ${JSON.stringify(result.data)}`);
  }
}

export async function getInvestorPlannerData(investorId: string) {
  const result = await supabaseJson<JsonObject[]>(
    `/rest/v1/investor_reports?select=report_id,planner_data,detailed_report,sip_report,generated_at&investor_id=eq.${encodeURIComponent(investorId)}&order=generated_at.desc&limit=1`,
  );
  if (!result.response.ok) {
    throw new Error(`Failed to load client report: ${JSON.stringify(result.data)}`);
  }
  const report = result.data?.[0];
  if (!report) return null;
  return {
    reportId: report.report_id,
    plannerData: report.planner_data ?? {},
    detailedReport: report.detailed_report ?? null,
    sipReport: report.sip_report ?? null,
  };
}