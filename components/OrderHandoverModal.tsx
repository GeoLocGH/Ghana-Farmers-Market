import React, { useState, useEffect, useRef } from 'react';
import type { ProduceTransactionHandover, HandoverQualityCheck, User } from '../types';
import { 
  generateHandoverQrDataUrl, 
  getOrCreateHandoverForOrder,
  getProduceHandovers,
  verifyAndCompleteHandover,
  parseScannedQrData,
  buildHandoverPayloadString
} from '../services/qrHandoverService';
import HandoverQrScanner from './HandoverQrScanner';
import Button from './common/Button';
import { 
  XIcon, 
  QrCodeIcon, 
  ScanLineIcon, 
  CheckCircleIcon, 
  ShieldCheckIcon, 
  PrinterIcon, 
  DownloadIcon, 
  CopyIcon, 
  CheckIcon, 
  TruckIcon, 
  DatabaseIcon, 
  ClipboardCheckIcon,
  TagIcon,
  PhoneIcon,
  UserCircleIcon,
  RefreshCwIcon
} from './common/icons';

interface OrderHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: {
    id: string;
    items: string[];
    total: number;
    status: string;
    date?: string;
    seller_id?: string;
    buyer_id?: string;
    buyer_name?: string;
    item_name?: string;
  } | null;
  user?: User | null;
  onHandoverCompleted?: (handover: ProduceTransactionHandover) => void;
  initialTab?: 'generate' | 'scan' | 'history' | 'sql';
}

export const OrderHandoverModal: React.FC<OrderHandoverModalProps> = ({
  isOpen,
  onClose,
  order,
  user,
  onHandoverCompleted,
  initialTab = 'generate'
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan' | 'history' | 'sql'>(initialTab);
  const [currentHandover, setCurrentHandover] = useState<ProduceTransactionHandover | null>(null);
  const [allHandovers, setAllHandovers] = useState<ProduceTransactionHandover[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Verification & Inspection State
  const [scannedHandoverToVerify, setScannedHandoverToVerify] = useState<ProduceTransactionHandover | null>(null);
  const [inspectionCondition, setInspectionCondition] = useState<'Fresh / Grade A' | 'Good / Grade B' | 'Fair / Acceptable' | 'Damaged / Rejected'>('Fresh / Grade A');
  const [quantityVerified, setQuantityVerified] = useState<boolean>(true);
  const [packagingIntact, setPackagingIntact] = useState<boolean>(true);
  const [inspectionNotes, setInspectionNotes] = useState<string>('');
  const [verificationLoading, setVerificationLoading] = useState<boolean>(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const printSlipRef = useRef<HTMLDivElement>(null);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setVerificationFeedback(null);
      setScannedHandoverToVerify(null);
    }
  }, [isOpen, initialTab]);

  // Load or generate handover for the provided order
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const list = await getProduceHandovers();
        if (isMounted) setAllHandovers(list);

        if (order) {
          const handover = await getOrCreateHandoverForOrder(order);
          if (isMounted) {
            setCurrentHandover(handover);
            const qrUrl = await generateHandoverQrDataUrl(handover, { size: 400 });
            setQrDataUrl(qrUrl);
          }
        } else if (list.length > 0) {
          // If no specific order passed, default to first available
          if (isMounted) {
            setCurrentHandover(list[0]);
            const qrUrl = await generateHandoverQrDataUrl(list[0], { size: 400 });
            setQrDataUrl(qrUrl);
          }
        }
      } catch (err) {
        console.error('Error loading handover data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, order]);

  if (!isOpen) return null;

  // Handle QR scan detection
  const handleQrScanned = async (rawDecodedText: string) => {
    const parsed = parseScannedQrData(rawDecodedText);
    const handoversList = await getProduceHandovers();

    let target: ProduceTransactionHandover | undefined;

    if (parsed.code) {
      target = handoversList.find(h => h.verification_code.toUpperCase() === parsed.code?.toUpperCase());
    }
    if (!target && parsed.orderId) {
      target = handoversList.find(h => h.order_id.toUpperCase() === parsed.orderId?.toUpperCase());
    }
    if (!target && parsed.handoverId) {
      target = handoversList.find(h => h.id === parsed.handoverId);
    }

    if (target) {
      setScannedHandoverToVerify(target);
      setVerificationFeedback(null);
      setInspectionCondition('Fresh / Grade A');
      setQuantityVerified(true);
      setPackagingIntact(true);
      setInspectionNotes('');
    } else {
      setVerificationFeedback({
        success: false,
        message: `No active transaction found for scanned code "${rawDecodedText}". Please verify the code or try again.`
      });
    }
  };

  // Confirm produce inspection and release payment
  const handleConfirmFulfillment = async () => {
    if (!scannedHandoverToVerify) return;

    setVerificationLoading(true);
    try {
      const qualityCheck: HandoverQualityCheck = {
        produce_condition: inspectionCondition,
        quantity_verified: quantityVerified,
        packaging_intact: packagingIntact,
        notes: inspectionNotes
      };

      const result = await verifyAndCompleteHandover({
        handoverId: scannedHandoverToVerify.id,
        verificationCode: scannedHandoverToVerify.verification_code,
        verifierUserId: user?.uid,
        verifierRole: user?.type as any || 'buyer',
        verifierName: user?.name || 'Verified Buyer',
        qualityCheck,
        notes: inspectionNotes
      });

      setVerificationFeedback({
        success: result.success,
        message: result.message
      });

      if (result.success && result.handover) {
        setScannedHandoverToVerify(result.handover);
        // Refresh all handovers
        const updatedList = await getProduceHandovers();
        setAllHandovers(updatedList);
        if (currentHandover?.id === result.handover.id) {
          setCurrentHandover(result.handover);
        }
        if (onHandoverCompleted) {
          onHandoverCompleted(result.handover);
        }
      }
    } catch (err: any) {
      setVerificationFeedback({
        success: false,
        message: err.message || 'An error occurred during verification.'
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!currentHandover) return;
    navigator.clipboard.writeText(currentHandover.verification_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleDownloadQrOnly = () => {
    if (!qrDataUrl || !currentHandover) return;
    const link = document.createElement('a');
    link.download = `QR-HANDOVER-${currentHandover.order_id}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const copySqlCode = () => {
    navigator.clipboard.writeText(SUPABASE_HANDOVER_SQL_QUERY);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-handover-slip, #printable-handover-slip * {
            visibility: visible;
          }
          #printable-handover-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-900 animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-green-800 via-emerald-800 to-green-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <QrCodeIcon className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
                  Marketplace QR Handover & Payment Verification
                </h3>
                <span className="bg-green-700/80 text-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/50">
                  Escrow Secure
                </span>
              </div>
              <p className="text-xs text-green-200">
                Verifies physical produce delivery, inspects quality, and releases Mobile Money/Escrow payment
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs sm:text-sm font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('generate')}
            className={`py-3 px-4 sm:px-6 flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'generate'
                ? 'border-green-700 text-green-900 bg-white font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <QrCodeIcon className="w-4 h-4 text-green-700" />
            <span>1. Present QR Pass</span>
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`py-3 px-4 sm:px-6 flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'scan'
                ? 'border-green-700 text-green-900 bg-white font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ScanLineIcon className="w-4 h-4 text-green-700" />
            <span>2. Scan & Fulfill Handover</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 sm:px-6 flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-green-700 text-green-900 bg-white font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardCheckIcon className="w-4 h-4 text-green-700" />
            <span>Handover Log ({allHandovers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 sm:px-6 flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'sql'
                ? 'border-green-700 text-green-900 bg-white font-black'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <DatabaseIcon className="w-4 h-4 text-green-700" />
            <span>Supabase Backend SQL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: PRESENT QR PASS */}
          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: QR Pass and Verification Code (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center text-center space-y-4">
                <div className="bg-white border-2 border-green-800 rounded-2xl p-4 shadow-md w-full max-w-xs flex flex-col items-center">
                  <div className="flex items-center justify-between w-full pb-2 mb-2 border-b border-gray-200">
                    <span className="text-[10px] font-extrabold text-green-900 uppercase tracking-wider flex items-center gap-1.5">
                      <img
                        src="/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg"
                        alt="Ghana Farmers Market℠"
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-contain"
                      />
                      <span>Ghana Farmers Market℠</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-900 border border-green-300">
                      Produce Pass
                    </span>
                  </div>

                  {/* High Resolution Scannable QR Code */}
                  <div className="p-2 bg-green-50 rounded-xl border border-green-200 my-1 shadow-inner">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Handover for ${currentHandover?.order_id}`}
                        className="w-52 h-52 rounded-lg bg-white p-1 border border-green-400 shadow-2xs"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center text-gray-400 text-xs">
                        Generating QR Pass...
                      </div>
                    )}
                  </div>

                  {/* Verification PIN Code Box */}
                  <div className="w-full mt-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">
                      Verification PIN
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-lg font-black text-green-900 tracking-wider">
                        {currentHandover?.verification_code || 'GH-7782-X9'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1 text-gray-500 hover:text-green-800 rounded hover:bg-gray-200 transition-colors"
                        title="Copy PIN"
                      >
                        {copiedCode ? <CheckIcon className="w-4 h-4 text-green-700" /> : <CopyIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-3 w-full">
                    {currentHandover?.fulfillment_status === 'verified_and_delivered' ? (
                      <div className="py-1.5 px-3 bg-green-100 text-green-900 text-xs font-bold rounded-lg border border-green-300 flex items-center justify-center gap-1.5">
                        <CheckCircleIcon className="w-4 h-4 text-green-700" />
                        <span>Handover Fulfilled & Paid</span>
                      </div>
                    ) : (
                      <div className="py-1.5 px-3 bg-amber-50 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 flex items-center justify-center gap-1.5">
                        <ShieldCheckIcon className="w-4 h-4 text-amber-700" />
                        <span>Escrow Locked (Scan to Release)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Print & Download Actions */}
                <div className="flex gap-2 w-full max-w-xs">
                  <Button
                    onClick={handlePrintSlip}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white text-xs py-2.5 font-bold shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>Print Slip</span>
                  </Button>
                  <button
                    type="button"
                    onClick={handleDownloadQrOnly}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors shadow-2xs"
                  >
                    <DownloadIcon className="w-4 h-4 text-gray-600" />
                    <span>Save QR</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Transaction Fulfillment Sheet & Breakdown (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <div>
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Order Consignment
                      </span>
                      <h4 className="text-xl font-black text-gray-900">
                        {currentHandover?.order_id || 'ORD-7782'}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-gray-500">Escrow Value</span>
                      <p className="text-xl font-extrabold text-green-700">
                        GHS {Number(currentHandover?.total_amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Consignment Items */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Commodity Details
                    </span>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{currentHandover?.item_name}</p>
                        <p className="text-xs text-gray-500">Qty: {currentHandover?.quantity} • Region: {currentHandover?.region}</p>
                      </div>
                      <span className="text-xs font-bold bg-green-50 text-green-800 px-2 py-1 rounded border border-green-200">
                        Certified
                      </span>
                    </div>
                  </div>

                  {/* Parties Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Farmer / Producer
                      </span>
                      <p className="font-bold text-gray-900">{currentHandover?.seller_name}</p>
                      <p className="text-gray-500 flex items-center gap-1">
                        <PhoneIcon className="w-3 h-3 text-gray-400" />
                        {currentHandover?.seller_phone || '+233 20 555 1234'}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Buyer / Consignee
                      </span>
                      <p className="font-bold text-gray-900">{currentHandover?.buyer_name}</p>
                      <p className="text-gray-500 flex items-center gap-1">
                        <PhoneIcon className="w-3 h-3 text-gray-400" />
                        {currentHandover?.buyer_phone || '+233 24 123 4567'}
                      </p>
                    </div>
                  </div>

                  {/* Checkpoint & Instructions */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                      <TruckIcon className="w-4 h-4 text-emerald-700" />
                      <span>Handover & Pickup Checkpoint</span>
                    </div>
                    <p className="text-gray-700 font-medium">
                      {currentHandover?.handover_checkpoint}
                    </p>
                    <p className="text-[11px] text-gray-500 italic pt-1">
                      The receiving party must scan this QR pass upon inspecting the physical produce. 
                      Scanning confirms receipt and automatically unlocks the payment escrow to the farmer.
                    </p>
                  </div>

                  {/* Quick Action to switch to Scanner */}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">
                      Are you the farmer or receiving buyer?
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('scan')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-green-800 hover:text-green-950 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg border border-green-300 transition-colors shadow-2xs"
                    >
                      <ScanLineIcon className="w-3.5 h-3.5" />
                      <span>Open QR Scanner</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCAN & VERIFY HANDOVER */}
          {activeTab === 'scan' && (
            <div className="space-y-6">
              {!scannedHandoverToVerify ? (
                <div>
                  <HandoverQrScanner
                    onScan={handleQrScanned}
                    title="Scan Produce Handover QR Pass"
                    subtitle="Point your camera at the buyer's QR screen or printed consignment note"
                  />
                  {verificationFeedback && !verificationFeedback.success && (
                    <div role="alert" className="error-notification mt-4 max-w-md mx-auto p-3.5 bg-red-100 border border-red-400 text-black font-semibold rounded-xl text-xs text-center">
                      {verificationFeedback.message}
                    </div>
                  )}
                </div>
              ) : (
                /* Produce Quality Inspection & Fulfillment Confirmation Card */
                <div className="max-w-2xl mx-auto bg-gray-50 border-2 border-green-700 rounded-2xl p-5 sm:p-7 shadow-lg space-y-5 animate-fade-in">
                  <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-green-300">
                          Transaction Verified
                        </span>
                        <span className="font-mono text-xs text-gray-500 font-bold">
                          {scannedHandoverToVerify.verification_code}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mt-1">
                        {scannedHandoverToVerify.item_name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Order ID: <strong className="text-gray-800">{scannedHandoverToVerify.order_id}</strong> • Checkpoint: {scannedHandoverToVerify.handover_checkpoint}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Escrow Payout</span>
                      <p className="text-2xl font-black text-green-700">
                        GHS {scannedHandoverToVerify.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Summary of Buyer and Farmer */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Seller / Farmer</span>
                      <p className="font-bold text-gray-900">{scannedHandoverToVerify.seller_name}</p>
                      <p className="text-gray-500">{scannedHandoverToVerify.seller_phone}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Buyer / Receiver</span>
                      <p className="font-bold text-gray-900">{scannedHandoverToVerify.buyer_name}</p>
                      <p className="text-gray-500">{scannedHandoverToVerify.buyer_phone}</p>
                    </div>
                  </div>

                  {/* Quality Inspection Checklist */}
                  {scannedHandoverToVerify.fulfillment_status === 'verified_and_delivered' ? (
                    <div className="p-4 bg-green-50 border border-green-300 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-green-900 font-bold text-sm">
                        <CheckCircleIcon className="w-5 h-5 text-green-700" />
                        <span>Fulfillment & Payment Completed!</span>
                      </div>
                      <p className="text-gray-700">
                        Verified on: <strong>{new Date(scannedHandoverToVerify.verified_at || '').toLocaleString()}</strong>
                      </p>
                      <p className="text-gray-700">
                        Produce Condition: <strong>{scannedHandoverToVerify.quality_check?.produce_condition || 'Grade A'}</strong>
                      </p>
                      {scannedHandoverToVerify.handover_notes && (
                        <p className="text-gray-600 italic">
                          "{scannedHandoverToVerify.handover_notes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ClipboardCheckIcon className="w-4 h-4 text-green-700" />
                        Physical Inspection & Verification Check
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold text-black mb-1">
                          Produce Quality Grade
                        </label>
                        <select
                          value={inspectionCondition}
                          onChange={(e) => setInspectionCondition(e.target.value as any)}
                          className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white text-black font-medium"
                        >
                          <option value="Fresh / Grade A" className="text-black bg-white">Fresh / Grade A (Premium Produce)</option>
                          <option value="Good / Grade B" className="text-black bg-white">Good / Grade B (Standard Commercial)</option>
                          <option value="Fair / Acceptable" className="text-black bg-white">Fair / Acceptable (Minor Blemishes)</option>
                          <option value="Damaged / Rejected" className="text-black bg-white">Damaged / Rejected (Do not accept)</option>
                        </select>
                      </div>

                      <div className="space-y-2 pt-1 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={quantityVerified}
                            onChange={(e) => setQuantityVerified(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="font-semibold text-black">
                            Quantity and weight match consignment ({scannedHandoverToVerify.quantity})
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={packagingIntact}
                            onChange={(e) => setPackagingIntact(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="font-semibold text-black">
                            Crates, sacks, or packaging seals are secure and undamaged
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-black mb-1">
                          Inspection Remarks / Dispatch Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={inspectionNotes}
                          onChange={(e) => setInspectionNotes(e.target.value)}
                          placeholder="e.g. Inspected at Techiman depot, 5 bags weighed at 50kg each, moisture optimal."
                          className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white text-black"
                        />
                      </div>
                    </div>
                  )}

                  {/* Feedback Message */}
                  {verificationFeedback && (
                    <div role="alert" className={`p-3 rounded-xl text-xs font-semibold text-black ${
                      verificationFeedback.success 
                        ? 'bg-green-100 border border-green-400' 
                        : 'error-notification bg-red-100 border border-red-400'
                    }`}>
                      {verificationFeedback.message}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setScannedHandoverToVerify(null)}
                      className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors"
                    >
                      Scan Another
                    </button>

                    {scannedHandoverToVerify.fulfillment_status !== 'verified_and_delivered' && (
                      <Button
                        onClick={handleConfirmFulfillment}
                        isLoading={verificationLoading}
                        className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Confirm Handover & Release GHS {scannedHandoverToVerify.total_amount.toFixed(2)}</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HANDOVER HISTORY & AUDIT LOG */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div>
                  <h4 className="font-bold text-base text-gray-900">Marketplace Handover Records</h4>
                  <p className="text-xs text-gray-500">Audit trail of verified farm produce handovers and escrow releases</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const list = await getProduceHandovers();
                    setAllHandovers(list);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-green-800 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200 hover:bg-green-100"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-3">
                {allHandovers.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-gray-900">{item.order_id}</span>
                        <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-gray-300 text-gray-700">
                          {item.verification_code}
                        </span>
                        {item.fulfillment_status === 'verified_and_delivered' ? (
                          <span className="text-[11px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-300 flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-green-700" />
                            Fulfilled & Paid
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                            Awaiting Handover
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-800">
                        {item.item_name} ({item.quantity}) • <span className="text-green-800 font-bold">GHS {item.total_amount.toFixed(2)}</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Seller: {item.seller_name} • Buyer: {item.buyer_name} • Checkpoint: {item.handover_checkpoint}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          setCurrentHandover(item);
                          const url = await generateHandoverQrDataUrl(item, { size: 400 });
                          setQrDataUrl(url);
                          setActiveTab('generate');
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs flex items-center gap-1"
                      >
                        <QrCodeIcon className="w-3.5 h-3.5 text-green-700" />
                        <span>View Pass</span>
                      </button>

                      {item.fulfillment_status !== 'verified_and_delivered' && (
                        <button
                          type="button"
                          onClick={() => {
                            setScannedHandoverToVerify(item);
                            setActiveTab('scan');
                          }}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white shadow-2xs flex items-center gap-1"
                        >
                          <ScanLineIcon className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SUPABASE BACKEND SQL QUERY */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div>
                  <h4 className="font-bold text-base text-gray-900">
                    Supabase PostgreSQL Handover & Escrow Verification Schema
                  </h4>
                  <p className="text-xs text-gray-500">
                    Tables, Row Level Security, RPC stored procedures, Realtime broadcast, and automated wallet balance triggers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copySqlCode}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-green-700 hover:bg-green-800 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-green-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4" />
                      <span>Copy SQL Query</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-gray-900 text-green-300 rounded-xl text-xs font-mono overflow-x-auto max-h-[50vh] leading-relaxed border border-gray-800">
                  {SUPABASE_HANDOVER_SQL_QUERY}
                </pre>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900">
                <strong>Execution Instructions:</strong>
                <ol className="list-decimal pl-4 mt-1 space-y-1">
                  <li>Navigate to your <strong>Supabase Dashboard &gt; SQL Editor</strong>.</li>
                  <li>Paste the SQL script above and click <strong>Run</strong>.</li>
                  <li>This provisions the <code>produce_handovers</code> table, automated wallet triggers, Realtime channels, and verification stored procedures.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Ghana Produce Marketplace Fulfillment Protocol v3.1</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-bold px-3 py-1 rounded-md"
          >
            Done
          </button>
        </div>
      </div>

      {/* Hidden Printable Consignment & Handover Slip */}
      <div id="printable-handover-slip" ref={printSlipRef} className="hidden">
        {currentHandover && (
          <div className="p-6 border-2 border-green-800 rounded-xl text-black font-sans max-w-md mx-auto">
            <div className="text-center pb-3 border-b-2 border-green-800 mb-3 flex flex-col items-center">
              <img
                src="/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg"
                alt="Ghana Farmers Market℠"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-contain mb-1"
              />
              <h2 className="text-lg font-black uppercase tracking-wider text-green-900">
                Ghana Farmers Market℠
              </h2>
              <p className="text-xs uppercase font-bold tracking-widest text-gray-600">
                Marketplace Produce Handover & Consignment Slip
              </p>
            </div>

            <div className="flex justify-center my-3">
              {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-48 h-48 border border-green-700 p-1" />}
            </div>

            <div className="text-center mb-4">
              <span className="text-[10px] uppercase font-bold text-gray-500">Fulfillment Verification PIN</span>
              <p className="text-2xl font-mono font-black text-green-950">{currentHandover.verification_code}</p>
            </div>

            <div className="text-xs space-y-1.5 border-t border-b border-gray-300 py-3">
              <div className="flex justify-between"><span>Order ID:</span><strong>{currentHandover.order_id}</strong></div>
              <div className="flex justify-between"><span>Produce:</span><strong>{currentHandover.item_name}</strong></div>
              <div className="flex justify-between"><span>Quantity:</span><strong>{currentHandover.quantity}</strong></div>
              <div className="flex justify-between"><span>Consignment Total:</span><strong>GHS {currentHandover.total_amount.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Farmer / Producer:</span><strong>{currentHandover.seller_name}</strong></div>
              <div className="flex justify-between"><span>Buyer / Consignee:</span><strong>{currentHandover.buyer_name}</strong></div>
              <div className="flex justify-between"><span>Checkpoint:</span><strong>{currentHandover.handover_checkpoint}</strong></div>
              <div className="flex justify-between"><span>Payment Method:</span><strong>{currentHandover.payment_method}</strong></div>
            </div>

            <div className="text-center pt-3 text-[10px] text-gray-500">
              <p>Certified Ghanaian Farm Produce • Scan code at delivery point to release escrow payment.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SUPABASE_HANDOVER_SQL_QUERY = `-- ====================================================================
-- SUPABASE MIGRATION: MARKETPLACE QR CODE HANDOVER & ESCROW PAYMENT
-- Ghana Farmers Market℠ Produce Marketplace
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PRODUCE HANDOVERS TABLE
-- Tracks physical verification tokens, quality inspections, and escrow releases.
CREATE TABLE IF NOT EXISTS public.produce_handovers (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    verification_code TEXT NOT NULL UNIQUE,
    buyer_id TEXT,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT,
    seller_id TEXT,
    seller_name TEXT NOT NULL,
    seller_phone TEXT,
    item_name TEXT NOT NULL,
    quantity TEXT NOT NULL,
    unit TEXT DEFAULT 'consignment',
    total_amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GHS',
    payment_method TEXT NOT NULL DEFAULT 'Mobile Money (MTN/Telecel/AirtelTigo)',
    payment_status TEXT NOT NULL CHECK (payment_status IN ('escrowed', 'pending_verification', 'released', 'refunded')) DEFAULT 'escrowed',
    fulfillment_status TEXT NOT NULL CHECK (fulfillment_status IN ('awaiting_handover', 'in_transit', 'verified_and_delivered', 'disputed')) DEFAULT 'awaiting_handover',
    handover_checkpoint TEXT NOT NULL DEFAULT 'Regional Farm Gate Depot',
    region TEXT NOT NULL DEFAULT 'All Regions',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by_user_id TEXT,
    verified_by_role TEXT,
    handover_notes TEXT,
    quality_check JSONB DEFAULT '{}'::jsonb,
    digital_signature_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optimize search indexes
CREATE INDEX IF NOT EXISTS idx_produce_handovers_code 
ON public.produce_handovers (verification_code);

CREATE INDEX IF NOT EXISTS idx_produce_handovers_order 
ON public.produce_handovers (order_id);

CREATE INDEX IF NOT EXISTS idx_produce_handovers_seller 
ON public.produce_handovers (seller_id, fulfillment_status);

CREATE INDEX IF NOT EXISTS idx_produce_handovers_buyer 
ON public.produce_handovers (buyer_id, fulfillment_status);

-- 3. ENHANCE ORDERS TABLE IF NEEDED
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'handover_code'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN handover_code TEXT;
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'escrowed';
        ALTER TABLE public.orders ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.produce_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to produce_handovers"
ON public.produce_handovers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert of produce_handovers"
ON public.produce_handovers FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update of produce_handovers"
ON public.produce_handovers FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. REALTIME BROADCAST ENABLING
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'produce_handovers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.produce_handovers;
    END IF;
END $$;

-- 6. STORED PROCEDURE: PROCESS SECURE HANDOVER & RELEASE ESCROW
CREATE OR REPLACE FUNCTION public.process_secure_handover(
    p_verification_code TEXT,
    p_verifier_user_id TEXT,
    p_verifier_role TEXT,
    p_quality_check JSONB DEFAULT '{}'::jsonb,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_handover RECORD;
    v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
BEGIN
    -- Look up handover by code
    SELECT * INTO v_handover 
    FROM public.produce_handovers 
    WHERE upper(verification_code) = upper(p_verification_code);

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Invalid verification code. Record not found.'
        );
    END IF;

    IF v_handover.fulfillment_status = 'verified_and_delivered' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'This produce consignment has already been verified and delivered on ' || to_char(v_handover.verified_at, 'YYYY-MM-DD HH24:MI:SS'),
            'handover', row_to_json(v_handover)
        );
    END IF;

    -- Update Handover Record
    UPDATE public.produce_handovers
    SET 
        fulfillment_status = 'verified_and_delivered',
        payment_status = 'released',
        verified_at = v_now,
        verified_by_user_id = p_verifier_user_id,
        verified_by_role = p_verifier_role,
        handover_notes = p_notes,
        quality_check = p_quality_check
    WHERE id = v_handover.id;

    -- Update Orders Table Status
    UPDATE public.orders
    SET 
        status = 'Delivered',
        payment_status = 'released',
        verified_at = v_now
    WHERE id = v_handover.order_id;

    -- Record in Activity Audit Log
    INSERT INTO public.user_activity_logs (
        user_id,
        user_name,
        user_type,
        action,
        details,
        region,
        metadata,
        created_at
    )
    VALUES (
        p_verifier_user_id,
        COALESCE(v_handover.buyer_name, 'Market Verifier'),
        COALESCE(p_verifier_role, 'buyer'),
        'QR_HANDOVER_VERIFIED',
        'Physical produce verified and GHS ' || v_handover.total_amount || ' escrow released for order ' || v_handover.order_id,
        v_handover.region,
        jsonb_build_object(
            'order_id', v_handover.order_id,
            'handover_id', v_handover.id,
            'amount', v_handover.total_amount,
            'quality_check', p_quality_check
        ),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Produce verified! GHS ' || v_handover.total_amount || ' escrow payment released to seller.',
        'order_id', v_handover.order_id,
        'amount_released', v_handover.total_amount,
        'verified_at', v_now
    );
END;
$$;

-- 7. INITIAL SEED PRODUCE HANDOVERS
INSERT INTO public.produce_handovers (
    id, order_id, verification_code, buyer_id, buyer_name, buyer_phone,
    seller_id, seller_name, seller_phone, item_name, quantity, total_amount,
    currency, payment_method, payment_status, fulfillment_status,
    handover_checkpoint, region
)
VALUES
    (
        'HND-2026-7782', 'ORD-7782', 'GH-7782-X9', 'usr-buyer-01', 'Kwame Mensah', '+233 24 123 4567',
        'usr-farmer-01', 'Ejura Organic Grain Farms', '+233 20 555 1234', 'Certified Maize Seeds (2kg)',
        '5 bags (50kg total)', 430.00, 'GHS', 'Mobile Money (MTN/Telecel/AirtelTigo)', 'escrowed',
        'awaiting_handover', 'Ejura Warehouse Ag-Hub, Depot Gate 2', 'Ashanti'
    ),
    (
        'HND-2026-7781', 'ORD-7781', 'GH-7781-B4', 'usr-buyer-02', 'Ama Serwaa', '+233 27 987 6543',
        'usr-farmer-02', 'Techiman Produce Cooperative', '+233 24 444 8989', 'Heavy-Duty Cutlass & Tooling Set',
        '1 set', 80.00, 'GHS', 'Digital Escrow', 'escrowed',
        'in_transit', 'Techiman Wholesale Market, Stall 44', 'Bono / Techiman'
    ),
    (
        'HND-2026-7750', 'ORD-7750', 'GH-7750-V2', 'usr-buyer-01', 'Kwame Mensah', '+233 24 123 4567',
        'usr-farmer-03', 'Navrongo Agrochemicals & Irrigation', '+233 50 111 2233', 'Knapsack Sprayer (16L Pressure)',
        '1 unit', 250.00, 'GHS', 'Mobile Money (MTN/Telecel/AirtelTigo)', 'released',
        'verified_and_delivered', 'Tamale Central Dispatch Hub', 'Northern / Tamale'
    )
ON CONFLICT (verification_code) DO NOTHING;
`;

export default OrderHandoverModal;
