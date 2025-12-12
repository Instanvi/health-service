"use client";

import { CreateUserPayload } from "@/components/team/hooks/useTeamMembers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { toast } from "sonner";

/* ——— TYPES ——— */

export interface TeamCampaign {
    _id: string;
    name: string;
    code: string;
    status: string;
}

export interface TeamZone {
    _id: string;
    name: string;
    code: string;
}

export interface TeamLead {
    _id: string;
    first_name: string;
    last_name: string;
    code: string;
}

export interface TeamMetadata {
    created_at: string;
    created_by: string;
    modified_at: string;
    modified_by: string;
    facility_id: string;
}

export interface Team {
    _id: string;
    name: string;
    campaign_id: string;
    zone_id: string;
    team_lead_id: string;
    code?: string;
    members: string[]; // Array of member IDs
    metadata?: TeamMetadata;
    campaign?: TeamCampaign;
    zone?: TeamZone;
    team_lead?: TeamLead;
    created_at?: string;
    updated_at?: string;
}

export interface Pagination {
    current_page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
}

export interface FacilityTeamsResponse {
    message: string;
    facility_id: string;
    teams: Team[];
    pagination: Pagination;
}

export interface TeamMember {
    _id: string;
    username?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    role?: string;
    code?: string;
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

async function createCampaigner(payload: CreateUserPayload) {
    const token = Cookies.get("authToken");

    const res = await fetch(`${API_BASE}/auth/create-campaigner`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create user");
    return data;
}

async function fetchTeamsByCampaign(options: { campaignId: string; campaignCode?: string; page?: number; limit?: number }): Promise<{ teams: Team[]; count: number; pagination?: Pagination }> {
    const { campaignId, campaignCode, page = 1, limit = 10 } = options;
    const token = Cookies.get("authToken");
    if (!campaignId) return { teams: [], count: 0 };

    const queryParams = new URLSearchParams();
    queryParams.append("campaign_id", campaignId);
    if (campaignCode) queryParams.append("campaign_code", campaignCode);
    queryParams.append("page", page.toString());
    queryParams.append("page_size", limit.toString());

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

    // Handle both array response and paginated response
    let teams: Team[] = [];
    let pagination: Pagination | undefined;

    if (Array.isArray(data)) {
        teams = data;
    } else {
        teams = data.teams || data.results || [];
        if (data.pagination) {
            pagination = {
                current_page: data.pagination.current_page ?? data.pagination.page ?? page,
                page_size: data.pagination.page_size ?? data.pagination.limit ?? limit,
                total_items: data.pagination.total_items ?? data.pagination.total ?? teams.length,
                total_pages: data.pagination.total_pages ?? 1,
                has_next: data.pagination.has_next ?? false,
                has_previous: data.pagination.has_previous ?? false
            };
        }
    }

    return {
        teams,
        count: pagination?.total_items || teams.length,
        pagination
    };
}

async function fetchTeamsByZone(options: { zoneId: string; zoneCode?: string; page?: number; limit?: number }): Promise<{ teams: Team[]; count: number; pagination?: Pagination }> {
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

    let pagination: Pagination | undefined;
    if (data.pagination) {
        pagination = {
            current_page: data.pagination.current_page ?? data.pagination.page ?? 1,
            page_size: data.pagination.page_size ?? data.pagination.limit ?? limit,
            total_items: data.pagination.total_items ?? data.pagination.total ?? 0,
            total_pages: data.pagination.total_pages ?? 1,
            has_next: data.pagination.has_next ?? false,
            has_previous: data.pagination.has_previous ?? false
        };
    }

    return {
        teams: data.teams || [],
        count: data.pagination?.total_items || data.teams?.length || 0,
        pagination: pagination
    };
}

async function fetchTeamsByFacility(options: { page?: number; pageSize?: number }): Promise<FacilityTeamsResponse> {
    const { page = 1, pageSize = 10 } = options;
    const token = Cookies.get("authToken");

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("page_size", pageSize.toString());

    const res = await fetch(`${API_BASE}/team/facility?${queryParams.toString()}`, {
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to fetch facility teams" }));
        throw new Error(error.message || "Failed to load facility teams");
    }

    const data: FacilityTeamsResponse = await res.json();
    return data;
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

    // Handle various response formats
    if (Array.isArray(data)) return data;
    if (data.members && Array.isArray(data.members)) return data.members;
    if (data.results && Array.isArray(data.results)) return data.results;
    if (data.data && Array.isArray(data.data)) return data.data;

    return [];
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

export function useTeamsByCampaign(options: { campaignId: string; campaignCode?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: ["teams", "campaign", options.campaignId, options.campaignCode, options.page, options.limit],
        queryFn: () => fetchTeamsByCampaign(options),
        enabled: !!options.campaignId,
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

export function useTeamsByFacility(options: { page?: number; pageSize?: number } = {}) {
    return useQuery({
        queryKey: ["teams", "facility", options.page, options.pageSize],
        queryFn: () => fetchTeamsByFacility(options),
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


export function useCreateCampaigner() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCampaigner,
        onSuccess: () => {
            toast.success("User created successfully!");

            // refresh list
            queryClient.invalidateQueries({
                queryKey: ["team-members"],
            });
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });
}
