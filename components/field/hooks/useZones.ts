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
    _id: string;
    name: string;
    description: string;
    campaign_id: string;
    boundaries: GeoJSONPolygon;
    code?: string;
    metadata?: {
        created_at: string;
        created_by: string;
        modified_at: string;
        modified_by: string;
        facility_id: string;
    };
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
    zones: Zone[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

/* ——— FACILITY ZONES TYPES ——— */

export interface FacilityZoneCampaign {
    _id: string;
    name: string;
    code: string;
    status: string;
}

export interface FacilityZoneMetadata {
    created_at: string;
    created_by: string;
    modified_at: string;
    modified_by: string;
    facility_id: string;
}

export interface FacilityZone {
    _id: string;
    campaign_id: string;
    name: string;
    description: string;
    code: string;
    boundaries: GeoJSONPolygon;
    metadata: FacilityZoneMetadata;
    campaign: FacilityZoneCampaign;
    team_count: number;
}

export interface FacilityZonesPagination {
    current_page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
}

export interface FacilityZonesResponse {
    message: string;
    zones: FacilityZone[];
    pagination: FacilityZonesPagination;
    filters: {
        facility_id: string;
        campaign_id: string | null;
    };
}

/* ——— API FUNCTIONS ——— */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.dappahealth.eu/dappa";

async function fetchZonesByCampaign(options: { campaignId: string; campaignCode?: string; page?: number; limit?: number }): Promise<{ zones: Zone[]; count: number; pagination?: { page: number; limit: number; total: number; total_pages: number } }> {
    const { campaignId, campaignCode, page = 1, limit = 10 } = options;
    const token = Cookies.get("authToken");
    if (!campaignId) return { zones: [], count: 0 };

    const queryParams = new URLSearchParams();
    queryParams.append("campaign_id", campaignId);
    if (campaignCode) queryParams.append("campaign_code", campaignCode);
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());

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

    const data = await res.json();
    if (Array.isArray(data)) {
        return { zones: data, count: data.length };
    }
    return {
        zones: data.zones || data.results || [],
        count: data.total_zones || data.count || (data.zones?.length || data.results?.length || 0),
        pagination: data.pagination
    };
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

async function fetchZonesByFacility(options: { page?: number; pageSize?: number; campaignId?: string }): Promise<FacilityZonesResponse> {
    const { page = 1, pageSize = 20, campaignId } = options;
    const token = Cookies.get("authToken");

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("page_size", pageSize.toString());
    if (campaignId) queryParams.append("campaign_id", campaignId);

    const res = await fetch(`${API_BASE}/zone/facility?${queryParams.toString()}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch zones" }));
        throw new Error(error.message || "Failed to load zones");
    }

    return res.json();
}

/* ——— HOOKS ——— */

export function useZonesByCampaign(options: { campaignId: string; campaignCode?: string; page?: number; limit?: number } | string) {
    // Handle legacy string argument if necessary, or just force object. 
    // Since I'm refactoring, I'll support both or just object.
    // But to be clean, let's convert to object inside if string is passed (though I will update the caller).
    const opts = typeof options === "string" ? { campaignId: options } : options;

    return useQuery({
        queryKey: ["zones", "campaign", opts.campaignId, opts.campaignCode, opts.page, opts.limit],
        queryFn: () => fetchZonesByCampaign(opts),
        enabled: !!opts.campaignId,
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

export function useZonesByFacility(options: { page?: number; pageSize?: number; campaignId?: string } = {}) {
    return useQuery({
        queryKey: ["zones", "facility", options.page, options.pageSize, options.campaignId],
        queryFn: () => fetchZonesByFacility(options),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
