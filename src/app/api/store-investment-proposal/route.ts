import { NextRequest, NextResponse } from "next/server";
import { saveInvestorAndReport } from "@/lib/investor-storage";

const CATEGORIES = ["SIF", "PMS", "AIF"] as const;
type ProposalCategory = (typeof CATEGORIES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProposalCategory(value: unknown): value is ProposalCategory {
  return typeof value === "string" && CATEGORIES.includes(value as ProposalCategory);
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Proposal details are required." }, { status: 400 });
    }

    const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
    const submittedDetails = body.investorDetails;
    const rawSelections = body.selections;
    if (!reportId || reportId.length > 180 || !isRecord(submittedDetails)) {
      return NextResponse.json({ error: "A report ID and investor details are required." }, { status: 400 });
    }

    const name = typeof submittedDetails.name === "string" ? submittedDetails.name.trim() : "";
    const email = typeof submittedDetails.email === "string" ? submittedDetails.email.trim().toLowerCase() : "";
    if (!name || !email) {
      return NextResponse.json({ error: "Investor name and email are required to save a proposal." }, { status: 400 });
    }

    if (!Array.isArray(rawSelections) || rawSelections.length === 0 || rawSelections.length > 20) {
      return NextResponse.json({ error: "Choose between 1 and 20 investment products." }, { status: 400 });
    }

    const selections = rawSelections.map((item) => {
      if (!isRecord(item) || !isProposalCategory(item.category) || typeof item.product !== "string" || !item.product.trim()) {
        return null;
      }
      return { category: item.category, product: item.product.trim() };
    });
    if (selections.some((selection) => selection === null)) {
      return NextResponse.json({ error: "One or more investment selections are invalid." }, { status: 400 });
    }

    const validSelections = selections.filter(
      (selection): selection is { category: ProposalCategory; product: string } => selection !== null,
    );
    const categories = CATEGORIES.filter((category) =>
      validSelections.some((selection) => selection.category === category),
    );
    const reportType = categories.map((category) => category.toLowerCase()).join("+");
    const investorDetails = {
      name,
      dob: typeof submittedDetails.dob === "string" ? submittedDetails.dob : "",
      phone: typeof submittedDetails.phone === "string" ? submittedDetails.phone.trim() : "",
      email,
      amount: typeof submittedDetails.amount === "string" ? submittedDetails.amount.trim() : "",
    };
    const savedProposal = {
      kind: "sif-pms-aif",
      investorDetails,
      selections: validSelections,
    };

    const saved = await saveInvestorAndReport({
      reportId,
      reportType,
      personalDetails: {
        name,
        email,
        dob: investorDetails.dob,
        mobile: investorDetails.phone || null,
      },
      plannerData: { savedProposal },
      detailedReport: { savedProposal },
      sipReport: null,
    });

    return NextResponse.json({ success: true, ...saved });
  } catch (error) {
    console.error("Investment proposal save failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save the proposal." },
      { status: 500 },
    );
  }
}
