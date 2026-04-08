'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Image as ImageIcon, Briefcase, X } from 'lucide-react';
import type { Product, Service } from '@/types';
import { addProduct, addService, deleteProduct, getServicesByStore, getStoreBySlug, isApiError, updateProduct } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';

const PRODUCT_UNIT_OPTIONS = [
  { value: 'piece', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'set', label: 'Set' },
  { value: 'kilogram', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'milliliter', label: 'Milliliter (ml)' },
  { value: 'meter', label: 'Meter (m)' },
  { value: 'centimeter', label: 'Centimeter (cm)' },
  { value: 'square_meter', label: 'Square meter (m²)' },
  { value: 'custom', label: 'Custom unit' },
] as const;

type ProductUnitType = (typeof PRODUCT_UNIT_OPTIONS)[number]['value'];

const SERVICE_BILLING_UNITS = [
  { value: 'session', label: 'Per session' },
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
  { value: 'project', label: 'Per project' },
  { value: 'custom', label: 'Custom unit' },
] as const;

type ServiceBillingUnit = (typeof SERVICE_BILLING_UNITS)[number]['value'];

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  stockStatus: 'inStock' | 'outOfStock';
  unitType: ProductUnitType;
  unitCustomLabel: string;
  unitQuantity: string;
  wholesaleEnabled: boolean;
  wholesalePrice: string;
  wholesaleMinQty: string;
  minOrderQuantity: string;
  discountEnabled: boolean;
  discountPrice: string;
  discountScheduleEnabled: boolean;
  discountStartsAt: string;
  discountEndsAt: string;
};

type ServiceFormState = {
  title: string;
  description: string;
  price: string;
  isActive: boolean;
  billingUnit: ServiceBillingUnit;
  customBillingUnit: string;
  minQuantity: string;
  packagePrice: string;
};

type ProductsManagerProps = {
  defaultShowForm?: boolean;
};

const initialForm: ProductFormState = {
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  stockStatus: 'inStock',
  unitType: 'piece',
  unitCustomLabel: '',
  unitQuantity: '1',
  wholesaleEnabled: false,
  wholesalePrice: '',
  wholesaleMinQty: '',
  minOrderQuantity: '',
  discountEnabled: false,
  discountPrice: '',
  discountScheduleEnabled: false,
  discountStartsAt: '',
  discountEndsAt: '',
};

const initialServiceForm: ServiceFormState = {
  title: '',
  description: '',
  price: '',
  isActive: true,
  billingUnit: 'session',
  customBillingUnit: '',
  minQuantity: '',
  packagePrice: '',
};

const MAX_PRODUCT_IMAGE_DIMENSION = 800;
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 3_500_000;

const compressImageToDataUrl = async (file: File): Promise<string> => {
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

  const scale = Math.min(MAX_PRODUCT_IMAGE_DIMENSION / image.width, MAX_PRODUCT_IMAGE_DIMENSION / image.height, 1);
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

  if (blob.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error('Product image is too large. Please use a smaller image.');
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function ProductsManager({ defaultShowForm = false }: ProductsManagerProps) {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(defaultShowForm);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [serviceFormState, setServiceFormState] = useState<ServiceFormState>(initialServiceForm);
  const [serviceFormError, setServiceFormError] = useState<string | null>(null);
  const [serviceFormSubmitting, setServiceFormSubmitting] = useState(false);
  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(null);
  const [serviceImageError, setServiceImageError] = useState<string | null>(null);
  const serviceImageInputRef = useRef<HTMLInputElement | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'products' | 'services'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const isEditingProduct = Boolean(editingProduct);

  useEffect(() => {
    setShowAddForm(defaultShowForm);
  }, [defaultShowForm]);

  const hasStore = Boolean(user?.storeSlug);

  const loadProducts = useCallback(async () => {
    if (!user?.storeSlug) {
      setProducts([]);
      setServices([]);
      setLoading(false);
      setError('You need to create a store before adding products.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { store, products: storeProducts } = await getStoreBySlug(user.storeSlug);
      setStoreId(store?.id ?? null);
      setProducts(storeProducts ?? []);
      if (store?.id) {
        const storeServices = await getServicesByStore(store.id);
        setServices(storeServices ?? []);
      } else {
        setServices([]);
      }
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Unable to load products');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load products');
      }
    } finally {
      setLoading(false);
    }
  }, [router, user?.storeSlug]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadProducts();
  }, [isLoggedIn, loadProducts, router]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      setImageError(null);
      return;
    }

    compressImageToDataUrl(file)
      .then((dataUrl) => {
        setImagePreview(dataUrl);
        setImageError(null);
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('Failed to prepare product image:', error);
        setImagePreview(null);
        setImageError('Please upload an image under ~3.5 MB (after compression).');
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      });
  };

  const handleTriggerImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleRemoveImage = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setImagePreview(null);
    setImageError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleEditClick = (product: Product) => {
    setShowAddForm(true);
    setShowAddServiceForm(false);
    setEditingProduct(product);
    setFormState({
      ...initialForm,
      name: product.name,
      description: product.description ?? '',
      price: product.price ? String(product.price) : '',
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      stockStatus: product.inStock ? 'inStock' : 'outOfStock',
      unitType: (product.unitType as ProductUnitType) ?? 'piece',
      unitCustomLabel: product.unitCustomLabel ?? '',
      unitQuantity: product.unitQuantity != null ? String(product.unitQuantity) : '1',
      wholesaleEnabled: Boolean(product.wholesaleEnabled),
      wholesalePrice: product.wholesalePrice != null ? String(product.wholesalePrice) : '',
      wholesaleMinQty: product.wholesaleMinQty != null ? String(product.wholesaleMinQty) : '',
      minOrderQuantity: product.minOrderQuantity != null ? String(product.minOrderQuantity) : '',
      discountEnabled: Boolean(product.discountEnabled),
      discountPrice: product.discountPrice != null ? String(product.discountPrice) : '',
      discountScheduleEnabled: Boolean(product.discountScheduleEnabled),
      discountStartsAt: product.discountStartsAt ?? '',
      discountEndsAt: product.discountEndsAt ?? '',
    });
    setImagePreview(product.image || null);
    setFormError(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeletingProductId(productId);
    try {
      await deleteProduct(productId);
      setShowDeleteConfirm(null);
      if (editingProduct && editingProduct.id === productId) {
        handleResetProductForm();
        setShowAddForm(false);
      }
      await loadProducts();
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message || 'Unable to delete product');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to delete product');
      }
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleResetProductForm = () => {
    setFormState(initialForm);
    setImagePreview(null);
    setImageError(null);
    setEditingProduct(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.storeSlug) {
      setFormError('Create a store before adding products.');
      return;
    }

    if (!formState.name.trim() || !formState.price.trim()) {
      setFormError('Product name and price are required.');
      return;
    }

    setFormError(null);
    setFormSubmitting(true);

    try {
      const unitQuantityValue = Number(formState.unitQuantity);
      const payload = {
        title: formState.name.trim(),
        price: Number(formState.price),
        original_price: formState.originalPrice ? Number(formState.originalPrice) : undefined,
        description: formState.description.trim() || undefined,
        image: imagePreview ?? undefined,
        is_active: formState.stockStatus === 'inStock',
        unit_type: formState.unitType,
        unit_custom_label: formState.unitType === 'custom' ? formState.unitCustomLabel.trim() || null : null,
        unit_quantity: Number.isFinite(unitQuantityValue) && unitQuantityValue > 0 ? unitQuantityValue : null,
        wholesale_enabled: formState.wholesaleEnabled,
        wholesale_price:
          formState.wholesaleEnabled && formState.wholesalePrice
            ? Number(formState.wholesalePrice)
            : null,
        wholesale_min_qty:
          formState.wholesaleEnabled && formState.wholesaleMinQty
            ? Number(formState.wholesaleMinQty)
            : null,
        min_order_quantity: formState.minOrderQuantity ? Number(formState.minOrderQuantity) : undefined,
        discount_enabled: formState.discountEnabled,
        discount_price: formState.discountPrice ? Number(formState.discountPrice) : undefined,
        discount_schedule_enabled: formState.discountScheduleEnabled,
        discount_starts_at: formState.discountStartsAt || undefined,
        discount_ends_at: formState.discountEndsAt || undefined,
      } as const;

      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          ...payload,
        });
      } else {
        await addProduct(payload);
      }

      handleResetProductForm();
      setShowAddForm(false);
      await loadProducts();
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setFormError(err.message || 'Unable to add product');
      } else {
        setFormError(err instanceof Error ? err.message : 'Unable to add product');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleServiceImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setServiceImagePreview(null);
      setServiceImageError(null);
      return;
    }

    compressImageToDataUrl(file)
      .then((dataUrl) => {
        setServiceImagePreview(dataUrl);
        setServiceImageError(null);
        if (serviceImageInputRef.current) {
          serviceImageInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('Failed to prepare service image:', error);
        setServiceImagePreview(null);
        setServiceImageError('Please upload an image under ~3.5 MB (after compression).');
        if (serviceImageInputRef.current) {
          serviceImageInputRef.current.value = '';
        }
      });
  };

  const handleTriggerServiceImageUpload = () => {
    serviceImageInputRef.current?.click();
  };

  const handleRemoveServiceImage = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setServiceImagePreview(null);
    setServiceImageError(null);
    if (serviceImageInputRef.current) {
      serviceImageInputRef.current.value = '';
    }
  };

  const handleAddService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.storeSlug || !storeId) {
      setServiceFormError('Create a store before adding services.');
      return;
    }

    if (!serviceFormState.title.trim()) {
      setServiceFormError('Service title is required.');
      return;
    }

    if (serviceFormState.billingUnit === 'custom' && !serviceFormState.customBillingUnit.trim()) {
      setServiceFormError('Please provide a label for the custom billing unit.');
      return;
    }

    setServiceFormError(null);
    setServiceFormSubmitting(true);

    try {
      const minQuantityValue = serviceFormState.minQuantity ? Number(serviceFormState.minQuantity) : null;
      const packagePriceValue = serviceFormState.packagePrice ? Number(serviceFormState.packagePrice) : null;

      const billingUnit = serviceFormState.billingUnit;
      const customBillingUnit =
        billingUnit === 'custom' ? serviceFormState.customBillingUnit.trim() || null : null;

      await addService({
        store_id: storeId,
        title: serviceFormState.title.trim(),
        price: serviceFormState.price ? Number(serviceFormState.price) : undefined,
        description: serviceFormState.description.trim() || undefined,
        image: serviceImagePreview ?? undefined,
        is_active: serviceFormState.isActive,
        billing_unit: billingUnit,
        custom_billing_unit: customBillingUnit,
        min_quantity:
          minQuantityValue != null && !Number.isNaN(minQuantityValue) && minQuantityValue > 0
            ? minQuantityValue
            : null,
        package_price:
          packagePriceValue != null && !Number.isNaN(packagePriceValue) ? packagePriceValue : null,
      });

      setServiceFormState(initialServiceForm);
      setServiceImagePreview(null);
      setServiceImageError(null);
      setShowAddServiceForm(false);
      await loadProducts();
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setServiceFormError(err.message || 'Unable to add service');
      } else {
        setServiceFormError(err instanceof Error ? err.message : 'Unable to add service');
      }
    } finally {
      setServiceFormSubmitting(false);
    }
  };

  const liveCount = useMemo(() => products.filter((product) => product.inStock).length, [products]);
  const liveServicesCount = useMemo(() => services.filter((service) => service.isActive).length, [services]);

  return (
    <div className="space-y-6 md:space-y-8 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Products</h1>
          <p className="text-sm md:text-base text-gray-600">
            {isEditingProduct ? 'Editing product details' : 'Manage your product catalog'}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          <button
            onClick={() => {
              if (editingProduct) {
                handleResetProductForm();
                setShowAddServiceForm(false);
                setShowAddForm(true);
                return;
              }
              setShowAddServiceForm(false);
              setShowAddForm((prev) => !prev);
            }}
            disabled={!hasStore}
            className={`flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-semibold rounded-xl text-white shadow-sm transition sm:w-auto sm:px-4 md:px-6 md:py-3 md:text-base ${
              isEditingProduct
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-primary hover:bg-primary-700'
            } disabled:opacity-60`}
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{isEditingProduct ? 'Editing product' : 'Add Product'}</span>
            <span className="sm:hidden">{isEditingProduct ? 'Editing product' : 'Add Product'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (editingProduct) {
                handleResetProductForm();
              }
              setShowAddForm(false);
              setShowAddServiceForm((prev) => !prev);
            }}
            disabled={!hasStore}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 sm:w-auto sm:px-4 md:px-6 md:py-3 md:text-base"
          >
            <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Add Service</span>
            <span className="sm:hidden">Add Service</span>
          </button>
        </div>
      </div>

      {!hasStore && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            Create your store to start adding products. Head over to the Create Store page to get started.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">
                {isEditingProduct ? 'Update existing product' : 'Create new product'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {isEditingProduct ? `Editing: ${editingProduct?.name ?? ''}` : 'Add Product'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Keep the details short and clear so the form stays easy to use on mobile.</p>
            </div>
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Product setup
            </div>
          </div>

          <form onSubmit={handleAddProduct} className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-slate-700" htmlFor="product-image-input">
                  Product cover
                </label>
                <label
                  htmlFor="product-image-input"
                  className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-primary/30 bg-primary/5 px-4 py-5 text-center transition hover:border-primary hover:bg-primary/10"
                >
                  <div className="relative">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-[22px] border border-white object-cover shadow-md sm:h-28 sm:w-28" />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-md transition hover:bg-red-500 hover:text-white"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-primary shadow-sm sm:h-20 sm:w-20">
                        <ImageIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Upload product image</p>
                    <p className="text-[11px] leading-5 text-slate-500">Square JPG or PNG under 3.5MB.</p>
                  </div>
                </label>
                <input
                  id="product-image-input"
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imageError && <p className="text-sm text-red-600">{imageError}</p>}
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">Basic details</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">Product information</h3>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Name *</label>
                      <input
                        type="text"
                        value={formState.name}
                        onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                        placeholder="e.g., Modern Wooden Chair"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Price (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formState.price}
                          onChange={(event) => setFormState({ ...formState, price: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Original price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formState.originalPrice}
                          onChange={(event) => setFormState({ ...formState, originalPrice: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Description</label>
                      <textarea
                        rows={4}
                        value={formState.description}
                        onChange={(event) => setFormState({ ...formState, description: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                        placeholder="Highlight product features, materials, or usage in a few short lines."
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">Selling setup</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">Units and stock</h3>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Sell by *</label>
                      <select
                        value={formState.unitType}
                        onChange={(event) =>
                          setFormState({
                            ...formState,
                            unitType: event.target.value as ProductUnitType,
                            unitCustomLabel: '',
                          })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      >
                        {PRODUCT_UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Units included *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formState.unitQuantity}
                        onChange={(event) => setFormState({ ...formState, unitQuantity: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                        placeholder="e.g., 12"
                      />
                    </div>

                    {formState.unitType === 'custom' && (
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Custom unit label *</label>
                        <input
                          type="text"
                          value={formState.unitCustomLabel}
                          onChange={(event) => setFormState({ ...formState, unitCustomLabel: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                          placeholder="e.g., Bundle"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Inventory status</label>
                      <select
                        value={formState.stockStatus}
                        onChange={(event) => setFormState({ ...formState, stockStatus: event.target.value as ProductFormState['stockStatus'] })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      >
                        <option value="inStock">In Stock</option>
                        <option value="outOfStock">Out of Stock</option>
                      </select>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">Use unit details to explain how much quantity the buyer receives per order.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formState.wholesaleEnabled}
                      onChange={(event) =>
                        setFormState({
                          ...formState,
                          wholesaleEnabled: event.target.checked,
                          wholesalePrice: event.target.checked ? formState.wholesalePrice : '',
                          wholesaleMinQty: event.target.checked ? formState.wholesaleMinQty : '',
                        })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">Offer wholesale pricing</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Show a bulk price and minimum order quantity for larger buyers.</p>
                    </div>
                  </label>

                  {formState.wholesaleEnabled && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Wholesale price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formState.wholesalePrice}
                          onChange={(event) => setFormState({ ...formState, wholesalePrice: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                          placeholder="350.00"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Min qty</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={formState.wholesaleMinQty}
                          onChange={(event) => setFormState({ ...formState, wholesaleMinQty: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                          placeholder="20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-5 text-slate-500">Keep images light and text concise so the product card looks better on mobile and desktop.</div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => {
                    handleResetProductForm();
                    setShowAddForm(false);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isEditingProduct ? 'Cancel edit' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {formSubmitting ? (isEditingProduct ? 'Updating…' : 'Saving...') : isEditingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showAddServiceForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Create new service</p>
              <h2 className="text-xl font-semibold text-gray-900">Add Service</h2>
            </div>
            <div className="rounded-full bg-gray-100 p-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <form onSubmit={handleAddService} className="space-y-4">
            <div className="mx-auto w-full sm:w-2/3">
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="service-image-input">Service cover photo</label>
              <label
                htmlFor="service-image-input"
                className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/40 bg-primary/5 px-6 py-6 text-center transition hover:border-primary hover:bg-primary/10"
              >
                <div className="relative">
                  {serviceImagePreview ? (
                    <>
                      <img src={serviceImagePreview} alt="Preview" className="h-32 w-32 rounded-3xl object-cover border border-white shadow-lg" />
                      <button
                        type="button"
                        onClick={handleRemoveServiceImage}
                        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg transition hover:bg-red-500 hover:text-white"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-primary shadow-md">
                      <ImageIcon className="h-9 w-9" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-slate-900">Upload service photo</p>
                  <p className="hidden text-[11px] text-slate-500 sm:block">PNG/JPG up to 3.5MB.</p>
                </div>
                <span className="hidden rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-primary shadow-sm sm:inline-block">Drag & drop coming soon</span>
              </label>
              <input
                id="service-image-input"
                ref={serviceImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleServiceImageChange}
                className="hidden"
              />
              {serviceImageError && <p className="mt-2 text-sm text-red-600">{serviceImageError}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  value={serviceFormState.title}
                  onChange={(event) => setServiceFormState({ ...serviceFormState, title: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Bridal Makeup Session"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceFormState.price}
                  onChange={(event) => setServiceFormState({ ...serviceFormState, price: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="1200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Billing unit *</label>
                <select
                  value={serviceFormState.billingUnit}
                  onChange={(event) =>
                    setServiceFormState({
                      ...serviceFormState,
                      billingUnit: event.target.value as ServiceBillingUnit,
                      customBillingUnit: '',
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {SERVICE_BILLING_UNITS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {serviceFormState.billingUnit === 'custom' && (
                <div className="md:col-span-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Custom unit label *</label>
                  <input
                    type="text"
                    value={serviceFormState.customBillingUnit}
                    onChange={(event) =>
                      setServiceFormState({ ...serviceFormState, customBillingUnit: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., Complete project"
                  />
                </div>
              )}

              <div className="md:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Minimum booking qty</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={serviceFormState.minQuantity}
                  onChange={(event) => setServiceFormState({ ...serviceFormState, minQuantity: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., 2"
                />
                <p className="mt-1 text-xs text-gray-500">Buyers must book at least this many units.</p>
              </div>

              <div className="md:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Package price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceFormState.packagePrice}
                  onChange={(event) => setServiceFormState({ ...serviceFormState, packagePrice: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., 5000"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={4}
                value={serviceFormState.description}
                onChange={(event) => setServiceFormState({ ...serviceFormState, description: event.target.value })}
                className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Share what makes this service unique."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Visibility</label>
              <select
                value={serviceFormState.isActive ? 'active' : 'inactive'}
                onChange={(event) => setServiceFormState({ ...serviceFormState, isActive: event.target.value === 'active' })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Hidden</option>
              </select>
            </div>

            {serviceFormError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serviceFormError}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500">Add services from this page without opening a new screen.</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddServiceForm(false);
                    setServiceFormState(initialServiceForm);
                    setServiceImagePreview(null);
                    setServiceImageError(null);
                    setServiceFormError(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={serviceFormSubmitting}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-50"
                >
                  {serviceFormSubmitting ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {products.length} total products
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {liveCount} live
          </span>
          <span className="hidden items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 md:inline-flex">
            {services.length} services
          </span>
        </div>

        <div className="md:hidden flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setListFilter('products')}
            className={`flex-1 rounded-full px-3 py-1 border ${listFilter === 'products' ? 'border-primary text-primary bg-primary/10' : 'border-gray-200 text-gray-500'}`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setListFilter('services')}
            className={`flex-1 rounded-full px-3 py-1 border ${listFilter === 'services' ? 'border-primary text-primary bg-primary/10' : 'border-gray-200 text-gray-500'}`}
          >
            Services
          </button>
        </div>

        {listFilter === 'products' ? (
          <div className="space-y-1 md:hidden">
            {products.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-6 text-center text-xs text-gray-500">
                No products yet. Add your first product to see it here.
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="rounded-2xl border border-gray-100 bg-white px-1.5 py-1.5 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h3 className="truncate text-[12px] font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-[9px] text-gray-500">{product.category || 'Uncategorized'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-[7px] font-semibold ${product.inStock ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {product.inStock ? 'Live' : 'Hidden'}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleEditClick(product)}
                              className="rounded-full border border-gray-200 p-0.5 text-gray-600 hover:bg-gray-50"
                              aria-label="Edit product"
                            >
                              <Edit className="w-2 h-2" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ id: product.id, name: product.name })}
                              className="rounded-full border border-gray-200 p-0.5 text-red-500 hover:bg-red-50"
                              aria-label="Delete product"
                            >
                              <Trash2 className="w-2 h-2" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="mt-0 text-[10px] font-semibold text-gray-900">₹{product.price}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1 md:hidden">
            {services.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-6 text-center text-xs text-gray-500">
                No services yet. Add one to see it here.
              </div>
            ) : (
              services.map((service) => (
                <div key={service.id} className="rounded-2xl border border-gray-100 bg-white px-1.5 py-1.5 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
                      {service.image ? (
                        <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h3 className="truncate text-[12px] font-semibold text-gray-900">{service.title}</h3>
                          <p className="text-[9px] text-gray-500 line-clamp-1">{service.description || 'Service'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-[7px] font-semibold ${service.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {service.isActive ? 'Live' : 'Hidden'}
                          </span>
                                <div className="flex items-center gap-0.5">
                            <button className="rounded-full border border-gray-200 p-0.5 text-gray-600 hover:bg-gray-50" aria-label="Edit service">
                              <Edit className="w-2 h-2" />
                            </button>
                            <button className="rounded-full border border-gray-200 p-0.5 text-red-500 hover:bg-red-50" aria-label="Delete service">
                              <Trash2 className="w-2 h-2" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="mt-0 text-[10px] font-semibold text-gray-900">
                        {service.price != null ? `₹${service.price}` : 'Custom quote'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>Product</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div>
          {products.map((product) => (
            <div
              key={product.id}
              className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                  <p className="truncate text-xs text-gray-500">{product.description || 'No description'}</p>
                </div>
              </div>

              <p className="truncate text-sm text-gray-700">{product.category || 'Uncategorized'}</p>
              <p className="text-sm font-semibold text-gray-900">₹{product.price}</p>
              <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {product.inStock ? 'Live' : 'Hidden'}
              </span>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleEditClick(product)}
                  className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                  aria-label="Edit product"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm({ id: product.id, name: product.name })}
                  className="rounded-full border border-gray-200 p-2 text-red-500 hover:bg-red-50"
                  aria-label="Delete product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {!products.length && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">No products yet</h3>
            <p className="mt-2 text-sm text-gray-600">Add your first product to start showcasing your catalog.</p>
            <button
              onClick={() => {
                setShowAddServiceForm(false);
                setShowAddForm(true);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 hidden md:block">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {services.length} services
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {liveServicesCount} live
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Services</p>
              <h3 className="text-lg font-semibold text-gray-900">Added services</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (editingProduct) {
                  handleResetProductForm();
                }
                setShowAddForm(false);
                setShowAddServiceForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Briefcase className="h-4 w-4" />
              Add Service
            </button>
          </div>

          {!services.length && !loading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-600">No services added yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Service</span>
                <span>Price</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              <div>
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                        {service.image ? (
                          <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{service.title}</p>
                        <p className="truncate text-xs text-gray-500">{service.description || 'No description'}</p>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-gray-900">
                      {service.price != null ? `₹${service.price}` : 'Custom quote'}
                    </p>
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${service.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                      {service.isActive ? 'Live' : 'Hidden'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" aria-label="Edit service">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="rounded-full border border-gray-200 p-2 text-red-500 hover:bg-red-50" aria-label="Delete service">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete product</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to remove <span className="font-semibold">{showDeleteConfirm.name}</span> from your catalog?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                disabled={Boolean(deletingProductId)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(showDeleteConfirm.id)}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-60"
                disabled={Boolean(deletingProductId)}
              >
                {deletingProductId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
