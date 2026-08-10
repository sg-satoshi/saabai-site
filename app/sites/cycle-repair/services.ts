export type Tier = {
  name: string;
  tag: string;
  price: string;
  amount: number;
  note: string;
  items: string[];
  featured: boolean;
};

export type LineItem = {
  label: string;
  price: string;
  amount: number;
  from?: boolean;
};

export const tiers: Tier[] = [
  {
    name: "Bronze",
    tag: "The Safety Check",
    price: "$119",
    amount: 119,
    note: "Lubricate drive train / Gear and brake adjustment / Check wheel true and spoke tension (on bike) / Adjust headset, bottom bracket and hubs / Check torque on all bolts / Test ride",
    items: [
      "Lubricate drive train",
      "Gear and brake adjustment",
      "Check wheel true and spoke tension (on bike)",
      "Adjust headset, bottom bracket and hubs",
      "Check torque on all bolts",
      "Test ride",
    ],
    featured: false,
  },
  {
    name: "Silver",
    tag: "The Essential Tune",
    price: "$189",
    amount: 189,
    note: "Remove and clean drive train and bottom bracket / Lubricate drive train / Gear and brake adjustment / Check wheel true and spoke tension (on bike) / Adjust headset, bottom bracket and hubs / Check torque on all bolts / Test ride",
    items: [
      "Remove and clean drive train and bottom bracket",
      "Lubricate drive train",
      "Gear and brake adjustment",
      "Check wheel true and spoke tension (on bike)",
      "Adjust headset, bottom bracket and hubs",
      "Check torque on all bolts",
      "Test ride",
    ],
    featured: true,
  },
  {
    name: "Gold Road",
    tag: "Service",
    price: "$249",
    amount: 249,
    note: "Remove and clean drive train and bottom bracket / Lubricate drive train / Gear and brake adjustment / Check wheel true and spoke tension (on bike) / Remove and adjust headset, bottom bracket and hubs / Check torque on all bolts / Remove, re-grease and reinstall hubs, bottom bracket and headset / Test ride",
    items: [
      "Everything in Silver",
      "Remove and adjust headset, bottom bracket and hubs",
      "Remove, re-grease and reinstall hubs, bottom bracket and headset",
      "Test ride",
    ],
    featured: false,
  },
  {
    name: "Gold MTB",
    tag: "Service",
    price: "$349",
    amount: 349,
    note: "Remove and clean drive train and bottom bracket / Lubricate drive train / Gear and brake adjustment / Check wheel true and spoke tension (on bike) / Adjust headset, bottom bracket and hubs / Check torque on all bolts / Remove, re-grease and reinstall hubs, bottom bracket and headset / Brake bleed / Check front and back shocks for correct function / Test ride",
    items: [
      "Everything in Gold Road",
      "Brake bleed",
      "Check front and back shocks for correct function",
      "Test ride",
    ],
    featured: false,
  },
];

export const additionalServiceWork: LineItem[] = [
  { label: "Call out fee for repairs under $120", price: "$70", amount: 70 },
  { label: "Fit tyre or tube (per wheel)", price: "$20", amount: 20 },
  { label: "Rear fat e-bike tube", price: "$70", amount: 70 },
  { label: "Fit handlebar tape", price: "$25", amount: 25 },
  { label: "Adjust gears (per end)", price: "$25", amount: 25 },
  { label: "Adjust brakes (per end)", price: "$25", amount: 25 },
  { label: "Fit brakes or gears (per end)", price: "$25", amount: 25 },
  { label: "Fit singles (per wheel, glue is extra)", price: "$45", amount: 45 },
  { label: "Fit tubeless tyres (per wheel, sealant is extra)", price: "$25", amount: 25 },
  { label: "True wheels, from", price: "$25", amount: 25, from: true },
  { label: "True disc brake wheels, from", price: "$35", amount: 35, from: true },
  { label: "Bleed disc brakes (per end)", price: "$35", amount: 35 },
  { label: "Repair or replace Bottom Bracket", price: "$45", amount: 45 },
  { label: "Repair or replace Headset", price: "$55", amount: 55 },
  { label: "Repair or replace Hub Cones or Bearings", price: "$45", amount: 45 },
  { label: "Fit new chain and cluster", price: "$65", amount: 65 },
  { label: "Respoke wheels, from", price: "$80-$130", amount: 80, from: true },
  { label: "Internal Hub rebuild", price: "$66", amount: 66 },
  { label: "Disassemble/reassemble", price: "$399-$550", amount: 399, from: true },
  { label: 'Service kid\u2019s bike (up to 20")', price: "$59", amount: 59 },
  { label: "Other service type (per hour)", price: "$99", amount: 99, from: true },
];

export const specialist: LineItem[] = [
  { label: "Full Pull Down & Rebuild TT-Bike", price: "$399-$550", amount: 399, from: true },
  { label: "Basic Wheel Build (per wheel)", price: "$70", amount: 70 },
  { label: "High-End Wheel Build", price: "$120", amount: 120 },
  { label: "Boxed Bike Assembly", price: "$99", amount: 99 },
  { label: "E-Bike Servicing", price: "$149-$299", amount: 149, from: true },
];

export const OWNER_EMAIL = "stuscyclerepairs@gmail.com";
