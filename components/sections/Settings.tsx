'use client';

import React, { useEffect, useState } from 'react';
import {
    Hospital,
} from 'lucide-react';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { notification } from '@/data';
import {
    BellIcon,
    UserIcon,
    UsersIcon,
    ShieldIcon,
    FileIcon,
    HospitalIcon,
} from "@phosphor-icons/react";
import Cookies from "js-cookie";
import { toast } from 'sonner';
import Security from '../Security';
import Team from '../team/Team';
import Facility from '../facility/Facility';
import { useConnectDHIS2 } from '@/hooks/useDHIS2';

export default function Settings() {
    const [activeMenu, setActiveMenu] = useState('Notifications');
    const [profile, setProfile] = useState<any>({});

    // DHIS2 State & Mutation
    const [dhisUsername, setDhisUsername] = useState('');
    const [dhisPassword, setDhisPassword] = useState('');
    const { mutate: connectDHIS, isPending: isConnecting } = useConnectDHIS2();

    const handleDHISConnect = () => {
        if (!dhisUsername || !dhisPassword) {
            toast.error("Please enter both username and password");
            return;
        }
        connectDHIS({ username: dhisUsername, password: dhisPassword }, {
            onSuccess: () => {
                toast.success("Successfully connected to DHIS2");
            },
            onError: (error) => {
                toast.error(error.message);
            }
        });
    };

    // Fetch profile
    useEffect(() => {
        const fetchProfile = async () => {
            const token = Cookies.get("authToken");
            if (!token) return toast.error("Please log in");

            try {
                const res = await fetch('http://173.249.30.54/dappa/personality/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setProfile(data.data || data);
            } catch (err) {
                // toast.error("Session expired");
                console.error("Error: ", err)
                // Cookies.remove("authToken");
                // window.location.href = "/sign-in";
            }
        };
        fetchProfile();
    }, []);


    const menuItems = [
        { id: 'Notifications', label: 'Notifications', icon: BellIcon },
        { id: 'Profile', label: 'Profile', icon: UserIcon },
        { id: 'Facility', label: 'Facility', icon: Hospital },
        { id: 'Team', label: 'Team', icon: UsersIcon },
        { id: 'Security', label: 'Security', icon: ShieldIcon },
        { id: 'DHIS2', label: 'DHIS2', icon: HospitalIcon },
        { id: 'Terms', label: 'Terms of Service', icon: FileIcon },
    ];



    return (
        <div className="min-h-screen max-w-[100vw] bg-gray-50 flex">
            {/* SIDEBAR - unchanged */}
            <aside className="w-64 bg-gray-50 pt-5">
                <NavigationMenu orientation="vertical" className="[&>div>svg]:hidden">
                    <NavigationMenuList className="flex flex-col space-y-0 pt-5">
                        {menuItems.map((item) => (
                            <NavigationMenuItem key={item.id} className="w-full">
                                <button
                                    onClick={() => setActiveMenu(item.id)}
                                    className={`w-full flex items-center justify-start px-4 py-2 rounded-md text-left font-medium transition-colors ${activeMenu === item.id
                                        ? 'bg-[#C2E7FF] rounded-sm rounded-r-full'
                                        : 'hover:bg-gray-50 rounded-r-full'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.label}
                                </button>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 pt-5 bg-gray-50">
                <div className="p-8 px-12 bg-gray-50 space-y-4 min-h-[94vh]">
                    {/* Notifications, Profile, Security, Terms - unchanged */}
                    {activeMenu === 'Notifications' && (
                        <div>
                            <Card className="shadow-sm max-w-4xl mx-auto border-none rounded-sm p-4">
                                <h1 className="text-xl font-semibold mb-6">Notifications</h1>
                                <Separator className='bg-gray-50' />
                                <CardContent className="p-6 space-y-5">
                                    <div className="space-y-4 flex flex-col gap-4">
                                        {notification.map((notif, i) => (
                                            <div key={i} className="bg-white p-4 rounded border">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">{notif.title}</h3>
                                                        <p className="text-sm text-gray-500 mt-1">{notif.content}</p>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{notif.date}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeMenu === 'Profile' && (
                        <div className='mx-auto'>
                            <Card className="shadow-sm max-w-3xl mx-auto border-none rounded-sm p-4">
                                <h1 className="text-xl font-bold pb-6 border-b border-gray-50">Profile Details</h1>
                                <CardContent className="p-6 space-y-5">
                                    {[
                                        { label: 'First Name', value: profile?.first_name },
                                        { label: 'Last Name', value: profile?.last_name },
                                        { label: 'Tel 1', value: profile?.phone?.[0] },
                                        { label: 'Tel 2 (optional)', value: profile?.phone?.[1] || '-' },
                                        { label: 'Email', value: profile?.email?.[0] },
                                        { label: 'Role', value: profile?.role?.name },
                                        { label: 'Institution', value: profile?.facility?.name },
                                    ].map((f) => (
                                        <div key={f.label}>
                                            <Label className="text-sm font-medium">{f.label}</Label>
                                            <Input value={f.value || ''} readOnly className="rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 border-b-2 focus:border-[#028700] shadow-none py-6" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeMenu === 'Facility' && (
                        <Facility />
                    )}

                    {activeMenu === 'Team' && (
                        <Team />
                    )}

                    {/* SECURITY & TERMS remain 100% unchanged */}
                    {activeMenu === 'Security' && (
                        <Security />
                    )}

                    {activeMenu === 'Terms' && (
                        <div>
                            <Card className="shadow-sm max-w-4xl p-6 rounded-sm  border-none mx-auto">
                                <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
                                <Separator className='bg-gray-50' />
                                <CardContent className="p-6 text-sm text-gray-600 leading-relaxed space-y-4">
                                    <p>
                                        Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.
                                    </p>
                                    <p>
                                        Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.
                                    </p>
                                    <p>
                                        Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeMenu === 'DHIS2' && (
                        <div className="mx-auto">
                            <Card className="shadow-sm max-w-3xl mx-auto border-none rounded-sm p-4">
                                <h1 className="text-xl font-bold pb-6 border-b border-gray-50">DHIS2 Configuration</h1>
                                <CardContent className="p-6 space-y-5">
                                    <div>
                                        <Label className="text-sm font-medium">Username</Label>
                                        <Input
                                            type="text"
                                            value={dhisUsername}
                                            onChange={(e) => setDhisUsername(e.target.value)}
                                            placeholder="Enter your DHIS2 username"
                                            className="rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 border-b-2 focus:border-[#028700] shadow-none py-6"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Password</Label>
                                        <Input
                                            type="password"
                                            value={dhisPassword}
                                            onChange={(e) => setDhisPassword(e.target.value)}
                                            placeholder="Enter your DHIS2 password"
                                            className="rounded-sm bg-[#F2F7FB] border-[#D9D9D9] outline-none border-t-0 border-x-0 border-b-2 focus:border-[#028700] shadow-none py-6"
                                        />
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={handleDHISConnect}
                                            disabled={isConnecting}
                                            className="bg-[#028700] hover:bg-[#026e00] text-white"
                                        >
                                            {isConnecting ? "Connecting..." : "Connect to DHIS2"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>


        </div>
    );
}