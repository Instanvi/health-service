"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { GoogleMapsProvider } from "@/lib/GoogleMapsProvider";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster richColors />
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
}
