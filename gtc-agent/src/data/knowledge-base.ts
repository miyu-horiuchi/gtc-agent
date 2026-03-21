// Seed knowledge base from Research at Scale 2026 + Miyu's experience

export interface Factory {
  name: string;
  category: string;
  url?: string;
  contact?: string;
  location?: string;
  notes?: string;
  moq?: string;
  verified: boolean;
  source: string;
}

export interface Tip {
  content: string;
  category: "pre-trip" | "logistics" | "manufacturing" | "sourcing" | "culture" | "tools";
  source: string;
  verified: boolean;
}

export const FACTORIES: Factory[] = [
  // Stepper Motors
  { name: "OMC StepperOnline", category: "stepper-motors", url: "https://www.omc-stepperonline.com/", verified: true, source: "Research at Scale 2026 - Jake" },
  { name: "Xfoyomotor", category: "stepper-motors", url: "https://www.xfoyomotor.com/", verified: true, source: "Research at Scale 2026 - Jake" },
  { name: "TTmotor", category: "stepper-motors", url: "https://www.ttmotor.com/", verified: true, source: "Research at Scale 2026 - Jake" },
  { name: "UAV-CN Tmotor", category: "stepper-motors", url: "https://uav-cn.tmotor.com/", verified: true, source: "Research at Scale 2026 - Jake" },
  { name: "Rtelligent", category: "stepper-motors", url: "https://www.rtelligentglobal.com/", verified: true, source: "Research at Scale 2026 - Jake" },
  { name: "Maintex Motors", category: "stepper-motors", url: "https://maintexmotors.com/about-us/", verified: true, source: "Research at Scale 2026 - Jake" },

  // CNC Manufacturers
  { name: "Jinsucnc", category: "cnc", url: "https://www.jinsucnc.com/", verified: true, source: "Research at Scale 2026" },
  { name: "Elephant Robotics (Nestworks.ai)", category: "cnc", url: "https://www.nestworks.ai/", verified: true, source: "Research at Scale 2026" },
  { name: "Xtool", category: "cnc", url: "https://www.xtool.com/", notes: "Can probably intro via CBA", verified: true, source: "Research at Scale 2026" },
  { name: "Lunyeecnc", category: "cnc", url: "https://www.lunyeecnc.com/", verified: true, source: "Research at Scale 2026" },
  { name: "Genmitsu", category: "cnc", url: "https://genmitsu.com/", verified: true, source: "Research at Scale 2026" },

  // Automation Components
  { name: "China-ME", category: "automation", url: "https://www.china-me.com/visit-factory", verified: true, source: "Research at Scale 2026" },

  // Aluminum / Sand Casting
  { name: "Sinoextrud", category: "aluminum-casting", url: "https://sinoextrud.com/about/", verified: true, source: "Research at Scale 2026" },
  { name: "Fioria", category: "aluminum-casting", url: "https://fioria.cn/", verified: true, source: "Research at Scale 2026" },
  { name: "Super-Ingenuity", category: "sand-casting", url: "https://super-ingenuity.cn/sand-casting/", verified: true, source: "Research at Scale 2026" },

  // Chip / MCU
  { name: "Espressif (ESP32)", category: "chips", url: "https://www.espressif.com/", verified: true, source: "Research at Scale 2026" },
  { name: "WCH-IC (CH32V307)", category: "chips", url: "https://www.wch-ic.com/products/CH32V307.html", verified: true, source: "Research at Scale 2026" },

  // Smart Rings
  { name: "Vanssa", category: "smart-rings", url: "https://szvanssa.en.alibaba.com/index.html", verified: true, source: "Research at Scale 2026 - Raul" },
  { name: "Shenzhen Lanke Technology (Xuanzhi)", category: "smart-rings", url: "https://www.xuanzhi.co/", verified: true, source: "Research at Scale 2026 - Raul" },

  // Batteries
  { name: "Shenzhen Nova Energy", category: "batteries", url: "https://novabattery.en.alibaba.com/company_profile.html", verified: true, source: "Research at Scale 2026 - Raul" },
  { name: "Grepow", category: "batteries", url: "https://www.grepow.com/wearables/smart-ring.html", notes: "Specializes in smart ring batteries", verified: true, source: "Research at Scale 2026 - Cedric" },

  // FPC
  { name: "iSource Asia", category: "fpc", url: "https://isource-asia.com", contact: "sam.hu@isource-asia.com", verified: true, source: "Research at Scale 2026" },

  // Laser / DIY
  { name: "深圳市银叶王科技有限公司", category: "laser", location: "Shenzhen", notes: "Laser DIY company, visited with Shih-Wei Chieh", verified: true, source: "Research at Scale 2026" },
];

export const SOURCING_PLATFORMS = [
  { name: "LCSC", url: "https://lcsc.com", description: "Electronic components, great prices" },
  { name: "Taobao", url: "https://taobao.com", description: "Everything, in Chinese, use with translator" },
  { name: "Alibaba", url: "https://alibaba.com", description: "B2B supplier marketplace, MOQ-based" },
  { name: "1688.com", url: "https://1688.com", description: "Chinese domestic Alibaba, better prices, needs Chinese" },
  { name: "Ali Express", url: "https://aliexpress.com", description: "Small quantity, consumer-friendly" },
  { name: "Made-in-China", url: "https://made-in-china.com", description: "B2B alternative to Alibaba" },
  { name: "JLC PCB", url: "https://jlcpcb.com", description: "PCB, CNC, 3DP, FDM, SLS, SLM, SLA, MJF, WJP, BJ manufacturing" },
  { name: "Oshwlab", url: "https://oshwlab.com", description: "Open source hardware lab" },
];

export const KEY_LOCATIONS = [
  { name: "Chaihuo Makerspace", area: "Nanshan", description: "Main makerspace, hosts workshops and events. Home base for Research at Scale residency.", address: "广东省深圳市南山区西丽街道万科云城设计公社B6区B622 柴火创客" },
  { name: "Huaqiangbei (HQB)", area: "Futian", description: "The world's largest electronics market. Multiple buildings with component shops, dev kits, and gadgets." },
  { name: "Yihua Electron Plaza", area: "Futian", description: "Market to find and connect with factories." },
  { name: "TroubleMakers", area: "HQB", description: "Makerspace in Huaqiangbei area, hosts talks and events." },
  { name: "Nantou Urban Village", area: "Nanshan", description: "Historic village with art galleries and cafes." },
  { name: "Seeed Studio HQ", area: "Nanshan", description: "Major open-source hardware company. Offers factory tours and workshops." },
];

export const PRE_TRIP_CHECKLIST: Tip[] = [
  { content: "Get a VPN before you go. ExpressVPN or Astrill recommended. Test it BEFORE you leave — some get blocked periodically.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Get an eSIM that works in China (Airalo or similar). Your US carrier probably won't work well.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Set up WeChat BEFORE arrival. You need someone already in China to verify your account. Ask a contact to help.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Set up Alipay and link an international card. Many places don't accept cash or foreign cards.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Download Didi (ride-hailing, like Uber), Baidu Maps (Google Maps doesn't work well in China), and Taobao.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "From HK Airport: take the high-speed rail to Shenzhen. The Futian station is closest to Huaqiangbei. The whole trip takes about 30-45 minutes.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Register your trademark and IP protection BEFORE going to China. Always assume people will get access to your plans.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Have your designs finalized: CAD files, schematics, full BOM with component specs, 2D drawings with tolerances, 3D model.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Prepare factory outreach messages in both English and Chinese before you go.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
  { content: "Stay near Huaqiangbei (Futian) for electronics sourcing, or Nanshan for the tech/startup district and Chaihuo makerspace.", category: "pre-trip", source: "Research at Scale 2026", verified: true },
];

export const MANUFACTURING_TIPS: Tip[] = [
  { content: "Visit 3-5 factories for each process you need. Don't commit to the first one.", category: "manufacturing", source: "Research at Scale 2026", verified: true },
  { content: "Hardware development stages: POC → EVT (5-12 units) → DVT (20-200 units) → PVT (50-500 units) → Mass Production (1000+).", category: "manufacturing", source: "Industry standard", verified: true },
  { content: "DFM (Design for Manufacturability) feedback from factories is gold. Share your designs early and ask for their input.", category: "manufacturing", source: "Research at Scale 2026", verified: true },
  { content: "Typical payment terms: 30% deposit, 30% after tooling, 40% before shipping. Negotiate based on relationship.", category: "manufacturing", source: "Research at Scale 2026", verified: true },
  { content: "Use Traceformer.io to catch schematic mistakes before sending to fab.", category: "tools", source: "Research at Scale 2026", verified: true },
  { content: "Seeed Studio has an 'Open Manufacturing Whitepaper' worth reading before your trip.", category: "tools", source: "Research at Scale 2026", verified: true },
  { content: "Use ScalableHCI.com/map for an electronic market map of Shenzhen.", category: "tools", source: "Research at Scale 2026", verified: true },
  { content: "Sourcing expert tip: contact Aqua (ask Sam at iSource Asia) for specialized sourcing help.", category: "sourcing", source: "Research at Scale 2026", verified: true },
];

export const CATEGORIES = [
  "stepper-motors", "cnc", "automation", "aluminum-casting", "sand-casting",
  "chips", "smart-rings", "batteries", "fpc", "laser", "pcb", "3d-printing",
  "injection-molding", "assembly", "packaging", "logistics",
] as const;

/**
 * Weighted search scoring for factories.
 * Considers exact matches, partial token matches, and category relevance.
 */
function scoreFactory(factory: Factory, query: string): number {
  const q = query.toLowerCase();
  const tokens = q.split(/[\s\-_,]+/).filter(Boolean);
  const name = factory.name.toLowerCase();
  const category = factory.category.toLowerCase();
  const notes = (factory.notes || "").toLowerCase();

  let score = 0;

  // Exact full-query match in name (highest weight)
  if (name.includes(q)) score += 10;
  // Exact full-query match in category
  if (category.includes(q)) score += 8;
  // Exact full-query match in notes
  if (notes.includes(q)) score += 4;

  // Token-level partial matching
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (name.includes(token)) score += 3;
    if (category.includes(token)) score += 5; // category relevance weighted higher per-token
    if (notes.includes(token)) score += 2;
  }

  return score;
}

export function searchFactories(query: string): Factory[] {
  const scored = FACTORIES.map(f => ({ factory: f, score: scoreFactory(f, query) }));
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.factory);
}

export function getFactoriesByCategory(category: string): Factory[] {
  const cat = category.toLowerCase();
  return FACTORIES.filter(f => f.category.toLowerCase().includes(cat));
}

export function getAllTips(): Tip[] {
  return [...PRE_TRIP_CHECKLIST, ...MANUFACTURING_TIPS];
}
