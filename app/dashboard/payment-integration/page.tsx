"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CreditCard,
  Loader2,
  MessageCircle,
  Phone,
  QrCode,
  Store as StorefrontIcon,
  Trash2,
} from "lucide-react";
import {
  getStoredUser,
  getStoreBySlugFromApi,
  getStorePaymentIntegration,
  updateStorePaymentIntegration,
} from "@/src/lib/api";
import {
  dispatchStoreProfileRefresh,
  storeHasSubscriptionAddonAccess,
} from "@/src/lib/storeSubscriptionAddons";
import type { Store, StorePaymentIntegrationSettings } from "@/types";

const HELP_COPY =
  "Need help connecting Razorpay or finishing UPI setup? Message us on WhatsApp and our team will assist you.";

export default function PaymentIntegrationPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<StorePaymentIntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<"qr" | "pg" | null>(null);

  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);

  const loadSettings = useCallback(async (storeId: string) => {
    setSettingsLoading(true);
    setSaveError(null);
    try {
      const s = await getStorePaymentIntegration(storeId);
      setSettings(s);
      setRazorpayKeyId(s.razorpayKeyId ?? "");
      setRazorpaySecret("");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not load payment settings.");
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const user = getStoredUser();
        if (!user?.storeSlug) {
          setError("No store linked to this account.");
          return;
        }
        const s = await getStoreBySlugFromApi(user.storeSlug);
        if (!cancelled) {
          setStore(s);
          setError(null);
          await loadSettings(s.id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load your store.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSettings]);

  const hasAccess = store != null && storeHasSubscriptionAddonAccess(store);

  useEffect(() => {
    if (!loading && store != null && !storeHasSubscriptionAddonAccess(store)) {
      router.replace("/dashboard/subscription");
    }
  }, [loading, store, router]);

  const addons = settings?.subscriptionAddons ?? store?.subscriptionAddons;
  const showPg = Boolean(addons?.paymentGateway);
  const showQr = Boolean(addons?.qrCode);
  const showHelp = Boolean(addons?.paymentGatewayHelp);

  const handleSaveQr = async () => {
    if (!store) return;
    if (!qrFile) {
      setSaveError("Choose an image file for your payment QR.");
      return;
    }
    setSavingSection("qr");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("payment_qr", qrFile);
      const next = await updateStorePaymentIntegration(store.id, fd);
      setSettings(next);
      setQrFile(null);
      setSaveMessage("QR code saved.");
      dispatchStoreProfileRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleRemoveQr = async () => {
    if (!store) return;
    setSavingSection("qr");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("remove_payment_qr", "1");
      const next = await updateStorePaymentIntegration(store.id, fd);
      setSettings(next);
      setQrFile(null);
      setSaveMessage("QR code removed.");
      dispatchStoreProfileRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not remove QR.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveRazorpay = async () => {
    if (!store) return;
    if (!razorpayKeyId.trim()) {
      setSaveError("Enter your Razorpay Key ID.");
      return;
    }
    if (!settings?.hasRazorpaySecret && !razorpaySecret.trim()) {
      setSaveError("Enter your Razorpay Key Secret (it is stored encrypted and never shown again).");
      return;
    }
    setSavingSection("pg");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("razorpay_key_id", razorpayKeyId.trim());
      if (razorpaySecret.trim()) {
        fd.append("razorpay_key_secret", razorpaySecret.trim());
      }
      const next = await updateStorePaymentIntegration(store.id, fd);
      setSettings(next);
      setRazorpaySecret("");
      setSaveMessage("Razorpay keys saved.");
      dispatchStoreProfileRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleClearSecret = async () => {
    if (!store) return;
    setSavingSection("pg");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("clear_razorpay_secret", "1");
      const next = await updateStorePaymentIntegration(store.id, fd);
      setSettings(next);
      setRazorpaySecret("");
      setSaveMessage("API secret cleared.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not clear secret.");
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white px-6 py-20 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600">Loading payment settings…</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="max-w-lg rounded-2xl border border-red-200/90 bg-red-50/90 px-6 py-5 text-red-900 shadow-sm ring-1 ring-red-900/5">
        <p className="text-sm font-semibold">Something went wrong</p>
        <p className="mt-1 text-sm text-red-800/90">{error ?? "Store not found."}</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-6 py-16 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-600">Opening subscription…</p>
      </div>
    );
  }

  if (!showPg && !showQr && !showHelp) {
    return (
      <div className="max-w-xl rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-8 shadow-md ring-1 ring-amber-900/5">
        <p className="text-base font-semibold text-amber-950">No payment add-ons enabled</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/85">
          Turn on payment gateway, QR code, or assisted setup on the subscription page, then return here.
        </p>
      </div>
    );
  }

  const enabledPill = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 lg:px-3">
      <Check className="h-3 w-3" strokeWidth={2.5} />
      Enabled
    </span>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-8 sm:space-y-8 sm:pb-12 xl:max-w-6xl 2xl:max-w-7xl">
      {/* Page header — desktop: split hero + elevated store card */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] sm:rounded-3xl lg:shadow-lg lg:shadow-slate-900/[0.05]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_100%_0%,rgba(99,102,241,0.1),transparent_50%),radial-gradient(700px_circle_at_0%_100%,rgba(14,165,233,0.07),transparent_45%),linear-gradient(105deg,rgba(255,255,255,0)_0%,rgba(99,102,241,0.03)_45%,rgba(255,255,255,0)_70%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" aria-hidden />
        <div className="relative px-4 py-6 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0 max-w-2xl lg:max-w-2xl lg:flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600/90">Payments</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl lg:text-4xl lg:tracking-tight">
                Payment settings
              </h1>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600 sm:text-[15px] lg:text-base lg:leading-relaxed">
                Only the options you enabled at subscription time appear here. Upload your UPI QR and/or enter Razorpay
                credentials; assisted setup opens WhatsApp to our team.
              </p>
            </div>
            <div className="w-full shrink-0 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-4 text-left shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03] backdrop-blur-sm sm:w-auto sm:px-5 sm:py-4 lg:w-[min(100%,20rem)] lg:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-900/20 lg:h-11 lg:w-11">
                  <StorefrontIcon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Store</p>
                  <p className="mt-1 break-words text-base font-semibold tracking-tight text-slate-900 lg:text-lg">
                    {store.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {(saveMessage || saveError || settingsLoading) && (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start lg:items-stretch lg:gap-4">
          {saveMessage && (
            <div className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-3 shadow-sm ring-1 ring-emerald-900/5 sm:min-w-[240px] sm:px-4 lg:rounded-2xl lg:px-5 lg:py-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <p className="min-w-0 break-words text-sm font-medium leading-snug text-emerald-950">{saveMessage}</p>
            </div>
          )}
          {saveError && (
            <div className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl border border-red-200/80 bg-red-50/90 px-3 py-3 shadow-sm ring-1 ring-red-900/5 sm:min-w-[240px] sm:px-4 lg:rounded-2xl lg:px-5 lg:py-4">
              <p className="min-w-0 break-words text-sm font-medium leading-snug text-red-900">{saveError}</p>
            </div>
          )}
          {settingsLoading && (
            <div className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 text-sm font-medium text-slate-600 shadow-sm sm:px-4 lg:px-5 lg:py-4">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600" />
              <span className="min-w-0 break-words">Loading saved settings…</span>
            </div>
          )}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8 xl:gap-10">
        {showPg && (
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.03] lg:rounded-3xl lg:shadow-lg lg:shadow-slate-900/[0.04]">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/40 via-slate-50/90 to-white px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-6 lg:px-8 lg:py-5">
              <div className="flex min-w-0 gap-3 lg:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-900/25 lg:h-12 lg:w-12 lg:rounded-2xl">
                  <CreditCard className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />
                </div>
                <div className="min-w-0 pt-0.5 lg:pt-1">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg lg:text-xl">Razorpay payment gateway</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm lg:mt-2 lg:max-w-prose lg:text-[15px] lg:leading-relaxed">
                    Paste your Razorpay Key ID and Key Secret from the Razorpay Dashboard. The secret is stored encrypted
                    on the server and never shown again after save.
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-start sm:self-auto">{enabledPill}</div>
            </div>
            <div className="space-y-4 p-4 sm:p-6 lg:space-y-0 lg:p-8">
              <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-6">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key ID</label>
                  <input
                    type="text"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    autoComplete="off"
                    className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 sm:min-h-0 sm:py-2.5 sm:text-sm lg:py-3"
                    placeholder="rzp_live_… or rzp_test_…"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key secret</label>
                  <input
                    type="password"
                    value={razorpaySecret}
                    onChange={(e) => setRazorpaySecret(e.target.value)}
                    autoComplete="new-password"
                    className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 sm:min-h-0 sm:py-2.5 sm:text-sm lg:py-3"
                    placeholder={
                      settings?.hasRazorpaySecret ? "Leave blank to keep existing secret, or enter a new one" : "Required on first save"
                    }
                  />
                  {settings?.hasRazorpaySecret && (
                    <p className="mt-2 text-xs leading-relaxed text-emerald-800/90 lg:mt-3">
                      A secret is already saved. Enter a new value only if you want to replace it.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap lg:mt-8 lg:flex-row lg:items-center lg:justify-end lg:gap-3 lg:rounded-2xl lg:border lg:border-slate-100 lg:bg-slate-50/50 lg:px-5 lg:py-4">
                <button
                  type="button"
                  disabled={savingSection !== null}
                  onClick={handleSaveRazorpay}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-900/15 transition hover:bg-indigo-700 disabled:opacity-55 sm:w-auto lg:min-h-10 lg:px-6 lg:py-2.5"
                >
                  {savingSection === "pg" ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save gateway keys"
                  )}
                </button>
                {settings?.hasRazorpaySecret && (
                  <button
                    type="button"
                    disabled={savingSection !== null}
                    onClick={handleClearSecret}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-55 sm:w-auto lg:min-h-10 lg:px-5"
                  >
                    Clear secret only
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {showQr && (
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.03] lg:rounded-3xl lg:shadow-lg lg:shadow-slate-900/[0.04]">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/35 via-slate-50/90 to-white px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-6 lg:px-8 lg:py-5">
              <div className="flex min-w-0 gap-3 lg:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-900/25 lg:h-12 lg:w-12 lg:rounded-2xl">
                  <QrCode className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />
                </div>
                <div className="min-w-0 pt-0.5 lg:pt-1">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg lg:text-xl">QR code payments</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm lg:mt-2 lg:max-w-prose lg:text-[15px] lg:leading-relaxed">
                    Upload a clear image of your static UPI / payment QR. PNG or JPG, up to 4&nbsp;MB.
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-start sm:self-auto">{enabledPill}</div>
            </div>
            <div
              className={
                settings?.paymentQrUrl && !qrFile
                  ? "space-y-4 p-4 sm:p-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0 lg:p-8"
                  : "space-y-4 p-4 sm:p-6 lg:p-8"
              }
            >
              {settings?.paymentQrUrl && !qrFile && (
                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 lg:flex lg:flex-col lg:justify-center lg:p-5">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Current QR</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.paymentQrUrl}
                    alt="Saved payment QR"
                    className="mx-auto max-h-52 max-w-full rounded-lg border border-white object-contain shadow-sm lg:max-h-64"
                  />
                </div>
              )}
              <div className="min-w-0 space-y-4 lg:flex lg:flex-col lg:justify-center">
                <div className="min-w-0">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Upload QR image</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
                    className="mt-2 block w-full min-w-0 max-w-full text-xs text-slate-700 file:mr-2 file:cursor-pointer file:rounded-xl file:border-0 file:bg-indigo-600 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-white file:shadow-sm file:transition hover:file:bg-indigo-700 sm:file:mr-3 sm:file:px-4 sm:file:text-sm lg:file:py-3"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap lg:justify-end">
                  <button
                    type="button"
                    disabled={savingSection !== null || !qrFile}
                    onClick={handleSaveQr}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-900/15 transition hover:bg-indigo-700 disabled:opacity-55 sm:w-auto lg:min-h-10 lg:px-6"
                  >
                    {savingSection === "qr" && qrFile ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      "Save QR code"
                    )}
                  </button>
                  {settings?.paymentQrUrl && (
                    <button
                      type="button"
                      disabled={savingSection !== null}
                      onClick={handleRemoveQr}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-55 sm:w-auto lg:min-h-10 lg:px-5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove QR
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {showHelp && (
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.03] lg:col-span-2 lg:rounded-3xl lg:shadow-lg lg:shadow-slate-900/[0.04]">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-indigo-50/25 to-indigo-50/40 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 lg:px-10 lg:py-6">
              <div className="flex min-w-0 gap-3 lg:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-md lg:h-12 lg:w-12 lg:rounded-2xl">
                  <Building2 className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />
                </div>
                <div className="min-w-0 pt-0.5 lg:max-w-3xl lg:pt-1">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg lg:text-xl">Company-assisted gateway setup</h2>
                  <p className="mt-2 break-words text-sm leading-relaxed text-slate-700 lg:mt-3 lg:text-[15px] lg:leading-relaxed">
                    {HELP_COPY}
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-start sm:self-auto">{enabledPill}</div>
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:gap-4 sm:p-6 lg:flex-row lg:items-center lg:justify-end lg:gap-5 lg:px-10 lg:py-8">
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4 lg:w-auto lg:justify-end">
                <a
                  href={settings?.helpWhatsappUrl || "https://wa.me/917015150181"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:brightness-[0.98] active:scale-[0.99] sm:w-auto lg:min-h-10 lg:px-7"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  <span className="text-center">WhatsApp — 70151 50181</span>
                </a>
                <a
                  href="tel:+917015150181"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:w-auto lg:min-h-10 lg:px-7"
                >
                  <Phone className="h-5 w-5 shrink-0 text-indigo-600" />
                  Call
                </a>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
