"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/src/context/AuthContext';
import {
  createStore,
  formatValidationErrorsForDisplay,
  getCategories,
  isApiError,
  parseApiValidationErrors,
  type Category,
} from '@/src/lib/api';
import { lookupPinCode } from '@/src/lib/location';
import { ArrowLeft, Loader2 } from 'lucide-react';

const defaultLogo = 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=200&h=200&fit=crop';
const MAX_LOGO_DIMENSION = 600;
const MAX_LOGO_SIZE_BYTES = 900_000; // stay under MySQL packet size (~0.9 MB)

async function compressImageToDataUrl(file: File): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) {
        reject(new Error('Unable to read image.'));
        return;
      }
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const scale = Math.min(MAX_LOGO_DIMENSION / image.width, MAX_LOGO_DIMENSION / image.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(Math.round(image.width * scale), 1);
  canvas.height = Math.max(Math.round(image.height * scale), 1);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context unavailable');
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Unable to compress image.'));
        return;
      }
      resolve(result);
    }, 'image/jpeg', 0.8);
  });

  if (blob.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error('Logo is too large. Please choose an image under ~900 KB (after compression).');
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function CreateStorePage() {
  const router = useRouter();
  const { isLoggedIn, user, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [formData, setFormData] = useState({
    categoryId: 0,
    storeName: '',
    logo: null as File | null,
    phone: '',
    email: '',
    description: '',
    address: '',
    pinCode: '',
    district: '',
    state: '',
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth?redirect=/create-store');
      return;
    }

    setIsAuthorized(true);

    if (user?.email) {
      setFormData((prev) => (prev.email ? prev : { ...prev, email: user.email }));
    }

    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isLoggedIn, router, user?.email]);

  useEffect(() => {
    const digits = formData.pinCode.replace(/[^0-9]/g, '');
    if (digits.length !== 6) {
      return;
    }

    let cancelled = false;
    const fetchPinDetails = async () => {
      const result = await lookupPinCode(digits);
      if (cancelled || !result) {
        return;
      }
      setFormData((prev) => ({
        ...prev,
        district: result.district ?? prev.district,
        state: result.state ?? prev.state,
      }));
    };

    fetchPinDetails();

    return () => {
      cancelled = true;
    };
  }, [formData.pinCode]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData({ ...formData, logo: file });
    compressImageToDataUrl(file)
      .then((dataUrl) => {
        setLogoPreview(dataUrl);
        setFieldErrors((current) => {
          const { logo: _removed, ...rest } = current;
          return rest;
        });
      })
      .catch((error) => {
        console.error('Failed to prepare logo:', error);
        setLogoPreview(null);
        setFieldErrors((current) => ({
          ...current,
          logo: ['Please upload an image under ~900 KB (after compression).'],
        }));
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    setFieldErrors({});
    
    // Add small delay to ensure loading state is visible
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!formData.categoryId) {
      setErrorMessage('Please select a category');
      setLoading(false);
      return;
    }

    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your business email');
      setLoading(false);
      return;
    }

    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const normalizedDescription =
      formData.description?.trim() || `Discover curated ${selectedCategory?.name.toLowerCase() || 'products'} in your area.`;

    const locationLabel = [formData.district.trim(), formData.state.trim()].filter(Boolean).join(', ');
    const fullAddress = [
      formData.address.trim(),
      locationLabel,
      formData.pinCode ? `PIN ${formData.pinCode}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const { store } = await createStore({
        name: formData.storeName.trim(),
        category_id: formData.categoryId,
        logo: logoPreview ?? defaultLogo,
        address: fullAddress,
        phone: formData.phone,
        email: emailTrimmed,
        description: normalizedDescription,
        location: locationLabel || undefined,
      });

      if (user) {
        setUser({ ...user, storeSlug: store.username });
      }

      router.push(`/store/${store.username}?edit=true`);
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 401) {
          router.replace('/login');
          return;
        }

        const validationErrors = parseApiValidationErrors(error.payload);
        if (validationErrors) {
          setFieldErrors(validationErrors);
          setErrorMessage(formatValidationErrorsForDisplay(validationErrors, 'store'));
        } else {
          setErrorMessage(error.message || 'Unable to create store.');
        }
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    logout();
    router.replace('/auth');
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-6 pb-0 md:pb-8">
      <div className="w-full max-w-md mx-auto space-y-6">
        <button
          type="button"
          onClick={handleBackToLogin}
          aria-label="Sign out and go back to login"
          className="group relative isolate flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-indigo-300/70 hover:shadow-md hover:shadow-indigo-500/[0.12] active:scale-[0.98] md:w-auto md:justify-start"
        >
          <span
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500/0 via-indigo-500/[0.07] to-violet-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-0 -z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition duration-700 ease-out group-hover:translate-x-full group-hover:opacity-100"
            aria-hidden
          />
          <ArrowLeft
            className="h-4 w-4 shrink-0 text-indigo-600 transition-transform duration-300 ease-out group-hover:-translate-x-1"
            aria-hidden
          />
          <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent transition-all duration-300 group-hover:from-indigo-700 group-hover:to-violet-600">
            Back to login
          </span>
        </button>

        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Create store</p>
          <h1 className="text-2xl font-semibold text-gray-900">Set up your store</h1>
        </header>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-5 space-y-5">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Company logo</label>
              <p className="text-xs text-gray-500">Drop an image or browse your files (PNG/JPG).</p>
            </div>
            <label className="block rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center cursor-pointer hover:border-blue-300 transition">
              <div className="flex flex-col items-center gap-3 text-blue-600">
                {logoPreview ? (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-blue-100">
                    <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-inner flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.5 11.5C9.05228 10.9477 9.94772 10.9477 10.5 11.5L13.5 14.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 13L16.5 11.5C17.0523 10.9477 17.9477 10.9477 18.5 11.5L20 13" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="3" y="5" width="18" height="14" rx="3" stroke="#2563eb" strokeWidth="1.5" />
                      <circle cx="9" cy="9" r="1" fill="#2563eb" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {formData.logo ? formData.logo.name : 'Drop your image here, or browse'}
                  </p>
                  <p className="text-xs text-gray-500">Supports: JPG, JPEG2000, PNG</p>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
            {fieldErrors.logo && <p className="text-sm text-red-600">{fieldErrors.logo[0]}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="storeName" className="text-sm font-medium text-gray-700">
              Store name
            </label>
            <input
              id="storeName"
              type="text"
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              placeholder="eg. Urban Living"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            {fieldErrors.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
              required
              disabled={loadingCategories}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
            >
              <option value="0">{loadingCategories ? 'Loading categories...' : 'Select a category'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {fieldErrors.category_id && <p className="text-sm text-red-600">{fieldErrors.category_id[0]}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone[0]}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Business email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@yourbusiness.com"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium text-gray-700">
              Complete address
            </label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Shop 12, Market Road, near sector park"
              required
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            {fieldErrors.address && <p className="text-sm text-red-600">{fieldErrors.address[0]}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="pinCode" className="text-sm font-medium text-gray-700">
              PIN code
            </label>
            <input
              id="pinCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.pinCode}
              onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })}
              placeholder="e.g. 136027"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="district" className="text-sm font-medium text-gray-700">
                District <span className="text-gray-400">(auto or manual)</span>
              </label>
              <input
                id="district"
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. Kaithal"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="state" className="text-sm font-medium text-gray-700">
                State
              </label>
              <input
                id="state"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Haryana"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">
              Company description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Share what you sell and any delivery info."
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            {fieldErrors.description && <p className="text-sm text-red-600">{fieldErrors.description[0]}</p>}
          </div>

          {fieldErrors.location && (
            <p className="text-sm text-red-600">
              <span className="font-medium">Location: </span>
              {fieldErrors.location[0]}
            </p>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 whitespace-pre-line"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating store...
              </>
            ) : (
              'Create my store'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
