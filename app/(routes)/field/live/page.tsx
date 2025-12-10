"use client";

import { Live } from "@/components/field/Live";
import { useState } from "react";

export default function LivePage() {
    const [selectedCampaign, setSelectedCampaign] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedDate, setSelectedDate] = useState("today");

    return (
        <div className="h-full m-0">
            <Live
                selectedCampaign={selectedCampaign}
                setSelectedCampaign={setSelectedCampaign}
                selectedZone={selectedZone}
                setSelectedZone={setSelectedZone}
                selectedTeam={selectedTeam}
                setSelectedTeam={setSelectedTeam}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
            />
        </div>
    );
}
