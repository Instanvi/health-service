"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import { createContext, useContext, ReactNode } from "react";

const libraries: ("visualization" | "places" | "drawing" | "geometry")[] = ["visualization"];

interface GoogleMapsContextType {
    isLoaded: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({ isLoaded: false });

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    return (
        <GoogleMapsContext.Provider value={{ isLoaded }}>
            {children}
        </GoogleMapsContext.Provider>
    );
}

export function useGoogleMaps() {
    const context = useContext(GoogleMapsContext);
    if (!context) {
        throw new Error("useGoogleMaps must be used within GoogleMapsProvider");
    }
    return context;
}
