'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

// All Indian languages supported by Google Translate
const languages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
];

type LanguageToggleProps = {
  className?: string;
  showLabelOnDesktop?: boolean;
  showLabelOnMobile?: boolean;
  appearance?: 'minimal' | 'pill' | 'floating';
};

const LanguageIcon = ({ className = '' }: { className?: string }) => (
  <svg
    className={className || 'w-5 h-5'}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="3" y="5" width="12" height="22" rx="3" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M8.8 11.5H6.6m0 0l3.4 9m0 0h2m-2 0l3.4-9"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="17" y="5" width="12" height="22" rx="5" stroke="#0ea5e9" strokeWidth="1.4" />
    <path
      d="M25 11c-1.2 0-2 1.1-2 2.4 0 1.8 2.4 2.2 2.4 4.1 0 0.7-.4 1.5-1.4 1.5-.6 0-1-.2-1.4-.6"
      stroke="#0ea5e9"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M24.8 9.5v13" stroke="#0ea5e9" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default function LanguageToggle({
  className = '',
  showLabelOnDesktop = false,
  showLabelOnMobile = false,
  appearance = 'minimal',
}: LanguageToggleProps) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // On load: check localStorage first (user's manual selection), 
    // then sessionStorage (auto-detected), default to English
    const userSelected = localStorage.getItem('user_selected_lang');
    const autoDetected = sessionStorage.getItem('current_lang');
    const current = userSelected || autoDetected || 'en';
    setSelectedLang(current);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setSelectedLang(code);
    setIsOpen(false);
    
    // Save user's manual selection to localStorage
    localStorage.setItem('user_selected_lang', code);
    
    // Set Google Translate cookie
    if (code === 'en') {
      document.cookie = 'googtrans=/en/en; path=/';
    } else {
      document.cookie = `googtrans=/en/${code}; path=/`;
    }
    
    // Reload page to apply translation
    window.location.reload();
  };

  const currentLang = languages.find(l => l.code === selectedLang);

  const baseButtonClass =
    appearance === 'pill'
      ? 'inline-flex h-8 items-center gap-2 rounded-full border border-emerald-200 bg-[linear-gradient(180deg,#f7fffb_0%,#ecfdf5_100%)] px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 hover:bg-white'
      : appearance === 'floating'
        ? 'inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-[0_22px_48px_-24px_rgba(37,99,235,0.35)]'
        : 'flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-primary hover:text-primary transition';

  const triggerClassName = className ? `${baseButtonClass} ${className}`.trim() : baseButtonClass;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
        aria-label="Select language"
        translate="no"
      >
        {!showLabelOnMobile && appearance !== 'pill' && <LanguageIcon className="w-5 h-5" />}
        {showLabelOnMobile && appearance !== 'floating' && (
          <span className="text-xs font-semibold text-slate-800 md:hidden" translate="no">
            {currentLang?.label || 'English'}
          </span>
        )}
        {showLabelOnDesktop && appearance !== 'floating' && (
          <span className="text-sm font-semibold text-slate-800 md:hidden" translate="no">
            {(currentLang?.label || 'English').charAt(0).toUpperCase()}
          </span>
        )}
        {showLabelOnDesktop && appearance !== 'floating' && (
          <span className="hidden md:inline text-sm font-semibold text-slate-800" translate="no">
            {currentLang?.label || 'English'}
          </span>
        )}
        {appearance === 'pill' && <ChevronDown className="h-4 w-4 text-slate-500" />}
        <span className={showLabelOnDesktop ? 'sr-only md:hidden' : 'sr-only'} translate="no">
          Language
        </span>
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto no-scrollbar min-w-[8rem]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-all ${
                selectedLang === lang.code ? 'bg-primary/5 font-semibold text-primary' : 'text-gray-700'
              }`}
            >
              <span translate="no">{lang.native}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
