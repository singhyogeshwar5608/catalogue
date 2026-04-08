'use client';

const LOCATION_STORAGE_KEY = 'catelog-location';
const NOMINATIM_EMAIL = process.env.NEXT_PUBLIC_NOMINATIM_EMAIL ?? 'support@catelog.app';

const buildNominatimUrl = (path: 'search' | 'reverse', params: Record<string, string | number>) => {
  const searchParams = new URLSearchParams({
    ...Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {}),
    email: NOMINATIM_EMAIL,
  });
  return `https://nominatim.openstreetmap.org/${path}?${searchParams.toString()}`;
};

type LocationSource = 'ip' | 'browser' | 'manual';

export type StoredLocation = {
  label: string;
  latitude: number;
  longitude: number;
  source: LocationSource;
  updatedAt: string;
};

export type PinLookupResult = {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  locality?: string;
};

export const lookupPinCode = async (pinCode: string): Promise<PinLookupResult | null> => {
  const normalized = pinCode.replace(/[^0-9]/g, '').slice(0, 6);
  if (!/^[0-9]{6}$/.test(normalized)) {
    return null;
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`);
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as Array<{
      Status?: string;
      PostOffice?: Array<{
        Name?: string;
        District?: string;
        State?: string;
        Block?: string;
        Division?: string;
        Region?: string;
        Circle?: string;
        Country?: string;
      }>;
    }>;
    const entry = payload?.[0];
    if (!entry || entry.Status !== 'Success' || !entry.PostOffice?.length) {
      return null;
    }
    const office = entry.PostOffice[0];
    return {
      city: office.Block || office.Division || office.Region || office.District,
      district: office.District || office.Region || office.Circle,
      state: office.State,
      country: office.Country,
      locality: office.Name,
    } satisfies PinLookupResult;
  } catch (error) {
    console.warn('PIN lookup failed', error);
    return null;
  }
};

export type LocationSuggestion = {
  label: string;
  city: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
};

const isBrowser = () => typeof window !== 'undefined';

export const loadStoredLocation = (): StoredLocation | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocation;
    if (
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.label === 'string'
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn('Unable to parse stored location', error);
  }
  return null;
};

export const persistStoredLocation = (value: StoredLocation | null) => {
  if (!isBrowser()) return;
  try {
    if (!value) {
      window.localStorage.removeItem(LOCATION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to persist stored location', error);
  }
};

export const fetchIpLocation = async (): Promise<StoredLocation | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }
    const label = data.city || data.region || data.country_name || 'India';
    return {
      label,
      latitude,
      longitude,
      source: 'ip',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('IP geolocation failed', error);
    return null;
  }
};

export const geocodePlace = async (query: string): Promise<{ label: string; latitude: number; longitude: number } | null> => {
  if (!query.trim()) return null;
  const url = buildNominatimUrl('search', {
    format: 'json',
    q: query,
    limit: 1,
    addressdetails: 1,
  });
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const results = (await response.json()) as Array<{ display_name: string; lat: string; lon: string; address?: Record<string, string> }>;
    const match = results?.[0];
    if (!match) {
      return null;
    }
    const latitude = Number(match.lat);
    const longitude = Number(match.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }
    const city = normalizeCityName(match.address, match.display_name.split(',')[0]?.trim() ?? query);
    const state = match.address?.state || match.address?.region;
    const label = state ? `${city}, ${state}` : city;
    return {
      label,
      latitude,
      longitude,
    };
  } catch (error) {
    console.warn('Geocoding failed', error);
    return null;
  }
};

export const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  const url = buildNominatimUrl('reverse', {
    format: 'json',
    lat: latitude,
    lon: longitude,
  });
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { address?: Record<string, string>; display_name?: string };
    if (data?.address) {
      const { city, town, village, state, county } = data.address as Record<string, string>;
      const locality = city || town || village || county;
      if (locality) {
        return state ? `${locality}, ${state}` : locality;
      }
    }
    return data?.display_name ?? null;
  } catch (error) {
    console.warn('Reverse geocoding failed', error);
    return null;
  }
};

const normalizeCityName = (address: Record<string, string> | undefined, fallback: string) => {
  if (!address) return fallback;
  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.county ||
    fallback
  );
};

const normalizeDistrictName = (address: Record<string, string> | undefined) => {
  if (!address) return undefined;
  return address.county || address.state_district || address.city_district || address.suburb;
};

export const searchLocations = async (query: string, limit = 5, signal?: AbortSignal): Promise<LocationSuggestion[]> => {
  if (!query.trim()) return [];
  const url = buildNominatimUrl('search', {
    format: 'json',
    addressdetails: 1,
    limit,
    q: query,
  });
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal,
    });
    if (!response.ok) {
      return [];
    }
    const results = (await response.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
    }>;

    return results
      .map((result) => {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          return null;
        }
        const city = normalizeCityName(result.address, result.display_name.split(',')[0]?.trim() ?? query);
        const district = normalizeDistrictName(result.address);
        const state = result.address?.state ?? result.address?.region;
        const suggestion: LocationSuggestion = {
          label: result.display_name,
          city,
          district,
          state,
          latitude,
          longitude,
        };
        return suggestion;
      })
      .filter((value): value is LocationSuggestion => Boolean(value));
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return [];
    }
    console.warn('Location suggestions failed', error);
    return [];
  }
};

export type LocationStateSnapshot = {
  label: string;
  latitude: number;
  longitude: number;
  source: LocationSource;
};

export const extractCityTokens = (label?: string | null): string[] => {
  if (!label) return [];
  return label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

export const removeSectorTokens = (tokens: string[]) => tokens.filter((token) => !/sector/i.test(token));

export const dedupeTokens = (tokens: string[]) => {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    const key = token.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const getCityLabel = (label?: string | null): string => {
  const tokens = extractCityTokens(label);
  if (tokens.length === 0) {
    return label ?? 'Set location';
  }

  const filtered = removeSectorTokens(tokens);
  return filtered[0] ?? tokens[0];
};

export const getStateFromLabel = (label?: string | null): string | null => {
  const tokens = extractCityTokens(label);
  if (tokens.length === 0) {
    return null;
  }

  const filtered = dedupeTokens(removeSectorTokens(tokens));
  if (filtered.length === 0) {
    return null;
  }

  // Typically the last token refers to the state/region in "City, District, State" labels
  return filtered[filtered.length - 1];
};

export const getDistrictStateLabel = (label?: string | null): string => {
  const tokens = extractCityTokens(label);
  if (tokens.length === 0) {
    return label ?? 'Set location';
  }

  const filtered = dedupeTokens(removeSectorTokens(tokens));
  if (filtered.length >= 2) {
    return `${filtered[0]}, ${filtered[1]}`;
  }

  if (filtered.length === 1 && tokens.length >= 2) {
    const dedupedTokens = dedupeTokens(tokens);
    const state = dedupedTokens.find((token) => token.toLowerCase() !== filtered[0].toLowerCase());
    if (state) {
      return `${filtered[0]}, ${state}`;
    }
  }

  return filtered[0] ?? tokens[0];
};
