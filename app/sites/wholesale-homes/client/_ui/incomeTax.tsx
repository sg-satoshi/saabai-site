"use client";

// Shared "Income & tax" input card — entered once via useClientProfile(),
// rendered identically wherever a calculator wants to offer an after-tax
// figure (Investment Analyzer, Dual Income Yield).

import { UI } from "./primitives";
import { Eyebrow, Title, FieldGrid } from "./tearsheet";
import { type ClientProfile, type EmploymentType, marginalRate, taxableIncomeOf } from "../../_lib/clientProfile";

export function IncomeTaxCard({
  profile,
  setProfile,
}: {
  profile: ClientProfile;
  setProfile: (next: Partial<ClientProfile>) => void;
}) {
  const rate = marginalRate(taxableIncomeOf(profile));

  return (
    <div>
      <Eyebrow>Income & tax</Eyebrow>
      <Title>Your tax position</Title>
      <p style={{ fontSize: 12.5, color: UI.faintInk, margin: "4px 0 16px" }}>Shared across calculators — enter once.</p>

      <FieldGrid items={[
        { label: "Employment", val: profile.employmentType, set: (v: string) => setProfile({ employmentType: v as EmploymentType }), isSelect: true, opts: [{ label: "PAYG employee", value: "employee" }, { label: "Self-employed", value: "selfEmployed" }] },
      ]} />

      <div style={{ marginTop: 12 }}>
        {profile.employmentType === "employee" ? (
          <FieldGrid items={[
            { label: "Gross Income", val: profile.grossIncome, set: (v: number) => setProfile({ grossIncome: v }), suffix: "$/yr" },
          ]} />
        ) : (
          <FieldGrid items={[
            { label: "Gross Income", val: profile.selfEmployedGross, set: (v: number) => setProfile({ selfEmployedGross: v }), suffix: "$/yr" },
            { label: "Taxable (net) Income", val: profile.selfEmployedTaxable, set: (v: number) => setProfile({ selfEmployedTaxable: v }), suffix: "$/yr" },
          ]} />
        )}
      </div>

      <div style={{ marginTop: 14, borderRadius: 14, border: `1px solid ${UI.hair}`, background: UI.bone, padding: "12px 14px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: UI.muted }}>Marginal tax rate{profile.employmentType === "selfEmployed" ? " (on taxable income)" : ""}</span>
        <span style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: 20, fontWeight: 500, color: UI.ink }}>{(rate * 100).toFixed(1)}%</span>
      </div>
      <p style={{ fontSize: 10.5, color: UI.faint, marginTop: 8 }}>Indicative ATO resident brackets + 2% Medicare Levy. Confirm current rates with your accountant.</p>
    </div>
  );
}
