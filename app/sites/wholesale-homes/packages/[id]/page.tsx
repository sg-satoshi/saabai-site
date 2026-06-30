"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PackageDetail() {
  const router = useRouter();
  useEffect(() => { router.replace("/client-login"); }, [router]);
  return null;
}
