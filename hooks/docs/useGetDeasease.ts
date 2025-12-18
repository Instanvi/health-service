"use client";

import { BASE_URL } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";

// -------------------- TYPES --------------------

// Granularity type for statistics endpoints
type Granularity = "daily" | "weekly" | "monthly" | "yearly";

// Common parameters for statistic endpoints
export interface StatsParams {
    granularity?: Granularity;
    start_date?: string;
    end_date?: string;
}

// 1. The gender distribution (m = male, f = female)
export interface GenderStats {
    m: number;
    f: number;
}

// 2. The specific age groups defined in your data
export interface AgeGroupStats {
    "0_14": GenderStats;
    "15_24": GenderStats;
    "25_64": GenderStats;
    "65_plus": GenderStats;
}

// 3. The main object for a single disease entry
export interface DiseaseReportItem {
    disease: string;
    suspected_cases: AgeGroupStats;
    deaths: AgeGroupStats;
    sample_cases: number;
    confirmed_cases: number;
}

// 4. The final response type (an array of the items)
export type DiseaseReportResponse = DiseaseReportItem[];

// -------------------- API --------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || BASE_URL;

// Helper to get auth token
const getAuthHeader = () => {
    const token = Cookies.get("authToken");
    if (!token) throw new Error("No auth token found");
    return { Authorization: `Bearer ${token}` };
};

// Helper to build the query string for stats endpoints
const buildStatsQuery = (params: StatsParams) => {
    const query = new URLSearchParams({
        granularity: params.granularity || "daily",
    });
    if (params.start_date) query.append("start_date", params.start_date);
    if (params.end_date) query.append("end_date", params.end_date);
    return query.toString();
};

// Fetch disease statistics from API
async function fetchDiseaseStats(params: StatsParams): Promise<DiseaseReportResponse> {
    const query = buildStatsQuery(params);
    const res = await fetch(
        `${API_BASE}/statistics/disease?${query}`,
        {
            method: "GET",
            headers: {
                accept: "application/json",
                ...getAuthHeader(),
            },
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to load disease statistics");
    }

    return res.json();
}

// -------------------- REACT QUERY HOOK --------------------

// Hook: Get Disease Statistics
export function useGetDiseaseStats(params: StatsParams = {}) {
    const defaultParams: StatsParams = { granularity: "daily", ...params };
    return useQuery<DiseaseReportResponse, Error>({
        queryKey: ["statistics", "disease", defaultParams],
        queryFn: () => fetchDiseaseStats(defaultParams),
    });
}