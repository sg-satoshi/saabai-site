"use client";

// Shared client income/tax profile — entered once, used by any calculator
// that needs a marginal tax rate (Investment Analyzer, Dual Income Yield).
// Persisted under a single storage key so it is genuinely shared across
// calculators, unlike each calculator's own scenario (see _lib/portal.ts).

import { useState, useEffect } from "react";
import { loadJSON, saveJSON } from "./portal";

export const CLIENT_PROFILE_KEY = "wh_client_profile";

export type EmploymentType = "employee" | "selfEmployed";

export type ClientProfile = {
  employmentType: EmploymentType;
  grossIncome: number;            // PAYG employees: salary/wage income
  selfEmployedGross: number;      // Self-employed: gross business income
  selfEmployedTaxable: number;    // Self-employed: net/taxable income after expenses & depreciation
};

const DEFAULT_PROFILE: ClientProfile = {
  employmentType: "employee",
  grossIncome: 150000,
  selfEmployedGross: 220000,
  selfEmployedTaxable: 150000,
};

/** The income figure tax is actually calculated on, given the employment type. */
export function taxableIncomeOf(p: ClientProfile): number {
  return p.employmentType === "selfEmployed" ? p.selfEmployedTaxable : p.grossIncome;
}

// ATO resident individual tax brackets (indicative — confirm current rates
// with the ATO or an accountant before relying on this for advice).
const BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 18200, rate: 0 },
  { upTo: 45000, rate: 0.16 },
  { upTo: 135000, rate: 0.30 },
  { upTo: 190000, rate: 0.37 },
  { upTo: Infinity, rate: 0.45 },
];
const MEDICARE_LEVY = 0.02;

/** Marginal rate (the rate on the next dollar earned) at a given taxable income. */
export function marginalRate(taxableIncome: number, includeMedicare = true): number {
  const bracket = BRACKETS.find(b => taxableIncome <= b.upTo) ?? BRACKETS[BRACKETS.length - 1];
  return bracket.rate + (includeMedicare && bracket.rate > 0 ? MEDICARE_LEVY : 0);
}

/** Shared, persisted client income/tax profile — same storage across every calculator that uses it. */
export function useClientProfile(): [ClientProfile, (next: Partial<ClientProfile>) => void] {
  const [profile, setProfileState] = useState<ClientProfile>(() => ({
    ...DEFAULT_PROFILE,
    ...loadJSON<Partial<ClientProfile>>(CLIENT_PROFILE_KEY, {}),
  }));

  useEffect(() => {
    saveJSON(CLIENT_PROFILE_KEY, profile);
  }, [profile]);

  function setProfile(next: Partial<ClientProfile>) {
    setProfileState(prev => ({ ...prev, ...next }));
  }

  return [profile, setProfile];
}
