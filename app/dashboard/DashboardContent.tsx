"use client";

import Link from "next/link";
import type { ProductInfo } from "../../lib/user-products";

interface DashboardContentProps {
  userName: string;
  products: ProductInfo[];
}

export default function DashboardContent({
  userName,
  products,
}: DashboardContentProps) {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white/90">
          Welcome back, {userName.split(" ")[0]}
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Here is an overview of your account and products.
        </p>
      </div>

      {/* Product cards */}
      {products.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/30 mb-4">
            Your Products
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <Link
                key={product.id}
                href={product.href}
                className="block bg-[#0e1117] border border-white/[0.06] rounded-2xl p-6
                  hover:border-[#62C5D1]/30 hover:bg-[#0e1117]/80 transition-all duration-150 no-underline group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#62C5D1]/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {product.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white/90 font-semibold text-base group-hover:text-[#62C5D1] transition-colors">
                      {product.label}
                    </h3>
                    <p className="text-white/40 text-sm mt-0.5">
                      {product.description}
                    </p>
                    <div className="mt-3 text-xs text-[#62C5D1] font-medium">
                      Open {product.label} →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/30 mb-4">
          Quick Links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/dashboard/settings"
            className="block bg-[#0e1117] border border-white/[0.06] rounded-2xl p-5
              hover:border-white/20 transition-all duration-150 no-underline"
          >
            <div className="text-white/70 text-sm font-medium">⚙ Account Settings</div>
            <p className="text-white/30 text-xs mt-1">
              Update your profile, password, and preferences
            </p>
          </a>
          {products.length > 0 && (
            <a
              href={products[0].href}
              className="block bg-[#0e1117] border border-white/[0.06] rounded-2xl p-5
                hover:border-white/20 transition-all duration-150 no-underline"
            >
              <div className="text-white/70 text-sm font-medium">
                {products[0].icon} {products[0].label} Dashboard
              </div>
              <p className="text-white/30 text-xs mt-1">
                View analytics, manage settings, and track performance
              </p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
