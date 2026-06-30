"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PackagesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/client-login"); }, [router]);
  return null;
}
