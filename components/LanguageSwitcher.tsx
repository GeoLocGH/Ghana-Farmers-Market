import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, LanguageCode } from '../contexts/LanguageContext';
import { GlobeIcon, CheckIcon } from './common/icons';

const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage, currentOption, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-900/60 hover:bg-green-700/80 border border-green-600/50 text-white text-xs font-semibold shadow-xs transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Language / Sesã Kasa / Tia Gbe"
      >
        <GlobeIcon className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
        <span className="hidden xs:inline">{currentOption.flag}</span>
        <span className="font-bold tracking-wide">{currentOption.badge}</span>
        <svg 
          className={`w-3 h-3 text-green-200 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-1.5 w-52 rounded-xl shadow-2xl bg-white border border-gray-200 text-gray-900 z-50 overflow-hidden animate-fade-in divide-y divide-gray-100"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Language / Kasa / Gbe
            </p>
          </div>

          <div className="py-1">
            {availableLanguages.map((opt) => {
              const isSelected = opt.code === language;
              return (
                <button
                  key={opt.code}
                  onClick={() => handleSelect(opt.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    isSelected 
                      ? 'bg-green-50 text-green-800 font-bold' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{opt.flag}</span>
                    <div>
                      <div className="font-semibold text-gray-900 leading-tight flex items-center gap-1.5">
                        <span>{opt.nativeLabel}</span>
                        <span className="text-[10px] text-gray-400 font-normal">({opt.badge})</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{opt.label}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
