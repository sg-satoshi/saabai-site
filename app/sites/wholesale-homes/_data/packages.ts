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
  description: string;
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
    description: "A spacious four-bedroom family home designed for modern living. The Northbridge 42 features an open-plan kitchen, dining and living area that flows onto a covered alfresco. The master suite includes a walk-in robe and ensuite, while the remaining bedrooms are serviced by a main bathroom with separate bath and shower. Located in Metricon's master-planned Northbridge Rise estate with parkland and future school precinct.",
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
    description: "A thoughtfully designed four-bedroom home in Sydney's thriving North West Growth Corridor. The Parklands Haven 36 delivers a functional layout with a dedicated study, media room, and an expansive open-plan living area. The kitchen features a walk-in pantry and island bench. Set on a generous 512m² block within the sought-after Parklands Estate, close to the new Box Hill town centre and future rail.",
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
    description: "A low-maintenance three-bedroom home perfect for investors and first-home buyers. The Edgewater Loft 28 maximises its 312m² lot with an intelligent split-level design that separates the master suite from the secondary bedrooms. Open-plan living connects to a private courtyard. Located in Stockland's award-winning Aura community, minutes from the new Caloundra CBD and Baringa town centre. Only 3 lots remaining in this release.",
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
    description: "A premium four-bedroom family residence on one of the largest lots in the Arcadia estate. The Ridgeview Prestige 48 offers dual living zones, a grand master retreat with ensuite and walk-in robe, and a gourmet kitchen with butler's pantry. The north-facing corner aspect captures natural light throughout the day and provides additional side access — ideal for a boat, caravan or future shed. Landscaping and driveway included.",
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
    description: "A beautifully proportioned four-bedroom home designed by Mirvac's award-winning architecture team. The Harbourline Villa 32 features a striking facade, a formal entry foyer, and a light-filled open-plan living area that opens onto a covered entertainer's deck. The chef's kitchen includes stone benchtops, gas cooking and a walk-in pantry. Part of the first release at Emerald Hills — pricing is locked in at pre-construction levels, well below future stages.",
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
    description: "A smart three-bedroom terrace home in one of Queensland's fastest-growing corridors. The Sunnydale Terrace 30 delivers low-maintenance living with a private courtyard, single lock-up garage and separate storage. The master bedroom includes a walk-in robe and ensuite. Positioned within the Gainsborough Greens master-planned community featuring a championship golf course, village centre, and future school. Proven rental demand with vacancy rates under 1% in the area.",
  },
];

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
