import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'xf5K$;VmT1<$0=Y$17Bc)';
const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function getApiKey() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (data && data.apiKey) return data.apiKey;
    }
  } catch (err) {
    console.error('Error reading settings for super admin:', err);
  }
  return process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDbQLFiIpLz8w3ZXYaC7BKA7YlUiBCFzPA';
}

export async function POST(req) {
  try {
    const { password } = await req.json();

    if (password === SUPER_ADMIN_PASSWORD) {
      const apiKey = getApiKey();
      return NextResponse.json({ success: true, apiKey });
    }

    return NextResponse.json({ success: false, error: 'Invalid Super Admin Password' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error during super admin verification' }, { status: 500 });
  }
}
