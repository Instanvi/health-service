"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { toast } from "sonner";

/* ——— TYPES ——— */

export interface GeoJSONPolygon {
    type: "Polygon";
    coordinates: number[][][];
}

export interface Zone {
    id: string;
    name: string;
    description: string;
    campaign_id: string;
    boundaries: GeoJSONPolygon;
    created_at?: string;
    updated_at?: string;
}

export interface CreateZonePayload {
    campaign_id: string;
    name: string;
    description: string;
    boundaries: GeoJSONPolygon;
}

export interface UpdateZonePayload {
    name?: string;
    description?: string;
    campaign_id?: string;
    boundaries?: GeoJSONPolygon;
}

export interface ZonesResponse {
    count: number;
    results: Zone[];
}

/* ——— API FUNCTIONS ——— */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.dappahealth.eu/dappa";

async function fetchZonesByCampaign(campaignId: string, campaignCode?: string): Promise<Zone[]> {
    const token = Cookies.get("authToken");
    if (!campaignId) return [];

    const queryParams = new URLSearchParams();
    queryParams.append("campaign_id", campaignId);
    if (campaignCode) queryParams.append("campaign_code", campaignCode);

    const res = await fetch(`${API_BASE}/zone/campaign?${queryParams.toString()}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch zones" }));
        throw new Error(error.message || "Failed to load zones");
    }

    // The API might return an array directly or a paginated response
    // Based on other endpoints, it likely returns { results: [...] } or just [...]
    // Adjusting to handle both cases safely
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

async function createZone(payload: CreateZonePayload) {
    const token = Cookies.get("authToken");

    const res = await fetch(`${API_BASE}/zone/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create zone");
    return data;
}

async function updateZone({ id, payload }: { id: string; payload: UpdateZonePayload }) {
    const token = Cookies.get("authToken");
    if (!id) throw new Error("Zone ID is required");

    const res = await fetch(`${API_BASE}/zone/edit/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update zone");
    return data;
}

/* ——— HOOKS ——— */

export function useZonesByCampaign(campaignId: string, campaignCode?: string) {
    return useQuery({
        queryKey: ["zones", "campaign", campaignId, campaignCode],
        queryFn: () => fetchZonesByCampaign(campaignId, campaignCode),
        enabled: !!campaignId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useCreateZone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createZone,
        onSuccess: () => {
            toast.success("Zone created successfully!");
            queryClient.invalidateQueries({ queryKey: ["zones"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to create zone");
        },
    });
}

export function useUpdateZone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateZone,
        onSuccess: () => {
            toast.success("Zone updated successfully!");
            queryClient.invalidateQueries({ queryKey: ["zones"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update zone");
        },
    });
}
