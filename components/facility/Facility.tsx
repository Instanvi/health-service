"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/GoogleMapsProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "../PatientsTable";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
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
import { Check, ChevronsUpDown, MapPin } from "lucide-react";

import { useCreateFacility, useGetFacilities } from "./hooks/useFacility";
import { useQueryClient } from "@tanstack/react-query";
import { FacilityPayload } from "./types"; // Ensure this imports the updated interface
import { UserData } from "@/payload";

// --- MAP CONFIGURATION ---
const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "400px",
  borderRadius: "8px",
};

// Default center (e.g., Yaoundé, Cameroon)
const defaultCenter = {
  lat: 3.848,
  lng: 11.5021,
};

export default function Facility() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFacilitySheetOpen, setIsFacilitySheetOpen] = useState(false);

  // Google Maps Loader
  const { isLoaded } = useGoogleMaps();

  const mapRef = useRef<google.maps.Map | null>(null);

  // Top dropdown (table view)
  const [parentPopoverOpen, setParentPopoverOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  // Form dropdown (optional override)
  const [formParentPopoverOpen, setFormParentPopoverOpen] = useState(false);
  const [formSelectedParentId, setFormSelectedParentId] = useState<string | null>(null);

  // Form state matching new JSON structure
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone1: "",
    phone2: "",
    facility_type: "health_center" as FacilityPayload["facility_type"],
    location: {
      country: "",
      city: "",
      address: "",
      longitude: defaultCenter.lng,
      latitude: defaultCenter.lat,
    },
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Current user
  const userDataString = localStorage.getItem("userData");
  const personel: UserData = userDataString ? JSON.parse(userDataString) : null;
  const currentUserFacilityId = personel?.facility.id;

  // Set default parent on load
  useEffect(() => {
    if (currentUserFacilityId && !selectedParentId) {
      setSelectedParentId(currentUserFacilityId);
    }
  }, [currentUserFacilityId, selectedParentId]);

  // Fetch facilities
  const { data, isLoading: isFetching } = useGetFacilities(selectedParentId);
  const createFacilityMutation = useCreateFacility();
  const queryClient = useQueryClient();

  const handleBlur = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = {
    name: touched.name && !form.name ? "Facility name is required" : "",
    email: touched.email && !form.email ? "Email is required" : "",
    phone1: touched.phone1 && !form.phone1 ? "Phone number is required" : "",
    address: touched.address && !form.location.address ? "Address is required" : "",
    city: touched.city && !form.location.city ? "City is required" : "",
    country: touched.country && !form.location.country ? "Country is required" : "",
  };

  const hasError =
    !form.name ||
    !form.email ||
    !form.phone1 ||
    !form.location.address ||
    !form.location.city ||
    !form.location.country;

  // --- GOOGLE MAPS HANDLERS ---

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  /**
   * Handles clicking on the map to reverse geocode the coordinates
   * and fill the address form fields.
   */
  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    // Update coordinates immediately
    setForm((prev) => ({
      ...prev,
      location: { ...prev.location, latitude: lat, longitude: lng },
    }));

    // Reverse Geocoding
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const addressComponents = results[0].address_components;
        let city = "";
        let country = "";
        let streetNumber = "";
        let route = "";

        addressComponents.forEach((component) => {
          const types = component.types;
          if (types.includes("country")) {
            country = component.long_name;
          }
          if (types.includes("locality") || types.includes("administrative_area_level_1")) {
            // Prefer locality, fallback to admin area if locality missing
            if (!city || types.includes("locality")) city = component.long_name;
          }
          if (types.includes("route")) {
            route = component.long_name;
          }
          if (types.includes("street_number")) {
            streetNumber = component.long_name;
          }
        });

        const formattedAddress =
          streetNumber && route
            ? `${streetNumber} ${route}`
            : results[0].formatted_address;

        setForm((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            country: country || prev.location.country,
            city: city || prev.location.city,
            address: formattedAddress || prev.location.address,
            latitude: lat,
            longitude: lng,
          },
        }));

        toast.success("Location updated from map");
      } else {
        toast.error("Could not fetch address details for this location");
      }
    });
  };

  // --- FORM SUBMISSION ---

  const handleCreateFacility = async () => {
    setTouched({
      name: true,
      email: true,
      phone1: true,
      address: true,
      city: true,
      country: true,
    });

    if (hasError) {
      toast.error("Please fill all required fields");
      return;
    }

    const parentIdToUse =
      formSelectedParentId || selectedParentId || currentUserFacilityId;

    const payload: FacilityPayload = {
      name: form.name,
      email: [form.email],
      phone: form.phone2 ? [form.phone1, form.phone2] : [form.phone1],
      facility_type: form.facility_type,
      parent_id: parentIdToUse,
      address: {
        country: form.location.country,
        city: form.location.city,
        address: form.location.address,
        longitude: form.location.longitude,
        latitude: form.location.latitude,
      },
    };

    createFacilityMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Facility created successfully!");
        setIsFacilitySheetOpen(false);
        setForm({
          name: "",
          email: "",
          phone1: "",
          phone2: "",
          facility_type: "health_center",
          location: {
            country: "",
            city: "",
            address: "",
            longitude: defaultCenter.lng,
            latitude: defaultCenter.lat,
          },
        });
        setFormSelectedParentId(null);
        setTouched({});
        queryClient.invalidateQueries({
          queryKey: ["facilities", selectedParentId],
        });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to create facility");
      },
    });
  };

  // Filtered data for table
  const filteredFacilities =
    data?.results?.filter((f: any) =>
      Object.values(f).some((v) =>
        String(v).toLowerCase().includes(searchQuery.toLowerCase())
      )
    ) || [];

  const columns = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "facility_type", header: "Type" },
    // Handle nested location address for display if API returns updated structure, 
    // otherwise fallback to old root address
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }: any) => row.original.location?.address || row.original.address
    },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "code", header: "Code" },
  ];

  const topParentName =
    data?.results?.find(
      (f: any) => f._id === selectedParentId || f.id === selectedParentId
    )?.name || "My Facility";

  const formParentName = formSelectedParentId
    ? data?.results?.find(
      (f: any) => f._id === formSelectedParentId || f.id === formSelectedParentId
    )?.name
    : null;

  return (
    <>
      <Card className="shadow-sm border-none p-6 min-h-[60vh] bg-white rounded-sm">
        <h1 className="text-xl font-bold pb-6">Manage Facilities</h1>
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Popover open={parentPopoverOpen} onOpenChange={setParentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full sm:w-80 justify-between rounded-sm border-gray-300 h-12 px-4 text-left font-medium"
                >
                  <span className="truncate">{topParentName}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0">
                <Command>
                  <CommandInput placeholder="Search facility..." />
                  <CommandList>
                    <CommandEmpty>No facility found.</CommandEmpty>
                    <CommandGroup>
                      {data?.results?.map((facility: any) => (
                        <CommandItem
                          key={facility._id || facility.id}
                          onSelect={() => {
                            setSelectedParentId(facility._id || facility.id);
                            setParentPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${selectedParentId === (facility._id || facility.id)
                                ? "opacity-100"
                                : "opacity-0"
                              }`}
                          />
                          {facility.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedParentId && selectedParentId !== currentUserFacilityId && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedParentId(currentUserFacilityId)}
                className="h-12 w-12 shrink-0 border-gray-300 rounded-sm"
              >
                X
              </Button>
            )}
          </div>

          <div className="relative flex-1 w-full max-w-md">
            <Input
              type="search"
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 border-gray-300 rounded-sm"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          <Button
            onClick={() => setIsFacilitySheetOpen(true)}
            className="bg-[#028700] hover:bg-[#028700dd] rounded-sm h-12 px-6 w-full sm:w-auto"
          >
            <PlusIcon className="w-4 h-4 mr-2" /> Add Facility
          </Button>
        </div>

        <DataTable data={filteredFacilities} columns={columns} isLoading={isFetching} />
      </Card>

      {/* CREATE FACILITY SHEET - WIDENED FOR SPLIT VIEW */}
      <Sheet open={isFacilitySheetOpen} onOpenChange={setIsFacilitySheetOpen}>
        <SheetContent side="right" className="min-w-[100vw] md:min-w-[85vw] lg:min-w-[70vw] p-0 flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Add New Facility</SheetTitle>
            <p className="text-sm text-gray-600 mt-2">
              Create under:{" "}
              <strong className="text-[#028700]">
                {formParentName || topParentName}
              </strong>
            </p>
          </SheetHeader>

          {/* SCROLLABLE CONTENT AREA WITH SPLIT LAYOUT */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            <div className="flex flex-col lg:flex-row h-full">

              {/* LEFT SIDE: GOOGLE MAP */}
              <div className="w-full lg:w-1/2 h-[400px] lg:h-auto relative border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={{
                      lat: form.location.latitude || defaultCenter.lat,
                      lng: form.location.longitude || defaultCenter.lng,
                    }}
                    zoom={13}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    <Marker
                      position={{
                        lat: form.location.latitude,
                        lng: form.location.longitude,
                      }}
                      draggable={true}
                      onDragEnd={handleMapClick} // Update on drag end too
                    />
                  </GoogleMap>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
                    Loading Map...
                  </div>
                )}
                <div className="absolute top-4 left-4 right-4 bg-white/90 p-3 rounded shadow backdrop-blur-sm text-xs text-gray-700">
                  <MapPin className="w-4 h-4 inline-block mr-1 text-[#028700]" />
                  Click on the map or drag the marker to pinpoint the facility location.
                </div>
              </div>

              {/* RIGHT SIDE: FORM INPUTS */}
              <div className="w-full lg:w-1/2 p-6 space-y-6 bg-white">
                <h2 className="font-semibold text-lg border-b pb-2">Facility Details</h2>

                {/* NAME */}
                <div className="space-y-1">
                  <Label>Facility Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Yaoundé Central Hospital"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onBlur={() => handleBlur("name")}
                    className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] border-t-0 border-x-0 border-b-2 py-6 focus:border-[#028700] ${errors.name ? "border-b-red-500" : ""}`}
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TYPE */}
                  <div className="space-y-1">
                    <Label>Facility Type <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.facility_type}
                      onValueChange={(v) => setForm({ ...form, facility_type: v as any })}
                    >
                      <SelectTrigger className="rounded-sm bg-[#F2F7FB] border-[#D9D9D9] py-6">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="health_center">Health Center</SelectItem>
                        <SelectItem value="health_area">Health Area</SelectItem>
                        <SelectItem value="district">District Hospital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* PARENT */}
                  <div className="space-y-1">
                    <Label>Parent Facility</Label>
                    <Popover open={formParentPopoverOpen} onOpenChange={setFormParentPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between rounded-sm bg-[#F2F7FB] border-[#D9D9D9] py-6 px-4 text-left font-normal hover:bg-[#F2F7FB]"
                        >
                          <span className="truncate">{formParentName || topParentName}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search facility..." />
                          <CommandList>
                            <CommandEmpty>No facility found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setFormSelectedParentId(null);
                                  setFormParentPopoverOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formSelectedParentId === null ? "opacity-100" : "opacity-0"}`} />
                                Use: {topParentName}
                              </CommandItem>
                              <div className="my-1 border-t border-gray-200" />
                              {data?.results?.map((facility: any) => (
                                <CommandItem
                                  key={facility._id || facility.id}
                                  onSelect={() => {
                                    setFormSelectedParentId(facility._id || facility.id);
                                    setFormParentPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${formSelectedParentId === (facility._id || facility.id) ? "opacity-100" : "opacity-0"}`}
                                  />
                                  {facility.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* CONTACT INFO */}
                <div className="space-y-1">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    placeholder="contact@hospital.cm"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onBlur={() => handleBlur("email")}
                    className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] border-t-0 border-x-0 border-b-2 py-6 focus:border-[#028700] ${errors.email ? "border-b-red-500" : ""}`}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Phone 1 <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="+237 6XX..."
                      value={form.phone1}
                      onChange={(e) => setForm({ ...form, phone1: e.target.value })}
                      onBlur={() => handleBlur("phone1")}
                      className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] border-t-0 border-x-0 border-b-2 py-6 focus:border-[#028700] ${errors.phone1 ? "border-b-red-500" : ""}`}
                    />
                    {errors.phone1 && <p className="text-red-500 text-sm">{errors.phone1}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Phone 2 (Optional)</Label>
                    <Input
                      placeholder="+237..."
                      value={form.phone2}
                      onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                      className="rounded-sm bg-[#F2F7FB] border-[#D9D9D9] border-t-0 border-x-0 border-b-2 py-6 focus:border-[#028700]"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Location Details</h3>

                  {/* COUNTRY & CITY */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <Label>Country <span className="text-red-500">*</span></Label>
                      <Input
                        value={form.location.country}
                        onChange={(e) => setForm({ ...form, location: { ...form.location, country: e.target.value } })}
                        className="bg-[#F2F7FB] border-0 border-b-2 border-[#D9D9D9] focus-visible:ring-0 focus-visible:border-[#028700]"
                      />
                      {errors.country && <p className="text-red-500 text-sm">{errors.country}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label>City <span className="text-red-500">*</span></Label>
                      <Input
                        value={form.location.city}
                        onChange={(e) => setForm({ ...form, location: { ...form.location, city: e.target.value } })}
                        className="bg-[#F2F7FB] border-0 border-b-2 border-[#D9D9D9] focus-visible:ring-0 focus-visible:border-[#028700]"
                      />
                      {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
                    </div>
                  </div>

                  {/* ADDRESS */}
                  <div className="space-y-1">
                    <Label>Full Address <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g., 123 Health Road, Yaoundé"
                      value={form.location.address}
                      onChange={(e) => setForm({ ...form, location: { ...form.location, address: e.target.value } })}
                      onBlur={() => handleBlur("address")}
                      className={`rounded-sm bg-[#F2F7FB] border-[#D9D9D9] border-t-0 border-x-0 border-b-2 py-6 focus:border-[#028700] ${errors.address ? "border-b-red-500" : ""}`}
                    />
                    {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
                  </div>

                  {/* COORDS DISPLAY (Read only mostly) */}
                  <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-gray-400">
                    <div>Lat: {form.location.latitude.toFixed(6)}</div>
                    <div>Lng: {form.location.longitude.toFixed(6)}</div>
                  </div>
                </div>

                {/* SUBMIT */}
                <div className="flex justify-end pt-6 pb-10 lg:pb-0">
                  <Button
                    onClick={handleCreateFacility}
                    disabled={createFacilityMutation.isPending || hasError}
                    className="py-6 px-8 bg-[#028700] rounded-sm hover:bg-[#028700dd] w-full lg:w-auto"
                  >
                    {createFacilityMutation.isPending ? "Creating..." : "Create Facility"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}