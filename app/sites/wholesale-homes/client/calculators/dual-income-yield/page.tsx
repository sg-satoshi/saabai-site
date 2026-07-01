"use client";

import { useState } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fmtAUD as fmt$ } from "../_shared";
import { UI, FONT_DISPLAY, AnimatedNumber } from "../../_ui/primitives";
import { CHART, AXIS_TICK } from "../../_ui/charts";
import { PageWrap, Masthead, Hero, FiguresStrip, Card, Eyebrow, Title, LedgerRow, FieldGrid } from "../../_ui/tearsheet";

export default function DualIncomeYieldCalculator() {
  const [pp, setPp] = useState(789990);
  const [mr, setMr] = useState(420);
  const [gr, setGr] = useState(280);
  const [cr, setCr] = useState(2500);
  const [ins, setIns] = useState(1800);
  const [mgmt, setMgmt] = useState(7);
  const [maint, setMaint] = useState(1500);

  const twr = mr + gr;
  const yrRent = twr * 52;
  const mgmtCost = yrRent * (mgmt / 100);
  const tae = cr + ins + mgmtCost + maint;
  const nri = yrRent - tae;
  const gy = pp > 0 ? (yrRent / pp) * 100 : 0;
  const ny = pp > 0 ? (nri / pp) * 100 : 0;
  const wcf = nri / 52;

  const yieldData = [
    { name: "Gross", value: gy, fill: "#0e7490" },
    { name: "Net", value: ny, fill: "#0891b2" },
    { name: "On cash (20%)", value: pp > 0 ? (nri / (pp * 0.2)) * 100 : 0, fill: "#67c5d6" },
  ];

  return (
    <ClientPortalShell>
      <PageWrap>
        <Masthead label="Wholesale Homes — Dual Income Yield" />

        <Hero
          eyebrow="Rental return"
          headline={<>This dual-income home yields{" "}<span style={{ color: "#5fd4ab" }}><AnimatedNumber value={ny} format={(n) => n.toFixed(1) + "%"} /></span> net.</>}
          sub={<>{fmt$(twr)}/wk combined rent — ${mr} main + ${gr} granny — on a {fmt$(pp)} purchase, after all holding costs.</>}
          stats={[
            { label: "Net income / yr", value: <AnimatedNumber value={nri} format={(n) => fmt$(Math.round(n))} /> },
            { label: "Gross yield", value: <AnimatedNumber value={gy} format={(n) => n.toFixed(1) + "%"} /> },
          ]}
        />

        <FiguresStrip items={[
          { label: "Gross rent", value: fmt$(yrRent), sub: `${mr}/wk + ${gr}/wk` },
          { label: "Net income", value: fmt$(nri), sub: "after costs", color: nri >= 0 ? UI.green : UI.red },
          { label: "Weekly cashflow", value: (wcf >= 0 ? "+" : "−") + fmt$(Math.abs(Math.round(wcf))), sub: "before loan", color: wcf >= 0 ? UI.green : UI.red },
          { label: "Gross yield", value: gy.toFixed(2) + "%", sub: `${fmt$(yrRent)}/yr` },
          { label: "Net yield", value: ny.toFixed(2) + "%", sub: `${fmt$(nri)}/yr` },
        ]} />

        <div className="wh-rise" style={{ animationDelay: "180ms", display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: 22 }}>
          {/* Assumptions */}
          <Card>
            <Eyebrow>Assumptions</Eyebrow>
            <Title>Your numbers</Title>
            <p style={{ fontSize: 12.5, color: UI.faintInk, margin: "4px 0 16px" }}>Rents and holding costs — everything updates live.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FieldGrid items={[
                { label: "Purchase Price", val: pp, set: setPp, suffix: "$" },
                { label: "Main Rent /wk", val: mr, set: setMr, suffix: "$" },
                { label: "Granny Rent /wk", val: gr, set: setGr, suffix: "$" },
              ]} />
              <FieldGrid items={[
                { label: "Council Rates", val: cr, set: setCr, suffix: "$" },
                { label: "Insurance", val: ins, set: setIns, suffix: "$" },
                { label: "Mgmt Fee", val: mgmt, set: setMgmt, suffix: "%", step: 0.5 },
                { label: "Maintenance", val: maint, set: setMaint, suffix: "$" },
              ]} />
            </div>
          </Card>

          {/* Yield chart */}
          <Card style={{ display: "flex", flexDirection: "column" }}>
            <Eyebrow>Return</Eyebrow>
            <Title>Yield comparison</Title>
            <p style={{ fontSize: 12, color: UI.faintInk, margin: "3px 0 10px" }}>Gross, net & return on a 20% cash deposit</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yieldData} margin={{ top: 5, right: 10, left: -6, bottom: 0 }} barSize={72}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontWeight: 600 }} />
                <YAxis tick={AXIS_TICK} tickFormatter={v => v + "%"} domain={[0, "auto"]} />
                <Tooltip cursor={{ fill: "rgba(15,23,42,0.03)" }} content={({ active, payload }: any) =>
                  active && payload && payload.length ? (
                    <div className="rounded-2xl border bg-white px-3.5 py-2.5" style={{ borderColor: UI.line, boxShadow: "0 12px 32px -12px rgba(16,24,40,0.35)" }}>
                      <p style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500, color: payload[0]?.payload?.fill }}>{payload[0]?.payload?.name}: {payload[0]?.value?.toFixed(2)}%</p>
                    </div>
                  ) : null
                } />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={CHART.animationMs}>
                  {yieldData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Annual statement ledger */}
        <Card className="wh-rise" style={{ animationDelay: "240ms", marginBottom: 22 }}>
          <Eyebrow>Cash flow</Eyebrow>
          <Title>Annual statement</Title>
          <div style={{ marginTop: 12 }}>
            <LedgerRow label="Gross annual rent" sub={`${mr}/wk main + ${gr}/wk granny`} value={fmt$(yrRent)} />
            <LedgerRow label="Property management" sub={`${mgmt}% of rent`} value={`−${fmt$(mgmtCost)}`} valueColor={UI.faintInk} />
            <LedgerRow label="Council rates" value={`−${fmt$(cr)}`} valueColor={UI.faintInk} />
            <LedgerRow label="Insurance" value={`−${fmt$(ins)}`} valueColor={UI.faintInk} />
            <LedgerRow label="Maintenance reserve" value={`−${fmt$(maint)}`} valueColor={UI.faintInk} />
            <LedgerRow strong last label="Net annual income" sub={`${wcf >= 0 ? "+" : "−"}$${Math.abs(Math.round(wcf))}/wk before loan`} value={fmt$(nri)} valueColor={nri >= 0 ? UI.green : UI.red} />
          </div>
          <p style={{ fontSize: 10.5, color: UI.faint, marginTop: 12 }}>Estimate only, before loan repayments and tax. Speak with Nick for personalised figures.</p>
        </Card>
      </PageWrap>
    </ClientPortalShell>
  );
}
