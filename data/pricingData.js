export const PRICING = {
  Silver: {
    name: 'SILVER',
    subtitle: 'Essential protection',
    targetPerSq: 525,
    ohioAdjustment: 50,
    railClass: 'pkg-silver',
    badge: null
  },
  Gold: {
    name: 'GOLD',
    subtitle: 'Most Popular',
    targetPerSq: 575,
    ohioAdjustment: 50,
    railClass: 'pkg-gold',
    badge: 'MOST POPULAR'
  },
  Elite: {
    name: 'IHR ELITE',
    subtitle: 'Best Value & Maximum Protection',
    targetPerSq: 650,
    ohioAdjustment: 130,
    railClass: 'pkg-elite',
    badge: null
  }
};

export const OHIO_PRICE_ADJUSTMENTS = {
  Silver: 50,
  Gold: 50,
  Elite: 130
};

export const INTEREST_RATE = 0.1299; // 12.99% APR

export function getPricePerSquare(tier, state) {
  const isOhio = state && (state.trim().toUpperCase() === 'OH' || state.trim().toUpperCase() === 'OHIO');
  const baseRate = PRICING[tier]?.targetPerSq || 525;
  const adj = isOhio ? (PRICING[tier]?.ohioAdjustment || 0) : 0;
  return baseRate + adj;
}

export function calculatePMT(rate, nper, pv) {
  if (!rate || rate === 0) return pv / nper;
  return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

export function getPackageFeatures(tier, state, customPricingObj = null) {
  if (customPricingObj && customPricingObj[tier] && Array.isArray(customPricingObj[tier].features) && customPricingObj[tier].features.length > 0) {
    return customPricingObj[tier].features;
  }

  const isOhio = state && (state.trim().toUpperCase() === 'OH' || state.trim().toUpperCase() === 'OHIO');

  if (tier === 'Silver') {
    return [
      '3-year workmanship warranty',
      'Atlas Pro-Lam shingles',
      'F5 drip edge',
      isOhio ? 'Ice & water shield at eaves and valleys' : 'Ice & water shield in valleys',
      '2 OSB sheets included'
    ];
  }

  if (tier === 'Gold') {
    return [
      '10-year workmanship warranty',
      'Atlas Pinnacle Pristine + streak-free guarantee',
      'F5 drip edge',
      isOhio ? 'Ice & water shield at eaves and valleys' : 'Ice & water shield in valleys',
      '3 OSB sheets included'
    ];
  }

  return [
    'Lifetime workmanship warranty',
    isOhio ? 'Atlas Pinnacle Impact shingles' : 'Atlas Pinnacle Pristine + streak-free guarantee',
    'F8 drip edge',
    'Ice & water shield at eaves and valleys',
    '5 OSB sheets included',
    'Permaboots'
  ];
}

export function getFullPackageSpecs(tier, state, customPricingObj = null) {
  if (customPricingObj && customPricingObj[tier] && Array.isArray(customPricingObj[tier].fullSpecs) && customPricingObj[tier].fullSpecs.length > 0) {
    return customPricingObj[tier].fullSpecs;
  }

  const isOhio = state && (state.trim().toUpperCase() === 'OH' || state.trim().toUpperCase() === 'OHIO');

  if (tier === 'Silver') {
    return [
      { category: 'Shingle System', detail: 'Atlas Pro-Lam Architectural Shingles (Class A Fire Rating)' },
      { category: 'Warranty', detail: '3-Year Iron Horse Workmanship Warranty + Atlas 30-Yr Limited Warranty' },
      { category: 'Underlayment', detail: 'Synthetic Water-Resistant Underlayment across full deck' },
      { category: 'Ice & Water Shield', detail: isOhio ? 'Self-adhering membrane installed at all eaves, valleys, & penetrations' : 'Self-adhering membrane installed in all valleys' },
      { category: 'Drip Edge & Metals', detail: 'F5 Heavy-Duty Aluminum Drip Edge on all eaves & rakes' },
      { category: 'Ridge & Ventilation', detail: 'High-Flow Ridge Vent & Starter Shingles along perimeter' },
      { category: 'Decking Replacement', detail: 'Up to 2 OSB Sheeting Replacement Panels included free' },
      { category: 'Clean Up & Inspection', detail: 'Full Magnetic Nail Sweep & Final Quality Control Walkthrough' }
    ];
  }

  if (tier === 'Gold') {
    return [
      { category: 'Shingle System', detail: 'Atlas Pinnacle® Pristine Architectural Shingles featuring Scotchgard™ Protector' },
      { category: 'Warranty', detail: '10-Year Iron Horse Workmanship Warranty + Lifetime Algae Streak-Free Guarantee' },
      { category: 'Underlayment', detail: 'Premium High-Temp Synthetic Underlayment' },
      { category: 'Ice & Water Shield', detail: isOhio ? 'Dual-Layer Self-Adhering Ice & Water Shield at eaves, valleys, and wall flashings' : 'Heavy-Duty Ice & Water Shield in all valleys & critical leak zones' },
      { category: 'Drip Edge & Metals', detail: 'F5 Custom-Extruded Aluminum Drip Edge' },
      { category: 'Ridge & Ventilation', detail: 'Atlas HP Technology Ridge Vent & Pre-Cut Starter Shingles' },
      { category: 'Decking Replacement', detail: 'Up to 3 OSB Sheeting Replacement Panels included free' },
      { category: 'Clean Up & Inspection', detail: 'Full Magnetic Yard Sweep, Gutter Cleanout & Manager Sign-off' }
    ];
  }

  return [
    { category: 'Shingle System', detail: isOhio ? 'Atlas Pinnacle® Impact Class 4 Impact Resistant Shingles' : 'Atlas Pinnacle® Pristine Architectural Shingles with Scotchgard™ Protector' },
    { category: 'Warranty', detail: 'LIFETIME Iron Horse Workmanship Warranty + Premium Manufacturer System Warranty' },
    { category: 'Underlayment', detail: 'Commercial-Grade Heavyweight Synthetic Underlayment' },
    { category: 'Ice & Water Shield', detail: 'Full Eave & Valley Ice & Water Shield Protection (Complete Perimeter Seal)' },
    { category: 'Drip Edge & Metals', detail: 'F8 Oversized Drip Edge Flashing for maximum water shed' },
    { category: 'Ridge & Ventilation', detail: 'Atlas High-Performance Ridge Caps, Ridge Vents & Permaboots Pipe Flashing Seals' },
    { category: 'Decking Replacement', detail: 'Up to 5 OSB Sheeting Replacement Panels included free' },
    { category: 'Clean Up & Inspection', detail: 'VIP Magnetic Yard & Flowerbed Sweep, Gutter Wash & Executive QC Inspection' }
  ];
}

export const ALLOWED_STATES = [
  'NC', 'SC', 'OH', 'TN', 
  'NORTH CAROLINA', 'SOUTH CAROLINA', 'OHIO', 'TENNESSEE'
];
