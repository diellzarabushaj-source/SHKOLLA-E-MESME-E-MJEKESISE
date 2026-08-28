"use client";

import { App as AntApp, ConfigProvider, theme as antdTheme, type ThemeConfig } from "antd";
import { useEffect, useMemo, useState } from "react";

type PortalTheme = "light" | "dark";

function currentPortalTheme(): PortalTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function AntDesignProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [portalTheme, setPortalTheme] = useState<PortalTheme>("dark");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setPortalTheme(currentPortalTheme());
    const observer = new MutationObserver(sync);

    sync();
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("storage", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", sync);
    };
  }, []);

  const theme = useMemo<ThemeConfig>(() => {
    const dark = portalTheme === "dark";

    return {
      algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      cssVar: { prefix: "medical" },
      token: {
        colorPrimary: dark ? "#3654ff" : "#3154f5",
        colorInfo: dark ? "#67d6e7" : "#087f9c",
        colorSuccess: dark ? "#43c596" : "#168a63",
        colorWarning: dark ? "#f1b947" : "#a86b00",
        colorError: dark ? "#ff5f87" : "#c92c5c",
        colorBgBase: dark ? "#07111f" : "#f4f7fc",
        colorTextBase: dark ? "#f7fbff" : "#10213a",
        colorBorder: dark ? "rgba(163, 187, 218, 0.16)" : "rgba(42, 70, 108, 0.14)",
        borderRadius: 12,
        borderRadiusLG: 20,
        controlHeight: 44,
        fontFamily: 'var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 14,
        motion: true,
      },
      components: {
        Button: {
          borderRadius: 12,
          controlHeight: 44,
          fontWeight: 800,
          primaryShadow: dark ? "0 10px 28px rgba(54, 84, 255, 0.24)" : "0 10px 28px rgba(49, 84, 245, 0.18)",
        },
        Card: {
          borderRadiusLG: 20,
        },
        Input: {
          activeBorderColor: dark ? "#6f86ff" : "#3154f5",
          hoverBorderColor: dark ? "#536dff" : "#3154f5",
          activeShadow: dark ? "0 0 0 3px rgba(54, 84, 255, 0.18)" : "0 0 0 3px rgba(49, 84, 245, 0.12)",
        },
        Alert: {
          borderRadiusLG: 14,
        },
        Modal: {
          borderRadiusLG: 22,
        },
      },
    };
  }, [portalTheme]);

  return (
    <ConfigProvider theme={theme} componentSize="middle">
      <AntApp className="medical-portal-ant-app">{children}</AntApp>
    </ConfigProvider>
  );
}
