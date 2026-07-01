"use client";

import { useState, useMemo, useEffect } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  calcStampDuty as calcSD, STATE_NAMES, STATES, type State,
  fmtAUD as fmt$, fmtCompact as fmt1k,
} from "../_shared";
import { UI, FONT_DISPLAY, AnimatedNumber } from "../../_ui/primitives";
import { CHART, AXIS_TICK } from "../../_ui/charts";
import { PageWrap, Masthead, CalculatorNav, Hero, Card, Eyebrow, Title, LedgerRow, FieldGrid } from "../../_ui/tearsheet";
import { loadJSON, saveJSON } from "../../../_lib/portal";

const STORAGE_KEY = "wh_calc_stamp_duty";

export default function StampDutyCalculator() {
  const [saved] = useState<Record<string, any>>(() => loadJSON(STORAGE_KEY, {}));
  const [price, setPrice] = useState(saved.price ?? 729000);
  const [state, setState] = useState<State>(saved.state ?? "NSW");

  useEffect(() => {
    saveJSON(STORAGE_KEY, { price, state });
  }, [price, state]);

  const duty = calcSD(price, state);
  const dutyPct = price > 0 ? (duty / price) * 100 : 0;
  const total = price + duty;

  const allStatesData = useMemo(() =>
    STATES.map(s => ({
      name: s,
      value: Math.round(calcSD(price, s)),
      full: STATE_NAMES[s],
    })), [price]);

  const cheapest = allStatesData.reduce((a, b) => a.value < b.value ? a : b);
  const dearest = allStatesData.reduce((a, b) => a.value > b.value ? a : b);

  return (
    <ClientPortalShell>
      <PageWrap>
        <Masthead label="Wholesale Homes — Stamp Duty" />
        <CalculatorNav current="stamp-duty" />

        <Hero
          eyebrow="Upfront cost"
          headline={<>Stamp duty in {STATE_NAMES[state]} is{" "}<span style={{ color: "#5fd4ab" }}><AnimatedNumber value={duty} format={(n) => fmt$(Math.round(n))} /></span>.</>}
          sub={<>On a {fmt$(price)} purchase — {dutyPct.toFixed(2)}% of the price. State transfer duty at standard investor rates.</>}
          stats={[
            { label: "Total upfront", value: <AnimatedNumber value={total} format={(n) => fmt$(Math.round(n))} /> },
            { label: "% of price", value: <AnimatedNumber value={dutyPct} format={(n) => n.toFixed(2) + "%"} /> },
          ]}
        />

        <div className="wh-rise" style={{ animationDelay: "180ms", display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: 22 }}>
          {/* Assumptions */}
          <Card>
            <Eyebrow>Assumptions</Eyebrow>
            <Title>Your numbers</Title>
            <p style={{ fontSize: 12.5, color: UI.faintInk, margin: "4px 0 16px" }}>Adjust the purchase and state — everything updates live.</p>
            <FieldGrid items={[
              { label: "Purchase Price", val: price, set: (v: number) => setPrice(v), suffix: "$" },
              { label: "State", val: state, set: (v: string) => setState(v as State), isSelect: true, opts: STATES.map(s => ({ label: `${s} — ${STATE_NAMES[s]}`, value: s })) },
            ]} />
            <div style={{ marginTop: 18 }}>
              <LedgerRow label="Property price" value={fmt$(price)} />
              <LedgerRow label="Stamp duty" sub={`${dutyPct.toFixed(2)}% of price`} value={fmt$(duty)} valueColor={UI.teal} />
              <LedgerRow strong last label="Total upfront" sub={`in ${STATE_NAMES[state]}`} value={fmt$(total)} />
            </div>
          </Card>

          {/* Chart */}
          <Card style={{ display: "flex", flexDirection: "column" }}>
            <Eyebrow>Comparison</Eyebrow>
            <Title>Stamp duty by state</Title>
            <p style={{ fontSize: 12, color: UI.faintInk, margin: "3px 0 10px" }}>On a {fmt$(price)} property · {STATE_NAMES[state]} highlighted</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={allStatesData} margin={{ top: 5, right: 10, left: -6, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontWeight: 600 }} />
                <YAxis tick={AXIS_TICK} tickFormatter={v => "$" + fmt1k(v)} />
                <Tooltip cursor={{ fill: "rgba(15,23,42,0.03)" }} content={({ active, payload }: any) =>
                  active && payload && payload.length ? (
                    <div className="rounded-2xl border bg-white px-3.5 py-2.5" style={{ borderColor: UI.line, boxShadow: "0 12px 32px -12px rgba(16,24,40,0.35)" }}>
                      <p style={{ fontSize: 11, color: UI.muted }}>{payload[0]?.payload?.full}</p>
                      <p style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500, color: UI.ink }}>{fmt$(payload[0]?.value || 0)}</p>
                      <p style={{ fontSize: 11, color: UI.faint }}>{((payload[0]?.value || 0) / price * 100).toFixed(2)}% of price</p>
                    </div>
                  ) : null
                } />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={CHART.animationMs}>
                  {allStatesData.map((e, i) => (
                    <Cell key={i} fill={e.name === state ? UI.teal : "#d7d3c8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Across the states ledger */}
        <Card className="wh-rise" style={{ animationDelay: "240ms", marginBottom: 22 }}>
          <Eyebrow>Where it's cheapest</Eyebrow>
          <Title>Across the states</Title>
          <div style={{ marginTop: 12 }}>
            <LedgerRow label={`Cheapest — ${STATE_NAMES[cheapest.name as State]}`} sub={`${(cheapest.value / price * 100).toFixed(2)}% of price`} value={fmt$(cheapest.value)} valueColor={UI.green} />
            <LedgerRow label={`Most expensive — ${STATE_NAMES[dearest.name as State]}`} sub={`${(dearest.value / price * 100).toFixed(2)}% of price`} value={fmt$(dearest.value)} valueColor={UI.red} />
            <LedgerRow strong last label="Difference across states" sub="what location alone costs you" value={fmt$(dearest.value - cheapest.value)} />
          </div>
          <p style={{ fontSize: 10.5, color: UI.faint, marginTop: 12 }}>First-home-buyer concessions and off-the-plan discounts may apply. Verify with your conveyancer.</p>
        </Card>
      </PageWrap>
    </ClientPortalShell>
  );
}
