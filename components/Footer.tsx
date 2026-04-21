import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import desktopLogo from '@/assets/Larawans.svg';
import {
  FACEBOOK_SOCIAL_BRAND_ICON_URL,
  INSTAGRAM_SOCIAL_BRAND_ICON_URL,
  LINKEDIN_SOCIAL_BRAND_ICON_URL,
  SOCIAL_BRAND_ICON_DISPLAY_PX,
  SOCIAL_BRAND_ICON_ROW_GAP_PX,
  YOUTUBE_SOCIAL_BRAND_ICON_URL,
} from '@/src/lib/socialBrandAssets';

const FOOTER_SOCIAL_LINKS = {
  youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL || '#',
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || '#',
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || '#',
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || '#',
};

const footerSocialIcons = [
  { label: 'YouTube', href: FOOTER_SOCIAL_LINKS.youtube, iconSrc: YOUTUBE_SOCIAL_BRAND_ICON_URL },
  { label: 'Facebook', href: FOOTER_SOCIAL_LINKS.facebook, iconSrc: FACEBOOK_SOCIAL_BRAND_ICON_URL },
  { label: 'Instagram', href: FOOTER_SOCIAL_LINKS.instagram, iconSrc: INSTAGRAM_SOCIAL_BRAND_ICON_URL },
  { label: 'LinkedIn', href: FOOTER_SOCIAL_LINKS.linkedin, iconSrc: LINKEDIN_SOCIAL_BRAND_ICON_URL },
];

export default function Footer() {
  return (
    <footer className="footer-text-scale bg-gradient-to-br from-emerald-50 via-gray-50 to-emerald-50 relative overflow-hidden">
      <div className="relative z-10 pt-0 pb-[0.7rem] md:pb-[1.2rem]">
        <div className="w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-6 gap-8 lg:gap-12">
            <div className="lg:col-span-2 animate-slideInLeft">
              <div className="flex items-center space-x-3 mb-6">
                <Image src={desktopLogo} width={140} height={40} alt="Larawans" />
                <div>
                  <p className="text-xs text-gray-500 -mt-1">Explore • Dream • Discover</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed !text-[10px] sm:!text-base">
                Build your digital store in minutes. Help local businesses grow on the online marketplace and connect
                directly with customers across India.
              </p>
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Follow Our Journey</h4>
                <div
                  className="flex flex-nowrap items-center"
                  style={
                    SOCIAL_BRAND_ICON_ROW_GAP_PX > 0
                      ? { gap: `${SOCIAL_BRAND_ICON_ROW_GAP_PX}px` }
                      : undefined
                  }
                >
                  {footerSocialIcons.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-md p-0 leading-none transition hover:opacity-90 hover:-translate-y-0.5"
                      aria-label={item.label}
                    >
                      <img
                        src={item.iconSrc}
                        alt=""
                        width={SOCIAL_BRAND_ICON_DISPLAY_PX}
                        height={SOCIAL_BRAND_ICON_DISPLAY_PX}
                        className="block object-contain align-middle"
                        style={{
                          width: SOCIAL_BRAND_ICON_DISPLAY_PX,
                          height: SOCIAL_BRAND_ICON_DISPLAY_PX,
                        }}
                        aria-hidden
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="animate-fadeInUp">
              <h4 className="font-semibold text-gray-900 mb-6">Quick Links</h4>
              <ul className="space-y-1.5">
                <li><Link href="/about" className="footer-link text-gray-600 hover:text-red-600">About Us</Link></li>
                <li><Link href="/contact" className="footer-link text-gray-600 hover:text-red-600">Contact</Link></li>
                <li><Link href="/stores" className="footer-link text-gray-600 hover:text-red-600">All Stores</Link></li>
                <li><Link href="/create-store" className="footer-link text-gray-600 hover:text-red-600">Create Store</Link></li>
                <li><Link href="/pricing" className="footer-link text-gray-600 hover:text-red-600">Pricing</Link></li>
              </ul>
            </div>

            <div className="animate-fadeInUp">
              <h4 className="font-semibold text-gray-900 mb-6">Support</h4>
              <ul className="space-y-1.5">
                <li><Link href="/help-center" className="footer-link text-gray-600 hover:text-red-500">Help Center</Link></li>
                <li><Link href="/terms" className="footer-link text-gray-600 hover:text-red-500">Terms of Service</Link></li>
                <li><Link href="/privacy" className="footer-link text-gray-600 hover:text-red-500">Privacy Policy</Link></li>
                <li><Link href="/cookies" className="footer-link text-gray-600 hover:text-red-500">Cookie Policy</Link></li>
              </ul>
            </div>

            <div className="animate-fadeInUp">
              <h4 className="font-semibold text-gray-900 mb-6">Company Address</h4>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Registered Office</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    M/s Larawans, Village Manoharpur, District Jind, Haryana - 126102
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Working Office</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Shop No. 2, Subhash Market, Karnal Rd, Opp. District Court, Ashoka Garden Colony, Kaithal,
                    Haryana - 136027- India
                  </p>
                </div>
                <div className="md:hidden pt-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 mr-2">We accept:</span>
                    <div className="flex space-x-2">
                      <div className="w-8 h-5 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">VISA</span>
                      </div>
                      <div className="w-8 h-5 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full opacity-80" />
                      </div>
                      <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-xs font-bold text-white">PP</span>
                      </div>
                      <div className="w-8 h-5 bg-black rounded flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="animate-fadeInUp">
              <h4 className="font-semibold text-gray-900 mb-6">Contact Us</h4>
              <ul className="space-y-1.5 mb-8 w-full">
                <li className="flex items-start gap-2 text-gray-600 w-full">
                  <Phone className="w-4 h-4 shrink-0 mt-1" />
                  <span className="contact-number leading-6">+91-7015150181</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 w-full">
                  <Phone className="w-4 h-4 shrink-0 mt-1" />
                  <span className="contact-number leading-6">+91-9812456777</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 w-full">
                  <Phone className="w-4 h-4 shrink-0 mt-1" />
                  <span className="contact-number leading-6">+91-8930722686</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600 w-full">
                  <Mail className="w-4 h-4 shrink-0 mt-1" />
                  <span className="leading-6">Info@larawans.com</span>
                </li>
              </ul>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-white/60 rounded-xl border border-emerald-100">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">IATA Certified</div>
                    <div className="text-xs text-gray-500">Verified Agency</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-white/60 rounded-xl border border-red-100">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">SSL Secured</div>
                    <div className="text-xs text-gray-500">Safe &amp; Secure</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/50 bg-white/30 backdrop-blur-sm mb-[calc(env(safe-area-inset-bottom)+72px)] md:mb-0">
        <div className="w-[95%] mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-6 md:pt-6">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0 animate-fadeInUp">
            <div className="text-center lg:text-left">
              <p className="text-gray-600 text-sm">
                &copy; 2026 Larawans (M/s LARAWANS). All rights reserved.
              </p>
            </div>
            <div />
            <div className="hidden md:flex items-center space-x-3">
              <span className="text-sm text-gray-600 mr-2">We accept:</span>
              <div className="flex space-x-2">
                <div className="w-8 h-5 bg-white rounded border border-gray-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">VISA</span>
                </div>
                <div className="w-8 h-5 bg-white rounded border border-gray-200 flex items-center justify-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full opacity-80" />
                </div>
                <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-white">PP</span>
                </div>
                <div className="w-8 h-5 bg-black rounded flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-text-scale :is(h1, h2, h3, h4, h5, h6, p, a, li, span, label) {
          font-size: 0.8em !important;
        }

        .contact-number {
          font-size: 0.96em !important;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.8s ease-out forwards;
        }

        .footer-link {
          position: relative;
          transition: all 0.3s ease;
        }

        .footer-link:after {
          content: '';
          position: absolute;
          width: 0;
          height: 1px;
          bottom: -2px;
          left: 0;
          background: #ef4444;
          transition: width 0.3s ease;
        }

        .footer-link:hover:after {
          width: 100%;
        }
      `}</style>
    </footer>
  );
}
