"use client";

import { Radio } from "lucide-react";
import { MapPinSimpleAreaIcon, MegaphoneIcon, UsersThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        {
            id: "live",
            label: "Live",
            href: "/field/live",
            icon: Radio,
            iconClassName: "mr-3 h-5 w-5 text-[#D0BEBE] group-hover:text-green-500",
            activeIconClassName: "text-green-500",
        },
        {
            id: "campaigns",
            label: "Campaigns",
            href: "/field/campaigns",
            icon: MegaphoneIcon,
            iconClassName: "mr-3 h-5 w-5 transform scale-x-[-1] text-[#D0BEBE] group-hover:text-green-500",
            activeIconClassName: "text-green-500",
        },
        {
            id: "zones",
            label: "Zones",
            href: "/field/zones",
            icon: MapPinSimpleAreaIcon,
            iconClassName: "mr-3 h-5 w-5 text-[#D0BEBE] group-hover:text-green-500",
            activeIconClassName: "text-green-500",
        },
        {
            id: "teams",
            label: "Teams",
            href: "/field/teams",
            icon: UsersThreeIcon,
            iconClassName: "mr-3 h-5 w-5 text-[#D0BEBE] group-hover:text-green-500",
            activeIconClassName: "text-green-500",
        },
    ];

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-gray-50 border-r border-gray-100">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Field</h1>
                </div>

                <nav className="flex flex-col w-full">
                    {tabs.map((tab) => {
                        const isActive = pathname.startsWith(tab.href);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={cn(
                                    "group flex items-center w-full px-6 py-4 transition-colors hover:bg-gray-100",
                                    isActive && "bg-gray-100"
                                )}
                            >
                                <Icon
                                    className={cn(
                                        tab.iconClassName,
                                        isActive && tab.activeIconClassName
                                    )}
                                />
                                <span
                                    className={cn(
                                        "font-medium text-gray-600 group-hover:text-green-500",
                                        isActive && "text-green-500"
                                    )}
                                >
                                    {tab.label}
                                </span>
                                {isActive && tab.id === "live" && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-green-500"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}
