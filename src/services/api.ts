import { isNative } from './nativeService';

// The production backend URL. Used as a fallback when VITE_API_URL is not set,
// e.g. in native Android builds where window.location.origin is `capacitor://localhost`.
const PRODUCTION_BACKEND_URL = 'https://campusmobility-wvaz.onrender.com';

// For native apps, we need a full URL to the backend.
// In the web preview, we can use the current origin.
const getBaseUrl = () => {
  // Highest priority: explicit env var baked in at build time
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // If we're on a real domain (not localhost or capacitor), use it as the base
    if (origin && !origin.includes('localhost') && !origin.includes('capacitor://')) {
      return origin;
    }
  }

  // On Android (Capacitor) the origin is `capacitor://localhost` which is useless
  // for backend API calls. Fall back to the production server so that routing,
  // autosuggest, SOS, and all other API calls work in the APK.
  return PRODUCTION_BACKEND_URL;
};

const BACKEND_URL = getBaseUrl();

export const getApiUrl = (path: string) => {
  const baseUrl = BACKEND_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (isNative) {
    console.log(`[API] Native → ${baseUrl}${cleanPath}`);
  }

  return `${baseUrl}${cleanPath}`;
};
