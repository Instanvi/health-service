"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { toast } from "sonner";

/* ——— TYPES ——— */

export interface Team {
    _id: string;
    name: string;
    campaign_id: string;
    zone_id: string;
    team_lead_id: string;
    members: string[]; // Array of member IDs
    created_at?: string;
    updated_at?: string;
}

export interface TeamMember {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    role?: string;
}

export interface CreateTeamPayload {
    campaign_id: string;
    name: string;
    zone_id: string;
    members: string[];
    team_lead_id: string;
}

export interface UpdateTeamPayload {
    name?: string;
    zone_id?: string;
    campaign_id?: string;
    members?: string[];
    team_lead_id?: string;
}

/* ——— API FUNCTIONS ——— */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.dappahealth.eu/dappa";

async function fetchTeamsByCampaign(campaignId: string, campaignCode?: string): Promise<Team[]> {
    const token = Cookies.get("authToken");
    if (!campaignId) return [];

    const queryParams = new URLSearchParams();
    queryParams.append("campaign_id", campaignId);
    if (campaignCode) queryParams.append("campaign_code", campaignCode);

    const res = await fetch(`${API_BASE}/team/campaign?${queryParams.toString()}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch teams" }));
        throw new Error(error.message || "Failed to load teams");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

async function fetchTeamsByZone(options: { zoneId: string; zoneCode?: string; page?: number; limit?: number }): Promise<{ teams: Team[]; count: number }> {
    const { zoneId, zoneCode, page = 1, limit = 10 } = options;
    const token = Cookies.get("authToken");
    if (!zoneId) return { teams: [], count: 0 };

    const queryParams = new URLSearchParams();
    queryParams.append("zone_id", zoneId);
    if (zoneCode) queryParams.append("zone_code", zoneCode);
    queryParams.append("page", page.toString());
    queryParams.append("page_size", limit.toString());

    const res = await fetch(`${API_BASE}/team/zone?${queryParams.toString()}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch teams" }));
        throw new Error(error.message || "Failed to load teams");
    }

    const data = await res.json();
    return {
        teams: data.teams || [],
        count: data.pagination?.total_items || data.teams?.length || 0
    };
}

async function fetchTeamMembers(teamId: string, teamCode?: string): Promise<TeamMember[]> {
    const token = Cookies.get("authToken");
    if (!teamId) return [];

    const queryParams = new URLSearchParams();
    queryParams.append("team_id", teamId);
    if (teamCode) queryParams.append("team_code", teamCode);

    const res = await fetch(`${API_BASE}/team/members?${queryParams.toString()}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch team members" }));
        throw new Error(error.message || "Failed to load team members");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
}

async function createTeam(payload: CreateTeamPayload) {
    const token = Cookies.get("authToken");

    const res = await fetch(`${API_BASE}/team/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create team");
    return data;
}

async function updateTeam({ id, payload }: { id: string; payload: UpdateTeamPayload }) {
    const token = Cookies.get("authToken");
    if (!id) throw new Error("Team ID is required");

    const res = await fetch(`${API_BASE}/team/edit/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update team");
    return data;
}

/* ——— HOOKS ——— */

export function useTeamsByCampaign(campaignId: string, campaignCode?: string) {
    return useQuery({
        queryKey: ["teams", "campaign", campaignId, campaignCode],
        queryFn: () => fetchTeamsByCampaign(campaignId, campaignCode),
        enabled: !!campaignId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useTeamsByZone(options: { zoneId: string; zoneCode?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: ["teams", "zone", options.zoneId, options.zoneCode, options.page, options.limit],
        queryFn: () => fetchTeamsByZone(options),
        enabled: !!options.zoneId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useFieldTeamMembers(teamId: string, teamCode?: string) {
    return useQuery({
        queryKey: ["team-members", teamId, teamCode],
        queryFn: () => fetchTeamMembers(teamId, teamCode),
        enabled: !!teamId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTeam,
        onSuccess: () => {
            toast.success("Team created successfully!");
            queryClient.invalidateQueries({ queryKey: ["teams"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to create team");
        },
    });
}

export function useUpdateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateTeam,
        onSuccess: () => {
            toast.success("Team updated successfully!");
            queryClient.invalidateQueries({ queryKey: ["teams"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update team");
        },
    });
}
