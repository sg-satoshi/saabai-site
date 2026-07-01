"use client";

import { useState } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";

export default function BorrowingPowerEstimator() {
  const [income, setIncome] = useState(150000);
  const [partnerIncome, setPartnerIncome] = useState(0);
  const [deposit, setDeposit] = useState(150000);
  const [otherLoans, setOtherLoans] = useState(300);
  const [creditCards, setCreditCards] = useState(0);
  const [interestRate, setInterestRate] = useState(6.3);
  const [loanTerm, setLoanTerm] = useState(30);
  const [livingExpenses, setLivingExpenses] = useState(2500);

  const totalIncome = income + partnerIncome;
  const monthlyIncome = totalIncome / 12;
  const rateMonthly = interestRate / 100 / 12;
  const totalPayments = loanTerm * 12;

  // Stress test rate: typically 3% above the offered rate (APRA standard)
  const stressRate = interestRate + 3;
  const stressRateMonthly = stressRate / 100 / 12;

  // Maximum borrowing using the stress test: monthly payment = income - expenses - other loans
  const availableMonthly = monthlyIncome - livingExpenses - otherLoans - (creditCards * 0.036); // 3.6% of credit card limit
  const maxBorrow = safeDivide(availableMonthly * (1 - Math.pow(1 + stressRateMonthly, -totalPayments)), stressRateMonthly);

  const propertyPrice = maxBorrow + deposit;
  const lvr = propertyPrice > 0 ? (maxBorrow / propertyPrice) * 100 : 0;
  const estMonthlyRepayment = safeDivide(maxBorrow * rateMonthly * Math.pow(1 + rateMonthly, totalPayments), Math.pow(1 + rateMonthly, totalPayments) - 1);
  const belowEighty = lvr <= 80;

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 900 }}>
        <a
          href="/client/calculators"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: "#0891b2",
            textDecoration: "none", marginBottom: 16,
          }}
        >
          &larr; Back to Calculators
        </a>

        <div style={{ marginBottom: 28 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">
            Calculator
          </p>
          <h1 className="mt-2 text-[clamp(1.3rem,3vw,1.8rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C]">
            Borrowing Power Estimator
          </h1>
          <p className="mt-1 text-sm text-[#5C6670]">
            Get a quick estimate of how much you may be able to borrow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Inputs */}
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mb-4">Your Financials</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Your Annual Income ($)</label>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Partner's Annual Income ($)</label>
                <input
                  type="number"
                  value={partnerIncome}
                  onChange={(e) => setPartnerIncome(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Deposit / Equity ($)</label>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Monthly Living Expenses ($)</label>
                <input
                  type="number"
                  value={livingExpenses}
                  onChange={(e) => setLivingExpenses(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mt-6 mb-4">Liabilities</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Other Loan Repayments ($/mo)</label>
                <input
                  type="number"
                  value={otherLoans}
                  onChange={(e) => setOtherLoans(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Credit Card Limits ($)</label>
                <input
                  type="number"
                  value={creditCards}
                  onChange={(e) => setCreditCards(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                />
                <p className="mt-0.5 text-[10px] text-[#9CA3AF]">Lenders assess 3.6% of limit as monthly liability</p>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mt-6 mb-4">Loan Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Interest Rate (%)</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                  step="0.1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Loan Term (yrs)</label>
                <select
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                >
                  <option value={20}>20 years</option>
                  <option value={25}>25 years</option>
                  <option value={30}>30 years</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mb-5">Estimated Capacity</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f0f9ff] p-4 border border-[#0891b2]/20 sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0891b2]">Estimated Maximum Borrow</p>
                  <p className="mt-1 text-2xl font-bold text-[#0891b2]">
                    ${maxBorrow.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-[#0891b2]/70">
                    Stressed at {stressRate.toFixed(1)}% p.a. (APRA standard +3%)
                  </p>
                </div>
                <div className="rounded-xl bg-[#1A2B3C] p-4 border border-[rgba(255,255,255,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Est. Property Price</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    ${propertyPrice.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-white/60">Loan + ${deposit.toLocaleString()} deposit</p>
                </div>
                <div className={`rounded-xl p-4 border ${belowEighty ? "bg-[#f0fdf4] border-green-100" : "bg-[#fefce8] border-yellow-200"}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${belowEighty ? 'text-green-700' : 'text-yellow-800'}`}>Loan-to-Value Ratio</p>
                  <p className={`mt-1 text-2xl font-bold ${belowEighty ? "text-green-600" : "text-yellow-700"}`}>{lvr.toFixed(1)}%</p>
                  <p className={`text-xs ${belowEighty ? "text-green-700/70" : "text-yellow-800/70"}`}>
                    {belowEighty ? "Under 80% - no LMI likely needed" : "Over 80% - LMI may apply"}
                  </p>
                </div>
                <div className="rounded-xl bg-[#f0fdf4] p-4 border border-green-100 sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">Est. Monthly Repayment</p>
                  <p className="mt-1 text-xl font-bold text-green-600">
                    ${estMonthlyRepayment.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-green-700/70">At {interestRate.toFixed(1)}% over {loanTerm} years (P&I)</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-[#f8f6f2] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-2">How it works</p>
                <p className="text-xs leading-relaxed text-[#5C6670]">
                  This calculator applies the standard APRA serviceability buffer of <strong>3% above the
                  quoted rate</strong> ({stressRate.toFixed(1)}% assessment rate). Your estimated maximum borrow is
                  based on surplus income after living expenses, existing loan repayments, and a monthly
                  liability on credit card limits. Actual borrowing capacity depends on the lender's specific
                  assessment criteria, including HEM benchmarks and asset type.
                </p>
              </div>

              <p className="mt-4 text-[10px] text-[#9CA3AF] leading-relaxed">
                This is an estimate only. Speak with a mortgage broker or Nick for personalised pre-approval figures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClientPortalShell>
  );
}

function Row({ label, value, highlight, bold }: { label: string; value: string; highlight?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className={`text-xs ${bold ? "font-semibold text-[#1A2B3C]" : "text-[#5C6670]"}`}>{label}</span>
      <span className={`text-xs font-semibold ${highlight ? "text-[#0891b2]" : bold ? "text-[#1A2B3C]" : "text-[#5C6670]"}`}>{value}</span>
    </div>
  );
}

function safeDivide(a: number, b: number): number {
  return b === 0 || !isFinite(b) || a <= 0 ? 0 : a / b;
}
