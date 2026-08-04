const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Helper functions for data storage
function readJSON(file, defaultValue) {
    try {
        if (fs.existsSync(file)) {
            const data = fs.readFileSync(file, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error(`Error reading ${file}:`, err);
    }
    return defaultValue;
}

function writeJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`Error writing ${file}:`, err);
        return false;
    }
}

// Default initial settings
const DEFAULT_SETTINGS = {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    pricing: {
        Silver: { name: 'Silver Package', targetPerSq: 525 },
        Gold: { name: 'Gold Package', targetPerSq: 575 },
        Elite: { name: 'IHR Elite', targetPerSq: 650 }
    },
    pitchMultipliers: {
        'flat': 1.0,
        'low': 1.05,
        'medium': 1.15,
        'steep': 1.25,
        'high': 1.41
    }
};

// Seed initial sample lead if leads file doesn't exist
if (!fs.existsSync(LEADS_FILE)) {
    const sampleLeads = [
        {
            id: 'lead-1001',
            createdAt: new Date().toISOString(),
            status: 'New Lead',
            homeownerName: 'John Smith',
            phone: '(555) 234-5678',
            email: 'john.smith@example.com',
            propertyAddress: '123 Maple Street',
            city: 'Raleigh',
            state: 'NC',
            zip: '27601',
            squares: 30,
            waste: 12,
            pitch: 'medium',
            pitchMultiplier: 1.15,
            calculatedAreaSqFt: 3000,
            adjSquares: 34.5,
            selectedPackage: 'Gold',
            shingleColor: 'Weathered Wood',
            prefDate: '2026-08-15',
            backupDate: '2026-08-20',
            paymentMethod: '15yr',
            totalAmount: 19837.50,
            monthlyPayment: 228.13,
            signature: 'John Smith',
            mapCoordinates: [
                { lat: 35.7796, lng: -78.6382 },
                { lat: 35.7798, lng: -78.6380 },
                { lat: 35.7796, lng: -78.6378 },
                { lat: 35.7794, lng: -78.6380 }
            ],
            notes: 'Customer interested in financing option. Requested call after 2 PM.'
        }
    ];
    writeJSON(LEADS_FILE, sampleLeads);
}

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// 1. Get all leads
app.get('/api/leads', (req, res) => {
    const leads = readJSON(LEADS_FILE, []);
    res.json({ success: true, count: leads.length, leads });
});

// 2. Get single lead by ID
app.get('/api/leads/:id', (req, res) => {
    const leads = readJSON(LEADS_FILE, []);
    const lead = leads.find(l => l.id === req.params.id);
    if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, lead });
});

// 3. Create new lead submission
app.post('/api/leads', (req, res) => {
    const leads = readJSON(LEADS_FILE, []);
    
    const newLead = {
        id: 'lead-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        createdAt: new Date().toISOString(),
        status: 'New Lead',
        notes: '',
        ...req.body
    };

    leads.unshift(newLead); // Newest first
    writeJSON(LEADS_FILE, leads);

    res.status(201).json({
        success: true,
        message: 'Order estimate submitted successfully!',
        leadId: newLead.id,
        lead: newLead
    });
});

// 4. Update lead (status, notes, etc.)
app.patch('/api/leads/:id', (req, res) => {
    const leads = readJSON(LEADS_FILE, []);
    const index = leads.findIndex(l => l.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    leads[index] = {
        ...leads[index],
        ...req.body,
        updatedAt: new Date().toISOString()
    };

    writeJSON(LEADS_FILE, leads);
    res.json({ success: true, lead: leads[index] });
});

// 5. Delete lead
app.delete('/api/leads/:id', (req, res) => {
    let leads = readJSON(LEADS_FILE, []);
    const initialLength = leads.length;
    leads = leads.filter(l => l.id !== req.params.id);

    if (leads.length === initialLength) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    writeJSON(LEADS_FILE, leads);
    res.json({ success: true, message: 'Lead deleted successfully' });
});

// 6. CSV Export of all leads
app.get('/api/leads/export/csv', (req, res) => {
    const leads = readJSON(LEADS_FILE, []);

    if (leads.length === 0) {
        return res.status(404).send('No lead entries available for export.');
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

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=roof_leads_${new Date().toISOString().slice(0,10)}.csv`);
    res.status(200).send(csvRows.join('\n'));
});

// 7. Get settings
app.get('/api/settings', (req, res) => {
    const settings = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    res.json({ success: true, settings });
});

// 8. Update settings
app.post('/api/settings', (req, res) => {
    const currentSettings = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    const updatedSettings = {
        ...currentSettings,
        ...req.body
    };
    writeJSON(SETTINGS_FILE, updatedSettings);
    res.json({ success: true, message: 'Settings saved successfully', settings: updatedSettings });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Roof Area Calculator & CRM server running on http://127.0.0.1:${PORT}`);
});
