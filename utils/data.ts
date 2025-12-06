import { FileText, ClipboardList, MapPin, Settings as SettingsIcon, LucideIcon } from "lucide-react";
import { CalendarBlankIcon, GaugeIcon, GraphIcon, HospitalIcon, NavigationArrowIcon } from "@phosphor-icons/react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Settings', href: '/settings', icon: SettingsIcon },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: GaugeIcon },
  { id: 'data_entries', label: 'Data Entries', href: '/data_entries', icon: CalendarBlankIcon },
  { id: 'facilities', label: 'Facilities', href: '/facilities', icon: HospitalIcon },
  { id: 'reports', label: 'Reports', href: '/reports', icon: ClipboardList },
  { id: 'area_status', label: 'Area Status', href: '/area_status', icon: NavigationArrowIcon },
  { id: 'field', label: 'Field', href: '/field', icon: GraphIcon },
];

export const DataEntriesId = NAV_ITEMS[2].id;
export const DATA_ENTRIES_TAB_ID = "data_entries";
export const FACILITIES_TAB_ID = "facilities";