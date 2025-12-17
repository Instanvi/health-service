"use client";

import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { BASE_URL } from "@/lib/axios";

// -------------------- TYPES --------------------

export interface ConnectDHIS2Payload {
    username: string;
    password?: string; // Made optional as per some definitions, but usually required. sticking to curl which has it.
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

// 1. Connect to DHIS2
async function connectDHIS2(payload: ConnectDHIS2Payload) {
    const res = await fetch(`${API_BASE}/dhis2/connect`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to connect to DHIS2");
    }

    return res.json();
}

// 2. Send Weekly Report
// 2. Send Weekly Report
async function sendWeeklyReport(healthCenter: string) {
    const url = new URL(`${API_BASE}/dhis2/weekly/report`);
    if (healthCenter) {
        url.searchParams.append("health_center", healthCenter);
    }

    const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
            accept: "application/json",
            ...getAuthHeader(),
        },
        body: "", // curl used -d '' which sends empty body.
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to send weekly report");
    }

    return res.json();
}

// -------------------- REACT QUERY HOOKS --------------------

// Hook: Connect to DHIS2
export function useConnectDHIS2() {
    return useMutation({
        mutationFn: connectDHIS2,
    });
}

// Hook: Send Weekly Report
export function useSendWeeklyReport() {
    return useMutation({
        mutationFn: sendWeeklyReport,
    });
}
