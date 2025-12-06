'use client';

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
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
    isAfter,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, MapPin, Loader2, UserCheck } from "lucide-react";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FacilityDetailSheet } from "../FacilityDetailSheet";
import GoogleMapViewer from "@/components/team/GoogleMapViewer";
import { useRouter } from "next/navigation";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGetFacilities } from "../facility/hooks/useFacility";
import { cn } from "@/lib/utils";

/* ────────────────────── INTERFACES ────────────────────── */
export interface Facility {
    _id: string;
    name: string;
    email: string[];
    phone: string[];
    parent_id?: string;
    facility_type: string;
    code: string;
    location?: {
        country: string;
        city: string;
        address: string;
        longitude?: number;
        latitude?: number;
    };
    submitted_status?: Record<string, "complete" | "incomplete" | "none">;
}

/* ────────────────────── TYPES ────────────────────── */
type ViewType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
type StatusKey = 'complete' | 'incomplete' | 'missing' | 'future';

const STATUS_CONFIG = {
    complete: { label: "Completed", color: "bg-green-500", icon: Check, tooltip: "All records verified" },
    incomplete: { label: "In Progress", color: "bg-yellow-400", icon: AlertTriangle, tooltip: "Needs attention" },
    missing: { label: "No Data", color: "bg-red-500", icon: X, tooltip: "No submission" },
    future: { label: "Future", color: "bg-gray-400", icon: X, tooltip: "Not yet due" },
} as const;

/* ────────────────────── UTILS ────────────────────── */
const getStartOfToday = () => startOfDay(new Date());
const dayAbbreviation = (date: Date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][getDay(date)];

/* ────────────────────── DATE HELPERS ────────────────────── */
const getUnitStart = (date: Date, view: ViewType): Date => {
    switch (view) {
        case 'DAY': return startOfDay(date);
        case 'WEEK': return startOfWeek(date, { weekStartsOn: 1 });
        case 'MONTH': return startOfMonth(date);
        case 'YEAR': return startOfYear(date);
        default: return date;
    }
};

const getUnitEnd = (start: Date, view: ViewType): Date => {
    switch (view) {
        case 'DAY': return addDays(start, 1);
        case 'WEEK': return addWeeks(start, 1);
        case 'MONTH': return addMonths(start, 1);
        case 'YEAR': return addYears(start, 1);
        default: return addDays(start, 1);
    }
};

/* ────────────────────── STATUS LOGIC PER FACILITY ────────────────────── */
const getFacilityStatusForUnit = (unitDate: Date, facility: Facility, view: ViewType): StatusKey => {
    const start = getUnitStart(unitDate, view);
    const end = getUnitEnd(start, view);
    const today = getStartOfToday();

    if (isAfter(start, today)) return "future";

    let hasComplete = false;
    let hasInProgress = false;

    let current = start;
    while (current < end) {
        const key = format(current, "yyyy-MM-dd 00:00:00");
        const status = facility.submitted_status?.[key];

        if (status === "complete") hasComplete = true;
        if (status === "incomplete") hasInProgress = true;

        current = addDays(current, 1);
    }

    if (hasInProgress) return "incomplete";
    if (hasComplete) return "complete";
    return "missing";
};

/* ────────────────────── GLOBAL STATUS FOR TIME UNIT ────────────────────── */
const getGlobalStatusForUnit = (unitDate: Date, facilities: Facility[], view: ViewType): StatusKey => {
    const today = getStartOfToday();
    const unitStart = getUnitStart(unitDate, view);

    if (isAfter(unitStart, today)) return "future";

    let anyFacilityHasData = false;
    let allComplete = true;
    let anyInProgress = false;

    for (const facility of facilities) {
        const status = getFacilityStatusForUnit(unitDate, facility, view);

        if (status === "complete") anyFacilityHasData = true;
        else if (status === "incomplete") {
            anyFacilityHasData = true;
            anyInProgress = true;
            allComplete = false;
        } else if (status === "missing") {
            allComplete = false;
        }
    }

    if (!anyFacilityHasData) return "missing";
    if (anyInProgress || !allComplete) return "incomplete";
    return "complete";
};

/* ────────────────────── TIME UNIT ITEM ────────────────────── */
const TimeUnitItem = ({ label, value, status, isSelected }: {
    label: string;
    value: string;
    status: StatusKey;
    isSelected: boolean;
}) => {
    const { color, icon: Icon } = STATUS_CONFIG[status];

    return (
        <div className="flex flex-col items-center relative">
            <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
            <div className={`w-8 h-8 p-6 px-7 flex items-center justify-center text-sm font-bold text-white rounded-md ${color} shadow-sm transition-all ${isSelected ? 'scale-110 ring-2 ring-blue-500' : 'hover:scale-105'}`}>
                {value}
            </div>
            {isSelected && <div className="w-7 h-1 bg-blue-600 rounded-full mt-1 absolute -bottom-2 animate-pulse"></div>}
        </div>
    );
};

/* ────────────────────── MAIN COMPONENT ────────────────────── */
export default function FacilitiesContent() {
    const router = useRouter();
    const userDataString = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
    const personel = userDataString ? JSON.parse(userDataString) : null;
    const currentUserFacilityId = personel?.facility?.id;
    const currentUserName = personel?.name || "Dr. Admin User"; // Fallback name

    const [selectedStatus, setSelectedStatus] = useState<"complete" | "incomplete" | "missing" | null>(null);
    const [selectedParentId] = useState<string>(currentUserFacilityId || "");
    const { data, isLoading: isFetching, error } = useGetFacilities(selectedParentId);
    const facilities = data?.results || [];

    // Supervision State
    const [supervisionState, setSupervisionState] = useState<Record<string, string>>({});
    const [submittingSupervisionId, setSubmittingSupervisionId] = useState<string | null>(null);

    useEffect(() => { if (error) toast.error("Error fetching facilities"); }, [error]);

    const today = getStartOfToday();
    const [activeView, setActiveView] = useState<ViewType>('MONTH');
    const [selectedDate, setSelectedDate] = useState<Date>(today);
    const [selectedUnitId, setSelectedUnitId] = useState<string>("");
    const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [_activeTab, _setActiveTab] = useState<'details' | 'map'>('details');

    /* ────────────────────── DUMMY API SIMULATION ────────────────────── */
    const handleSupervisionConfirm = async (unitId: string) => {
        setSubmittingSupervisionId(unitId);

        // Simulate API latency
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setSupervisionState(prev => ({
            ...prev,
            [unitId]: currentUserName
        }));

        setSubmittingSupervisionId(null);
        toast.success("Supervision confirmed successfully");
    };

    /* ────────────────────── FILTERED UNITS (DATES) ────────────────────── */
    const units = useMemo(() => {
        const center = selectedDate;
        const result: { id: string; date: Date; label: string; value: string; status: StatusKey }[] = [];

        const count = activeView === 'YEAR' ? 5 : 10;
        const offset = activeView === 'YEAR' ? -2 : -4;

        for (let i = offset; i < offset + count; i++) {
            const d = activeView === 'DAY' ? addDays(center, i) :
                activeView === 'WEEK' ? addWeeks(center, i) :
                    activeView === 'MONTH' ? addMonths(center, i) :
                        addYears(center, i);

            const unitDate = getUnitStart(d, activeView);
            const id = format(unitDate, activeView === 'WEEK' ? 'yyyy-ww' : activeView === 'YEAR' ? 'yyyy' : activeView === 'MONTH' ? 'yyyy-MM' : 'yyyy-MM-dd');

            const label = activeView === 'DAY' ? dayAbbreviation(unitDate) :
                activeView === 'WEEK' ? `W${format(unitDate, 'w')}` :
                    activeView === 'MONTH' ? format(unitDate, 'MMM') : '';

            const value = activeView === 'YEAR' ? format(unitDate, 'yyyy') :
                activeView === 'MONTH' ? format(unitDate, 'M') :
                    activeView === 'WEEK' ? format(unitDate, 'w') : format(unitDate, 'd');

            const globalStatus = getGlobalStatusForUnit(unitDate, facilities, activeView);

            // Only show units that match the selected status
            if (selectedStatus && globalStatus !== selectedStatus) continue;

            result.push({ id, date: unitDate, label, value, status: globalStatus });
        }

        return result;
    }, [selectedDate, activeView, facilities, selectedStatus]);

    // Auto-select middle unit
    useEffect(() => {
        if (units.length > 0 && !units.some(u => u.id === selectedUnitId)) {
            const middle = units[Math.floor(units.length / 2)];
            setSelectedUnitId(middle.id);
            setSelectedDate(middle.date);
        }
    }, [units, selectedUnitId]);

    /* ────────────────────── ROWS WITH STATUS PER VISIBLE UNIT ────────────────────── */
    const starkRows = useMemo(() => {
        return facilities.map((facility) => {
            const statusByUnit = units.map(unit =>
                getFacilityStatusForUnit(unit.date, facility, activeView)
            );

            return {
                id: facility._id,
                code: facility.code,
                facilityName: facility.name,
                address: facility.location?.address || "No address",
                country: facility.location?.country,
                city: facility.location?.city,
                statusByUnit,
                details: facility,
            };
        });
    }, [facilities, units, activeView]);

    /* ────────────────────── FILTERED ROWS (ONLY FACILITIES WITH SELECTED STATUS ON VISIBLE DATES) ────────────────────── */
    const filteredRows = useMemo(() => {
        if (!selectedStatus) return starkRows;

        return starkRows.filter(row => {
            return row.statusByUnit.some(status => status === selectedStatus);
        });
    }, [starkRows, selectedStatus]);

    const handleStatusFilter = (status: "complete" | "incomplete" | "missing" | null) => {
        setSelectedStatus(prev => (prev === status ? null : status));
    };

    const handleUnitClick = (id: string) => {
        const unit = units.find(u => u.id === id);
        if (unit) {
            setSelectedUnitId(id);
            setSelectedDate(unit.date);
        }
    };

    const handleCalendarSelect = (date: Date | undefined) => {
        if (date) setSelectedDate(startOfDay(date));
    };

    const handleViewChange = (view: ViewType) => {
        setActiveView(view);
        setSelectedDate(getUnitStart(selectedDate, view));
    };

    const openSheet = (id: string, tab: 'details' | 'map' = 'details') => {
        setSelectedFacilityId(id);
        _setActiveTab(tab);
        setSheetOpen(true);
    };

    const StatusFilterButton = React.memo(({
        status,
        label,
        color,
        isActive,
        onClick,
        tooltip
    }: {
        status: string | null;
        label: string;
        color?: string;
        isActive: boolean;
        onClick: () => void;
        tooltip: string;
    }) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    className={cn(
                        "flex items-center text-sm cursor-pointer transition-all px-4 py-2 group hover:scale-105",
                        isActive && "bg-white rounded-md shadow-sm"
                    )}
                >
                    {color && <div className={cn("w-3 h-3 rounded-full mr-2", color)} />}
                    <span
                        className={cn(
                            "overflow-hidden transition-all whitespace-nowrap duration-300 ease-in-out",
                            isActive || !color
                                ? "opacity-100 max-w-[100px]"
                                : "group-hover:opacity-100 group-hover:max-w-[100px] opacity-0 max-w-0"
                        )}
                    >
                        {label}
                    </span>
                </button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    ));

    StatusFilterButton.displayName = "StatusFilterButton";

    const selectedFacility = starkRows.find(r => r.id === selectedFacilityId);

    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
            {/* Loading Overlay */}
            {isFetching && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                        <p className="text-gray-700 font-medium">Loading statistics...</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 text-purple-700">
                    Health Facilities Overview
                </Badge>

                {/* Status Filter Bar */}
                <div className="flex items-center mt-4 md:mt-0 p-2 border rounded-md bg-gray-100 h-12">
                    <TooltipProvider>
                        <StatusFilterButton status={null} label="All" isActive={selectedStatus === null} onClick={() => handleStatusFilter(null)} tooltip="Show all facilities" />
                        <div className="h-8 w-px bg-gray-300 mx-4" />
                        <StatusFilterButton status="complete" label="Completed" color="bg-green-500" isActive={selectedStatus === "complete"} onClick={() => handleStatusFilter("complete")} tooltip="All records verified" />
                        <div className="h-8 w-px bg-gray-300 mx-4" />
                        <StatusFilterButton status="incomplete" label="In Progress" color="bg-yellow-400" isActive={selectedStatus === "incomplete"} onClick={() => handleStatusFilter("incomplete")} tooltip="Has errors or incomplete submissions" />
                        <div className="h-8 w-px bg-gray-300 mx-4" />
                        <StatusFilterButton status="missing" label="No Data" color="bg-red-500" isActive={selectedStatus === "missing"} onClick={() => handleStatusFilter("missing")} tooltip="No submission for this period" />
                    </TooltipProvider>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
                <div className="bg-white shadow-sm overflow-hidden rounded-lg">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 text-left" colSpan={3}>
                                    <div className="flex items-center space-x-4">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-[180px] justify-start text-left font-normal h-9">
                                                    {format(selectedDate, 'PPP')}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={selectedDate} onSelect={handleCalendarSelect} />
                                            </PopoverContent>
                                        </Popover>

                                        <div className="flex p-1 bg-gray-100 rounded-md">
                                            {(['YEAR', 'MONTH', 'WEEK', 'DAY'] as const).map((v) => (
                                                <Button
                                                    key={v}
                                                    variant={activeView === v ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => handleViewChange(v)}
                                                    className={`${activeView === v ? 'bg-[#028700] hover:bg-[#028700dc]' : ''} py-5`}
                                                >
                                                    {v}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </th>
                                {units.map(u => (
                                    <th key={u.id} className="py-3 text-center border border-b-0 border-t-0">
                                        <button onClick={() => handleUnitClick(u.id)} className="p-1 rounded hover:bg-gray-50 transition">
                                            <TimeUnitItem label={u.label} value={u.value} status={u.status} isSelected={u.id === selectedUnitId} />
                                        </button>
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-4 text-left font-medium text-gray-700">Code</th>
                                <th className="px-4 py-4 text-left font-medium text-gray-700">Facility Name</th>
                                <th className="px-4 py-4 text-left font-medium text-gray-700">Address</th>
                                {units.map(u => <th key={u.id} className="py-3 border border-b-0 border-t-0"></th>)}
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.map(row => (
                                <tr key={row.id} className={`border-b hover:bg-gray-50 ${selectedFacilityId === row.id ? 'bg-blue-50' : ''}`}>
                                    <td className="px-4 py-4 font-medium text-blue-600">{row.code}</td>
                                    <td className="px-4 py-4">
                                        <button onClick={(e) => { e.stopPropagation(); openSheet(row.id, 'details'); }} className="text-left hover:bg-blue-50 rounded px-2 py-1">
                                            <span className="font-medium">{row.facilityName}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-4">
                                        <button onClick={(e) => { e.stopPropagation(); openSheet(row.id, 'map'); }} className="text-left hover:bg-blue-50 rounded px-2 py-1 flex items-center gap-1 text-blue-600">
                                            <MapPin className="w-4 h-4" />
                                            {row.address}
                                        </button>
                                    </td>

                                    {row.statusByUnit.map((status, idx) => {
                                        const { icon: Icon, color } = STATUS_CONFIG[status];
                                        const unit = units[idx];

                                        return (
                                            <td
                                                key={idx}
                                                className="py-3 text-center border border-t-0 cursor-pointer transition-all hover:bg-gray-100"
                                                onClick={() => {
                                                    if (status === "future") {
                                                        toast.info("This date is in the future");
                                                        return;
                                                    }

                                                    const targetStatus = status === "incomplete" || status === "missing" ? "pending" : "confirmed";

                                                    localStorage.setItem("pendingFacilityId", row.id);
                                                    localStorage.setItem("pendingStatusFilter", targetStatus);
                                                    localStorage.setItem("pendingDate", unit.date.toISOString());

                                                    router.push('/data_entries');

                                                    toast.success(`${row.facilityName} → ${targetStatus === "pending" ? "Needs Review" : "Completed"}`);
                                                }}
                                            >
                                                <div className="flex justify-center">
                                                    <div className={`relative transition-all duration-200 ${unit.id === selectedUnitId ? 'scale-125 ring-4 ring-blue-400 ring-opacity-50' : 'scale-100'}`}>
                                                        <Icon className={`w-6 h-6 p-1 text-white ${color} rounded-full shadow-md ${unit.id === selectedUnitId ? 'animate-pulse' : ''} hover:shadow-lg transition-shadow`} />
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>

                        {/* Footer with Supervision Logic */}
                        <tfoot>
                            <tr className="border-t-2 border-gray-200">
                                <td colSpan={3} className="px-4 py-6 font-bold text-gray-600 uppercase text-center text-xs tracking-wider align-middle">
                                    Supervised By
                                </td>
                                {units.map(u => {
                                    const isEligible = u.status === 'complete' || u.status === 'incomplete';
                                    const confirmedBy = supervisionState[u.id];
                                    const isSubmitting = submittingSupervisionId === u.id;

                                    return (
                                        <td key={u.id} className="py-4 border-l border-gray-200 align-bottom pb-2">
                                            <div className="flex flex-col items-center justify-end h-32 w-full">
                                                {isEligible ? (
                                                    confirmedBy ? (
                                                        /* Vertical Confirmed User Name */
                                                        <div className="flex items-center justify-center gap-2 h-full opacity-80 hover:opacity-100 transition-opacity">
                                                            <UserCheck className="w-4 h-4 text-green-600 mb-2" />
                                                            <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                                                                {confirmedBy}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        /* Vertical Confirm Button */
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSupervisionConfirm(u.id)}
                                                            disabled={isSubmitting}
                                                            className={cn(
                                                                "h-full min-h-[100px] w-8 p-0 hover:bg-blue-50 transition-all duration-300 border-dashed border-gray-300 hover:border-blue-300",
                                                                isSubmitting && "opacity-50 cursor-not-allowed"
                                                            )}
                                                        >
                                                            {isSubmitting ? (
                                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                                                                    Confirm
                                                                </span>
                                                            )}
                                                        </Button>
                                                    )
                                                ) : (
                                                    /* Placeholder for non-eligible columns */
                                                    <div className="h-full w-full "></div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>

                    {isFetching && <div className="p-8 text-center text-gray-500">Loading facilities...</div>}
                    {!isFetching && filteredRows.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            {selectedStatus === null
                                ? "No facilities found."
                                : `No facilities with "${STATUS_CONFIG[selectedStatus].label}" status in the current view`}
                        </div>
                    )}
                </div>
            </div>

            <FacilityDetailSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                activeTab={_activeTab}
                onTabChange={_setActiveTab}
                facility={selectedFacility ? {
                    id: selectedFacility.id,
                    code: selectedFacility.code,
                    facilityName: selectedFacility.facilityName,
                    address: selectedFacility.address,
                    details: selectedFacility.details ? {
                        country: selectedFacility.country,
                        city: selectedFacility.city,
                        facilityName: selectedFacility.details.name,
                        address: selectedFacility.details.location?.address,
                        facilityType: selectedFacility.details.facility_type,
                        phone: selectedFacility.details.phone[0] || '',
                        email: selectedFacility.details.email[0] || '',
                    } : undefined,
                    // contacts: selectedFacility.contacts,
                } : undefined}
                mapComponent={selectedFacility && (
                    <GoogleMapViewer
                        address={selectedFacility.address}
                        facilityName={selectedFacility.facilityName}
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
                    />
                )}
            />
        </div>
    );
}