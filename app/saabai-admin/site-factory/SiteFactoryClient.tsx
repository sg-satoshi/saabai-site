"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface Site {
  id: string;
  slug: string;
  name: string;
  niche: string;
  status: string;
  url: string;
  createdAt: number;
  domains?: string[];
  chatbot?: {
    enabled?: boolean;
    name?: string;
    greeting?: string;
    systemPrompt?: string;
    avatarUrl?: string;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
  imageUrl?: string;
  htmlSnapshot?: string;
  suggestions?: string[];
}

type Phase = "list" | "new" | "generating" | "editing";
type Device = "desktop" | "tablet" | "mobile";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const C = {
  bg: "#080d11",
  surface: "#0f1923",
  surface2: "#162130",
  border: "#1a2535",
  border2: "#243040",
  text: "#e2dfd8",
  textDim: "#6b7e94",
  textMuted: "#3d5168",
  gold: "#c9a227",
  goldBg: "rgba(201,162,39,0.1)",
  teal: "#0f9d8e",
  tealBg: "rgba(15,157,142,0.1)",
  tealDk: "#0c8077",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.08)",
  blue: "#3b82f6",
  blueBg: "rgba(59,130,246,0.1)",
};

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

const NICHES = [
  { value: "trades", label: "Trades" },
  { value: "allied-health", label: "Allied Health" },
  { value: "professional-services", label: "Professional Services" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "retail", label: "Retail" },
  { value: "hospitality", label: "Hospitality" },
  { value: "other", label: "Other" },
];

const THEMES = [
  { id: "onyx",     label: "Onyx",     tagline: "Dark luxury",      colors: ["#0d0d0d","#c9a227","#181818"], niches: ["professional-services","automotive"] },
  { id: "coast",    label: "Coast",    tagline: "Clean & airy",     colors: ["#f0f9ff","#0d9488","#0c4a6e"], niches: ["allied-health","beauty"] },
  { id: "edge",     label: "Edge",     tagline: "Bold geometric",   colors: ["#ffffff","#4f46e5","#111827"], niches: ["technology"] },
  { id: "grove",    label: "Grove",    tagline: "Warm organic",     colors: ["#fdf8f2","#1b4332","#b45309"], niches: ["hospitality"] },
  { id: "slate",    label: "Slate",    tagline: "Corporate trust",  colors: ["#f8fafc","#0f172a","#2563eb"], niches: ["other","finance"] },
  { id: "spark",    label: "Spark",    tagline: "Vibrant gradient", colors: ["#ffffff","#7c3aed","#ec4899"], niches: ["retail"] },
  { id: "craft",    label: "Craft",    tagline: "Artisan boutique", colors: ["#faf7f2","#c2410c","#1c1410"], niches: ["hospitality"] },
  { id: "apex",     label: "Apex",     tagline: "Industrial bold",  colors: ["#0c1a30","#f97316","#162035"], niches: ["trades","automotive"] },
  { id: "prestige", label: "Prestige", tagline: "Navy + teal legal", colors: ["#F7FAFC","#006B5E","#0D1D2B"], niches: ["legal"] },
];

const NICHE_THEME_DEFAULT: Record<string, string> = {
  "trades": "apex", "allied-health": "coast", "professional-services": "onyx",
  "legal": "prestige", "finance": "slate",
  "retail": "spark", "hospitality": "craft", "beauty": "coast",
  "automotive": "apex", "technology": "edge", "other": "slate",
};

type MultiPageStatus = { slug: string; label: string; status: "pending" | "building" | "done" | "error" };

const NICHE_PAGES: Record<string, Array<{ slug: string; label: string }>> = {
  "legal":                  [{ slug:"home",label:"Home" },{ slug:"about",label:"About" },{ slug:"practice-areas",label:"Practice Areas" },{ slug:"contact",label:"Contact" }],
  "allied-health":          [{ slug:"home",label:"Home" },{ slug:"about",label:"About" },{ slug:"services",label:"Services" },{ slug:"contact",label:"Contact" }],
  "professional-services":  [{ slug:"home",label:"Home" },{ slug:"about",label:"About" },{ slug:"services",label:"Services" },{ slug:"contact",label:"Contact" }],
  "hospitality":            [{ slug:"home",label:"Home" },{ slug:"about",label:"About" },{ slug:"menu",label:"Menu" },{ slug:"contact",label:"Contact" }],
  "finance":                [{ slug:"home",label:"Home" },{ slug:"about",label:"About" },{ slug:"services",label:"Services" },{ slug:"contact",label:"Contact" }],
};
const DEFAULT_PAGES = [{ slug:"home",label:"Home" },{ slug:"about",label:"About" },{ slug:"services",label:"Services" },{ slug:"contact",label:"Contact" }];

function storeMsgs(slug: string, msgs: Message[]) {
  try {
    // Store without htmlSnapshot (too large) — restore buttons only work within session
    const slim = msgs.map(({ htmlSnapshot: _snap, ...m }) => m);
    localStorage.setItem(`sf:msgs:${slug}`, JSON.stringify(slim.slice(-60)));
  } catch { /* storage full */ }
}

function loadMsgs(slug: string): Message[] {
  try {
    const raw = localStorage.getItem(`sf:msgs:${slug}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

interface ReviewsData {
  url: string;
  fetchedReviews: Array<{ name: string; rating: number; text: string; date?: string }>;
  manualReviews: Array<{ name: string; rating: number; text: string }>;
  rating?: number;
  totalReviews?: number;
  businessName: string;
  fetchTip: string;
}

function saveReviews(slug: string, data: ReviewsData) {
  try {
    localStorage.setItem(`sf:reviews:${slug}`, JSON.stringify(data));
  } catch { /* storage full */ }
}

function loadReviews(slug: string): ReviewsData | null {
  try {
    const raw = localStorage.getItem(`sf:reviews:${slug}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}


// ─── List helpers ────────────────────────────────────────────────────────────

function siteColor(name: string): string {
  const palette = ["#0f9d8e","#c9a227","#3b82f6","#a855f7","#f97316","#ef4444","#22c55e","#ec4899","#14b8a6","#8b5cf6"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function relTime(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d < 1) return "today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function deduplicateSites(sites: Site[]): Site[] {
  const map = new Map<string, Site>();
  // Sort so properly-slugged, domain-having entries win
  const sorted = [...sites].sort((a, b) => {
    const aScore = (a.domains?.length ? 2 : 0) + (/^[a-z0-9-]+$/.test(a.slug) ? 1 : 0);
    const bScore = (b.domains?.length ? 2 : 0) + (/^[a-z0-9-]+$/.test(b.slug) ? 1 : 0);
    return bScore - aScore;
  });
  for (const site of sorted) {
    const key = site.name.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, site);
    } else {
      // Merge domains onto the winner
      const merged = [...new Set([...(existing.domains || []), ...(site.domains || [])])];
      map.set(key, { ...existing, domains: merged });
    }
  }
  return Array.from(map.values());
}

const NICHE_META: Record<string, { label: string; color: string; bg: string }> = {
  trades:                { label: "Trades",               color: "#c9a227", bg: "rgba(201,162,39,0.12)" },
  "allied-health":       { label: "Allied Health",        color: "#0f9d8e", bg: "rgba(15,157,142,0.12)" },
  "professional-services":{ label: "Professional Svcs",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  retail:                { label: "Retail",               color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  hospitality:           { label: "Hospitality",          color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  other:                 { label: "Other",                color: "#6b7e94", bg: "rgba(107,126,148,0.12)" },
  legal:                 { label: "Legal",                color: "#006B5E", bg: "rgba(0,107,94,0.12)"  },
  finance:               { label: "Finance",              color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function SiteFactoryClient() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [phase, setPhase] = useState<Phase>("list");
  const [isMobile, setIsMobile] = useState(false);

  // List filter/search state
  const [listSearch, setListSearch] = useState("");
  const [listNiche, setListNiche] = useState("all");
  const [listStatus, setListStatus] = useState("all");
  const [listSort, setListSort] = useState<"newest"|"oldest"|"az"|"za">("newest");

  // Toast notification
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  // Draft/publish state
  const [hasDraft, setHasDraft] = useState(false);
  const [unpublishedCount, setUnpublishedCount] = useState(0);

  // Editor state
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instruction, setInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [queued, setQueued] = useState<{ instruction: string; imageUrl?: string } | null>(null);
  const seoEditPendingRef = useRef(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [versionIdx, setVersionIdx] = useState(-1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPx, setSidebarPx] = useState(320);
  const sidebarPxRef = useRef(320);
  const sidebarDivRef = useRef<HTMLDivElement>(null);
  const isDraggingPanel = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(320);

  // Initialise sidebar width from localStorage after mount
  useEffect(() => {
    const stored = parseInt(typeof window !== "undefined" ? (localStorage.getItem("sf_sidebar_w") || "320") : "320", 10);
    const clamped = Math.min(750, Math.max(280, stored));
    setSidebarPx(clamped);
    sidebarPxRef.current = clamped;
  }, []);

  // Global mouse/touch handlers for panel drag
  // Uses direct DOM mutation (no React state) during drag to avoid re-renders and
  // iframe event capture. setSidebarPx is only called on mouseup to commit the value.
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingPanel.current) return;
      if (e.cancelable) e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const newW = Math.min(750, Math.max(280, dragStartW.current + (clientX - dragStartX.current)));
      sidebarPxRef.current = newW;
      if (sidebarDivRef.current) sidebarDivRef.current.style.width = `${newW}px`;
    };
    const onUp = () => {
      if (!isDraggingPanel.current) return;
      isDraggingPanel.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Re-enable iframe pointer events
      if (iframeRef.current) iframeRef.current.style.pointerEvents = "";
      const finalW = sidebarPxRef.current;
      setSidebarPx(finalW);
      localStorage.setItem("sf_sidebar_w", String(finalW));
    };
    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Upload + drag state
  const [pendingImage, setPendingImage] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DNS state
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<{ ok: boolean; domain: string; instructions: { type: string; name: string; value: string; note: string }[]; vercelConnected: boolean; vercelError?: string } | null>(null);
  const [dnsCheckResults, setDnsCheckResults] = useState<Record<string, { live: boolean; checking: boolean }>>({});

  // Delete confirmation state
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Generation state
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("trades");
  const [themeOverridden, setThemeOverridden] = useState(false);
  const [location, setLocation] = useState("Australia");
  const [services, setServices] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [style, setStyle] = useState(NICHE_THEME_DEFAULT["trades"]);
  const [description, setDescription] = useState("");
  const [genCharCount, setGenCharCount] = useState(0);
  const [streamedHtml, setStreamedHtml] = useState("");
  const [siteType, setSiteType] = useState<"single" | "multi">("single");
  const [multiPageProgress, setMultiPageProgress] = useState<MultiPageStatus[]>([]);

  // Smart brief state
  const [briefText, setBriefText] = useState("");
  const [briefUrl, setBriefUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  // Overwrite protection
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ slug: string; name: string; existingSite: Site } | null>(null);

  // Chatbot config state (for new site form)
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotName, setChatbotName] = useState("");
  const [chatbotGreeting, setChatbotGreeting] = useState("");
  const [chatbotPersonality, setChatbotPersonality] = useState("");

  // Sidebar active panel (tabs)
  const [activePanel, setActivePanel] = useState<"chat" | "image" | "bot" | "dns" | "reviews" | "seo" | "history">("chat");
  function switchPanel(panel: "chat" | "image" | "bot" | "dns" | "reviews" | "seo" | "history") {
    setActivePanel(panel);
    if (panel === "image" && activeSite) {
      loadGallery(activeSite.slug);
      loadFavicon(activeSite.slug);
    }
    if (panel === "seo" && activeSite) loadSeoScore(activeSite.slug);
    if (panel === "history" && activeSite) loadVersionHistory(activeSite.slug);
  }

  // Version history state
  interface VersionEntry { v: number; ts: number; label: string; url: string; sizeKb: number; }
  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  // SEO panel state
  const [seoScore, setSeoScore] = useState<number | null>(null);
  const [seoChecks, setSeoChecks] = useState<Array<{ key: string; label: string; passed: boolean; detail?: string; points: number }>>([]);
  const [seoLoading, setSeoLoading] = useState(false);
  const [pageSpeed, setPageSpeed] = useState<{ mobile: number | null; desktop: number | null; seoScore: number | null } | null>(null);
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false);
  const [indexSubmitting, setIndexSubmitting] = useState(false);
  const [indexResult, setIndexResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Inject chatbot into existing site
  const [injectingBot, setInjectingBot] = useState(false);
  const [botSetupName, setBotSetupName] = useState("");
  const [botSetupAvatarUrl, setBotSetupAvatarUrl] = useState("");
  const [botAvatarGenerating, setBotAvatarGenerating] = useState(false);
  const [botSetupGreeting, setBotSetupGreeting] = useState("");
  const [botSetupPersonality, setBotSetupPersonality] = useState("");

  // Image generation panel
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgSize, setImgSize] = useState<"landscape" | "portrait" | "square">("landscape");
  const [imgStyle, setImgStyle] = useState<"photo" | "illustration" | "abstract">("photo");
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatedImgs, setGeneratedImgs] = useState<Array<{ url: string; prompt: string }>>([]);
  const [galleryImgs, setGalleryImgs] = useState<Array<{ url: string; ts: number; prompt?: string }>>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Favicon state
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Reviews state
  const [reviewsUrl, setReviewsUrl] = useState("");
  const [fetchingReviews, setFetchingReviews] = useState(false);
  const [fetchedReviews, setFetchedReviews] = useState<Array<{ name: string; rating: number; text: string; date?: string }>>([]);
  const [reviewsRating, setReviewsRating] = useState<number | undefined>();
  const [reviewsTotalReviews, setReviewsTotalReviews] = useState<number | undefined>();
  const [reviewsBusinessName, setReviewsBusinessName] = useState("");
  const [reviewsFetchTip, setReviewsFetchTip] = useState("");
  const [manualReviews, setManualReviews] = useState<Array<{ name: string; rating: number; text: string }>>([]);
  const [injectingReviews, setInjectingReviews] = useState(false);
  const reviewsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const liveHtmlRef = useRef("");
  const queuedRef = useRef<{ instruction: string; imageUrl?: string } | null>(null);
  queuedRef.current = queued;
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const versions = useRef<string[]>([]);

  const SECTION_LABELS: Record<string, string> = {
    hero: "Hero", header: "Header", about: "About", services: "Services",
    "our-services": "Services", contact: "Contact", footer: "Footer",
    testimonials: "Reviews", reviews: "Reviews", gallery: "Gallery",
    team: "Team", pricing: "Pricing", faq: "FAQ", blog: "Blog",
    portfolio: "Portfolio", features: "Features", clients: "Clients",
  };

  // Parse section jump targets from the preview HTML
  const sections = useMemo(() => {
    if (!previewHtml) return [];
    const matches = [...previewHtml.matchAll(/<(?:section|nav|header|footer|main|div)[^>]+(?:id=["']([^"']+)["']|class=["']([^"']+)["'])[^>]*>/gi)];
    const seen = new Set<string>();
    const result: Array<{ selector: string; label: string }> = [];
    for (const m of matches) {
      const id = m[1];
      const cls = m[2]?.split(/\s+/)[0];
      const key = id || cls || "";
      if (!key || seen.has(key) || key.length > 40) continue;
      seen.add(key);
      const selector = id ? `#${id}` : `.${cls}`;
      const label = SECTION_LABELS[key.toLowerCase()] ||
        (key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ").slice(0, 14));
      result.push({ selector, label });
      if (result.length >= 8) break;
    }
    return result;
  }, [previewHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  function scrollToSection(selector: string) {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    fetchSites();
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Auto-fire queued message when current edit finishes
  useEffect(() => {
    if (!isEditing && queuedRef.current) {
      const q = queuedRef.current;
      setQueued(null);
      sendEdit(q.instruction, q.imageUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Persist reviews to localStorage immediately + debounced save to DB
  useEffect(() => {
    if (!activeSite) return;
    const data = {
      url: reviewsUrl, fetchedReviews, manualReviews,
      rating: reviewsRating, totalReviews: reviewsTotalReviews,
      businessName: reviewsBusinessName, fetchTip: reviewsFetchTip,
    };
    // Instant local cache
    saveReviews(activeSite.slug, data);
    // Debounced DB save (1s after last change)
    if (reviewsSaveTimer.current) clearTimeout(reviewsSaveTimer.current);
    reviewsSaveTimer.current = setTimeout(() => {
      fetch("/api/site-factory/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug, reviews: data }),
      }).catch(() => { /* silent — localStorage is the fallback */ });
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite?.slug, reviewsUrl, fetchedReviews, manualReviews, reviewsRating, reviewsTotalReviews, reviewsBusinessName, reviewsFetchTip]);

  async function fetchSites() {
    setLoadingSites(true);
    try {
      const res = await fetch("/api/site-factory/list");
      const data = await res.json();
      if (data.sites) setSites(data.sites);
    } catch { console.error("Failed to fetch sites"); }
    setLoadingSites(false);
  }

  async function deleteSiteConfirmed() {
    if (!deletingSlug || deleteInProgress) return;
    setDeleteInProgress(true);
    try {
      const res = await fetch(`/api/site-factory/delete?slug=${encodeURIComponent(deletingSlug)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setSites(prev => prev.filter(s => s.slug !== deletingSlug));
        showToast("Site deleted");
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch (e) { showToast(String(e), "error"); }
    setDeleteInProgress(false);
    setDeletingSlug(null);
    setDeleteConfirmName("");
  }

  async function fetchDomains(slug: string) {
    try {
      const res = await fetch(`/api/site-factory/domain?slug=${slug}`);
      const data = await res.json();
      setDomains(data.domains || []);
    } catch { /* ignore */ }
  }

  function openEditor(site: Site) {
    setActiveSite(site);
    const saved = loadMsgs(site.slug);
    const initial: Message[] = saved.length > 0
      ? saved
      : [{ role: "assistant", content: `Site loaded. What would you like to change on **${site.name}**?`, ts: Date.now() }];
    setMessages(initial);
    setPreviewHtml("");
    versions.current = [];
    setVersionIdx(-1);
    setPendingImage(null);
    setHasDraft(false);
    setUnpublishedCount(0);
    setGalleryImgs([]);
    setGeneratedImgs([]);
    fetchDomains(site.slug);
    loadGallery(site.slug);
    // Pre-populate Bot panel with existing chatbot config
    if (site.chatbot) {
      setBotSetupName(site.chatbot.name || "");
      setBotSetupGreeting(site.chatbot.greeting || "");
      setBotSetupAvatarUrl(site.chatbot.avatarUrl || "");
    }

    // Restore reviews: show localStorage immediately, then hydrate from DB
    const applyReviews = (r: ReviewsData | null) => {
      setReviewsUrl(r?.url || "");
      setFetchedReviews(r?.fetchedReviews || []);
      setManualReviews(r?.manualReviews || []);
      setReviewsRating(r?.rating);
      setReviewsTotalReviews(r?.totalReviews);
      setReviewsBusinessName(r?.businessName || "");
      setReviewsFetchTip(r?.fetchTip || "");
    };
    applyReviews(loadReviews(site.slug));
    fetch(`/api/site-factory/reviews?slug=${site.slug}`)
      .then(r => r.json())
      .then(d => { if (d.ok && d.reviews) applyReviews(d.reviews); })
      .catch(() => { /* stay with localStorage data */ });

    fetch(`/api/site-factory/load-draft?slug=${site.slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.html) { setPreviewHtml(d.html); versions.current = [d.html]; }
        setHasDraft(!!d.hasDraft);
      })
      .catch(() => {});

    setPhase("editing");
    // On mobile: keep sidebar closed so preview is visible first
    if (isMobile) setSidebarOpen(false);
  }

  async function uploadFile(file: File) {
    if (!activeSite) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", activeSite.slug);
      const res = await fetch("/api/site-factory/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setPendingImage({ url: data.url, name: file.name });
      } else {
        alert("Upload failed: " + (data.error || "unknown"));
      }
    } catch (e) { alert("Upload error: " + String(e)); }
    setUploading(false);
  }

  function handleSendOrQueue() {
    const text = instruction.trim();
    const imageUrl = pendingImage?.url;
    if (!text && !imageUrl) return;
    if (isEditing) {
      setQueued({ instruction: text, imageUrl });
      setInstruction("");
      setPendingImage(null);
    } else {
      sendEdit();
    }
  }

  async function sendEdit(overrideText?: string, overrideImageUrl?: string) {
    const text = overrideText !== undefined ? overrideText : instruction.trim();
    const imageUrl = overrideImageUrl !== undefined ? overrideImageUrl : pendingImage?.url;
    if ((!text && !imageUrl) || !activeSite || isEditing) return;

    const displayContent = text || `[Image]`;

    const userMsg: Message = { role: "user", content: displayContent, ts: Date.now(), imageUrl };
    const historyForApi = [...messages];
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    if (overrideText === undefined) setInstruction("");
    if (overrideImageUrl === undefined) setPendingImage(null);
    setIsEditing(true);

    // Start with empty streaming message
    const assistantMsg: Message = { role: "assistant", content: "", ts: Date.now() };
    const withAssistant = [...nextMsgs, assistantMsg];
    setMessages(withAssistant);

    try {
      const res = await fetch("/api/site-factory/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: activeSite.slug,
          instruction: text || "Apply the uploaded image to the site",
          imageUrl,
          history: historyForApi.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Stream chunks — update message in real-time (strip internal markers from display)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        const displayText = fullText
          .replace(/<CHANGES>[\s\S]*?<\/CHANGES>/g, "")
          .replace(/<CHANGES>[\s\S]*$/g, "")
          .replace(/<HTML>[A-Za-z0-9+/=]*<\/HTML>/g, "")
          .replace(/<HTML>[A-Za-z0-9+/=]*$/g, "")
          .replace(/<RESULT>[\s\S]*?<\/RESULT>/g, "")
          .replace(/<RESULT>[\s\S]*$/g, "")
          .trim();

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: displayText };
          return updated;
        });
      }

      // Parse result marker
      const resultMatch = fullText.match(/<RESULT>(.*?)<\/RESULT>/);
      const opsApplied = resultMatch ? (JSON.parse(resultMatch[1]).opsApplied as number) : 0;

      let newHtml: string | null = null;
      if (opsApplied > 0) {
        // Use inline HTML from stream (avoids CDN propagation delay)
        const htmlMatch = fullText.match(/<HTML>([A-Za-z0-9+/=]+)<\/HTML>/);
        if (htmlMatch) {
          try {
            const bin = atob(htmlMatch[1]);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            newHtml = new TextDecoder().decode(bytes);
          } catch { /* fall through to fetch */ }
        }
        // Fallback: fetch from server (catches cases where HTML wasn't inlined)
        if (!newHtml) {
          const htmlRes = await fetch(`/sites/${activeSite.slug}?t=${Date.now()}`);
          newHtml = await htmlRes.text();
        }
        versions.current = [...versions.current.slice(0, versionIdx === -1 ? versions.current.length : versionIdx + 1), newHtml];
        setVersionIdx(-1);
        setPreviewHtml(newHtml);
        setIframeKey(k => k + 1);
        setHasDraft(true);
        setUnpublishedCount(c => c + 1);
        if (seoEditPendingRef.current) {
          seoEditPendingRef.current = false;
          loadSeoScore(activeSite.slug);
        }
      }

      // Finalise the assistant message
      let displayText = fullText
        .replace(/<CHANGES>[\s\S]*?<\/CHANGES>/g, "")
        .replace(/<HTML>[A-Za-z0-9+/=]*<\/HTML>/g, "")
        .replace(/<RESULT>[\s\S]*?<\/RESULT>/g, "")
        .trim();

      const hadChanges = /<CHANGES>/.test(fullText);
      if (hadChanges && opsApplied === 0) {
        displayText += "\n\nThe change didn't apply — the text I targeted wasn't found exactly in the HTML. Try describing what you want changed in your own words and I'll have another go.";
      }
      // Fallback: if AI made changes but wrote no visible text, add a confirmation
      if (opsApplied > 0 && !displayText.trim()) {
        displayText = `Done. ${opsApplied} change${opsApplied > 1 ? "s" : ""} applied to the site. Check the preview on the right.`;
      }

      const finalMsgs = withAssistant.map((m, i) =>
        i === withAssistant.length - 1
          ? { ...m, content: displayText, ...(newHtml ? { htmlSnapshot: newHtml } : {}) }
          : m
      );
      setMessages(finalMsgs);
      storeMsgs(activeSite.slug, finalMsgs);

      if (isMobile && newHtml) setSidebarOpen(false);

      // Fetch suggestion chips after every response
      {
        const capturedHtml = newHtml;
        const slugForSugg = activeSite.slug;
        const msgTs = assistantMsg.ts;
        fetch("/api/site-factory/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastInstruction: text, siteName: activeSite.name, niche: activeSite.niche, history: finalMsgs }),
        }).then(r => r.json()).then(({ suggestions }) => {
          if (!Array.isArray(suggestions) || suggestions.length === 0) return;
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            const isMatch = capturedHtml
              ? last?.htmlSnapshot === capturedHtml
              : last?.role === "assistant" && last?.ts === msgTs;
            if (isMatch) {
              updated[updated.length - 1] = { ...last, suggestions };
              storeMsgs(slugForSugg, updated);
            }
            return updated;
          });
        }).catch(() => {});
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: String(e) };
        return updated;
      });
    }
    setIsEditing(false);
  }

  function restoreLocalVersion(html: string, idx: number) {
    setPreviewHtml(html);
    setVersionIdx(idx);
    setIframeKey(k => k + 1);
  }

  function undoLast() {
    const v = versions.current;
    const target = versionIdx === -1 ? v.length - 2 : versionIdx - 1;
    if (target >= 0) restoreLocalVersion(v[target], target);
  }

  const startPreviewUpdater = useCallback(() => {
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    previewTimerRef.current = setInterval(() => {
      if (liveHtmlRef.current) setStreamedHtml(liveHtmlRef.current);
    }, 700);
  }, []);

  const stopPreviewUpdater = useCallback(() => {
    if (previewTimerRef.current) { clearInterval(previewTimerRef.current); previewTimerRef.current = null; }
  }, []);

  async function injectChatbot(overrideAvatarUrl?: string) {
    if (!activeSite) return;
    setInjectingBot(true);
    const resolvedAvatarUrl = overrideAvatarUrl !== undefined ? overrideAvatarUrl : botSetupAvatarUrl;
    try {
      const res = await fetch("/api/site-factory/inject-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: activeSite.slug,
          botName: botSetupName || undefined,
          greeting: botSetupGreeting || undefined,
          personality: botSetupPersonality || undefined,
          avatarUrl: resolvedAvatarUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Reload preview from draft
        const loadRes = await fetch(`/api/site-factory/load-draft?slug=${activeSite.slug}`);
        const { html } = await loadRes.json();
        setPreviewHtml(html);
        setIframeKey(k => k + 1);
        setHasDraft(true);
        setUnpublishedCount(c => c + 1);
        // Update local site state so Bot panel stays populated on next open
        setActiveSite(prev => prev ? { ...prev, chatbot: { enabled: true, name: data.botName, greeting: botSetupGreeting, avatarUrl: resolvedAvatarUrl || undefined } } : prev);
        setActivePanel("chat");
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `${data.botName} chatbot deployed to ${activeSite.name}.${resolvedAvatarUrl ? " Avatar saved." : ""}`,
          ts: Date.now(),
          ...(resolvedAvatarUrl ? { imageUrl: resolvedAvatarUrl } : {}),
        }]);
      } else {
        alert("Failed: " + (data.error || "unknown error"));
      }
    } catch (e) { alert(String(e)); }
    setInjectingBot(false);
  }

  async function generateSiteImage() {
    if (!imgPrompt.trim() || !activeSite || generatingImg) return;
    setGeneratingImg(true);
    try {
      const res = await fetch("/api/site-factory/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imgPrompt.trim(),
          slug: activeSite.slug,
          niche: activeSite.niche,
          size: imgSize,
          style: imgStyle,
        }),
      });
      const data = await res.json().catch(() => ({ error: res.status === 504 ? "Generation timed out — try a simpler prompt or try again" : `Server error ${res.status}` }));
      if (data.ok && data.url) {
        const newImg = { url: data.url, prompt: imgPrompt.trim(), ts: Date.now() };
        setGeneratedImgs(prev => [{ url: data.url, prompt: imgPrompt.trim() }, ...prev.slice(0, 19)]);
        setGalleryImgs(prev => [newImg, ...prev]);
        setImgPrompt("");
      } else {
        alert(data.error || "Image generation failed");
      }
    } catch (e) { alert(String(e)); }
    setGeneratingImg(false);
  }

  async function setHeroImage(imageUrl: string) {
    if (!activeSite || isEditing) return;
    setIsEditing(true);
    try {
      const res = await fetch("/api/site-factory/set-hero-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug, imageUrl }),
      });
      const data = await res.json();
      if (data.ok && data.html) {
        versions.current = [...versions.current, data.html];
        setVersionIdx(-1);
        setPreviewHtml(data.html);
        setIframeKey(k => k + 1);
        setHasDraft(true);
        setUnpublishedCount(c => c + 1);
        showToast("Image replaced successfully");
      } else {
        showToast(data.error || "Could not replace hero image", "error");
      }
    } catch (e) {
      showToast(String(e), "error");
    }
    setIsEditing(false);
  }

  async function deleteGalleryImage(url: string) {
    if (!activeSite) return;
    try {
      await fetch("/api/site-factory/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug, url }),
      });
      setGalleryImgs(prev => prev.filter(img => img.url !== url));
    } catch { /* non-fatal */ }
  }

  async function loadSeoScore(slug: string) {
    setSeoLoading(true);
    setSeoScore(null);
    setSeoChecks([]);
    setPageSpeed(null);
    setIndexResult(null);
    try {
      const res = await fetch(`/api/site-factory/seo-score?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.ok) { setSeoScore(data.score); setSeoChecks(data.checks); }
    } catch { /* non-fatal */ }
    setSeoLoading(false);
  }

  async function loadPageSpeed(slug: string) {
    setPageSpeedLoading(true);
    try {
      const res = await fetch(`/api/site-factory/seo-score?slug=${encodeURIComponent(slug)}&pagespeed=1`);
      const data = await res.json();
      if (data.ok) setPageSpeed(data.pageSpeed);
    } catch { /* non-fatal */ }
    setPageSpeedLoading(false);
  }

  async function submitToGoogle() {
    if (!activeSite || indexSubmitting) return;
    setIndexSubmitting(true);
    setIndexResult(null);
    try {
      const res = await fetch("/api/site-factory/submit-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug }),
      });
      const data = await res.json();
      if (data.needsSetup) {
        setIndexResult({ ok: false, msg: "Google service account not configured yet" });
      } else if (data.ok) {
        setIndexResult({ ok: true, msg: "Submitted — Google will crawl within hours" });
      } else {
        setIndexResult({ ok: false, msg: data.error || "Submission failed" });
      }
    } catch (e) { setIndexResult({ ok: false, msg: String(e) }); }
    setIndexSubmitting(false);
  }

  async function loadFavicon(slug: string) {
    try {
      const res = await fetch(`/api/site-factory/favicon?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setFaviconUrl(data.url ?? null);
    } catch { /* non-fatal */ }
  }

  async function uploadFavicon(file: File) {
    if (!activeSite || faviconUploading) return;
    setFaviconUploading(true);
    try {
      const fd = new FormData();
      fd.append("slug", activeSite.slug);
      fd.append("file", file);
      const res = await fetch("/api/site-factory/favicon", { method: "PUT", body: fd });
      const data = await res.json();
      if (data.ok) {
        setFaviconUrl(data.url);
        showToast("Favicon updated");
      } else {
        showToast(data.error || "Upload failed", "error");
      }
    } catch (e) { showToast(String(e), "error"); }
    setFaviconUploading(false);
  }

  async function loadGallery(slug: string) {
    setGalleryLoading(true);
    try {
      const res = await fetch(`/api/site-factory/images?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.ok) {
        // Merge blob images with session prompt data where available
        setGalleryImgs(prev => {
          const sessionMap = new Map(prev.map(img => [img.url, img.prompt]));
          return (data.images as Array<{ url: string; ts: number }>).map(img => ({
            ...img,
            prompt: sessionMap.get(img.url),
          }));
        });
      }
    } catch { /* non-fatal */ }
    setGalleryLoading(false);
  }

  async function generateBotAvatar() {
    if (!activeSite || botAvatarGenerating) return;
    setBotAvatarGenerating(true);
    const name = botSetupName.trim() || activeSite.name;
    try {
      const res = await fetch("/api/site-factory/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `professional portrait photo of a friendly AI assistant named ${name}, warm smile, clean neutral background, looking directly at camera`,
          slug: activeSite.slug,
          niche: activeSite.niche,
          size: "square",
          style: "photo",
        }),
      });
      const data = await res.json().catch(() => ({ error: res.status === 504 ? "Generation timed out — try again" : `Server error ${res.status}` }));
      if (data.ok && data.url) {
        setBotSetupAvatarUrl(data.url);
      } else {
        alert(data.error || "Image generation failed");
      }
    } catch (e) { alert(String(e)); }
    setBotAvatarGenerating(false);
  }

  async function fetchReviews() {
    if (!reviewsUrl.trim() || fetchingReviews) return;
    setFetchingReviews(true);
    setFetchedReviews([]);
    setReviewsFetchTip("");
    try {
      const res = await fetch("/api/site-factory/fetch-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reviewsUrl.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.reviews?.length > 0) setFetchedReviews(data.reviews);
        if (data.rating) setReviewsRating(data.rating);
        if (data.totalReviews) setReviewsTotalReviews(data.totalReviews);
        if (data.businessName) setReviewsBusinessName(data.businessName);
        if (data.tip) setReviewsFetchTip(data.tip);
        if (!data.reviews?.length && !data.tip) setReviewsFetchTip("No reviews found — add them manually below.");
      } else {
        setReviewsFetchTip(data.tip || data.error || "Fetch failed — add reviews manually below.");
      }
    } catch (e) {
      setReviewsFetchTip("Fetch failed: " + String(e));
    }
    setFetchingReviews(false);
  }

  async function injectReviewsToSite() {
    if (!activeSite) return;
    const allReviews = [...fetchedReviews, ...manualReviews].filter(r => r.text?.trim());
    if (allReviews.length === 0) { alert("Add at least one review first."); return; }
    setInjectingReviews(true);
    try {
      const res = await fetch("/api/site-factory/inject-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: activeSite.slug,
          reviews: allReviews,
          rating: reviewsRating,
          totalReviews: reviewsTotalReviews,
          businessName: reviewsBusinessName || activeSite.name,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.html) {
          try {
            const bin = atob(data.html);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const newHtml = new TextDecoder().decode(bytes);
            versions.current = [...versions.current, newHtml];
            setVersionIdx(-1);
            setPreviewHtml(newHtml);
            setIframeKey(k => k + 1);
            setHasDraft(true);
            setUnpublishedCount(c => c + 1);
          } catch { /* fallback — preview will be stale but blob is updated */ }
        }
        setActivePanel("chat");
        const count = allReviews.length;
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Reviews carousel added to ${activeSite.name} — ${count} review${count !== 1 ? "s" : ""} showing.`,
          ts: Date.now(),
        }]);
      } else {
        alert("Failed: " + (data.error || "unknown error"));
      }
    } catch (e) { alert(String(e)); }
    setInjectingReviews(false);
  }

  async function uploadBotAvatar(file: File) {
    if (!activeSite) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", activeSite.slug);
      const res = await fetch("/api/site-factory/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setBotSetupAvatarUrl(data.url);
        // Re-inject immediately so the live site reflects the new avatar
        await injectChatbot(data.url);
      } else {
        alert("Upload failed: " + (data.error || "unknown"));
      }
    } catch (e) { alert("Upload error: " + String(e)); }
  }

  async function extractBrief() {
    if (!briefText.trim() && !briefUrl.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/site-factory/extract-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: briefText.trim(), url: briefUrl.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);

      if (d.businessName) setBusinessName(d.businessName);
      if (d.niche) { setNiche(d.niche); if (!themeOverridden) setStyle(NICHE_THEME_DEFAULT[d.niche] ?? "slate"); }
      if (d.location) setLocation(d.location);
      if (d.phone) setPhone(d.phone);
      if (d.email) setEmail(d.email);
      if (d.address) setAddress(d.address);
      if (d.services) setServices(d.services);
      if (d.description) setDescription(d.description);

      setExtracted(true);
      const count = Object.keys(d).filter(k => d[k]).length;
      showToast(`Extracted ${count} detail${count !== 1 ? "s" : ""} from brief`);
    } catch (e) {
      showToast("Extraction failed — " + String(e), "error");
    } finally {
      setExtracting(false);
    }
  }

  async function generateSite(force = false) {
    if (!businessName.trim()) return;
    const slug = slugify(businessName.trim());

    if (!force) {
      const existing = sites.find(s => s.slug === slug);
      if (existing) {
        setOverwriteConfirm({ slug, name: businessName.trim(), existingSite: existing });
        return;
      }
    }

    setPhase("generating");
    setGenCharCount(0);
    setStreamedHtml("");
    liveHtmlRef.current = "";
    const chatbotPayload = chatbotEnabled ? {
      name: chatbotName || undefined,
      greeting: chatbotGreeting || undefined,
      personality: chatbotPersonality || undefined,
    } : { enabled: false };

    if (siteType === "multi") {
      const pages = NICHE_PAGES[niche] ?? DEFAULT_PAGES;
      setMultiPageProgress(pages.map(p => ({ ...p, status: "pending" as const })));

      try {
        const buildMultiPayload = (confirmDuplicate = false) => JSON.stringify({
          businessName: businessName.trim(), niche, location,
          services: services.split(",").map(s => s.trim()).filter(Boolean),
          phone, email, address, style, description: description.trim(),
          pages, chatbot: chatbotPayload, confirmDuplicate,
        });

        let res = await fetch("/api/site-factory/generate-multi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: buildMultiPayload(),
        });

        if (res.status === 409) {
          const { error } = await res.json();
          const confirmed = window.confirm(`${error}\n\nCreate another site for this business?`);
          if (!confirmed) { setMultiPageProgress([]); setPhase("new"); return; }
          res = await fetch("/api/site-factory/generate-multi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: buildMultiPayload(true),
          });
        }

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === "page_start") {
                setMultiPageProgress(prev => prev.map(p => p.slug === ev.page ? { ...p, status: "building" } : p));
              } else if (ev.type === "page_done") {
                setMultiPageProgress(prev => prev.map(p => p.slug === ev.page ? { ...p, status: "done" } : p));
              } else if (ev.type === "page_error") {
                setMultiPageProgress(prev => prev.map(p => p.slug === ev.page ? { ...p, status: "error" } : p));
              } else if (ev.type === "done") {
                await fetchSites();
                const fakeSite: Site = { id: `site_${Date.now()}`, slug, name: businessName.trim(), niche, status: "live", url: `https://www.saabai.ai/sites/${slug}/`, createdAt: Date.now() };
                setTimeout(() => { setMultiPageProgress([]); openEditor(fakeSite); }, 1200);
              }
            } catch { /* skip malformed event */ }
          }
        }
      } catch (e) {
        setMultiPageProgress([]);
        alert("Error: " + String(e));
        setPhase("list");
      }
      return;
    }

    // Single-page generation
    startPreviewUpdater();
    try {
      const buildPayload = (confirmDuplicate = false) => JSON.stringify({
        businessName: businessName.trim(), niche, location,
        services: services.split(",").map(s => s.trim()).filter(Boolean),
        phone, email, address, style, description: description.trim(),
        chatbot: chatbotPayload, confirmDuplicate,
      });

      let res = await fetch("/api/site-factory/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: buildPayload(),
      });

      if (res.status === 409) {
        const { error } = await res.json();
        const confirmed = window.confirm(`${error}\n\nCreate another site for this business?`);
        if (!confirmed) { stopPreviewUpdater(); setPhase("new"); return; }
        res = await fetch("/api/site-factory/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: buildPayload(true),
        });
      }

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        liveHtmlRef.current = html;
        setGenCharCount(html.length);
      }

      stopPreviewUpdater();
      setStreamedHtml(html);
      await fetchSites();
      const fakeSite: Site = { id: `site_${Date.now()}`, slug, name: businessName.trim(), niche, status: "live", url: `https://www.saabai.ai/sites/${slug}/`, createdAt: Date.now() };
      setTimeout(() => openEditor(fakeSite), 800);
    } catch (e) {
      stopPreviewUpdater();
      alert("Error: " + String(e));
      setPhase("list");
    }
  }

  async function addDomain() {
    if (!newDomain.trim() || !activeSite) return;
    setDnsLoading(true);
    setDnsResult(null);
    try {
      const res = await fetch("/api/site-factory/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug, domain: newDomain.trim() }),
      });
      const data = await res.json();
      setDnsResult(data);
      if (data.ok) { setDomains(prev => prev.includes(data.domain) ? prev : [...prev, data.domain]); setNewDomain(""); }
    } catch (e) { alert(String(e)); }
    setDnsLoading(false);
  }

  async function removeDomain(domain: string) {
    if (!activeSite) return;
    await fetch("/api/site-factory/domain", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: activeSite.slug, domain }) });
    setDomains(prev => prev.filter(d => d !== domain));
    setDnsCheckResults(prev => { const n = { ...prev }; delete n[domain]; return n; });
  }

  async function checkDns(domain: string) {
    setDnsCheckResults(prev => ({ ...prev, [domain]: { live: false, checking: true } }));
    try {
      const res = await fetch(`/api/site-factory/domain-check?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      setDnsCheckResults(prev => ({ ...prev, [domain]: { live: data.live, checking: false } }));
    } catch {
      setDnsCheckResults(prev => ({ ...prev, [domain]: { live: false, checking: false } }));
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => showToast(`Copied ${label}`));
  }

  async function loadVersionHistory(slug: string) {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/site-factory/versions?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.versions) setVersionHistory(data.versions);
    } catch { /* non-fatal */ }
    setHistoryLoading(false);
  }

  async function restoreVersion(v: number) {
    if (!activeSite || restoringVersion !== null) return;
    if (!confirm(`Restore v${v}? The current live site will be saved as a snapshot first.`)) return;
    setRestoringVersion(v);
    try {
      const res = await fetch("/api/site-factory/restore-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug, v }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Restored to v${v}`);
        // Reload preview
        const htmlRes = await fetch(`/sites/${activeSite.slug}?t=${Date.now()}`);
        const newHtml = await htmlRes.text();
        versions.current = [...versions.current, newHtml];
        setVersionIdx(-1);
        setPreviewHtml(newHtml);
        setIframeKey(k => k + 1);
        // Refresh history list
        loadVersionHistory(activeSite.slug);
      } else {
        showToast(data.error || "Restore failed", "error");
      }
    } catch (e) { showToast(String(e), "error"); }
    setRestoringVersion(null);
  }

  async function publishDraft() {
    if (!activeSite || !hasDraft) return;
    try {
      const res = await fetch("/api/site-factory/publish-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug }),
      });
      const data = await res.json();
      if (data.ok) {
        setHasDraft(false);
        setUnpublishedCount(0);
        showToast("Changes published live — sitemap + robots.txt updated");
        // Refresh SEO score in background
        if (activeSite) loadSeoScore(activeSite.slug);
      } else {
        showToast(data.error || "Publish failed", "error");
      }
    } catch (e) { showToast(String(e), "error"); }
  }

  async function discardDraft() {
    if (!activeSite || !hasDraft) return;
    try {
      const res = await fetch("/api/site-factory/discard-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSite.slug }),
      });
      const data = await res.json();
      if (data.ok) {
        const loadRes = await fetch(`/api/site-factory/load-draft?slug=${activeSite.slug}`);
        const d = await loadRes.json();
        if (d.html) { setPreviewHtml(d.html); versions.current = [d.html]; setVersionIdx(-1); setIframeKey(k => k + 1); }
        setHasDraft(false);
        setUnpublishedCount(0);
        showToast("Draft discarded — reverted to live");
      } else {
        showToast(data.error || "Discard failed", "error");
      }
    } catch (e) { showToast(String(e), "error"); }
  }

  const inp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    width: "100%", padding: "9px 13px", borderRadius: 7,
    border: `1px solid ${C.border2}`, background: C.bg, color: C.text,
    fontSize: 13, outline: "none", boxSizing: "border-box", ...extra,
  });

  const lbl = (t: string) => (
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 5, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t}</label>
  );

  // ─── GENERATING ──────────────────────────────────────────────────────
  if (phase === "generating") {
    const isMulti = multiPageProgress.length > 0;
    const doneCount = multiPageProgress.filter(p => p.status === "done").length;
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, animation: "pulse 1.4s ease-in-out infinite" }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {isMulti ? `Building ${businessName} (${doneCount}/${multiPageProgress.length} pages)` : `Generating ${businessName}...`}
          </span>
          {!isMulti && <span style={{ fontSize: 12, color: C.textDim, fontVariantNumeric: "tabular-nums" }}>{(genCharCount / 1000).toFixed(1)}k chars</span>}
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {isMulti ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 32, padding: "40px 24px" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Building {multiPageProgress.length}-page site</p>
                <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>Each page is generated and saved independently. This takes 3-5 minutes.</p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
                {multiPageProgress.map((page, i) => {
                  const st = page.status;
                  const isBuilding = st === "building";
                  const isDone = st === "done";
                  const isError = st === "error";
                  const borderCol = isBuilding ? C.gold : isDone ? "#22c55e" : isError ? "#ef4444" : C.border2;
                  const bgCol = isBuilding ? C.goldBg : isDone ? "rgba(34,197,94,0.1)" : isError ? "rgba(239,68,68,0.1)" : C.surface;
                  const icon = isDone ? "✓" : isError ? "✗" : isBuilding ? null : String(i + 1);
                  return (
                    <div key={page.slug} style={{ width: 120, padding: "18px 12px", borderRadius: 10, border: `1.5px solid ${borderCol}`, background: bgCol, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "all .3s" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${borderCol}`, background: isBuilding ? "transparent" : bgCol, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: isBuilding ? C.gold : isDone ? "#22c55e" : isError ? "#ef4444" : C.textDim, animation: isBuilding ? "spin 1s linear infinite" : "none" }}>
                        {isBuilding ? null : icon}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isBuilding ? C.gold : isDone ? "#22c55e" : isError ? "#ef4444" : C.text }}>{page.label}</div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{st === "pending" ? "waiting" : st}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ width: "100%", maxWidth: 400 }}>
                <div style={{ height: 4, borderRadius: 4, background: C.border, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: C.gold, transition: "width .5s ease", width: `${Math.max(5, (doneCount / Math.max(multiPageProgress.length, 1)) * 100)}%` }} />
                </div>
                <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 12, color: C.textDim }}>{doneCount} of {multiPageProgress.length} pages complete</p>
              </div>
            </div>
          ) : streamedHtml ? (
            <iframe srcDoc={streamedHtml} style={{ width: "100%", height: "100%", border: "none" }} title="Preview" sandbox="allow-scripts allow-same-origin" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20, color: C.textDim }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${C.border2}`, borderTopColor: C.gold, animation: "spin 0.9s linear infinite" }} />
              <p style={{ margin: 0, fontSize: 14, color: C.text }}>Building your site — preview loads shortly</p>
            </div>
          )}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes toastIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
      </div>
    );
  }

  // ─── EDITING ─────────────────────────────────────────────────────────
  if (phase === "editing" && activeSite) {
    const canUndo = versions.current.length > 1 && (versionIdx === -1 ? versions.current.length - 1 : versionIdx) > 0;
    const liveUrl = `https://www.saabai.ai/sites/${activeSite.slug}/`;

    const sidebarWidth = isMobile ? "100%" : `${sidebarPx}px`;

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadBotAvatar(f); e.target.value = ""; }}
        />

        {/* Top bar */}
        <div style={{ padding: isMobile ? "8px 12px" : "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, flexShrink: 0, background: C.surface }}>
          <button onClick={() => { setPhase("list"); fetchSites(); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px", flexShrink: 0 }} title="Back">←</button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14 }}>{activeSite.name}</span>
            {!isMobile && <span style={{ fontSize: 11, color: C.textDim, marginLeft: 8, fontFamily: "monospace" }}>/sites/{activeSite.slug}/</span>}
          </div>

          {/* Draft indicator + publish/discard */}
          {hasDraft && (
            <>
              <button
                onClick={publishDraft}
                style={{ padding: isMobile ? "6px 12px" : "5px 14px", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                title="Publish all draft changes to live site"
              >
                ↑ Publish{unpublishedCount > 0 ? ` (${unpublishedCount})` : ""}
              </button>
              <button
                onClick={discardDraft}
                style={{ padding: isMobile ? "5px 8px" : "4px 8px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.textMuted, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                title="Discard all unpublished changes"
              >Discard</button>
            </>
          )}

          {/* Panel toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? "Hide chat panel" : "Show chat panel"}
            style={{ padding: isMobile ? "8px 14px" : "6px 14px", borderRadius: 6, border: `1.5px solid ${sidebarOpen ? C.teal : C.gold}`, background: sidebarOpen ? C.tealBg : C.goldBg, color: sidebarOpen ? C.teal : C.gold, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
          >
            <span style={{ fontSize: 14 }}>{sidebarOpen ? "◀" : "▶"}</span>
            <span>{sidebarOpen ? "Hide" : "Chat"}</span>
          </button>

          {/* Device toggles — hidden on mobile */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 4, border: `1px solid ${C.border2}`, borderRadius: 7, padding: 3 }}>
              {(["desktop", "tablet", "mobile"] as Device[]).map(d => (
                <button key={d} onClick={() => setDevice(d)} title={d} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: device === d ? C.surface2 : "none", color: device === d ? C.text : C.textDim, fontSize: 11, cursor: "pointer", fontWeight: device === d ? 600 : 400 }}>
                  {d === "desktop" ? "⬛ Desktop" : d === "tablet" ? "▪ Tablet" : "▫ Mobile"}
                </button>
              ))}
            </div>
          )}

          {!isMobile && <button onClick={canUndo ? undoLast : undefined} disabled={!canUndo} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: canUndo ? C.textDim : C.textMuted, fontSize: 12, cursor: canUndo ? "pointer" : "default" }}>Undo</button>}
          {!isMobile && <button onClick={() => { switchPanel("image"); setSidebarOpen(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${activePanel === "image" && sidebarOpen ? "#a855f7" : C.border2}`, background: activePanel === "image" && sidebarOpen ? "rgba(168,85,247,0.1)" : "none", color: activePanel === "image" && sidebarOpen ? "#a855f7" : C.textDim, fontSize: 12, cursor: "pointer" }}>🎨 Image</button>}
          {!isMobile && <button onClick={() => { setActivePanel("bot"); setSidebarOpen(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${activePanel === "bot" && sidebarOpen ? C.gold : C.border2}`, background: activePanel === "bot" && sidebarOpen ? C.goldBg : "none", color: activePanel === "bot" && sidebarOpen ? C.gold : C.textDim, fontSize: 12, cursor: "pointer" }}>🤖 Bot</button>}
          {!isMobile && <button onClick={() => { setActivePanel("dns"); setSidebarOpen(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${activePanel === "dns" && sidebarOpen ? C.teal : C.border2}`, background: activePanel === "dns" && sidebarOpen ? C.tealBg : "none", color: activePanel === "dns" && sidebarOpen ? C.teal : C.textDim, fontSize: 12, cursor: "pointer" }}>DNS</button>}
          {!isMobile && <button onClick={() => { setActivePanel("reviews"); setSidebarOpen(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${activePanel === "reviews" && sidebarOpen ? "#f97316" : C.border2}`, background: activePanel === "reviews" && sidebarOpen ? "rgba(249,115,22,0.1)" : "none", color: activePanel === "reviews" && sidebarOpen ? "#f97316" : C.textDim, fontSize: 12, cursor: "pointer" }}>★ Reviews</button>}
          {!isMobile && <button onClick={() => { switchPanel("seo"); setSidebarOpen(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${activePanel === "seo" && sidebarOpen ? "#22c55e" : C.border2}`, background: activePanel === "seo" && sidebarOpen ? "rgba(34,197,94,0.1)" : "none", color: activePanel === "seo" && sidebarOpen ? "#22c55e" : C.textDim, fontSize: 12, cursor: "pointer" }}>📈 SEO</button>}
          {!isMobile && <button onClick={() => { switchPanel("history"); setSidebarOpen(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${activePanel === "history" && sidebarOpen ? "#a78bfa" : C.border2}`, background: activePanel === "history" && sidebarOpen ? "rgba(167,139,250,0.1)" : "none", color: activePanel === "history" && sidebarOpen ? "#a78bfa" : C.textDim, fontSize: 12, cursor: "pointer" }}>⏱ History</button>}
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ padding: isMobile ? "6px 10px" : "5px 14px", borderRadius: 6, background: C.teal, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>↗</a>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* ── Sidebar (Chat + DNS) ─────────────────────────────── */}
          {sidebarOpen && (
            <div
              ref={sidebarDivRef}
              style={{
                width: sidebarWidth,
                flexShrink: 0,
                borderRight: isMobile ? "none" : `1px solid ${C.border}`,
                display: "flex",
                flexDirection: "column",
                background: C.surface,
                overflow: "hidden",
                ...(isMobile ? { position: "absolute", inset: 0, zIndex: 50 } : {}),
              }}>

              {/* Mobile: device + undo strip */}
              {isMobile && (
                <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, alignItems: "center" }}>
                  <button onClick={canUndo ? undoLast : undefined} disabled={!canUndo} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: canUndo ? C.textDim : C.textMuted, fontSize: 11, cursor: canUndo ? "pointer" : "default" }}>Undo</button>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 3, border: `1px solid ${C.border2}`, borderRadius: 6, padding: 2 }}>
                    {(["desktop", "tablet", "mobile"] as Device[]).map(d => (
                      <button key={d} onClick={() => { setDevice(d); setSidebarOpen(false); }} title={d} style={{ padding: "5px 8px", borderRadius: 4, border: "none", background: device === d ? C.surface2 : "none", color: device === d ? C.text : C.textDim, fontSize: 10, cursor: "pointer" }}>
                        {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab bar ──────────────────────────────────────── */}
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {([
                  { id: "chat",  label: "Chat",  accent: C.teal },
                  { id: "image", label: "Image", accent: "#a855f7" },
                  { id: "bot",   label: "Bot",   accent: C.gold },
                  { id: "dns",     label: "DNS",     accent: "#64748b" },
                  { id: "reviews", label: "Reviews", accent: "#f97316" },
                  { id: "history", label: "History", accent: "#a78bfa" },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => switchPanel(tab.id)}
                    style={{
                      flex: 1, padding: "11px 0 9px", background: "none", border: "none",
                      borderBottom: `2px solid ${activePanel === tab.id ? tab.accent : "transparent"}`,
                      color: activePanel === tab.id ? tab.accent : C.textMuted,
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      transition: "color 0.15s, border-color 0.15s",
                    }}
                  >{tab.label}</button>
                ))}
              </div>

              {/* ── Panel: DNS ──────────────────────────────────── */}
              {activePanel === "dns" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Current URL */}
                  <div>
                    <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current URL</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: C.textDim, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{liveUrl}</span>
                      <button onClick={() => copyText(liveUrl, "URL")} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 12, padding: "0 2px", flexShrink: 0 }} title="Copy">⎘</button>
                    </div>
                  </div>

                  {/* Saved domains with check status */}
                  {domains.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Custom Domains</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {domains.map(d => {
                          const check = dnsCheckResults[d];
                          return (
                            <div key={d} style={{ padding: "7px 10px", background: C.bg, borderRadius: 6, border: `1px solid ${check?.live ? "rgba(15,157,142,0.4)" : C.border}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, fontFamily: "monospace", color: C.teal, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{d}</span>
                                {check?.live && <span style={{ fontSize: 10, color: C.teal, fontWeight: 700 }}>● Live</span>}
                                {check && !check.live && !check.checking && <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>⧗ Pending DNS</span>}
                                <button
                                  onClick={() => checkDns(d)}
                                  disabled={check?.checking}
                                  style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 10, cursor: check?.checking ? "not-allowed" : "pointer", flexShrink: 0 }}
                                >
                                  {check?.checking ? "..." : "Check"}
                                </button>
                                <button onClick={() => removeDomain(d)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>×</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add domain */}
                  <div>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Add Custom Domain</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={newDomain}
                        onChange={e => setNewDomain(e.target.value)}
                        placeholder="clientdomain.com.au"
                        style={inp({ flex: 1, fontSize: 12, padding: "7px 10px" })}
                        onKeyDown={e => e.key === "Enter" && addDomain()}
                      />
                      <button
                        onClick={addDomain}
                        disabled={dnsLoading || !newDomain.trim()}
                        style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: dnsLoading || !newDomain.trim() ? C.border2 : C.teal, color: dnsLoading || !newDomain.trim() ? C.textMuted : "#fff", fontSize: 12, fontWeight: 600, cursor: dnsLoading || !newDomain.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}
                      >
                        {dnsLoading ? "..." : "Add"}
                      </button>
                    </div>
                    {dnsResult && !dnsResult.ok && (
                      <p style={{ margin: "5px 0 0", fontSize: 11, color: C.red }}>{dnsResult.vercelError || "Failed to add domain"}</p>
                    )}
                    {dnsResult?.ok && !dnsResult.vercelConnected && (
                      <p style={{ margin: "5px 0 0", fontSize: 11, color: C.gold }}>Saved. Add VERCEL_ACCESS_TOKEN env var to auto-register with Vercel.</p>
                    )}
                    {dnsResult?.ok && dnsResult.vercelConnected && (
                      <p style={{ margin: "5px 0 0", fontSize: 11, color: C.teal }}>Domain registered with Vercel. Now set DNS records below.</p>
                    )}
                  </div>

                  {/* DNS records — always visible */}
                  <div style={{ background: C.bg, borderRadius: 8, border: `1px solid ${C.border2}`, overflow: "hidden" }}>
                    <div style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>DNS Records to Set</span>
                      <span style={{ fontSize: 10, color: C.textMuted }}>Send these to your client</span>
                    </div>
                    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>
                        Client logs in to their domain registrar (GoDaddy, CrazyDomains, Cloudflare, etc.) → <strong style={{ color: C.text }}>DNS Management</strong> → adds these records:
                      </p>

                      {[
                        { type: "CNAME", name: "www", value: "cname.vercel-dns.com", use: "www.domain.com.au" },
                        { type: "A", name: "@", value: "76.76.21.21", use: "domain.com.au (no www)" },
                      ].map(r => (
                        <div key={r.type} style={{ padding: "10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, background: r.type === "CNAME" ? "rgba(15,157,142,0.15)" : "rgba(201,162,39,0.15)", color: r.type === "CNAME" ? C.teal : C.gold, padding: "2px 7px", borderRadius: 3 }}>{r.type}</span>
                            <span style={{ fontSize: 10, color: C.textMuted }}>for {r.use}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div>
                              <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name / Host</p>
                              <code style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{r.name}</code>
                            </div>
                            <div>
                              <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Value / Points to</p>
                              <code style={{ fontSize: 11, color: C.text, wordBreak: "break-all" }}>{r.value}</code>
                            </div>
                          </div>
                          <button
                            onClick={() => copyText(r.value, `${r.type} value`)}
                            style={{ width: "100%", padding: "6px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 11, cursor: "pointer" }}
                          >
                            Copy {r.type} value
                          </button>
                        </div>
                      ))}

                      <div style={{ padding: "8px 10px", background: "rgba(201,162,39,0.05)", borderRadius: 6, border: `1px solid rgba(201,162,39,0.2)` }}>
                        <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>
                          <strong style={{ color: C.gold }}>Which to use?</strong><br />
                          Add <strong>CNAME</strong> → for <code style={{ fontSize: 10 }}>www.domain.com.au</code><br />
                          Add <strong>A record</strong> → for <code style={{ fontSize: 10 }}>domain.com.au</code> (no www)<br />
                          Add <strong>both</strong> → for either version<br />
                          <span style={{ color: C.textMuted, fontSize: 10 }}>TTL: leave as default. Takes 5–60 mins to go live.</span>
                        </p>
                      </div>

                      <button
                        onClick={() => copyText(
                          `Hi,\n\nTo point your domain to your new website, please log in to wherever your domain is registered (GoDaddy, CrazyDomains, Cloudflare, etc.) and go to DNS Management.\n\nAdd the following DNS records:\n\nFor www.yourdomain.com.au:\n  Type: CNAME\n  Name: www\n  Value: cname.vercel-dns.com\n\nFor yourdomain.com.au (no www):\n  Type: A\n  Name: @ (or leave blank)\n  Value: 76.76.21.21\n\nIf you want both to work, add both records.\nLeave TTL as default. Changes take 5–60 minutes.\n\nLet me know once done and I'll confirm everything is live.`,
                          "email template"
                        )}
                        style={{ width: "100%", padding: "8px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 11, cursor: "pointer" }}
                      >
                        Copy client email template
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* ── Panel: Image ─────────────────────────────────── */}
              {activePanel === "image" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Favicon — compact single row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.border2}`, background: C.surface }}>
                    <div style={{ width: 24, height: 24, borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {faviconUrl
                        ? <img src={`${faviconUrl}?t=${Date.now()}`} alt="favicon" style={{ width: 20, height: 20, objectFit: "contain" }} />
                        : <span style={{ fontSize: 12 }}>🌐</span>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", flex: 1 }}>Favicon</span>
                    <span style={{ fontSize: 10, color: C.textMuted }}>{faviconUrl ? "Active" : "None"}</span>
                    <button
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={faviconUploading}
                      style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: faviconUploading ? C.textMuted : C.textDim, fontSize: 10, cursor: faviconUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                    >
                      {faviconUploading
                        ? <><div style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${C.textMuted}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />…</>
                        : "Upload"}
                    </button>
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept=".png,.ico,.svg,image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { uploadFavicon(f); e.target.value = ""; } }}
                  />

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>AI Image Generator</span>
                    <span style={{ fontSize: 10, color: C.textMuted, background: C.surface, border: `1px solid ${C.border2}`, padding: "1px 7px", borderRadius: 20 }}>GPT-Image · HD</span>
                    {isEditing && (
                      <span style={{ marginLeft: "auto", fontSize: 10, color: C.teal, display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${C.teal}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                        Applying…
                      </span>
                    )}
                  </div>

                  {/* Prompt input */}
                  <textarea
                    value={imgPrompt}
                    onChange={e => setImgPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateSiteImage(); } }}
                    placeholder={`e.g. "${activeSite.name} team working in a modern office"`}
                    rows={3}
                    style={inp({ fontSize: 12, padding: "8px 10px", resize: "none", fontFamily: "inherit", lineHeight: 1.5 })}
                  />

                  {/* Size + Style selectors */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Size</p>
                      <div style={{ display: "flex", gap: 3 }}>
                        {(["landscape", "portrait", "square"] as const).map(s => (
                          <button key={s} onClick={() => setImgSize(s)} style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: `1px solid ${imgSize === s ? "#a855f7" : C.border2}`, background: imgSize === s ? "rgba(168,85,247,0.12)" : C.bg, color: imgSize === s ? "#a855f7" : C.textDim, fontSize: 9, cursor: "pointer", fontWeight: imgSize === s ? 600 : 400 }}>
                            {s === "landscape" ? "⬛ Wide" : s === "portrait" ? "▬ Tall" : "◼ Sq"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Style</p>
                      <div style={{ display: "flex", gap: 3 }}>
                        {(["photo", "illustration", "abstract"] as const).map(s => (
                          <button key={s} onClick={() => setImgStyle(s)} style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: `1px solid ${imgStyle === s ? "#a855f7" : C.border2}`, background: imgStyle === s ? "rgba(168,85,247,0.12)" : C.bg, color: imgStyle === s ? "#a855f7" : C.textDim, fontSize: 9, cursor: "pointer", fontWeight: imgStyle === s ? 600 : 400, textTransform: "capitalize" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={generateSiteImage}
                    disabled={!imgPrompt.trim() || generatingImg}
                    style={{ width: "100%", padding: "10px", borderRadius: 6, border: "none", background: !imgPrompt.trim() || generatingImg ? C.border : "#a855f7", color: !imgPrompt.trim() || generatingImg ? C.textMuted : "#fff", fontSize: 13, fontWeight: 600, cursor: !imgPrompt.trim() || generatingImg ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    {generatingImg
                      ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} /> Generating (~15s)…</>
                      : "Generate image"}
                  </button>

                  {/* Gallery */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Gallery {galleryImgs.length > 0 ? `· ${galleryImgs.length}` : ""}
                      </p>
                      {galleryLoading && <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${C.textMuted}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />}
                    </div>

                    {galleryImgs.length === 0 && !galleryLoading && (
                      <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textAlign: "center", padding: "24px 0" }}>No images yet — generate one above</p>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {galleryImgs.map((img, i) => {
                        const sessionMatch = generatedImgs.find(g => g.url === img.url);
                        const prompt = sessionMatch?.prompt || img.prompt || "";
                        return (
                          <div key={i} style={{ borderRadius: 7, overflow: "hidden", border: `1px solid ${C.border2}`, background: C.bg, display: "flex", flexDirection: "column" }}>
                            <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                              <img src={img.url} alt={prompt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              {/* Hover overlay with quick insert actions */}
                              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 5, gap: 3, opacity: 0, transition: "opacity 0.15s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.55)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)"; (e.currentTarget as HTMLElement).style.opacity = "0"; }}
                              >
                                <button
                                  onClick={() => setHeroImage(img.url)}
                                  style={{ padding: "3px 7px", borderRadius: 4, border: "none", background: "rgba(255,255,255,0.92)", color: "#111", fontSize: 10, cursor: "pointer", fontWeight: 600, textAlign: "left" }}
                                >Hero bg</button>
                                <button
                                  onClick={() => sendEdit(`Add this image to the about section. Use this exact URL as the src: ${img.url}`)}
                                  style={{ padding: "3px 7px", borderRadius: 4, border: "none", background: "rgba(255,255,255,0.92)", color: "#111", fontSize: 10, cursor: "pointer", fontWeight: 600, textAlign: "left" }}
                                >About</button>
                                <button
                                  onClick={() => { setPendingImage({ url: img.url, name: (prompt || "image").slice(0, 40) }); switchPanel("chat"); }}
                                  style={{ padding: "3px 7px", borderRadius: 4, border: "none", background: "rgba(168,85,247,0.9)", color: "#fff", fontSize: 10, cursor: "pointer", fontWeight: 600, textAlign: "left" }}
                                >Custom use →</button>
                                <button
                                  onClick={() => { if (confirm("Delete this image?")) deleteGalleryImage(img.url); }}
                                  style={{ padding: "3px 7px", borderRadius: 4, border: "none", background: "rgba(220,38,38,0.85)", color: "#fff", fontSize: 10, cursor: "pointer", fontWeight: 600, textAlign: "left" }}
                                >Delete</button>
                              </div>
                            </div>
                            {prompt && (
                              <p style={{ margin: 0, padding: "4px 6px", fontSize: 9, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>{prompt}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Panel: Bot ───────────────────────────────────── */}
              {activePanel === "bot" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>AI Chatbot Setup</span>
                    <span style={{ fontSize: 10, color: C.textMuted, background: C.surface, border: `1px solid ${C.border2}`, padding: "1px 7px", borderRadius: 20 }}>Deploy</span>
                  </div>
                  <p style={{ margin: "0 0 14px", fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>Deploy a trained AI assistant to this site. Visitors can chat, ask questions, and get guided to book or call.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 0 12px", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0, border: `2px solid ${botSetupAvatarUrl ? C.gold : C.border2}`, overflow: "hidden", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {botSetupAvatarUrl
                          ? <img src={botSetupAvatarUrl} alt="Bot avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 26, lineHeight: 1 }}>🤖</span>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bot Avatar</p>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={generateBotAvatar} disabled={botAvatarGenerating} style={{ flex: 1, padding: "6px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: botAvatarGenerating ? C.textMuted : C.textDim, fontSize: 11, cursor: botAvatarGenerating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            {botAvatarGenerating ? <><div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.2)", borderTopColor: C.textDim, animation: "spin 0.8s linear infinite" }} />Gen…</> : "🎨 Generate"}
                          </button>
                          <button onClick={() => avatarInputRef.current?.click()} style={{ flex: 1, padding: "6px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 11, cursor: "pointer" }}>
                            📎 Upload
                          </button>
                        </div>
                        {botSetupAvatarUrl && (
                          <button onClick={() => setBotSetupAvatarUrl("")} style={{ fontSize: 10, color: C.textMuted, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>Remove</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Bot name</label>
                      <input value={botSetupName} onChange={e => setBotSetupName(e.target.value)} placeholder={`${activeSite.name} Assistant`} style={inp({ fontSize: 12, padding: "7px 10px" })} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Greeting message</label>
                      <input value={botSetupGreeting} onChange={e => setBotSetupGreeting(e.target.value)} placeholder={`Hi! I'm here to help with ${activeSite.name}…`} style={inp({ fontSize: 12, padding: "7px 10px" })} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Personality & specialty notes</label>
                      <textarea value={botSetupPersonality} onChange={e => setBotSetupPersonality(e.target.value)} placeholder="e.g. Warm and calming tone, expert in Thai massage, knows all services and pricing, encourages bookings..." rows={3} style={inp({ fontSize: 12, padding: "7px 10px", resize: "none", fontFamily: "inherit", lineHeight: 1.5 })} />
                    </div>
                    <button
                      onClick={() => injectChatbot()}
                      disabled={injectingBot}
                      style={{ width: "100%", padding: "10px", borderRadius: 7, border: "none", background: injectingBot ? C.border : `linear-gradient(135deg, ${C.gold}, #a8841f)`, color: injectingBot ? C.textMuted : "#000", fontSize: 13, fontWeight: 700, cursor: injectingBot ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                    >
                      {injectingBot
                        ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(0,0,0,.2)", borderTopColor: "#000", animation: "spin 0.8s linear infinite" }} />Deploying…</>
                        : "Deploy Chatbot to Site"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Panel: Reviews ──────────────────────────────── */}
              {activePanel === "reviews" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f97316" }}>Google Reviews</span>
                    <span style={{ fontSize: 10, color: C.textMuted, background: C.surface, border: `1px solid ${C.border2}`, padding: "1px 7px", borderRadius: 20 }}>Carousel</span>
                  </div>
                  <p style={{ margin: "0 0 14px", fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>Fetch reviews from a Google Maps URL or add them manually, then inject an auto-scrolling carousel into the site.</p>

                  {/* URL fetch */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Google Maps URL</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={reviewsUrl}
                        onChange={e => setReviewsUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/... or google.com/maps/..."
                        style={inp({ flex: 1, fontSize: 11, padding: "7px 9px" })}
                        onKeyDown={e => e.key === "Enter" && fetchReviews()}
                      />
                      <button
                        onClick={fetchReviews}
                        disabled={!reviewsUrl.trim() || fetchingReviews}
                        style={{ padding: "7px 12px", borderRadius: 6, border: "none", background: !reviewsUrl.trim() || fetchingReviews ? C.border : "#f97316", color: !reviewsUrl.trim() || fetchingReviews ? C.textMuted : "#fff", fontSize: 11, fontWeight: 600, cursor: !reviewsUrl.trim() || fetchingReviews ? "not-allowed" : "pointer", flexShrink: 0 }}
                      >
                        {fetchingReviews ? "..." : "Fetch"}
                      </button>
                    </div>
                    {reviewsFetchTip && (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: C.gold, lineHeight: 1.4 }}>{reviewsFetchTip}</p>
                    )}
                  </div>

                  {/* Fetched reviews */}
                  {fetchedReviews.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.06em" }}>{fetchedReviews.length} fetched</span>
                        {reviewsRating && (
                          <span style={{ fontSize: 11, color: C.textDim }}>
                            {reviewsRating.toFixed(1)} ★{reviewsTotalReviews ? ` (${reviewsTotalReviews.toLocaleString()})` : ""}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {fetchedReviews.map((r, i) => (
                          <div key={i} style={{ padding: "8px 10px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border2}`, fontSize: 11 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                              <span style={{ fontWeight: 600, color: C.text }}>{r.name}</span>
                              <span style={{ color: "#fbbc04", letterSpacing: "1px" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                            </div>
                            <p style={{ margin: 0, color: C.textDim, lineHeight: 1.4, overflow: "hidden", maxHeight: 36 }}>{r.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual reviews */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Manual entry</span>
                      <button
                        onClick={() => setManualReviews(prev => [...prev, { name: "", rating: 5, text: "" }])}
                        style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, cursor: "pointer" }}
                      >+ Add</button>
                    </div>
                    {manualReviews.length === 0 && fetchedReviews.length === 0 && (
                      <p style={{ margin: 0, fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>Fetch from URL above or add reviews manually.</p>
                    )}
                    {manualReviews.map((r, i) => (
                      <div key={i} style={{ padding: "10px", background: C.bg, borderRadius: 7, border: `1px solid ${C.border2}`, marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                          <input
                            value={r.name}
                            onChange={e => setManualReviews(prev => prev.map((m, j) => j === i ? { ...m, name: e.target.value } : m))}
                            placeholder="Reviewer name"
                            style={inp({ fontSize: 11, padding: "5px 8px", flex: 1 })}
                          />
                          <div style={{ display: "flex", flexShrink: 0 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button key={star}
                                onClick={() => setManualReviews(prev => prev.map((m, j) => j === i ? { ...m, rating: star } : m))}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, padding: "0 1px", color: star <= r.rating ? "#fbbc04" : C.border2, lineHeight: 1 }}
                              >★</button>
                            ))}
                          </div>
                          <button onClick={() => setManualReviews(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>×</button>
                        </div>
                        <textarea
                          value={r.text}
                          onChange={e => setManualReviews(prev => prev.map((m, j) => j === i ? { ...m, text: e.target.value } : m))}
                          placeholder="Review text..."
                          rows={2}
                          style={inp({ fontSize: 11, padding: "5px 8px", resize: "none", fontFamily: "inherit", lineHeight: 1.5 })}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Display name + rating — always visible */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Display name</label>
                      <input value={reviewsBusinessName} onChange={e => setReviewsBusinessName(e.target.value)} placeholder={activeSite?.name || "Business name"} style={inp({ fontSize: 11, padding: "6px 8px" })} />
                    </div>
                    <div style={{ width: 70 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Rating</label>
                      <input
                        value={reviewsRating ?? ""}
                        onChange={e => setReviewsRating(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="4.9"
                        type="number"
                        min="1" max="5" step="0.1"
                        style={inp({ fontSize: 11, padding: "6px 8px" })}
                      />
                    </div>
                  </div>

                  {/* Inject button */}
                  {(() => {
                    const total = fetchedReviews.length + manualReviews.filter(r => r.text.trim()).length;
                    const disabled = injectingReviews || total === 0;
                    return (
                      <button
                        onClick={injectReviewsToSite}
                        disabled={disabled}
                        style={{ width: "100%", padding: "10px", borderRadius: 7, border: "none", background: disabled ? C.border : "#f97316", color: disabled ? C.textMuted : "#fff", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                      >
                        {injectingReviews
                          ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />Injecting…</>
                          : total > 0 ? `Inject Carousel (${total} review${total !== 1 ? "s" : ""})` : "Add reviews above"}
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* ── Panel: SEO ───────────────────────────────────── */}
              {activePanel === "seo" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>SEO Analyser</span>
                    {seoLoading && <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid #22c55e`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />}
                    {!seoLoading && activeSite && (
                      <button onClick={() => loadSeoScore(activeSite.slug)} style={{ marginLeft: "auto", fontSize: 10, color: C.textDim, background: "none", border: `1px solid ${C.border2}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>↺ Refresh</button>
                    )}
                  </div>

                  {/* Score ring */}
                  {seoScore !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border2}` }}>
                      <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                        <svg width="64" height="64" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="26" fill="none" stroke={C.border2} strokeWidth="6" />
                          <circle cx="32" cy="32" r="26" fill="none"
                            stroke={seoScore >= 80 ? "#22c55e" : seoScore >= 60 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={`${(seoScore / 100) * 163.4} 163.4`}
                            transform="rotate(-90 32 32)" />
                        </svg>
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: seoScore >= 80 ? "#22c55e" : seoScore >= 60 ? "#f59e0b" : "#ef4444" }}>{seoScore}</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
                          {seoScore >= 80 ? "Strong SEO" : seoScore >= 60 ? "Needs work" : "Poor SEO"}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: 10, color: C.textMuted }}>
                          {seoChecks.filter(c => c.passed).length} of {seoChecks.length} checks passing
                        </p>
                        {activeSite && (
                          <button
                            onClick={() => { seoEditPendingRef.current = true; sendEdit("Audit my site SEO and improve the meta title, description, and heading structure to rank better for my target keywords. Make sure the H1 is keyword-rich and the meta description is compelling and 120-160 characters."); switchPanel("chat"); }}
                            style={{ marginTop: 6, padding: "3px 8px", fontSize: 10, borderRadius: 4, border: "none", background: "rgba(34,197,94,0.15)", color: "#22c55e", cursor: "pointer", fontWeight: 600 }}
                          >✦ AI fix all →</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Checks list */}
                  {seoChecks.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Checks</p>
                      {seoChecks.map(c => {
                        const fixPrompts: Record<string, string> = {
                          meta_desc: "Rewrite my meta description to be 130-155 characters, include my main keyword naturally, and have a clear call to action. Update it in the HTML.",
                          title: "Rewrite my meta title to be 50-60 characters, keyword-rich for my niche, and compelling. Update it in the HTML.",
                          h1: "Fix my H1 tag — ensure there is exactly one H1 that is keyword-rich, compelling, and under 70 characters.",
                          schema: "Add a complete JSON-LD LocalBusiness schema block to the <head> of my site including name, description, address, telephone, and url.",
                          faq_schema: "Extract all questions and answers from the FAQ section and inject a FAQPage JSON-LD schema block into the <head>. This enables Google rich snippets.",
                          robots_meta: 'Add <meta name="robots" content="index, follow"> to the <head> of my site.',
                          img_alt: "Find all images missing alt text and add descriptive, keyword-relevant alt attributes to each one.",
                          og: "Add complete Open Graph meta tags (og:title, og:description, og:image, og:url, og:type) to the <head>.",
                          sitemap_ref: 'Add <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml"> to the <head> of my site.',
                          address: "Add the business address to the JSON-LD schema and ensure it appears in the contact section of the page.",
                          geo: "Add geo coordinates (latitude and longitude) to the JSON-LD schema for local SEO.",
                        };
                        const fixPrompt = !c.passed ? fixPrompts[c.key] : undefined;
                        return (
                          <div key={c.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 5, background: c.passed ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${c.passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                            <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{c.passed ? "✅" : "❌"}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.text }}>{c.label}</p>
                              {c.detail && <p style={{ margin: "1px 0 0", fontSize: 9, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.detail}</p>}
                            </div>
                            {fixPrompt ? (
                              <button
                                onClick={() => { seoEditPendingRef.current = true; sendEdit(fixPrompt); switchPanel("chat"); }}
                                style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, border: "none", background: "rgba(239,68,68,0.15)", color: "#ef4444", cursor: "pointer", fontWeight: 600, flexShrink: 0 }}
                              >Fix</button>
                            ) : (
                              <span style={{ fontSize: 9, color: C.textMuted, flexShrink: 0 }}>{c.points}pt</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {seoLoading && seoChecks.length === 0 && (
                    <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textAlign: "center", padding: "20px 0" }}>Analysing site…</p>
                  )}

                  {/* Submit to Google */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Google Indexing</p>
                    <button
                      onClick={submitToGoogle}
                      disabled={indexSubmitting}
                      style={{ width: "100%", padding: "9px", borderRadius: 6, border: "none", background: indexSubmitting ? C.border : "#22c55e", color: indexSubmitting ? C.textMuted : "#fff", fontSize: 12, fontWeight: 600, cursor: indexSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      {indexSubmitting
                        ? <><div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />Submitting…</>
                        : "Submit to Google"}
                    </button>
                    {indexResult && (
                      <p style={{ margin: "6px 0 0", fontSize: 10, color: indexResult.ok ? "#22c55e" : "#ef4444", textAlign: "center" }}>{indexResult.msg}</p>
                    )}
                    <p style={{ margin: "6px 0 0", fontSize: 9, color: C.textMuted, lineHeight: 1.5 }}>
                      Asks Google to crawl immediately. Requires Google service account — setup guide in docs.
                    </p>
                  </div>

                  {/* PageSpeed */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>PageSpeed</p>
                      {pageSpeedLoading && <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${C.textMuted}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />}
                    </div>
                    {pageSpeed ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { label: "Mobile", val: pageSpeed.mobile },
                          { label: "Desktop", val: pageSpeed.desktop },
                          { label: "SEO", val: pageSpeed.seoScore },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border2}` }}>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: val == null ? C.textMuted : val >= 90 ? "#22c55e" : val >= 50 ? "#f59e0b" : "#ef4444" }}>
                              {val ?? "–"}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: 9, color: C.textMuted }}>{label}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => activeSite && loadPageSpeed(activeSite.slug)}
                        disabled={pageSpeedLoading}
                        style={{ width: "100%", padding: "8px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 11, cursor: pageSpeedLoading ? "not-allowed" : "pointer" }}
                      >
                        {pageSpeedLoading ? "Running test (~15s)…" : "Run PageSpeed test"}
                      </button>
                    )}
                    <p style={{ margin: "6px 0 0", fontSize: 9, color: C.textMuted }}>Uses Google Lighthouse. Scores: 90+ green, 50–89 amber, under 50 red.</p>
                  </div>

                  {/* Quick AI SEO actions */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick AI fixes</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[
                        ["Inject FAQ schema", "Extract all questions and answers from the FAQ section of my site and inject a FAQPage JSON-LD schema block into the <head>. This enables Google rich snippets."],
                        ["Improve meta title", "Rewrite my meta title to be 50-60 characters, keyword-rich for my niche, and compelling. Update it in the HTML."],
                        ["Improve meta description", "Rewrite my meta description to be 130-155 characters, include my main keyword naturally, and have a clear call to action."],
                        ["Add robots meta", "Add a <meta name=\"robots\" content=\"index, follow\"> tag to the <head> of my site."],
                        ["Improve H1 keyword density", "Rewrite my H1 heading to naturally include my main service keyword and city. Keep it compelling and under 70 characters."],
                      ].map(([label, prompt]) => (
                        <button
                          key={label}
                          onClick={() => { sendEdit(prompt); switchPanel("chat"); }}
                          style={{ padding: "7px 10px", borderRadius: 5, border: `1px solid ${C.border2}`, background: C.bg, color: C.textDim, fontSize: 11, cursor: "pointer", textAlign: "left", fontWeight: 400 }}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Panel: History ───────────────────────────────── */}
              {activePanel === "history" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Version History</p>
                    <button onClick={() => activeSite && loadVersionHistory(activeSite.slug)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 11, padding: "2px 6px" }}>Refresh</button>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>Each publish and generation is saved automatically. Click Restore to roll back to any version.</p>
                  {historyLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: C.textDim }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: `1.5px solid #a78bfa`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                      <span style={{ fontSize: 12 }}>Loading versions…</span>
                    </div>
                  )}
                  {!historyLoading && versionHistory.length === 0 && (
                    <div style={{ padding: "20px 0", textAlign: "center", color: C.textMuted, fontSize: 12 }}>
                      No versions yet — versions are saved automatically on each publish.
                    </div>
                  )}
                  {versionHistory.map(ver => {
                    const date = new Date(ver.ts);
                    const dateStr = date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
                    const timeStr = date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
                    const isRestoring = restoringVersion === ver.v;
                    return (
                      <div key={ver.v} style={{ background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>v{ver.v}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ver.label}</span>
                          </div>
                          <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>{ver.sizeKb}kb</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, color: C.textMuted }}>{dateStr} at {timeStr}</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <a href={ver.url} target="_blank" rel="noopener noreferrer" style={{ padding: "4px 9px", borderRadius: 5, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 11, cursor: "pointer", textDecoration: "none" }}>Preview</a>
                            <button
                              onClick={() => restoreVersion(ver.v)}
                              disabled={isRestoring}
                              style={{ padding: "4px 9px", borderRadius: 5, border: `1px solid rgba(167,139,250,0.4)`, background: "rgba(167,139,250,0.08)", color: isRestoring ? C.textMuted : "#a78bfa", fontSize: 11, cursor: isRestoring ? "not-allowed" : "pointer", fontWeight: 600 }}
                            >{isRestoring ? "…" : "Restore"}</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Panel: Chat ──────────────────────────────────── */}
              {activePanel === "chat" && (
                <>
                  {/* Message history */}
                  <div
                    style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, position: "relative", transition: "background 0.15s", background: isDragOver ? "rgba(15,157,142,0.07)" : "transparent" }}
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith("image/")) uploadFile(file);
                    }}
                  >
                    {isDragOver && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
                        <div style={{ border: `2px dashed ${C.teal}`, borderRadius: 12, padding: "24px 36px", background: "rgba(15,157,142,0.12)", textAlign: "center" }}>
                          <p style={{ margin: 0, fontSize: 28 }}>📎</p>
                          <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: C.teal }}>Drop image here</p>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: C.textDim }}>logo, screenshot, reference</p>
                        </div>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="upload" style={{ maxWidth: 160, maxHeight: 100, borderRadius: 6, marginBottom: 4, objectFit: "cover", border: `1px solid ${C.border2}` }} />
                        )}
                        <div style={{ maxWidth: "88%", padding: "8px 12px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? C.gold : C.surface2, color: msg.role === "user" ? "#000" : C.text, fontSize: 13, lineHeight: 1.5, fontWeight: msg.role === "user" ? 500 : 400 }}>
                          {msg.content}
                        </div>
                        {msg.htmlSnapshot && versions.current.includes(msg.htmlSnapshot) && (
                          <button onClick={() => restoreLocalVersion(msg.htmlSnapshot!, versions.current.indexOf(msg.htmlSnapshot!))} style={{ marginTop: 4, fontSize: 10, color: C.textDim, background: "none", border: `1px solid ${C.border2}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>
                            Restore this version
                          </button>
                        )}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, alignSelf: "stretch" }}>
                            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Try next</span>
                            {msg.suggestions.map((s, si) => (
                              <button key={si} onClick={() => sendEdit(s)} style={{ textAlign: "left", padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, background: C.bg, color: C.textDim, fontSize: 12, cursor: "pointer", lineHeight: 1.4, transition: "border-color 0.15s, color 0.15s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gold; (e.currentTarget as HTMLElement).style.color = C.gold; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                        <span style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
                          {new Date(msg.ts).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input area */}
                  <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
                    {queued && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", background: C.goldBg, borderRadius: 6, border: `1px solid ${C.gold}` }}>
                        <span style={{ fontSize: 13 }}>⏳</span>
                        <span style={{ fontSize: 11, color: C.gold, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Queued: {queued.instruction || "[image]"}</span>
                        <button onClick={() => setQueued(null)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>×</button>
                      </div>
                    )}
                    {pendingImage && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", background: C.surface2, borderRadius: 6, border: `1px solid ${C.border2}` }}>
                        <img src={pendingImage.url} alt="pending" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />
                        <span style={{ fontSize: 11, color: C.textDim, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingImage.name}</span>
                        <button onClick={() => setPendingImage(null)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>×</button>
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      value={instruction}
                      onChange={e => setInstruction(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendOrQueue(); } }}
                      placeholder={isEditing && !queued ? "Type next change — will send automatically when done…" : pendingImage ? "Describe how to use this image… (optional)" : "Describe what to change…"}
                      rows={isMobile ? 2 : 3}
                      style={{ ...inp({ resize: "none", fontFamily: "inherit", lineHeight: 1.5, fontSize: 13, padding: "9px 12px" }) }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7, gap: 6 }}>
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload image" style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: pendingImage ? C.tealBg : "none", color: pendingImage ? C.teal : C.textDim, fontSize: 14, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.5 : 1 }}>
                        {uploading ? "⏳" : "📎"}
                      </button>
                      <span style={{ fontSize: 11, color: C.textMuted, flex: 1 }}>Shift+Enter newline</span>
                      {(() => {
                        const hasContent = instruction.trim() || pendingImage;
                        const isQueued = isEditing && !!queued;
                        const willQueue = isEditing && !queued && !!hasContent;
                        return (
                          <button
                            onClick={handleSendOrQueue}
                            disabled={!hasContent || isQueued}
                            style={{
                              padding: "6px 16px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: !hasContent || isQueued ? "not-allowed" : "pointer",
                              background: isQueued ? C.border : willQueue ? C.goldBg : hasContent ? C.gold : C.border,
                              color: isQueued ? C.textMuted : willQueue ? C.gold : hasContent ? "#000" : C.textMuted,
                              ...(willQueue ? { border: `1px solid ${C.gold}` } : {}),
                            }}
                          >
                            {isQueued ? "Queued ✓" : willQueue ? "Queue" : "Send"}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Drag handle ──────────────────────────────────────── */}
          {!isMobile && sidebarOpen && (
            <div
              onMouseDown={e => {
                isDraggingPanel.current = true;
                dragStartX.current = e.clientX;
                dragStartW.current = sidebarPxRef.current;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
                // Block iframe from stealing mouse events during drag
                if (iframeRef.current) iframeRef.current.style.pointerEvents = "none";
                e.preventDefault();
              }}
              onTouchStart={e => {
                isDraggingPanel.current = true;
                dragStartX.current = e.touches[0].clientX;
                dragStartW.current = sidebarPxRef.current;
                if (iframeRef.current) iframeRef.current.style.pointerEvents = "none";
              }}
              title="Drag to resize panel"
              style={{
                width: 8, flexShrink: 0, cursor: "col-resize", background: "transparent",
                position: "relative", zIndex: 10, transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,162,39,0.35)"; }}
              onMouseLeave={e => { if (!isDraggingPanel.current) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                display: "flex", flexDirection: "column", gap: 3, pointerEvents: "none",
              }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />)}
              </div>
            </div>
          )}

          {/* ── Preview pane ─────────────────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", minWidth: 0 }}>

            {/* Section jump nav */}
            {sections.length > 0 && (
              <div style={{ display: "flex", gap: 4, padding: "5px 8px", borderBottom: `1px solid ${C.border}`, overflowX: "auto", flexShrink: 0, scrollbarWidth: "none", background: C.surface }}>
                {sections.map(sec => (
                  <button
                    key={sec.selector}
                    onClick={() => scrollToSection(sec.selector)}
                    style={{ padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500, flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gold; (e.currentTarget as HTMLElement).style.color = C.gold; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "auto", padding: device === "desktop" ? 0 : "20px 0" }}>
              <div style={{ width: DEVICE_WIDTHS[device], height: "100%", minHeight: device !== "desktop" ? 600 : "100%", position: "relative", transition: "width 0.25s ease", flexShrink: 0, boxShadow: device !== "desktop" ? "0 8px 48px rgba(0,0,0,.6)" : "none", borderRadius: device !== "desktop" ? 12 : 0, overflow: "hidden" }}>
                {previewHtml ? (
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    srcDoc={previewHtml}
                    style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                    title="Site preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: "#3d5168" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #1a2535", borderTopColor: "#0f9d8e", animation: "spin 0.9s linear infinite" }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Loading preview...</p>
                  </div>
                )}
                {isEditing && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(8,13,17,0.5)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
                    <div style={{ textAlign: "center", color: "#e2dfd8" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(201,162,39,.3)", borderTopColor: "#c9a227", animation: "spin 0.9s linear infinite", margin: "0 auto 12px" }} />
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Applying changes...</p>
                    </div>
                  </div>
                )}
                {toast && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 50 }}>
                    <div style={{
                      background: toast.type === "success" ? "rgba(16,185,129,0.97)" : "rgba(239,68,68,0.97)",
                      color: "#fff",
                      borderRadius: 20,
                      padding: "28px 44px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 14,
                      boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
                      animation: "toastIn 0.25s ease",
                      textAlign: "center",
                    }}>
                      {toast.type === "success" ? (
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                          <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.2)" />
                          <path d="M16 28.5l8 8 16-16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                          <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.2)" />
                          <path d="M20 20l16 16M36 20L20 36" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                        </svg>
                      )}
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{toast.type === "success" ? "Success" : "Error"}</p>
                      <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>{toast.msg}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: floating chat button when sidebar is closed */}
            {isMobile && !sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ position: "absolute", bottom: 20, right: 20, zIndex: 40, padding: "12px 20px", borderRadius: 30, background: C.gold, color: "#000", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(201,162,39,.4)" }}
              >
                💬 Chat
              </button>
            )}
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes toastIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
      </div>
    );
  }

  // ─── LIST VIEW ──────────────────────────────────────────────────────
  const dedupedSites = deduplicateSites(sites);

  // Derived stats
  const statLive    = dedupedSites.filter(s => s.status === "live").length;
  const statDraft   = dedupedSites.filter(s => s.status === "draft").length;
  const statDomains = dedupedSites.filter(s => (s.domains || []).length > 0).length;

  // Unique niches for filter dropdown
  const nicheOptions = Array.from(new Set(dedupedSites.map(s => s.niche).filter(Boolean)));

  // Filter + sort
  const filteredSites = dedupedSites
    .filter(s => {
      const q = listSearch.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.domains || []).some(d => d.toLowerCase().includes(q)) || s.slug.toLowerCase().includes(q);
      const matchNiche  = listNiche === "all" || s.niche === listNiche;
      const matchStatus = listStatus === "all" || (listStatus === "custom-domain" ? (s.domains || []).length > 0 : s.status === listStatus);
      return matchSearch && matchNiche && matchStatus;
    })
    .sort((a, b) => {
      if (listSort === "newest") return b.createdAt - a.createdAt;
      if (listSort === "oldest") return a.createdAt - b.createdAt;
      if (listSort === "az")     return a.name.localeCompare(b.name);
      if (listSort === "za")     return b.name.localeCompare(a.name);
      return 0;
    });

  const hasFilters = listSearch || listNiche !== "all" || listStatus !== "all";

  const COL = isMobile
    ? "36px 1fr auto"
    : "36px minmax(160px,2fr) minmax(140px,2fr) 120px 80px 72px 100px";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: isMobile ? "16px 16px 0" : "20px 28px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Site Factory</h1>
            <p style={{ margin: "3px 0 0", color: C.textDim, fontSize: 12 }}>AI-generated client websites</p>
          </div>
          <button
            onClick={() => setPhase("new")}
            style={{ background: C.teal, border: "none", color: "#fff", padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
          >
            + New Site
          </button>
        </div>

        {/* ── Stat chips ── */}
        {!loadingSites && sites.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {([
              { label: "Total",          value: dedupedSites.length, color: C.text,     bg: C.surface2,              filter: "all"           },
              { label: "Live",           value: statLive,            color: "#22c55e",  bg: "rgba(34,197,94,0.08)",  filter: "live"          },
              { label: "Custom domains", value: statDomains,         color: C.teal,     bg: "rgba(15,157,142,0.08)", filter: "custom-domain" },
              { label: "Draft",          value: statDraft,           color: C.gold,     bg: C.goldBg,                filter: "draft"         },
            ] as const).map(chip => (
              <button
                key={chip.label}
                onClick={() => setListStatus(listStatus === chip.filter ? "all" : chip.filter)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20, border: `1px solid ${listStatus === chip.filter ? chip.color : C.border}`, background: listStatus === chip.filter ? chip.bg : "transparent", cursor: "pointer", transition: "all 0.15s" }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: chip.color }}>{chip.value}</span>
                <span style={{ fontSize: 11, color: listStatus === chip.filter ? chip.color : C.textDim }}>{chip.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Controls bar ── */}
        {!loadingSites && sites.length > 0 && (
          <div style={{ display: "flex", gap: 8, paddingBottom: 14, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted, fontSize: 13, pointerEvents: "none" }}>⌕</span>
              <input
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                placeholder="Search by name or domain…"
                style={{ width: "100%", boxSizing: "border-box", paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: 7, border: `1px solid ${C.border2}`, background: C.bg, color: C.text, fontSize: 12, outline: "none" }}
              />
            </div>
            {nicheOptions.length > 1 && (
              <select value={listNiche} onChange={e => setListNiche(e.target.value)} style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.border2}`, background: C.bg, color: listNiche === "all" ? C.textDim : C.text, fontSize: 12, cursor: "pointer", outline: "none" }}>
                <option value="all">All niches</option>
                {nicheOptions.map(n => <option key={n} value={n}>{NICHE_META[n!]?.label ?? n}</option>)}
              </select>
            )}
            <select value={listSort} onChange={e => setListSort(e.target.value as typeof listSort)} style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.border2}`, background: C.bg, color: C.textDim, fontSize: 12, cursor: "pointer", outline: "none" }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
            </select>
            {hasFilters && (
              <button onClick={() => { setListSearch(""); setListNiche("all"); setListStatus("all"); }} style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 11, cursor: "pointer" }}>
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ padding: isMobile ? "0 0 40px" : "0 0 40px" }}>
        {loadingSites ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 28px", color: C.textDim, fontSize: 13 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.border2}`, borderTopColor: C.teal, animation: "spin 0.8s linear infinite" }} />
            Loading sites…
          </div>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
            <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.4 }}>◻</div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px", color: C.text }}>No sites yet</p>
            <p style={{ fontSize: 12, margin: "0 0 20px" }}>Generate your first client website in about 90 seconds</p>
            <button onClick={() => setPhase("new")} style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: C.teal, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ New Site</button>
          </div>
        ) : filteredSites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.textDim }}>
            <p style={{ fontSize: 14, margin: "0 0 10px", color: C.text }}>No sites match your filters</p>
            <button onClick={() => { setListSearch(""); setListNiche("all"); setListStatus("all"); }} style={{ padding: "7px 16px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 12, cursor: "pointer" }}>Clear filters</button>
          </div>
        ) : (
          <>
            {/* Column headers — desktop only */}
            {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: COL, gap: 0, padding: "8px 28px", borderBottom: `1px solid ${C.border}` }}>
                <div />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Name</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Domain</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Niche</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Status</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Created</span>
                <span />
              </div>
            )}

            {/* Rows */}
            {filteredSites.map(site => {
              const color   = siteColor(site.name);
              const initials = site.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
              const customDomain = site.domains?.[0];
              const previewUrl = customDomain ? `https://${customDomain}` : `https://www.saabai.ai/sites/${site.slug}/`;
              const niche = NICHE_META[site.niche ?? "other"] ?? NICHE_META.other;
              const isLive = site.status === "live";

              return (
                <div
                  key={site.id}
                  onClick={() => openEditor(site)}
                  style={{ display: "grid", gridTemplateColumns: COL, gap: 0, alignItems: "center", padding: isMobile ? "12px 16px" : "0 28px", minHeight: isMobile ? "auto" : 52, borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.surface}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  {/* Avatar */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: color + "22", border: `1.5px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 11, fontWeight: 700, flexShrink: 0, letterSpacing: "-0.02em" }}>
                      {initials}
                    </div>
                  </div>

                  {/* Name */}
                  <div style={{ minWidth: 0, paddingRight: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.name}</span>
                    {isMobile && <span style={{ fontSize: 10, fontFamily: "monospace", color: customDomain ? C.teal : C.textMuted }}>{customDomain || `/sites/${site.slug}/`}</span>}
                  </div>

                  {/* Domain — desktop only */}
                  {!isMobile && (
                    <div style={{ paddingRight: 12, minWidth: 0 }}>
                      {customDomain ? (
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: C.teal, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customDomain}</span>
                      ) : (
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: C.textMuted, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/sites/{site.slug}/</span>
                      )}
                    </div>
                  )}

                  {/* Niche — desktop only */}
                  {!isMobile && (
                    <div style={{ paddingRight: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: niche.bg, color: niche.color, whiteSpace: "nowrap" }}>{niche.label}</span>
                    </div>
                  )}

                  {/* Status — desktop only */}
                  {!isMobile && (
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isLive ? "#22c55e" : C.gold, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#22c55e" : C.gold, flexShrink: 0 }} />
                        {isLive ? "Live" : "Draft"}
                      </span>
                    </div>
                  )}

                  {/* Created — desktop only */}
                  {!isMobile && (
                    <span style={{ fontSize: 11, color: C.textMuted }}>{relTime(site.createdAt)}</span>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Preview"
                      style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, textDecoration: "none", fontSize: 13, background: "none", transition: "all 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.teal; (e.currentTarget as HTMLElement).style.color = C.teal; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                    >↗</a>
                    <button
                      onClick={() => openEditor(site)}
                      title="Edit"
                      style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 13, background: "none", cursor: "pointer", transition: "all 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gold; (e.currentTarget as HTMLElement).style.color = C.gold; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textDim; }}
                    >✎</button>
                    <button
                      onClick={() => { setDeletingSlug(site.slug); setDeleteConfirmName(""); }}
                      title="Delete"
                      style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 12, background: "none", cursor: "pointer", transition: "all 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.red; (e.currentTarget as HTMLElement).style.color = C.red; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border2; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                    >⊗</button>
                  </div>
                </div>
              );
            })}

            {/* Footer count */}
            <div style={{ padding: "12px 28px", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {filteredSites.length} {filteredSites.length === 1 ? "site" : "sites"}
                {hasFilters ? ` of ${dedupedSites.length} total` : ""}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingSlug && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }} onClick={() => { if (!deleteInProgress) { setDeletingSlug(null); setDeleteConfirmName(""); } }}>
          <div style={{ background: C.surface, border: `1px solid ${C.red}`, borderRadius: 14, width: "100%", maxWidth: 420, padding: "28px 28px 24px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.redBg, border: `1px solid ${C.red}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>⚠️</div>
              <div>
                <h3 style={{ margin: "0 0 5px", fontSize: 16, fontWeight: 700, color: C.text }}>Delete site?</h3>
                <p style={{ margin: 0, fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>
                  This permanently removes all files, images, and data for <strong style={{ color: C.text }}>/sites/{deletingSlug}/</strong>. There is no undo.
                </p>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: C.textDim, marginBottom: 6 }}>
                Type <strong style={{ color: C.text, fontFamily: "monospace" }}>{deletingSlug}</strong> to confirm
              </label>
              <input
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && deleteConfirmName === deletingSlug) deleteSiteConfirmed(); }}
                placeholder={deletingSlug}
                autoFocus
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 7, border: `1px solid ${deleteConfirmName === deletingSlug ? C.red : C.border2}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: "monospace", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setDeletingSlug(null); setDeleteConfirmName(""); }}
                disabled={deleteInProgress}
                style={{ flex: 1, padding: "10px", borderRadius: 7, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 13, cursor: "pointer" }}
              >Cancel</button>
              <button
                onClick={deleteSiteConfirmed}
                disabled={deleteConfirmName !== deletingSlug || deleteInProgress}
                style={{ flex: 1, padding: "10px", borderRadius: 7, border: "none", background: deleteConfirmName === deletingSlug && !deleteInProgress ? C.red : C.border, color: deleteConfirmName === deletingSlug && !deleteInProgress ? "#fff" : C.textMuted, fontSize: 13, fontWeight: 700, cursor: deleteConfirmName === deletingSlug && !deleteInProgress ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {deleteInProgress
                  ? <><div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />Deleting…</>
                  : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Site Modal */}
      {phase === "new" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setPhase("list")}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 540, maxHeight: "90vh", overflow: "auto", padding: "26px 30px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Client Site</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: C.textDim }}>Paste a brief, or fill in the details below</p>
              </div>
              <button onClick={() => setPhase("list")} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ─── Smart Brief ─── */}
              <div style={{ background: C.bg, border: `1.5px solid ${extracted ? "rgba(34,197,94,0.4)" : C.border2}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, transition: "border-color .2s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>AI Brief</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: C.textDim }}>Paste a brief and we will fill in the details</span>
                  </div>
                  <span style={{ fontSize: 10, color: C.textDim, background: C.surface, padding: "2px 7px", borderRadius: 20, border: `1px solid ${C.border}`, letterSpacing: "0.04em", textTransform: "uppercase" }}>Optional</span>
                </div>
                <input
                  value={briefUrl}
                  onChange={e => setBriefUrl(e.target.value)}
                  placeholder="Reference URL — existing site or competitor (optional)"
                  style={inp({ fontSize: 12 })}
                />
                <textarea
                  value={briefText}
                  onChange={e => { setBriefText(e.target.value); if (extracted) setExtracted(false); }}
                  placeholder={"Describe the business or paste a client email, notes, or brief...\n\ne.g. \"Building a site for Tributum Law, a commercial litigation firm in Sydney focusing on corporate disputes and M&A. Target audience: ASX-listed companies and private equity. Professional but approachable tone.\""}
                  rows={5}
                  style={inp({ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, fontSize: 13 })}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button
                    onClick={extractBrief}
                    disabled={(!briefText.trim() && !briefUrl.trim()) || extracting}
                    style={{
                      padding: "7px 14px", borderRadius: 7, border: "none",
                      background: (!briefText.trim() && !briefUrl.trim()) || extracting ? C.border : C.gold,
                      color: (!briefText.trim() && !briefUrl.trim()) || extracting ? C.textDim : "#000",
                      fontSize: 12, fontWeight: 700,
                      cursor: (!briefText.trim() && !briefUrl.trim()) || extracting ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6, transition: "all .15s",
                    }}
                  >
                    {extracting
                      ? <><div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(0,0,0,.15)", borderTopColor: "#000", animation: "spin 0.8s linear infinite" }} />Extracting...</>
                      : extracted
                        ? <><span style={{ color: "#16a34a" }}>✓</span>Re-extract</>
                        : "Extract Details →"}
                  </button>
                  {extracted && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Fields updated below</span>}
                </div>
              </div>

              {/* ─── Divider ─── */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.07em" }}>Details</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              <div>{lbl("Business Name *")}<input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Smith Plumbing" style={inp()} autoFocus /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>{lbl("Industry")}<select value={niche} onChange={e => { const n = e.target.value; setNiche(n); if (!themeOverridden) setStyle(NICHE_THEME_DEFAULT[n] ?? "slate"); }} style={inp()}>{NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}</select></div>
                <div>{lbl("Location")}<input value={location} onChange={e => setLocation(e.target.value)} placeholder="Sydney, NSW" style={inp()} /></div>
              </div>
              <div>{lbl("Services (comma separated)")}<input value={services} onChange={e => setServices(e.target.value)} placeholder="Emergency plumbing, Blocked drains..." style={inp()} /></div>
              <div>
                {lbl("Brief / Notes")}
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Target audience, tone, inspiration sites, anything specific..." rows={3} style={inp({ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 })} />
              </div>
              {/* ─── Site Type ─── */}
              <div>
                {lbl("Site Structure")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["single", "multi"] as const).map(t => {
                    const sel = siteType === t;
                    const pages = NICHE_PAGES[niche] ?? DEFAULT_PAGES;
                    return (
                      <button key={t} onClick={() => setSiteType(t)} style={{ padding: "12px 10px", borderRadius: 9, border: `1.5px solid ${sel ? C.gold : C.border2}`, background: sel ? C.goldBg : C.bg, cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${sel ? C.gold : C.textDim}`, background: sel ? C.gold : "transparent", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: sel ? C.gold : C.text }}>{t === "single" ? "Single Page" : "Multi-Page"}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>
                          {t === "single"
                            ? "All sections in one scrollable page. Generates in ~90s."
                            : `${pages.length} separate pages: ${pages.map(p => p.label).join(" · ")}. Takes ~3-5 min.`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>{lbl("Phone")}<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0412 345 678" style={inp()} /></div>
                <div>{lbl("Email")}<input value={email} onChange={e => setEmail(e.target.value)} placeholder="info@..." style={inp()} /></div>
                <div>{lbl("Address")}<input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" style={inp()} /></div>
              </div>
              <div>
                {lbl("Design Theme")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                  {THEMES.map(t => {
                    const selected = style === t.id;
                    return (
                      <button key={t.id} onClick={() => { setStyle(t.id); setThemeOverridden(true); }} style={{ padding: "8px 6px", borderRadius: 7, border: `1.5px solid ${selected ? C.gold : C.border2}`, background: selected ? C.goldBg : C.bg, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all .15s" }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {t.colors.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: "1px solid rgba(255,255,255,0.12)" }} />)}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: selected ? C.gold : C.text, letterSpacing: "0.03em" }}>{t.label}</span>
                        <span style={{ fontSize: 9, color: selected ? C.gold : C.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>{t.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Chatbot config */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: chatbotEnabled ? 12 : 0 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>AI Chatbot</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textDim }}>Add a trained assistant for site visitors</p>
                  </div>
                  <button
                    onClick={() => setChatbotEnabled(e => !e)}
                    style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${chatbotEnabled ? C.gold : C.border2}`, background: chatbotEnabled ? C.goldBg : "none", color: chatbotEnabled ? C.gold : C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {chatbotEnabled ? "On" : "Off"}
                  </button>
                </div>
                {chatbotEnabled && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>{lbl("Bot name")}<input value={chatbotName} onChange={e => setChatbotName(e.target.value)} placeholder={businessName ? `${businessName} Assistant` : "e.g. Lily"} style={inp()} /></div>
                      <div>{lbl("Greeting")}<input value={chatbotGreeting} onChange={e => setChatbotGreeting(e.target.value)} placeholder="Hi! How can I help?" style={inp()} /></div>
                    </div>
                    <div>
                      {lbl("Personality & training notes")}
                      <textarea value={chatbotPersonality} onChange={e => setChatbotPersonality(e.target.value)} placeholder="e.g. Warm and calming tone, specialist in Thai massage. Knows services, pricing, and booking process. Encourages visitors to book online or call..." rows={2} style={inp({ resize: "none", fontFamily: "inherit", lineHeight: 1.5 })} />
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => generateSite()} disabled={!businessName.trim()} style={{ marginTop: 4, width: "100%", padding: "12px", borderRadius: 7, border: "none", background: !businessName.trim() ? C.border : C.gold, color: !businessName.trim() ? C.textDim : "#000", fontSize: 14, fontWeight: 700, cursor: !businessName.trim() ? "not-allowed" : "pointer" }}>
                {siteType === "multi" ? `Generate ${(NICHE_PAGES[niche] ?? DEFAULT_PAGES).length} Pages` : "Generate Site"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overwrite confirmation modal ───────────────────────────────── */}
      {overwriteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 12, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚠</div>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.text }}>Site already exists</p>
                <p style={{ margin: 0, fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>
                  <strong style={{ color: C.text }}>{overwriteConfirm.name}</strong> already has a live site at{" "}
                  <code style={{ fontSize: 11, color: C.teal, background: C.bg, padding: "1px 5px", borderRadius: 3 }}>/sites/{overwriteConfirm.slug}/</code>.
                  Generating a new version will permanently replace it.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => { setOverwriteConfirm(null); openEditor(overwriteConfirm.existingSite); setPhase("editing"); }}
                style={{ padding: "11px 16px", borderRadius: 7, border: `1.5px solid ${C.teal}`, background: C.tealBg, color: C.teal, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
              >
                Edit existing site
                <span style={{ display: "block", fontSize: 11, fontWeight: 400, color: C.textDim, marginTop: 2 }}>Open the editor to refine the current version</span>
              </button>
              <button
                onClick={() => { const c = overwriteConfirm; setOverwriteConfirm(null); generateSite(true); void c; }}
                style={{ padding: "11px 16px", borderRadius: 7, border: `1.5px solid rgba(239,68,68,0.4)`, background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
              >
                Replace with new version
                <span style={{ display: "block", fontSize: 11, fontWeight: 400, color: C.textDim, marginTop: 2 }}>Overwrite the existing site — this cannot be undone</span>
              </button>
              <button
                onClick={() => setOverwriteConfirm(null)}
                style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${C.border2}`, background: "none", color: C.textDim, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
