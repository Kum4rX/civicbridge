import { environment } from '../../../environments/environment';

/**
 * SINGLE SOURCE OF TRUTH for the existing backend contract.
 * If your API routes differ, change them HERE ONLY.
 */
const base = `${environment.apiBaseUrl}${environment.apiPrefix}`;

export const API = {
  auth: {
    login: `${base}/auth/login`,
    register: `${base}/auth/register`,
    me: `${base}/auth/me`,
  },
  users: {
    profile: `${base}/users/profile`,
    updateProfile: `${base}/users/profile`,
  },
  petitions: {
    list: `${base}/petitions`,
    create: `${base}/petitions`,
    byId: (id: string) => `${base}/petitions/${id}`,
    update: (id: string) => `${base}/petitions/${id}`,
    remove: (id: string) => `${base}/petitions/${id}`,
    sign: (id: string) => `${base}/petitions/${id}/sign`,
    mine: `${base}/petitions/my`,
    signed: `${base}/petitions/signed`,
    respond: (id: string) => `${base}/petitions/${id}/response`,
    status: (id: string) => `${base}/petitions/${id}/status`,
  },
  polls: {
    list: `${base}/polls`,
    create: `${base}/polls`,
    byId: (id: string) => `${base}/polls/${id}`,
    vote: (id: string) => `${base}/polls/${id}/vote`,
    results: (id: string) => `${base}/polls/${id}/results`,
    status: (id: string) => `${base}/polls/${id}/status`,
  },
  reports: {
    summary: `${base}/reports/summary`,
    petitions: `${base}/reports/petitions`,
    polls: `${base}/reports/polls`,
    /** INTEGRATION POINT – only used if your backend exposes it. */
    export: `${base}/reports/export`,
    /** INTEGRATION POINT – sentiment/trend series. */
    sentiment: `${base}/reports/sentiment`,
  },
} as const;

export const API_BASE = base;