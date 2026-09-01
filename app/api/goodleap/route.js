import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function getGoodleapConfig() {
  let settings = {
    goodleapEnabled: true,
    goodleapEnv: 'sandbox',
    goodleapOrgId: 'loanpal',
    goodleapOrgKey: 'Cle@nEnergy!',
    goodleapCategoryId: '',
    goodleapPromotionId: ''
  };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      settings = { ...settings, ...data };
    }
  } catch (err) {
    console.error('Error reading settings for GoodLeap:', err);
  }

  const isSandbox = settings.goodleapEnv !== 'production';
  const baseUrl = isSandbox
    ? 'https://sandbox01-api.goodleap.com/posfinancing/rest/v2'
    : 'https://api.goodleap.com/posfinancing/rest/v2';

  const authHeader = 'Basic ' + Buffer.from(`${settings.goodleapOrgId}:${settings.goodleapOrgKey}`).toString('base64');

  return {
    enabled: settings.goodleapEnabled !== false,
    baseUrl,
    authHeader,
    categoryId: settings.goodleapCategoryId || '',
    promotionId: settings.goodleapPromotionId || '',
    orgId: settings.goodleapOrgId,
    env: settings.goodleapEnv
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const config = getGoodleapConfig();

  if (action === 'testConnection') {
    try {
      const res = await fetch(`${config.baseUrl}/categories`, {
        headers: {
          'authorization': config.authHeader,
          'content-type': 'application/json',
          'cache-control': 'no-cache'
        }
      });
      if (!res.ok) {
        const text = await res.text();
        const hint = res.status === 401
          ? ' Note: Please enter your GoodLeap API Key ID & API Key Secret from developer.goodleap.com (or your API credentials email).'
          : '';
        return NextResponse.json({
          success: false,
          error: `GoodLeap authentication failed (${res.status}): ${text}.${hint}`
        }, { status: 400 });
      }
      const categories = await res.json();
      return NextResponse.json({
        success: true,
        message: 'Successfully authenticated with GoodLeap API!',
        environment: config.env,
        categories: Array.isArray(categories) ? categories : []
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Connection error: ${err.message}`
      }, { status: 500 });
    }
  }

  if (action === 'getCategories') {
    try {
      const res = await fetch(`${config.baseUrl}/categories`, {
        headers: {
          'authorization': config.authHeader,
          'content-type': 'application/json'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const categories = await res.json();
      return NextResponse.json({ success: true, categories });
    } catch (err) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}

export async function POST(req) {
  try {
    const config = getGoodleapConfig();
    if (!config.enabled) {
      return NextResponse.json({ success: false, error: 'GoodLeap integration is currently disabled in admin settings.' }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. GET OFFERS
    if (action === 'getOffers') {
      const { amount } = body;
      let categoryId = config.categoryId;

      // If categoryId is not configured, fetch categories dynamically
      if (!categoryId) {
        const catRes = await fetch(`${config.baseUrl}/categories`, {
          headers: { 'authorization': config.authHeader, 'content-type': 'application/json' }
        });
        if (catRes.ok) {
          const cats = await catRes.json();
          if (Array.isArray(cats) && cats.length > 0) {
            categoryId = cats[0].id;
          }
        }
      }

      // Fetch promotions to find ACH autopay promotion
      let promoId = config.promotionId;
      if (!promoId) {
        const promoRes = await fetch(`${config.baseUrl}/promotions`, {
          headers: { 'authorization': config.authHeader, 'content-type': 'application/json' }
        });
        if (promoRes.ok) {
          const promoData = await promoRes.json();
          const achPromo = promoData.data?.find(p => p.name === 'ACH');
          if (achPromo) promoId = achPromo.id;
        }
      }

      let offersUrl = `${config.baseUrl}/offers`;
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', categoryId);
      if (promoId) params.append('promotionIds[]', promoId);
      if (params.toString()) offersUrl += `?${params.toString()}`;

      const offersRes = await fetch(offersUrl, {
        headers: { 'authorization': config.authHeader, 'content-type': 'application/json' }
      });

      if (!offersRes.ok) {
        const errorText = await offersRes.text();
        return NextResponse.json({ success: false, error: `Failed to fetch GoodLeap offers: ${errorText}` }, { status: 400 });
      }

      const offersJson = await offersRes.json();
      const offers = offersJson.data || [];

      // Fetch payment calculations for all retrieved offers
      let payments = [];
      if (offers.length > 0 && amount) {
        let paymentsUrl = `${config.baseUrl}/payments?amount=${amount}`;
        offers.forEach((off, idx) => {
          paymentsUrl += `&offerIds[${idx}]=${off.offerId || off.id}`;
        });
        if (promoId) paymentsUrl += `&promotionIds[]=${promoId}`;

        const payRes = await fetch(paymentsUrl, {
          headers: { 'authorization': config.authHeader, 'content-type': 'application/json' }
        });
        if (payRes.ok) {
          payments = await payRes.json();
        }
      }

      return NextResponse.json({
        success: true,
        offers,
        payments,
        categoryId,
        promotionId: promoId
      });
    }

    // 2. GET DISCLOSURES
    if (action === 'getDisclosures') {
      const discRes = await fetch(`${config.baseUrl}/disclosures?current=true`, {
        headers: { 'authorization': config.authHeader, 'content-type': 'application/json' }
      });
      if (!discRes.ok) {
        const text = await discRes.text();
        return NextResponse.json({ success: false, error: `Disclosures error: ${text}` }, { status: 400 });
      }
      const discData = await discRes.json();
      return NextResponse.json({ success: true, data: discData });
    }

    // 3. SUBMIT LOAN
    if (action === 'submitLoan') {
      const { applicationData } = body;

      // Ensure disclosure token is included
      if (!applicationData.disclosureToken) {
        const discRes = await fetch(`${config.baseUrl}/disclosures?current=true`, {
          headers: { 'authorization': config.authHeader, 'content-type': 'application/json' }
        });
        if (discRes.ok) {
          const discJson = await discRes.json();
          if (discJson.data && discJson.data[0]) {
            applicationData.disclosureToken = discJson.data[0].token;
          }
        }
      }

      const submitRes = await fetch(`${config.baseUrl}/loans`, {
        method: 'POST',
        headers: {
          'authorization': config.authHeader,
          'content-type': 'application/json',
          'cache-control': 'no-cache'
        },
        body: JSON.stringify(applicationData)
      });

      const responseText = await submitRes.text();
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = { raw: responseText };
      }

      if (!submitRes.ok) {
        return NextResponse.json({
          success: false,
          error: responseJson.message || responseJson.raw || `HTTP ${submitRes.status}`,
          details: responseJson
        }, { status: submitRes.status || 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'GoodLeap loan application submitted successfully!',
        loan: responseJson
      });
    }

    // 4. CLEAR STIPULATIONS / CONTRACT REVIEW (Toolbox Sandbox Action)
    if (action === 'clearToolbox') {
      const { loanId, what } = body;
      const toolboxUrl = `https://sandbox01-api.goodleap.com/toolbox/rest/v2/loans/${loanId}/clear`;
      const toolboxRes = await fetch(toolboxUrl, {
        method: 'POST',
        headers: {
          'authorization': config.authHeader,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ what: what || 'STIPULATIONS' })
      });
      const resText = await toolboxRes.text();
      return NextResponse.json({ success: toolboxRes.ok, response: resText });
    }

    // 5. SHAREAPP LINK GENERATION (POST /v2/loans-share)
    if (action === 'createShareLink') {
      const { shareData } = body;
      const shareRes = await fetch(`${config.baseUrl}/loans-share`, {
        method: 'POST',
        headers: {
          'authorization': config.authHeader,
          'content-type': 'application/json',
          'cache-control': 'no-cache'
        },
        body: JSON.stringify(shareData)
      });
      const text = await shareRes.text();
      let resJson;
      try {
        resJson = JSON.parse(text);
      } catch (e) {
        resJson = { raw: text };
      }
      if (!shareRes.ok) {
        return NextResponse.json({
          success: false,
          error: resJson.message || resJson.raw || `HTTP ${shareRes.status}`
        }, { status: shareRes.status || 400 });
      }
      return NextResponse.json({
        success: true,
        data: resJson
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action requested' }, { status: 400 });

  } catch (err) {
    console.error('POST /api/goodleap error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
