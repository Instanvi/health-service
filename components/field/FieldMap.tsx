"use client";

import React from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/GoogleMapsProvider";

const mapContainerStyle = { width: "100%", height: "100%" };
const center = { lat: 4.0511, lng: 9.7679 }; // Default to Douala/Wouri area

export default function FieldMap() {
    const { isLoaded } = useGoogleMaps();

    if (!isLoaded) {
        return (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                <p className="text-gray-600">Loading map...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={13}
                options={{
                    zoomControl: true,
                    zoomControlOptions: { position: 7 }, // RIGHT_CENTER
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                }}
            />
            {/* Green overlay zone */}
            <div className="absolute inset-0 bg-green-500 opacity-10 pointer-events-none" />
        </div>
    );
}