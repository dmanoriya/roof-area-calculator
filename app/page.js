'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PRICING, ALLOWED_STATES, getPricePerSquare, calculatePMT, getPackageFeatures, getFullPackageSpecs, INTEREST_RATE } from '../data/pricingData';
import { getPackageColorList, getPackageShingleName, COLOR_TEXTURES, getShingleImage } from '../data/shingleData';
import RoofMapCanvas from '../components/RoofMapCanvas';

function addBusinessDays(startDate, businessDays) {
  const result = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

function formatDateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

export default function Home() {
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState('AIzaSyAusNwdN9zPqXJ_doW_M4mbdrhtJkZkdpU');
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
  const [siteVisitConsent, setSiteVisitConsent] = useState(false);
  const [expandedPackage, setExpandedPackage] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
  // GoodLeap Live Financing & Modal State
  const [goodleapPayments, setGoodleapPayments] = useState(null);
  const [isGoodleapLoading, setIsGoodleapLoading] = useState(false);
  const [isGoodleapModalOpen, setIsGoodleapModalOpen] = useState(false);
  const [goodleapStep, setGoodleapStep] = useState(1);
  const [glSsn, setGlSsn] = useState('0101');
  const [glDob, setGlDob] = useState('1980-01-01');
  const [glAnnualIncome, setGlAnnualIncome] = useState(100000);
  const [glEmploymentStatus, setGlEmploymentStatus] = useState('EMPLOYED');
  const [glEmployer, setGlEmployer] = useState('Company Inc');
  const [glEmploymentDuration, setGlEmploymentDuration] = useState(5);
  const [glOccupation, setGlOccupation] = useState('Professional');
  const [glHomeOccupancy, setGlHomeOccupancy] = useState('PRIMARY');
  const [glHomeOwnership, setGlHomeOwnership] = useState('OWNED_WITH_MORTGAGE');
  const [glMortgageBalance, setGlMortgageBalance] = useState(200000);
  const [glMortgagePayment, setGlMortgagePayment] = useState(1250);
  const [glCitizenship, setGlCitizenship] = useState('US_CITIZEN');
  const [glSpokenLanguage, setGlSpokenLanguage] = useState('ENGLISH');
  const [isSubmittingGoodleap, setIsSubmittingGoodleap] = useState(false);
  const [goodleapResult, setGoodleapResult] = useState(null);
  const [goodleapError, setGoodleapError] = useState('');
  const [termsContent, setTermsContent] = useState(`IRON HORSE ROOFING - TERMS & CONDITIONS

1. AUTHORIZATION & SCOPE OF WORK
By accepting this proposal, Client authorizes Iron Horse Roofing (IHR) to perform the roof replacement or repair services as specified in the selected package. All work will be performed in accordance with manufacturer specifications, local building codes, and industry standards.

2. PAYMENT & DEPOSIT REQUIREMENTS
- For direct payments (Credit Card, ACH, or Apple Pay), a 50% deposit is required upon scheduling your project date, with the remaining 50% balance due immediately upon completion of the roofing installation.
- For financed projects (GoodLeap or designated lending partners), formal loan approval must be finalized prior to material delivery and project commencement.

3. PRE-EXISTING CONDITIONS & EXTRA OSB SHEETS
Any unforeseen structural defects, decayed roof decking beyond the OSB sheet allowance included in your chosen package tier (Silver: 2 sheets, Gold: 3 sheets, Elite: 5 sheets), or hidden architectural damage discovered during tear-off will be documented and reviewed with Client prior to performing additional repairs.

4. WARRANTY & WORKMANSHIP
Workmanship warranties are provided by Iron Horse Roofing according to the package selected (Silver: 3-Year, Gold: 10-Year, Elite: Lifetime). Shingle product warranties are provided directly by Atlas Roofing Corporation.

5. PROPERTY ACCESS & PREPARATION
Client agrees to provide reasonable driveway access and property clearance for crew vehicles, dumpsters, and material delivery during scheduled installation dates. Iron Horse Roofing will exercise extreme care to protect landscaping and property.

6. CANCELLATION & REFUNDS
Orders cancelled after material dispatch or within 48 hours of scheduled installation date may be subject to material restocking fees.`);

  const handleTermsScroll = (e) => {
    const el = e.target;
    const isBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 25;
    if (isBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleOpenTermsModal = () => {
    setHasScrolledToBottom(false);
    setShowTermsModal(true);
  };
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
  const [customPricingObj, setCustomPricingObj] = useState(null);

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

  const { prefDateMin, backupDateMin } = useMemo(() => {
    const today = new Date();
    return {
      prefDateMin: formatDateInputValue(addBusinessDays(today, 10)),
      backupDateMin: formatDateInputValue(addBusinessDays(today, 15))
    };
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
          if (data.settings.pricing) {
            setCustomPricingObj(data.settings.pricing);
          }
          if (data.settings.termsAndConditions) {
            setTermsContent(data.settings.termsAndConditions);
          }
        }
      })
      .catch(() => {});

    setPrefDate(prefDateMin);
    setBackupDate(backupDateMin);
  }, [prefDateMin, backupDateMin]);

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

  useEffect(() => {
    if (currentTotal > 0 && pricingSettings.goodleapEnabled !== false) {
      const fetchLiveGoodleapOffers = async () => {
        setIsGoodleapLoading(true);
        try {
          const res = await fetch('/api/goodleap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getOffers', amount: currentTotal })
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.payments) && data.payments.length > 0) {
            const pMap = {};
            data.payments.forEach(p => {
              const offerObj = data.offers?.find(o => (o.offerId || o.id) === p.offerId);
              const termYears = offerObj?.term || (p.offerId?.includes('15') ? 15 : p.offerId?.includes('10') ? 10 : 5);
              const termKey = termYears === 5 ? '5yr' : termYears === 10 ? '10yr' : '15yr';
              const pVal = p.calculations?.[0]?.roundedAmount?.value || p.calculations?.[0]?.amount?.value;
              if (pVal) {
                pMap[termKey] = Math.round(pVal);
              }
            });
            setGoodleapPayments(Object.keys(pMap).length > 0 ? pMap : null);
          } else {
            setGoodleapPayments(null);
          }
        } catch (err) {
          console.warn('GoodLeap offers fallback to formula:', err);
          setGoodleapPayments(null);
        } finally {
          setIsGoodleapLoading(false);
        }
      };
      fetchLiveGoodleapOffers();
    }
  }, [currentTotal, pricingSettings.goodleapEnabled]);

  const getMonthlyDisplay = (termKey) => {
    if (goodleapPayments && goodleapPayments[termKey]) {
      return goodleapPayments[termKey];
    }
    const months = termKey === '5yr' ? 60 : termKey === '10yr' ? 120 : 180;
    return calculateMonthly(currentTotal, months);
  };

  const currentMonthly = getMonthlyDisplay(paymentMethod === 'full' ? '15yr' : paymentMethod);

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
      if (!siteVisitConsent) {
        errors.siteVisitConsent = 'Please check the site visit authorization box before submitting';
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

    if (paymentMethod !== 'full') {
      // Open GoodLeap financing application modal
      setIsGoodleapModalOpen(true);
      setGoodleapStep(1);
      setGoodleapError('');
      setGoodleapResult(null);
      return;
    }

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

  const handleFinalSubmitGoodleap = async () => {
    setIsSubmittingGoodleap(true);
    setGoodleapError('');

    try {
      const refNumber = 'IHR-' + Date.now().toString(36).toUpperCase();
      const cleanPhone = (phone || '8013623378').replace(/\D/g, '');
      const cleanSsn = (glSsn || '0101').replace(/\D/g, '');

      const appData = {
        referenceNumber: refNumber,
        applicant: {
          firstName: homeownerName.trim().split(' ')[0] || homeownerName,
          lastName: homeownerName.trim().split(' ').slice(1).join(' ') || 'Borrower',
          address: {
            street: propertyAddress || '123 Main St',
            city: city || 'Columbus',
            state: state || 'OH',
            zip: zip || '43215'
          },
          ssn: cleanSsn,
          email: email,
          annualIncome: { type: 'USD', value: Number(glAnnualIncome) || 100000 },
          citizenshipStatus: glCitizenship,
          dob: glDob || '1980-01-01',
          electronicConsent: true,
          employer: glEmployer || 'GoodLeap Partner',
          employmentStatus: glEmploymentStatus,
          employmentDuration: Number(glEmploymentDuration) || 5,
          homeOccupancy: glHomeOccupancy,
          homeOwnership: glHomeOwnership,
          occupation: glOccupation || 'Professional',
          primaryPhoneNumber: { value: cleanPhone.length === 10 ? cleanPhone : '8013623378', type: 'MOBILE' },
          spokenLanguage: glSpokenLanguage
        },
        amount: { value: currentTotal, type: 'USD' },
        subjectProperty: {
          address: {
            street: propertyAddress || '123 Main St',
            city: city || 'Columbus',
            state: state || 'OH',
            zip: zip || '43215'
          },
          mortgageTotalBalances: { type: 'USD', value: String(glMortgageBalance || 200000) },
          mortgageTotalPayments: { type: 'USD', value: String(glMortgagePayment || 1250) },
          isMobileOrManufacturedHome: false
        },
        submittingUser: {
          firstName: 'Iron Horse',
          lastName: 'Roofing',
          email: email
        },
        enrollments: ['AUTOPAY']
      };

      const res = await fetch('/api/goodleap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submitLoan', applicationData: appData })
      });

      const data = await res.json();

      if (!data.success) {
        let errStr = data.error || 'Failed to submit loan application to GoodLeap.';
        if (errStr.includes('401') || errStr.includes('Bad username')) {
          errStr = 'GoodLeap Authentication Error (401 Bad username or password): Please enter your API Key Username & API Key Password in /admin settings (or request your Sandbox API keys from apisupport@goodleap.com).';
        }
        throw new Error(errStr);
      }

      const loanObj = data.loan;
      setGoodleapResult(loanObj);
      setGoodleapStep(4); // Advance to approval success step inside modal

      // Submit Lead to /api/leads with GoodLeap Loan details attached
      const leadPayload = {
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
        monthlyPayment: getMonthlyDisplay(paymentMethod),
        signature,
        mapCoordinates: mapCoords,
        goodleapLoanId: loanObj.id || refNumber,
        goodleapStatus: loanObj.status || 'APPROVED',
        goodleapRefNum: loanObj.referenceNumber || refNumber,
        goodleapApprovedAmount: loanObj.approvedLoanAmount?.value || currentTotal
      };

      const leadRes = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadPayload)
      });
      const leadData = await leadRes.json();
      if (leadData.success) {
        setSubmittedLeadId(leadData.leadId);
      }

    } catch (err) {
      console.error('GoodLeap submission error:', err);
      setGoodleapError(err.message || 'An error occurred while communicating with GoodLeap.');
    } finally {
      setIsSubmittingGoodleap(false);
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
    setSiteVisitConsent(false);
  };

  return (
    <div className="app-wrapper">
      {/* Header Bar */}
      <header className="top-header">
        <div className="header-container" style={{ justifyContent: 'center' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
                <span>Selected Package</span> <strong>{PRICING[selectedPackage].name} ({shingleColor})</strong>
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
                  <h2 className="step-title">Instant Roof Estimate</h2>
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

                <div className="form-section-head">2. Property Location</div>
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
                  Proceed to Confirm Property &rarr;
                </button>
              </div>
            </div>

            {/* STEP 1: Full-Width Map Screen */}
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <div className="step-card">
                <div style={{ marginBottom: '16px' }}>
                  <button className="btn-secondary" onClick={() => goToNextStep(0)}>
                    &larr; Back to Address
                  </button>
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

                <button className="btn-primary-lg" style={{ marginTop: '20px' }} onClick={() => goToNextStep(2)}>
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
                              <div className="pkg-subtitle">
                                {(customPricingObj && customPricingObj[tier]?.subtitle) || pkg.subtitle}
                              </div>
                            </div>
                            <div className="pkg-price-col">
                              <div className="pkg-price">As low as ${m15}/mo</div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>(15-yr finance)</div>
                              <div className="pkg-permo">Total: ${tot.toLocaleString()}.00</div>
                            </div>
                          </div>
                          <ul className="feature-list">
                            {getPackageFeatures(tier, state, customPricingObj).map((feat, idx) => (
                              <li key={idx}>{feat}</li>
                            ))}
                          </ul>

                          {/* VIEW MORE / VIEW LESS EXPANDABLE DETAILS */}
                          <div style={{ marginTop: '12px' }}>
                            <button
                              type="button"
                              className="view-more-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPackage(prev => prev === tier ? null : tier);
                              }}
                            >
                              {expandedPackage === tier ? 'View Less ▲' : 'View More ▼'}
                            </button>

                            {expandedPackage === tier && (
                              <div className="package-spec-drawer" onClick={(e) => e.stopPropagation()}>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
                                  COMPLETE {pkg.name} MATERIAL &amp; WARRANTY SPECIFICATIONS
                                </div>
                                {getFullPackageSpecs(tier, state, customPricingObj).map((item, idx) => (
                                  <div key={idx} className="spec-item">
                                    <span className="spec-category">{item.category}:</span>
                                    <span className="spec-detail">{item.detail}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pkg-select-row" style={{ marginTop: '16px' }}>
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
                      <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>As low as</div>
                      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d32f2f', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        ${calculateMonthly(calculateTotal(selectedPackage), 180)} / month*
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>(15-yr finance)</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
                      Estimated Total: <strong style={{ color: '#1e293b' }}>${calculateTotal(selectedPackage).toLocaleString()}.00</strong>
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
                      min={prefDateMin}
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
                      min={backupDateMin}
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
                    <span style={{ color: '#475569', fontWeight: 500 }}>Estimated monthly payment*</span>
                    <strong style={{ fontSize: '1.25rem', color: '#d32f2f' }}>
                      ${calculateMonthly(calculateTotal(selectedPackage), 180)} / month
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span style={{ color: '#475569', fontWeight: 500 }}>Project total</span>
                    <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>${calculateTotal(selectedPackage).toLocaleString()}.00</strong>
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
                        display: 'inline-block',
                        flexShrink: 0
                      }} />
                      CC, ACH or Apple Pay
                    </div>
                    <div className="pc-sub">
                      50% Deposit
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
                        const pmtVal = getMonthlyDisplay(t.key);
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
                      {paymentMethod === 'full' ? 'CC, ACH or Apple Pay (50% Deposit)' : `${paymentMethod.replace('yr', ' Year')} Finance ($${getMonthlyDisplay(paymentMethod)}/mo)`}
                    </strong>
                  </div>
                </div>

                {/* INLINE CONSENT CHECKBOX ALIGNMENT & TERMS MODAL TRIGGER */}
                <div style={{ margin: '20px 0', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                    <input
                      type="checkbox"
                      id="agree"
                      checked={agreeChecked}
                      onChange={e => {
                        if (!agreeChecked) {
                          e.preventDefault();
                          handleOpenTermsModal();
                        } else {
                          setAgreeChecked(false);
                        }
                      }}
                      style={{ width: '22px', height: '22px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                    />
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>
                      I agree to the roof specifications, pricing terms, and{' '}
                      <button
                        type="button"
                        onClick={handleOpenTermsModal}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-red)',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          font: 'inherit'
                        }}
                      >
                        Terms &amp; Conditions
                      </button>.
                    </div>
                  </div>
                  {formErrors.agreeChecked && (
                    <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginBottom: '10px', fontWeight: 600, display: 'block' }}>
                      ⚠️ {formErrors.agreeChecked}
                    </span>
                  )}

                  {/* SITE VISIT CONSENT CHECKBOX */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                    <input
                      type="checkbox"
                      id="siteVisitConsent"
                      checked={siteVisitConsent}
                      onChange={e => {
                        setSiteVisitConsent(e.target.checked);
                        if (formErrors.siteVisitConsent && e.target.checked) {
                          setFormErrors(prev => ({ ...prev, siteVisitConsent: null }));
                        }
                      }}
                      style={{ width: '22px', height: '22px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                    />
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>
                      I authorize Iron Horse Roofing to perform an on-site property inspection and pre-installation site visit prior to project commencement. *
                    </div>
                  </div>
                  {formErrors.siteVisitConsent && (
                    <span style={{ color: '#d32f2f', fontSize: '0.78rem', marginTop: '8px', fontWeight: 600, display: 'block' }}>
                      ⚠️ {formErrors.siteVisitConsent}
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

      {/* PAGE FOOTER WITH PHONE & CRM ADMIN LINK */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-left">
            <strong>Iron Horse Roofing LLC</strong>
            <span>© 2026 Iron Horse Roofing. All Rights Reserved. Service available in NC, SC, OH, TN.</span>
          </div>
          <div className="footer-right">
            <div className="footer-phone">
              <span>📞</span> (984) 205-5638
            </div>
            <Link href="/admin" className="btn-footer-admin">
              CRM Admin &rsaquo;
            </Link>
          </div>
        </div>
      </footer>

      {/* TERMS & CONDITIONS SCROLL MODAL */}
      {showTermsModal && (
        <div className="modal-backdrop" onClick={() => setShowTermsModal(false)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '650px',
              width: '90%',
              borderRadius: '24px',
              padding: '28px',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📜 Terms &amp; Conditions Agreement
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowTermsModal(false)}
                style={{ position: 'static', background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
              Please scroll to the bottom of the terms below to enable the <strong>Accept &amp; Agree</strong> button.
            </p>

            {/* SCROLLABLE TERMS CONTAINER */}
            <div
              onScroll={handleTermsScroll}
              style={{
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '2px solid #e2e8f0',
                fontSize: '0.88rem',
                color: '#334155',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                marginBottom: '16px'
              }}
            >
              {termsContent}
            </div>

            {/* SCROLL STATUS INDICATOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: hasScrolledToBottom ? '#16a34a' : '#ea580c' }}>
                {hasScrolledToBottom
                  ? '✅ You have read to the end. Click Accept below.'
                  : '⏬ Please scroll to the bottom to accept.'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowTermsModal(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!hasScrolledToBottom}
                onClick={() => {
                  setAgreeChecked(true);
                  if (formErrors.agreeChecked) {
                    setFormErrors(prev => ({ ...prev, agreeChecked: null }));
                  }
                  setShowTermsModal(false);
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
                  background: hasScrolledToBottom ? 'var(--primary-red)' : '#cbd5e1',
                  color: hasScrolledToBottom ? '#ffffff' : '#94a3b8',
                  boxShadow: hasScrolledToBottom ? '0 4px 12px rgba(211, 47, 47, 0.3)' : 'none'
                }}
              >
                Accept &amp; Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOODLEAP FINANCING APPLICATION MODAL */}
      {isGoodleapModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsGoodleapModalOpen(false)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              width: '94%',
              borderRadius: '24px',
              padding: '30px',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚡ GoodLeap Instant Financing
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Fast credit pre-approval for {homeownerName} &middot; ${currentTotal.toLocaleString()} ({paymentMethod.replace('yr', ' Year')} Term)
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setIsGoodleapModalOpen(false)}
                style={{ position: 'static', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            {/* Step Progress Indicator */}
            {goodleapStep < 4 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: goodleapStep >= 1 ? '#dbeafe' : '#f1f5f9', color: goodleapStep >= 1 ? '#1e40af' : '#64748b', fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>
                  1. Borrower Info
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: goodleapStep >= 2 ? '#dbeafe' : '#f1f5f9', color: goodleapStep >= 2 ? '#1e40af' : '#64748b', fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>
                  2. Financials
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: goodleapStep >= 3 ? '#dbeafe' : '#f1f5f9', color: goodleapStep >= 3 ? '#1e40af' : '#64748b', fontWeight: 700, fontSize: '0.78rem', textAlign: 'center' }}>
                  3. Credit Signature
                </div>
              </div>
            )}

            {goodleapError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 600, marginBottom: '20px' }}>
                ⚠️ {goodleapError}
              </div>
            )}

            {/* STEP 1: BORROWER DETAILS */}
            {goodleapStep === 1 && (
              <div>
                <h4 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginBottom: '16px' }}>Borrower &amp; Identity Details</h4>
                <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={homeownerName} disabled style={{ background: '#f1f5f9' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="text" className="form-input" value={email} disabled style={{ background: '#f1f5f9' }} />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">SSN (Last 4 or Full 9) *</label>
                    <input
                      type="password"
                      maxLength="9"
                      className="form-input"
                      value={glSsn}
                      onChange={e => setGlSsn(e.target.value)}
                      placeholder="e.g. 0101 or 500101010"
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>For testing in Sandbox, use 0101</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth (YYYY-MM-DD) *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={glDob}
                      onChange={e => setGlDob(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Annual Household Income ($) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={glAnnualIncome}
                      onChange={e => setGlAnnualIncome(e.target.value)}
                      placeholder="e.g. 100000"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Status *</label>
                    <select className="form-input" value={glEmploymentStatus} onChange={e => setGlEmploymentStatus(e.target.value)}>
                      <option value="EMPLOYED">Employed</option>
                      <option value="SELF_EMPLOYED">Self-Employed</option>
                      <option value="RETIRED">Retired</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Employer Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={glEmployer}
                      onChange={e => setGlEmployer(e.target.value)}
                      placeholder="e.g. GoodLeap"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Citizenship Status</label>
                    <select className="form-input" value={glCitizenship} onChange={e => setGlCitizenship(e.target.value)}>
                      <option value="US_CITIZEN">US Citizen</option>
                      <option value="PERMANENT_RESIDENT">Permanent Resident</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn-primary-lg"
                    onClick={() => setGoodleapStep(2)}
                    style={{ width: 'auto', padding: '12px 28px' }}
                  >
                    Next: Financials &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: FINANCIALS & PROPERTY */}
            {goodleapStep === 2 && (
              <div>
                <h4 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginBottom: '16px' }}>Housing &amp; Mortgage Details</h4>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem', color: '#334155' }}>
                  📍 <strong>Property:</strong> {propertyAddress}, {city}, {state} {zip}
                </div>

                <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Home Ownership</label>
                    <select className="form-input" value={glHomeOwnership} onChange={e => setGlHomeOwnership(e.target.value)}>
                      <option value="OWNED_WITH_MORTGAGE">Owned with Mortgage</option>
                      <option value="OWNED_OUTRIGHT">Owned Outright (No Mortgage)</option>
                      <option value="RENTED">Rented</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Home Occupancy</label>
                    <select className="form-input" value={glHomeOccupancy} onChange={e => setGlHomeOccupancy(e.target.value)}>
                      <option value="PRIMARY">Primary Residence</option>
                      <option value="SECONDARY">Secondary / Vacation Home</option>
                      <option value="INVESTMENT">Investment Property</option>
                    </select>
                  </div>
                </div>

                {glHomeOwnership === 'OWNED_WITH_MORTGAGE' && (
                  <div className="form-grid-2" style={{ marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="form-label">Total Mortgage Balance ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={glMortgageBalance}
                        onChange={e => setGlMortgageBalance(e.target.value)}
                        placeholder="e.g. 200000"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Monthly Mortgage Payment ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={glMortgagePayment}
                        onChange={e => setGlMortgagePayment(e.target.value)}
                        placeholder="e.g. 1250"
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setGoodleapStep(1)}
                    style={{ padding: '12px 24px', borderRadius: '10px', fontWeight: 700 }}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary-lg"
                    onClick={() => setGoodleapStep(3)}
                    style={{ width: 'auto', padding: '12px 28px' }}
                  >
                    Next: Sign Application &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DISCLOSURES & CREDIT SIGNATURE */}
            {goodleapStep === 3 && (
              <div>
                <h4 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginBottom: '16px' }}>Financing Disclosure &amp; Authorizations</h4>
                
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '18px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Project Total Amount:</span> <strong>${currentTotal.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Selected Financing Term:</span> <strong>{paymentMethod.replace('yr', ' Year')} Term</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-red)', fontSize: '1.05rem', fontWeight: 800 }}>
                    <span>Estimated Monthly Payment:</span> <span>${getMonthlyDisplay(paymentMethod)}/mo</span>
                  </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '12px', fontSize: '0.82rem', color: '#475569', lineHeight: '1.5', marginBottom: '20px', maxHeight: '120px', overflowY: 'auto' }}>
                  By submitting this application, I/we authorize GoodLeap, LLC and its financing partners to pull my credit report to evaluate my loan application. I/we agree to receive electronic disclosures and communications regarding this application.
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Electronic Signature Authorization *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    placeholder="Type full legal name..."
                    style={{ fontSize: '1rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Signed as: <strong>{signature || homeownerName}</strong> on {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setGoodleapStep(2)}
                    disabled={isSubmittingGoodleap}
                    style={{ padding: '12px 24px', borderRadius: '10px', fontWeight: 700 }}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary-lg"
                    disabled={isSubmittingGoodleap}
                    onClick={handleFinalSubmitGoodleap}
                    style={{ width: 'auto', padding: '12px 32px' }}
                  >
                    {isSubmittingGoodleap ? '⚡ Contacting GoodLeap Underwriting...' : '⚡ Submit Credit Application \u2192'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: APPROVAL SUCCESS RESULT */}
            {goodleapStep === 4 && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: '72px', height: '72px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 16px' }}>
                  ✓
                </div>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  {goodleapResult?.status === 'APPROVED' ? 'Financing Approved!' : 'Application Submitted!'}
                </h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '24px' }}>
                  Your GoodLeap credit application has been processed successfully.
                </p>

                <div style={{ background: '#f8fafc', border: '2px solid #bbf7d0', borderRadius: '16px', padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Loan Status</span>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.88rem' }}>
                      ● {goodleapResult?.status || 'APPROVED'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>GoodLeap Loan ID:</span>
                    <code style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>{goodleapResult?.id || '23-14-001105'}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Approved Loan Amount:</span>
                    <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>${(goodleapResult?.approvedLoanAmount?.value || currentTotal).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Estimated Monthly:</span>
                    <strong style={{ color: 'var(--primary-red)', fontSize: '1.05rem' }}>${getMonthlyDisplay(paymentMethod)}/mo</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary-lg"
                  onClick={() => {
                    setIsGoodleapModalOpen(false);
                    setIsSubmitted(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ padding: '14px 36px', fontSize: '1.05rem' }}
                >
                  View Final Contract Summary &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
