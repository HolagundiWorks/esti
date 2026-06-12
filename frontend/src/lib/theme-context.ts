import { createContext, useContext } from "react";

export type AppTheme = "white" | "g100";

export const ThemeContext = createContext<AppTheme>("white");

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
