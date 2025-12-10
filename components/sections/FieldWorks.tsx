"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Users, Radio, Search, ChevronDown } from "lucide-react"
import FieldMap from "@/components/field/FieldMap"
import { CalendarPlusIcon, MapPinSimpleAreaIcon, MegaphoneIcon, UsersThreeIcon } from "@phosphor-icons/react"
import { useState, useMemo } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Live } from "../field/Live";
import { Campaigns } from "../field/Campaigns";
import { Zones } from "../field/Zones";
import { Teams } from "../field/Teams";

// Sample data - replace with actual data from your API
const CAMPAIGNS = [
    { id: "2354", label: "Campaign #2354" },
    { id: "2355", label: "Campaign #2355" },
    { id: "2356", label: "Polio 2024" },
    { id: "2357", label: "Malaria Prevention" },
    { id: "2358", label: "COVID-19 Vaccination" },
];

const ZONES = [
    { id: "1", label: "Zone 1" },
    { id: "2", label: "Zone 2" },
    { id: "3", label: "Zone 3" },
    { id: "8", label: "Zone 8" },
    { id: "nguele", label: "Nguélie Zone" },
];

const TEAMS = [
    { id: "peter", label: "Team Peter" },
    { id: "123", label: "Team 123" },
    { id: "alpha", label: "Team Alpha" },
    { id: "beta", label: "Team Beta" },
];

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
}

function SearchableDropdown({ options, value, onChange, placeholder, icon }: SearchableDropdownProps) {
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
                        "flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors min-w-[160px]",
                        "border border-gray-100"
                    )}
                >
                    {icon}
                    <span className="text-[#a0a0a0] flex-1 text-left truncate">{selectedLabel}</span>
                    <ChevronDown className="h-4 w-4 text-[#D0BEBE]" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
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
                <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">No results found</div>
                    ) : (
                        filteredOptions.map((option) => (
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
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function FieldWorks() {
    const [selectedCampaign, setSelectedCampaign] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedDate, setSelectedDate] = useState("today");

    return (
        <Tabs defaultValue="live" className="flex h-screen bg-white">
            {/* Sidebar Navigation */}
            <div className="w-64  bg-gray-50">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Field</h1>
                </div>

                <TabsList className="grid w-full grid-cols-1 h-auto justify-start rounded-none bg-transparent p-0">
                    <TabsTrigger
                        value="live"
                        className="group w-full justify-start rounded-none data-[state=active]:bg-gray-50 px-6 py-4"
                    >
                        <Radio className="mr-3 h-5 w-5 text-[#D0BEBE] group-data-[state=active]:text-green-500" />
                        <span className="font-medium text-gray-600 group-data-[state=active]:text-green-500">Live</span>
                        <div className="ml-auto h-2 w-2 rounded-full bg-green-500"></div>
                    </TabsTrigger>

                    <TabsTrigger
                        value="campaigns"
                        className="group w-full justify-start rounded-none data-[state=active]:bg-gray-50 px-6 py-4"
                    >
                        <MegaphoneIcon className="mr-3 h-5 w-5 transform scale-x-[-1] text-[#D0BEBE] group-data-[state=active]:text-green-500" />
                        <span className="font-medium text-gray-600 group-data-[state=active]:text-green-500">Campaigns</span>
                    </TabsTrigger>

                    <TabsTrigger
                        value="zones"
                        className="group w-full justify-start rounded-none data-[state=active]:bg-gray-50 px-6 py-4"
                    >
                        <MapPinSimpleAreaIcon className="mr-3 h-5 w-5 text-[#D0BEBE] group-data-[state=active]:text-green-500" />
                        <span className="font-medium text-gray-600 group-data-[state=active]:text-green-500">Zones</span>
                    </TabsTrigger>

                    <TabsTrigger
                        value="teams"
                        className="group w-full justify-start rounded-none data-[state=active]:bg-gray-50 px-6 py-4"
                    >
                        <UsersThreeIcon className="mr-3 h-5 w-5 text-[#D0BEBE] group-data-[state=active]:text-green-500" />
                        <span className="font-medium text-gray-600 group-data-[state=active]:text-green-500">Teams</span>
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <TabsContent value="live" className="h-full m-0">
                    <Live selectedCampaign={selectedCampaign} setSelectedCampaign={setSelectedCampaign} selectedZone={selectedZone} setSelectedZone={setSelectedZone} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                </TabsContent>

                {/* Campaigns Tab */}
                <TabsContent value="campaigns" className="h-full m-0">
                    <Campaigns />
                </TabsContent>

                <TabsContent value="zones" className="h-full m-0">
                    <Zones />
                </TabsContent>

                <TabsContent value="teams" className="h-full m-0">
                    <Teams />
                </TabsContent>
            </div>
        </Tabs>
    )
}