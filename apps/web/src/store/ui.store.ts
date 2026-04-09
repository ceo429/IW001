import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI state — theme, sidebar collapse, favorites. These ARE OK to persist
 * to localStorage because they contain no secrets.
 */
interface UiState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  favorites: string[]; // pageId[]
  setTheme(theme: 'dark' | 'light'): void;
  toggleTheme(): void;
  toggleSidebar(): void;
  toggleFavorite(pageId: string): void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      favorites: ['dashboard', 'quotes'],
      setTheme: (theme) => {
        set({ theme });
        applyThemeToHtml(theme);
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyThemeToHtml(next);
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      toggleFavorite: (pageId) => {
        const favs = new Set(get().favorites);
        if (favs.has(pageId)) favs.delete(pageId);
        else favs.add(pageId);
        set({ favorites: [...favs] });
      },
    }),
    {
      name: 'iw001.ui',
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToHtml(state.theme);
      },
    },
  ),
);

function applyThemeToHtml(theme: 'dark' | 'light') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}
