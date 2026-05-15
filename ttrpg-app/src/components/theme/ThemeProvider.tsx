"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "sepia";
const STORAGE_KEY = "ttrpg-theme";
const DEFAULT_THEME: Theme = "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "sepia");
  root.classList.add(theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? DEFAULT_THEME;
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de <ThemeProvider>");
  return ctx;
}

/**
 * Script inline para evitar flash de tema errado antes da hidratação.
 * Inserido via `dangerouslySetInnerHTML` no <head>.
 */
export const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('${STORAGE_KEY}') || '${DEFAULT_THEME}';
  if (t !== 'light' && t !== 'dark' && t !== 'sepia') t = '${DEFAULT_THEME}';
  var c = document.documentElement.classList;
  c.remove('light','dark','sepia');
  c.add(t);
}catch(e){}})();
`;
