"use client";

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Ban, Loader2, RefreshCcw, Phone, MapPin, Store as StoreIcon, Calendar, CreditCard, X, Clock, Eye, Pencil, Trash2, Zap, AlertCircle, Search, Filter } from 'lucide-react';
import { getAllStores, updateStore, getStoreSubscription, cancelStoreSubscription, deleteStore } from '@/src/lib/api';
import type { Store, StoreSubscription } from '@/types';

interface StoreWithSubscription extends Store {
  subscription?: StoreSubscription | null;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreWithSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'boosted' | 'banned'>('all');

  const fetchStores = async () => {
    setLoading(true);
    try {
      console.log('Fetching stores...');
      const data = await getAllStores({ limit: 100 });
      console.log('Stores fetched:', data.length, 'stores');
      console.log('First store:', data[0]);
      
      const storesWithSubscriptions = await Promise.all(
        data.map(async (store) => {
          try {
            const subData = await getStoreSubscription(store.id);
            return { ...store, subscription: subData.activeSubscription || null };
          } catch {
            return { ...store, subscription: null };
          }
        })
      );
      
      console.log('Stores with subscriptions:', storesWithSubscriptions.length);
      setStores(storesWithSubscriptions);
    } catch (error) {
      console.error('Failed to load stores:', error);
      setMessage({ text: 'Failed to load stores.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (store: Store) => {
    if (!confirm(`Delete ${store.name}? This action cannot be undone.`)) return;
    setActionId(store.id);
    try {
      await deleteStore(store.id);
      setMessage({ text: `${store.name} deleted successfully.`, type: 'success' });
      await fetchStores();
      setSelectedStore((current) => (current?.id === store.id ? null : current));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to delete store.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleVerify = async (store: Store) => {
    setActionId(store.id);
    try {
      await updateStore({ id: store.id, is_verified: !store.isVerified });
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, isVerified: !s.isVerified } : s)));
      setMessage({ text: `${store.name} ${store.isVerified ? 'unverified' : 'verified'} successfully.`, type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Action failed.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEdit = (store: Store) => {
    // Navigate to store edit page or open edit modal
    // For now, show a message that edit functionality is coming soon
    setMessage({ text: `Edit functionality for ${store.name} coming soon!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleBan = async (store: Store) => {
    console.log('Ban function called with store:', store);
    
    // Safety checks
    if (!store || !store.id) {
      console.error('Invalid store data:', store);
      setMessage({ text: 'Invalid store data.', type: 'error' });
      return;
    }
    
    const storeName = store.name?.trim() || 'Unknown Store';
    const isActive = store.isActive;
    
    console.log('Banning store:', { storeName, isActive, storeId: store.id });
    
    if (!confirm(`Are you sure you want to ${isActive ? 'ban' : 'unban'} ${storeName}?`)) return;
    
    setActionId(store.id);
    try {
      await updateStore({ id: store.id, is_active: !isActive });
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, isActive: !isActive } : s)));
      setMessage({ text: `${storeName} ${isActive ? 'banned' : 'unbanned'} successfully.`, type: 'success' });
    } catch (err) {
      console.error('Ban error:', err);
      setMessage({ text: err instanceof Error ? err.message : 'Action failed.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    
    setSubscriptionLoading(true);
    try {
      await cancelStoreSubscription(subscriptionId);
      setMessage({ text: 'Subscription cancelled successfully.', type: 'success' });
      await fetchStores();
      setSelectedStore(null);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to cancel subscription.', type: 'error' });
    } finally {
      setSubscriptionLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const normalizedSearch = (searchTerm ?? '').trim().toLowerCase();

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((store) => {
      if (store.categoryName) {
        set.add(store.categoryName);
      } else if (store.businessType) {
        set.add(store.businessType);
      }
    });
    return Array.from(set).sort();
  }, [stores]);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch = normalizedSearch
        ? [
            store.name,
            store.username,
            store.businessType,
            store.categoryName,
            store.location,
            store.user?.name,
            store.user?.email,
          ]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(normalizedSearch))
        : true;

      const matchesCategory =
        categoryFilter === 'all' ||
        store.categoryName === categoryFilter ||
        store.businessType === categoryFilter;

      const matchesStatus = (() => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'verified') return Boolean(store.isVerified);
        if (statusFilter === 'boosted') return Boolean(store.isBoosted || store.activeBoost);
        if (statusFilter === 'banned') return store.isActive === false;
        return true;
      })();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stores, normalizedSearch, categoryFilter, statusFilter]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stores Management</h1>
          <p className="text-gray-600">Manage all stores, subscriptions, and details</p>
        </div>
        <button
          onClick={fetchStores}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by store, owner, location..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex gap-3 lg:col-span-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All statuses</option>
              <option value="verified">Verified</option>
              <option value="boosted">Boosted</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products/Services</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boost Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStores.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-sm text-gray-500">
                      No stores match the current search or filters.
                    </td>
                  </tr>
                )}
                {filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-mono text-gray-500">#{store.id}</span>
                        {store.userId && (
                          <span className="text-xs font-mono text-gray-400">U:{store.userId}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <div className="font-medium text-gray-900">{store.name}</div>
                          <div className="text-sm text-gray-500">@{store.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{store.categoryName || store.businessType}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                          {store.productsCount || 0}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          {store.servicesCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {store.user ? (
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-gray-900">{store.user.name}</div>
                          <div className="text-xs text-gray-500">{store.user.email}</div>
                          <div className="text-xs font-mono text-gray-400">ID: {store.user.id}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No user data</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        {store.phone && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <Phone className="w-3 h-3" />
                            {store.phone}
                          </div>
                        )}
                        {store.whatsapp && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Phone className="w-3 h-3" />
                            {store.whatsapp}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1 text-sm text-gray-700">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{store.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {store.subscription ? (
                        <span className="font-medium text-gray-900">{store.subscription.plan.name}</span>
                      ) : (
                        <span className="text-sm text-gray-400">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {store.activeBoost ? (
                        <span className="font-medium text-gray-900">{store.activeBoost.plan.name}</span>
                      ) : (
                        <span className="text-sm text-gray-400">No boost</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {store.isActive !== false && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full w-fit">Active</span>
                        )}
                        {store.isVerified && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full inline-flex items-center gap-1 w-fit">
                            <BadgeCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {store.isBoosted && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full w-fit">Boosted</span>
                        )}
                        {store.isActive === false && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full w-fit">Banned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedStore(store)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleVerify(store)}
                          disabled={actionId === store.id}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                          title={store.isVerified ? 'Unverify' : 'Verify'}
                        >
                          {actionId === store.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleBan(store)}
                          disabled={actionId === store.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title={store.isActive === false ? 'Unban' : 'Ban'}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(store)}
                          disabled={actionId === store.id}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          title="Delete store"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Store Details</h2>
              <button
                onClick={() => setSelectedStore(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <img src={selectedStore.logo} alt={selectedStore.name} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedStore.name}</h3>
                  <p className="text-gray-600">@{selectedStore.username}</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedStore.businessType}</p>
                </div>
              </div>

              {selectedStore.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">{selectedStore.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact
                  </h4>
                  <div className="space-y-1 text-sm">
                    {selectedStore.phone && <p className="text-gray-600">Phone: {selectedStore.phone}</p>}
                    {selectedStore.whatsapp && <p className="text-green-600">WhatsApp: {selectedStore.whatsapp}</p>}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </h4>
                  <p className="text-gray-600 text-sm">{selectedStore.location}</p>
                </div>
              </div>

              {selectedStore.subscription ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Active Subscription
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Plan</span>
                      <span className="font-semibold text-gray-900">{selectedStore.subscription.plan.name}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="font-semibold text-gray-900">₹{selectedStore.subscription.price}/{selectedStore.subscription.plan.billingCycle}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Max Products</span>
                      <span className="font-semibold text-gray-900">{selectedStore.subscription.plan.maxProducts}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedStore.subscription.status)}`}>
                        {selectedStore.subscription.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Start Date
                      </span>
                      <span className="font-medium text-gray-900">{formatDate(selectedStore.subscription.startsAt)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        End Date
                      </span>
                      <span className="font-medium text-gray-900">{formatDate(selectedStore.subscription.endsAt)}</span>
                    </div>

                    {selectedStore.subscription.plan.features && selectedStore.subscription.plan.features.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900 mb-2 block">Features</span>
                        <ul className="space-y-1">
                          {selectedStore.subscription.plan.features.map((feature, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedStore.subscription.status === 'active' && (
                      <div className="pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleCancelSubscription(selectedStore.subscription!.id)}
                          disabled={subscriptionLoading}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {subscriptionLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Cancel Subscription
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                  <p className="text-gray-500">No active subscription</p>
                </div>
              )}

              <div className="flex gap-3">
                <a
                  href={`/store/${selectedStore.username}`}
                  target="_blank"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition text-center"
                >
                  View Store Page
                </a>
                <button
                  onClick={() => setSelectedStore(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
