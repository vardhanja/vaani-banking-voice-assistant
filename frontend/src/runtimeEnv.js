// runtimeEnv.js
// Provides runtime-config fallbacks: window.__env -> import.meta.env -> defaults

function _get(key, defaultValue) {
  try {
    if (typeof window !== 'undefined' && window.__env && window.__env[key]) {
      return window.__env[key];
    }
  } catch (e) {
    // ignore
  }

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {
    // ignore (some tooling may not like import.meta in certain contexts)
  }

  return defaultValue;
}

export const API_BASE_URL = _get('VITE_API_BASE_URL', 'http://localhost:8000');
export const AI_API_BASE_URL = _get('VITE_AI_API_BASE_URL', 'http://localhost:8001');

export default {
  API_BASE_URL,
  AI_API_BASE_URL,
};
