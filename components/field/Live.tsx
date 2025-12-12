"use client";

import { Dispatch, SetStateAction, useState, useMemo, useEffect } from "react";
import { MapPin, Users, Search, ChevronDown, Loader2 } from "lucide-react";
import { CalendarPlusIcon, MapPinSimpleAreaIcon, MegaphoneIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import FieldMap from "@/components/field/FieldMap";
import { useCampaigns } from "./hooks/useCampaigns";
import { useZonesByFacility, useZonesByCampaign, FacilityZone, Zone } from "./hooks/useZones";
import { useTeamsByFacility, useTeamsByZone, useTeamsByCampaign, useFieldTeamMembers, Team } from "./hooks/useFieldTeams";

const DATE_OPTIONS = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "last7days", label: "Last 7 Days" },
    { id: "last30days", label: "Last 30 Days" },
    { id: "thismonth", label: "This Month" },
];

interface SearchableDropdownProps {
    options: { id: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon: React.ReactNode;
    isLoading?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    loadingMore?: boolean;
}

function SearchableDropdown({
    options,
    value,
    onChange,
    placeholder,
    icon,
    isLoading,
    hasMore,
    onLoadMore,
    loadingMore,
}: SearchableDropdownProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        return options.filter(option =>
            option.label.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    const selectedLabel = options.find(o => o.id === value)?.label || placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 bg-white rounded-sm px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors min-w-[160px]",
                        "border border-gray-100"
                    )}
                >
                    {icon}
                    <span className="text-[#a0a0a0] flex-1 text-left truncate">{selectedLabel}</span>
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 text-[#D0BEBE] animate-spin" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-[#D0BEBE]" />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[210px] p-0" align="start">
                <div className="p-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
                        />
                    </div>
                </div>
                <div className="max-h-[250px] overflow-y-auto p-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">No results found</div>
                    ) : (
                        <>
                            {filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        onChange(option.id);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                        value === option.id
                                            ? "bg-green-50 text-green-700 font-medium"
                                            : "hover:bg-gray-100 text-gray-700"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}

                            {/* Load More Button */}
                            {hasMore && !search && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLoadMore?.();
                                    }}
                                    disabled={loadingMore}
                                    className="w-full text-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors border-t border-gray-100 mt-1"
                                >
                                    {loadingMore ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        "Load More"
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

interface LiveProps {
    selectedCampaign: string;
    setSelectedCampaign: Dispatch<SetStateAction<string>>;
    selectedZone: string;
    setSelectedZone: Dispatch<SetStateAction<string>>;
    selectedTeam: string;
    setSelectedTeam: Dispatch<SetStateAction<string>>;
    selectedDate: string;
    setSelectedDate: Dispatch<SetStateAction<string>>;
}

export function Live({
    selectedCampaign,
    setSelectedCampaign,
    selectedZone,
    setSelectedZone,
    selectedTeam,
    setSelectedTeam,
    selectedDate,
    setSelectedDate,
}: LiveProps) {
    // Campaigns data with pagination
    const [campaignPage, setCampaignPage] = useState(1);
    const [allCampaigns, setAllCampaigns] = useState<{ id: string; label: string }[]>([]);
    const { data: campaignsData, isLoading: loadingCampaigns, isFetching: fetchingCampaigns } = useCampaigns({
        page: campaignPage,
        limit: 20,
    });

    // Zones data with pagination
    const [zonePage, setZonePage] = useState(1);
    const [allZones, setAllZones] = useState<{ id: string; label: string }[]>([]);
    const [allZoneObjects, setAllZoneObjects] = useState<(FacilityZone | Zone)[]>([]);
    const [hoveredZone, setHoveredZone] = useState<FacilityZone | Zone | null>(null);

    // Conditional Zone Fetching
    const {
        data: facilityZonesData,
        isLoading: loadingFacilityZones,
        isFetching: fetchingFacilityZones
    } = useZonesByFacility({
        page: zonePage,
        pageSize: 20,
        // We only use this when no campaign is selected, so we don't pass campaignId here anymore
        // or we keep it undefined.
    });

    const {
        data: campaignZonesData,
        isLoading: loadingCampaignZones,
        isFetching: fetchingCampaignZones
    } = useZonesByCampaign({
        campaignId: selectedCampaign,
        page: zonePage,
        limit: 20
    });

    // Determine which zone data to use
    const zonesData = selectedCampaign ? campaignZonesData : facilityZonesData;
    const loadingZones = selectedCampaign ? loadingCampaignZones : loadingFacilityZones;
    const fetchingZones = selectedCampaign ? fetchingCampaignZones : fetchingFacilityZones;

    // Teams data with pagination
    const [teamPage, setTeamPage] = useState(1);
    const [allTeams, setAllTeams] = useState<{ id: string; label: string }[]>([]);
    const [allTeamObjects, setAllTeamObjects] = useState<Team[]>([]);

    // Conditional Team Fetching - Facility teams (fallback)
    const {
        data: facilityTeamsData,
        isLoading: loadingFacilityTeams,
        isFetching: fetchingFacilityTeams
    } = useTeamsByFacility({
        page: teamPage,
        pageSize: 20,
    });

    // Teams by Zone
    const {
        data: zoneTeamsData,
        isLoading: loadingZoneTeams,
        isFetching: fetchingZoneTeams
    } = useTeamsByZone({
        zoneId: selectedZone,
        page: teamPage,
        limit: 20,
    });

    // Teams by Campaign
    const {
        data: campaignTeamsData,
        isLoading: loadingCampaignTeams,
        isFetching: fetchingCampaignTeams
    } = useTeamsByCampaign({
        campaignId: selectedCampaign,
        page: teamPage,
        limit: 20,
    });

    // Determine which team data to use: Zone > Campaign > Facility
    const teamsData = selectedZone
        ? zoneTeamsData
        : selectedCampaign
            ? campaignTeamsData
            : facilityTeamsData;
    const loadingTeams = selectedZone
        ? loadingZoneTeams
        : selectedCampaign
            ? loadingCampaignTeams
            : loadingFacilityTeams;
    const fetchingTeams = selectedZone
        ? fetchingZoneTeams
        : selectedCampaign
            ? fetchingCampaignTeams
            : fetchingFacilityTeams;

    // Reset zones when campaign changes
    useEffect(() => {
        setZonePage(1);
        setAllZones([]);
        setAllZoneObjects([]);
        setSelectedZone("");
        // Also reset teams
        setTeamPage(1);
        setAllTeams([]);
        setAllTeamObjects([]);
        setSelectedTeam("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCampaign]);

    // Reset teams when zone changes
    useEffect(() => {
        setTeamPage(1);
        setAllTeams([]);
        setAllTeamObjects([]);
        setSelectedTeam("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedZone]);

    // Accumulate campaigns
    useEffect(() => {
        if (campaignsData?.campaigns) {
            const campaignOptions = campaignsData.campaigns.map(c => ({
                id: c._id,
                label: c.name,
            }));

            if (campaignPage === 1) {
                setAllCampaigns(campaignOptions);
            } else {
                setAllCampaigns(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newCampaigns = campaignOptions.filter(c => !existingIds.has(c.id));
                    return [...prev, ...newCampaigns];
                });
            }
        }
    }, [campaignsData?.campaigns, campaignPage]);

    // Accumulate zones
    useEffect(() => {
        const fetchedZones = zonesData?.zones;
        if (fetchedZones) {
            const zoneOptions = fetchedZones.map(z => ({
                id: z._id,
                label: z.name,
            }));

            if (zonePage === 1) {
                setAllZones(zoneOptions);
                setAllZoneObjects(fetchedZones);
            } else {
                setAllZones(prev => {
                    const existingIds = new Set(prev.map(z => z.id));
                    const newZones = zoneOptions.filter(z => !existingIds.has(z.id));
                    return [...prev, ...newZones];
                });
                setAllZoneObjects(prev => {
                    const existingIds = new Set(prev.map(z => z._id));
                    const newZones = fetchedZones.filter((z: FacilityZone | Zone) => !existingIds.has(z._id));
                    return [...prev, ...newZones];
                });
            }
        }
    }, [zonesData, zonePage]);

    // Accumulate teams
    useEffect(() => {
        const fetchedTeams = teamsData?.teams;
        if (fetchedTeams) {
            const teamOptions = fetchedTeams.map(t => ({
                id: t._id,
                label: t.name,
            }));

            if (teamPage === 1) {
                setAllTeams(teamOptions);
                setAllTeamObjects(fetchedTeams);
            } else {
                setAllTeams(prev => {
                    const existingIds = new Set(prev.map(t => t.id));
                    const newTeams = teamOptions.filter(t => !existingIds.has(t.id));
                    return [...prev, ...newTeams];
                });
                setAllTeamObjects(prev => {
                    const existingIds = new Set(prev.map(t => t._id));
                    const newTeams = fetchedTeams.filter(t => !existingIds.has(t._id));
                    return [...prev, ...newTeams];
                });
            }
        }
    }, [teamsData, teamPage]);

    // Check if there's more data
    const hasMoreCampaigns = campaignsData?.pagination
        ? campaignsData.pagination.page < campaignsData.pagination.total_pages
        : false;

    const hasMoreZones = zonesData?.pagination
        ? (zonesData.pagination.current_page ?? (zonesData.pagination as any).page ?? 1) < zonesData.pagination.total_pages
        : false;

    const hasMoreTeams = teamsData?.pagination
        ? teamsData.pagination.current_page < teamsData.pagination.total_pages
        : false;

    // Get ALL teams for the hovered zone (not just one)
    const hoveredZoneTeams = useMemo(() => {
        if (!hoveredZone) return [];
        return allTeamObjects.filter(t => t.zone_id === hoveredZone._id);
    }, [hoveredZone, allTeamObjects]);

    // Get first team for campaign info (header display)
    const firstTeam = hoveredZoneTeams[0] || null;

    console.log({ "hoveredZoneTeams": hoveredZoneTeams, "count": hoveredZoneTeams.length });

    return (
        <>
            <div className="flex h-full flex-col relative">
                {/* Top Bar with Dropdowns */}
                <div className="flex items-center justify-between w-full border-gray-200 px-6 py-4 absolute top-4 left-6 z-10">
                    <div className="flex items-center gap-4">
                        <SearchableDropdown
                            options={allCampaigns}
                            value={selectedCampaign}
                            onChange={setSelectedCampaign}
                            placeholder="Select Campaign"
                            icon={<MegaphoneIcon className="h-5 w-5 transform scale-x-[-1] text-[#D0BEBE]" />}
                            isLoading={loadingCampaigns && campaignPage === 1}
                            hasMore={hasMoreCampaigns}
                            onLoadMore={() => setCampaignPage(p => p + 1)}
                            loadingMore={fetchingCampaigns && campaignPage > 1}
                        />

                        <SearchableDropdown
                            options={allZones}
                            value={selectedZone}
                            onChange={setSelectedZone}
                            placeholder="Select Zone"
                            icon={<MapPinSimpleAreaIcon className="h-5 w-5 text-[#D0BEBE]" />}
                            isLoading={loadingZones && zonePage === 1}
                            hasMore={hasMoreZones}
                            onLoadMore={() => setZonePage(p => p + 1)}
                            loadingMore={fetchingZones && zonePage > 1}
                        />

                        <SearchableDropdown
                            options={allTeams}
                            value={selectedTeam}
                            onChange={setSelectedTeam}
                            placeholder="Select Team"
                            icon={<UsersThreeIcon className="h-5 w-5 text-[#D0BEBE]" />}
                            isLoading={loadingTeams && teamPage === 1}
                            hasMore={hasMoreTeams}
                            onLoadMore={() => setTeamPage(p => p + 1)}
                            loadingMore={fetchingTeams && teamPage > 1}
                        />

                        <SearchableDropdown
                            options={DATE_OPTIONS}
                            value={selectedDate}
                            onChange={setSelectedDate}
                            placeholder="Select Date"
                            icon={<CalendarPlusIcon className="h-5 w-5 text-[#D0BEBE]" />}
                        />
                    </div>
                </div>

                <div className="relative flex-1">
                    <FieldMap
                        zones={selectedZone ? allZoneObjects.filter(z => z._id === selectedZone) : allZoneObjects}
                        onZoneHover={setHoveredZone}
                        selectedZoneId={selectedZone}
                    />

                    {/* Floating Zone Info Cards - Each team gets its own card */}
                    {hoveredZone && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
                            <div className="pointer-events-none flex gap-4 max-w-[90vw] overflow-x-auto px-4">
                                {hoveredZoneTeams.length > 0 ? (
                                    hoveredZoneTeams.map((team) => (
                                        <div
                                            key={team._id}
                                            className="w-80 flex-shrink-0 bg-white shadow-2xl rounded-lg overflow-hidden"
                                        >
                                            {/* Header - Campaign Name & Code */}
                                            <section className="bg-green-600 px-5 py-4">
                                                <h3 className="text-xl font-bold text-white">
                                                    {team.campaign?.name ||
                                                        (hoveredZone as FacilityZone).campaign?.name ||
                                                        (selectedCampaign && allCampaigns.find(c => c.id === selectedCampaign)?.label) ||
                                                        "Campaign"}
                                                </h3>
                                                <p className="text-green-100 text-sm mt-0.5">
                                                    #{team.campaign?.code ||
                                                        (hoveredZone as FacilityZone).campaign?.code ||
                                                        "—"}
                                                </p>
                                            </section>

                                            {/* Body */}
                                            <section className="p-5 space-y-4">
                                                {/* Zone Section */}
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <MapPinSimpleAreaIcon className="h-6 w-6 text-gray-400" />
                                                        <span className="font-semibold text-gray-800 text-base">
                                                            {team.zone?.name || hoveredZone.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-500 text-sm ml-9">
                                                        2 sq kilometer Covered
                                                    </p>
                                                </div>

                                                {/* Divider */}
                                                <hr className="border-gray-100" />

                                                {/* Team Section */}
                                                <div>
                                                    {/* Team Name */}
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <UsersThreeIcon className="h-6 w-6 text-gray-400" />
                                                        <span className="font-semibold text-gray-800 text-base">
                                                            {team.name}
                                                        </span>
                                                    </div>

                                                    {/* Team Members */}
                                                    <div className="ml-9 space-y-2">
                                                        {/* Team Lead */}
                                                        {team.team_lead && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-700">
                                                                    {team.team_lead.first_name} {team.team_lead.last_name}
                                                                </span>
                                                                <span className="rounded-full bg-green-500 text-white px-3 py-1 text-xs font-medium">
                                                                    Team Lead
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Other Members Count */}
                                                        {team.members && team.members.length > 1 && (
                                                            <div className="text-gray-500 text-sm">
                                                                +{team.members.length - 1} other member{team.members.length > 2 ? 's' : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    ))
                                ) : (
                                    /* Single card for when no teams are assigned */
                                    <div className="w-80 bg-white shadow-2xl rounded-lg overflow-hidden">
                                        {/* Header */}
                                        <section className="bg-green-600 px-5 py-4">
                                            <h3 className="text-xl font-bold text-white">
                                                {(hoveredZone as FacilityZone).campaign?.name ||
                                                    (selectedCampaign && allCampaigns.find(c => c.id === selectedCampaign)?.label) ||
                                                    "Campaign"}
                                            </h3>
                                            <p className="text-green-100 text-sm mt-0.5">
                                                #{(hoveredZone as FacilityZone).campaign?.code || "—"}
                                            </p>
                                        </section>

                                        {/* Body */}
                                        <section className="p-5 space-y-4">
                                            {/* Zone Section */}
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <MapPinSimpleAreaIcon className="h-6 w-6 text-gray-400" />
                                                    <span className="font-semibold text-gray-800 text-base">
                                                        {hoveredZone.name}
                                                    </span>
                                                </div>
                                                <p className="text-gray-500 text-sm ml-9">
                                                    2 sq kilometer Covered
                                                </p>
                                            </div>

                                            {/* Divider */}
                                            <hr className="border-gray-100" />

                                            {/* No Team Message */}
                                            <div className="flex items-center gap-3">
                                                <UsersThreeIcon className="h-6 w-6 text-gray-400" />
                                                <span className="text-gray-500 text-sm">No team assigned</span>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}