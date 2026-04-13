"use client";

import { X, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionExpiryPopupProps {
  planName: string;
  daysRemaining: number;
  onClose: () => void;
}

export default function SubscriptionExpiryPopup({ planName, daysRemaining, onClose }: SubscriptionExpiryPopupProps) {
  // `< 0` only: `0` can mean "last partial day" when whole days use floor (aligned with trial banner).
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 7;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`p-4 ${isExpired ? 'bg-red-50' : 'bg-orange-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`rounded-full p-2 ${isExpired ? 'bg-red-100' : 'bg-orange-100'}`}>
                <AlertCircle className={`h-5 w-5 ${isExpired ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-red-600">
                  {isExpired
                    ? 'Your subscription has expired'
                    : daysRemaining === 0
                      ? 'Less than 1 day remaining'
                      : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="mb-1 text-[11px] text-gray-600">Current Plan</p>
            <p className="text-[15px] font-bold text-gray-900">{planName}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] leading-snug text-gray-700">
              {isExpired
                ? 'Your subscription has expired. Upgrade now to continue enjoying premium features and keep your store active.'
                : 'Your subscription is expiring soon. Upgrade or renew to avoid interruption of services.'}
            </p>

            <ul className="space-y-1.5 text-[11px] leading-snug text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">•</span>
                <span>Access to premium features will be restricted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">•</span>
                <span>Your store visibility may be reduced</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">•</span>
                <span>Product limits will be enforced</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Later
            </button>
            <Link
              href="/dashboard/subscription"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Upgrade Now
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
