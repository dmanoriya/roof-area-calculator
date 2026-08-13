'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { PRICING, ALLOWED_STATES, getPricePerSquare, calculatePMT, getPackageFeatures, INTEREST_RATE } from '../data/pricingData';
import { getPackageColorList, getPackageShingleName, COLOR_TEXTURES, getShingleImage } from '../data/shingleData';
import RoofMapCanvas from '../components/RoofMapCanvas';



export default function Home() {
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState('AIzaSyDbQLFiIpLz8w3ZXYaC7BKA7YlUiBCFzPA');
  const [homeownerName, setHomeownerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('NC');
  const [zip, setZip] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [mode, setMode] = useState('auto');
  const [pitch, setPitch] = useState('medium');
  const [squares, setSquares] = useState(25);
  const [waste, setWaste] = useState(12);
  const [areaSqFt, setAreaSqFt] = useState(2500);
  const [mapCoords, setMapCoords] = useState([]);

  const [selectedPackage, setSelectedPackage] = useState('Gold');
  const [shingleColor, setShingleColor] = useState('Weathered Wood');
  const [prefDate, setPrefDate] = useState('');
  const [backupDate, setBackupDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('15yr');
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [pricingSettings, setPricingSettings] = useState({
    silverPerSq: 525,
    goldPerSq: 575,
    elitePerSq: 650,
    silverOhioAdj: 50,
    goldOhioAdj: 50,
    eliteOhioAdj: 130,
    aprRate: 12.99
  });

  useEffect(() => {
    const validColors = getPackageColorList(selectedPackage, state);
    if (!validColors.includes(shingleColor)) {
      setShingleColor(validColors[0] || 'Weathered Wood');
    }
  }, [selectedPackage, state, shingleColor]);

  const formatPhoneNumber = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    if (formErrors.phone) {
      const digits = formatted.replace(/\D/g, '');
      if (digits.length === 10) {
        setFormErrors(prev => ({ ...prev, phone: null }));
      }
    }
  };

  const validateField = (fieldName, value) => {
    let error = null;

    if (fieldName === 'homeownerName') {
      if (!value || value.trim().length < 2) {
        error = 'Please enter your full name (minimum 2 characters)';
      }
    } else if (fieldName === 'phone') {
      const digits = (value || '').replace(/\D/g, '');
      if (digits.length !== 10) {
        error = 'Please enter a valid 10-digit US phone number';
      }
    } else if (fieldName === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value || !emailRegex.test(value.trim())) {
        error = 'Please enter a valid email address';
      }
    } else if (fieldName === 'propertyAddress') {
      if (!value || !value.trim()) {
        error = 'Please enter your property street address';
      }
    } else if (fieldName === 'state') {
      if (!value || !ALLOWED_STATES.includes(value.trim().toUpperCase())) {
        error = 'Services available only in NC, SC, OH, TN';
      }
    } else if (fieldName === 'zip') {
      if (value && !/^\d{5}(-\d{4})?$/.test(value.trim())) {
        error = 'Please enter a valid 5-digit ZIP code';
      }
    } else if (fieldName === 'signature') {
      if (!value || !value.trim()) {
        error = 'Please type your full name to sign';
      }
    }

    setFormErrors(prev => ({ ...prev, [fieldName]: error }));
    return !error;
  };

  const handleMetricsChange = useCallback((newSq, newArea) => {
    setSquares(newSq);
    setAreaSqFt(newArea);
  }, []);

  const handleAddressParsed = useCallback((parsed) => {
    if (!parsed) return;
    const fullAddr = parsed.formattedAddress || parsed.streetAddress;
    if (fullAddr) setPropertyAddress(fullAddr);

    let cityVal = parsed.city || '';
    let stateVal = parsed.state || '';
    let zipVal = parsed.zip || '';

    if (parsed.address_components) {
      parsed.address_components.forEach(c => {
        if (c.types.includes('locality') || c.types.includes('sublocality') || c.types.includes('postal_town')) cityVal = c.long_name;
        if (c.types.includes('administrative_area_level_1')) stateVal = c.short_name;
        if (c.types.includes('postal_code')) zipVal = c.long_name;
      });
    }

    if (cityVal) setCity(cityVal);
    if (stateVal && ALLOWED_STATES.includes(stateVal.toUpperCase())) setState(stateVal.toUpperCase());
    if (zipVal) setZip(zipVal);
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          if (data.settings.apiKey) setApiKey(data.settings.apiKey);
          setPricingSettings({
            silverPerSq: data.settings.silverPerSq ?? 525,
            goldPerSq: data.settings.goldPerSq ?? 575,
            elitePerSq: data.settings.elitePerSq ?? 650,
            silverOhioAdj: data.settings.silverOhioAdj ?? 50,
            goldOhioAdj: data.settings.goldOhioAdj ?? 50,
            eliteOhioAdj: data.settings.eliteOhioAdj ?? 130,
            aprRate: data.settings.aprRate ?? 12.99
          });
        }
      })
      .catch(() => {});

    const d = new Date();
    d.setDate(d.getDate() + 14);
    setPrefDate(d.toISOString().slice(0, 10));
  }, []);

  // Bind Google Places Autocomplete directly in Step 0
  useEffect(() => {
    if (!apiKey) return;

    const loadMapsScript = (key) => {
      if (window.google?.maps?.places) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existingScript = document.getElementById('google-maps-api-script');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          if (window.google?.maps?.places) resolve();
          return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-api-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry,drawing`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
    };

    loadMapsScript(apiKey).then(() => {
      if (addressInputRef.current && !autocompleteRef.current && window.google?.maps?.places) {
        const ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry', 'name']
        });
        autocompleteRef.current = ac;

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place && place.geometry && place.geometry.location) {
            const loc = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            setSelectedLocation(loc);
            handleAddressParsed({
              formattedAddress: place.formatted_address,
              streetAddress: place.formatted_address,
              address_components: place.address_components
            });
          }
        });
      }
    }).catch(err => {
      console.warn('Autocomplete init error:', err);
    });
  }, [apiKey, handleAddressParsed]);

  const pitchMultipliers = {
    flat: 1.0,
    low: 1.05,
    medium: 1.15,
    steep: 1.25,
    high: 1.41
  };

  const adjSquares = Math.ceil(
    squares * (pitchMultipliers[pitch] || 1.15) * (1 + waste / 100)
  );

  const getPricePerSquareDynamic = (tier, stateName) => {
    const isOhio = stateName && (stateName.trim().toUpperCase() === 'OH' || stateName.trim().toUpperCase() === 'OHIO');
    let base = 525;
    let ohioAdj = 50;

    if (tier === 'Silver') {
      base = pricingSettings.silverPerSq;
      ohioAdj = pricingSettings.silverOhioAdj;
    } else if (tier === 'Gold') {
      base = pricingSettings.goldPerSq;
      ohioAdj = pricingSettings.goldOhioAdj;
    } else if (tier === 'Elite') {
      base = pricingSettings.elitePerSq;
      ohioAdj = pricingSettings.eliteOhioAdj;
    }

    return base + (isOhio ? ohioAdj : 0);
  };

  const calculateTotal = (tier) => {
    const pps = getPricePerSquareDynamic(tier, state);
    return Math.round(adjSquares * pps);
  };

  const calculateMonthly = (total, months) => {
    const monthlyRate = (pricingSettings.aprRate / 100) / 12;
    const pmt = calculatePMT(monthlyRate, months, total);
    return Math.round(pmt * 100) / 100;
  };

  const currentTotal = calculateTotal(selectedPackage);
  const currentMonthly = calculateMonthly(
    currentTotal,
    paymentMethod === '5yr' ? 60 : paymentMethod === '10yr' ? 120 : 180
  );

  const validateStep = (step = currentStep) => {
    const errors = {};

    if (step === 0) {
      if (!homeownerName || homeownerName.trim().length < 2) {
        errors.homeownerName = 'Please enter your full name (minimum 2 characters)';
      }
      const digits = (phone || '').replace(/\D/g, '');
      if (digits.length !== 10) {
        errors.phone = 'Please enter a valid 10-digit US phone number';
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
      if (!propertyAddress || !propertyAddress.trim()) {
        errors.propertyAddress = 'Please enter your property street address';
      }
      if (!state || !ALLOWED_STATES.includes(state.trim().toUpperCase())) {
        errors.state = 'Services available only in NC, SC, OH, TN';
      }
      if (zip && !/^\d{5}(-\d{4})?$/.test(zip.trim())) {
        errors.zip = 'Please enter a valid 5-digit ZIP code';
      }
    }

    if (step === 5) {
      if (!signature || !signature.trim()) {
        errors.signature = 'Please type your full name to sign';
      }
      if (!agreeChecked) {
        errors.agreeChecked = 'Please check the agreement box before submitting';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToMap = () => {
    if (!validateStep()) return;

    const fullAddr = `${propertyAddress}${city ? `, ${city}` : ''}, ${state} ${zip || ''}`.trim();

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: fullAddr, componentRestrictions: { country: 'US' } }, (results, status) => {
        if (status === 'OK' && results[0]?.geometry?.location) {
          const loc = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          };
          setSelectedLocation(loc);
        }
      });
    }

    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextStep = (nextStep) => {
    if (nextStep > currentStep && !validateStep()) return;
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitOrder = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    const leadData = {
      homeownerName,
      phone,
      email,
      propertyAddress,
      city,
      state,
      zip,
      squares,
      waste,
      pitch,
      adjSquares,
      calculatedAreaSqFt: areaSqFt,
      selectedPackage,
      shingleColor,
      prefDate,
      backupDate,
      paymentMethod,
      totalAmount: currentTotal,
      monthlyPayment: currentMonthly,
      signature,
      mapCoordinates: mapCoords
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedLeadId(data.leadId);
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Submission failed: ' + (data.message || 'Error'));
      }
    } catch (err) {
      alert('Network error submitting estimate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setSubmittedLeadId('');
    setCurrentStep(0);
    setHomeownerName('');
    setPhone('');
    setEmail('');
    setPropertyAddress('');
    setSignature('');
    setAgreeChecked(false);
  };

  return (
    <div className="app-wrapper">
      {/* Header Bar */}
      <header className="top-header">
        <div className="header-container">
          <Link href="/" className="brand-badge" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img
              src="/logo.png"
              alt="Iron Horse Roofing"
              style={{
                height: '52px',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </Link>
          <div className="header-contact-info">
            <div className="header-phone">
              <span>📞</span> (984) 205-5638
            </div>
            <Link href="/admin" className="btn-admin-nav">
              CRM Admin &rsaquo;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Full-Width Container */}
      <main className="main-container">
        {/* SUCCESS CONFIRMATION SCREEN (NO REDIRECT) */}
        {isSubmitted ? (
          <div className="step-card" style={{ textAlign: 'center', padding: '48px 36px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
            <h2 className="step-title" style={{ color: 'var(--accent-green)', marginBottom: '12px' }}>
              Roof Estimate Contract Submitted Successfully!
            </h2>
            <p className="step-description" style={{ fontSize: '1.1rem', marginBottom: '24px' }}>
              Thank you, <strong>{signature}</strong>! Your project reference number is <strong>#{submittedLeadId}</strong>.
            </p>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '28px', maxWidth: '640px', margin: '0 auto 32px', textAlign: 'left', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <span>Homeowner Name</span> <strong>{homeownerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span>Property Address</span> <strong>{propertyAddress}, {city}, {state} {zip}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span>Selected Package</span> <strong>{PRICING[selectedPackage].name} ({shingleColor})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontSize: '1.3rem', color: 'var(--primary-red)', fontWeight: 800 }}>
                <span>Total Contract Price</span> <strong>${currentTotal.toLocaleString()}</strong>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '28px' }}>
              Our project manager will review your satellite roof metrics and contact you at <strong>{phone}</strong> to confirm your installation start date.
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn-primary-lg" style={{ width: 'auto', padding: '0 32px' }} onClick={resetForm}>
                Submit Another Estimate &rarr;
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 0: Homeowner Information & Property Address ONLY */}
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              <div className="step-card">
                <div className="step-header">
                  <span className="step-tag">Step 1 of 5</span>
                  <h2 className="step-title">Get Your Instant Roof Estimate</h2>
                  <p className="step-description">
                    Enter your property details below to launch satellite roof measurement.
                    Service available in <strong>NC, SC, OH, TN</strong>.
                  </p>
                </div>

                <div className="form-section-head">1. Homeowner Contact Information</div>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ border: formErrors.homeownerName ? '2px solid #d32f2f' : '1px solid #cbd5e1' }}
                    value={homeownerName}
                    onChange={e => {
                      setHomeownerName(e.target.value);
                      if (formErrors.homeownerName && e.target.value.trim().length >= 2) {
                        setFormErrors(prev => ({ ...prev, homeownerName: null }));
                      }
                    }}
                    onBlur={() => validateField('homeownerName', homeownerName)}
                    placeholder="e.g. John Doe"
                  />
                  {formErrors.homeownerName && (
                    <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                      ⚠️ {formErrors.homeownerName}
                    </span>
                  )}
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: formErrors.phone ? '2px solid #d32f2f' : '1px solid #cbd5e1',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      background: '#ffffff',
                      transition: 'border-color 0.2s ease'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f8fafc',
                        padding: '0 12px',
                        height: '48px',
                        borderRight: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#334155',
                        userSelect: 'none',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🇺🇸</span>
                        <span>+1</span>
                      </div>
                      <input
                        type="tel"
                        className="form-input"
                        style={{ border: 'none', borderRadius: 0, outline: 'none', boxShadow: 'none' }}
                        value={phone}
                        onChange={handlePhoneChange}
                        onBlur={() => validateField('phone', phone)}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    {formErrors.phone && (
                      <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                        ⚠️ {formErrors.phone}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      style={{ border: formErrors.email ? '2px solid #d32f2f' : '1px solid #cbd5e1' }}
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (formErrors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value.trim())) {
                          setFormErrors(prev => ({ ...prev, email: null }));
                        }
                      }}
                      onBlur={() => validateField('email', email)}
                      placeholder="john@example.com"
                    />
                    {formErrors.email && (
                      <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                        ⚠️ {formErrors.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-section-head">2. Property Location (Google Autocomplete)</div>
                <div className="form-group">
                  <label className="form-label">Type Property Street Address *</label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    id="property-address"
                    className="form-input"
                    style={{ border: formErrors.propertyAddress ? '2px solid #d32f2f' : '1px solid #cbd5e1' }}
                    value={propertyAddress}
                    onChange={e => {
                      setPropertyAddress(e.target.value);
                      if (formErrors.propertyAddress && e.target.value.trim()) {
                        setFormErrors(prev => ({ ...prev, propertyAddress: null }));
                      }
                    }}
                    onBlur={() => validateField('propertyAddress', propertyAddress)}
                    placeholder="Start typing street address (e.g. 100 Main St, Raleigh, NC)..."
                    autoComplete="off"
                  />
                  {formErrors.propertyAddress && (
                    <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                      ⚠️ {formErrors.propertyAddress}
                    </span>
                  )}
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <select
                      className="form-select"
                      style={{ border: formErrors.state ? '2px solid #d32f2f' : '1px solid #cbd5e1' }}
                      value={state}
                      onChange={e => {
                        setState(e.target.value);
                        validateField('state', e.target.value);
                      }}
                    >
                      <option value="NC">North Carolina (NC)</option>
                      <option value="SC">South Carolina (SC)</option>
                      <option value="OH">Ohio (OH)</option>
                      <option value="TN">Tennessee (TN)</option>
                    </select>
                    {formErrors.state && (
                      <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                        ⚠️ {formErrors.state}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP Code</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ border: formErrors.zip ? '2px solid #d32f2f' : '1px solid #cbd5e1' }}
                      value={zip}
                      onChange={e => setZip(e.target.value)}
                      onBlur={() => validateField('zip', zip)}
                      placeholder="ZIP code"
                    />
                    {formErrors.zip && (
                      <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                        ⚠️ {formErrors.zip}
                      </span>
                    )}
                  </div>
                </div>

                <button className="btn-primary-lg" onClick={handleProceedToMap}>
                  Proceed to Satellite Roof Measurement &rarr;
                </button>
              </div>
            </div>

            {/* STEP 1: Full-Width Map Screen */}
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <div className="step-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <button className="btn-secondary" onClick={() => goToNextStep(0)}>
                    &larr; Back to Address
                  </button>
                  <span className="step-tag">Step 2 of 5: Satellite Roof Detection</span>
                </div>

                <div className="step-header">
                  <h2 className="step-title">Satellite Roof Measurement &amp; Outline</h2>
                  <p className="step-description">
                    Roof Property: <strong>{propertyAddress || 'Selected Property'}</strong> ({city}, {state} {zip})
                  </p>
                </div>

                {/* Full-Width Map Canvas */}
                <RoofMapCanvas
                  apiKey={apiKey}
                  selectedLocation={selectedLocation}
                  isVisible={currentStep === 1}
                  propertyAddress={propertyAddress}
                  mode={mode}
                  pitch={pitch}
                  waste={waste}
                  baseSquares={squares}
                  onMetricsChange={handleMetricsChange}
                  onModeChange={setMode}
                  onCoordinatesChange={setMapCoords}
                />

                {/* Waste Factor Control */}
                <div className="form-section-head" style={{ marginTop: '20px' }}>Waste Factor</div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Waste Factor (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={waste}
                    disabled
                    readOnly
                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b', maxWidth: '300px' }}
                  />
                </div>

                <button className="btn-primary-lg" onClick={() => goToNextStep(2)}>
                  Continue to Package Options &rarr;
                </button>
              </div>
            </div>

            {/* STEP 2: Package Selection */}
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <div className="step-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <button className="btn-secondary" onClick={() => goToNextStep(1)}>
                    &larr; Back to Roof Canvas
                  </button>
                  <span className="step-tag">Step 3 of 5: Package Selection</span>
                </div>

                <div className="step-header">
                  <h2 className="step-title">Choose Your Roof Package</h2>
                  <p className="step-description">
                    Tailored pricing for your property at {propertyAddress}.
                  </p>
                </div>

                <div className="package-list-container">
                  {['Silver', 'Gold', 'Elite'].map(tier => {
                    const pkg = PRICING[tier];
                    const tot = calculateTotal(tier);
                    const m15 = calculateMonthly(tot, 180);
                    const isSel = selectedPackage === tier;
                    return (
                      <div
                        key={tier}
                        className={`pkg-card ${isSel ? 'selected' : ''}`}
                        onClick={() => setSelectedPackage(tier)}
                      >
                        <div className={`pkg-rail ${pkg.railClass}`}>
                          {pkg.name}
                          {pkg.badge && <div className="pkg-badge">{pkg.badge}</div>}
                        </div>
                        <div className="pkg-body">
                          <div className="pkg-header">
                            <div>
                              <div className="pkg-subtitle">{pkg.subtitle}</div>
                            </div>
                            <div className="pkg-price-col">
                              <div className="pkg-price">${tot.toLocaleString()}.00</div>
                              <div className="pkg-permo">As low as ${m15}/mo (15-yr finance)</div>
                            </div>
                          </div>
                          <ul className="feature-list">
                            {getPackageFeatures(tier, state).map((feat, idx) => (
                              <li key={idx}>{feat}</li>
                            ))}
                          </ul>
                          <div className="pkg-select-row">
                            <span className="pkg-select-link">
                              {isSel ? 'Selected ✓' : 'Select \u203A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button className="btn-primary-lg" onClick={() => goToNextStep(3)}>
                  Continue with {PRICING[selectedPackage].name} &rarr;
                </button>
              </div>
            </div>

            {/* STEP 3: Shingle Swatches (Package-based Colors) */}
            <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
              <div className="step-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <button className="btn-secondary" onClick={() => goToNextStep(2)}>
                    &larr; Back
                  </button>
                  <span className="step-tag" style={{ color: 'var(--primary-red)', fontWeight: 700 }}>
                    STEP 2 OF 4
                  </span>
                </div>

                <div className="step-header" style={{ marginBottom: '20px' }}>
                  <h2 className="step-title" style={{ fontSize: '1.75rem' }}>Make it yours</h2>
                  <p className="step-description">Only the choices needed to build your roof.</p>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  1. SHINGLE COLOR — {selectedPackage === 'Silver' ? 'ATLAS PRO-LAM (SILVER PACKAGE)' : (state === 'OH' && selectedPackage === 'Elite') ? 'ATLAS PINNACLE IMPACT (ELITE IMPACT PACKAGE)' : selectedPackage === 'Elite' ? 'ATLAS PINNACLE PRISTINE (IHR ELITE)' : 'ATLAS PINNACLE PRISTINE'}
                </div>

                {state === 'OH' && selectedPackage === 'Elite' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.86rem', color: '#991b1b', lineHeight: 1.5 }}>
                    <strong>Atlas Pinnacle Impact® Class 4 Impact Resistant Shingles</strong><br />
                    Available in the colors below.
                  </div>
                )}

                <div className="swatch-grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                  {getPackageColorList(selectedPackage, state).map(colorName => {
                    const texture = COLOR_TEXTURES[colorName] || { color: '#4a3c31', pattern: '' };
                    const imgSrc = getShingleImage(selectedPackage, colorName, state);
                    const isSelected = shingleColor === colorName;
                    return (
                      <div
                        key={colorName}
                        className={`swatch-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setShingleColor(colorName)}
                        style={{
                          background: '#ffffff',
                          border: isSelected ? '2px solid #d32f2f' : '1px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '10px',
                          position: 'relative',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 0 2px rgba(211,47,47,0.2)' : '0 2px 8px rgba(0,0,0,0.04)'
                        }}
                      >
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#d32f2f', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            ✓
                          </div>
                        )}
                        <div
                          className="swatch-preview-box"
                          style={{
                            background: imgSrc ? `url("${imgSrc}") center/cover no-repeat` : (texture.pattern || texture.color),
                            backgroundColor: texture.color,
                            height: '240px',
                            borderRadius: '8px',
                            marginBottom: '8px'
                          }}
                        />
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', textAlign: 'center' }}>
                          {colorName}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. REVIEW YOUR PACKAGE */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    2. REVIEW YOUR PACKAGE
                  </div>

                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#d32f2f', textTransform: 'uppercase', marginBottom: '12px' }}>
                    {PRICING[selectedPackage].name}
                  </div>

                  <ul className="feature-list" style={{ marginBottom: '20px' }}>
                    {getPackageFeatures(selectedPackage, state).map((feat, idx) => (
                      <li key={idx} style={{ color: '#475569', fontSize: '0.88rem' }}>{feat}</li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Estimated total</div>
                      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d32f2f', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        ${calculateTotal(selectedPackage).toLocaleString()}.00
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                      or about ${calculateMonthly(calculateTotal(selectedPackage), 180)} / month*
                    </div>
                  </div>
                </div>

                <button className="btn-primary-lg" onClick={() => goToNextStep(4)}>
                  CONTINUE TO SCHEDULING &rarr;
                </button>
              </div>
            </div>

            {/* STEP 4: Choose Your Project Date (Step 3 of 4 in spec) */}
            <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
              <div className="step-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <button className="btn-secondary" onClick={() => goToNextStep(3)}>
                    &larr; Back
                  </button>
                  <span className="step-tag" style={{ color: 'var(--primary-red)', fontWeight: 700 }}>
                    STEP 3 OF 4
                  </span>
                </div>

                <div className="step-header" style={{ marginBottom: '20px' }}>
                  <h2 className="step-title" style={{ fontSize: '1.75rem' }}>Choose your project date</h2>
                  <p className="step-description">Pick what works best. We will confirm availability.</p>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    PREFERRED START DATE
                  </label>
                  <div className="date-input-row">
                    <input
                      type="date"
                      className="form-input"
                      id="pref-date-input"
                      value={prefDate}
                      onChange={e => setPrefDate(e.target.value)}
                    />
                    <button
                      type="button"
                      className="cal-button"
                      onClick={() => {
                        const el = document.getElementById('pref-date-input');
                        if (el?.showPicker) el.showPicker(); else el?.focus();
                      }}
                    >
                      CALENDAR &rsaquo;
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    BACKUP START DATE (OPTIONAL)
                  </label>
                  <div className="date-input-row">
                    <input
                      type="date"
                      className="form-input"
                      id="backup-date-input"
                      value={backupDate}
                      onChange={e => setBackupDate(e.target.value)}
                    />
                    <button
                      type="button"
                      className="cal-button"
                      onClick={() => {
                        const el = document.getElementById('backup-date-input');
                        if (el?.showPicker) el.showPicker(); else el?.focus();
                      }}
                    >
                      CALENDAR &rsaquo;
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  PROJECT SUMMARY
                </div>

                <div className="project-summary-box">
                  <div className="summary-row">
                    <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{PRICING[selectedPackage].name}</strong>
                    <span style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 600 }}>{shingleColor || 'Default'}</span>
                  </div>
                  <hr className="summary-divider" />
                  <div className="summary-row">
                    <span style={{ color: '#475569', fontWeight: 500 }}>Project total</span>
                    <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>${calculateTotal(selectedPackage).toLocaleString()}.00</strong>
                  </div>
                  <div className="summary-row">
                    <span style={{ color: '#475569', fontWeight: 500 }}>Estimated monthly payment*</span>
                    <strong style={{ fontSize: '1.25rem', color: '#d32f2f' }}>
                      ${calculateMonthly(calculateTotal(selectedPackage), 180)} / month
                    </strong>
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginBottom: '24px' }}>
                  *Final schedule is confirmed by your project coordinator.
                </p>

                <button className="btn-primary-lg" onClick={() => goToNextStep(5)}>
                  Confirm Date &amp; Continue &rsaquo;
                </button>
              </div>
            </div>

            {/* STEP 5: Complete Your Order & Payment Selection (Step 4 of 4 in spec) */}
            <div style={{ display: currentStep === 5 ? 'block' : 'none' }}>
              <div className="step-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <button className="btn-secondary" onClick={() => goToNextStep(4)}>
                    &larr; Back
                  </button>
                  <span className="step-tag" style={{ color: 'var(--primary-red)', fontWeight: 700 }}>
                    STEP 4 OF 4
                  </span>
                </div>

                <div className="step-header" style={{ marginBottom: '20px' }}>
                  <h2 className="step-title" style={{ fontSize: '1.75rem' }}>Complete your order</h2>
                  <p className="step-description">Choose how to pay, then review and approve.</p>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  PAYMENT METHOD
                </div>

                <div className="pay-methods" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                  <div
                    className={`pay-card ${paymentMethod === 'full' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('full')}
                  >
                    <div className="pc-head">
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: paymentMethod === 'full' ? '6px solid var(--primary-red)' : '2px solid #cbd5e1',
                        display: 'inline-block'
                      }} />
                      Pay in Full
                    </div>
                  </div>

                  <div
                    className={`pay-card ${paymentMethod !== 'full' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('15yr')}
                  >
                    <div className="pc-head">
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: paymentMethod !== 'full' ? '6px solid var(--primary-red)' : '2px solid #cbd5e1',
                        display: 'inline-block'
                      }} />
                      Finance
                    </div>
                    <div className="pc-sub">
                      Apply in seconds &middot; No hard pulls &middot; Fast approvals (12.99% APR)
                    </div>
                  </div>
                </div>

                {paymentMethod !== 'full' && (
                  <div className="term-pills-wrapper">
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      Select your financing term:
                    </div>
                    <div className="term-grid">
                      {[
                        { key: '5yr', months: 60, label: '5-Year' },
                        { key: '10yr', months: 120, label: '10-Year' },
                        { key: '15yr', months: 180, label: '15-Year' }
                      ].map(t => {
                        const isT = paymentMethod === t.key;
                        const pmtVal = calculateMonthly(calculateTotal(selectedPackage), t.months);
                        return (
                          <div
                            key={t.key}
                            className={`term-option-card ${isT ? 'selected' : ''}`}
                            onClick={() => setPaymentMethod(t.key)}
                          >
                            <div className="term-title">{t.label}</div>
                            <div className="term-amount">${pmtVal}/mo</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '24px 0 12px' }}>
                  CONTRACT SUMMARY
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', margin: '16px 0', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#64748b' }}>Homeowner</span> <strong>{homeownerName} ({phone})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#64748b' }}>Property Address</span> <strong>{propertyAddress}, {city}, {state} {zip}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#64748b' }}>Package &amp; Shingle Color</span> <strong>{PRICING[selectedPackage].name} ({shingleColor || 'Default'})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#64748b' }}>Preferred Start Date</span> <strong>{prefDate || 'Not set'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#64748b' }}>Payment Method</span>
                    <strong>
                      {paymentMethod === 'full' ? 'Pay in Full' : `${paymentMethod.replace('yr', ' Year')} Finance ($${calculateMonthly(calculateTotal(selectedPackage), paymentMethod === '5yr' ? 60 : paymentMethod === '10yr' ? 120 : 180)}/mo)`}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', color: 'var(--primary-red)', paddingTop: '12px', borderTop: '1px solid #cbd5e1' }}>
                    <span>Total Contract Price</span> <strong>${calculateTotal(selectedPackage).toLocaleString()}.00</strong>
                  </div>
                </div>

                {/* INLINE CONSENT CHECKBOX ALIGNMENT */}
                <div style={{ margin: '20px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      id="agree"
                      checked={agreeChecked}
                      onChange={e => {
                        setAgreeChecked(e.target.checked);
                        if (formErrors.agreeChecked && e.target.checked) {
                          setFormErrors(prev => ({ ...prev, agreeChecked: null }));
                        }
                      }}
                      style={{ width: '22px', height: '22px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <label htmlFor="agree" style={{ fontSize: '0.95rem', color: 'var(--text-main)', cursor: 'pointer', margin: 0, fontWeight: 500 }}>
                      I agree to the roof specifications, pricing terms, and contract conditions.
                    </label>
                  </div>
                  {formErrors.agreeChecked && (
                    <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '6px', fontWeight: 600, display: 'block' }}>
                      ⚠️ {formErrors.agreeChecked}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Type Full Name to Sign *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ border: formErrors.signature ? '2px solid #d32f2f' : '1px solid #cbd5e1' }}
                    value={signature}
                    onChange={e => {
                      setSignature(e.target.value);
                      if (formErrors.signature && e.target.value.trim()) {
                        setFormErrors(prev => ({ ...prev, signature: null }));
                      }
                    }}
                    onBlur={() => validateField('signature', signature)}
                    placeholder="e.g. John Doe"
                  />
                  {formErrors.signature && (
                    <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600, display: 'block' }}>
                      ⚠️ {formErrors.signature}
                    </span>
                  )}
                </div>

                <button
                  className="btn-primary-lg"
                  disabled={isSubmitting}
                  onClick={handleSubmitOrder}
                >
                  {isSubmitting
                    ? 'Submitting Contract...'
                    : paymentMethod === 'full'
                      ? 'Approve & Submit Project \u2192'
                      : 'Continue to GoodLeap Financing \u2192'
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
