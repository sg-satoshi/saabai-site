"use client";

import { createContext, useContext } from "react";

const CouponReportFlagContext = createContext(false);

export function CouponReportFlagProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <CouponReportFlagContext.Provider value={enabled}>{children}</CouponReportFlagContext.Provider>;
}

export function useCouponReportFlag(): boolean {
  return useContext(CouponReportFlagContext);
}
