"use client";

import * as React from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    VisibilityState,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Loader2, Settings, Search, Plus, MapPin, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useCreateZone } from "./hooks/useZones";
import { useCampaigns } from "./hooks/useCampaigns";
import { toast } from "sonner";

// Types
interface Zone {
    id: number;
    teamLead: string;
    members: number;
    activeCampaign: string;
    location: string;
}

// Sample data matching the screenshot
const ZONES_DATA: Zone[] = [
    { id: 1, teamLead: "Theresia Mbah", members: 3, activeCampaign: "Polio 2024", location: "Grand hanga" },
    { id: 2, teamLead: "Peters Nze", members: 3, activeCampaign: "Polio 2024", location: "Grand hanga" },
    { id: 2, teamLead: "Ayissi Bi Paul", members: 2, activeCampaign: "VIT A 2025", location: "Grand hanga" },
    { id: 2, teamLead: "Ebeneza Ndoki", members: 2, activeCampaign: "VIT A 2025", location: "Grand hanga" },
    { id: 1, teamLead: "Pierre Kwemo", members: 3, activeCampaign: "VIT A 2025", location: "Grand hanga" },
    { id: 2, teamLead: "Chalefac Theodore", members: 3, activeCampaign: "VIT A 2025", location: "Grand hanga" },
    { id: 1, teamLead: "Kuma  Theodore", members: 3, activeCampaign: "VIT A 2025", location: "Grand hanga" },
];

// Location badge component
function LocationBadge({ location }: { location: string }) {
    return (
        <div className="flex items-center gap-1.5 text-blue-600">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">{location}</span>
        </div>
    );
}

// Column definitions
const columns: ColumnDef<Zone>[] = [
    {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <span className="text-gray-700">{row.getValue("id")}</span>,
    },
    {
        accessorKey: "teamLead",
        header: "Team Lead",
        cell: ({ row }) => <span className="text-gray-700">{row.getValue("teamLead")}</span>,
    },
    {
        accessorKey: "members",
        header: "Members",
        cell: ({ row }) => (
            <span className="text-gray-700">
                {String(row.getValue("members")).padStart(2, "0")}
            </span>
        ),
    },
    {
        accessorKey: "activeCampaign",
        header: "Active Campaign",
        cell: ({ row }) => <span className="text-gray-700">{row.getValue("activeCampaign")}</span>,
    },
    {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => <LocationBadge location={row.getValue("location")} />,
    },
];

const mapContainerStyle = { width: "100%", height: "400px", borderRadius: "0.5rem" };
const defaultCenter = { lat: 4.0511, lng: 9.7679 }; // Douala

export function Zones() {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isLoading] = React.useState(false);
    const [pageIndex, setPageIndex] = React.useState(0);
    const pageSize = 10;

    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

    // Slide-in panel states
    const [isPanelOpen, setIsPanelOpen] = React.useState(false);

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

    // Campaign Dropdown State
    const [campaignOpen, setCampaignOpen] = React.useState(false);
    const [campaignSearch, setCampaignSearch] = React.useState("");
    const [campaignPage, setCampaignPage] = React.useState(1);
    const { data: campaignsData, isLoading: loadingCampaigns } = useCampaigns({
        page: campaignPage,
        limit: 10,
    });

    // Map State
    const { isLoaded } = useGoogleMaps();
    const createZoneMutation = useCreateZone();

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setBoundaries([...boundaries, newPoint]);
            setErrors(prev => ({ ...prev, boundaries: false }));
        }
    };

    const handleUndoPoint = () => {
        setBoundaries(prev => prev.slice(0, -1));
    };

    const handleClearPoints = () => {
        setBoundaries([]);
    };

    const handleSave = () => {
        // Validate fields
        const newErrors = {
            zoneName: !zoneName,
            campaignId: !campaignId,
            boundaries: boundaries.length < 3,
        };

        setErrors(newErrors);

        // Check if any errors
        if (Object.values(newErrors).some(error => error)) {
            if (newErrors.boundaries) {
                toast.error("Please select at least 3 points to form a polygon");
            } else {
                toast.error("Please fill in all required fields");
            }
            return;
        }

        // Close the polygon by adding the first point at the end
        const closedBoundaries = [...boundaries, boundaries[0]];
        const coordinates = [closedBoundaries.map(p => [p.lng, p.lat])]; // GeoJSON uses [lng, lat]

        const payload = {
            campaign_id: campaignId,
            name: zoneName,
            description: description,
            boundaries: {
                type: "Polygon" as const,
                coordinates: coordinates,
            },
        };

        createZoneMutation.mutate(payload, {
            onSuccess: () => {
                // Reset form and close panel
                setZoneName("");
                setDescription("");
                setCampaignId("");
                setBoundaries([]);
                setIsPanelOpen(false);
            },
        });
    };

    // Filter data based on search
    const filteredData = React.useMemo(() => {
        if (!searchQuery) return ZONES_DATA;
        const query = searchQuery.toLowerCase();
        return ZONES_DATA.filter(
            (zone) =>
                zone.teamLead.toLowerCase().includes(query) ||
                zone.activeCampaign.toLowerCase().includes(query) ||
                zone.location.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            pagination: { pageIndex, pageSize },
            columnVisibility,
        },
        onPaginationChange: (updater) => {
            if (typeof updater === "function") {
                const newPagination = updater({ pageIndex, pageSize });
                setPageIndex(newPagination.pageIndex);
            }
        },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const totalPages = table.getPageCount();

    // Filter campaigns for dropdown
    const filteredCampaigns = React.useMemo(() => {
        if (!campaignsData?.campaigns) return [];
        if (!campaignSearch) return campaignsData.campaigns;
        return campaignsData.campaigns.filter(c =>
            c.name.toLowerCase().includes(campaignSearch.toLowerCase())
        );
    }, [campaignsData, campaignSearch]);

    const selectedCampaignName = campaignsData?.campaigns?.find(c => c._id === campaignId)?.name;

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
                        New zone
                    </Button>
                </div>

                {/* Table */}
                <Card className="w-full bg-white shadow-sm rounded-lg border border-gray-100 flex-1">
                    <CardContent className="overflow-x-auto p-0">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="animate-spin text-green-600" size={32} />
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className="text-left px-6 py-4 text-sm font-medium text-gray-600 whitespace-nowrap"
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                </th>
                                            ))}
                                            <th className="w-12">
                                                <div className="flex justify-end px-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Settings className="h-4 w-4 text-gray-500" />
                                                                <span className="sr-only">Toggle columns</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuLabel className="flex items-center justify-between">
                                                                <span>Visible Columns</span>
                                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <div className="py-1">
                                                                {table.getAllColumns().map((column) => {
                                                                    if (!column.getCanHide()) return null;
                                                                    const header = String(column.columnDef.header ?? column.id);
                                                                    const isVisible = column.getIsVisible();

                                                                    return (
                                                                        <div
                                                                            key={column.id}
                                                                            className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                                            onClick={() => column.toggleVisibility()}
                                                                        >
                                                                            <span className="text-sm font-medium capitalize">
                                                                                {header}
                                                                            </span>
                                                                            <div
                                                                                className={cn(
                                                                                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                                                                                    isVisible ? "bg-green-600" : "bg-gray-300"
                                                                                )}
                                                                            >
                                                                                <span
                                                                                    className={cn(
                                                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                                                        isVisible ? "translate-x-4" : "translate-x-0.5"
                                                                                    )}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </th>
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className="px-6 py-4 whitespace-nowrap"
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                            <td />
                                        </tr>
                                    ))}
                                    {table.getRowModel().rows.length === 0 && (
                                        <tr>
                                            <td colSpan={columns.length + 1} className="text-center py-10 text-gray-500">
                                                No zones found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center py-4 border-t border-gray-100">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    table.previousPage();
                                                }}
                                                className={cn(!table.getCanPreviousPage() && "opacity-50 cursor-not-allowed")}
                                            />
                                        </PaginationItem>

                                        {Array.from({ length: totalPages }, (_, i) => (
                                            <PaginationItem key={i}>
                                                <PaginationLink
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        table.setPageIndex(i);
                                                    }}
                                                    isActive={i === pageIndex}
                                                >
                                                    {i + 1}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}

                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    table.nextPage();
                                                }}
                                                className={cn(!table.getCanNextPage() && "opacity-50 cursor-not-allowed")}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sheet Modal */}
            <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
                <SheetContent className="w-[70vw] sm:max-w-none p-0">
                    {/* Header with tabs */}
                    <div className="relative flex border-b gap-[14vw]">
                        {/* Title */}
                        <SheetHeader className="px-6 py-4 border-gray-200">
                            <SheetTitle className="text-lg font-semibold text-gray-900">New Zone</SheetTitle>
                        </SheetHeader>

                        <div className="flex items-center gap-0 border-gray-200 max-w-[40vw]">
                            {/* Details Tab */}
                            <div className="relative">
                                <button
                                    className="px-10 py-4 font-medium relative w-[200px] left-6 bg-green-700 text-white"
                                    style={{
                                        clipPath: "polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%)"
                                    }}
                                >
                                    Details
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 h-[calc(100vh-200px)] max-w-[600px] md:max-w-[800px]  mx-auto overflow-y-auto animate-in fade-in duration-300 slide-in-from-right-5">
                        <div className="space-y-6 animate-in fade-in duration-300 slide-in-from-right-5">

                            {/* Campaign Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Campaign <span className="text-red-500">*</span>
                                </label>
                                <Popover open={campaignOpen} onOpenChange={setCampaignOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={campaignOpen}
                                            className={cn(
                                                "w-full justify-between rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0 hover:bg-blue-50",
                                                errors.campaignId
                                                    ? "border-b-red-500"
                                                    : "border-b-gray-300 hover:border-b-[#04b301]"
                                            )}
                                        >
                                            {selectedCampaignName || "Select campaign..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search campaign..."
                                                value={campaignSearch}
                                                onValueChange={setCampaignSearch}
                                            />
                                            <CommandList>
                                                {loadingCampaigns ? (
                                                    <CommandEmpty>Loading...</CommandEmpty>
                                                ) : filteredCampaigns.length === 0 ? (
                                                    <CommandEmpty>No campaign found.</CommandEmpty>
                                                ) : (
                                                    <CommandGroup>
                                                        {filteredCampaigns.map((campaign) => (
                                                            <CommandItem
                                                                key={campaign._id}
                                                                value={campaign.name}
                                                                onSelect={() => {
                                                                    setCampaignId(campaign._id === campaignId ? "" : campaign._id);
                                                                    setCampaignOpen(false);
                                                                    setErrors(prev => ({ ...prev, campaignId: false }));
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        campaignId === campaign._id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {campaign.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                )}
                                                <div className="flex items-center justify-between p-2 border-t">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCampaignPage(p => Math.max(1, p - 1));
                                                        }}
                                                        disabled={campaignPage === 1}
                                                    >
                                                        Previous
                                                    </Button>
                                                    <span className="text-xs text-gray-500">Page {campaignPage}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCampaignPage(p => p + 1);
                                                        }}
                                                        disabled={!campaignsData?.campaigns || campaignsData.campaigns.length < 10}
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

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
                                    placeholder="Douala 44"
                                    className={cn(
                                        "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                        errors.zoneName
                                            ? "border-b-red-500 focus:border-b-red-500"
                                            : "border-b-gray-300 focus:border-b-[#04b301]"
                                    )}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (Optional)
                                </label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Zone description"
                                    className="rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0 border-b-gray-300 focus:border-b-[#04b301]"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Zone Boundaries <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleUndoPoint}
                                            disabled={boundaries.length === 0}
                                        >
                                            Undo
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleClearPoints}
                                            disabled={boundaries.length === 0}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" /> Clear
                                        </Button>
                                    </div>
                                </div>
                                <div className={cn(
                                    "border rounded-lg overflow-hidden",
                                    errors.boundaries ? "border-red-500" : "border-gray-200"
                                )}>
                                    {isLoaded ? (
                                        <GoogleMap
                                            mapContainerStyle={mapContainerStyle}
                                            center={defaultCenter}
                                            zoom={13}
                                            onClick={handleMapClick}
                                            options={{
                                                mapTypeControl: false,
                                                streetViewControl: false,
                                                fullscreenControl: false,
                                            }}
                                        >
                                            {boundaries.map((point, index) => (
                                                <Marker
                                                    key={index}
                                                    position={point}
                                                    label={(index + 1).toString()}
                                                />
                                            ))}
                                            {boundaries.length > 0 && (
                                                <Polygon
                                                    paths={boundaries}
                                                    options={{
                                                        fillColor: "#028700",
                                                        fillOpacity: 0.3,
                                                        strokeColor: "#028700",
                                                        strokeOpacity: 0.8,
                                                        strokeWeight: 2,
                                                    }}
                                                />
                                            )}
                                        </GoogleMap>
                                    ) : (
                                        <div className="h-[400px] bg-gray-100 flex items-center justify-center">
                                            <Loader2 className="animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Click on the map to add points for the zone boundary. You need at least 3 points.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer with Save button */}
                    <div className="absolute bottom-0 right-0 left-0 p-6 border-t border-gray-200 bg-white">
                        <div className="flex justify-end">
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
