import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDbQLFiIpLz8w3ZXYaC7BKA7YlUiBCFzPA',
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
  }
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
      pricing: {
        Silver: { name: 'Silver Package', targetPerSq: silverPerSq, ohioAdjustment: silverOhioAdj },
        Gold: { name: 'Gold Package', targetPerSq: goldPerSq, ohioAdjustment: goldOhioAdj },
        Elite: { name: 'IHR Elite', targetPerSq: elitePerSq, ohioAdjustment: eliteOhioAdj }
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
