"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Plus, PauseCircle, CheckCircle, XCircle, PlayCircle, CalendarIcon } from "lucide-react";
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
import { useCampaigns, Campaign } from "./hooks/useCampaigns";
import { useTeamMembers } from "../team/hooks/useTeamMembers";
import { toast } from "sonner";
import { DataTable } from "@/components/PatientsTable";

// Types
type CampaignStatus = "active" | "inactive" | "completed" | "draft";

interface Member {
    id: number;
    zone: string;
    team: string;
}

// Status indicator component
function StatusBadge({ status }: { status: CampaignStatus }) {
    const config = {
        active: { icon: PlayCircle, label: "Active", className: "text-green-600" },
        completed: { icon: CheckCircle, label: "Completed", className: "text-gray-600" },
        inactive: { icon: PauseCircle, label: "Inactive", className: "text-gray-500" },
        draft: { icon: XCircle, label: "Draft", className: "text-yellow-600" },
    };

    const { icon: Icon, label, className } = config[status] || config.draft;

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}

// Column definitions for Campaign
const columns: ColumnDef<Campaign>[] = [
    {
        accessorKey: "name",
        header: "Campaign Name",
        cell: ({ row }) => <span className="text-gray-700 font-medium">{row.getValue("name")}</span>,
    },
    {
        accessorKey: "manager",
        header: "Campaign Manager",
        cell: ({ row }) => {
            const manager = row.original.manager;
            const managerName = manager 
                ? `${manager.first_name} ${manager.last_name}` 
                : "N/A";
            return <span className="text-gray-700">{managerName}</span>;
        },
    },
    {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <span className="text-gray-700">{row.getValue("code") || "N/A"}</span>,
    },
    {
        accessorKey: "start_date",
        header: "Start Date",
        cell: ({ row }) => {
            const date = row.getValue("start_date") as string;
            return <span className="text-gray-700">{date || "N/A"}</span>;
        },
    },
    {
        accessorKey: "end_date",
        header: "End Date",
        cell: ({ row }) => {
            const date = row.getValue("end_date") as string;
            return <span className="text-gray-700">{date || "N/A"}</span>;
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
];

export function Campaigns() {
    const [searchQuery, setSearchQuery] = React.useState("");

    // Campaigns fetching with pagination
    const [campaignsPage, setCampaignsPage] = React.useState(1);
    const [campaignsLimit, setCampaignsLimit] = React.useState(20);
    const { data: campaignsData, isLoading: loadingCampaigns } = useCampaigns({
        page: campaignsPage,
        limit: campaignsLimit,
    });

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
                        {loadingCampaigns ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="animate-spin text-green-600" size={32} />
                            </div>
                        ) : (
                            <DataTable
                                data={campaignsData?.campaigns ?? []}
                                columns={columns}
                                pagination={{
                                    pageIndex: campaignsPage - 1,
                                    pageSize: campaignsLimit,
                                }}
                                onPaginationChange={(pagination) => {
                                    setCampaignsPage(pagination.pageIndex + 1);
                                    setCampaignsLimit(pagination.pageSize);
                                }}
                            />
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
