"use client";

import React, { useCallback } from "react";
import { GoogleMap, Polygon } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/GoogleMapsProvider";
import { FacilityZone } from "./hooks/useZones";

const mapContainerStyle = { width: "100%", height: "100%" };
const center = { lat: 4.0511, lng: 9.7679 }; // Default to Douala/Wouri area

interface FieldMapProps {
    zones?: FacilityZone[];
    onZoneHover?: (zone: FacilityZone | null) => void;
    selectedZoneId?: string;
}

export default function FieldMap({ zones = [], onZoneHover, selectedZoneId }: FieldMapProps) {
    const { isLoaded } = useGoogleMaps();

    const onLoad = useCallback((map: google.maps.Map) => {
        // Fit bounds if zones exist
        if (zones.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            let hasValidBounds = false;

            zones.forEach(zone => {
                if (zone.boundaries?.coordinates?.[0]) {
                    zone.boundaries.coordinates[0].forEach(coord => {
                        bounds.extend({ lat: coord[1], lng: coord[0] });
                        hasValidBounds = true;
                    });
                }
            });

            if (hasValidBounds) {
                map.fitBounds(bounds);
            }
        }
    }, [zones]);

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
                onLoad={onLoad}
                options={{
                    zoomControl: true,
                    zoomControlOptions: { position: 7 }, // RIGHT_CENTER
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                }}
            >
                {zones.map((zone) => {
                    const paths = zone.boundaries?.coordinates?.[0]?.map((coord) => ({
                        lat: coord[1],
                        lng: coord[0],
                    }));

                    if (!paths) return null;

                    return (
                        <Polygon
                            key={zone._id}
                            paths={paths}
                            options={{
                                fillColor: zone._id === selectedZoneId ? "#15803d" : "#22c55e",
                                fillOpacity: zone._id === selectedZoneId ? 0.4 : 0.2,
                                strokeColor: "#15803d",
                                strokeWeight: 2,
                                clickable: true,
                            }}
                            onMouseOver={() => onZoneHover?.(zone)}
                            onMouseOut={() => onZoneHover?.(null)}
                        />
                    );
                })}
            </GoogleMap>
            {/* Green overlay zone - removed as we now have actual zones */}
        </div>
    );
}