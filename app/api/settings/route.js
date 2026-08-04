import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDbQLFiIpLz8w3ZXYaC7BKA7YlUiBCFzPA',
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
  return NextResponse.json({ success: true, settings });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const currentSettings = readSettings();
    const updatedSettings = {
      ...currentSettings,
      ...body
    };
    writeSettings(updatedSettings);
    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
