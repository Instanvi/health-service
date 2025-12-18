"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Cookies from "js-cookie";

/* ——— TYPES ——— */

export interface LocationPoint {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface PersonalityInfo {
    id: string;
    first_name: string;
    last_name: string;
    code: string;
}

export interface TeamInfo {
    id: string;
    name: string;
    code: string;
    team_lead_id: string;
    members_count: number;
}

export interface CampaignInfo {
    id: string;
    name: string;
    status: string;
}

export interface ZoneInfo {
    id: string;
    name: string;
    code: string;
}

export interface FacilityInfo {
    id: string;
    name: string;
}

export interface LocationUpdate {
    type: "location_update";
    timestamp: string;
    location: LocationPoint;
    personality: PersonalityInfo;
    team: TeamInfo;
    campaign: CampaignInfo;
    zone: ZoneInfo;
    facility: FacilityInfo;
}

// Movement trail for a specific entity (team, zone, etc.)
export interface MovementTrail {
    entityId: string; // zone_id + team_id combined
    entityName: string;
    zoneId: string;
    teamId: string;
    points: Array<{
        lat: number;
        lng: number;
        timestamp: string;
        personality: PersonalityInfo;
    }>;
}

export type TrackingType = "facility" | "campaign" | "zone" | "team";

interface UseLiveTrackingOptions {
    type: TrackingType;
    enabled?: boolean;
    id?: string;
}

interface UseLiveTrackingResult {
    locationUpdates: LocationUpdate[];
    movementTrails: Map<string, MovementTrail>;
    isConnected: boolean;
    error: string | null;
    reconnect: () => void;
    clearTrails: () => void;
}

// WebSocket base URL - convert from https to wss
const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.dappahealth.eu/dappa")
    .replace("https://", "wss://")
    .replace("http://", "ws://")

const ENDPOINTS: Record<TrackingType, string> = {
    facility: "/track/live/facility",
    campaign: "/track/live/campaign",
    zone: "/track/live/zone",
    team: "/track/live/team",
};

/* ——— BASE HOOK ——— */

export function useLiveTracking({
    type,
    enabled = true,
    id,
}: UseLiveTrackingOptions): UseLiveTrackingResult {
    const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
    const [movementTrails, setMovementTrails] = useState<Map<string, MovementTrail>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    const connectionStartRef = useRef<number>(0);

    const connect = useCallback(() => {
        // Don't connect if disabled
        if (!enabled) {
            return;
        }

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        // Reset connection start time
        connectionStartRef.current = 0;

        const token = Cookies.get("authToken");

        if (!token) {
            console.warn("[LiveTracking] No auth token found, skipping connection");
            setError("No authentication token");
            return;
        }

        // Construct URL: endpoint/id?token=...
        // For facility, id is usually undefined so it stays endpoint?token=...
        let wsUrl = `${WS_BASE}${ENDPOINTS[type]}`;
        if (id) {
            wsUrl += `/${id}`;
        }
        wsUrl += `?token=${token}`;

        console.log(`[LiveTracking] Connecting to ${type} tracking... URL: ${wsUrl}`);

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log(`[LiveTracking] ✓ Connected to ${type} tracking`);
                setIsConnected(true);
                setError(null);
                connectionStartRef.current = Date.now();
                // We don't reset attempts here anymore, we wait to see if it's stable
            };

            ws.onmessage = (event) => {
                try {
                    const data: LocationUpdate = JSON.parse(event.data);

                    // Log the received data for debugging
                    console.log(`[LiveTracking] Received data from ${type}:`, data);

                    if (data.type === "location_update") {
                        // Add to location updates array
                        setLocationUpdates((prev) => {
                            // Keep only the last 1000 updates to prevent memory issues
                            const updated = [...prev, data];
                            return updated.slice(-1000);
                        });

                        // Update movement trails - keyed by zone_id + team_id
                        setMovementTrails((prev) => {
                            const newTrails = new Map(prev);

                            // Create a unique key for this trail (zone_id + team_id)
                            const trailKey = `${data.zone.id}_${data.team.id}`;

                            const existingTrail = newTrails.get(trailKey);
                            const newPoint = {
                                lat: data.location.coordinates[1],
                                lng: data.location.coordinates[0],
                                timestamp: data.timestamp,
                                personality: data.personality,
                            };

                            if (existingTrail) {
                                // Add point to existing trail
                                existingTrail.points.push(newPoint);
                                // Keep only the last 500 points per trail
                                if (existingTrail.points.length > 500) {
                                    existingTrail.points = existingTrail.points.slice(-500);
                                }
                            } else {
                                // Create new trail with zone and team IDs stored
                                newTrails.set(trailKey, {
                                    entityId: trailKey,
                                    entityName: `${data.zone.name} - ${data.team.name}`,
                                    zoneId: data.zone.id,
                                    teamId: data.team.id,
                                    points: [newPoint],
                                });
                            }

                            return newTrails;
                        });
                    }
                } catch (e) {
                    console.error("[LiveTracking] Failed to parse message:", e);
                }
            };

            ws.onerror = () => {
                // Don't log the event object as it's empty and not useful
                console.warn(`[LiveTracking] Connection error on ${type} endpoint`);
                setError("Connection error occurred");
            };

            ws.onclose = (event) => {
                const reason = event.reason || (event.code === 1000 ? "Normal closure" : `Code: ${event.code}`);
                console.log(`[LiveTracking] Connection closed: ${reason}`);
                setIsConnected(false);

                // Calculate connection duration
                // Only calculate if we actually connected (start time > 0)
                const duration = connectionStartRef.current > 0 ? Date.now() - connectionStartRef.current : 0;
                const wasStable = duration > 5000; // 5 seconds stability threshold

                if (wasStable) {
                    // If it was stable for > 5s, reset attempts so we can try fully again
                    reconnectAttemptsRef.current = 0;
                }

                // Attempt to reconnect with exponential backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    console.log(`[LiveTracking] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connect();
                    }, delay);
                } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                    setError("Max reconnection attempts reached");
                    console.warn("[LiveTracking] Max reconnection attempts reached, giving up");
                }
            };
        } catch (e) {
            console.error("[LiveTracking] Failed to create WebSocket:", e);
            setError("Failed to establish connection");
        }
    }, [type, enabled, id]);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        connectionStartRef.current = 0; // Reset start time
        setError(null);
        connect();
    }, [connect]);

    const clearTrails = useCallback(() => {
        setMovementTrails(new Map());
        setLocationUpdates([]);
    }, []);

    // Connect/disconnect based on dependencies
    useEffect(() => {
        if (enabled) {
            connect();
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect, enabled]);

    // Clear trails when type changes (switching endpoints)
    useEffect(() => {
        clearTrails();
    }, [type, clearTrails]);

    return {
        locationUpdates,
        movementTrails,
        isConnected,
        error,
        reconnect,
        clearTrails,
    };
}

/* ——— SMART HOOK: Auto-select tracking type and filter client-side ——— */

interface SmartTrackingOptions {
    filterCampaignId?: string;
    filterZoneId?: string;
    filterTeamId?: string;
    enabled?: boolean;
}

export function useSmartLiveTracking({
    filterCampaignId,
    filterZoneId,
    filterTeamId,
    enabled = true,
}: SmartTrackingOptions) {
    // Determine which WebSocket endpoint to connect to based on the most specific filter
    // Priority: team > zone > campaign > facility (default on page load)
    const trackingType = useMemo((): TrackingType => {
        if (filterTeamId) return "team";
        if (filterZoneId) return "zone";
        if (filterCampaignId) return "campaign";
        return "facility"; // Default: connect to facility endpoint on page load
    }, [filterTeamId, filterZoneId, filterCampaignId]);

    // Determine the ID to pass to the WebSocket connection
    const trackingId = useMemo(() => {
        if (filterTeamId) return filterTeamId;
        if (filterZoneId) return filterZoneId;
        if (filterCampaignId) return filterCampaignId;
        return undefined;
    }, [filterTeamId, filterZoneId, filterCampaignId]);

    const {
        locationUpdates,
        movementTrails,
        isConnected,
        error,
        reconnect,
        clearTrails,
    } = useLiveTracking({ type: trackingType, enabled, id: trackingId });

    // CLIENT-SIDE FILTERING: Filter movement trails to match selected zone/team
    // This matches trails to zones displayed on the map
    const filteredTrails = useMemo(() => {
        const filtered = new Map<string, MovementTrail>();

        movementTrails.forEach((trail, key) => {
            // Apply filters - only show trails that match selected filters
            // If a zone is selected, only show trails for that zone
            if (filterZoneId && trail.zoneId !== filterZoneId) return;
            // If a team is selected, only show trails for that team
            if (filterTeamId && trail.teamId !== filterTeamId) return;

            filtered.set(key, trail);
        });

        return filtered;
    }, [movementTrails, filterZoneId, filterTeamId]);

    // Filter location updates by campaign/zone/team
    const filteredUpdates = useMemo(() => {
        return locationUpdates.filter((update) => {
            if (filterZoneId && update.zone.id !== filterZoneId) return false;
            if (filterTeamId && update.team.id !== filterTeamId) return false;
            if (filterCampaignId && update.campaign.id !== filterCampaignId) return false;
            return true;
        });
    }, [locationUpdates, filterZoneId, filterTeamId, filterCampaignId]);

    return {
        locationUpdates: filteredUpdates,
        movementTrails: filteredTrails,
        isConnected,
        error,
        reconnect,
        clearTrails,
        activeTrackingType: trackingType,
    };
}
