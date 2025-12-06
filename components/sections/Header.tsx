"use client";

import { NavItem } from "@/utils/data";
import Image from "next/image";
import { FC, useState } from "react";
import { LogOut, ChevronLeft, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { UserData } from "@/payload";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  navItems: NavItem[];
  userName?: string;
  email?: string;
  role?: string;
}

const AppSidebar: FC<AppSidebarProps> = ({ navItems, userName, email, role }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const userDataString = typeof window !== 'undefined' ? localStorage.getItem('userData') : null;
  const personel: UserData = userDataString ? JSON.parse(userDataString) : null;
  const facilityType = personel?.facility_type;

  const handleSignOut = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("app:activeTab");
    document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    toast.success("Signed out successfully!");
    router.push("/sign-in");
  };

  const isActiveProfile = pathname.startsWith('/settings');

  // Filter nav items that should be displayed (exclude settings from main nav, it's in profile)
  const displayNavItems = navItems.filter(item => item.id !== 'settings');

  return (
    <div className="fixed top-0 left-0 z-40 h-screen">
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            "bg-[#037C01] h-full flex flex-col shadow-xl transition-all duration-300 ease-in-out",
            isExpanded ? "w-64" : "w-20"
          )}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -right-3 top-20 bg-white rounded-full p-1.5 shadow-lg border border-gray-200 hover:bg-gray-50 z-50"
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* Logo Section */}
          <Link
            href={facilityType === 'health_center' ? navItems[0]?.href : navItems[1]?.href}
            className={cn(
              "flex items-center justify-center py-4 cursor-pointer border-b border-green-600",
              isExpanded ? "px-4" : "px-2"
            )}
          >
            {isExpanded ? (
              <Image src="/images/logo.png" alt="logo" width={120} height={40} />
            ) : (
              <Image src="/images/min-logo.png" alt="logo" width={30} height={30} className="object-contain" />
            )}
          </Link>

          {/* Navigation Links */}
          <nav className="flex-1 flex flex-col py-4 space-y-1 px-2">
            {displayNavItems.map(item => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 w-full",
                        isActive
                          ? "bg-[#FFFFFF33] text-[#55FF18]"
                          : "text-green-100 hover:bg-[#FFFFFF33]",
                        !isExpanded && "justify-center"
                      )}
                    >
                      <Icon className="w-6 h-6 flex-shrink-0" />
                      {isExpanded && (
                        <span className="text-sm font-semibold whitespace-nowrap overflow-hidden">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {!isExpanded && (
                    <TooltipContent side="right" className="bg-gray-900 text-white rounded-md px-3 py-1.5 text-sm">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          {/* User Profile & Sign Out */}
          <div className="border-t border-green-600 p-2 space-y-2">
            {/* Settings Button (if applicable) */}
            {navItems.find(item => item.id === 'settings') && facilityType !== 'health_center' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/settings"
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 w-full",
                      isActiveProfile
                        ? "bg-[#FFFFFF33] text-[#55FF18]"
                        : "text-green-100 hover:bg-[#FFFFFF33]",
                      !isExpanded && "justify-center"
                    )}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && (
                      <div className="flex flex-col items-start text-left overflow-hidden">
                        <span className="text-sm font-semibold truncate w-full">{userName || "User"}</span>
                        <span className="text-xs text-green-200 truncate w-full">{email}</span>
                      </div>
                    )}
                  </Link>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right" className="bg-gray-900 text-white rounded-md px-3 py-1.5 text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold">{userName || "User"}</span>
                      <span className="text-xs text-gray-300">{email}</span>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            )}

            {/* Sign Out Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsSignOutOpen(true)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 w-full text-green-100 hover:bg-red-500/20 hover:text-red-300",
                    !isExpanded && "justify-center"
                  )}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && (
                    <span className="text-sm font-semibold">Sign Out</span>
                  )}
                </button>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right" className="bg-gray-900 text-white rounded-md px-3 py-1.5 text-sm">
                  Sign Out
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* Sign Out Confirmation Modal */}
          <Dialog open={isSignOutOpen} onOpenChange={setIsSignOutOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Confirm Sign Out</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center text-sm text-gray-700">
                Are you sure you want to sign out?
              </div>
              <DialogFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setIsSignOutOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </aside>
      </TooltipProvider>
    </div>
  );
};

export default AppSidebar;
