// ─── Scan results ────────────────────────────────────────────────────────────
const RESULTS = {
  turmeric: {
    foodName: 'Turmeric Powder (Loose)',
    riskLevel: 'UNSAFE',
    safetyScore: 23,
    verdict:
      'Loose turmeric frequently contains lead chromate dye to intensify yellow color. Toxic with regular use — linked to kidney and liver damage.',
    adulterants: [
      { name: 'Lead Chromate', status: 'Detected', risk: 'UNSAFE' },
      { name: 'Sudan Red Dye', status: 'Possible', risk: 'MODERATE' },
    ],
    alternatives: [
      { brand: 'Organic Tattva', fssai: '10016021002417', priceRange: '₹120–180 / 100g', score: 94 },
      { brand: 'Everest Turmeric', fssai: '11516052000275', priceRange: '₹60–90 / 100g', score: 88 },
      { brand: 'Catch Haldi', fssai: '10719023000303', priceRange: '₹55–80 / 100g', score: 85 },
    ],
    community: { count: 7, city: 'Mumbai' },
  },

  milk: {
    foodName: 'Amul Toned Milk',
    riskLevel: 'SAFE',
    safetyScore: 91,
    verdict:
      'No adulterants detected. Amul is FSSAI-certified with consistent quality audits across production facilities.',
    adulterants: [],
    alternatives: [],
    community: { count: 0, city: 'Mumbai' },
  },

  paneer: {
    foodName: 'Loose Paneer',
    riskLevel: 'MODERATE',
    safetyScore: 54,
    verdict:
      'Loose paneer from unregulated vendors often fails quality checks. Starch adulteration is common — a simple iodine test turns it blue-black.',
    adulterants: [
      { name: 'Starch', status: 'Possible', risk: 'MODERATE' },
      { name: 'Detergent', status: 'Trace', risk: 'UNSAFE' },
    ],
    alternatives: [
      { brand: 'Amul Paneer', fssai: '11516052000274', priceRange: '₹80–100 / 200g', score: 92 },
      { brand: 'Mother Dairy', fssai: '11516052000279', priceRange: '₹75–95 / 200g', score: 89 },
      { brand: 'Gowardhan', fssai: '11516052000280', priceRange: '₹70–90 / 200g', score: 87 },
    ],
    community: { count: 3, city: 'Mumbai' },
  },

  honey: {
    foodName: 'Generic Honey',
    riskLevel: 'MODERATE',
    safetyScore: 48,
    verdict:
      'Many Indian honey brands contain high-fructose corn syrup added cheaply after harvesting. Only an NMR test can confirm purity.',
    adulterants: [
      { name: 'High-Fructose Corn Syrup', status: 'Likely', risk: 'MODERATE' },
      { name: 'Inverted Sugar Syrup', status: 'Possible', risk: 'MODERATE' },
    ],
    alternatives: [
      { brand: 'Apis Himalaya Raw Honey', fssai: '10015021001234', priceRange: '₹250–320 / 500g', score: 91 },
      { brand: 'Dabur Honey', fssai: '10015021005678', priceRange: '₹180–220 / 500g', score: 83 },
      { brand: 'Patanjali Honey', fssai: '10015021009012', priceRange: '₹140–170 / 500g', score: 78 },
    ],
    community: { count: 2, city: 'Mumbai' },
  },

  mustard: {
    foodName: 'Loose Mustard Oil',
    riskLevel: 'CRITICAL',
    safetyScore: 12,
    verdict:
      'Loose mustard oil is frequently mixed with argemone oil, which causes epidemic dropsy — a condition affecting heart and eyes. Avoid entirely.',
    adulterants: [
      { name: 'Argemone Oil', status: 'Detected', risk: 'CRITICAL' },
    ],
    alternatives: [
      { brand: 'Fortune Kachi Ghani', fssai: '10019021003456', priceRange: '₹160–200 / L', score: 90 },
      { brand: 'Dhara Mustard Oil', fssai: '10019021007890', priceRange: '₹140–180 / L', score: 88 },
    ],
    community: { count: 11, city: 'Mumbai' },
  },
}

// Fallback for unrecognised food queries
const DEFAULT_RESULT = {
  riskLevel: 'MODERATE',
  safetyScore: 58,
  verdict:
    'Limited data available. Based on FSSAI records, moderate caution is advised for unbranded or loose versions of this product.',
  adulterants: [{ name: 'Unknown Additive', status: 'Possible', risk: 'MODERATE' }],
  alternatives: [
    { brand: 'Buy from FSSAI-certified stores', fssai: '—', priceRange: 'Varies', score: null },
  ],
  community: { count: 0, city: 'Mumbai' },
}

export function getMockResult(query) {
  const q = query.toLowerCase().trim()
  for (const [key, result] of Object.entries(RESULTS)) {
    if (q.includes(key)) return { ...result, id: Date.now().toString() }
  }
  return { ...DEFAULT_RESULT, id: Date.now().toString(), foodName: query }
}

// ─── Scan history ─────────────────────────────────────────────────────────────
export const INITIAL_HISTORY = [
  {
    id: 'h1',
    foodName: 'Amul Toned Milk',
    riskLevel: 'SAFE',
    safetyScore: 91,
    scannedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    result: { ...RESULTS.milk, id: 'h1' },
  },
  {
    id: 'h2',
    foodName: 'Loose Paneer',
    riskLevel: 'MODERATE',
    safetyScore: 54,
    scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    result: { ...RESULTS.paneer, id: 'h2' },
  },
  {
    id: 'h3',
    foodName: 'Turmeric Powder',
    riskLevel: 'UNSAFE',
    safetyScore: 23,
    scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    result: { ...RESULTS.turmeric, id: 'h3' },
  },
  {
    id: 'h4',
    foodName: 'Generic Honey',
    riskLevel: 'MODERATE',
    safetyScore: 48,
    scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString(),
    result: { ...RESULTS.honey, id: 'h4' },
  },
]

// ─── FSSAI alerts ─────────────────────────────────────────────────────────────
export const FSSAI_ALERTS = [
  {
    id: 'f1',
    product: 'Everest Fish Curry Masala',
    brand: 'Everest',
    violation: 'Ethylene oxide detected above permitted limit',
    state: 'National recall',
    date: 'Apr 2024',
    severity: 'CRITICAL',
  },
  {
    id: 'f2',
    product: 'MDH Spices (4 products)',
    brand: 'MDH',
    violation: 'Pesticide residue — ethylene oxide above limit',
    state: 'Maharashtra, National',
    date: 'Apr 2024',
    severity: 'UNSAFE',
  },
  {
    id: 'f3',
    product: 'Loose Turmeric Samples',
    brand: 'Unbranded',
    violation: 'Lead chromate adulteration confirmed in 83% of samples',
    state: 'Maharashtra',
    date: 'Feb 2024',
    severity: 'UNSAFE',
  },
  {
    id: 'f4',
    product: 'Loose Paneer',
    brand: 'Unbranded',
    violation: 'Starch and detergent traces found in market samples',
    state: 'Uttar Pradesh',
    date: 'Feb 2024',
    severity: 'MODERATE',
  },
  {
    id: 'f5',
    product: 'Honey (multiple small brands)',
    brand: 'Various',
    violation: 'HFCS adulteration — NMR test failure rate 77%',
    state: 'National',
    date: 'Jan 2024',
    severity: 'MODERATE',
  },
]

// ─── Community reports ────────────────────────────────────────────────────────
export const COMMUNITY_REPORTS = [
  {
    id: 'c1',
    food: 'Loose turmeric',
    location: 'Dadar West Market, Mumbai',
    description: 'Stains fingers permanently — classic lead chromate sign.',
    reports: 4,
    date: '2 days ago',
  },
  {
    id: 'c2',
    food: 'Loose paneer',
    location: 'Crawford Market, Mumbai',
    description: 'Iodine test turned blue-black, indicating starch adulterant.',
    reports: 7,
    date: '3 days ago',
  },
  {
    id: 'c3',
    food: 'Mustard oil (loose)',
    location: 'Dharavi, Mumbai',
    description: 'Strong pungent smell inconsistent with pure mustard oil.',
    reports: 2,
    date: '1 week ago',
  },
  {
    id: 'c4',
    food: 'Synthetic milk',
    location: 'Bhiwandi, Maharashtra',
    description: 'Soapy foam when shaken. Urea and detergent suspected.',
    reports: 9,
    date: '5 days ago',
  },
]
