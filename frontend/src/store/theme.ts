// RAG App — https://github.com/ramoncalvo

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
  set: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      toggle: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      set: (theme) => set({ theme }),
    }),
    { name: "rag-app-theme" }
  )
);
