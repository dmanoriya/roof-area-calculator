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
    subtitle: 'Best overall value',
    targetPerSq: 575,
    ohioAdjustment: 50,
    railClass: 'pkg-gold',
    badge: 'MOST POPULAR'
  },
  Elite: {
    name: 'IHR ELITE',
    subtitle: 'Maximum protection',
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

export function getPackageFeatures(tier, state) {
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
    '5 OSB sheets + Permaboots'
  ];
}

export const ALLOWED_STATES = [
  'NC', 'SC', 'OH', 'TN', 
  'NORTH CAROLINA', 'SOUTH CAROLINA', 'OHIO', 'TENNESSEE'
];
