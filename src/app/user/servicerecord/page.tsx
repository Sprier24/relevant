'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, SearchIcon, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Selection, ChipProps } from "@heroui/react"
import axios from "axios";
import { Pagination, Tooltip } from "@heroui/react"
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { AppSidebar } from "@/components/app-sidebar";
import PrivateRoute from "@/components/PrivateRoute";

interface engineer_remarks {
    serviceSpares: string;
    partNo: string;
    rate: string;
    quantity: string;
    total: string;
    poNo: string;
}

interface Service {
    id: string;
    customer_name: string;
    customer_location: string;
    contact_person: string;
    contact_number: string;
    service_engineer: string;
    serviceEngineerId?: string;
    date: string;
    place: string;
    place_options: string;
    nature_of_job: string;
    report_no: string;
    make_model_number_of_the_instrument_quantity: string;
    serial_number_of_the_instrument_calibrated_ok: string;
    serial_number_of_the_faulty_non_working_instruments: string;
    engineer_report: string;
    customer_report: string;
    engineer_remarks: engineer_remarks[];
    engineer_name: string;
    engineerId?: string;
    status: 'checked' | 'unchecked';
}

type SortDescriptor = {
    column: string;
    direction: 'ascending' | 'descending';
}

interface ServiceResponse {
    serviceId: string;
    message: string;
    downloadUrl: string;
}
const generateUniqueId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const columns = [
    { name: "Report Number", uid: "report_no", sortable: true, width: "120px" },
    { name: "Customer", uid: "customer_name", sortable: true, width: "110px" },
    { name: "Contact Person", uid: "contact_person", sortable: true, width: "120px" },
    { name: "Contact Number", uid: "contact_number", sortable: true, width: "120px" },
    { name: "Service Engineer", uid: "service_engineer", sortable: true, width: "120px" },
    { name: "Date of Service", uid: "date", sortable: true, width: "120px" },
    { name: "Download", uid: "actions", sortable: true, width: "100px" },
];

const INITIAL_VISIBLE_COLUMNS = ["customer_name", "contact_person", "contact_number", "service_engineer", "report_no", "actions"];

export default function AdminServiceTable() {
    const [services, setServices] = useState<Service[]>([]);
    const [service, setService] = useState<ServiceResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set([]));
    const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(columns.map(column => column.uid)));
    const [statusFilter, setStatusFilter] = React.useState<Selection>("all");
    const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({ column: "createdAt", direction: "descending" });
    const router = useRouter();
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const formatDate = (dateString: string | Date): string => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date";
        const pad = (n: number) => n.toString().padStart(2, "0");
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    const fetchServices = async () => {
        try {
            const response = await axios.get(
                "/api/services",
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            let servicesData;
            if (typeof response.data === 'object' && 'data' in response.data) {
                servicesData = response.data.data;
            } else if (Array.isArray(response.data)) {
                servicesData = response.data;
            } else {
                throw new Error('Invalid response format');
            }
            servicesData.sort((a: { createdAt: string | number | Date; }, b: { createdAt: string | number | Date; }) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            const servicesWithKeys = servicesData.map((service: Service) => ({
                ...service,
                key: service.id || generateUniqueId()
            }));
            setServices(servicesWithKeys);
            setError(null);
        } catch (error) {
            console.error("Error fetching services", error);
            setError("Failed to fetch services");
            setServices([]);
        }
    };
    useEffect(() => {
        fetchServices();
    }, []);
    const [filterValue, setFilterValue] = useState("");
    const hasSearchFilter = Boolean(filterValue);
    const headerColumns = React.useMemo(() => {
        if (visibleColumns === "all") return columns;
        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);
    const filteredItems = React.useMemo(() => {
        let filteredServices = [...services];
        if (hasSearchFilter) {
            filteredServices = filteredServices.filter((service) =>
                service.customer_name?.toLowerCase().includes(filterValue.toLowerCase()) ||
                service.contact_person?.toLowerCase().includes(filterValue.toLowerCase()) ||
                service.contact_number?.toLowerCase().includes(filterValue.toLowerCase()) ||
                service.service_engineer?.toLowerCase().includes(filterValue.toLowerCase()) ||
                service.report_no?.toLowerCase().includes(filterValue.toLowerCase())
            );
        }
        if (startDate || endDate) {
            filteredServices = filteredServices.filter((service) => {
                const serviceDate = new Date(service.date);
                serviceDate.setHours(0, 0, 0, 0);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);
                if (start && end) {
                    return serviceDate >= start && serviceDate <= end;
                } else if (start) {
                    return serviceDate >= start;
                } else if (end) {
                    return serviceDate <= end;
                }
                return true;
            });
        }
        return filteredServices;
    }, [services, filterValue, hasSearchFilter, startDate, endDate]);

    const items = filteredItems;

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => {
            if (sortDescriptor.column === "date" || sortDescriptor.column === "createdAt") {
                const dateA = new Date(
                    sortDescriptor.column === "date" ? a.date : (a as any).createdAt
                ).getTime();
                const dateB = new Date(
                    sortDescriptor.column === "date" ? b.date : (b as any).createdAt
                ).getTime();

                const cmp = dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
                return sortDescriptor.direction === "descending" ? -cmp : cmp;
            }
            const first = a[sortDescriptor.column as keyof Service] || '';
            const second = b[sortDescriptor.column as keyof Service] || '';
            const cmp = String(first).localeCompare(String(second));
            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, items]);

    const handleDownload = (service: Service) => {
        const logo = new Image();
        logo.src = "/img/rps.png";
        logo.onload = () => {
            const infoImage = new Image();
            infoImage.src = "/img/handf.png";
            infoImage.onload = () => {
                const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                const leftMargin = 15;
                const rightMargin = 15;
                const topMargin = 20;
                const contentWidth = pageWidth - leftMargin - rightMargin;
                let y = topMargin;

                const pad = (n: number) => n.toString().padStart(2, "0");
                const formatDate = (inputDateString: string | undefined): string => {
                    if (!inputDateString) return "N/A";
                    const inputDate = new Date(inputDateString);
                    if (isNaN(inputDate.getTime())) return "N/A";
                    return `${pad(inputDate.getDate())}-${pad(inputDate.getMonth() + 1)}-${inputDate.getFullYear()}`;
                };

                const checkPageBreak = (blockHeight = 10) => {
                    if (y + blockHeight > pageHeight - 30) {
                        doc.addPage();
                        y = topMargin;
                        doc.addImage(logo, "PNG", 5, 5, 50, 15);
                        y = 40;
                    }
                };

                const addRow = (label: string, value: string) => {
                    const labelOffset = 65;
                    const lines = doc.splitTextToSize(value || "N/A", contentWidth - labelOffset);
                    const blockHeight = lines.length * 6;
                    checkPageBreak(blockHeight);

                    doc.setFont("times", "bold").setFontSize(10).setTextColor(0);
                    doc.text(label + ":", leftMargin, y);
                    doc.setFont("times", "normal").setTextColor(50);
                    lines.forEach((line: string, i: number) => {
                        doc.text(line, leftMargin + labelOffset, y + i * 6);
                    });

                    y += blockHeight;
                };

                // Header
                doc.addImage(logo, "PNG", 5, 5, 50, 15);
                y = 40;
                doc.setFont("times", "bold").setFontSize(13).setTextColor(0, 51, 153);
                doc.text("SERVICE / CALIBRATION / INSTALLATION JOB REPORT", pageWidth / 2, y, { align: "center" });
                y += 10;

                // Report Info
                addRow("Report No.", service.report_no);
                addRow("Customer Name", service.customer_name);
                addRow("Customer Location", service.customer_location);
                addRow("Contact Person", service.contact_person);
                addRow("Status", service.status);
                addRow("Contact Number", service.contact_number);
                addRow("Service Engineer", service.service_engineer);
                addRow("Date", formatDate(service.date));
                addRow("Place", service.place);
                addRow("Place Options", service.place_options);
                addRow("Nature of Job", service.nature_of_job);
                addRow("Make & Model Number", service.make_model_number_of_the_instrument_quantity);
                y += 5;
                addRow("Calibrated & Tested OK", service.serial_number_of_the_instrument_calibrated_ok);
                addRow("Sr.No Faulty/Non-Working", service.serial_number_of_the_faulty_non_working_instruments);
                y += 10;

                // Engineer Report
                doc.setFont("times", "bold").setFontSize(10).setTextColor(0);
                doc.text("Engineer Report:", leftMargin, y);
                y += 5;

                const engineerReportLines = doc.splitTextToSize(service.engineer_report || "No report provided", contentWidth - 5);
                const engineerReportHeight = engineerReportLines.length * 6 + 5;
                checkPageBreak(engineerReportHeight);

                doc.setDrawColor(0).setLineWidth(0.2);
                doc.rect(leftMargin, y, contentWidth, engineerReportHeight);
                doc.setFont("times", "normal").setFontSize(9).setTextColor(0);
                doc.text(engineerReportLines, leftMargin + 2, y + 5);
                y += engineerReportHeight + 5;

                // Engineer Remarks Table
                doc.addPage();
                y = topMargin;
                doc.addImage(logo, "PNG", 5, 5, 50, 15);
                y = 40;

                doc.setFont("times", "bold").setFontSize(10).setTextColor(0);
                doc.text("ENGINEER REMARKS", leftMargin, y);
                y += 8;

                const tableHeaders = ["Sr. No.", "Service/Spares", "Part No.", "Rate", "Quantity", "Total", "PO No."];
                const colWidths = [15, 50, 25, 20, 20, 25, 25];
                let x = leftMargin;

                doc.setFont("times", "bold").setFontSize(9);
                tableHeaders.forEach((header, i) => {
                    doc.rect(x, y, colWidths[i], 8);
                    doc.text(header, x + 2, y + 6);
                    x += colWidths[i];
                });
                y += 8;

                let engineer_remarks: engineer_remarks[] = [];
                try {
                    if (typeof service.engineer_remarks === "string") {
                        engineer_remarks = JSON.parse(service.engineer_remarks);
                    } else if (Array.isArray(service.engineer_remarks)) {
                        engineer_remarks = service.engineer_remarks;
                    }
                } catch (err) {
                    console.error("Failed to parse engineer_remarks:", err);
                }

                doc.setFont("times", "normal").setFontSize(9);

                if (engineer_remarks.length > 0) {
                    engineer_remarks.forEach((remark, index) => {
                        const rowData = [
                            String(index + 1),
                            remark.serviceSpares || "",
                            remark.partNo || "",
                            remark.rate || "",
                            remark.quantity || "",
                            remark.total || "",
                            remark.poNo || ""
                        ];

                        const cellLines = rowData.map((text, i) =>
                            doc.splitTextToSize(text, colWidths[i] - 4)
                        );
                        const rowHeight = Math.max(...cellLines.map(lines => lines.length)) * 7;
                        checkPageBreak(rowHeight);

                        x = leftMargin;
                        cellLines.forEach((lines, colIndex) => {
                            doc.rect(x, y, colWidths[colIndex], rowHeight);
                            doc.text(lines, x + 2, y + 5);
                            x += colWidths[colIndex];
                        });

                        y += rowHeight;
                    });
                } else {
                    doc.setFont("times", "italic").setFontSize(9).setTextColor(150);
                    doc.text("No engineer remarks available", leftMargin, y);
                    y += 8;
                }

                y += 10;

                // Customer Report
                doc.setFont("times", "bold").setFontSize(10).setTextColor(0);
                doc.text("Customer Remarks:", leftMargin, y);
                y += 5;

                const customerReportLines = doc.splitTextToSize(service.customer_report || "No report provided", contentWidth - 5);
                const customerReportHeight = customerReportLines.length * 6 + 5;
                checkPageBreak(customerReportHeight);

                doc.setDrawColor(0).setLineWidth(0.2);
                doc.rect(leftMargin, y, contentWidth, customerReportHeight);
                doc.setFont("times", "normal").setFontSize(9).setTextColor(0);
                doc.text(customerReportLines, leftMargin + 2, y + 5);
                y += customerReportHeight + 35;

                // Signatures
                doc.text("Customer Name,Seal & Sign", leftMargin, y);
                doc.text("Service Engineer,Seal & Sign", pageWidth - rightMargin - 40, y);
                doc.text(service.service_engineer || "", pageWidth - rightMargin - 40, y + 5);

                // Timestamp
                const now = new Date();
                const date = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
                const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                doc.setFontSize(9).setTextColor(100);
                doc.text(`Report Generated On: ${date} ${time}`, leftMargin, pageHeight - 30);

                // Footer Image on All Pages
                const footerY = pageHeight - 20;
                const footerWidth = 180;
                const footerHeight = 15;
                const footerX = (pageWidth - footerWidth) / 2;
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.addImage(infoImage, "PNG", footerX, footerY, footerWidth, footerHeight);
                }

                const sanitizedCustomerName = service.customer_name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unknown_customer';
                const reportNumber = service.report_no || service.id;
                doc.save(`service-${sanitizedCustomerName}-${reportNumber}.pdf`);
            };
            infoImage.onerror = () => alert("Footer image not found. Please check the path.");
        };
        logo.onerror = () => alert("Logo image not found. Please check the path.");
    };

    const topContent = React.useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-between items-center w-full gap-4">
                    <div className="relative w-full sm:max-w-[20%]">
                        <Input
                            isClearable
                            className="w-full pr-12 sm:pr-14 pl-12"
                            startContent={
                                <SearchIcon className="h-4 w-5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                            }
                            placeholder="Search"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            onClear={() => setFilterValue("")}
                        />
                    </div>
                    <div className="flex items-center gap-3 mx-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-default-400">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border border-gray-300 rounded p-2 text-sm bg-white text-black 
                                dark:bg-white dark:border-gray-700 dark:text-black"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-default-400">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="border border-gray-300 rounded p-2 text-sm bg-white text-black 
                                dark:bg-white dark:border-gray-700 dark:text-black"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                }}
                            >
                                Clear Dates
                            </Button>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        Total: <strong>{filteredItems.length}</strong> certificate{filteredItems.length !== 1 ? "s" : ""}
                    </div>
                </div>
            </div>
        );
    }, [filterValue, startDate, endDate, filteredItems.length]);

    const handleSelectionChange = (keys: Selection) => {
        if (keys === "all") {
            setSelectedKeys(new Set(services.map(service => service.id)));
        } else {
            setSelectedKeys(keys as Set<string>);
        }
    };

    const handleVisibleColumnsChange = (keys: Selection) => {
        setVisibleColumns(keys);
    };




    const renderCell = React.useCallback((service: Service, columnKey: string): React.ReactNode => {
        // Safely get the cell value with proper typing
        const cellValue = service[columnKey as keyof Service];

        // Handle date columns
        if (columnKey === "date") {
            if (typeof cellValue === "string") {
                return formatDate(cellValue);
            }
        }

        // Handle actions column
        if (columnKey === "actions") {
            return (
                <div className="relative flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-lg text-danger cursor-pointer active:opacity-50"
                        onClick={() => handleDownload(service)}
                        disabled={isDownloading === service.id}
                    >
                        {isDownloading === service.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-6 w-6" />
                        )}
                    </Button>
                </div>
            );
        }

        // Handle engineer_remarks array
        if (columnKey === "engineer_remarks" && Array.isArray(cellValue)) {
            return (
                <div className="space-y-1">
                    {cellValue.map((remark, index) => (
                        <div key={index} className="text-sm">
                            {remark.serviceSpares}: {remark.partNo} (Qty: {remark.quantity})
                        </div>
                    ))}
                </div>
            );
        }

        // Default case for strings/numbers
        if (typeof cellValue === "string" || typeof cellValue === "number") {
            return cellValue;
        }

        // Fallback for other types
        return null;
    }, [isDownloading, router]);

    return (
       <PrivateRoute>
         <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/user/dashboard">
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/user/serviceform">
                                        Create Service
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 pt-15">
                    <Card className="max-w-7xl mx-auto">
                        <CardHeader>
                            <CardTitle className="text-3xl font-bold text-center">Service Record</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table
                                isHeaderSticky
                                aria-label="Leads table with custom cells, pagination and sorting"
                                bottomContentPlacement="outside"
                                classNames={{
                                    wrapper: "max-h-[382px] ower-flow-y-auto",
                                }}
                                selectedKeys={selectedKeys}
                                sortDescriptor={sortDescriptor}
                                topContent={topContent}
                                topContentPlacement="outside"
                                onSelectionChange={handleSelectionChange}
                                onSortChange={(descriptor) => {
                                    setSortDescriptor({
                                        column: descriptor.column as string,
                                        direction: descriptor.direction as "ascending" | "descending",
                                    });
                                }}
                            >
                                <TableHeader columns={headerColumns}>
                                    {(column) => (
                                        <TableColumn
                                            key={column.uid}
                                            align={column.uid === "actions" ? "center" : "start"}
                                            allowsSorting={column.sortable}
                                            onClick={() => {
                                                setSortDescriptor(prev => ({
                                                    column: column.uid,
                                                    direction: prev.column === column.uid && prev.direction === 'ascending'
                                                        ? 'descending'
                                                        : 'ascending'
                                                }));
                                            }}
                                        >
                                            <div className="flex items-center">
                                                {column.name}
                                                {sortDescriptor.column === column.uid && (
                                                    <span className="ml-1">
                                                        {sortDescriptor.direction === 'ascending' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </TableColumn>
                                    )}
                                </TableHeader>
                                <TableBody emptyContent={"No records found"} items={[...sortedItems].reverse()}>
                                    {(item) => (
                                        <TableRow key={item.id}>
                                            {(columnKey) => <TableCell style={{ fontSize: "12px", padding: "8px" }}>{renderCell(item as Service, columnKey as string)}</TableCell>}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
       </PrivateRoute>

    )
}