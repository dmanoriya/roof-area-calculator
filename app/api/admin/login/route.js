import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function getStoredPassword() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (data && data.adminPassword) return data.adminPassword;
    }
  } catch (err) {
    console.error('Error reading settings for auth:', err);
  }
  return process.env.ADMIN_PASSWORD || 'admin';
}

export async function POST(req) {
  try {
    const { password } = await req.json();
    const currentPassword = getStoredPassword();

    if (password === currentPassword) {
      const token = Buffer.from(`admin_auth_${currentPassword}_${Date.now()}`).toString('base64');
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ success: false, error: 'Invalid admin password' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error during authentication' }, { status: 500 });
  }
}
