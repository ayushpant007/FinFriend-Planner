export const INVESTOR_DETAILS_SESSION_KEY =
  "financial-friend:sif-pms-aif:investor-details";

export type InvestorDetails = {
  name: string;
  dob: string;
  phone: string;
  email: string;
  amount: string;
};

export const EMPTY_INVESTOR_DETAILS: InvestorDetails = {
  name: "",
  dob: "",
  phone: "",
  email: "",
  amount: "",
};

export function normalizeInvestorDetails(value: unknown): InvestorDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_INVESTOR_DETAILS };
  }

  const record = value as Record<string, unknown>;
  return {
    name: typeof record.name === "string" ? record.name : "",
    dob: typeof record.dob === "string" ? record.dob : "",
    phone: typeof record.phone === "string" ? record.phone : "",
    email: typeof record.email === "string" ? record.email : "",
    amount: typeof record.amount === "string" ? record.amount : "",
  };
}