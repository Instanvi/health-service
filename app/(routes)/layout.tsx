"use client";

import AppHeader from "@/components/sections/Header";
import { NAV_ITEMS } from "@/utils/data";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PersonalityData } from "@/types";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { getPersonality } from "@/lib/apis";
import HealthFacilityLoader from "@/utils/loader";
import Footer from "@/components/sections/Footer";

const MainLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();

  const [userFacility, setUserFacility] = useState<string | null>(null);
  const [data, setData] = useState<PersonalityData | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------
  // FETCH PERSONALITY USING COOKIE TOKEN
  // ---------------------------------------
  useEffect(() => {
    const fetchPersonality = async () => {
      const token = Cookies.get("authToken");
      if (!token) {
        router.push("/sign-in");
        return;
      }

      try {
        setLoading(true);
        const res = await getPersonality();

        setData(res);
        setUserFacility(res.facility_type);
        localStorage.setItem("userData", JSON.stringify(res));
      } catch (error: any) {
        toast.error("Error: ", error.message);
        console.log("Error: ", error.messsage)
        router.push("/sign-in");
      } finally {
        setLoading(false);
      }
    };

    fetchPersonality();
  }, [router]);



  // Filter nav items by role
  const filteredNavItems = useMemo(() => {
    if (userFacility === "health_center") {
      return NAV_ITEMS.filter(item =>
        !["facilities", "settings"].includes(item.id)
      );

    }
    return NAV_ITEMS;
  }, [userFacility]);




  if (!data || !userFacility) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader
        navItems={filteredNavItems}
        email={data?.email?.[0] || "user@example.com"}
        userName={`${data?.first_name} ${data?.last_name}`}
        role={data?.role.name}
      />
      <main className="min-h-screen pl-20">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;