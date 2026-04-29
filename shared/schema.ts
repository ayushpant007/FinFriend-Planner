/**
 * Database schema for FinFriend Planner
 * Following the blueprint:javascript_database integration
 */

import { pgTable, text, serial, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Financial Plans table
 * Stores complete financial planning data for users
 */
export const financialPlans = pgTable('financial_plans', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase UID
  planName: varchar('plan_name', { length: 255 }).notNull(),
  
  // Personal Details
  personalDetails: jsonb('personal_details').notNull(),
  
  // Financial Data (stored as JSON for flexibility)
  assets: jsonb('assets').notNull().default([]),
  liabilities: jsonb('liabilities').notNull().default([]),
  incomes: jsonb('incomes').notNull().default([]),
  expenses: jsonb('expenses').notNull().default([]),
  goals: jsonb('goals').notNull().default([]),
  insurance: jsonb('insurance').notNull().default([]),
  
  // Estate Planning
  willStatus: text('will_status'),
  
  // Retirement Planning
  retirementInputs: jsonb('retirement_inputs'),
  retirementCalculations: jsonb('retirement_calculations'),
  
  // Asset Allocation
  assetAllocation: jsonb('asset_allocation'),
  fundAllocations: jsonb('fund_allocations').default([]),
  
  // Insurance Quotes
  lifeInsuranceQuotes: jsonb('life_insurance_quotes').default([]),
  healthInsuranceQuotes: jsonb('health_insurance_quotes').default([]),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Type exports for use in application code
 */
export type FinancialPlan = typeof financialPlans.$inferSelect;
export type InsertFinancialPlan = typeof financialPlans.$inferInsert;

/**
 * Relations - Define relationships between tables
 * (Currently only one table, but leaving structure for future expansion)
 */
export const financialPlansRelations = relations(financialPlans, () => ({}));
