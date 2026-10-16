export const SITE_URL = "https://stuscyclerepairs.com";

/** Every indexable page on stuscyclerepairs.com. Keep in sync with real routes. */
export const SITEMAP_PATHS: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/gold-coast", priority: 0.9, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/quote", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
];

export const faqs: Array<{ q: string; a: string }> = [
  {
    q: "Where does Stu service bikes?",
    a: "Stu travels to you across all of the Gold Coast, QLD and the Tweed Coast, NSW. He services bikes at your home or at work from his mobile workshop.",
  },
  {
    q: "Do I need to bring my bike to a shop?",
    a: "No. Stu arrives with a fully equipped mobile workshop and services your bike while you work, train or rest. For complex rebuilds, wheel builds or boxed bike assembly, he can collect your bike and return it test-ridden.",
  },
  {
    q: "What does a bike service cost?",
    a: "Servicing starts at $119 for the Bronze Safety Check, $189 for the Silver Essential Tune, $249 for the Gold Road service and $349 for the Gold MTB service. Parts are not included. The full price list is on the home page.",
  },
  {
    q: "What is included in each service?",
    a: "Bronze covers lubrication, gear and brake adjustment, wheel true and spoke tension check, headset, bottom bracket and hub adjustment, a torque check on all bolts and a test ride. Silver adds removing and cleaning the drive train and bottom bracket. Gold Road adds removing, re-greasing and reinstalling the hubs, bottom bracket and headset. Gold MTB adds a brake bleed and a check of the front and back shocks.",
  },
  {
    q: "Are parts included in the price?",
    a: "No. Service prices cover labour only, and parts are extra. Some jobs, such as glue for singles or sealant for tubeless tyres, are also charged separately.",
  },
  {
    q: "Is there a call-out fee?",
    a: "There is a $70 call-out fee for repairs under $120.",
  },
  {
    q: "Can Stu work on e-bikes?",
    a: "Yes. Stu does diagnostics and servicing for modern high-torque e-bike systems, including motors, drivetrains, brakes and firmware checks. E-bike servicing is $149 to $299, and e-bike wheel builds are $159 per end.",
  },
  {
    q: "Do you service kids' bikes?",
    a: "Yes. A service for a kid's bike up to 20 inch is $59.",
  },
  {
    q: "How much experience does Stu have?",
    a: "Stu has 37 years of experience as a bike mechanic, working on everything from carbon race bikes to daily commuters and e-bikes.",
  },
  {
    q: "How do I book?",
    a: "Call Stu on 0405 225 721, email stuscyclerepairs@gmail.com, or use the quote form on this website. If you are not sure whether Stu covers your suburb, send an enquiry and he will let you know.",
  },
];
