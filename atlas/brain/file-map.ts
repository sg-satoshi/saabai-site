export const FILE_MAP: Record<string, string[]> = {
  lex: [
    "app/lex/page.tsx",
    "app/api/lex-chat/route.ts",
    "lib/lex-config.ts",
    "app/lex-widget/page.tsx",
  ],

  rex: [
    "app/rex-dashboard/page.tsx",
    "app/rex-changelog/ChangelogClient.tsx",
    "app/api/rex-feedback/route.ts",
    "app/rex-analytics/page.tsx",
  ],

  atlas: [
    "atlas/atlas.ts",
    "atlas/core/execution.ts",
    "atlas/core/tasks.ts",
    "atlas/core/patch-rules.ts",
  ],

  globals: [
    "app/globals.css",
    "app/page.tsx",
  ],

  mission: [
    "app/mission-control/page.tsx",
  ],

  plon: [
    "app/plon/page.tsx",
    "app/api/pete-chat/route.ts",
  ],

  home: [
    "app/page.tsx",
  ],

  theme: [
    "app/globals.css",
  ],

  nav: [
    "app/page.tsx",
  ],

  menu: [
    "app/page.tsx",
  ],

  chat: [
    "app/api/chat/route.ts",
    "app/api/lex-chat/route.ts",
  ],

  history: [
    "app/api/chat/route.ts",
    "app/api/lex-chat/route.ts",
  ],

  auth: [
    "app/api/auth/login/route.ts",
    "app/api/auth/logout/route.ts",
    "app/api/portal/auth/route.ts",
    "app/api/portal/login/route.ts",
  ],

  login: [
    "app/api/auth/login/route.ts",
    "app/api/portal/login/route.ts",
    "app/login/page.tsx",
  ],

  portal: [
    "app/api/portal/auth/route.ts",
    "app/api/portal/login/route.ts",
    "app/api/portal/me/route.ts",
    "app/client-portal/page.tsx",
  ],

  dashboard: [
    "app/mission-control/page.tsx",
    "app/rex-dashboard/page.tsx",
    "app/client-portal/page.tsx",
    "atlas/atlas.ts",
  ],

  persistence: [
    "app/api/chat/route.ts",
    "app/api/lex-chat/route.ts",
    "atlas/system/memory.ts",
    "atlas/system/memory.json",
  ],

  projects: [
    "app/lex/page.tsx",
    "app/api/lex-chat/route.ts",
    "lib/lex-config.ts",
  ],

  threads: [
    "app/lex/page.tsx",
    "app/api/lex-chat/route.ts",
  ],
};