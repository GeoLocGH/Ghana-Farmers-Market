import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import type { MarketplaceItem } from '../types';
import Button from './common/Button';
import { 
  XIcon, 
  PrinterIcon, 
  DownloadIcon, 
  CopyIcon, 
  CheckIcon, 
  ExternalLinkIcon, 
  QrCodeIcon, 
  SproutIcon, 
  ShieldCheckIcon,
  TagIcon,
  PhoneIcon,
  UserCircleIcon
} from './common/icons';

interface ProduceQrModalProps {
  item: MarketplaceItem;
  isOpen: boolean;
  onClose: () => void;
}

type LabelLayout = 'SINGLE_TAG' | 'COMPACT_STICKER' | 'A4_SHEET_6';

export const ProduceQrModal: React.FC<ProduceQrModalProps> = ({ item, isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [layout, setLayout] = useState<LabelLayout>('SINGLE_TAG');
  
  // Customization options for the label
  const [showPrice, setShowPrice] = useState(true);
  const [showSellerContact, setShowSellerContact] = useState(true);
  const [showStorage, setShowStorage] = useState(true);
  const [harvestDate, setHarvestDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [batchNumber, setBatchNumber] = useState(() => {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GH-${new Date().getFullYear()}-${randomHex}`;
  });

  const printRef = useRef<HTMLDivElement>(null);

  // Construct direct product deep-link URL
  const productUrl = typeof window !== 'undefined' && item?.id
    ? `${window.location.origin}${window.location.pathname}?view=MARKETPLACE&item=${encodeURIComponent(item.id)}`
    : `https://agrosourcingghana.gov.gh/?view=MARKETPLACE&item=${encodeURIComponent(item?.id || '')}`;

  // Generate QR code when item or URL changes
  useEffect(() => {
    if (!isOpen || !item) return;

    QRCode.toDataURL(productUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#14532d', // Deep agricultural forest green
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [productUrl, isOpen, item]);

  if (!isOpen || !item) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const safeName = (item?.name ? String(item.name) : 'produce').replace(/\s+/g, '_');
    link.download = `QR-${safeName}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      {/* Printable Area Specific Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-produce-labels, #printable-produce-labels * {
            visibility: visible;
          }
          #printable-produce-labels {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-900 animate-fade-in">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-green-800 to-emerald-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <QrCodeIcon className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold leading-tight">
                Farm Produce QR Code & Printable Label Studio
              </h3>
              <p className="text-xs text-green-200">
                Direct traceability tag linking directly to {item.name} in Ghana Farmers Market℠ Marketplace
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Label Configuration & Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Format Selector */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Label Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLayout('SINGLE_TAG')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    layout === 'SINGLE_TAG'
                      ? 'bg-green-700 text-white border-green-700 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Produce Tag
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('COMPACT_STICKER')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    layout === 'COMPACT_STICKER'
                      ? 'bg-green-700 text-white border-green-700 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Box Sticker
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('A4_SHEET_6')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    layout === 'A4_SHEET_6'
                      ? 'bg-green-700 text-white border-green-700 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Sheet of 6 (A4)
                </button>
              </div>
            </div>

            {/* Label Content Customization */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Include on Label
              </h4>

              <div className="space-y-2 text-xs font-medium text-black">
                <label className="flex items-center gap-2 cursor-pointer text-black">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span>Show Wholesale Price (GHS {item.price.toFixed(2)})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-black">
                  <input
                    type="checkbox"
                    checked={showSellerContact}
                    onChange={(e) => setShowSellerContact(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span>Show Farmer / Seller Details & Phone</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-black">
                  <input
                    type="checkbox"
                    checked={showStorage}
                    onChange={(e) => setShowStorage(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span>Show Storage & Usage Tips</span>
                </label>
              </div>

              {/* Batch & Harvest Input */}
              <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1">
                    Harvest Date
                  </label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-black mb-1">
                    Batch / Lot ID
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-black"
                    placeholder="Batch ID"
                  />
                </div>
              </div>
            </div>

            {/* Direct Link Preview & Copy */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-700" />
                  Direct Product Deep-Link
                </span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">
                  Scannable
                </span>
              </div>

              <p className="text-[11px] text-gray-600 truncate bg-white px-2 py-1.5 rounded border border-emerald-200 font-mono select-all">
                {productUrl}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 transition-colors shadow-2xs"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-green-700" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <a
                  href={productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                >
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </a>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handlePrint}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 font-bold shadow-md flex items-center justify-center gap-2"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Print Labels</span>
              </Button>
              <button
                type="button"
                onClick={handleDownloadQrOnly}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
              >
                <DownloadIcon className="w-4 h-4 text-gray-600" />
                <span>Save QR Image</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Printable Preview Canvas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-start bg-gray-100 rounded-xl p-4 sm:p-6 border border-gray-200 overflow-y-auto">
            <div className="w-full flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                Print Preview ({layout === 'SINGLE_TAG' ? 'Standard Tag' : layout === 'COMPACT_STICKER' ? 'Sticker' : 'Sheet of 6'})
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Standard Avery / A4 Compatible
              </span>
            </div>

            {/* Printable Container */}
            <div id="printable-produce-labels" ref={printRef} className="w-full flex justify-center">
              {layout === 'SINGLE_TAG' && (
                <ProduceTagCard
                  item={item}
                  qrDataUrl={qrDataUrl}
                  showPrice={showPrice}
                  showSellerContact={showSellerContact}
                  showStorage={showStorage}
                  harvestDate={harvestDate}
                  batchNumber={batchNumber}
                />
              )}

              {layout === 'COMPACT_STICKER' && (
                <ProduceStickerCard
                  item={item}
                  qrDataUrl={qrDataUrl}
                  showPrice={showPrice}
                  showSellerContact={showSellerContact}
                  harvestDate={harvestDate}
                  batchNumber={batchNumber}
                />
              )}

              {layout === 'A4_SHEET_6' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <ProduceTagCard
                      key={idx}
                      item={item}
                      qrDataUrl={qrDataUrl}
                      showPrice={showPrice}
                      showSellerContact={showSellerContact}
                      showStorage={showStorage}
                      harvestDate={harvestDate}
                      batchNumber={batchNumber}
                      compact={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Ghanaian Farmers Market Traceability Protocol v2.4</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-semibold px-3 py-1 rounded-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* Individual Standard Produce Tag Component */
interface ProduceTagCardProps {
  item: MarketplaceItem;
  qrDataUrl: string;
  showPrice: boolean;
  showSellerContact: boolean;
  showStorage: boolean;
  harvestDate: string;
  batchNumber: string;
  compact?: boolean;
}

const ProduceTagCard: React.FC<ProduceTagCardProps> = ({
  item,
  qrDataUrl,
  showPrice,
  showSellerContact,
  showStorage,
  harvestDate,
  batchNumber,
  compact = false,
}) => {
  return (
    <div className={`bg-white border-2 border-green-800 rounded-xl shadow-md overflow-hidden text-gray-900 transition-all ${compact ? 'w-full max-w-[290px] p-3' : 'w-full max-w-[360px] p-4'}`}>
      {/* Top Agricultural Brand Stripe */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-green-700/60">
        <div className="flex items-center gap-2">
          <img
            src="/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg"
            alt="Ghana Farmers Market℠"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-contain border border-green-700/40 bg-white"
          />
          <div>
            <h4 className="text-[13px] font-extrabold text-green-900 uppercase tracking-tight leading-none">
              Ghana Farmers Market℠
            </h4>
            <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">
              Certified Farm Produce
            </span>
          </div>
        </div>
        <span className="bg-green-100 text-green-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-green-300">
          {item.category || 'Produce'}
        </span>
      </div>

      {/* Item Title & Price */}
      <div className="mb-2">
        <h3 className={`font-black text-gray-900 leading-tight ${compact ? 'text-base' : 'text-lg'}`}>
          {item.name}
        </h3>
        {showPrice && (
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-semibold text-gray-500">Price:</span>
            <span className="text-base font-extrabold text-green-800">
              GHS {item.price.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* QR Code and Scan Callout */}
      <div className="my-2.5 p-2 bg-green-50/70 rounded-xl border border-green-200 flex flex-col items-center text-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Code for ${item.name}`}
            className={`bg-white rounded-lg p-1 border border-green-300 shadow-2xs ${compact ? 'w-32 h-32' : 'w-44 h-44'}`}
          />
        ) : (
          <div className="w-36 h-36 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center text-gray-400 text-xs">
            Generating QR...
          </div>
        )}
        <p className="text-[10px] font-extrabold text-green-900 uppercase tracking-wider mt-1.5">
          Scan to View Produce & Order
        </p>
        <p className="text-[9px] text-gray-500">
          Use any mobile camera to view full details
        </p>
      </div>

      {/* Farmer & Batch Details */}
      <div className="space-y-1 text-[11px] text-gray-700 pt-1 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Producer:</span>
          <span className="font-bold text-gray-900 truncate max-w-[170px]">
            {item.seller || 'Verified Ghanaian Farmer'}
          </span>
        </div>

        {showSellerContact && item.seller_phone && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Phone:</span>
            <span className="font-bold text-green-800">{item.seller_phone}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-[10px]">
          <span className="text-gray-400">Harvest Date:</span>
          <span className="font-semibold text-gray-700">{harvestDate}</span>
        </div>

        <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono">
          <span>Batch Lot:</span>
          <span>{batchNumber}</span>
        </div>
      </div>

      {/* Optional Storage Recommendation */}
      {showStorage && (item.storage_recommendations || item.usage_instructions) && (
        <div className="mt-2 pt-1.5 border-t border-dashed border-gray-200 text-[10px] text-gray-600 italic">
          <span className="font-semibold text-gray-700 not-italic">Storage: </span>
          {item.storage_recommendations || item.usage_instructions}
        </div>
      )}
    </div>
  );
};

/* Compact Sticker Format (for box, crate, or jar) */
interface ProduceStickerCardProps {
  item: MarketplaceItem;
  qrDataUrl: string;
  showPrice: boolean;
  showSellerContact: boolean;
  harvestDate: string;
  batchNumber: string;
}

const ProduceStickerCard: React.FC<ProduceStickerCardProps> = ({
  item,
  qrDataUrl,
  showPrice,
  showSellerContact,
  harvestDate,
  batchNumber,
}) => {
  return (
    <div className="bg-white border-2 border-emerald-800 rounded-xl p-3 shadow-md w-full max-w-[340px] flex items-center gap-3">
      {/* QR Code */}
      <div className="flex-shrink-0">
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt={`QR ${item.name}`}
            className="w-24 h-24 rounded border border-emerald-300 p-0.5 bg-white"
          />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-tight">
          <img
            src="/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg"
            alt="Ghana Farmers Market℠"
            referrerPolicy="no-referrer"
            className="w-4 h-4 rounded-full object-contain"
          />
          <span>Ghana Farmers Market℠</span>
        </div>

        <h3 className="font-black text-gray-900 text-sm leading-tight truncate">
          {item.name}
        </h3>

        {showPrice && (
          <p className="text-xs font-black text-green-700">
            GHS {item.price.toFixed(2)}
          </p>
        )}

        <p className="text-[10px] text-gray-600 truncate mt-0.5">
          Farm: <span className="font-semibold">{item.seller}</span>
        </p>

        {showSellerContact && item.seller_phone && (
          <p className="text-[10px] text-green-800 font-bold">
            {item.seller_phone}
          </p>
        )}

        <div className="mt-1 pt-1 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400">
          <span>{harvestDate}</span>
          <span className="font-mono">{batchNumber}</span>
        </div>
      </div>
    </div>
  );
};

export default ProduceQrModal;
