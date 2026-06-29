export type Package = {
  id: string;
  name: string;
  suburb: string;
  state: string;
  estate: string;
  builder: string;
  beds: number;
  baths: number;
  cars: number;
  landSize: number;
  houseSize: number;
  retailPrice: number;
  wholesalePrice: number;
  landReady: string;
  badge: "Below Market" | "New Release" | "Limited Availability";
  image: string;
  highlight: string;
};

export const packages: Package[] = [
  {
    id: "northbridge-rise-42",
    name: "The Northbridge 42",
    suburb: "Tarneit",
    state: "VIC",
    estate: "Northbridge Rise",
    builder: "Metricon",
    beds: 4, baths: 2, cars: 2, landSize: 448, houseSize: 248,
    retailPrice: 689000, wholesalePrice: 621000,
    landReady: "Mar 2026",
    badge: "Below Market",
    image: "/sites/wholesale-homes/package-1.jpg",
    highlight: "Saved $68K vs current valuation",
  },
  {
    id: "parklands-haven-36",
    name: "Parklands Haven 36",
    suburb: "Box Hill",
    state: "NSW",
    estate: "Parklands Estate",
    builder: "Metricon",
    beds: 4, baths: 2, cars: 2, landSize: 512, houseSize: 218,
    retailPrice: 798000, wholesalePrice: 729000,
    landReady: "Jun 2026",
    badge: "New Release",
    image: "/sites/wholesale-homes/package-2.jpg",
    highlight: "9% below comparable suburb sales",
  },
  {
    id: "edgewater-loft-28",
    name: "Edgewater Loft 28",
    suburb: "Caloundra South",
    state: "QLD",
    estate: "Aura",
    builder: "Stockland Partner",
    beds: 3, baths: 2, cars: 1, landSize: 312, houseSize: 184,
    retailPrice: 612000, wholesalePrice: 558000,
    landReady: "Feb 2026",
    badge: "Limited Availability",
    image: "/sites/wholesale-homes/package-3.jpg",
    highlight: "Only 3 lots remaining",
  },
  {
    id: "ridgeview-prestige-48",
    name: "Ridgeview Prestige 48",
    suburb: "Officer",
    state: "VIC",
    estate: "Arcadia",
    builder: "Metricon",
    beds: 4, baths: 3, cars: 2, landSize: 560, houseSize: 286,
    retailPrice: 849000, wholesalePrice: 772000,
    landReady: "May 2026",
    badge: "Below Market",
    image: "/sites/wholesale-homes/hero-home.jpg",
    highlight: "Premium corner lot, north-facing",
  },
  {
    id: "harbourline-villa-32",
    name: "Harbourline Villa 32",
    suburb: "Cobbitty",
    state: "NSW",
    estate: "Emerald Hills",
    builder: "Mirvac Partner",
    beds: 4, baths: 2, cars: 2, landSize: 420, houseSize: 232,
    retailPrice: 742000, wholesalePrice: 678000,
    landReady: "Aug 2026",
    badge: "New Release",
    image: "/sites/wholesale-homes/interior-kitchen.jpg",
    highlight: "First release pricing locked in",
  },
  {
    id: "sunnydale-terrace-30",
    name: "Sunnydale Terrace 30",
    suburb: "Pimpama",
    state: "QLD",
    estate: "Gainsborough Greens",
    builder: "Metricon",
    beds: 3, baths: 2, cars: 2, landSize: 392, houseSize: 198,
    retailPrice: 645000, wholesalePrice: 589000,
    landReady: "Apr 2026",
    badge: "Below Market",
    image: "/sites/wholesale-homes/lifestyle-living.jpg",
    highlight: "Growth corridor, strong rental demand",
  },
];

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
