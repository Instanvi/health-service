"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { format, startOfYear, addYears, startOfMonth, addMonths, startOfWeek, addWeeks, addDays, isSameDay, endOfWeek, endOfMonth, endOfYear, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetDiseaseStats, DiseaseReportItem as ApiDiseaseItem, StatsParams } from '@/hooks/docs/useGetDeasease';
import { Download } from 'lucide-react';
import { exportHTMLToPDF } from '@/utils/pdfExport';
import DiseaseReportTemplate from '@/components/pdf/DiseaseReportTemplate';
import { SelectionSheet } from "@/components/ui/selection-sheet";
import { useGetFacilitiesInfinite } from "@/components/facility/hooks/useFacility";
import { useSendWeeklyReport } from "@/hooks/useDHIS2";
import { Upload, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// --- MOCK DATA & CONFIGURATION ---

const View = {
  DAY: 'Day',
  WEEK: 'Week',
  MONTH: 'Month',
  YEAR: 'Year',
} as const;

type ViewType = typeof View[keyof typeof View];

interface TimeUnit {
  id: string;
  date: Date;
  label: string;
  value: string;
  isToday: boolean;
}

type AgeGroupData = {
  '0-14': { m: string; f: string };
  '15-24': { m: string; f: string };
  '25-64': { m: string; f: string };
  '65+': { m: string; f: string };
};

interface DiseaseRow {
  id: number;
  name: string;
  isNotifiable: boolean;
  suspected: AgeGroupData;
  deaths: AgeGroupData;
  samples: string;
  confirmed: string;
}


// --- Time Unit Item Component ---
const TimeUnitItem = ({ label, value, isSelected }: { label: string; value: string; isSelected: boolean }) => (
  <div className="flex flex-col items-center relative">
    <div className="text-xs font-semibold text-gray-500 mb-1">
      {label}
    </div>
    <div
      className="w-8 h-8 p-7 px-7 flex items-center justify-center text-sm font-bold text-white rounded-md bg-blue-600 shadow-sm"
    >
      {value}
    </div>
    {isSelected && (
      <div className="w-7 h-1 bg-blue-800 rounded-full mt-1 absolute -bottom-2"></div>
    )}
  </div>
);

// List of known notifiable diseases
const NOTIFIABLE_DISEASES = [
  'Chikungunya', 'Cholera', 'Dengue Fever', 'Dracunculiasis (Guinea worm)',
  'Diphteria', 'Anthrax', 'Typhoid Fever', 'Yellow Fever', 'Meningitis',
  'Rabies', 'Acute Flaccid paralysis', 'Plague', 'Measles', 'COVID -19',
  'Neonatal Tetanus', 'MPox (Monkey Pox)', 'Small Pox'
];

// 🚀 Main Application Component
export default function ReportsContent() {
  const [baseDate, setBaseDate] = useState<Date>(new Date('2023-06-01'));


  // DHIS2 Integration
  const [isDhisSheetOpen, setIsDhisSheetOpen] = useState(false);
  const [dhisSearch, setDhisSearch] = useState("");

  // Get User Facility ID
  const [userFacilityId, setUserFacilityId] = useState<string>("");

  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserFacilityId(user?.facility?.id || "");
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, []);

  const {
    data: facilitiesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingFacilities
  } = useGetFacilitiesInfinite(userFacilityId);

  const { mutate: sendDhisReport, isPending: isSendingDhis } = useSendWeeklyReport();

  const [activeView, setActiveView] = useState<ViewType>(View.DAY);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(format(baseDate, 'yyyy-MM-dd'));

  // Generate units based on activeView
  const units = useMemo<TimeUnit[]>(() => {
    let generatedUnits: TimeUnit[] = [];

    switch (activeView) {
      case View.DAY:
        const startDay = addDays(baseDate, -4);
        for (let i = 0; i < 10; i++) {
          const day = addDays(startDay, i);
          generatedUnits.push({
            id: format(day, 'yyyy-MM-dd'),
            date: day,
            label: format(day, 'EEE').charAt(0),
            value: format(day, 'd'),
            isToday: isSameDay(day, new Date()),
          });
        }
        break;
      case View.WEEK:
        const startWeek = startOfWeek(addWeeks(baseDate, -4), { weekStartsOn: 1 });
        for (let i = 0; i < 10; i++) {
          const weekStart = addWeeks(startWeek, i);
          generatedUnits.push({
            id: format(weekStart, 'yyyy-ww'),
            date: weekStart,
            label: `W${format(weekStart, 'w')}`,
            value: format(weekStart, 'w'),
            isToday: isSameWeek(weekStart, new Date(), { weekStartsOn: 1 }),
          });
        }
        break;
      case View.MONTH:
        const startMonth = startOfMonth(addMonths(baseDate, -4));
        for (let i = 0; i < 10; i++) {
          const month = addMonths(startMonth, i);
          generatedUnits.push({
            id: format(month, 'yyyy-MM'),
            date: month,
            label: format(month, 'MMM'),
            value: format(month, 'M'),
            isToday: isSameMonth(month, new Date()),
          });
        }
        break;
      case View.YEAR:
        const startYr = startOfYear(addYears(baseDate, -2));
        for (let i = 0; i < 5; i++) {
          const year = addYears(startYr, i);
          generatedUnits.push({
            id: format(year, 'yyyy'),
            date: year,
            label: '',
            value: format(year, 'yyyy'),
            isToday: isSameYear(year, new Date()),
          });
        }
        break;
      default:
        break;
    }
    return generatedUnits;
  }, [activeView, baseDate]);

  // Reset selected unit when view changes
  useEffect(() => {
    let todayId: string;
    switch (activeView) {
      case View.DAY:
        todayId = format(baseDate, 'yyyy-MM-dd');
        break;
      case View.WEEK:
        const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
        todayId = format(weekStart, 'yyyy-ww');
        break;
      case View.MONTH:
        todayId = format(startOfMonth(baseDate), 'yyyy-MM');
        break;
      case View.YEAR:
        todayId = format(baseDate, 'yyyy');
        break;
      default:
        todayId = units[0]?.id || '';
    }
    setSelectedUnitId(todayId);
  }, [activeView, baseDate]);

  const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId), [units, selectedUnitId]);

  const [startRange, endRange] = useMemo(() => {
    if (!selectedUnit) return [null, null] as [Date | null, Date | null];
    const d = selectedUnit.date;
    switch (activeView) {
      case View.DAY:
        return [d, d];
      case View.WEEK:
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        return [weekStart, weekEnd];
      case View.MONTH:
        const monthStart = startOfMonth(d);
        const monthEnd = endOfMonth(monthStart);
        return [monthStart, monthEnd];
      case View.YEAR:
        const yearStart = startOfYear(d);
        const yearEnd = endOfYear(yearStart);
        return [yearStart, yearEnd];
      default:
        return [null, null];
    }
  }, [selectedUnit, activeView]);

  // Fetch disease statistics from API
  const statsParams: StatsParams = useMemo(() => ({
    granularity: (activeView === View.DAY ? 'daily' :
      activeView === View.WEEK ? 'weekly' :
        activeView === View.MONTH ? 'monthly' : 'yearly') as 'daily' | 'weekly' | 'monthly' | 'yearly',
    start_date: startRange ? format(startRange, 'yyyy-MM-dd') : undefined,
    end_date: endRange ? format(endRange, 'yyyy-MM-dd') : undefined,
  }), [activeView, startRange, endRange]);

  const { data: apiDiseaseData, isLoading, error } = useGetDiseaseStats(statsParams);

  // Error handling
  React.useEffect(() => {
    if (error) toast.error("Error fetching disease reports");
  }, [error]);

  // Map API data to table format
  const reports = useMemo<DiseaseRow[]>(() => {
    if (!apiDiseaseData) return [];

    return apiDiseaseData.map((item: ApiDiseaseItem, index: number) => {
      const getVal = (obj: any, key: string, field: 'm' | 'f') => {
        // console.log(`Getting ${key}.${field}:`, obj?.[key]?.[field]);
        return obj?.[key]?.[field]?.toString() || '0';
      };

      if (item.disease.includes('Cholera')) {
        console.log('Cholera Item:', item);
        console.log('Suspected 25_64:', item.suspected_cases?.['25_64']);
      }

      return {
        id: index + 1,
        name: item.disease,
        isNotifiable: NOTIFIABLE_DISEASES.includes(item.disease),
        suspected: {
          '0-14': { m: getVal(item.suspected_cases, '0_14', 'm'), f: getVal(item.suspected_cases, '0_14', 'f') },
          '15-24': { m: getVal(item.suspected_cases, '15_24', 'm'), f: getVal(item.suspected_cases, '15_24', 'f') },
          '25-64': { m: getVal(item.suspected_cases, '25_64', 'm'), f: getVal(item.suspected_cases, '25_64', 'f') },
          '65+': { m: getVal(item.suspected_cases, '65_plus', 'm'), f: getVal(item.suspected_cases, '65_plus', 'f') },
        },
        deaths: {
          '0-14': { m: getVal(item.deaths, '0_14', 'm'), f: getVal(item.deaths, '0_14', 'f') },
          '15-24': { m: getVal(item.deaths, '15_24', 'm'), f: getVal(item.deaths, '15_24', 'f') },
          '25-64': { m: getVal(item.deaths, '25_64', 'm'), f: getVal(item.deaths, '25_64', 'f') },
          '65+': { m: getVal(item.deaths, '65_plus', 'm'), f: getVal(item.deaths, '65_plus', 'f') },
        },
        samples: item.sample_cases?.toString() || '0',
        confirmed: item.confirmed_cases?.toString() || '0',
      };
    });
  }, [apiDiseaseData]);

  const filteredReports = useMemo(() => reports, [reports]);

  const handleUnitClick = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    if (unit) {
      setBaseDate(unit.date);
    }
    setSelectedUnitId(unitId);
  };

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
  };

  // Export handlers
  const handleExportExcel = () => {
    const filename = `Disease_Report_${activeView}_${format(new Date(), 'yyyy-MM-dd')}`;
    const exportData = filteredReports.map(row => ({
      No: row.id.toString().padStart(2, '0'),
      Disease: row.name,
      'Suspected_0-14_M': row.suspected['0-14'].m,
      'Suspected_0-14_F': row.suspected['0-14'].f,
      'Suspected_15-24_M': row.suspected['15-24'].m,
      'Suspected_15-24_F': row.suspected['15-24'].f,
      'Suspected_25-64_M': row.suspected['25-64'].m,
      'Suspected_25-64_F': row.suspected['25-64'].f,
      'Suspected_65+_M': row.suspected['65+'].m,
      'Suspected_65+_F': row.suspected['65+'].f,
      'Deaths_0-14_M': row.deaths['0-14'].m,
      'Deaths_0-14_F': row.deaths['0-14'].f,
      'Deaths_15-24_M': row.deaths['15-24'].m,
      'Deaths_15-24_F': row.deaths['15-24'].f,
      'Deaths_25-64_M': row.deaths['25-64'].m,
      'Deaths_25-64_F': row.deaths['25-64'].f,
      'Deaths_65+_M': row.deaths['65+'].m,
      'Deaths_65+_F': row.deaths['65+'].f,
      Sample_Cases: row.samples,
      Confirmed: row.confirmed,
    }));

    // Simple Excel export without using the column system
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Disease Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Excel exported!');
  };

  const handleExportCSV = () => {
    const filename = `Disease_Report_${activeView}_${format(new Date(), 'yyyy-MM-dd')}`;
    const headers = ['No', 'Disease', 'Suspected_0-14_M', 'Suspected_0-14_F', 'Suspected_15-24_M', 'Suspected_15-24_F', 'Suspected_25-64_M', 'Suspected_25-64_F', 'Suspected_65+_M', 'Suspected_65+_F', 'Deaths_0-14_M', 'Deaths_0-14_F', 'Deaths_15-24_M', 'Deaths_15-24_F', 'Deaths_25-64_M', 'Deaths_25-64_F', 'Deaths_65+_M', 'Deaths_65+_F', 'Sample_Cases', 'Confirmed'];
    const rows = filteredReports.map(row => [
      row.id.toString().padStart(2, '0'),
      row.name,
      row.suspected['0-14'].m,
      row.suspected['0-14'].f,
      row.suspected['15-24'].m,
      row.suspected['15-24'].f,
      row.suspected['25-64'].m,
      row.suspected['25-64'].f,
      row.suspected['65+'].m,
      row.suspected['65+'].f,
      row.deaths['0-14'].m,
      row.deaths['0-14'].f,
      row.deaths['15-24'].m,
      row.deaths['15-24'].f,
      row.deaths['25-64'].m,
      row.deaths['25-64'].f,
      row.deaths['65+'].m,
      row.deaths['65+'].f,
      row.samples,
      row.confirmed,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported!');
  };

  const handleExportPDF = async () => {
    const filename = `Disease_Report_${activeView}_${format(new Date(), 'yyyy-MM-dd')}`;

    await exportHTMLToPDF(diseaseReportRef.current, filename);

  };

  const handleExportDHIS = () => {
    setIsDhisSheetOpen(true);
  };

  const handleSelectFacility = (facility: any) => {
    sendDhisReport(facility.name, {
      onSuccess: () => {
        toast.success(`Report sent to DHIS2 for ${facility.name}`);
        setIsDhisSheetOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to send report to DHIS2");
      }
    });
  };

  const filteredFacilities = useMemo(() => {
    if (!facilitiesData) return [];
    const allFacilities = facilitiesData.pages.flatMap((page: any) => page.results);
    return allFacilities.filter((f: any) =>
      f.name.toLowerCase().includes(dhisSearch.toLowerCase())
    );
  }, [facilitiesData, dhisSearch]);

  if (filteredReports) {
    // Store data in sessionStorage for the export page
    localStorage.setItem('diseaseReportData', JSON.stringify(filteredReports));
    localStorage.setItem('diseaseReportMetadata', JSON.stringify({
      facilityName: 'Mbingo Regional Hospital',
      region: '',
      healthDistrict: 'Mbingo Regional Hospital',
      healthArea: '',
      year: '',
      epidemiologicalWeek: 'week',
      submissionDate: 'submissionDate',
      receivedDate: 'receivedDate',
      submitterName: 'name',
    }));
  }
  const [submissionDate, setSubmissionDate] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [name, setName] = useState('');

  // Ref for the DiseaseReportTemplate - used for PDF export
  const diseaseReportRef = useRef<HTMLDivElement>(null);
  const week = selectedUnit ? format(selectedUnit.date, 'w') : '';
  const year = selectedUnit ? format(selectedUnit.date, 'yyyy') : new Date().getFullYear().toString();

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="text-gray-700 font-medium">Loading statistics...</p>
          </div>
        </div>
      )}

      <style>{`
        .disease-table {
          border-collapse: collapse;
          width: 100%;
          min-width: 1200px;
          font-size: 16px;
          font-family: Arial, sans-serif;
          border-right: 1px solid #333;
        }
        .disease-table th, .disease-table td {
          border: 1px solid #333;
          padding: 6px 4px;
          text-align: center;
        }
        .disease-table th {
          background-color: #e8e8e8;
          font-weight: bold;
        }
        .disease-table .disease-col {
          text-align: left;
          min-width: 150px;
        }
        .disease-table .header-main {
          background-color: #d0d0d0;
          font-weight: bold;
        }
        .disease-table .subheader {
          background-color: #e8e8e8;
          font-size: 15px;
        }
        .disease-table .age-header {
          font-size: 14px;
        }
        .disease-table .no-col {
          width: 30px;
          padding-left: 8px;
          padding-right: 8px;
        }
        .disease-table input {
          width: 100%;
          border: none;
          text-align: center;
          background: transparent;
          font-size: 16px;
        }
        .disease-table input:focus {
          outline: 1px solid #4CAF50;
          background-color: #f0f8ff;
        }
      `}</style>
      <div className="mx-auto space-y-6 antialiased ">

        {/* Header: Location and Export Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center space-x-2 bg-blue-50 py-2 px-4 rounded-md border border-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="text-blue-700">Mbingo Regional Hos</span>
          </div>

          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center border border-[#028700] text-[#028700] shadow-none py-5 gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center text-white shadow-sm bg-[#028700] py-5 gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="flex items-center text-white shadow-sm bg-red-600 hover:bg-red-700 py-5 gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDHIS}
              className="flex items-center text-white shadow-sm bg-blue-600 hover:bg-blue-700 py-5 gap-2"
            >
              <Upload className="h-4 w-4" />
              Export DHIS
            </Button>
          </div>
        </div>

        {/* Time Selector and Units Display */}
        <div className="p-4 px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 border-b border-t pt-1 pb-1 px-4">
            <div className="flex gap-4 items-center mb-4 md:mb-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal border-gray-300",
                      !baseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {baseDate ? format(baseDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={baseDate}
                    onSelect={(d) => d && setBaseDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex p-2 space-x-1 bg-gray-100 rounded-md px-1 text-gray-[800]">
                {Object.values(View).reverse().map((view) => (
                  <Button
                    key={view}
                    variant={activeView === view ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewChange(view)}
                    className={`rounded-md px-4 py-5 ${activeView === view && 'bg-[#028700] hover:bg-[#028700d8]'}`}
                  >
                    {view}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pb-2">
              <div className="flex space-x-3 bg-gray-100 rounded-md px-1">
                {units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => handleUnitClick(unit.id)}
                    className="focus:outline-none"
                    aria-label={`Select ${activeView} unit: ${unit.value}`}
                  >
                    <TimeUnitItem
                      label={unit.label}
                      value={unit.value}
                      isSelected={unit.id === selectedUnitId}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Disease Report Table */}
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="disease-table">
                <thead className="text-gray-800">
                  <tr>
                    <th rowSpan={3} className="no-col w-[60px]">No</th>
                    <th rowSpan={3} className="disease-col">MALADIES</th>
                    <th colSpan={8} className="header-main">SUSPECTED CASES</th>
                    <th colSpan={8} className="header-main">DEATHS</th>
                    <th rowSpan={3}>Number of sample<br />Cases</th>
                    <th rowSpan={3}>Confirmed</th>
                  </tr>
                  <tr>
                    <th colSpan={2} className="subheader">0 - 14</th>
                    <th colSpan={2} className="subheader">15 - 24</th>
                    <th colSpan={2} className="subheader">25 - 64</th>
                    <th colSpan={2} className="subheader">65+</th>
                    <th colSpan={2} className="subheader">0 - 14</th>
                    <th colSpan={2} className="subheader">15 - 24</th>
                    <th colSpan={2} className="subheader">25 - 64</th>
                    <th colSpan={2} className="subheader">65+</th>
                  </tr>
                  <tr>
                    <th className="age-header">M</th><th className="age-header">F</th>
                    <th className="age-header">M</th><th className="age-header">F</th>
                    <th className="age-header">M</th><th className="age-header">F</th>
                    <th className="age-header">M</th><th className="age-header">F</th>
                    <th className="age-header">M</th><th className="age-header">F</th>
                    <th className="age-header">M</th><th className="age-header">F</th>
                    <th className="age-header">M</th><th className="age-header">F</th>
                    <th className="age-header">M</th><th className="age-header">F</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {filteredReports.map((row) => (
                    <tr key={row.id}>
                      <td className="px-8 w-[60px]">{row.id.toString().padStart(2, '0')}</td>
                      <td className="disease-col">{row.name}{row.isNotifiable ? ' *' : ''}</td>
                      <td><Input type="text" value={row.suspected['0-14'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.suspected['0-14'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.suspected['15-24'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.suspected['15-24'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.suspected['25-64'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.suspected['25-64'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.suspected['65+'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.suspected['65+'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['0-14'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['0-14'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['15-24'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['15-24'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['25-64'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['25-64'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['65+'].m} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.deaths['65+'].f} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.samples} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                      <td><Input type="text" value={row.confirmed} readOnly className="border-none rounded-none shadow-none bg-inherit" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <Input placeholder="Date of submission in the health area" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} className="w-full md:w-64 border-none rounded-none shadow-none bg-inherit" />
              <Input placeholder="Date received" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className="w-full md:w-64 border-none rounded-none shadow-none bg-inherit" />
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full md:w-64 border-none rounded-none shadow-none bg-inherit" />
              <div className="w-full md:w-64">
                <Input placeholder="Signature and Stamp" readOnly className="text-center border-none rounded-none shadow-none bg-inherit" />
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center note">
              * Immediate Notifiable Diseases
            </div>
          </div>
        </div>

        {/* Hidden DiseaseReportTemplate for PDF Export */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <DiseaseReportTemplate
            ref={diseaseReportRef}
            data={filteredReports}
            metadata={{
              facilityName: 'Mbingo Regional Hospital',
              region: '',
              healthDistrict: 'Mbingo Regional Hospital',
              healthArea: '',
              year: year,
              epidemiologicalWeek: week,
              submissionDate: submissionDate,
              receivedDate: receivedDate,
              submitterName: name,
            }}
          />
        </div>

      </div>

      <SelectionSheet
        open={isDhisSheetOpen}
        onOpenChange={setIsDhisSheetOpen}
        title="Select Facility for DHIS2 Export"
        searchValue={dhisSearch}
        onSearchChange={setDhisSearch}
        items={filteredFacilities}
        isLoading={isLoadingFacilities}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        renderItem={(facility: any) => (
          <Button
            variant="ghost"
            className="w-full justify-start py-6 px-4 hover:bg-gray-50 text-left font-normal"
            onClick={() => handleSelectFacility(facility)}
            disabled={isSendingDhis}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-medium text-gray-900">{facility.name}</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                  {facility.facility_type?.replace('_', ' ') || "Facility"}
                </span>
                {facility.code && <span>#{facility.code}</span>}
              </div>
            </div>
          </Button>
        )}
      />
    </div>
  );
}