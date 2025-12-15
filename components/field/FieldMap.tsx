"use client";

import React, { useCallback, useMemo, useRef, useEffect } from "react";
import { GoogleMap, Polygon, Polyline, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/GoogleMapsProvider";
import { FacilityZone, Zone } from "./hooks/useZones";
import { MovementTrail, PersonalityInfo } from "./hooks/useLiveTracking";

const mapContainerStyle = { width: "100%", height: "100%" };
const center = { lat: 4.0511, lng: 9.7679 }; // Default to Douala/Wouri area

// Generate distinct colors for trails
const TRAIL_COLORS = [
    "#3B82F6", // blue
    "#EF4444", // red
    "#F59E0B", // amber
    "#8B5CF6", // violet
    "#10B981", // emerald
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#F97316", // orange
    "#6366F1", // indigo
    "#84CC16", // lime
];

interface TrailPoint {
    lat: number;
    lng: number;
    timestamp: string;
    personality: PersonalityInfo;
}

interface FieldMapProps {
    zones?: (FacilityZone | Zone)[];
    onZoneHover?: (zone: FacilityZone | Zone | null) => void;
    selectedZoneId?: string;
    movementTrails?: Map<string, MovementTrail>;
    showTrails?: boolean;
}

export default function FieldMap({
    zones = [],
    onZoneHover,
    selectedZoneId,
    movementTrails = new Map(),
    showTrails = true,
}: FieldMapProps) {
    const { isLoaded } = useGoogleMaps();
    const mapRef = useRef<google.maps.Map | null>(null);
    const [selectedMarker, setSelectedMarker] = React.useState<{
        position: { lat: number; lng: number };
        info: {
            name: string;
            timestamp: string;
            trailName: string;
        };
    } | null>(null);

    // Get color for a trail based on its key
    const getTrailColor = useCallback((key: string, index: number) => {
        return TRAIL_COLORS[index % TRAIL_COLORS.length];
    }, []);

    // Convert trails Map to array for rendering
    const trailsArray = useMemo(() => {
        return Array.from(movementTrails.entries()).map(([key, trail], index) => ({
            key,
            trail,
            color: getTrailColor(key, index),
        }));
    }, [movementTrails, getTrailColor]);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;

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

    // Auto-fit bounds when trails update (include trail points in bounds)
    useEffect(() => {
        if (mapRef.current && trailsArray.length > 0 && showTrails) {
            const bounds = new window.google.maps.LatLngBounds();
            let hasPoints = false;

            // Include zone boundaries
            zones.forEach(zone => {
                if (zone.boundaries?.coordinates?.[0]) {
                    zone.boundaries.coordinates[0].forEach(coord => {
                        bounds.extend({ lat: coord[1], lng: coord[0] });
                        hasPoints = true;
                    });
                }
            });

            // Include trail points
            trailsArray.forEach(({ trail }) => {
                trail.points.forEach(point => {
                    bounds.extend({ lat: point.lat, lng: point.lng });
                    hasPoints = true;
                });
            });

            if (hasPoints) {
                mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
            }
        }
    }, [trailsArray, zones, showTrails]);

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
                {/* Render Zone Polygons */}
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

                {/* Render Movement Trail Polylines */}
                {showTrails && trailsArray.map(({ key, trail, color }) => {
                    if (trail.points.length < 2) return null;

                    const path = trail.points.map(p => ({ lat: p.lat, lng: p.lng }));

                    return (
                        <Polyline
                            key={`trail-${key}`}
                            path={path}
                            options={{
                                strokeColor: color,
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                                geodesic: true,
                                icons: [
                                    {
                                        icon: {
                                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                            scale: 3,
                                            strokeColor: color,
                                            strokeOpacity: 1,
                                            fillColor: color,
                                            fillOpacity: 1,
                                        },
                                        offset: "100%",
                                        repeat: "100px",
                                    },
                                ],
                            }}
                        />
                    );
                })}

                {/* Render Current Position Markers (last point of each trail) */}
                {showTrails && trailsArray.map(({ key, trail, color }) => {
                    if (trail.points.length === 0) return null;

                    const lastPoint = trail.points[trail.points.length - 1];

                    return (
                        <Marker
                            key={`marker-${key}`}
                            position={{ lat: lastPoint.lat, lng: lastPoint.lng }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 10,
                                fillColor: color,
                                fillOpacity: 1,
                                strokeColor: "#FFFFFF",
                                strokeWeight: 3,
                            }}
                            onClick={() => {
                                setSelectedMarker({
                                    position: { lat: lastPoint.lat, lng: lastPoint.lng },
                                    info: {
                                        name: `${lastPoint.personality.first_name} ${lastPoint.personality.last_name}`,
                                        timestamp: new Date(lastPoint.timestamp).toLocaleTimeString(),
                                        trailName: trail.entityName,
                                    },
                                });
                            }}
                            title={`${lastPoint.personality.first_name} ${lastPoint.personality.last_name}`}
                        />
                    );
                })}

                {/* Render Start Point Markers (first point of each trail) */}
                {showTrails && trailsArray.map(({ key, trail, color }) => {
                    if (trail.points.length < 2) return null;

                    const firstPoint = trail.points[0];

                    return (
                        <Marker
                            key={`start-${key}`}
                            position={{ lat: firstPoint.lat, lng: firstPoint.lng }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: "#FFFFFF",
                                fillOpacity: 1,
                                strokeColor: color,
                                strokeWeight: 3,
                            }}
                            title="Trail Start"
                        />
                    );
                })}

                {/* Info Window for selected marker */}
                {selectedMarker && (
                    <InfoWindow
                        position={selectedMarker.position}
                        onCloseClick={() => setSelectedMarker(null)}
                    >
                        <div className="p-2 min-w-[150px]">
                            <h4 className="font-semibold text-gray-900 text-sm">
                                {selectedMarker.info.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedMarker.info.trailName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Last updated: {selectedMarker.info.timestamp}
                            </p>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Trail Legend */}
            {showTrails && trailsArray.length > 0 && (
                <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-[250px] max-h-[200px] overflow-y-auto z-10">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        Active Trails
                    </h4>
                    <div className="space-y-1.5">
                        {trailsArray.map(({ key, trail, color }) => (
                            <div key={`legend-${key}`} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-xs text-gray-600 truncate">
                                    {trail.entityName}
                                </span>
                                <span className="text-xs text-gray-400 ml-auto">
                                    {trail.points.length} pts
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}