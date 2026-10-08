import QRCode from 'qrcode';
import type { ProduceTransactionHandover, HandoverQualityCheck, GhanaRegion } from '../types';
import { supabase } from './supabase';
import { logUserActivity } from './activityLogger';

const HANDOVER_STORAGE_KEY = 'agro_produce_handovers_v1';

// Initial Ghanaian farm produce handover records
const SEED_HANDOVERS: ProduceTransactionHandover[] = [
  {
    id: 'HND-2026-7782',
    order_id: 'ORD-7782',
    verification_code: 'GH-7782-X9',
    buyer_id: 'usr-buyer-01',
    buyer_name: 'Kwame Mensah',
    buyer_phone: '+233 24 123 4567',
    seller_id: 'usr-farmer-01',
    seller_name: 'Ejura Organic Grain Farms',
    seller_phone: '+233 20 555 1234',
    item_name: 'Certified Maize Seeds (2kg)',
    quantity: '5 bags (50kg total)',
    unit: 'bags',
    total_amount: 430.00,
    currency: 'GHS',
    payment_method: 'Mobile Money (MTN/Telecel/AirtelTigo)',
    payment_status: 'escrowed',
    fulfillment_status: 'awaiting_handover',
    handover_checkpoint: 'Ejura Warehouse Ag-Hub, Depot Gate 2',
    region: 'Ashanti',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'HND-2026-7781',
    order_id: 'ORD-7781',
    verification_code: 'GH-7781-B4',
    buyer_id: 'usr-buyer-02',
    buyer_name: 'Ama Serwaa',
    buyer_phone: '+233 27 987 6543',
    seller_id: 'usr-farmer-02',
    seller_name: 'Techiman Produce Cooperative',
    seller_phone: '+233 24 444 8989',
    item_name: 'Heavy-Duty Cutlass & Tooling Set',
    quantity: '1 set',
    unit: 'set',
    total_amount: 80.00,
    currency: 'GHS',
    payment_method: 'Digital Escrow',
    payment_status: 'escrowed',
    fulfillment_status: 'in_transit',
    handover_checkpoint: 'Techiman Wholesale Market, Stall 44',
    region: 'Bono / Techiman',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'HND-2026-7750',
    order_id: 'ORD-7750',
    verification_code: 'GH-7750-V2',
    buyer_id: 'usr-buyer-01',
    buyer_name: 'Kwame Mensah',
    buyer_phone: '+233 24 123 4567',
    seller_id: 'usr-farmer-03',
    seller_name: 'Navrongo Agrochemicals & Irrigation',
    seller_phone: '+233 50 111 2233',
    item_name: 'Knapsack Sprayer (16L Pressure)',
    quantity: '1 unit',
    unit: 'unit',
    total_amount: 250.00,
    currency: 'GHS',
    payment_method: 'Mobile Money (MTN/Telecel/AirtelTigo)',
    payment_status: 'released',
    fulfillment_status: 'verified_and_delivered',
    handover_checkpoint: 'Tamale Central Dispatch Hub',
    region: 'Northern / Tamale',
    verified_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    verified_by_role: 'buyer',
    handover_notes: 'Equipment tested on site, pressure seals confirmed intact.',
    quality_check: {
      produce_condition: 'Fresh / Grade A',
      quantity_verified: true,
      packaging_intact: true,
      notes: 'Hardware sealed in manufacturer box.'
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

export interface QrHandoverPayload {
  protocol: 'AGRO_HANDOVER_V1';
  handoverId: string;
  orderId: string;
  code: string;
  item: string;
  quantity: string | number;
  totalGhs: number;
  buyerName: string;
  buyerPhone?: string;
  sellerName: string;
  sellerPhone?: string;
  checkpoint: string;
  region: string;
  paymentStatus: string;
  issuedAt: number;
  checksum: string;
}

/**
 * Generates an 8-character verification PIN for agricultural handover
 */
export function generateVerificationCode(orderId: string): string {
  const cleanId = orderId.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase() || '7782';
  const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `GH-${cleanId}-${randomSuffix}`;
}

/**
 * Creates a checksum for tamper-evidence
 */
function createPayloadChecksum(handoverId: string, orderId: string, total: number): string {
  const raw = `${handoverId}:${orderId}:${total}:GH_AGRO_SECURE_SALT`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

/**
 * Builds the standard JSON string encoded inside the QR code
 */
export function buildHandoverPayloadString(handover: ProduceTransactionHandover): string {
  const payload: QrHandoverPayload = {
    protocol: 'AGRO_HANDOVER_V1',
    handoverId: handover.id,
    orderId: handover.order_id,
    code: handover.verification_code,
    item: handover.item_name,
    quantity: handover.quantity,
    totalGhs: handover.total_amount,
    buyerName: handover.buyer_name,
    buyerPhone: handover.buyer_phone,
    sellerName: handover.seller_name,
    sellerPhone: handover.seller_phone,
    checkpoint: handover.handover_checkpoint,
    region: String(handover.region || 'All Regions'),
    paymentStatus: handover.payment_status,
    issuedAt: Date.now(),
    checksum: createPayloadChecksum(handover.id, handover.order_id, handover.total_amount)
  };

  return JSON.stringify(payload);
}

/**
 * Generates a high-contrast QR Code Data URL with Ghanaian Agro Styling
 */
export async function generateHandoverQrDataUrl(
  handover: ProduceTransactionHandover,
  options?: { size?: number }
): Promise<string> {
  const payloadString = buildHandoverPayloadString(handover);
  const size = options?.size || 400;

  return QRCode.toDataURL(payloadString, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'H', // High error correction to allow scanning scratched/wet screens or paper slips
    color: {
      dark: '#064e3b', // Deep emerald green (matching Ghanaian agricultural theme)
      light: '#ffffff'
    }
  });
}

/**
 * Parses and verifies raw scanned QR data or verification code string
 */
export function parseScannedQrData(rawInput: string): {
  isValid: boolean;
  code?: string;
  orderId?: string;
  handoverId?: string;
  payload?: QrHandoverPayload;
  error?: string;
} {
  const trimmed = rawInput.trim();

  // Case 1: Raw Verification PIN entered directly (e.g., GH-7782-X9)
  const pinPattern = /^(GH-)?[A-Z0-9]{4,6}-[A-Z0-9]{2,4}$/i;
  if (pinPattern.test(trimmed)) {
    const formatted = trimmed.toUpperCase().startsWith('GH-') ? trimmed.toUpperCase() : `GH-${trimmed.toUpperCase()}`;
    return {
      isValid: true,
      code: formatted
    };
  }

  // Case 2: Deep Link or URL containing code or order
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const codeParam = url.searchParams.get('handover') || url.searchParams.get('code');
      const orderParam = url.searchParams.get('order') || url.searchParams.get('orderId');
      if (codeParam) {
        return { isValid: true, code: codeParam.toUpperCase(), orderId: orderParam || undefined };
      }
    } catch {
      // Continue to JSON check
    }
  }

  // Case 3: Standard JSON Payload
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.protocol === 'AGRO_HANDOVER_V1' && parsed.code) {
      return {
        isValid: true,
        code: parsed.code,
        orderId: parsed.orderId,
        handoverId: parsed.handoverId,
        payload: parsed
      };
    }
  } catch {
    // Not JSON
  }

  // Fallback: Check if it contains an order ID e.g. ORD-7782
  const ordMatch = trimmed.match(/ORD-\d{3,6}/i);
  if (ordMatch) {
    return {
      isValid: true,
      orderId: ordMatch[0].toUpperCase()
    };
  }

  return {
    isValid: false,
    error: 'Unrecognized QR code format. Please ensure this is a Ghana Farmers Market℠ transaction QR.'
  };
}

/**
 * Retrieves all stored produce handovers (Supabase with localStorage fallback)
 */
export async function getProduceHandovers(): Promise<ProduceTransactionHandover[]> {
  try {
    const { data, error } = await supabase
      .from('produce_handovers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as ProduceTransactionHandover[];
    }
  } catch (err) {
    console.warn('Could not fetch handovers from Supabase, checking local storage:', err);
  }

  // Local storage fallback
  try {
    const stored = localStorage.getItem(HANDOVER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Initialize seed data
  try {
    localStorage.setItem(HANDOVER_STORAGE_KEY, JSON.stringify(SEED_HANDOVERS));
  } catch {
    // ignore
  }
  return SEED_HANDOVERS;
}

/**
 * Saves or updates handovers in local storage cache
 */
function cacheHandoversLocally(handovers: ProduceTransactionHandover[]) {
  try {
    localStorage.setItem(HANDOVER_STORAGE_KEY, JSON.stringify(handovers));
  } catch (e) {
    console.warn('Could not cache handovers locally:', e);
  }
}

/**
 * Gets or creates a handover record for a specific order
 */
export async function getOrCreateHandoverForOrder(order: {
  id: string;
  items: string[];
  total: number;
  status: string;
  date?: string;
  seller_id?: string;
  buyer_id?: string;
  buyer_name?: string;
  item_name?: string;
}): Promise<ProduceTransactionHandover> {
  const allHandovers = await getProduceHandovers();
  const existing = allHandovers.find(h => h.order_id === order.id);
  if (existing) return existing;

  // Create new handover record
  const newHandover: ProduceTransactionHandover = {
    id: `HND-${new Date().getFullYear()}-${order.id.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000)}`,
    order_id: order.id,
    verification_code: generateVerificationCode(order.id),
    buyer_id: order.buyer_id || 'usr-buyer-current',
    buyer_name: order.buyer_name || 'Kwame Mensah',
    buyer_phone: '+233 24 123 4567',
    seller_id: order.seller_id || 'usr-farmer-01',
    seller_name: 'Ejura Farms Agribusiness',
    seller_phone: '+233 20 555 1234',
    item_name: order.item_name || (order.items && order.items[0]) || 'Certified Agricultural Produce',
    quantity: order.items && order.items.length > 1 ? `${order.items.length} items` : '1 standard consignment',
    unit: 'consignment',
    total_amount: Number(order.total) || 100.0,
    currency: 'GHS',
    payment_method: 'Mobile Money (MTN/Telecel/AirtelTigo)',
    payment_status: order.status === 'Delivered' ? 'released' : 'escrowed',
    fulfillment_status: order.status === 'Delivered' ? 'verified_and_delivered' : 'awaiting_handover',
    handover_checkpoint: 'Regional Farming Depot & Checkpoint Gate 1',
    region: 'Ashanti',
    created_at: new Date().toISOString()
  };

  const updated = [newHandover, ...allHandovers];
  cacheHandoversLocally(updated);

  // Attempt sync to Supabase
  try {
    await supabase.from('produce_handovers').insert([newHandover]);
  } catch (err) {
    console.warn('Could not sync new handover to Supabase table:', err);
  }

  return newHandover;
}

/**
 * Verifies handover, marks fulfillment complete, releases escrow payment, and records audit trail
 */
export async function verifyAndCompleteHandover(params: {
  handoverId: string;
  verificationCode: string;
  verifierUserId?: string;
  verifierRole?: 'farmer' | 'buyer' | 'admin' | 'logistics_agent';
  verifierName?: string;
  qualityCheck: HandoverQualityCheck;
  notes?: string;
}): Promise<{
  success: boolean;
  message: string;
  handover?: ProduceTransactionHandover;
}> {
  const handovers = await getProduceHandovers();
  const index = handovers.findIndex(
    h => h.id === params.handoverId || h.verification_code.toUpperCase() === params.verificationCode.toUpperCase()
  );

  if (index === -1) {
    return {
      success: false,
      message: `No transaction found matching code "${params.verificationCode}".`
    };
  }

  const existing = handovers[index];

  if (existing.fulfillment_status === 'verified_and_delivered') {
    return {
      success: false,
      message: `This order (${existing.order_id}) has already been verified and delivered on ${new Date(existing.verified_at || '').toLocaleString()}.`,
      handover: existing
    };
  }

  const verifiedAt = new Date().toISOString();
  const updatedHandover: ProduceTransactionHandover = {
    ...existing,
    fulfillment_status: 'verified_and_delivered',
    payment_status: 'released', // Escrow released to farmer upon scan verification
    verified_at: verifiedAt,
    verified_by_user_id: params.verifierUserId || 'usr-verified',
    verified_by_role: params.verifierRole || 'buyer',
    handover_notes: params.notes || 'Handover and produce inspection successfully verified via QR verification.',
    quality_check: params.qualityCheck
  };

  handovers[index] = updatedHandover;
  cacheHandoversLocally(handovers);

  // Sync to Supabase produce_handovers and orders table
  try {
    await supabase
      .from('produce_handovers')
      .update({
        fulfillment_status: 'verified_and_delivered',
        payment_status: 'released',
        verified_at: verifiedAt,
        verified_by_user_id: params.verifierUserId,
        verified_by_role: params.verifierRole,
        handover_notes: params.notes,
        quality_check: params.qualityCheck
      })
      .eq('id', existing.id);

    // Update order status in orders table
    await supabase
      .from('orders')
      .update({
        status: 'Delivered',
        payment_status: 'released'
      })
      .eq('id', existing.order_id);
  } catch (err) {
    console.warn('Could not sync verification to Supabase backend:', err);
  }

  // Record in User Activity Log
  try {
    await logUserActivity({
      user_id: params.verifierUserId || 'usr-agent',
      user_name: params.verifierName || 'Authorized Verifier',
      user_email: 'verifier@agrosourcing.gh',
      user_type: params.verifierRole || 'farmer',
      action: 'QR_HANDOVER_VERIFIED',
      details: `Verified order ${existing.order_id} (${existing.item_name}) - GHS ${existing.total_amount.toFixed(2)} escrow payment released to farmer.`,
      region: existing.region,
      metadata: {
        order_id: existing.order_id,
        verification_code: existing.verification_code,
        produce_condition: params.qualityCheck.produce_condition,
        amount_ghs: existing.total_amount
      }
    });
  } catch (err) {
    console.warn('Could not record activity log:', err);
  }

  // Play pleasant positive confirmation chime
  playHandoverSound(true);

  return {
    success: true,
    message: `Order ${existing.order_id} verified! GHS ${existing.total_amount.toFixed(2)} payment released to seller.`,
    handover: updatedHandover
  };
}

/**
 * Web Audio API synthesizer for scan / verification sound feedback
 */
export function playHandoverSound(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (success) {
      // Ascending pleasant major triad (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
    } else {
      // Warning low tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // AudioContext blocked by browser policy
  }
}
