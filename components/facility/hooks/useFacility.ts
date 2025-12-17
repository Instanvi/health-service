"use client";

import { useMutation, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { FacilityPayload, FacilityResponse } from "../types";
import { BASE_URL } from "@/lib/axios";

// -------------------- API --------------------
const API_BASE = process.env.NEXT_PUBLIC_API_URL || BASE_URL;

// GET children facilities
async function fetchFacilities(parentId: string, page = 1, limit = 100): Promise<FacilityResponse> {
  const token = Cookies.get("authToken");

  const res = await fetch(
    `${API_BASE}/facility/children/${parentId}?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load facilities");
  }

  return res.json();
}

// POST create facility
async function createFacility(payload: FacilityPayload) {
  const token = Cookies.get("authToken");

  const res = await fetch(`${API_BASE}/facility/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.detail || "Failed to create facility");
  }

  return data;
}

// -------------------- HOOKS --------------------

// GET hook
export function useGetFacilities(parentId: string, page = 1, limit = 100) {
  return useQuery<FacilityResponse>({
    queryKey: ["facilities", parentId, page, limit],
    queryFn: () => fetchFacilities(parentId, page, limit),
  });
}

// Infinite GET hook for pagination
export function useGetFacilitiesInfinite(parentId: string, limit = 20) {
  return useInfiniteQuery({
    queryKey: ["facilities-infinite", parentId],
    queryFn: ({ pageParam = 1 }) => fetchFacilities(parentId, pageParam as number, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const morePagesExist = lastPage.page * lastPage.limit < lastPage.count;
      return morePagesExist ? lastPage.page + 1 : undefined;
    },
    enabled: !!parentId,
  });
}

// POST hook
export function useCreateFacility() {
  return useMutation({
    mutationFn: (payload: FacilityPayload) => createFacility(payload),
  });
}
