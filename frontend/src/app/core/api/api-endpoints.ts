export const API = {
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    me: '/api/v1/auth/me',
    profile: '/api/v1/auth/profile',
  },
  users: {
    profile: '/api/v1/users/profile',
    updateProfile: '/api/v1/users/profile',
  },
  petitions: {
    base: '/api/v1/petitions',
    detail: (id: string) => `/api/v1/petitions/${id}`,
    my: '/api/v1/petitions/my',
    signed: '/api/v1/petitions/signed',
    sign: (id: string) => `/api/v1/petitions/${id}/sign`,
    unsign: (id: string) => `/api/v1/petitions/${id}/sign`,
  },
  polls: {
    base: '/api/v1/polls',
    detail: (id: string) => `/api/v1/polls/${id}`,
    vote: (id: string) => `/api/v1/polls/${id}/vote`,
    status: (id: string) => `/api/v1/polls/${id}/status`,
    results: (id: string) => `/api/v1/polls/${id}/results`,
  },
  governance: {
    petitions: '/api/v1/governance/petitions',
    respond: (id: string) => `/api/v1/petitions/${id}/response`,
    updateStatus: (id: string) => `/api/v1/petitions/${id}/status`,
  },
  reports: {
    summary: '/api/v1/reports/summary',
    petitions: '/api/v1/reports/petitions',
    polls: '/api/v1/reports/polls',
    sentiment: '/api/v1/reports/sentiment',
    exportCsv: '/api/v1/reports/export',
  },
};
