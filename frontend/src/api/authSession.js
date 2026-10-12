/**
 * Session / token expiry handling for the frontend.
 *
 * - Axios + fetch 401 responses on API calls trigger logout
 * - Optional startup validation against /profile/
 */
import axios from "axios";
import { API_BASE_URL } from "../config/env";

const AUTH_SKIP_PATHS = [
  "/login/",
  "/register/",
  "/verify-otp/",
  "/password-reset/",
];

let unauthorizedHandler = null;
let handlingUnauthorized = false;
let interceptorsInstalled = false;

function urlString(input) {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input?.url === "string") return input.url;
  try {
    return String(input);
  } catch {
    return "";
  }
}

function isAuthEndpoint(url = "") {
  const u = urlString(url);
  return AUTH_SKIP_PATHS.some((path) => u.includes(path));
}

function isApiRequest(url = "") {
  const u = urlString(url);
  if (!u) return false;
  if (u.startsWith(API_BASE_URL)) return true;
  // Relative /api/... in case something uses that
  if (u.startsWith("/api/")) return true;
  return u.includes("/api/");
}

export function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export function triggerUnauthorized(_reason = "unauthorized") {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    unauthorizedHandler?.(_reason);
  } finally {
    window.setTimeout(() => {
      handlingUnauthorized = false;
    }, 1500);
  }
}

/**
 * Install once: axios response interceptor + fetch wrapper for API 401s.
 */
export function setupAuthInterceptors() {
  if (interceptorsInstalled) return;
  interceptorsInstalled = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url || "";
      if (status === 401 && isApiRequest(url) && !isAuthEndpoint(url)) {
        triggerUnauthorized("axios_401");
      }
      return Promise.reject(error);
    }
  );

  if (typeof window !== "undefined" && !window.__sikhGulAuthFetchPatched) {
    window.__sikhGulAuthFetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = urlString(input);
      if (
        response.status === 401 &&
        isApiRequest(url) &&
        !isAuthEndpoint(url)
      ) {
        triggerUnauthorized("fetch_401");
      }
      return response;
    };
  }
}

/**
 * @returns {Promise<{ok:true,user:object}|{ok:false}|{ok:null}>}
 * ok true = valid (+ profile user), false = invalid, null = unknown (network)
 */
export async function validateAuthToken(token) {
  if (!token || typeof token !== "string") {
    return { ok: false };
  }
  try {
    const res = await axios.get(`${API_BASE_URL}/profile/`, {
      headers: { Authorization: `Token ${token.trim()}` },
    });
    if (res.status >= 200 && res.status < 300) {
      return { ok: true, user: res.data };
    }
    return { ok: false };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401) return { ok: false };
    // Network / server errors: do not force logout
    return { ok: null };
  }
}
