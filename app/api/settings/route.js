import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAusNwdN9zPqXJ_doW_M4mbdrhtJkZkdpU',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  silverPerSq: 525,
  goldPerSq: 575,
  elitePerSq: 650,
  silverOhioAdj: 50,
  goldOhioAdj: 50,
  eliteOhioAdj: 130,
  aprRate: 12.99,
  pricing: {
    Silver: { name: 'SILVER', targetPerSq: 525, ohioAdjustment: 50 },
    Gold: { name: 'GOLD', targetPerSq: 575, ohioAdjustment: 50 },
    Elite: { name: 'IHR ELITE', targetPerSq: 650, ohioAdjustment: 130 }
  },
  pitchMultipliers: {
    flat: 1.0,
    low: 1.05,
    medium: 1.15,
    steep: 1.25,
    high: 1.41
  },
  termsAndConditions: `IRON HORSE ROOFING - TERMS & CONDITIONS

1. AUTHORIZATION & SCOPE OF WORK
By accepting this proposal, Client authorizes Iron Horse Roofing (IHR) to perform the roof replacement or repair services as specified in the selected package. All work will be performed in accordance with manufacturer specifications, local building codes, and industry standards.

2. PAYMENT & DEPOSIT REQUIREMENTS
- For direct payments (Credit Card, ACH, or Apple Pay), a 50% deposit is required upon scheduling your project date, with the remaining 50% balance due immediately upon completion of the roofing installation.
- For financed projects (GoodLeap or designated lending partners), formal loan approval must be finalized prior to material delivery and project commencement.

3. PRE-EXISTING CONDITIONS & EXTRA OSB SHEETS
Any unforeseen structural defects, decayed roof decking beyond the OSB sheet allowance included in your chosen package tier (Silver: 2 sheets, Gold: 3 sheets, Elite: 5 sheets), or hidden architectural damage discovered during tear-off will be documented and reviewed with Client prior to performing additional repairs.

4. WARRANTY & WORKMANSHIP
Workmanship warranties are provided by Iron Horse Roofing according to the package selected (Silver: 3-Year, Gold: 10-Year, Elite: Lifetime). Shingle product warranties are provided directly by Atlas Roofing Corporation.

5. PROPERTY ACCESS & PREPARATION
Client agrees to provide reasonable driveway access and property clearance for crew vehicles, dumpsters, and material delivery during scheduled installation dates. Iron Horse Roofing will exercise extreme care to protect landscaping and property.

6. CANCELLATION & REFUNDS
Orders cancelled after material dispatch or within 48 hours of scheduled installation date may be subject to material restocking fees.`,
  goodleapEnabled: true,
  goodleapEnv: 'sandbox',
  goodleapOrgId: 'loanpal',
  goodleapOrgKey: 'Cle@nEnergy!',
  goodleapCategoryId: '',
  goodleapPromotionId: ''
};

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (err) {
    console.error('Error reading settings:', err);
  }
  return DEFAULT_SETTINGS;
}

function writeSettings(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing settings:', err);
    return false;
  }
}

export async function GET() {
  const settings = readSettings();
  const { adminPassword, ...safeSettings } = settings;
  return NextResponse.json({ success: true, settings: safeSettings });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const currentSettings = readSettings();

    const silverPerSq = Number(body.silverPerSq ?? currentSettings.silverPerSq ?? 525);
    const goldPerSq = Number(body.goldPerSq ?? currentSettings.goldPerSq ?? 575);
    const elitePerSq = Number(body.elitePerSq ?? currentSettings.elitePerSq ?? 650);

    const silverOhioAdj = Number(body.silverOhioAdj ?? currentSettings.silverOhioAdj ?? 50);
    const goldOhioAdj = Number(body.goldOhioAdj ?? currentSettings.goldOhioAdj ?? 50);
    const eliteOhioAdj = Number(body.eliteOhioAdj ?? currentSettings.eliteOhioAdj ?? 130);

    const updatedSettings = {
      ...currentSettings,
      ...body,
      silverPerSq,
      goldPerSq,
      elitePerSq,
      silverOhioAdj,
      goldOhioAdj,
      eliteOhioAdj,
      pricing: body.pricing ? {
        Silver: { name: 'SILVER', targetPerSq: silverPerSq, ohioAdjustment: silverOhioAdj, ...body.pricing.Silver },
        Gold: { name: 'GOLD', targetPerSq: goldPerSq, ohioAdjustment: goldOhioAdj, ...body.pricing.Gold },
        Elite: { name: 'IHR ELITE', targetPerSq: elitePerSq, ohioAdjustment: eliteOhioAdj, ...body.pricing.Elite }
      } : {
        Silver: { name: 'SILVER', targetPerSq: silverPerSq, ohioAdjustment: silverOhioAdj },
        Gold: { name: 'GOLD', targetPerSq: goldPerSq, ohioAdjustment: goldOhioAdj },
        Elite: { name: 'IHR ELITE', targetPerSq: elitePerSq, ohioAdjustment: eliteOhioAdj }
      }
    };

    const success = writeSettings(updatedSettings);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to write settings file' }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (err) {
    console.error('Error saving settings:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
