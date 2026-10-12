import axios from 'axios';
import {getBaseUrl} from './getBaseUrl';
import {headers} from './headers';
import * as cheerio from 'cheerio';
import {ProviderContext} from './types';
import * as Crypto from 'expo-crypto';
import {openWebView} from '../services/wafResolver';
import {deleteCookie} from '../services/cookieManager';

// Add a global interceptor to automatically clear cookies on Cloudflare WAF blocks
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const status = error.response.status;
      const server = (error.response.headers?.['server'] || '').toLowerCase();
      const cfMitigated = error.response.headers?.['cf-mitigated'];
      
      if ((status === 403 || status === 503) && (server.includes('cloudflare') || cfMitigated)) {
        const url = error.config?.url;
        if (url) {
          // Cloudflare commonly uses cf_clearance
          await deleteCookie(url, 'cf_clearance').catch(() => {});
        }
      }
    }
    return Promise.reject(error);
  }
);

export const providerContext: ProviderContext = {
  axios,
  getBaseUrl,
  commonHeaders: headers,
  Crypto,
  cheerio,
  openWebView,
  kvStore: {
    get: async () => undefined,
    set: async () => {},
    delete: async () => false,
    keys: async () => [],
    clear: async () => {},
  },
};
