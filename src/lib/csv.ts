
import Papa from 'papaparse';
import type { AllPlannerData } from './types';

// Helper function to create and download a file
function downloadFile(filename: string, content: string, mimeType: string) {
    const element = document.createElement('a');
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
}

// Flattens a list of items (assets, goals, etc.) for CSV
function flattenList<T extends { id: string }>(items: T[] | undefined | null, prefix: string): Record<string, any>[] {
    if (!items || items.length === 0) return [{}];

    return items.map((item, index) => {
        const flatItem: Record<string, any> = {};
        Object.entries(item).forEach(([key, value]) => {
            if (key !== 'id') {
                const header = `${prefix} ${index + 1} - ${key}`;
                flatItem[header] = typeof value === 'object' ? JSON.stringify(value) : value;
            }
        });
        return flatItem;
    });
}

export function getCsvString(data: AllPlannerData & { netWorth: number, yearlyCashflow: number }): { csv: string, fileName: string } {
    let allCsvRows: Record<string, any>[] = [{}];

    // Combine all single-value fields into one object
    const summaryData: Record<string, any> = {
        'Name': data.personalDetails.name,
        'Date of Birth': data.personalDetails.dob,
        'Dependents': data.personalDetails.dependents,
        'Retirement Age': data.personalDetails.retirementAge,
        'Mobile': data.personalDetails.mobile,
        'Email': data.personalDetails.email,
        'ARN': data.personalDetails.arn,
        'Net Worth': data.netWorth,
        'Yearly Cashflow': data.yearlyCashflow,
        'Will Status': data.willStatus,
        'Retirement - Current Age': data.retirementInputs.currentAge,
        'Retirement - Desired Age': data.retirementInputs.desiredRetirementAge,
        'Retirement - Life Expectancy': data.retirementInputs.lifeExpectancy,
        'Retirement - Monthly Expense': data.retirementInputs.currentMonthlyExpense,
        'Retirement - Pre-Retirement ROI': data.retirementInputs.preRetirementRoi,
        'Retirement - Post-Retirement ROI': data.retirementInputs.postRetirementRoi,
        'Retirement - Incremental Rate': data.retirementInputs.incrementalRate,
        'Retirement - Current Savings': data.retirementInputs.currentSavings,
        'Retirement - Current SIP': data.retirementInputs.currentSip,
        'Asset Allocation - Age': data.assetAllocationProfile.age,
        'Asset Allocation - Risk Appetite': data.assetAllocationProfile.riskAppetite,
    };

    if (data.insuranceAnalysis) {
        summaryData['Insurance - Life Recommended Cover'] = data.insuranceAnalysis.lifeInsurance.recommendedCover;
        summaryData['Insurance - Life Current Cover'] = data.insuranceAnalysis.lifeInsurance.currentCover;
        summaryData['Insurance - Life Coverage Gap'] = data.insuranceAnalysis.lifeInsurance.coverageGap;
        summaryData['Insurance - Health Recommended Cover'] = data.insuranceAnalysis.healthInsurance.recommendedCover;
        summaryData['Insurance - Health Current Cover'] = data.insuranceAnalysis.healthInsurance.currentCover;
        summaryData['Insurance - Health Coverage Gap'] = data.insuranceAnalysis.healthInsurance.coverageGap;
    }

    const lists: Record<string, any[]> = {
        'Asset': data.assets,
        'Liability': data.liabilities,
        'Income': data.incomes,
        'Expense': data.expenses,
        'Goal': data.goals,
        'Fund Allocation': data.fundAllocations,
    };

    let combinedRows: Record<string, any>[] = [];

    // Find the max number of rows needed
    const maxRows = Math.max(...Object.values(lists).map(list => list.length), 1);
    
    for (let i = 0; i < maxRows; i++) {
        let row: Record<string, any> = i === 0 ? { ...summaryData } : {};

        Object.entries(lists).forEach(([prefix, items]) => {
            if (i < items.length) {
                const item = items[i];
                Object.entries(item).forEach(([key, value]) => {
                     if (key !== 'id') {
                        const header = `${prefix} - ${key}`;
                        row[header] = value;
                    }
                });
            }
        });
        combinedRows.push(row);
    }
    
    const csv = Papa.unparse(combinedRows);
    const fileName = data.personalDetails.name ? `${data.personalDetails.name.replace(/\s+/g, '_')}_Financial_Plan.csv` : 'financial_plan.csv';
    return { csv, fileName };
}

export function generateCsv(data: AllPlannerData & { netWorth: number, yearlyCashflow: number }) {
    try {
        const { csv, fileName } = getCsvString(data);
        downloadFile(fileName, csv, 'text/csv;charset=utf-8;');
    } catch(e) {
        console.error("Error generating CSV: ", e);
        alert("Could not generate CSV file.");
    }
}
