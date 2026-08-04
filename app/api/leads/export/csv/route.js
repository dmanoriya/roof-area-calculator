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

export async function GET() {
  const leads = readLeads();

  if (leads.length === 0) {
    return new Response('No lead entries available for export.', { status: 404 });
  }

  const headers = [
    'ID', 'Created At', 'Status', 'Homeowner Name', 'Phone', 'Email',
    'Property Address', 'City', 'State', 'ZIP', 'Squares', 'Waste %',
    'Pitch', 'Adjusted Squares', 'Package', 'Shingle Color',
    'Start Date', 'Payment Method', 'Total Amount ($)', 'Signature', 'Notes'
  ];

  const csvRows = [headers.join(',')];

  leads.forEach(l => {
    const row = [
      `"${l.id || ''}"`,
      `"${l.createdAt || ''}"`,
      `"${l.status || 'New Lead'}"`,
      `"${(l.homeownerName || '').replace(/"/g, '""')}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${(l.propertyAddress || '').replace(/"/g, '""')}"`,
      `"${l.city || ''}"`,
      `"${l.state || ''}"`,
      `"${l.zip || ''}"`,
      l.squares || 0,
      l.waste || 0,
      `"${l.pitch || 'medium'}"`,
      l.adjSquares || 0,
      `"${l.selectedPackage || ''}"`,
      `"${l.shingleColor || ''}"`,
      `"${l.prefDate || ''}"`,
      `"${l.paymentMethod || ''}"`,
      l.totalAmount || 0,
      `"${(l.signature || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });

  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=roof_leads_${new Date().toISOString().slice(0, 10)}.csv`
    }
  });
}
