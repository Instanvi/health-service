"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { toast } from "sonner";

/* ——— TYPES ——— */

export interface Campaign {
    id: string;
    name: string;
    description: string;
    manager_personality_id: string;
    start_date: string;
    end_date: string;
    status: "active" | "inactive" | "completed" | "draft"; // Assuming status values
    created_at?: string;
    updated_at?: string;
}

export interface CreateCampaignPayload {
    name: string;
    description: string;
    manager_personality_id: string;
    start_date: string;
    end_date: string;
}

export interface UpdateCampaignPayload {
    name?: string;
    description?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    manager_personality_id?: string;
}

export interface CampaignsResponse {
    count: number;
    page: number;
    limit: number;
    results: Campaign[];
}

export interface CampaignQueryParams {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    granularity?: string;
}

/* ——— API FUNCTIONS ——— */

// Use env var or fallback to the correct URL (fixing the typo from lib/axios.ts)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.dappahealth.eu/dappa";

async function fetchCampaigns(params: CampaignQueryParams = {}): Promise<CampaignsResponse> {
    const token = Cookies.get("authToken");

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);
    if (params.granularity) queryParams.append("granularity", params.granularity);

    const res = await fetch(`${API_BASE}/campaign/all?${queryParams.toString()}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch campaigns" }));
        throw new Error(error.message || "Failed to load campaigns");
    }

    return res.json();
}

async function fetchCampaign(id: string): Promise<Campaign> {
    const token = Cookies.get("authToken");
    if (!id) throw new Error("Campaign ID is required");

    const res = await fetch(`${API_BASE}/campaign/${id}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch campaign" }));
        throw new Error(error.message || "Failed to load campaign");
    }

    return res.json();
}

async function createCampaign(payload: CreateCampaignPayload) {
    const token = Cookies.get("authToken");

    const res = await fetch(`${API_BASE}/campaign/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create campaign");
    return data;
}

async function updateCampaign({ id, payload }: { id: string; payload: UpdateCampaignPayload }) {
    const token = Cookies.get("authToken");
    if (!id) throw new Error("Campaign ID is required");

    const res = await fetch(`${API_BASE}/campaign/edit/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update campaign");
    return data;
}

/* ——— HOOKS ——— */

export function useCampaigns(params: CampaignQueryParams = { page: 1, limit: 20 }) {
    return useQuery({
        queryKey: ["campaigns", params],
        queryFn: () => fetchCampaigns(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useCampaign(id: string) {
    return useQuery({
        queryKey: ["campaign", id],
        queryFn: () => fetchCampaign(id),
        enabled: !!id,
    });
}

export function useCreateCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCampaign,
        onSuccess: () => {
            toast.success("Campaign created successfully!");
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to create campaign");
        },
    });
}

export function useUpdateCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateCampaign,
        onSuccess: (_, variables) => {
            toast.success("Campaign updated successfully!");
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            queryClient.invalidateQueries({ queryKey: ["campaign", variables.id] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update campaign");
        },
    });
}
