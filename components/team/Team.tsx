'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DataTable } from '../PatientsTable';
import { MagnifyingGlassIcon, PlusIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { toast } from 'sonner';
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
import { Check, ChevronsUpDown } from "lucide-react";

import {
    useTeamMembers,
    useCreateTeamMember,
    CreateUserPayload,
} from "./hooks/useTeamMembers";
import { useGetFacilities } from '../facility/hooks/useFacility';

interface CurrentUser {
    _id: string;
    username: string;
    first_name: string;
    last_name: string;
    gender: string;
    email: string[];
    phone: string[];
    facility: {
        id: string;
        name: string;
        code: string;
        facility_type: string;
    };
    role: {
        id: string;
        name: string;
    };
}

export default function Team() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isUserSheetOpen, setIsUserSheetOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>('');

    // Facility dropdown state in form
    const [facilityPopoverOpen, setFacilityPopoverOpen] = useState(false);
    const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");

    /* ——— CREATE FORM ——— */
    const [form, setForm] = useState({
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

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [showPass, setShowPass] = useState(false);
    const [showRepeat, setShowRepeat] = useState(false);

    /* ——— LOAD CURRENT USER ——— */
    useEffect(() => {
        try {
            const userData = localStorage.getItem("userData");
            if (userData) {
                const parsed = JSON.parse(userData);
                setCurrentUser(parsed);
                // Auto-select current user's facility
                setSelectedFacilityId(parsed.facility.id);
            }
        } catch {
            toast.error("Corrupted user data");
        }
    }, []);

    /* ——— FETCH FACILITIES (for dropdown) ——— */
    // Use current user's facility as parent to get children (or all if root)
    const { data: facilitiesData, isLoading: loadingFacilities } = useGetFacilities(
        currentUser?.facility?.id
    );

    /* ——— QUERY: GET TEAM MEMBERS ——— */
    const { data: teamMembers, isLoading: loadingMembers } = useTeamMembers();

    /* ——— MUTATION: CREATE USER ——— */
    const createMutation = useCreateTeamMember();

    /* ——— HANDLE CREATE USER ——— */
    const handleCreateUser = async () => {
        setTouched({
            username: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            password: true,
            repeatPassword: true,
        });

        if (hasError) return toast.error("Please fix the errors");

        const selectedFacility = facilitiesData?.results?.find(
            (f: any) => f._id === selectedFacilityId || f.id === selectedFacilityId
        );

        if (!selectedFacility) return toast.error("Please select a valid facility");

        const payload: CreateUserPayload = {
            username: form.username,
            password: form.password,
            first_name: form.first_name,
            last_name: form.last_name,
            gender: form.gender,
            email: [form.email],
            phone: form.phone2 ? [form.phone, form.phone2] : [form.phone],
            role_id: currentUser?.role.id,
            facility_type: selectedFacility.facility_type,
            facility_id: selectedFacility._id,
        };

        createMutation.mutate(payload, {
            onSuccess: () => {
                toast.success("Team member created successfully!");
                setIsUserSheetOpen(false);
                setForm({
                    username: "", first_name: "", last_name: "", gender: "male",
                    email: "", phone: "", phone2: "", password: "", repeatPassword: ""
                });
                setTouched({});
            },
            onError: (err: any) => {
                toast.error(err.message || "Failed to create user");
            },
        });
    };

    /* ——— VALIDATION ——— */
    const handleBlur = (field: string) =>
        setTouched((prev) => ({ ...prev, [field]: true }));

    const errors = {
        username: touched.username && !form.username ? "Username required" : "",
        first_name: touched.first_name && !form.first_name ? "First name required" : "",
        last_name: touched.last_name && !form.last_name ? "Last name required" : "",
        email: touched.email && !form.email ? "Email required" : "",
        phone: touched.phone && !form.phone ? "Phone required" : "",
        password: touched.password && (form.password.length < 6) ? "Min 6 characters" : "",
        repeatPassword: touched.repeatPassword && form.password !== form.repeatPassword ? "Passwords do not match" : "",
    };

    const hasError = Object.values(errors).some(Boolean) || form.password !== form.repeatPassword;

    /* ——— TABLE DATA ——— */
    const tableUsers = teamMembers?.map((u: any) => ({
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email?.[0],
        phone: u.phone?.[0],
        gender: u.gender,
        code: u.code
    })) ?? [];

    const filteredUsers = tableUsers.filter((p: any) =>
        `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        { accessorKey: "username", header: "Username" },
        { accessorKey: "firstName", header: "First Name" },
        { accessorKey: "lastName", header: "Last Name" },
        { accessorKey: "email", header: "Email" },
        { accessorKey: "phone", header: "Phone" },
        { accessorKey: "gender", header: "Gender" },
        { accessorKey: "code", header: "Code" },
    ];

    // Get selected facility name for display
    const selectedFacilityName = facilitiesData?.results?.find(
        (f: any) => f._id === selectedFacilityId || f.id === selectedFacilityId
    )?.name || "Loading...";

    return (
        <>
            {/* Main Table */}
            <Card className="shadow-sm border-none p-6 min-h-[60vh] bg-white rounded-sm">
                <h1 className="text-xl font-bold pb-6">Manage Team Members</h1>

                <div className="flex justify-between items-center mb-6">
                    <div className="relative">
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 w-[400] border-gray-300 rounded-sm"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>

                    <Button
                        onClick={() => setIsUserSheetOpen(true)}
                        className="bg-[#028700] hover:bg-[#028700dd] rounded-sm h-12 px-6 w-full sm:w-auto"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" /> Add Team Member
                    </Button>
                </div>

                <DataTable data={filteredUsers} columns={columns} isLoading={loadingMembers} />
            </Card>

            {/* CREATE USER SHEET */}
            <Sheet open={isUserSheetOpen} onOpenChange={setIsUserSheetOpen}>
                <SheetContent side="right" className="min-w-[40vw] h-screen overflow-auto p-0">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle>Create New Team Member</SheetTitle>
                    </SheetHeader>

                    <div className="p-6 space-y-6 overflow-y-auto h-full">
                        {/* === Facility Dropdown (New) === */}
                        <div className="space-y-1">
                            <Label>Assign to Facility <span className="text-red-500">*</span></Label>
                            <Popover open={facilityPopoverOpen} onOpenChange={setFacilityPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between rounded-sm bg-[#F2F7FB] border-[#D9D9D9] py-6 px-4 text-left font-normal hover:bg-[#F2F7FB] focus:border-[#028700]"
                                    >
                                        {selectedFacilityName}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search facility..." className="h-10" />
                                        <CommandList>
                                            {loadingFacilities ? (
                                                <CommandEmpty>Loading facilities...</CommandEmpty>
                                            ) : !facilitiesData?.results?.length ? (
                                                <CommandEmpty>No facilities found.</CommandEmpty>
                                            ) : (
                                                <CommandGroup>
                                                    {facilitiesData.results.map((facility: any) => (
                                                        <CommandItem
                                                            key={facility._id || facility.id}
                                                            value={facility.name}
                                                            onSelect={() => {
                                                                setSelectedFacilityId(facility._id || facility.id);
                                                                setFacilityPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${selectedFacilityId === (facility._id || facility.id)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                                    }`}
                                                            />
                                                            {facility.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Label>Username <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="martin123"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    onBlur={() => handleBlur('username')}
                                    className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none ${errors.username ? 'border-b-red-500 focus:border-red-500' : 'focus:border-[#028700]'}`}
                                />
                                {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>First Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Martin"
                                        value={form.first_name}
                                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                        onBlur={() => handleBlur('first_name')}
                                        className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none ${errors.first_name ? 'border-b-red-500 focus:border-red-500' : 'focus:border-[#028700]'}`}
                                    />
                                    {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label>Last Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Fall"
                                        value={form.last_name}
                                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                        onBlur={() => handleBlur('last_name')}
                                        className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none ${errors.last_name ? 'border-b-red-500 focus:border-red-500' : 'focus:border-[#028700]'}`}
                                    />
                                    {errors.last_name && <p className="text-red-500 text-sm">{errors.last_name}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>Gender</Label>
                                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as 'male' | 'female' })}>
                                    <SelectTrigger className="rounded-sm bg-[#F2F7FB] border-[#D9D9D9] py-6">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label>Email <span className="text-red-500">*</span></Label>
                                <Input
                                    type="email"
                                    placeholder="martin@hospital.cm"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    onBlur={() => handleBlur('email')}
                                    className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none ${errors.email ? 'border-b-red-500 focus:border-red-500' : 'focus:border-[#028700]'}`}
                                />
                                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Phone Number <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="+237 6XX XXX XXX"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        onBlur={() => handleBlur('phone')}
                                        className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none ${errors.phone ? 'border-b-red-500 focus:border-red-500' : 'focus:border-[#028700]'}`}
                                    />
                                    {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label>Phone 2 (optional)</Label>
                                    <Input
                                        placeholder="+237 ..."
                                        value={form.phone2}
                                        onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                                        className="rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none focus:border-[#028700]"
                                    />
                                </div>
                            </div>

                            {/* <div className="space-y-1">
                                <Label>Role <span className="text-red-500">*</span></Label>
                                <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
                                    <SelectTrigger onBlur={() => handleBlur('role_id')} className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] py-6 ${errors.role_id ? 'border-b-red-500' : ''}`}>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="6917076591f780f5f89c2351">Administrator</SelectItem>
                                        <SelectItem value="role-doctor-id">Doctor</SelectItem>
                                        <SelectItem value="role-nurse-id">Nurse</SelectItem>
                                        <SelectItem value="role-lab-id">Lab Technician</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role_id && <p className="text-red-500 text-sm">{errors.role_id}</p>}
                            </div> */}

                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-4 text-center">Security</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Password <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <Input
                                                type={showPass ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={form.password}
                                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                onBlur={() => handleBlur('password')}
                                                className={`pr-12 rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none ${errors.password ? 'border-b-red-500 focus:border-red-500' : 'focus:border-[#028700]'}`}
                                            />
                                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {showPass ? <EyeSlashIcon size={24} /> : <EyeIcon size={24} />}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Repeat Password</Label>
                                        <div className="relative">
                                            <Input
                                                type={showRepeat ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={form.repeatPassword}
                                                onChange={(e) => setForm({ ...form, repeatPassword: e.target.value })}
                                                onBlur={() => handleBlur('repeatPassword')}
                                                className={`pr-12 rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 active:border-b-2 border-b-2 shadow-none py-6 focus:outline-none ${errors.repeatPassword ? 'border-b-red-500 focus:border-red-500' : 'focus:border-[#028700]'}`}
                                            />
                                            <button type="button" onClick={() => setShowRepeat(!showRepeat)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {showRepeat ? <EyeSlashIcon size={24} /> : <EyeIcon size={24} />}
                                            </button>
                                        </div>
                                        {errors.repeatPassword && <p className="text-red-500 text-sm">{errors.repeatPassword}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6">
                                <Button
                                    onClick={handleCreateUser}
                                    disabled={loadingMembers || hasError}
                                    className="py-6 px-8 bg-[#028700] rounded-sm hover:bg-[#028700dd] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingMembers ? "Creating User..." : "Create Team Member"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}