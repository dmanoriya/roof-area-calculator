import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLeads() {
  ensureDataDir();
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const data = fs.readFileSync(LEADS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading leads file:', err);
  }
  return [];
}

function writeLeads(leads) {
  ensureDataDir();
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing leads file:', err);
    return false;
  }
}

export async function GET() {
  const leads = readLeads();
  return NextResponse.json({ success: true, count: leads.length, leads });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const leads = readLeads();

    const newLead = {
      id: 'lead-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      status: 'New Lead',
      notes: '',
      ...body
    };

    leads.unshift(newLead);
    writeLeads(leads);

    return NextResponse.json(
      {
        success: true,
        message: 'Order estimate submitted successfully!',
        leadId: newLead.id,
        lead: newLead
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/leads error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
