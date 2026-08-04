import { SHINGLE_IMAGES } from './shingleImages';

export const PINNACLE_COLORS = [
  "Weathered Wood", "Pewter Gray", "Black Shadow", "Coastal Granite", "Copper Canyon", 
  "Hearthstone", "Heatherblend", "Majestic Shake", "Morning Harvest", "Oyster Shell", 
  "Summer Storm", "Weathered Shadow", "Burnt Hickory", "Sunset", "Tan Mist", "Woodland Green"
];

export const PROLAM_COLORS = [
  "Weathered Wood", "Pewter Gray", "Black Shadow", "Desert Shake", "Hearthstone Gray", "Hickory", "Weathered Shadow"
];

export const IMPACT_COLORS = [
  "Black Shadow", "Hearthstone", "Morning Harvest", "Pewter", "Weathered Wood"
];

export const COLOR_TEXTURES = {
  "Weathered Wood": { color: "#4a3c31", pattern: "repeating-linear-gradient(45deg, #382b22, #382b22 12px, #4a3c31 12px, #4a3c31 24px)" },
  "Pewter Gray": { color: "#5a6268", pattern: "repeating-linear-gradient(45deg, #3f454a, #3f454a 12px, #5a6268 12px, #5a6268 24px)" },
  "Pewter": { color: "#5a6268", pattern: "repeating-linear-gradient(45deg, #3f454a, #3f454a 12px, #5a6268 12px, #5a6268 24px)" },
  "Black Shadow": { color: "#1f2421", pattern: "repeating-linear-gradient(45deg, #101311, #101311 12px, #1f2421 12px, #1f2421 24px)" },
  "Coastal Granite": { color: "#475569", pattern: "repeating-linear-gradient(45deg, #334155, #334155 12px, #475569 12px, #475569 24px)" },
  "Copper Canyon": { color: "#7a462b", pattern: "repeating-linear-gradient(45deg, #59311c, #59311c 12px, #7a462b 12px, #7a462b 24px)" },
  "Hearthstone": { color: "#8c8275", pattern: "repeating-linear-gradient(45deg, #6d6459, #6d6459 12px, #8c8275 12px, #8c8275 24px)" },
  "Hearthstone Gray": { color: "#64748b", pattern: "repeating-linear-gradient(45deg, #475569, #475569 12px, #64748b 12px, #64748b 24px)" },
  "Heatherblend": { color: "#5c4f43", pattern: "repeating-linear-gradient(45deg, #40362c, #40362c 12px, #5c4f43 12px, #5c4f43 24px)" },
  "Majestic Shake": { color: "#6b5b45", pattern: "repeating-linear-gradient(45deg, #524432, #524432 12px, #6b5b45 12px, #6b5b45 24px)" },
  "Morning Harvest": { color: "#9a7b56", pattern: "repeating-linear-gradient(45deg, #7c6242, #7c6242 12px, #9a7b56 12px, #9a7b56 24px)" },
  "Oyster Shell": { color: "#7c8585", pattern: "repeating-linear-gradient(45deg, #5b6262, #5b6262 12px, #7c8585 12px, #7c8585 24px)" },
  "Summer Storm": { color: "#334155", pattern: "repeating-linear-gradient(45deg, #1e293b, #1e293b 12px, #334155 12px, #334155 24px)" },
  "Weathered Shadow": { color: "#3a342e", pattern: "repeating-linear-gradient(45deg, #26211c, #26211c 12px, #3a342e 12px, #3a342e 24px)" },
  "Burnt Hickory": { color: "#583d28", pattern: "repeating-linear-gradient(45deg, #3d2919, #3d2919 12px, #583d28 12px, #583d28 24px)" },
  "Sunset": { color: "#854d27", pattern: "repeating-linear-gradient(45deg, #63381a, #63381a 12px, #854d27 12px, #854d27 24px)" },
  "Tan Mist": { color: "#92816b", pattern: "repeating-linear-gradient(45deg, #746552, #746552 12px, #92816b 12px, #92816b 24px)" },
  "Woodland Green": { color: "#2d4739", pattern: "repeating-linear-gradient(45deg, #1c2e24, #1c2e24 12px, #2d4739 12px, #2d4739 24px)" },
  "Desert Shake": { color: "#7c684d", pattern: "repeating-linear-gradient(45deg, #5e4e38, #5e4e38 12px, #7c684d 12px, #7c684d 24px)" },
  "Hickory": { color: "#4f3724", pattern: "repeating-linear-gradient(45deg, #362416, #362416 12px, #4f3724 12px, #4f3724 24px)" }
};

export function getPackageColorList(tier) {
  if (tier === 'Silver') return PROLAM_COLORS;
  // Both Gold and Elite use Pinnacle Pristine colors (16 colors)
  return PINNACLE_COLORS;
}

export function getPackageShingleName(tier) {
  if (tier === 'Silver') return 'Atlas Pro-Lam Architectural Shingles';
  if (tier === 'Elite') return 'Atlas Pinnacle Pristine (IHR ELITE)';
  return 'Atlas Pinnacle Pristine Shingles';
}

export function getShingleImage(tier, colorName) {
  let prefix = 'Pinnacle';
  if (tier === 'Silver') prefix = 'ProLam';
  const key = `${prefix}|${colorName}`;
  return SHINGLE_IMAGES[key] || SHINGLE_IMAGES[`Pinnacle|${colorName}`] || null;
}
