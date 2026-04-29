/**
 * Financial Plans Service Layer
 * CRUD operations for managing user financial plans
 * Adapted from blueprint:javascript_database integration
 */

import { db } from './db';
import { financialPlans, type FinancialPlan, type InsertFinancialPlan } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import type {  AllPlannerData, Insurance, RetirementCalculations, AssetAllocationProfile, FundAllocation, LifeInsuranceQuote, HealthInsuranceQuote } from '../src/lib/types';

/**
 * Get all financial plans for a user
 */
export async function getUserFinancialPlans(userId: string): Promise<FinancialPlan[]> {
  try {
    const plans = await db
      .select()
      .from(financialPlans)
      .where(eq(financialPlans.userId, userId))
      .orderBy(desc(financialPlans.updatedAt));
    
    return plans;
  } catch (error) {
    console.error('[FinancialPlans] Error fetching plans:', error);
    return [];
  }
}

/**
 * Get a specific financial plan by ID
 */
export async function getFinancialPlan(planId: number, userId: string): Promise<FinancialPlan | null> {
  try {
    const [plan] = await db
      .select()
      .from(financialPlans)
      .where(and(eq(financialPlans.id, planId), eq(financialPlans.userId, userId)));
    
    return plan || null;
  } catch (error) {
    console.error('[FinancialPlans] Error fetching plan:', error);
    return null;
  }
}

/**
 * Create a new financial plan
 */
export async function createFinancialPlan(
  userId: string,
  planName: string,
  planData: AllPlannerData & {
    insurance?: Insurance[];
    retirementCalculations?: RetirementCalculations;
    assetAllocation?: AssetAllocationProfile;
    fundAllocations?: FundAllocation[];
    lifeInsuranceQuotes?: LifeInsuranceQuote[];
    healthInsuranceQuotes?: HealthInsuranceQuote[];
  }
): Promise<FinancialPlan | null> {
  try {
    const [plan] = await db
      .insert(financialPlans)
      .values({
        userId,
        planName,
        personalDetails: planData.personalDetails,
        assets: planData.assets,
        liabilities: planData.liabilities,
        incomes: planData.incomes,
        expenses: planData.expenses,
        goals: planData.goals,
        insurance: planData.insurance || [],
        willStatus: planData.willStatus,
        retirementInputs: planData.retirementInputs,
        retirementCalculations: planData.retirementCalculations || null,
        assetAllocation: planData.assetAllocation || null,
        fundAllocations: planData.fundAllocations || [],
        lifeInsuranceQuotes: planData.lifeInsuranceQuotes || [],
        healthInsuranceQuotes: planData.healthInsuranceQuotes || [],
      })
      .returning();
    
    return plan;
  } catch (error) {
    console.error('[FinancialPlans] Error creating plan:', error);
    return null;
  }
}

/**
 * Update an existing financial plan
 */
export async function updateFinancialPlan(
  planId: number,
  userId: string,
  planData: Partial<AllPlannerData> & {
    planName?: string;
    insurance?: Insurance[];
    retirementCalculations?: RetirementCalculations;
    assetAllocation?: AssetAllocationProfile;
    fundAllocations?: FundAllocation[];
    lifeInsuranceQuotes?: LifeInsuranceQuote[];
    healthInsuranceQuotes?: HealthInsuranceQuote[];
  }
): Promise<FinancialPlan | null> {
  try {
    const updateData: Partial<InsertFinancialPlan> = {
      updatedAt: new Date(),
    };

    if (planData.planName) updateData.planName = planData.planName;
    if (planData.personalDetails) updateData.personalDetails = planData.personalDetails;
    if (planData.assets) updateData.assets = planData.assets;
    if (planData.liabilities) updateData.liabilities = planData.liabilities;
    if (planData.incomes) updateData.incomes = planData.incomes;
    if (planData.expenses) updateData.expenses = planData.expenses;
    if (planData.goals) updateData.goals = planData.goals;
    if (planData.insurance !== undefined) updateData.insurance = planData.insurance;
    if (planData.willStatus !== undefined) updateData.willStatus = planData.willStatus;
    if (planData.retirementInputs) updateData.retirementInputs = planData.retirementInputs;
    if (planData.retirementCalculations !== undefined) updateData.retirementCalculations = planData.retirementCalculations;
    if (planData.assetAllocation !== undefined) updateData.assetAllocation = planData.assetAllocation;
    if (planData.fundAllocations !== undefined) updateData.fundAllocations = planData.fundAllocations;
    if (planData.lifeInsuranceQuotes !== undefined) updateData.lifeInsuranceQuotes = planData.lifeInsuranceQuotes;
    if (planData.healthInsuranceQuotes !== undefined) updateData.healthInsuranceQuotes = planData.healthInsuranceQuotes;

    const [plan] = await db
      .update(financialPlans)
      .set(updateData)
      .where(and(eq(financialPlans.id, planId), eq(financialPlans.userId, userId)))
      .returning();
    
    return plan || null;
  } catch (error) {
    console.error('[FinancialPlans] Error updating plan:', error);
    return null;
  }
}

/**
 * Delete a financial plan
 */
export async function deleteFinancialPlan(planId: number, userId: string): Promise<boolean> {
  try {
    const result = await db
      .delete(financialPlans)
      .where(and(eq(financialPlans.id, planId), eq(financialPlans.userId, userId)))
      .returning();
    
    return result.length > 0;
  } catch (error) {
    console.error('[FinancialPlans] Error deleting plan:', error);
    return false;
  }
}

/**
 * Check if a plan name already exists for a user
 */
export async function planNameExists(userId: string, planName: string, excludePlanId?: number): Promise<boolean> {
  try {
    let query = db
      .select()
      .from(financialPlans)
      .where(and(
        eq(financialPlans.userId, userId),
        eq(financialPlans.planName, planName)
      ));

    const plans = await query;
    
    if (excludePlanId) {
      return plans.some(p => p.id !== excludePlanId);
    }
    
    return plans.length > 0;
  } catch (error) {
    console.error('[FinancialPlans] Error checking plan name:', error);
    return false;
  }
}
