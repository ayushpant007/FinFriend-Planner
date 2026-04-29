"use client";

import { useState, useEffect } from 'react';

export type SubscriptionPlan = 'free' | 'core' | 'pro' | 'enterprise';

const STORAGE_KEY = 'finfriend_subscription_plan';

export function useSubscription() {
  const [plan, setPlanState] = useState<SubscriptionPlan>('free');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['free', 'core', 'pro', 'enterprise'].includes(stored)) {
        setPlanState(stored as SubscriptionPlan);
      }
    } catch {}
  }, []);

  const setPlan = (newPlan: SubscriptionPlan) => {
    setPlanState(newPlan);
    try {
      localStorage.setItem(STORAGE_KEY, newPlan);
    } catch {}
  };

  const isPaid = plan === 'core' || plan === 'pro' || plan === 'enterprise';

  return { plan, setPlan, isPaid };
}
