/**
 * Shared add-on modules. Each add-on is built ONCE here and switched on per
 * site with a feature flag (see flags.ts). Sites never copy add-on code: the
 * site renderer asks isFeatureEnabled(siteId, key) and mounts the shared module.
 */
export interface AddonModule {
  key: string;
  name: string;
  /** Where the shared implementation lives (for maintainers). */
  impl: string;
  /** true once the shared module is production ready */
  ready: boolean;
}

export const ADDON_MODULES: AddonModule[] = [
  { key: "chatbot", name: "AI chatbot", impl: "app/api/site-factory-chat + inject-chatbot", ready: true },
  { key: "reviews", name: "Google reviews carousel", impl: "app/api/site-factory/inject-reviews", ready: true },
  { key: "booking", name: "Booking system", impl: "planned: lib/addons/booking", ready: false },
];

export const moduleByKey = (key: string) => ADDON_MODULES.find((m) => m.key === key);
