"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Plus, MapPin, Check, ChevronsUpDown, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { GoogleMap, Polygon, Marker } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/GoogleMapsProvider";
import { useCreateZone, useZonesByFacility, FacilityZone, GeoJSONPolygon } from "./hooks/useZones";
import { useCampaigns } from "./hooks/useCampaigns";
import { toast } from "sonner";
import { DataTable } from "@/components/PatientsTable";
import { SelectionSheet } from "@/components/ui/selection-sheet";

// Cache for reverse geocoded location names
const locationCache = new Map<string, string>();

// Helper: Calculate centroid of a polygon
function calculateCentroid(coordinates: number[][][]): { lat: number; lng: number } {
    if (!coordinates || !coordinates[0] || coordinates[0].length === 0) {
        return { lat: 0, lng: 0 };
    }

    const ring = coordinates[0]; // First ring (outer boundary)
    let sumLat = 0;
    let sumLng = 0;

    for (const coord of ring) {
        sumLng += coord[0]; // GeoJSON is [lng, lat]
        sumLat += coord[1];
    }

    return {
        lat: sumLat / ring.length,
        lng: sumLng / ring.length,
    };
}

// Helper: Get location name from coordinates using Google Geocoding
async function getLocationName(boundaries: GeoJSONPolygon): Promise<string> {
    if (!boundaries?.coordinates) return "Unknown Location";

    const centroid = calculateCentroid(boundaries.coordinates);
    const cacheKey = `${centroid.lat.toFixed(4)},${centroid.lng.toFixed(4)}`;

    // Check cache first
    if (locationCache.has(cacheKey)) {
        return locationCache.get(cacheKey)!;
    }

    try {
        // Use Google Geocoding API
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${centroid.lat},${centroid.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );

        if (!response.ok) {
            return "Unknown Location";
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            // Get a meaningful location name (neighborhood, sublocality, or locality)
            const addressComponents = data.results[0].address_components;

            // Priority order for location name
            const priorities = [
                "neighborhood",
                "sublocality_level_1",
                "sublocality",
                "locality",
                "administrative_area_level_2",
            ];

            for (const priority of priorities) {
                const component = addressComponents?.find((c: any) =>
                    c.types.includes(priority)
                );
                if (component) {
                    locationCache.set(cacheKey, component.long_name);
                    return component.long_name;
                }
            }

            // Fallback to formatted address (short version)
            const shortAddress = data.results[0].formatted_address?.split(",")[0] || "Unknown Location";
            locationCache.set(cacheKey, shortAddress);
            return shortAddress;
        }

        return "Unknown Location";
    } catch (error) {
        console.error("Error fetching location name:", error);
        return "Unknown Location";
    }
}

// Clickable location badge component with reverse geocoded name
function LocationBadge({
    zone,
    onClick
}: {
    zone: FacilityZone;
    onClick: () => void;
}) {
    const [locationName, setLocationName] = React.useState<string>("Loading...");

    React.useEffect(() => {
        if (zone.boundaries?.coordinates) {
            getLocationName(zone.boundaries).then(setLocationName);
        } else {
            setLocationName(zone.description || "N/A");
        }
    }, [zone.boundaries, zone.description]);

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
        >
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">{locationName}</span>
        </button>
    );
}

// Zone Map Preview Sheet Component
function ZoneMapSheet({
    zone,
    isOpen,
    onClose,
}: {
    zone: FacilityZone | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const { isLoaded } = useGoogleMaps();
    const [locationName, setLocationName] = React.useState<string>("Loading...");
    const mapRef = React.useRef<google.maps.Map | null>(null);

    // Convert GeoJSON coordinates to Google Maps format
    const polygonPath = React.useMemo(() => {
        if (!zone?.boundaries?.coordinates?.[0]) return [];
        return zone.boundaries.coordinates[0].map(coord => ({
            lat: coord[1], // GeoJSON is [lng, lat]
            lng: coord[0],
        }));
    }, [zone?.boundaries]);

    // Calculate center of the polygon
    const center = React.useMemo(() => {
        if (!zone?.boundaries?.coordinates) return { lat: 4.0511, lng: 9.7679 };
        return calculateCentroid(zone.boundaries.coordinates);
    }, [zone?.boundaries]);

    // Fetch location name
    React.useEffect(() => {
        if (zone?.boundaries?.coordinates) {
            getLocationName(zone.boundaries).then(setLocationName);
        }
    }, [zone?.boundaries]);

    // Fit map to polygon bounds
    const onMapLoad = React.useCallback((map: google.maps.Map) => {
        mapRef.current = map;

        if (polygonPath.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            polygonPath.forEach(coord => bounds.extend(coord));
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }
    }, [polygonPath]);

    if (!zone) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[600px] sm:max-w-none p-0">
                <SheetHeader className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-lg font-semibold text-gray-900">
                                {zone.name}
                            </SheetTitle>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <MapPin className="h-4 w-4" />
                                <span>{locationName}</span>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="p-6">
                    {/* Zone Info Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Zone Code</div>
                            <div className="text-lg font-semibold text-gray-900">{zone.code}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Teams</div>
                            <div className="text-lg font-semibold text-gray-900">{zone.team_count}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Campaign</div>
                            <div className="text-lg font-semibold text-gray-900 truncate">
                                {zone.campaign?.name || "N/A"}
                            </div>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        {!isLoaded ? (
                            <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <GoogleMap
                                mapContainerStyle={{ width: "100%", height: "400px" }}
                                center={center}
                                zoom={14}
                                onLoad={onMapLoad}
                                options={{
                                    mapTypeControl: true,
                                    streetViewControl: false,
                                    fullscreenControl: true,
                                    zoomControl: true,
                                }}
                            >
                                {/* Zone Polygon */}
                                {polygonPath.length > 0 && (
                                    <Polygon
                                        paths={polygonPath}
                                        options={{
                                            fillColor: "#22c55e",
                                            fillOpacity: 0.35,
                                            strokeColor: "#16a34a",
                                            strokeOpacity: 1,
                                            strokeWeight: 3,
                                        }}
                                    />
                                )}

                                {/* Center Marker */}
                                <Marker
                                    position={center}
                                    title={zone.name}
                                />
                            </GoogleMap>
                        )}
                    </div>

                    {/* Description */}
                    {zone.description && (
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                                {zone.description}
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

const mapContainerStyle = { width: "100%", height: "400px", borderRadius: "0.5rem" };
const defaultCenter = { lat: 4.0511, lng: 9.7679 }; // Douala

export function Zones() {
    const [searchQuery, setSearchQuery] = React.useState("");

    // Zones Fetching with pagination
    const [zonesPage, setZonesPage] = React.useState(1);
    const [zonesLimit, setZonesLimit] = React.useState(10);
    const { data: zonesData, isLoading: loadingZones } = useZonesByFacility({
        page: zonesPage,
        pageSize: zonesLimit
    });

    // Slide-in panel states
    const [isPanelOpen, setIsPanelOpen] = React.useState(false);

    // Zone Map Preview state
    const [selectedZoneForMap, setSelectedZoneForMap] = React.useState<FacilityZone | null>(null);
    const [isMapSheetOpen, setIsMapSheetOpen] = React.useState(false);

    // Form states
    const [zoneName, setZoneName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [campaignId, setCampaignId] = React.useState("");
    const [boundaries, setBoundaries] = React.useState<{ lat: number; lng: number }[]>([]);

    const [errors, setErrors] = React.useState({
        zoneName: false,
        campaignId: false,
        boundaries: false,
    });

    // Campaign Dropdown State with pagination
    const [campaignOpen, setCampaignOpen] = React.useState(false);
    const [campaignSearch, setCampaignSearch] = React.useState("");
    const [campaignPage, setCampaignPage] = React.useState(1);
    const [allCampaigns, setAllCampaigns] = React.useState<import("./hooks/useCampaigns").Campaign[]>([]);
    const { data: campaignsData, isLoading: loadingCampaigns, isFetching: fetchingCampaigns } = useCampaigns({
        page: campaignPage,
        limit: 10,
    });

    // Accumulate campaigns as pages load
    React.useEffect(() => {
        if (campaignsData?.campaigns) {
            if (campaignPage === 1) {
                setAllCampaigns(campaignsData.campaigns);
            } else {
                setAllCampaigns(prev => {
                    const existingIds = new Set(prev.map(c => c._id));
                    const newCampaigns = campaignsData.campaigns.filter(c => !existingIds.has(c._id));
                    return [...prev, ...newCampaigns];
                });
            }
        }
    }, [campaignsData?.campaigns, campaignPage]);

    // Reset campaigns when dropdown opens
    const handleCampaignOpenChange = (open: boolean) => {
        setCampaignOpen(open);
        if (open && campaignPage !== 1) {
            setCampaignPage(1);
        }
    };

    // Check if there are more campaigns to load
    const hasMoreCampaigns = React.useMemo(() => {
        if (!campaignsData?.pagination) return false;
        return campaignsData.pagination.page < campaignsData.pagination.total_pages;
    }, [campaignsData?.pagination]);

    // Load more campaigns
    const handleLoadMoreCampaigns = () => {
        if (hasMoreCampaigns && !fetchingCampaigns) {
            setCampaignPage(prev => prev + 1);
        }
    };

    // Google Maps
    const { isLoaded } = useGoogleMaps();
    const mapRef = React.useRef<google.maps.Map | null>(null);

    // Mutations
    const createZoneMutation = useCreateZone();

    // Handle zone location click
    const handleLocationClick = (zone: FacilityZone) => {
        setSelectedZoneForMap(zone);
        setIsMapSheetOpen(true);
    };

    // Column definitions for FacilityZone with clickable location
    const columns: ColumnDef<FacilityZone>[] = React.useMemo(() => [
        {
            accessorKey: "name",
            header: "Zone Name",
            cell: ({ row }) => <span className="text-gray-700 font-medium">{row.getValue("name")}</span>,
        },
        {
            accessorKey: "team_count",
            header: "Team Count",
            cell: ({ row }) => (
                <span className="text-gray-700">
                    {String(row.getValue("team_count") ?? 0).padStart(2, "0")}
                </span>
            ),
        },
        {
            accessorKey: "campaign",
            header: "Active Campaign",
            cell: ({ row }) => {
                const campaign = row.original.campaign;
                return <span className="text-gray-700">{campaign?.name ?? "N/A"}</span>;
            },
        },
        {
            accessorKey: "code",
            header: "Zone Code",
            cell: ({ row }) => <span className="text-gray-700">{row.getValue("code") || "N/A"}</span>,
        },
        {
            accessorKey: "boundaries",
            header: "Location",
            cell: ({ row }) => (
                <LocationBadge
                    zone={row.original}
                    onClick={() => handleLocationClick(row.original)}
                />
            ),
        },
    ], []);

    // Map drawing handlers
    const onMapLoad = React.useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const handleMapClick = React.useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setBoundaries(prev => [...prev, newPoint]);
        }
    }, []);

    const handleRemovePoint = (index: number) => {
        setBoundaries(prev => prev.filter((_, i) => i !== index));
    };

    const handleClearBoundaries = () => {
        setBoundaries([]);
    };

    // Campaign selection - use accumulated campaigns
    const selectedCampaign = React.useMemo(() => {
        return allCampaigns.find((c) => c._id === campaignId);
    }, [allCampaigns, campaignId]);

    const filteredCampaigns = React.useMemo(() => {
        if (!allCampaigns.length) return [];
        if (!campaignSearch) return allCampaigns;
        return allCampaigns.filter((c) =>
            c.name.toLowerCase().includes(campaignSearch.toLowerCase())
        );
    }, [allCampaigns, campaignSearch]);

    // Save zone
    const handleSave = () => {
        const newErrors = {
            zoneName: !zoneName.trim(),
            campaignId: !campaignId,
            boundaries: boundaries.length < 3,
        };
        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            if (newErrors.boundaries) {
                toast.error("Please draw at least 3 points on the map to define boundaries");
            } else {
                toast.error("Please fill in all required fields");
            }
            return;
        }

        const geoJsonBoundaries: { type: "Polygon"; coordinates: number[][][] } = {
            type: "Polygon",
            coordinates: [boundaries.map(p => [p.lng, p.lat])],
        };

        createZoneMutation.mutate(
            {
                campaign_id: campaignId,
                name: zoneName,
                description,
                boundaries: geoJsonBoundaries,
            },
            {
                onSuccess: () => {
                    toast.success("Zone created successfully!");
                    setZoneName("");
                    setDescription("");
                    setCampaignId("");
                    setBoundaries([]);
                    setIsPanelOpen(false);
                },
                onError: (err: any) => {
                    toast.error(err.message || "Failed to create zone");
                },
            }
        );
    };

    return (
        <>
            <div className="flex flex-col h-full p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Zones</h1>
                </div>

                {/* Search and Actions Bar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search Zones"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white border-gray-200 rounded-sm"
                        />
                    </div>
                    <Button
                        onClick={() => setIsPanelOpen(true)}
                        className="bg-green-600 hover:bg-green-700 py-6 rounded-sm text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Zone
                    </Button>
                </div>

                {/* Table */}
                <Card className="w-full bg-white shadow-sm rounded-lg border border-gray-100 flex-1">
                    <CardContent className="overflow-x-auto p-0">
                        {loadingZones ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="animate-spin text-green-600" size={32} />
                            </div>
                        ) : (
                            <DataTable
                                data={zonesData?.zones ?? []}
                                columns={columns}
                                pagination={{
                                    pageIndex: zonesPage - 1,
                                    pageSize: zonesLimit,
                                }}
                                onPaginationChange={(pagination) => {
                                    setZonesPage(pagination.pageIndex + 1);
                                    setZonesLimit(pagination.pageSize);
                                }}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Zone Map Preview Sheet */}
            <ZoneMapSheet
                zone={selectedZoneForMap}
                isOpen={isMapSheetOpen}
                onClose={() => {
                    setIsMapSheetOpen(false);
                    setSelectedZoneForMap(null);
                }}
            />

            {/* Create Zone Sheet */}
            <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
                <SheetContent className="w-[70vw] sm:max-w-none p-0 overflow-y-auto">
                    <SheetHeader className="px-6 py-4 border-b border-gray-200">
                        <SheetTitle className="text-lg font-semibold text-gray-900">New Zone</SheetTitle>
                    </SheetHeader>

                    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
                        {/* Zone Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Zone Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={zoneName}
                                onChange={(e) => {
                                    setZoneName(e.target.value);
                                    setErrors(prev => ({ ...prev, zoneName: false }));
                                }}
                                placeholder="Enter zone name"
                                className={cn(
                                    "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0",
                                    errors.zoneName
                                        ? "border-b-red-500 focus:border-b-red-500"
                                        : "border-b-gray-300 focus:border-b-[#04b301]"
                                )}
                            />
                        </div>

                        {/* Campaign Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Campaign <span className="text-red-500">*</span>
                            </label>
                            <SelectionSheet
                                open={campaignOpen}
                                onOpenChange={handleCampaignOpenChange}
                                title="Select Campaign"
                                searchPlaceholder="Search campaigns..."
                                searchValue={campaignSearch}
                                onSearchChange={setCampaignSearch}
                                items={filteredCampaigns}
                                isLoading={loadingCampaigns}
                                hasMore={hasMoreCampaigns && !campaignSearch}
                                onLoadMore={handleLoadMoreCampaigns}
                                isLoadingMore={fetchingCampaigns}
                                trigger={
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={campaignOpen}
                                        className={cn(
                                            "w-full justify-between rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0 hover:bg-blue-50",
                                            errors.campaignId
                                                ? "border-b-red-500 focus:border-b-red-500"
                                                : "border-b-gray-300 focus:border-b-[#04b301]"
                                        )}
                                    >
                                        {selectedCampaign ? selectedCampaign.name : "Select campaign..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                }
                                renderItem={(campaign) => (
                                    <div
                                        className="flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => {
                                            setCampaignId(campaign._id);
                                            setErrors(prev => ({ ...prev, campaignId: false }));
                                            setCampaignOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-3 h-4 w-4 text-green-600",
                                                campaignId === campaign._id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{campaign.name}</span>
                                            {campaign.code && (
                                                <span className="text-sm text-gray-500">{campaign.code}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter zone description"
                                className="rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0 border-b-gray-300 focus:border-b-[#04b301]"
                            />
                        </div>

                        {/* Map Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Zone Boundaries <span className="text-red-500">*</span>
                                </label>
                                {boundaries.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearBoundaries}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Clear All
                                    </Button>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mb-3">
                                Click on the map to draw zone boundaries (minimum 3 points)
                            </p>

                            <div className={cn(
                                "rounded-lg overflow-hidden border-2",
                                errors.boundaries ? "border-red-500" : "border-gray-200"
                            )}>
                                {!isLoaded ? (
                                    <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    <GoogleMap
                                        mapContainerStyle={mapContainerStyle}
                                        center={defaultCenter}
                                        zoom={12}
                                        onLoad={onMapLoad}
                                        onClick={handleMapClick}
                                        options={{
                                            mapTypeControl: true,
                                            streetViewControl: false,
                                        }}
                                    >
                                        {boundaries.length >= 3 && (
                                            <Polygon
                                                paths={boundaries}
                                                options={{
                                                    fillColor: "#22c55e",
                                                    fillOpacity: 0.35,
                                                    strokeColor: "#16a34a",
                                                    strokeOpacity: 1,
                                                    strokeWeight: 2,
                                                }}
                                            />
                                        )}
                                        {boundaries.map((point, index) => (
                                            <Marker
                                                key={index}
                                                position={point}
                                                label={{
                                                    text: String(index + 1),
                                                    color: "white",
                                                    fontSize: "12px",
                                                }}
                                                onClick={() => handleRemovePoint(index)}
                                            />
                                        ))}
                                    </GoogleMap>
                                )}
                            </div>

                            {/* Points List */}
                            {boundaries.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {boundaries.map((point, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm"
                                        >
                                            <span className="font-medium">P{index + 1}:</span>
                                            <span className="text-gray-600">
                                                {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                                            </span>
                                            <button
                                                onClick={() => handleRemovePoint(index)}
                                                className="ml-1 text-gray-400 hover:text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-4 border-t border-gray-200">
                            <Button
                                onClick={handleSave}
                                disabled={createZoneMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-sm"
                            >
                                {createZoneMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save"
                                )}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
