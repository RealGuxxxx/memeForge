"use client";

import { ThemeProvider as StyledThemeProvider } from "styled-components";
import original from "react95/dist/themes/original";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <StyledThemeProvider theme={original}>{children}</StyledThemeProvider>;
}
