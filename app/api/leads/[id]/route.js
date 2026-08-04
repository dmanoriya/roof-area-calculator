import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

function readLeads() {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading leads:', err);
  }
  return [];
}

function writeLeads(leads) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing leads:', err);
    return false;
  }
}

export async function GET(req, { params }) {
  const { id } = params;
  const leads = readLeads();
  const lead = leads.find(l => l.id === id);

  if (!lead) {
    return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, lead });
}

export async function PATCH(req, { params }) {
  const { id } = params;
  const body = await req.json();
  const leads = readLeads();
  const index = leads.findIndex(l => l.id === id);

  if (index === -1) {
    return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
  }

  leads[index] = {
    ...leads[index],
    ...body,
    updatedAt: new Date().toISOString()
  };

  writeLeads(leads);
  return NextResponse.json({ success: true, lead: leads[index] });
}

export async function DELETE(req, { params }) {
  const { id } = params;
  let leads = readLeads();
  const initialCount = leads.length;

  leads = leads.filter(l => l.id !== id);

  if (leads.length === initialCount) {
    return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
  }

  writeLeads(leads);
  return NextResponse.json({ success: true, message: 'Lead deleted' });
}
