"use client";

import { X, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionExpiryPopupProps {
  planName: string;
  daysRemaining: number;
  onClose: () => void;
}

export default function SubscriptionExpiryPopup({ planName, daysRemaining, onClose }: SubscriptionExpiryPopupProps) {
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className={`p-6 ${isExpired ? 'bg-red-50' : 'bg-orange-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${isExpired ? 'bg-red-100' : 'bg-orange-100'}`}>
                <AlertCircle className={`w-6 h-6 ${isExpired ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isExpired 
                    ? 'Your subscription has expired' 
                    : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Current Plan</p>
            <p className="text-lg font-bold text-gray-900">{planName}</p>
          </div>

          <div className="space-y-3">
            <p className="text-gray-700">
              {isExpired 
                ? 'Your subscription has expired. Upgrade now to continue enjoying premium features and keep your store active.'
                : 'Your subscription is expiring soon. Upgrade or renew to avoid interruption of services.'}
            </p>
            
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Access to premium features will be restricted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Your store visibility may be reduced</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Product limits will be enforced</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Later
            </button>
            <Link
              href="/dashboard/subscription"
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold flex items-center justify-center gap-2"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
