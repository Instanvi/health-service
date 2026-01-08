'use client'
import { useMutation, useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { BASE_URL } from "@/lib/axios";

export interface params {
    page: number;
    limit: number;
    period?: 'weekly' | 'monthly' | 'yearly';

}

export interface DHISReportResponse {
    tasks: {
        _id: string;
        task_id: string;
        service: string;
        created_by: string;
        facility_id: string;
        status: string;
        dataset_name: string;
        period_value: string;
        metadata: {
            created_at: string;
        };
        started_at: string;
        attempts: number;
        completed_at: string;
        current_status: string;
        next_retry_in_seconds: number;
        next_retry_at: string;
    }[]
}

// -------------------- API --------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || BASE_URL;

// Helper to get auth token - assuming these endpoints also need the main app auth
const getAuthHeader = (): Record<string, string> => {
    const token = Cookies.get("authToken");
    if (!token) {
        return {};
    }
    return { Authorization: `Bearer ${token}` };
};


async function fetchDHIS2Report(params: params) {
    const res = await fetch(`${API_BASE}/dhis2/${params.period || 'weekly'}/report/list?page=${params.page}&limit=${params.limit}`, {
        headers: {
            accept: "application/json",
            ...getAuthHeader(),
        },
    })

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch DHIS2 report");
    }

    return res.json();
}

async function fetchDHIS2ReportById(params: { taskId: string, period?: 'weekly' | 'monthly' | 'yearly' }) {
    const res = await fetch(`${API_BASE}/dhis2/${params.period || 'weekly'}/report/status/${params.taskId}`, {
        headers: {
            accept: "application/json",
            ...getAuthHeader(),
        },
    })

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch DHIS2 report");
    }

    return res.json();
}

export function useFetchDHIS2Report(params: params, options?: any) {
    return useQuery<DHISReportResponse>({
        queryKey: ["dhis2", "report", params],
        queryFn: () => fetchDHIS2Report(params),
        ...options
    })
}

export function useFetchDHIS2ReportById(params: { taskId: string, period?: 'weekly' | 'monthly' | 'yearly' }, options?: any) {
    return useQuery<DHISReportResponse>({
        queryKey: ["dhis2", "report", params],
        queryFn: () => fetchDHIS2ReportById(params),
        ...options
    })
}
