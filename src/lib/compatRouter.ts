// src/lib/compatRouter.ts
"use client";

import {
  useRouter as useNextRouter,
  usePathname,
  useSearchParams,
  useParams,
} from "next/navigation";
import { useMemo } from "react";

export function useRouter() {
  const nextRouter = useNextRouter();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const params = useParams();

  return useMemo(() => {
    const query: Record<string, any> = {};

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        query[k] = v;
      });
    }

    if (searchParams) {
      searchParams.forEach((val, key) => {
        if (query[key] !== undefined) {
          if (Array.isArray(query[key])) {
            query[key].push(val);
          } else {
            query[key] = [query[key], val];
          }
        } else {
          query[key] = val;
        }
      });
    }

    return {
      ...nextRouter,
      pathname,
      query,
      asPath:
        pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""),
      isReady: true,
      push: (url: string) => nextRouter.push(url),
      replace: (url: string) => nextRouter.replace(url),
      back: () => nextRouter.back(),
      forward: () => nextRouter.forward(),
      refresh: () => nextRouter.refresh(),
      reload: () => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      },
    };
  }, [nextRouter, pathname, searchParams, params]);
}

export default useRouter;
