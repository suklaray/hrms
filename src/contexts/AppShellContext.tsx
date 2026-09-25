"use client";
//keep sidebar in client component as it uses react hooks and nextjs router
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
