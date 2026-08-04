let allLeads = [];
let activeLeadId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadLeads();
    loadSettings();
});

// Load all lead entries from backend REST API
async function loadLeads() {
    try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (data.success) {
            allLeads = data.leads || [];
            updateStatsSummary();
            renderLeadsTable(allLeads);
        }
    } catch (err) {
        console.error('Error fetching leads:', err);
    }
}

// Compute KPI Stats
function updateStatsSummary() {
    const totalLeads = allLeads.length;
    const newLeads = allLeads.filter(l => l.status === 'New Lead').length;
    const scheduled = allLeads.filter(l => l.status === 'Scheduled' || l.status === 'Closed - Won').length;
    const totalVal = allLeads.reduce((acc, l) => acc + (l.totalAmount || 0), 0);

    document.getElementById('stat-total-leads').innerText = totalLeads;
    document.getElementById('stat-new-leads').innerText = newLeads;
    document.getElementById('stat-scheduled').innerText = scheduled;
    document.getElementById('stat-total-value').innerText = `$${totalVal.toLocaleString(undefined, {maximumFractionDigits:0})}`;
}

// Render Table Rows
function renderLeadsTable(leads) {
    const tbody = document.getElementById('crm-table-body');
    if (!tbody) return;

    if (leads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:24px;">No matching lead entries found.</td></tr>`;
        return;
    }

    tbody.innerHTML = leads.map(l => {
        const dateStr = new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const badgeClass = getBadgeClass(l.status);

        return `
            <tr onclick="openLeadModal('${l.id}')">
                <td>
                    <strong style="color:var(--text);">${l.id}</strong><br>
                    <span style="font-size:0.75rem; color:#777;">${dateStr}</span>
                </td>
                <td>
                    <strong>${escapeHtml(l.homeownerName)}</strong><br>
                    <span style="font-size:0.78rem; color:#666;">${escapeHtml(l.phone)}</span>
                </td>
                <td>
                    ${escapeHtml(l.propertyAddress)}<br>
                    <span style="font-size:0.78rem; color:#666;">${escapeHtml(l.city)}, ${l.state} ${l.zip}</span>
                </td>
                <td>
                    <strong>${l.adjSquares || l.squares || 0} Sq</strong><br>
                    <span style="font-size:0.75rem; color:#777;">${l.pitch || 'medium'} pitch</span>
                </td>
                <td>
                    <span style="font-weight:700; color:var(--gold);">${l.selectedPackage || '-'}</span><br>
                    <span style="font-size:0.78rem; color:#666;">${l.shingleColor || 'Default'}</span>
                </td>
                <td style="font-weight:800; color:var(--primary-red);">
                    $${(l.totalAmount || 0).toLocaleString()}
                </td>
                <td>
                    <span class="status-badge ${badgeClass}">${l.status || 'New Lead'}</span>
                </td>
                <td>
                    <button class="btn-map-action" onclick="event.stopPropagation(); openLeadModal('${l.id}')">View</button>
                </td>
            </tr>
        `;
    }).join('');
}

function getBadgeClass(status) {
    switch (status) {
        case 'New Lead': return 'badge-new';
        case 'Contacted': return 'badge-contacted';
        case 'Quoted': return 'badge-quoted';
        case 'Scheduled': return 'badge-scheduled';
        case 'Closed - Won': return 'badge-closed-won';
        case 'Closed - Lost': return 'badge-closed-lost';
        default: return 'badge-new';
    }
}

function filterLeadsTable() {
    const search = document.getElementById('crm-search-input').value.toLowerCase().trim();
    const status = document.getElementById('crm-status-filter').value;

    const filtered = allLeads.filter(l => {
        const matchesStatus = status === 'ALL' || l.status === status;
        const searchTarget = `${l.id} ${l.homeownerName} ${l.phone} ${l.email} ${l.propertyAddress} ${l.city} ${l.selectedPackage}`.toLowerCase();
        const matchesSearch = !search || searchTarget.includes(search);

        return matchesStatus && matchesSearch;
    });

    renderLeadsTable(filtered);
}

// Lead Inspection Modal
function openLeadModal(leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) return;

    activeLeadId = leadId;

    document.getElementById('modal-lead-title').innerText = `Lead Entry: ${lead.id}`;
    document.getElementById('modal-lead-date').innerText = new Date(lead.createdAt).toLocaleString();

    document.getElementById('modal-customer-info').innerHTML = `
        <strong>${escapeHtml(lead.homeownerName)}</strong><br>
        📍 ${escapeHtml(lead.propertyAddress)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip}<br>
        📞 <a href="tel:${lead.phone}">${escapeHtml(lead.phone)}</a><br>
        ✉️ <a href="mailto:${lead.email}">${escapeHtml(lead.email)}</a><br>
        ✍️ <strong>Signature:</strong> ${escapeHtml(lead.signature || 'N/A')}
    `;

    document.getElementById('modal-roof-info').innerHTML = `
        📐 <strong>Measured Roof Area:</strong> ${lead.calculatedAreaSqFt ? lead.calculatedAreaSqFt.toLocaleString() : '-'} Sq Ft<br>
        🏠 <strong>Base Squares:</strong> ${lead.squares || '-'} Sq<br>
        📈 <strong>Pitch &amp; Waste:</strong> ${lead.pitch || 'medium'} pitch | ${lead.waste || 12}% waste<br>
        📊 <strong>Adjusted Squares:</strong> ${lead.adjSquares || '-'} Sq<br>
        🏷️ <strong>Selected Package:</strong> ${lead.selectedPackage || '-'} (${lead.shingleColor || 'N/A'})<br>
        💰 <strong>Total Contract:</strong> <span style="color:var(--primary-red); font-weight:bold;">$${(lead.totalAmount || 0).toLocaleString()}</span><br>
        💳 <strong>Payment Method:</strong> ${lead.paymentMethod || 'Pay in Full'} ($${lead.monthlyPayment || 0}/mo)
    `;

    // Coordinates JSON/List
    const coordsEl = document.getElementById('modal-map-coords');
    if (lead.mapCoordinates && lead.mapCoordinates.length > 0) {
        coordsEl.innerText = JSON.stringify(lead.mapCoordinates, null, 2);
    } else {
        coordsEl.innerText = 'No custom polygon coordinates recorded (Auto-estimate mode used).';
    }

    document.getElementById('modal-status-select').value = lead.status || 'New Lead';
    document.getElementById('modal-notes-textarea').value = lead.notes || '';

    document.getElementById('lead-modal').classList.add('active');
}

async function saveLeadStatusUpdate() {
    if (!activeLeadId) return;
    const newStatus = document.getElementById('modal-status-select').value;

    try {
        const res = await fetch(`/api/leads/${activeLeadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            alert('Lead status updated successfully!');
            closeModal('lead-modal');
            loadLeads();
        }
    } catch (err) {
        alert('Error updating status');
    }
}

async function saveLeadNotes() {
    if (!activeLeadId) return;
    const notes = document.getElementById('modal-notes-textarea').value;

    try {
        const res = await fetch(`/api/leads/${activeLeadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });
        const data = await res.json();
        if (data.success) {
            alert('Internal notes saved!');
            loadLeads();
        }
    } catch (err) {
        alert('Error saving notes');
    }
}

// Settings Modal Logic
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
            document.getElementById('settings-api-key').value = data.settings.apiKey || '';
            if (data.settings.pricing) {
                if (data.settings.pricing.Silver) document.getElementById('price-silver-target').value = data.settings.pricing.Silver.targetPerSq;
                if (data.settings.pricing.Gold) document.getElementById('price-gold-target').value = data.settings.pricing.Gold.targetPerSq;
                if (data.settings.pricing.Elite) document.getElementById('price-elite-target').value = data.settings.pricing.Elite.targetPerSq;
            }
        }
    } catch (err) {
        console.error('Settings load error:', err);
    }
}

function openSettingsModal() {
    document.getElementById('settings-modal').classList.add('active');
}

async function saveSettings() {
    const apiKey = document.getElementById('settings-api-key').value.trim();
    const silverRate = parseFloat(document.getElementById('price-silver-target').value) || 525;
    const goldRate = parseFloat(document.getElementById('price-gold-target').value) || 575;
    const eliteRate = parseFloat(document.getElementById('price-elite-target').value) || 650;

    const payload = {
        apiKey: apiKey,
        pricing: {
            Silver: { name: "Silver Package", targetPerSq: silverRate },
            Gold: { name: "Gold Package", targetPerSq: goldRate },
            Elite: { name: "IHR Elite", targetPerSq: eliteRate }
        }
    };

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert('Settings saved successfully!');
            closeModal('settings-modal');
        }
    } catch (err) {
        alert('Failed to save settings.');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
