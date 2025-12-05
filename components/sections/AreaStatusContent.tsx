"use client";

import React, { useMemo, useState, useCallback, memo, useRef } from "react";
import { GoogleMap, HeatmapLayer } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/GoogleMapsProvider";
import { TrendingUp } from "lucide-react";
import { Card } from "../ui/card";
import { useGetFacilities } from "@/components/facility/hooks/useFacility";
import { useGetCasesStats, CasesStatsResponse, useGetCasesBySymptoms } from "@/hooks/docs/useGetStatistics";
import {
    format,
    startOfYear,
    addYears,
    startOfMonth,
    addMonths,
    startOfWeek,
    addWeeks,
    addDays,
    getDay,
    isSameDay,
    startOfDay,
    isAfter
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/multi-select";

const mapContainerStyle = { width: "100%", height: "100%" };
const center = { lat: 4.0511, lng: 9.7679 }; // Default to Douala/Wouri area

// ID from user request, assumed to be Wouri District or similar parent
const PARENT_FACILITY_ID = "69207e34d5291f6e10b4a5d9";

// Common symptoms options (you can expand this list)
const SYMPTOM_OPTIONS = [
    { label: "Malaria", value: "malaria" },
    { label: "Fever", value: "fever" },
    { label: "Cough", value: "cough" },
    { label: "Headache", value: "headache" },
    { label: "Fatigue", value: "fatigue" },
    { label: "Nausea", value: "nausea" },
    { label: "Vomiting", value: "vomiting" },
    { label: "Diarrhea", value: "diarrhea" },
    { label: "Abdominal Pain", value: "abdominal_pain" },
    { label: "Chest Pain", value: "chest_pain" },
];

// --- Date Logic Helpers (Ported from DataEntriesContent) ---
type ViewType = "YEAR" | "MONTH" | "WEEK" | "DAY";

interface TimeUnit {
    id: string;
    date: Date;
    label: string;
    value: string;
    isToday: boolean;
}

const VIEW_OPTIONS = [
    { label: "YEAR" as ViewType, tooltip: "View data grouped by year" },
    { label: "MONTH" as ViewType, tooltip: "View data grouped by month" },
    { label: "WEEK" as ViewType, tooltip: "View data grouped by week" },
    { label: "DAY" as ViewType, tooltip: "View data grouped by day" },
] as const;

const DAY_ABBRS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const UNIT_COUNTS = { DAY: 7, WEEK: 8, MONTH: 8, YEAR: 7 } as const;

const getStartOfToday = (): Date => startOfDay(new Date());
const dayAbbreviation = (date: Date): string => DAY_ABBRS[getDay(date)];

const getUnitStart = (date: Date, view: ViewType): Date => {
    switch (view) {
        case "DAY": return startOfDay(date);
        case "WEEK": return startOfWeek(date, { weekStartsOn: 1 });
        case "MONTH": return startOfMonth(date);
        case "YEAR": return startOfYear(date);
    }
};

const getUnitEnd = (start: Date, view: ViewType): Date => {
    switch (view) {
        case "DAY": return addDays(start, 1);
        case "WEEK": return addWeeks(start, 1);
        case "MONTH": return addMonths(start, 1);
        case "YEAR": return addYears(start, 1);
    }
};

const addByView = (date: Date, amount: number, view: ViewType): Date => {
    switch (view) {
        case "DAY": return addDays(date, amount);
        case "WEEK": return addWeeks(date, amount);
        case "MONTH": return addMonths(date, amount);
        case "YEAR": return addYears(date, amount);
    }
};

const getUnitId = (date: Date, view: ViewType): string => {
    switch (view) {
        case "DAY": return format(date, "yyyy-MM-dd");
        case "WEEK": return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-ww");
        case "MONTH": return format(startOfMonth(date), "yyyy-MM");
        case "YEAR": return format(startOfYear(date), "yyyy");
    }
};

const getUnitLabel = (date: Date, view: ViewType): string => {
    switch (view) {
        case "YEAR": return "";
        case "WEEK": return "W" + format(date, "w");
        case "MONTH": return format(date, "MMM");
        case "DAY": return dayAbbreviation(date);
    }
};

const getUnitValue = (date: Date, view: ViewType): string => {
    switch (view) {
        case "YEAR": return format(date, "yyyy");
        case "WEEK": return format(date, "w");
        case "MONTH": return format(date, "M");
        case "DAY": return format(date, "d");
    }
};

// --- Components ---

const TimeUnitItem = memo(({
    label,
    value,
    isSelected,
    hasData
}: {
    label: string;
    value: string;
    isSelected: boolean;
    hasData?: boolean;
}) => (
    <div className="flex flex-col items-center relative">
        <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
        <div
            className={cn(
                "w-8 h-8 flex items-center py-5 px-6 justify-center text-sm font-bold text-white rounded-md shadow-sm transition-transform",
                isSelected
                    ? "bg-blue-600 scale-110 ring-2 ring-blue-300"
                    : hasData
                        ? "bg-green-500 hover:bg-green-600 scale-100 hover:scale-105"
                        : "bg-gray-400 hover:bg-gray-500 scale-100 hover:scale-105"
            )}
        >
            {value}
        </div>
        {isSelected && (
            <div className="w-7 h-1 bg-blue-600 rounded-full mt-1 absolute -bottom-2 animate-pulse" />
        )}
    </div>
));
TimeUnitItem.displayName = "TimeUnitItem";

export default function AreaStatusContent() {
    const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");

    // --- Date State & Logic ---
    const today = useRef(getStartOfToday()).current;
    const [selectedDate, setSelectedDate] = useState<Date>(today);
    const [activeView, setActiveView] = useState<ViewType>("DAY");
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

    const { isLoaded } = useGoogleMaps();

    // Computed Values for Date Logic
    const selectedUnitId = useMemo(
        () => getUnitId(selectedDate, activeView),
        [selectedDate, activeView]
    );

    const [startRange, endRange] = useMemo(() => {
        const start = getUnitStart(selectedDate, activeView);
        return [start, getUnitEnd(start, activeView)] as const;
    }, [selectedDate, activeView]);

    // Generate visible time units
    const units = useMemo(() => {
        const result: TimeUnit[] = [];
        const count = UNIT_COUNTS[activeView];
        const half = Math.floor(count / 2);

        for (let i = -half; i <= half; i++) {
            const date = addByView(selectedDate, i, activeView);
            const unitDate = getUnitStart(date, activeView);

            result.push({
                id: getUnitId(unitDate, activeView),
                date: unitDate,
                label: getUnitLabel(unitDate, activeView),
                value: getUnitValue(unitDate, activeView),
                isToday: isSameDay(unitDate, new Date()),
            });
        }
        return result;
    }, [selectedDate, activeView]);

    // Calculate strip range for fetching data availability
    const [stripStart, stripEnd] = useMemo(() => {
        if (units.length === 0) return [new Date(), new Date()];
        const start = units[0].date;
        const end = getUnitEnd(units[units.length - 1].date, activeView);
        return [start, end];
    }, [units, activeView]);

    // Fetch Stats for the Strip (to check for data existence)
    // We use the same hooks but with the strip range
    const { data: stripCasesStats } = useGetCasesStats({
        facility_id: PARENT_FACILITY_ID,
        granularity: activeView === "YEAR" ? "yearly" : activeView === "MONTH" ? "monthly" : activeView === "WEEK" ? "weekly" : "daily",
        child_facility_id: selectedFacilityId || undefined,
        start_date: format(stripStart, "yyyy-MM-dd"),
        end_date: format(stripEnd, "yyyy-MM-dd"),
    });

    const { data: stripSymptomCases } = useGetCasesBySymptoms({
        facility_id: PARENT_FACILITY_ID,
        granularity: activeView === "YEAR" ? "yearly" : activeView === "MONTH" ? "monthly" : activeView === "WEEK" ? "weekly" : "daily",
        child_facility_id: selectedFacilityId || undefined,
        symptoms: selectedSymptoms.join(","),
        combination_type: "all",
        start_date: format(stripStart, "yyyy-MM-dd"),
        end_date: format(stripEnd, "yyyy-MM-dd"),
    });

    // Compute Available Units (Set of IDs that have data)
    const availableUnits = useMemo(() => {
        const available = new Set<string>();

        if (selectedSymptoms.length > 0) {
            if (stripSymptomCases && stripSymptomCases.facilities) {
                // Aggregate time stats from all facilities in the response
                Object.values(stripSymptomCases.facilities).forEach(facility => {
                    if (facility.time_stats) {
                        Object.entries(facility.time_stats).forEach(([dateStr, count]) => {
                            if (count > 0) {
                                // We need to map the API date string back to our unit ID format
                                // API returns YYYY-MM-DD usually.
                                // For DAY view: YYYY-MM-DD matches.
                                // For other views, we might need to parse and convert.
                                const date = new Date(dateStr);
                                const unitId = getUnitId(date, activeView);
                                available.add(unitId);
                            }
                        });
                    }
                });
            }
        } else {
            if (stripCasesStats) {
                stripCasesStats.forEach(diseaseGroup => {
                    Object.values(diseaseGroup).forEach(diseaseData => {
                        if (diseaseData.facility) {
                            Object.values(diseaseData.facility).forEach(facility => {
                                if (facility.time_stats) {
                                    Object.entries(facility.time_stats).forEach(([dateStr, count]) => {
                                        if (count > 0) {
                                            const date = new Date(dateStr);
                                            const unitId = getUnitId(date, activeView);
                                            available.add(unitId);
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }
        }
        return available;
    }, [stripCasesStats, stripSymptomCases, selectedSymptoms, activeView]);

    // Callbacks
    const handleUnitClick = useCallback((id: string) => {
        const unit = units.find(u => u.id === id);
        if (unit) setSelectedDate(getUnitStart(unit.date, activeView));
    }, [units, activeView]);

    const handleCalendarSelect = useCallback((date: Date | undefined) => {
        if (date) setSelectedDate(startOfDay(date));
    }, []);

    const handleViewChange = useCallback((view: ViewType) => {
        setActiveView(view);
        setSelectedDate(prev => getUnitStart(prev, view));
    }, []);

    // Fetch Facilities for Dropdown
    const { data: facilitiesData, isLoading: isLoadingFacilities } = useGetFacilities(PARENT_FACILITY_ID);

    // Fetch Cases Statistics
    const { data: casesStats, isLoading: isLoadingStats } = useGetCasesStats({
        facility_id: PARENT_FACILITY_ID,
        granularity: activeView === "YEAR" ? "yearly" : activeView === "MONTH" ? "monthly" : activeView === "WEEK" ? "weekly" : "daily",
        child_facility_id: selectedFacilityId || undefined,
        start_date: format(startRange, "yyyy-MM-dd"),
        end_date: format(endRange, "yyyy-MM-dd"),
    });

    // Fetch Cases by Symptoms (when symptoms are selected)
    const { data: symptomCasesData, isLoading: isLoadingSymptomCases } = useGetCasesBySymptoms({
        facility_id: PARENT_FACILITY_ID,
        granularity: activeView === "YEAR" ? "yearly" : activeView === "MONTH" ? "monthly" : activeView === "WEEK" ? "weekly" : "daily",
        child_facility_id: selectedFacilityId || undefined,
        symptoms: selectedSymptoms.join(","),
        combination_type: "all",
        start_date: format(startRange, "yyyy-MM-dd"),
        end_date: format(endRange, "yyyy-MM-dd"),
    });

    // Process Cases Data for Sidebar
    const processedStats = useMemo(() => {
        // If symptoms are selected, show symptom-filtered data
        if (selectedSymptoms.length > 0 && symptomCasesData) {
            return [{
                name: `Symptoms: ${selectedSymptoms.join(", ")}`,
                cases: symptomCasesData.total_cases,
                trend: 0,
                facilityData: symptomCasesData.facilities
            }];
        }

        // Otherwise show regular disease stats
        if (!casesStats) return [];

        return casesStats.map(item => {
            const diseaseName = Object.keys(item)[0];
            const data = item[diseaseName];
            return {
                name: diseaseName,
                cases: data.total_cases,
                trend: 0,
                facilityData: data.facility
            };
        });
    }, [casesStats, symptomCasesData, selectedSymptoms]);

    // Process Heatmap Data
    const heatmapData = useMemo(() => {
        if (!isLoaded || !window.google) return [];

        const points: google.maps.LatLng[] = [];

        // If symptoms are selected, use symptom-filtered data
        if (selectedSymptoms.length > 0 && symptomCasesData) {
            Object.values(symptomCasesData.facilities).forEach(facility => {
                const { latitude, longitude } = facility.info;
                if (latitude && longitude) {
                    points.push({
                        location: new google.maps.LatLng(latitude, longitude),
                        weight: facility.total_cases
                    } as any);
                }
            });
            return points;
        }

        // Otherwise use regular disease stats
        if (!casesStats) return [];

        casesStats.forEach(item => {
            const diseaseName = Object.keys(item)[0];
            const diseaseData = item[diseaseName];

            Object.values(diseaseData.facility).forEach(facility => {
                const { latitude, longitude } = facility.info;
                if (latitude && longitude) {
                    points.push({
                        location: new google.maps.LatLng(latitude, longitude),
                        weight: facility.total_cases
                    } as any);
                }
            });
        });

        return points;
    }, [isLoaded, casesStats, symptomCasesData, selectedSymptoms]);

    return (
        <div className="h-screen bg-gray-100 flex flex-col">
            {/* Top Header Bar */}
            <div className="bg-white px-6 py-4 flex flex-col gap-4 shadow-sm z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 m-0 bg-blue-50 rounded border border-blue-300">
                            <span className="text-blue-700 font-semibold text-sm">Wouri District</span>
                        </div>
                        <div className="relative">
                            <select
                                className="px-4 py-2 m-0 bg-blue-50 rounded border border-blue-300 text-blue-700 font-semibold text-sm appearance-none pr-8 cursor-pointer"
                                value={selectedFacilityId}
                                onChange={(e) => setSelectedFacilityId(e.target.value)}
                                disabled={isLoadingFacilities}
                            >
                                <option value="">All Health Areas</option>
                                {facilitiesData?.results?.map((facility) => (
                                    <option key={facility._id} value={facility._id}>
                                        {facility.name}
                                    </option>
                                ))}
                            </select>
                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {/* Symptoms Multi-Select */}
                        <div className="w-[280px] m-0">
                            <MultiSelect
                                options={SYMPTOM_OPTIONS}
                                selected={selectedSymptoms}
                                onChange={setSelectedSymptoms}
                                placeholder="Filter by symptoms..."
                                className="w-full m-0 h-11"
                            />
                        </div>
                    </div>

                    {/* Time Navigation (Ported UI) */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-[200px] justify-start text-left font-normal h-10">
                                        <span className="mr-2 uppercase text-xs font-semibold">
                                            {activeView === "YEAR" && format(selectedDate, "yyyy")}
                                            {activeView === "MONTH" && format(selectedDate, "MMMM yyyy")}
                                            {activeView === "WEEK" && "Week " + format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "w, yyyy")}
                                            {activeView === "DAY" && format(selectedDate, "PPP")}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={selectedDate} onSelect={handleCalendarSelect} fromYear={2015} toYear={2030} />
                                </PopoverContent>
                            </Popover>
                            <div className="flex p-1 space-x-1 bg-gray-100 rounded-md">
                                {VIEW_OPTIONS.map(v => (
                                    <Button key={v.label} variant={v.label === activeView ? "default" : "ghost"} size="sm" onClick={() => handleViewChange(v.label)}
                                        className={cn("rounded-md px-3 h-8 text-xs", v.label === activeView && "bg-[#028700] hover:bg-[#028700c9]")}>
                                        {v.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Date Strip */}
                        <div className="flex space-x-2 bg-gray-50 rounded-md px-3 py-2 overflow-x-auto date-scroll border border-gray-100">
                            {units.map(u => (
                                <button key={u.id} onClick={() => handleUnitClick(u.id)} className="time-unit-button p-1 rounded-md focus:outline-none">
                                    <TimeUnitItem
                                        label={u.label}
                                        value={u.value}
                                        isSelected={u.id === selectedUnitId}
                                        hasData={availableUnits.has(u.id)}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: Sidebar + Map */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {isLoadingStats ? (
                            <div className="p-5 text-center text-gray-500">Loading statistics...</div>
                        ) : processedStats.length === 0 ? (
                            <div className="p-5 text-center text-gray-500">No data available</div>
                        ) : (
                            processedStats.map((disease, i) => (
                                <div
                                    key={i}
                                    className="px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-900">{disease.name}</h3>
                                        <svg width="60" height="30" viewBox="0 0 60 30" className="text-orange-300">
                                            <path
                                                d="M0 25 L10 18 L20 22 L30 12 L40 16 L50 10 L60 14"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-900 font-bold">{disease.cases} Cases</span>
                                        <div className="flex items-center text-red-600 text-xs font-medium">
                                            <TrendingUp className="w-3.5 h-3.5 mr-1" />
                                            {disease.trend}% from Last week
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Map Container */}
                <Card className="flex-1 relative bg-gray-100 shadow-inner">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={center}
                            zoom={10}
                            options={{
                                zoomControl: true,
                                zoomControlOptions: { position: 7 }, // RIGHT_CENTER
                                streetViewControl: false,
                                mapTypeControl: false,
                                fullscreenControl: false,
                            }}
                        >
                            <HeatmapLayer
                                data={heatmapData}
                                options={{
                                    radius: 40,
                                    opacity: 0.85,
                                    dissipating: true,
                                    gradient: [
                                        "rgba(0, 255, 255, 0)",
                                        "rgba(0, 255, 255, 1)",
                                        "rgba(0, 191, 255, 1)",
                                        "rgba(0, 127, 255, 1)",
                                        "rgba(0, 63, 255, 1)",
                                        "rgba(0, 0, 255, 1)",
                                        "rgba(0, 0, 223, 1)",
                                        "rgba(0, 0, 191, 1)",
                                        "rgba(0, 0, 159, 1)",
                                        "rgba(0, 0, 127, 1)",
                                        "rgba(63, 0, 91, 1)",
                                        "rgba(127, 0, 63, 1)",
                                        "rgba(191, 0, 31, 1)",
                                        "rgba(255, 0, 0, 1)",
                                    ],
                                }}
                            />
                        </GoogleMap>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200">
                            <p className="text-gray-600">Loading map...</p>
                        </div>
                    )}

                    {/* Table View Button */}
                    <div className="absolute bottom-4 right-16 z-10">
                        <button className="bg-white px-5 py-3  rounded-lg shadow-lg border border-gray-300 font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition">
                            Table view
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-blue-600"
                            >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="18" x2="12" y2="18"></line>
                                <line x1="9" y1="14" x2="15" y2="14"></line>
                                <line x1="9" y1="10" x2="15" y2="10"></line>
                            </svg>
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
}