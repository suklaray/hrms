"use client";

import { createContext, useContext } from "react";

type AppShellContextValue = {
  showAppShell: boolean;
};

export const AppShellContext = createContext<AppShellContextValue>({
  showAppShell: false,
});

export function useAppShell() {
  return useContext(AppShellContext);
}
