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
import { ChevronDown, Loader2, Settings, Search, Plus, X, Eye, EyeOff, Link2 } from "lucide-react";
import { DataTable } from "../PatientsTable";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import {
    useTeamMembers,
    useCreateTeamMember,
    CreateUserPayload,
} from "../team/hooks/useTeamMembers";
import { useCampaigns, useZonesByCampaign, useCreateTeam } from "./hooks";
import { toast } from "sonner";
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Types
interface Team {
    id: string;
    teamLead: string;
    members: number;
    activeCampaign: string;
    status: "live" | "inactive";
}

interface Member {
    id: number;
    fullName: string;
    email: string;
    tel: string;
    lastActivity: string;
    isActive?: boolean;
}

// Sample data
const TEAMS_DATA: Team[] = [
    { id: "Team 001", teamLead: "Theresia Mbah", members: 3, activeCampaign: "Polio 2024", status: "live" },
    { id: "Team 002", teamLead: "Peters Nze", members: 3, activeCampaign: "Polio 2024", status: "inactive" },
    { id: "Team 003", teamLead: "Ayissi Bi Paul", members: 2, activeCampaign: "VIT A 2025", status: "inactive" },
    { id: "Team 004", teamLead: "Ebeneza Ndoki", members: 2, activeCampaign: "VIT A 2025", status: "inactive" },
    { id: "Team 005", teamLead: "Pierre Kwemo", members: 3, activeCampaign: "VIT A 2025", status: "live" },
    { id: "Team 006", teamLead: "Chalefac Theodore", members: 3, activeCampaign: "VIT A 2025", status: "inactive" },
    { id: "Team 007", teamLead: "Kuma  Theodore", members: 3, activeCampaign: "VIT A 2025", status: "inactive" },
];

// Status badge component
function StatusBadge({ status }: { status: "live" | "inactive" }) {
    if (status !== "live") return null;

    return (
        <div className="flex items-center gap-1.5 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-600"></div>
            <span className="text-sm font-medium">Live</span>
        </div>
    );
}

// Column definitions
const columns: ColumnDef<Team>[] = [
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
];

export function Teams() {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [pageIndex, setPageIndex] = React.useState(0);
    const pageSize = 10;

    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [currentUser, setCurrentUser] = React.useState<any>(null);

    // Load current user from localStorage
    React.useEffect(() => {
        try {
            const userData = localStorage.getItem("userData");
            if (userData) {
                const parsed = JSON.parse(userData);
                setCurrentUser(parsed);
            }
        } catch {
            toast.error("Failed to load user data");
        }
    }, []);

    // Fetch team members using the hook
    const { data: teamMembers, isLoading: loadingMembers } = useTeamMembers();
    const createMemberMutation = useCreateTeamMember();

    // Sheet states
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [isAddMemberSheetOpen, setIsAddMemberSheetOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<"details" | "members">("details");

    // Fetch hooks
    const { data: campaigns } = useCampaigns();
    const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>("");
    const { data: zones } = useZonesByCampaign(selectedCampaignId);
    const { data: allMembers } = useTeamMembers();
    const createTeamMutation = useCreateTeam();

    // Form states - Details tab
    const [formData, setFormData] = React.useState({
        name: "",
        campaign_id: "",
        zone_id: "",
        members: [] as string[],
        team_lead_id: "",
    });

    const [errors, setErrors] = React.useState({
        name: false,
        campaign_id: false,
        zone_id: false,
        members: false,
        team_lead_id: false,
    });

    // Update form when campaign changes to reset zone
    React.useEffect(() => {
        if (formData.campaign_id !== selectedCampaignId) {
            setSelectedCampaignId(formData.campaign_id);
            setFormData(prev => ({ ...prev, zone_id: "" }));
        }
    }, [formData.campaign_id, selectedCampaignId]);

    // Add Member form states - Updated to match API payload
    const [newMember, setNewMember] = React.useState({
        username: "",
        first_name: "",
        last_name: "",
        gender: "male" as "male" | "female",
        email: "",
        phone: "",
        phone2: "",
        password: "",
        repeatPassword: "",
    });
    const [showPassword, setShowPassword] = React.useState(false);
    const [showRepeatPassword, setShowRepeatPassword] = React.useState(false);
    const [memberErrors, setMemberErrors] = React.useState({
        username: false,
        first_name: false,
        last_name: false,
        email: false,
        phone: false,
        password: false,
        repeatPassword: false,
    });

    const handleAddMember = () => {
        // Validate required fields
        const newMemberErrors = {
            username: !newMember.username,
            first_name: !newMember.first_name,
            last_name: !newMember.last_name,
            phone: !newMember.phone,
            email: !newMember.email,
            password: !newMember.password || newMember.password.length < 6,
            repeatPassword: !newMember.repeatPassword || newMember.password !== newMember.repeatPassword,
        };

        setMemberErrors(newMemberErrors);

        if (Object.values(newMemberErrors).some(error => error)) {
            toast.error("Please fix the errors in the form");
            return;
        }

        if (!currentUser?.facility?.id) {
            toast.error("User facility information not found");
            return;
        }

        // Build API payload
        const payload: CreateUserPayload = {
            username: newMember.username,
            password: newMember.password,
            first_name: newMember.first_name,
            last_name: newMember.last_name,
            gender: newMember.gender,
            email: [newMember.email],
            phone: newMember.phone2 ? [newMember.phone, newMember.phone2] : [newMember.phone],
            role_id: currentUser?.role.id,
            facility_type: currentUser?.facility.facility_type,
            facility_id: currentUser?.facility.id,
        };

        createMemberMutation.mutate(payload, {
            onSuccess: () => {
                toast.success("Team member created successfully!");

                // Reset form
                setNewMember({
                    username: "",
                    first_name: "",
                    last_name: "",
                    gender: "male",
                    email: "",
                    phone: "",
                    phone2: "",
                    password: "",
                    repeatPassword: "",
                });
                setMemberErrors({
                    username: false,
                    first_name: false,
                    last_name: false,
                    email: false,
                    phone: false,
                    password: false,
                    repeatPassword: false,
                });
                setIsAddMemberSheetOpen(false);
            },
            onError: (err: any) => {
                toast.error(err.message || "Failed to create team member");
            },
        });
    };

    const handleSave = () => {
        // Validate fields
        const newErrors = {
            name: !formData.name,
            campaign_id: !formData.campaign_id,
            zone_id: !formData.zone_id,
            members: formData.members.length === 0,
            team_lead_id: !formData.team_lead_id,
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(error => error)) {
            toast.error("Please fill in all required fields");
            return;
        }

        createTeamMutation.mutate(formData, {
            onSuccess: () => {
                toast.success("Team created successfully!");
                // Reset and close
                setFormData({
                    name: "",
                    campaign_id: "",
                    zone_id: "",
                    members: [],
                    team_lead_id: "",
                });
                setIsSheetOpen(false);
                setActiveTab("details");
            },
            onError: (err: any) => {
                toast.error(err.message || "Failed to create team");
            }
        });
    };

    // Filter data based on search
    const filteredData = React.useMemo(() => {
        if (!searchQuery) return TEAMS_DATA;
        const query = searchQuery.toLowerCase();
        return TEAMS_DATA.filter(
            (team) =>
                team.id.toLowerCase().includes(query) ||
                team.teamLead.toLowerCase().includes(query) ||
                team.activeCampaign.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // Map team members data for DataTable
    const tableMembersData = React.useMemo(() => {
        return teamMembers?.map((u: any) => ({
            username: u.username,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email?.[0],
            phone: u.phone?.[0],
            gender: u.gender,
            code: u.code
        })) ?? [];
    }, [teamMembers]);

    const memberColumns = [
        { accessorKey: "username", header: "Username" },
        { accessorKey: "firstName", header: "First Name" },
        { accessorKey: "lastName", header: "Last Name" },
        { accessorKey: "email", header: "Email" },
        { accessorKey: "phone", header: "Phone" },
        { accessorKey: "gender", header: "Gender" },
        { accessorKey: "code", header: "Code" },
    ];

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

    // Helper to get member name
    const getMemberName = (id: string) => {
        const member = allMembers?.find((m: any) => m._id === id);
        return member ? `${member.first_name} ${member.last_name}` : id;
    };

    return (
        <>
            <div className="flex flex-col h-full p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
                </div>

                {/* Search and Actions Bar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search Team"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white border-gray-200 rounded-sm"
                        />
                    </div>
                    <Button
                        onClick={() => setIsSheetOpen(true)}
                        className="bg-green-600 hover:bg-green-700 py-6 rounded-sm text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Team
                    </Button>
                </div>

                {/* Table */}
                <Card className="w-full bg-white shadow-sm rounded-lg border border-gray-100 flex-1">
                    <CardContent className="overflow-x-auto p-0">
                        {loadingMembers ? (
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
                                                No teams found
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

            {/* New Team Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[70vw] sm:max-w-none p-0">
                    {/* Header with tabs */}
                    <div className="relative flex border-b gap-[14vw]">
                        {/* Title */}
                        <SheetHeader className="px-6 py-4 border-gray-200">
                            <SheetTitle className="text-lg font-semibold text-gray-900">New Team</SheetTitle>
                        </SheetHeader>

                        <div className="flex items-center gap-0 border-gray-200 max-w-[40vw]">
                            {/* Details Tab */}
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

                            {/* Members Tab */}
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
                    <div className="p-6 h-[calc(100vh-200px)] w-full mx-auto overflow-y-auto">
                        {activeTab === "details" && (
                            <div className="space-y-6 animate-in max-w-[800px] mx-auto fade-in duration-300 slide-in-from-right-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Campaign <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        value={formData.campaign_id}
                                        onValueChange={(value) => {
                                            setFormData(prev => ({ ...prev, campaign_id: value }));
                                            setErrors(prev => ({ ...prev, campaign_id: false }));
                                        }}
                                    >
                                        <SelectTrigger className={cn(
                                            "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0",
                                            errors.campaign_id
                                                ? "border-b-red-500 focus:border-b-red-500"
                                                : "border-b-gray-300 focus:border-b-[#04b301]"
                                        )}>
                                            <SelectValue placeholder="Select Campaign" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {campaigns?.results?.map((campaign: any) => (
                                                <SelectItem key={campaign.id} value={campaign.id}>
                                                    {campaign.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Zone <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        value={formData.zone_id}
                                        onValueChange={(value) => {
                                            setFormData(prev => ({ ...prev, zone_id: value }));
                                            setErrors(prev => ({ ...prev, zone_id: false }));
                                        }}
                                        disabled={!formData.campaign_id}
                                    >
                                        <SelectTrigger className={cn(
                                            "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0",
                                            errors.zone_id
                                                ? "border-b-red-500 focus:border-b-red-500"
                                                : "border-b-gray-300 focus:border-b-[#04b301]"
                                        )}>
                                            <SelectValue placeholder="Select Zone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zones?.map((zone: any) => (
                                                <SelectItem key={zone.id} value={zone.id}>
                                                    {zone.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Team Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, name: e.target.value }));
                                            setErrors(prev => ({ ...prev, name: false }));
                                        }}
                                        placeholder="Enter team name"
                                        className={cn(
                                            "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                            errors.name
                                                ? "border-b-red-500 focus:border-b-red-500"
                                                : "border-b-gray-300 focus:border-b-[#04b301]"
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Members <span className="text-red-500">*</span>
                                    </label>
                                    <div className="border border-gray-200 rounded-md p-4 max-h-60 overflow-y-auto">
                                        {allMembers?.map((member: any) => (
                                            <div key={member._id} className="flex items-center space-x-2 py-2">
                                                <input
                                                    type="checkbox"
                                                    id={`member-${member._id}`}
                                                    checked={formData.members.includes(member._id)}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setFormData(prev => {
                                                            const newMembers = isChecked
                                                                ? [...prev.members, member._id]
                                                                : prev.members.filter(id => id !== member._id);

                                                            // If removing a member who is team lead, clear team lead
                                                            const newTeamLead = (!isChecked && prev.team_lead_id === member._id)
                                                                ? ""
                                                                : prev.team_lead_id;

                                                            return { ...prev, members: newMembers, team_lead_id: newTeamLead };
                                                        });
                                                        setErrors(prev => ({ ...prev, members: false }));
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                                                />
                                                <label htmlFor={`member-${member._id}`} className="text-sm text-gray-700 cursor-pointer select-none">
                                                    {member.first_name} {member.last_name} ({member.username})
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.members && <p className="text-xs text-red-500 mt-1">Select at least one member</p>}
                                </div>

                                {formData.members.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Team Lead <span className="text-red-500">*</span>
                                        </label>
                                        <div className="border border-gray-200 rounded-md p-4">
                                            {formData.members.map((memberId) => (
                                                <div key={memberId} className="flex items-center space-x-2 py-2">
                                                    <input
                                                        type="radio"
                                                        id={`lead-${memberId}`}
                                                        name="team_lead"
                                                        checked={formData.team_lead_id === memberId}
                                                        onChange={() => {
                                                            setFormData(prev => ({ ...prev, team_lead_id: memberId }));
                                                            setErrors(prev => ({ ...prev, team_lead_id: false }));
                                                        }}
                                                        className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-600"
                                                    />
                                                    <label htmlFor={`lead-${memberId}`} className="text-sm text-gray-700 cursor-pointer select-none">
                                                        {getMemberName(memberId)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.team_lead_id && <p className="text-xs text-red-500 mt-1">Select a team lead</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "members" && (
                            <div className="space-y-6 animate-in fade-in duration-300 slide-in-from-right-5">
                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => setIsAddMemberSheetOpen(true)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-sm"
                                    >
                                        Add users
                                    </Button>
                                </div>

                                {/* Members Table - Using DataTable */}
                                <DataTable data={tableMembersData} columns={memberColumns} isLoading={loadingMembers} />
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

            {/* Add Member Nested Sheet */}
            <Sheet open={isAddMemberSheetOpen} onOpenChange={setIsAddMemberSheetOpen}>
                <SheetContent className="w-[500px] sm:max-w-none p-0">
                    <SheetHeader className="px-6 py-4 border-b">
                        <SheetTitle className="text-lg font-semibold text-gray-900">Add Member</SheetTitle>
                    </SheetHeader>

                    <div className="p-6 h-[calc(100vh-120px)] overflow-y-auto space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={newMember.username}
                                onChange={(e) => {
                                    setNewMember(prev => ({ ...prev, username: e.target.value }));
                                    setMemberErrors(prev => ({ ...prev, username: false }));
                                }}
                                placeholder="amos.paul"
                                className={cn(
                                    "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                    memberErrors.username
                                        ? "border-b-red-500 focus:border-b-red-500"
                                        : "border-b-gray-300 focus:border-b-[#04b301]"
                                )}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={newMember.first_name}
                                onChange={(e) => {
                                    setNewMember(prev => ({ ...prev, first_name: e.target.value }));
                                    setMemberErrors(prev => ({ ...prev, first_name: false }));
                                }}
                                placeholder="Amos"
                                className={cn(
                                    "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                    memberErrors.first_name
                                        ? "border-b-red-500 focus:border-b-red-500"
                                        : "border-b-gray-300 focus:border-b-[#04b301]"
                                )}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={newMember.last_name}
                                onChange={(e) => {
                                    setNewMember(prev => ({ ...prev, last_name: e.target.value }));
                                    setMemberErrors(prev => ({ ...prev, last_name: false }));
                                }}
                                placeholder="Paul"
                                className={cn(
                                    "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                    memberErrors.last_name
                                        ? "border-b-red-500 focus:border-b-red-500"
                                        : "border-b-gray-300 focus:border-b-[#04b301]"
                                )}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gender
                            </label>
                            <Select
                                value={newMember.gender}
                                onValueChange={(value) => setNewMember(prev => ({ ...prev, gender: value as "male" | "female" }))}
                            >
                                <SelectTrigger className="rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus:ring-0 border-b-gray-300 focus:border-b-[#04b301]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="email"
                                value={newMember.email}
                                onChange={(e) => {
                                    setNewMember(prev => ({ ...prev, email: e.target.value }));
                                    setMemberErrors(prev => ({ ...prev, email: false }));
                                }}
                                placeholder="amosjames@gmail.com"
                                className={cn(
                                    "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                    memberErrors.email
                                        ? "border-b-red-500 focus:border-b-red-500"
                                        : "border-b-gray-300 focus:border-b-[#04b301]"
                                )}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={newMember.phone}
                                onChange={(e) => {
                                    setNewMember(prev => ({ ...prev, phone: e.target.value }));
                                    setMemberErrors(prev => ({ ...prev, phone: false }));
                                }}
                                placeholder="+237 6XX XXX XXX"
                                className={cn(
                                    "rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                    memberErrors.phone
                                        ? "border-b-red-500 focus:border-b-red-500"
                                        : "border-b-gray-300 focus:border-b-[#04b301]"
                                )}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone 2 (optional)
                            </label>
                            <Input
                                value={newMember.phone2}
                                onChange={(e) => setNewMember(prev => ({ ...prev, phone2: e.target.value }))}
                                placeholder="+237"
                                className="rounded-none shadow-none py-6 px-5 border-b-2 border-x-0 border-t-0 bg-blue-50 border-b-gray-300 focus:border-b-[#04b301] focus-visible:ring-0"
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <h3 className="text-center font-semibold text-gray-900 mb-4">Security</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={newMember.password}
                                    onChange={(e) => {
                                        setNewMember(prev => ({ ...prev, password: e.target.value }));
                                        setMemberErrors(prev => ({ ...prev, password: false }));
                                    }}
                                    placeholder="••••••"
                                    className={cn(
                                        "rounded-none shadow-none py-6 px-5 pr-12 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                        memberErrors.password
                                            ? "border-b-red-500 focus:border-b-red-500"
                                            : "border-b-gray-300 focus:border-b-[#04b301]"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Repeat Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Input
                                    type={showRepeatPassword ? "text" : "password"}
                                    value={newMember.repeatPassword}
                                    onChange={(e) => {
                                        setNewMember(prev => ({ ...prev, repeatPassword: e.target.value }));
                                        setMemberErrors(prev => ({ ...prev, repeatPassword: false }));
                                    }}
                                    placeholder="••••••"
                                    className={cn(
                                        "rounded-none shadow-none py-6 px-5 pr-12 border-b-2 border-x-0 border-t-0 bg-blue-50 focus-visible:ring-0",
                                        memberErrors.repeatPassword
                                            ? "border-b-red-500 focus:border-b-red-500"
                                            : "border-b-gray-300 focus:border-b-[#04b301]"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showRepeatPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 right-0 left-0 p-6 border-t border-gray-200 bg-white">
                        <div className="flex justify-end">
                            <Button
                                onClick={handleAddMember}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-sm"
                            >
                                Add Member
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
