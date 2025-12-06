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
import { ChevronDown, Loader2, Settings, Search, Plus, PauseCircle, CheckCircle, XCircle, PlayCircle, CalendarIcon, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useCreateCampaign } from "./hooks";
import { useTeamMembers } from "../team/hooks/useTeamMembers";
import { toast } from "sonner";

// Types
type CampaignStatus = "live" | "complete" | "paused" | "cancelled";

interface Campaign {
    id: number;
    activeCampaign: string;
    campaignManager: string;
    members: number;
    progress: number;
    status: CampaignStatus;
}

interface Member {
    id: number;
    zone: string;
    team: string;
}

// Sample data matching the screenshot
const CAMPAIGNS_DATA: Campaign[] = [
    { id: 1, activeCampaign: "Polio 2024", campaignManager: "Theresia Mbah", members: 3, progress: 20, status: "live" },
    { id: 2, activeCampaign: "Polio 2024", campaignManager: "Peters Nze", members: 3, progress: 55, status: "live" },
    { id: 2, activeCampaign: "VIT A 2025", campaignManager: "Ayissi Bi Paul", members: 2, progress: 60, status: "live" },
    { id: 2, activeCampaign: "VIT A 2025", campaignManager: "Ebeneza Ndoki", members: 2, progress: 85, status: "live" },
    { id: 1, activeCampaign: "VIT A 2025", campaignManager: "Pierre Kwemo", members: 3, progress: 100, status: "complete" },
    { id: 2, activeCampaign: "VIT A 2025", campaignManager: "Chalefac Theodore", members: 3, progress: 45, status: "paused" },
    { id: 1, activeCampaign: "VIT A 2025", campaignManager: "Kuma  Theodore", members: 3, progress: 75, status: "cancelled" },
];

// Status indicator component
function StatusBadge({ status }: { status: CampaignStatus }) {
    const config = {
        live: { icon: PlayCircle, label: "Live", className: "text-green-600" },
        complete: { icon: CheckCircle, label: "complete", className: "text-gray-600" },
        paused: { icon: PauseCircle, label: "Paused", className: "text-gray-500" },
        cancelled: { icon: XCircle, label: "Cancelled", className: "text-red-600" },
    };

    const { icon: Icon, label, className } = config[status];

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}

// Progress bar component
function ProgressBar({ progress, status }: { progress: number; status: CampaignStatus }) {
    const getBarColor = () => {
        if (status === "cancelled") return "bg-[#FF0000]";
        if (status === "paused") return "bg-gray-400";
        if (progress < 40) return "bg-[#FF0000]";
        if (progress < 70) return "bg-yellow-400";
        return "bg-[#028700]";
    };

    return (
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
                className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}

// Column definitions
const columns: ColumnDef<Campaign>[] = [
    {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <span className="text-gray-700">{row.getValue("id")}</span>,
    },
    {
        accessorKey: "activeCampaign",
        header: "Active Campaign",
        cell: ({ row }) => <span className="text-gray-700">{row.getValue("activeCampaign")}</span>,
    },
    {
        accessorKey: "campaignManager",
        header: "Campaign Manager",
        cell: ({ row }) => <span className="text-gray-700">{row.getValue("campaignManager")}</span>,
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
        accessorKey: "progress",
        header: "Progress",
        cell: ({ row }) => (
            <ProgressBar
                progress={row.getValue("progress")}
                status={row.original.status}
            />
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
];

export function Campaigns() {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isLoading] = React.useState(false);
    const [pageIndex, setPageIndex] = React.useState(0);
    const pageSize = 10;

    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

    // Slide-in panel states
    const [isPanelOpen, setIsPanelOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<"details" | "members">("details");

    // Fetch hooks
    const { data: teamMembers } = useTeamMembers();
    const createCampaignMutation = useCreateCampaign();

    // Form states
    const [formData, setFormData] = React.useState({
        name: "",
        description: "",
        manager_personality_id: "",
        start_date: undefined as Date | undefined,
        end_date: undefined as Date | undefined,
    });

    const [errors, setErrors] = React.useState({
        name: false,
        manager_personality_id: false,
        start_date: false,
        end_date: false,
    });

    // Members tab states
    const [selectedZone, setSelectedZone] = React.useState("");
    const [selectedTeam, setSelectedTeam] = React.useState("");
    const [members, setMembers] = React.useState<Member[]>([
        { id: 1, zone: "Polio 2024", team: "Theresia Mbah" },
        { id: 2, zone: "Polio 2024", team: "Peters Nze" },
    ]);

    const handleAddMember = () => {
        if (selectedZone && selectedTeam) {
            setMembers([
                ...members,
                { id: members.length + 1, zone: selectedZone, team: selectedTeam },
            ]);
            setSelectedZone("");
            setSelectedTeam("");
        }
    };

    const handleSave = () => {
        // Validate fields
        const newErrors = {
            name: !formData.name,
            manager_personality_id: !formData.manager_personality_id,
            start_date: !formData.start_date,
            end_date: !formData.end_date,
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(error => error)) {
            toast.error("Please fill in all required fields");
            return;
        }

        const payload = {
            name: formData.name,
            description: formData.description,
            manager_personality_id: formData.manager_personality_id,
            start_date: formData.start_date ? format(formData.start_date, "yyyy-MM-dd") : "",
            end_date: formData.end_date ? format(formData.end_date, "yyyy-MM-dd") : "",
        };

        createCampaignMutation.mutate(payload, {
            onSuccess: () => {
                toast.success("Campaign created successfully!");
                // Reset and close
                setFormData({
                    name: "",
                    description: "",
                    manager_personality_id: "",
                    start_date: undefined,
                    end_date: undefined,
                });
                setIsPanelOpen(false);
            },
            onError: (err: any) => {
                toast.error(err.message || "Failed to create campaign");
            }
        });
    };

    // Filter data based on search
    const filteredData = React.useMemo(() => {
        if (!searchQuery) return CAMPAIGNS_DATA;
        const query = searchQuery.toLowerCase();
        return CAMPAIGNS_DATA.filter(
            (campaign) =>
                campaign.activeCampaign.toLowerCase().includes(query) ||
                campaign.campaignManager.toLowerCase().includes(query) ||
                campaign.status.toLowerCase().includes(query)
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

    return (
        <>
            <div className="flex flex-col h-full p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
                </div>

                {/* Search and Actions Bar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search Campaigns"
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
                        New Campaign
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
                                                No campaigns found
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
                            <SheetTitle className="text-lg font-semibold text-gray-900">New Campaign</SheetTitle>
                        </SheetHeader>

                        <div className="flex items-center gap-0 border-gray-200 max-w-[40vw]">
                            {/* Details Tab - flat left, pointed right */}
                            <div className="relative">
                                <button
                                    onClick={() => setActiveTab("details")}
                                    className={cn(
                                        "px-10 py-4 font-medium relative w-[200px] left-6",
                                        activeTab === "details"
                                            ? "bg-green-700 text-white"
                                            : "bg-gray-100 text-gray-600"
                                    )}
                                    style={{
                                        clipPath: "polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%)"
                                    }}
                                >
                                    Details
                                </button>
                            </div>

                            {/* Members Tab - pointed left (inward), pointed right */}
                            <div className="relative -ml-5">
                                <button
                                    onClick={() => setActiveTab("members")}
                                    className={cn(
                                        "px-8 py-4 font-medium relative pl-10 w-[200px]",
                                        activeTab === "members"
                                            ? "bg-green-700 text-white"
                                            : "bg-gray-100 text-gray-600"
                                    )}
                                    style={{
                                        clipPath: "polygon(75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%)"
                                    }}
                                >
                                    Members
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 h-[calc(100vh-200px)] max-w-[800px] mx-auto overflow-y-auto  animate-in fade-in duration-300 slide-in-from-right-5">
                        {activeTab === "details" && (
                            <div className="space-y-6 animate-in fade-in duration-300 slide-in-from-right-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Campaign Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, name: e.target.value }));
                                            setErrors(prev => ({ ...prev, name: false }));
                                        }}
                                        placeholder="Douala 44"
                                        className={cn(
                                            "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0",
                                            errors.name
                                                ? "border-b-red-500 focus:border-b-red-500"
                                                : "border-b-gray-300 focus:border-b-[#04b301]"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Campaign Manager <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        value={formData.manager_personality_id}
                                        onValueChange={(value) => {
                                            setFormData(prev => ({ ...prev, manager_personality_id: value }));
                                            setErrors(prev => ({ ...prev, manager_personality_id: false }));
                                        }}
                                    >
                                        <SelectTrigger className={cn(
                                            "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0",
                                            errors.manager_personality_id
                                                ? "border-b-red-500 focus:border-b-red-500"
                                                : "border-b-gray-300 focus:border-b-[#04b301]"
                                        )}>
                                            <SelectValue placeholder="Select Manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teamMembers?.map((member: any) => (
                                                <SelectItem key={member._id} value={member._id}>
                                                    {member.first_name} {member.last_name} ({member.username})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date <span className="text-red-500">*</span>
                                        </label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0 hover:bg-blue-50",
                                                        !formData.start_date && "text-muted-foreground",
                                                        errors.start_date
                                                            ? "border-b-red-500 focus:border-b-red-500"
                                                            : "border-b-gray-300 focus:border-b-[#04b301]"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.start_date}
                                                    onSelect={(date) => {
                                                        setFormData(prev => ({ ...prev, start_date: date }));
                                                        setErrors(prev => ({ ...prev, start_date: false }));
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date <span className="text-red-500">*</span>
                                        </label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0 hover:bg-blue-50",
                                                        !formData.end_date && "text-muted-foreground",
                                                        errors.end_date
                                                            ? "border-b-red-500 focus:border-b-red-500"
                                                            : "border-b-gray-300 focus:border-b-[#04b301]"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.end_date ? format(formData.end_date, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.end_date}
                                                    onSelect={(date) => {
                                                        setFormData(prev => ({ ...prev, end_date: date }));
                                                        setErrors(prev => ({ ...prev, end_date: false }));
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="some description"
                                        className="rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:border-b-[#04b301] focus-visible:ring-0 min-h-[150px]"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "members" && (
                            <div className="space-y-6 animate-in fade-in duration-300 slide-in-from-right-5">
                                <Card className="flex flex-col gap-6 p-4 shadow-sm border-none rounded-sm bg-gray-50">
                                    <section className="flex gap-4 items-end">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Zone
                                            </label>
                                            <Select value={selectedZone} onValueChange={setSelectedZone}>
                                                <SelectTrigger className="rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:border-b-[#04b301] focus:ring-0">
                                                    <SelectValue placeholder="Grand Hanga" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Grand Hanga">Grand Hanga</SelectItem>
                                                    <SelectItem value="Polio 2024">Polio 2024</SelectItem>
                                                    <SelectItem value="Zone 3">Zone 3</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Team
                                            </label>
                                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                                <SelectTrigger className="rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:border-b-[#04b301] focus:ring-0">
                                                    <SelectValue placeholder="Team 123" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Team 123">Team 123</SelectItem>
                                                    <SelectItem value="Theresia Mbah">Theresia Mbah</SelectItem>
                                                    <SelectItem value="Peters Nze">Peters Nze</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </section>

                                    <Button
                                        onClick={handleAddMember}
                                        className="bg-green-600 hover:bg-green-700 w-fit py-6 ml-auto text-white rounded-sm"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add
                                    </Button>
                                </Card>

                                {/* Members Table */}
                                <div className="border border-gray-200 rounded-sm overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-gray-600 font-medium">ID</th>
                                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Zone</th>
                                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Team</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {members.map((member) => (
                                                <tr key={member.id} className="border-t border-gray-100">
                                                    <td className="px-4 py-3 text-gray-700">{member.id}</td>
                                                    <td className="px-4 py-3 text-gray-700">{member.zone}</td>
                                                    <td className="px-4 py-3 text-gray-700">{member.team}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer with Save button */}
                    <div className="absolute bottom-0 right-0 left-0 p-6 border-t border-gray-200 bg-white">
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSave}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-sm"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
