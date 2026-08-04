'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RoofMapCanvas from '../../components/RoofMapCanvas';
import { COLOR_TEXTURES, getShingleImage } from '../../data/shingleData';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const [isApiKeyUnlocked, setIsApiKeyUnlocked] = useState(false);
  const [superModalOpen, setSuperModalOpen] = useState(false);
  const [superPasswordInput, setSuperPasswordInput] = useState('');
  const [superError, setSuperError] = useState('');

  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeLead, setActiveLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [leadStatus, setLeadStatus] = useState('New Lead');
  const [leadNotes, setLeadNotes] = useState('');

  const [apiKey, setApiKey] = useState('AIzaSyDbQLFiIpLz8w3ZXYaC7BKA7YlUiBCFzPA');
  const [priceSilver, setPriceSilver] = useState(525);
  const [priceGold, setPriceGold] = useState(575);
  const [priceElite, setPriceElite] = useState(650);
  const [ohioSilver, setOhioSilver] = useState(50);
  const [ohioGold, setOhioGold] = useState(50);
  const [ohioElite, setOhioElite] = useState(130);
  const [aprRate, setAprRate] = useState(12.99);

  const handleVerifySuperAdmin = async (e) => {
    e.preventDefault();
    setSuperError('');

    try {
      const res = await fetch('/api/admin/verify-super', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: superPasswordInput })
      });
      const data = await res.json();

      if (data.success && data.apiKey) {
        setApiKey(data.apiKey);
        setIsApiKeyUnlocked(true);
        setSuperModalOpen(false);
        setSuperPasswordInput('');
        alert('Google Maps API Key unlocked successfully!');
      } else {
        setSuperError(data.error || 'Invalid Super Admin Password');
      }
    } catch (err) {
      setSuperError('Verification error.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminAuthToken');
    if (token) {
      setIsAuthenticated(true);
      fetchLeads();
      fetchSettings();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('adminAuthToken', data.token);
        setIsAuthenticated(true);
        setPasswordInput('');
        fetchLeads();
        fetchSettings();
      } else {
        setLoginError(data.error || 'Invalid admin password');
      }
    } catch (err) {
      setLoginError('Error authenticating password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthToken');
    setIsAuthenticated(false);
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setApiKey(data.settings.apiKey || 'AIzaSyDbQLFiIpLz8w3ZXYaC7BKA7YlUiBCFzPA');
        setPriceSilver(data.settings.silverPerSq ?? 525);
        setPriceGold(data.settings.goldPerSq ?? 575);
        setPriceElite(data.settings.elitePerSq ?? 650);
        setOhioSilver(data.settings.silverOhioAdj ?? 50);
        setOhioGold(data.settings.goldOhioAdj ?? 50);
        setOhioElite(data.settings.eliteOhioAdj ?? 130);
        setAprRate(data.settings.aprRate ?? 12.99);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const payload = {
        silverPerSq: Number(priceSilver),
        goldPerSq: Number(priceGold),
        elitePerSq: Number(priceElite),
        silverOhioAdj: Number(ohioSilver),
        goldOhioAdj: Number(ohioGold),
        eliteOhioAdj: Number(ohioElite),
        aprRate: Number(aprRate)
      };

      if (isApiKeyUnlocked && apiKey) {
        payload.apiKey = apiKey;
      }

      if (newAdminPassword && typeof newAdminPassword === 'string' && newAdminPassword.trim()) {
        payload.adminPassword = newAdminPassword.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('System settings & API key updated successfully! Public calculator is automatically synced.');
        setNewAdminPassword('');
        setSettingsOpen(false);
        fetchSettings();
      } else {
        alert(`Error: ${data.error || 'Failed to save settings'}`);
      }
    } catch (err) {
      alert(`Error saving settings: ${err.message || 'Server connection failed'}`);
    }
  };

  const handleOpenLeadModal = (lead) => {
    setActiveLead(lead);
    setLeadStatus(lead.status || 'New Lead');
    setLeadNotes(lead.notes || '');
    setModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!activeLead) return;
    try {
      const res = await fetch(`/api/leads/${activeLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: leadStatus,
          notes: leadNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => l.id === activeLead.id ? { ...l, status: leadStatus, notes: leadNotes } : l));
        setActiveLead(prev => prev ? { ...prev, status: leadStatus, notes: leadNotes } : null);
        alert('Lead status updated!');
      }
    } catch (err) {
      alert('Error updating lead status.');
    }
  };

  const getPaymentLabel = (method) => {
    if (method === '15yr') return '15-Year Financing (180 mos)';
    if (method === '10yr') return '10-Year Financing (120 mos)';
    if (method === '5yr') return '5-Year Financing (60 mos)';
    if (method === 'cash') return 'Cash / Full Payment';
    return method || 'Financed';
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      !search ||
      (l.homeownerName && l.homeownerName.toLowerCase().includes(search.toLowerCase())) ||
      (l.propertyAddress && l.propertyAddress.toLowerCase().includes(search.toLowerCase())) ||
      (l.phone && l.phone.toLowerCase().includes(search.toLowerCase())) ||
      (l.selectedPackage && l.selectedPackage.toLowerCase().includes(search.toLowerCase())) ||
      (l.id && l.id.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalLeadsCount = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'New Lead').length;
  const scheduledCount = leads.filter(l => l.status === 'Scheduled').length;
  const totalValueSum = leads.reduce((sum, l) => sum + (l.totalAmount || 0), 0);

  const getBadgeClass = (st) => {
    switch (st) {
      case 'New Lead': return 'badge-new';
      case 'Contacted': return 'badge-contacted';
      case 'Quoted': return 'badge-quoted';
      case 'Scheduled': return 'badge-scheduled';
      case 'Closed - Won': return 'badge-won';
      case 'Closed - Lost': return 'badge-lost';
      default: return 'badge-new';
    }
  };

  const activeLeadLoc = activeLead?.selectedLocation
    ? activeLead.selectedLocation
    : activeLead?.mapCoordinates?.[0]
    ? { lat: activeLead.mapCoordinates[0].lat, lng: activeLead.mapCoordinates[0].lng }
    : null;

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#fef2f2',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              margin: '0 auto 16px',
              border: '1px solid #fee2e2'
            }}>
              🔒
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Admin Panel Access
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
              Enter password to unlock CRM lead management &amp; system settings.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                ADMIN PASSWORD
              </label>
              <input
                type="password"
                className="form-input"
                style={{
                  height: '48px',
                  fontSize: '1rem',
                  border: loginError ? '2px solid #d32f2f' : '1px solid #cbd5e1'
                }}
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setLoginError(''); }}
                placeholder="Enter password (default: admin)"
                autoFocus
              />
              {loginError && (
                <span style={{ color: '#d32f2f', fontSize: '0.82rem', marginTop: '6px', fontWeight: 600, display: 'block' }}>
                  ⚠️ {loginError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary-lg"
              disabled={isLoggingIn}
              style={{ width: '100%', height: '48px', fontSize: '1rem', fontWeight: 700 }}
            >
              {isLoggingIn ? 'Authenticating...' : 'Unlock Admin Panel \u2192'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <Link href="/" style={{ color: 'var(--primary-red)', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
              &larr; Return to Customer Roof Estimator
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* Top Header Bar */}
      <header className="top-header">
        <div className="header-container">
          <Link href="/" className="brand-badge">
            <div className="brand-icon">IHR</div>
            <div>
              <div className="brand-name">IRON HORSE ROOFING</div>
              <div className="brand-sub">CRM &amp; Lead Management Dashboard</div>
            </div>
          </Link>
          <div className="header-contact-info" style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }} onClick={() => setSettingsOpen(true)}>
              ⚙️ Settings &amp; API Key
            </button>
            <button className="btn-secondary" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }} onClick={handleLogout}>
              🔒 Logout
            </button>
            <Link href="/" className="btn-admin-nav">
              &larr; Estimator
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">
        {/* KPI Stats */}
        <div className="crm-stats-grid">
          <div className="crm-stat-card">
            <div className="num">{totalLeadsCount}</div>
            <div className="label">Total Leads Received</div>
          </div>
          <div className="crm-stat-card">
            <div className="num" style={{ color: 'var(--accent-blue)' }}>{newLeadsCount}</div>
            <div className="label">New Uncontacted</div>
          </div>
          <div className="crm-stat-card">
            <div className="num" style={{ color: 'var(--accent-green)' }}>{scheduledCount}</div>
            <div className="label">Scheduled Projects</div>
          </div>
          <div className="crm-stat-card">
            <div className="num" style={{ color: 'var(--gold)' }}>${totalValueSum.toLocaleString()}</div>
            <div className="label">Total Pipeline Value</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="crm-header-bar">
          <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, minWidth: '240px' }}
              placeholder="🔍 Search leads by name, address, phone, package..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="form-select"
              style={{ width: '220px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="New Lead">New Lead</option>
              <option value="Contacted">Contacted</option>
              <option value="Quoted">Quoted</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Closed - Won">Closed - Won</option>
              <option value="Closed - Lost">Closed - Lost</option>
            </select>
          </div>
          <div>
            <a
              href="/api/leads/export/csv"
              className="btn-secondary"
              style={{ background: 'var(--accent-green)', color: '#ffffff', border: 'none', padding: '12px 20px', display: 'inline-flex', gap: '8px', alignItems: 'center', fontWeight: 700 }}
            >
              📥 Export Leads (CSV)
            </a>
          </div>
        </div>

        {/* Leads Table */}
        <div className="crm-table-box">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Lead ID / Date</th>
                <th>Homeowner</th>
                <th>Address</th>
                <th>Roof Size</th>
                <th>Package &amp; Color</th>
                <th>Estimate Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                    No matching lead entries found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(l => (
                  <tr key={l.id} onClick={() => handleOpenLeadModal(l)}>
                    <td>
                      <strong style={{ color: 'var(--dark-navy)' }}>{l.id}</strong><br />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(l.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <strong>{l.homeownerName}</strong><br />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{l.phone}</span>
                    </td>
                    <td>
                      {l.propertyAddress}<br />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{l.city}, {l.state} {l.zip}</span>
                    </td>
                    <td>
                      <strong>{l.adjSquares || l.squares || 0} Sq</strong><br />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.pitch || 'medium'} pitch</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{l.selectedPackage || '-'}</span><br />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{l.shingleColor || 'Default'}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--primary-red)', fontSize: '1.05rem' }}>
                      ${(l.totalAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className={`status-badge ${getBadgeClass(l.status)}`}>{l.status || 'New Lead'}</span>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenLeadModal(l);
                        }}
                      >
                        View &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Lead Detail Modal with Satellite Map */}
      {modalOpen && activeLead && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--primary-red)', marginBottom: '16px', fontWeight: 800 }}>
              Lead Details: {activeLead.id}
            </h2>

            <div className="form-grid-2" style={{ marginBottom: '20px' }}>
              {/* Card 1: Customer Contact & Schedule */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--dark-navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👤 Customer Contact &amp; Schedule
                </h3>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                  <strong>{activeLead.homeownerName}</strong><br />
                  📍 {activeLead.propertyAddress}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;{activeLead.city}, {activeLead.state} {activeLead.zip}<br />
                  📞 <a href={`tel:${activeLead.phone}`} style={{ color: 'var(--primary-red)', fontWeight: 700 }}>{activeLead.phone}</a><br />
                  ✉️ <a href={`mailto:${activeLead.email}`} style={{ color: 'var(--primary-red)' }}>{activeLead.email}</a><br />
                  📅 Preferred Start Date: <strong>{activeLead.prefDate || 'Asap'}</strong> {activeLead.backupDate ? `(Backup: ${activeLead.backupDate})` : ''}<br />
                  ✍️ Contract Signed By: <strong>{activeLead.signature || 'N/A'}</strong>
                </div>
              </div>

              {/* Card 2: Package, Shingle, Pricing & Financing */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--dark-navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏠 Contract Package &amp; Shingle Choice
                </h3>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                  🏷️ Selected Package: <strong style={{ color: 'var(--gold)', fontSize: '1rem' }}>{activeLead.selectedPackage} Package</strong><br />
                  🎨 Shingle Color:
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '24px',
                        borderRadius: '4px',
                        background: getShingleImage(activeLead.selectedPackage, activeLead.shingleColor)
                          ? `url(${getShingleImage(activeLead.selectedPackage, activeLead.shingleColor)}) center/cover no-repeat`
                          : (COLOR_TEXTURES[activeLead.shingleColor]?.pattern || COLOR_TEXTURES[activeLead.shingleColor]?.color || '#4a3c31'),
                        border: '1px solid #ccc',
                        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.5)'
                      }}
                    />
                    <strong>{activeLead.shingleColor || 'Default'}</strong>
                  </div>
                  <br />
                  📐 Roof Area: <strong>{activeLead.calculatedAreaSqFt?.toLocaleString() || '-'} Sq Ft</strong> ({activeLead.squares} base / <strong>{activeLead.adjSquares} adj sq</strong>)<br />
                  📈 Pitch &amp; Waste: <strong>{activeLead.pitch} pitch ({activeLead.waste}% waste)</strong><br />
                  💳 Payment Terms: <strong>{getPaymentLabel(activeLead.paymentMethod)}</strong>
                  {activeLead.monthlyPayment ? <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}> (${activeLead.monthlyPayment}/mo)</span> : ''}<br />
                  💰 Total Contract Price: <strong style={{ color: 'var(--primary-red)', fontSize: '1.15rem' }}>${(activeLead.totalAmount || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* SATELLITE ROOF MAP IN ADMIN MODAL */}
            <div style={{ margin: '20px 0' }}>
              <RoofMapCanvas
                apiKey={apiKey}
                selectedLocation={activeLeadLoc}
                initialCoordinates={activeLead.mapCoordinates}
                readOnly={true}
                propertyAddress={activeLead.propertyAddress}
                mode="auto"
                pitch={activeLead.pitch || 'medium'}
                waste={activeLead.waste || 12}
                baseSquares={activeLead.squares || 25}
              />
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--dark-navy)', marginBottom: '16px' }}>📋 Pipeline Management</h3>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Update Status</label>
                  <select className="form-select" value={leadStatus} onChange={e => setLeadStatus(e.target.value)}>
                    <option value="New Lead">New Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Closed - Won">Closed - Won</option>
                    <option value="Closed - Lost">Closed - Lost</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-primary-lg" style={{ height: '48px', marginTop: 0 }} onClick={handleSaveStatus}>
                    Update Status
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Notes</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Add internal notes about this lead..."
                  value={leadNotes}
                  onChange={e => setLeadNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSettingsOpen(false)}>&times;</button>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--primary-red)', marginBottom: '16px', fontWeight: 800 }}>
              ⚙️ Estimator System Settings
            </h2>

            <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  🔒 Google Maps API Key (Super Admin Protected)
                </label>
                {!isApiKeyUnlocked ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => { setSuperModalOpen(true); setSuperError(''); setSuperPasswordInput(''); }}
                  >
                    🔑 Unlock / View Key
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      alert('API Key copied to clipboard!');
                    }}
                  >
                    📋 Copy Key
                  </button>
                )}
              </div>

              <input
                type={isApiKeyUnlocked ? 'text' : 'password'}
                className="form-input"
                style={{ background: isApiKeyUnlocked ? '#ffffff' : '#f1f5f9', color: isApiKeyUnlocked ? '#0f172a' : '#64748b', cursor: isApiKeyUnlocked ? 'text' : 'not-allowed', fontWeight: isApiKeyUnlocked ? 600 : 800 }}
                value={isApiKeyUnlocked ? apiKey : '••••••••••••••••••••••••••••••••••••'}
                onChange={e => { if (isApiKeyUnlocked) setApiKey(e.target.value); }}
                readOnly={!isApiKeyUnlocked}
              />
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                {isApiKeyUnlocked
                  ? '✅ Unlocked by Super Admin. You can view, copy, or update this API Key.'
                  : '🔒 Protected: Requires Super Admin Master Password to view or copy.'}
              </span>
            </div>

            <div className="form-section-head">1. Base Package Rates ($ / Square)</div>
            <div className="form-grid-3" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Silver Base Rate ($/Sq)</label>
                <input
                  type="number"
                  className="form-input"
                  value={priceSilver}
                  onChange={e => setPriceSilver(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gold Base Rate ($/Sq)</label>
                <input
                  type="number"
                  className="form-input"
                  value={priceGold}
                  onChange={e => setPriceGold(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Elite Base Rate ($/Sq)</label>
                <input
                  type="number"
                  className="form-input"
                  value={priceElite}
                  onChange={e => setPriceElite(e.target.value)}
                />
              </div>
            </div>

            <div className="form-section-head">2. Ohio State Price Surcharges (+$ / Square)</div>
            <div className="form-grid-3" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Silver OH Surcharge (+$)</label>
                <input
                  type="number"
                  className="form-input"
                  value={ohioSilver}
                  onChange={e => setOhioSilver(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gold OH Surcharge (+$)</label>
                <input
                  type="number"
                  className="form-input"
                  value={ohioGold}
                  onChange={e => setOhioGold(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Elite OH Surcharge (+$)</label>
                <input
                  type="number"
                  className="form-input"
                  value={ohioElite}
                  onChange={e => setOhioElite(e.target.value)}
                />
              </div>
            </div>

            <div className="form-section-head">3. Financing Interest Rate (% APR)</div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">GoodLeap Financing APR (%)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={aprRate}
                onChange={e => setAprRate(e.target.value)}
              />
            </div>

            <div className="form-section-head">4. Security &amp; Admin Password</div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">New Admin Password (leave blank to keep current)</label>
              <input
                type="password"
                className="form-input"
                value={newAdminPassword}
                onChange={e => setNewAdminPassword(e.target.value)}
                placeholder="Enter new admin password..."
              />
            </div>

            <button className="btn-primary-lg" style={{ marginTop: '10px' }} onClick={handleSaveSettings}>
              Save Settings &amp; Sync Pricing
            </button>
          </div>
        </div>
      )}

      {/* Super Admin API Key Protection Modal */}
      {superModalOpen && (
        <div className="modal-backdrop" onClick={() => setSuperModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '20px', padding: '32px' }}>
            <button className="modal-close" onClick={() => setSuperModalOpen(false)}>&times;</button>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', background: '#fef2f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 12px', border: '1px solid #fee2e2' }}>
                🔑
              </div>
              <h2 style={{ fontFamily: 'Plus Jakarta Sans', color: 'var(--primary-red)', marginBottom: '6px', fontWeight: 800, fontSize: '1.35rem' }}>
                Super Admin Authorization
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                Enter Super Admin Master Password to unlock, view, or copy the Google Maps API Key.
              </p>
            </div>

            <form onSubmit={handleVerifySuperAdmin}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  SUPER ADMIN MASTER PASSWORD
                </label>
                <input
                  type="password"
                  className="form-input"
                  style={{ height: '46px', fontSize: '1rem', border: superError ? '2px solid #d32f2f' : '1px solid #cbd5e1' }}
                  value={superPasswordInput}
                  onChange={e => { setSuperPasswordInput(e.target.value); setSuperError(''); }}
                  placeholder="Enter master password..."
                  autoFocus
                />
                {superError && (
                  <span style={{ color: '#d32f2f', fontSize: '0.82rem', marginTop: '6px', fontWeight: 600, display: 'block' }}>
                    ⚠️ {superError}
                  </span>
                )}
              </div>

              <button type="submit" className="btn-primary-lg" style={{ width: '100%', height: '46px', fontSize: '0.95rem', fontWeight: 700 }}>
                Verify &amp; Unlock Key &rarr;
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
