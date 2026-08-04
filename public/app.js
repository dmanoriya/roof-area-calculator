// State Management
const quoteState = {
    currentStep: 0,
    homeownerName: 'John Doe',
    phone: '(984) 205-5638',
    email: 'homeowner@example.com',
    propertyAddress: '100 Main St',
    city: 'Raleigh',
    state: 'NC',
    zip: '27601',
    mode: 'auto', // 'auto' or 'manual'
    pitch: 'medium',
    pitchMultipliers: {
        flat: 1.0,
        low: 1.05,
        medium: 1.15,
        steep: 1.25,
        high: 1.41
    },
    squares: 30,
    waste: 12,
    areaSqFt: 3000,
    adjSquares: 38.6,
    selectedPackage: 'Gold',
    shingleColor: 'Weathered Wood',
    prefDate: '',
    backupDate: '',
    paymentMethod: '15yr',
    totals: {},
    pmts: {},
    mapCoordinates: [],
    apiKey: ''
};

const PRICING = {
    Elite: { targetPerSq: 650, name: "IHR Elite" },
    Gold: { targetPerSq: 575, name: "Gold Package" },
    Silver: { targetPerSq: 525, name: "Silver Package" }
};

const SHINGLE_COLORS = [
    { name: "Weathered Wood", color: "#4a3c31" },
    { name: "Pewter Gray", color: "#5a6268" },
    { name: "Black Shadow", color: "#1f2421" },
    { name: "Copper Canyon", color: "#7a462b" },
    { name: "Hearthstone", color: "#8c8275" },
    { name: "Heatherblend", color: "#5c4f43" },
    { name: "Oyster Shell", color: "#7c8585" },
    { name: "Woodland Green", color: "#2d4739" }
];

let map = null;
let googlePolygon = null;
let drawingManager = null;
let manualCanvasPoints = [];
let isFallbackMode = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchSettingsAndInitMap();
    setupColorSwatches();
    setDefaultDates();
    calculateRoofMetrics();
});

// Fetch settings (e.g. API key, pricing) from backend
async function fetchSettingsAndInitMap() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
            quoteState.apiKey = data.settings.apiKey;
            if (data.settings.pricing) {
                Object.assign(PRICING, data.settings.pricing);
            }
        }
    } catch (err) {
        console.log('Using default client settings');
    }

    if (quoteState.apiKey) {
        loadGoogleMapsScript(quoteState.apiKey);
    } else {
        initFallbackSatelliteCanvas();
    }
}

// Load Google Maps JS SDK dynamically if API Key provided
function loadGoogleMapsScript(apiKey) {
    if (window.google && window.google.maps) {
        initGoogleMap();
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.warn('Google Maps script failed to load. Falling back to interactive Canvas view.');
        initFallbackSatelliteCanvas();
    };
    document.head.appendChild(script);
}

// Initialize Google Maps
window.initGoogleMap = function() {
    isFallbackMode = false;
    const defaultCenter = { lat: 35.7796, lng: -78.6382 }; // Raleigh NC default
    const mapElement = document.getElementById('map');

    if (!mapElement) return;

    map = new google.maps.Map(mapElement, {
        center: defaultCenter,
        zoom: 20,
        mapTypeId: 'hybrid', // High-res satellite view
        tilt: 0,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false
    });

    // Places Autocomplete Setup
    const addressInput = document.getElementById('property-address');
    if (addressInput && google.maps.places) {
        const autocomplete = new google.maps.places.Autocomplete(addressInput, {
            types: ['address'],
            componentRestrictions: { country: 'us' }
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                map.setCenter(place.geometry.location);
                map.setZoom(20);
                parseAddressComponents(place);
                if (quoteState.mode === 'auto') {
                    generateAutoRoofPolygon(place.geometry.location);
                }
            }
        });
    }

    // Google Drawing Manager for manual polygon drawing
    if (google.maps.drawing) {
        drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                fillColor: '#d32f2f',
                fillOpacity: 0.35,
                strokeColor: '#d32f2f',
                strokeWeight: 3,
                editable: true,
                draggable: true
            }
        });
        drawingManager.setMap(map);

        google.maps.event.addListener(drawingManager, 'polygoncomplete', (poly) => {
            if (googlePolygon) googlePolygon.setMap(null);
            googlePolygon = poly;
            drawingManager.setDrawingMode(null);
            updatePolygonArea(poly);

            // Listen to vertex edits
            google.maps.event.addListener(poly.getPath(), 'set_at', () => updatePolygonArea(poly));
            google.maps.event.addListener(poly.getPath(), 'insert_at', () => updatePolygonArea(poly));
        });
    }

    // Generate initial auto polygon
    generateAutoRoofPolygon(defaultCenter);
};

// Auto Roof Footprint Estimation Polygon
function generateAutoRoofPolygon(centerLocation) {
    if (isFallbackMode) {
        drawFallbackPolygon();
        return;
    }
    if (!map || !google.maps.geometry) return;

    const lat = typeof centerLocation.lat === 'function' ? centerLocation.lat() : centerLocation.lat;
    const lng = typeof centerLocation.lng === 'function' ? centerLocation.lng() : centerLocation.lng;

    // Approximate 3,000 sq ft roof footprint square (approx ~54.7ft x 54.7ft)
    const latDelta = 0.00015;
    const lngDelta = 0.00018;

    const coords = [
        { lat: lat + latDelta, lng: lng - lngDelta },
        { lat: lat + latDelta, lng: lng + lngDelta },
        { lat: lat - latDelta, lng: lng + lngDelta },
        { lat: lat - latDelta, lng: lng - lngDelta }
    ];

    if (googlePolygon) googlePolygon.setMap(null);

    googlePolygon = new google.maps.Polygon({
        paths: coords,
        strokeColor: '#d32f2f',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        fillColor: '#d32f2f',
        fillOpacity: 0.35,
        editable: true,
        map: map
    });

    updatePolygonArea(googlePolygon);

    google.maps.event.addListener(googlePolygon.getPath(), 'set_at', () => updatePolygonArea(googlePolygon));
    google.maps.event.addListener(googlePolygon.getPath(), 'insert_at', () => updatePolygonArea(googlePolygon));
}

// Update Area from Google Polygon
function updatePolygonArea(poly) {
    if (!google.maps.geometry || !poly) return;
    const areaSqMeters = google.maps.geometry.spherical.computeArea(poly.getPath());
    const areaSqFt = Math.round(areaSqMeters * 10.7639);
    quoteState.areaSqFt = Math.max(areaSqFt, 500);
    quoteState.squares = Math.round(quoteState.areaSqFt / 100);
    
    document.getElementById('squares').value = quoteState.squares;
    
    // Save coordinates
    const path = poly.getPath();
    quoteState.mapCoordinates = [];
    for (let i = 0; i < path.getLength(); i++) {
        const pt = path.getAt(i);
        quoteState.mapCoordinates.push({ lat: pt.lat(), lng: pt.lng() });
    }

    const badge = document.getElementById('point-count-badge');
    if (badge) badge.innerText = `${quoteState.mapCoordinates.length} Vertices`;

    calculateRoofMetrics();
}

// Parse Google Address Components
function parseAddressComponents(place) {
    if (!place.address_components) return;
    let streetNumber = '', route = '', city = '', state = '', zip = '';

    place.address_components.forEach(c => {
        if (c.types.includes('street_number')) streetNumber = c.long_name;
        if (c.types.includes('route')) route = c.long_name;
        if (c.types.includes('locality')) city = c.long_name;
        if (c.types.includes('administrative_area_level_1')) state = c.short_name;
        if (c.types.includes('postal_code')) zip = c.long_name;
    });

    if (streetNumber || route) {
        document.getElementById('property-address').value = `${streetNumber} ${route}`.trim();
    }
    if (city) document.getElementById('city').value = city;
    if (state) document.getElementById('state').value = state;
    if (zip) document.getElementById('zip').value = zip;
}

// Fallback Interactive Satellite Canvas (When Maps API Key is pending or simulated)
function initFallbackSatelliteCanvas() {
    isFallbackMode = true;
    const wrapper = document.getElementById('map-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="map-fallback-canvas" id="fallback-canvas" onclick="handleFallbackCanvasClick(event)">
            <svg width="100%" height="100%" style="position:absolute; top:0; left:0; pointer-events:none;" id="svg-overlay">
                <polygon id="svg-polygon" points="" fill="rgba(211,47,47,0.35)" stroke="#d32f2f" stroke-width="3" />
            </svg>
            <div style="z-index:2; text-align:center; background:rgba(0,0,0,0.65); padding:10px 16px; border-radius:8px; pointer-events:none;">
                <div style="font-weight:700; color:#fbbf24; font-size:1.05rem;">📡 Satellite View Simulation Mode</div>
                <div style="font-size:0.8rem; color:#e2e8f0; margin-top:4px;">Click anywhere on this satellite grid to manually place roof vertices</div>
            </div>
            <div class="map-instruction-overlay">
                <span>📍 Click on canvas corners to shape the roof perimeter.</span>
                <span id="point-count-badge" style="background:#d32f2f; padding:2px 8px; border-radius:10px; font-size:0.75rem;">0 Points</span>
            </div>
        </div>
    `;

    drawFallbackPolygon();
}

function handleFallbackCanvasClick(e) {
    if (quoteState.mode !== 'manual') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    manualCanvasPoints.push({ x, y });
    renderFallbackSVG();
}

function renderFallbackSVG() {
    const svgPoly = document.getElementById('svg-polygon');
    const badge = document.getElementById('point-count-badge');
    if (!svgPoly) return;

    const pointsStr = manualCanvasPoints.map(p => `${p.x},${p.y}`).join(' ');
    svgPoly.setAttribute('points', pointsStr);

    if (badge) badge.innerText = `${manualCanvasPoints.length} Points`;

    if (manualCanvasPoints.length >= 3) {
        // Calculate polygon area using Gauss Shoelace formula
        let area = 0;
        const n = manualCanvasPoints.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += manualCanvasPoints[i].x * manualCanvasPoints[j].y;
            area -= manualCanvasPoints[j].x * manualCanvasPoints[i].y;
        }
        area = Math.abs(area) / 2;
        // Scale pixel area to sq ft simulation factor
        const simulatedSqFt = Math.round(area * 40);
        quoteState.areaSqFt = Math.max(simulatedSqFt, 800);
        quoteState.squares = Math.round(quoteState.areaSqFt / 100);
        document.getElementById('squares').value = quoteState.squares;
        calculateRoofMetrics();
    }
}

function drawFallbackPolygon() {
    manualCanvasPoints = [
        { x: 120, y: 80 },
        { x: 420, y: 80 },
        { x: 450, y: 280 },
        { x: 90, y: 280 }
    ];
    renderFallbackSVG();
}

// Mode & Pitch Handlers
function setRoofMode(mode) {
    quoteState.mode = mode;
    document.getElementById('btn-mode-auto').classList.toggle('active', mode === 'auto');
    document.getElementById('btn-mode-manual').classList.toggle('active', mode === 'manual');

    const instruction = document.getElementById('map-instruction');

    if (mode === 'auto') {
        if (instruction) instruction.querySelector('span').innerText = '⚡ Auto Roof Detect active. Drag red corner handles to adjust.';
        if (map && google.maps.geometry) {
            generateAutoRoofPolygon(map.getCenter());
        } else {
            drawFallbackPolygon();
        }
    } else {
        if (instruction) instruction.querySelector('span').innerText = '✏️ Manual Mode active. Click on satellite canvas to place points.';
        if (drawingManager) drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    }
}

function clearPolygon() {
    if (googlePolygon) {
        googlePolygon.setMap(null);
        googlePolygon = null;
    }
    manualCanvasPoints = [];
    renderFallbackSVG();
    const badge = document.getElementById('point-count-badge');
    if (badge) badge.innerText = '0 Points';
}

function resetMapCenter() {
    if (map) {
        map.setCenter({ lat: 35.7796, lng: -78.6382 });
        map.setZoom(20);
    }
}

function selectPitch(pitchKey) {
    quoteState.pitch = pitchKey;
    document.querySelectorAll('.pitch-pill').forEach(pill => {
        pill.classList.toggle('selected', pill.getAttribute('data-pitch') === pitchKey);
    });
    calculateRoofMetrics();
}

// Calculations & Pricing Logic
function calculateRoofMetrics() {
    const baseSqInput = parseFloat(document.getElementById('squares').value) || 30;
    const wasteInput = parseFloat(document.getElementById('waste').value) || 12;
    const pitchMult = quoteState.pitchMultipliers[quoteState.pitch] || 1.15;

    quoteState.squares = baseSqInput;
    quoteState.waste = wasteInput;
    quoteState.areaSqFt = baseSqInput * 100;

    // Formula: Adjusted Squares = Base Squares * Pitch Multiplier * (1 + Waste%/100)
    const adjSquares = baseSqInput * pitchMult * (1 + (wasteInput / 100));
    quoteState.adjSquares = parseFloat(adjSquares.toFixed(1));

    // Update Banner UI
    document.getElementById('disp-area-sqft').innerText = quoteState.areaSqFt.toLocaleString();
    document.getElementById('disp-base-sq').innerText = baseSqInput.toFixed(1);
    document.getElementById('disp-adj-sq').innerText = quoteState.adjSquares.toFixed(1);

    document.querySelectorAll('.display-adj-sq-text').forEach(el => {
        el.innerText = quoteState.adjSquares.toFixed(1);
    });

    calculatePackagePricing();
}

function calculatePackagePricing() {
    const sq = quoteState.adjSquares;

    ['Silver', 'Gold', 'Elite'].forEach(tier => {
        const rate = PRICING[tier].targetPerSq;
        const total = Math.round(sq * rate);
        quoteState.totals[tier] = total;

        // Amortized monthly payments (12.99% APR)
        const pmts = {
            '5yr': Math.round(calculateMonthlyPayment(total, 0.1299, 60)),
            '10yr': Math.round(calculateMonthlyPayment(total, 0.1299, 120)),
            '15yr': Math.round(calculateMonthlyPayment(total, 0.1299, 180))
        };
        quoteState.pmts[tier] = pmts;

        const priceEl = document.getElementById(`price-${tier.toLowerCase()}`);
        const pmtEl = document.getElementById(`pmt-${tier.toLowerCase()}`);

        if (priceEl) priceEl.innerText = `$${total.toLocaleString()}`;
        if (pmtEl) pmtEl.innerText = `or $${pmts['15yr']}/mo*`;
    });

    updateTermPaymentLabels();
    updateFinalReview();
}

function calculateMonthlyPayment(principal, annualRate, months) {
    const monthlyRate = annualRate / 12;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

// Swatches setup
function setupColorSwatches() {
    const grid = document.getElementById('color-swatch-grid');
    if (!grid) return;

    grid.innerHTML = SHINGLE_COLORS.map((c, i) => `
        <div class="swatch ${i === 0 ? 'selected' : ''}" onclick="selectShingleColor('${c.name}', this)">
            <div class="swatch-check">✓</div>
            <div class="swatch-image-wrap">
                <div class="swatch-color-box" style="background-color: ${c.color};">
                    ${c.name}
                </div>
            </div>
            <div class="swatch-name">${c.name}</div>
        </div>
    `).join('');
}

function selectShingleColor(colorName, element) {
    quoteState.shingleColor = colorName;
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    updateFinalReview();
}

function selectPackage(tier) {
    quoteState.selectedPackage = tier;
    document.querySelectorAll('.pkg-card').forEach(card => card.classList.remove('selected'));
    const selectedCard = document.querySelector(`.pkg-card.${tier.toLowerCase()}`);
    if (selectedCard) selectedCard.classList.add('selected');
    updateFinalReview();
}

function selectPayFull() {
    quoteState.paymentMethod = 'full';
    document.getElementById('payment-method').value = 'full';
    document.getElementById('paycard-full').classList.add('selected');
    document.getElementById('paycard-finance').classList.remove('selected');
    document.getElementById('finance-terms-container').style.display = 'none';
    updateFinalReview();
}

function selectPayFinance(term) {
    quoteState.paymentMethod = term;
    document.getElementById('payment-method').value = term;
    document.getElementById('paycard-full').classList.remove('selected');
    document.getElementById('paycard-finance').classList.add('selected');
    document.getElementById('finance-terms-container').style.display = 'flex';

    document.querySelectorAll('.term-pill').forEach(pill => {
        pill.classList.toggle('selected', pill.getAttribute('data-term') === term);
    });

    updateFinalReview();
}

function updateTermPaymentLabels() {
    const tier = quoteState.selectedPackage;
    const pmts = quoteState.pmts[tier] || {};

    ['5yr', '10yr', '15yr'].forEach(term => {
        const el = document.getElementById(`term-amt-${term}`);
        if (el && pmts[term]) {
            el.innerText = `$${pmts[term]}/mo`;
        }
    });
}

function updateFinalReview() {
    const tier = quoteState.selectedPackage;
    const total = quoteState.totals[tier] || 0;
    const pmt = quoteState.pmts[tier] ? quoteState.pmts[tier][quoteState.paymentMethod] : 0;

    // Step 2 Review
    const s2Name = document.getElementById('step2-pkg-name');
    const s2Total = document.getElementById('step2-total');
    const s2Permo = document.getElementById('step2-permo');
    if (s2Name) s2Name.innerText = PRICING[tier].name.toUpperCase();
    if (s2Total) s2Total.innerText = `$${total.toLocaleString()}`;
    if (s2Permo) s2Permo.innerText = `or about $${pmt}/month*`;

    // Step 3 Review
    const s3Name = document.getElementById('step3-pkg-name');
    const s3Color = document.getElementById('step3-color');
    const s3Total = document.getElementById('step3-total');
    const s3Permo = document.getElementById('step3-permo');
    if (s3Name) s3Name.innerText = PRICING[tier].name;
    if (s3Color) s3Color.innerText = quoteState.shingleColor;
    if (s3Total) s3Total.innerText = `$${total.toLocaleString()}`;
    if (s3Permo) s3Permo.innerText = `$${pmt}/month`;

    // Step 4 Review
    document.getElementById('sum-homeowner').innerText = document.getElementById('homeowner-name').value || '-';
    document.getElementById('sum-property').innerText = `${document.getElementById('property-address').value}, ${document.getElementById('city').value}, ${document.getElementById('state').value} ${document.getElementById('zip').value}`;
    document.getElementById('sum-contact').innerText = `${document.getElementById('phone').value} · ${document.getElementById('email').value}`;
    document.getElementById('sum-sq').innerText = `${quoteState.adjSquares} Squares (${quoteState.squares} base + ${quoteState.waste}% waste + ${quoteState.pitch} pitch)`;
    document.getElementById('sum-pkg').innerText = PRICING[tier].name;
    document.getElementById('sum-color').innerText = quoteState.shingleColor;
    document.getElementById('sum-date').innerText = document.getElementById('pref-date').value || 'To be confirmed';
    document.getElementById('sum-total').innerText = `$${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    let payText = 'Pay in Full';
    if (quoteState.paymentMethod !== 'full') {
        payText = `${quoteState.paymentMethod.replace('yr', '-Year')} Finance ($${pmt}/month)`;
    }
    document.getElementById('sum-payment').innerText = payText;
}

// Navigation & Steps
function goToStep(stepNum) {
    if (stepNum > quoteState.currentStep && !validateCurrentStep()) return;

    document.querySelectorAll('.step').forEach((el, index) => {
        el.classList.toggle('active', index === stepNum);
    });

    quoteState.currentStep = stepNum;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
    if (quoteState.currentStep === 0) {
        const name = document.getElementById('homeowner-name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const address = document.getElementById('property-address').value.trim();

        if (!name || !phone || !email || !address) {
            alert('Please fill out all required homeowner and property fields before continuing.');
            return false;
        }
    }
    return true;
}

function calculateAndProceed() {
    calculateRoofMetrics();
    goToStep(1);
}

function setDefaultDates() {
    const prefDateInput = document.getElementById('pref-date');
    if (prefDateInput) {
        const d = new Date();
        d.setDate(d.getDate() + 14); // 2 weeks out
        prefDateInput.value = d.toISOString().slice(0, 10);
    }
}

// Submit Order to Backend API & CRM
async function submitOrder() {
    const agreeChecked = document.getElementById('agree-checkbox').checked;
    const signature = document.getElementById('signature').value.trim();

    if (!agreeChecked) {
        alert('Please check the agreement box before submitting your project.');
        return;
    }
    if (!signature) {
        alert('Please type your full name in the signature field to sign your project contract.');
        document.getElementById('signature').focus();
        return;
    }

    const leadData = {
        homeownerName: document.getElementById('homeowner-name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        propertyAddress: document.getElementById('property-address').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value,
        zip: document.getElementById('zip').value.trim(),
        squares: quoteState.squares,
        waste: quoteState.waste,
        pitch: quoteState.pitch,
        adjSquares: quoteState.adjSquares,
        calculatedAreaSqFt: quoteState.areaSqFt,
        selectedPackage: quoteState.selectedPackage,
        shingleColor: quoteState.shingleColor,
        prefDate: document.getElementById('pref-date').value,
        backupDate: document.getElementById('backup-date').value,
        paymentMethod: quoteState.paymentMethod,
        totalAmount: quoteState.totals[quoteState.selectedPackage] || 0,
        monthlyPayment: quoteState.pmts[quoteState.selectedPackage] ? quoteState.pmts[quoteState.selectedPackage][quoteState.paymentMethod] : 0,
        signature: signature,
        mapCoordinates: quoteState.mapCoordinates
    };

    try {
        const btn = document.getElementById('checkout-submit-btn');
        btn.disabled = true;
        btn.innerText = 'Submitting Project...';

        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadData)
        });

        const data = await res.json();

        if (data.success) {
            alert(`🎉 Thank you, ${signature}! Your roof estimate and project submission #${data.leadId} has been received. Our project coordinator will contact you shortly!`);
            window.location.href = 'admin.html';
        } else {
            alert('Failed to submit estimate: ' + (data.message || 'Unknown error'));
            btn.disabled = false;
            btn.innerText = 'Approve & Submit Project →';
        }
    } catch (err) {
        console.error('Submission error:', err);
        alert('Network error submitting estimate. Please try again.');
        const btn = document.getElementById('checkout-submit-btn');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Approve & Submit Project →';
        }
    }
}
