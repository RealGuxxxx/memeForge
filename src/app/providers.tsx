"use client";

import { WagmiProvider } from "wagmi";
import { config } from "@/config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import original from "react95/dist/themes/original";
import { styleReset } from "react95";
import { createGlobalStyle } from "styled-components";

// 创建全局样式，应用React95样式重置
const GlobalStyles = createGlobalStyle`
  ${styleReset}
  
  body {
    margin: 0;
    padding: 0;
    font-family: sans-serif;
    background-color: ${original.desktopBackground};
    font-size: 16px;
  }
`;

// 过滤React95特定的props，防止它们被传递到DOM
const shouldForwardProp = (prop: string) => {
  const react95Props = [
    "fixed",
    "position",
    "active",
    "primary",
    "square",
    "variant",
    "shadow",
    "multiline",
    "fullWidth",
    "noPadding",
  ];
  return !react95Props.includes(prop);
};

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <GlobalStyles />
      <ThemeProvider theme={original}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </StyleSheetManager>
  );
}
