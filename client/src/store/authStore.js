import { create } from 'zustand';
const STORAGE_KEY = 'ems_auth_v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

const initial = load();

export const useAuthStore = create((set, get) => ({
  user: initial.user || null,
  accessToken: initial.accessToken || null,
  refreshToken: initial.refreshToken || null,

  setSession({ user, accessToken, refreshToken }) {
    const next = { user, accessToken, refreshToken };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set(next);
  },

  setTokens(accessToken, refreshToken) {
    const next = { ...get(), accessToken, refreshToken };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: next.user,
        accessToken,
        refreshToken,
      })
    );
    set({ accessToken, refreshToken });
  },

  setUser(user) {
    const next = { user, accessToken: get().accessToken, refreshToken: get().refreshToken };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ user });
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },

  isAuthenticated: () => Boolean(get().accessToken),
  isAdminLike: () => ['super_admin', 'admin', 'hr'].includes(get().user?.role),
  isManagerPlus: () =>
    ['super_admin', 'admin', 'hr', 'manager'].includes(get().user?.role),
}));
