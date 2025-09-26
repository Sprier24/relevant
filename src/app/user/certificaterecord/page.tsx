'use client';
import React, { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { SearchIcon, Trash2, Download, ArrowUpIcon, ArrowDownIcon, Edit } from "lucide-react"
import { Input } from "@/components/ui/input"
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Selection } from "@heroui/react"
import { Pagination, Tooltip, User } from "@heroui/react"
import { AppSidebar } from "@/components/app-sidebar"
import { jsPDF } from "jspdf";
import PrivateRoute from "@/components/PrivateRoute";


interface Observation {
    gas: string;
    before: string;
    after: string;
}

interface Certificate {
    id: string;
    certificate_no: string;
    customer_name: string;
    site_location: string;
    make_model: string;
    range: string;
    serial_no: string;
    calibration_gas: string;
    gas_canister_details: string;
    date_of_calibration: string;
    calibration_due_date: string;
    observations: Observation[];
    engineer_name: string;
    status: string;
    createdAt?: string;
}


type SortDescriptor = {
    column: string;
    direction: 'ascending' | 'descending';
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
    { name: "Certificate Number", uid: "certificate_no", sortable: true, width: "120px" },
    { name: "Customer Name", uid: "customer_name", sortable: true, width: "120px" },
    { name: "Site Location", uid: "site_location", sortable: true, width: "120px" },
    { name: "Model", uid: "make_model", sortable: true, width: "120px" },
    { name: "Serial Number", uid: "serial_no", sortable: true, width: "120px" },
    { name: "Engineer Name", uid: "engineer_name", sortable: true, width: "120px" },
    { name: "Date of Calibration", uid: "date_of_calibration", sortable: true, width: "120px" },
    { name: "Actions", uid: "actions", sortable: true, width: "100px" },
];
const INITIAL_VISIBLE_COLUMNS = ["certificate_no", "customer_name", "site_location", "make_model", "serial_no", "engineer_name", "actions"];

export default function CertificateTable() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set([]));
    const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(columns.map(column => column.uid)));
    const [statusFilter, setStatusFilter] = React.useState<Selection>("all");
    const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({ column: "createdAt", direction: "descending" });
    const router = useRouter();
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const API_BASE_URL = "/api/certificates";

    const fetchCertificates = async () => {
        try {
            const response = await fetch(API_BASE_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch certificates");
            }
            const data = await response.json();
            const certificatesData = Array.isArray(data) ? data : [];
            const certificatesWithKeys = certificatesData.map((certificate: Certificate) => ({
                ...certificate,
                key: certificate.id || generateUniqueId(),
                _id: certificate.id,
            }));
            setCertificates(certificatesWithKeys);
            setError(null);
        } catch (error) {
            console.error("Error fetching certificates", error);
            setError("Failed to fetch certificates");
            setCertificates([]);
        }
    };
    useEffect(() => {
        fetchCertificates();
    }, []);

    const handleDelete = async (certificateId: string) => {
        if (!window.confirm("Are you sure you want to delete this certificate?")) {
            return;
        }
        try {
            await axios.delete(`/api/certificates?id=${certificateId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                }
            });
            setCertificates((prevCertificates) =>
                prevCertificates.filter(cert => cert.id !== certificateId)
            );
            toast({
                title: "Certificate deleted successfully",
            });
        } catch (error) {
            console.error("Error deleting certificate", error);
            toast({
                title: "Failed to delete certificate",
                variant: "destructive",
            });
        }
    };

    const [filterValue, setFilterValue] = useState("");
    const hasSearchFilter = Boolean(filterValue);
    const headerColumns = React.useMemo(() => {
        if (visibleColumns === "all") return columns;
        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);
    const filteredItems = React.useMemo(() => {
        let filteredCertificates = [...certificates];
        if (hasSearchFilter) {
            const searchLower = filterValue.toLowerCase();
            filteredCertificates = filteredCertificates.filter((certificate) =>
                (certificate.certificate_no?.toLowerCase() ?? "").includes(searchLower) ||
                (certificate.customer_name?.toLowerCase() ?? "").includes(searchLower) ||
                (certificate.site_location?.toLowerCase() ?? "").includes(searchLower) ||
                (certificate.make_model?.toLowerCase() ?? "").includes(searchLower) ||
                (certificate.serial_no?.toLowerCase() ?? "").includes(searchLower) ||
                (certificate.engineer_name?.toLowerCase() ?? "").includes(searchLower)
            );
        }
        if (startDate || endDate) {
            filteredCertificates = filteredCertificates.filter((certificate) => {
                const dateStr = certificate.date_of_calibration || certificate.date_of_calibration;
                if (!dateStr) return false;
                const calibrationDate = new Date(dateStr);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);
                calibrationDate.setHours(0, 0, 0, 0);
                if (start && end) {
                    return calibrationDate >= start && calibrationDate <= end;
                } else if (start) {
                    return calibrationDate >= start;
                } else if (end) {
                    return calibrationDate <= end;
                }
                return true;
            });
        }
        return filteredCertificates;
    }, [certificates, hasSearchFilter, filterValue, startDate, endDate]);

    const items = filteredItems;

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => {
            if (
                sortDescriptor.column === 'dateOfCalibration' ||
                sortDescriptor.column === 'calibrationDueDate'
            ) {
                const dateA = new Date(a[sortDescriptor.column as keyof Certificate] as string).getTime();
                const dateB = new Date(b[sortDescriptor.column as keyof Certificate] as string).getTime();
                const cmp = dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
                return sortDescriptor.direction === "descending" ? -cmp : cmp;
            }


            const first = a[sortDescriptor.column as keyof Certificate] || '';
            const second = b[sortDescriptor.column as keyof Certificate] || '';
            const cmp = String(first).localeCompare(String(second));

            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, items]);

    const handleDownload = async (certificateId: string) => {
        try {
            setIsDownloading(certificateId);

            const certificateToDownload = certificates.find(cert => cert.id === certificateId);
            if (!certificateToDownload) throw new Error("Certificate data not found");

            // Load logo
            const logo = new Image();
            logo.src = "/img/rps.png";
            await new Promise<void>((resolve, reject) => {
                logo.onload = () => resolve();
                logo.onerror = () => reject(new Error("Failed to load logo image"));
            });

            // Load footer
            const footerImg = new Image();
            footerImg.src = "/img/handf.png";
            await new Promise<void>((resolve, reject) => {
                footerImg.onload = () => resolve();
                footerImg.onerror = () => reject(new Error("Failed to load footer image"));
            });

            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const leftMargin = 15, rightMargin = 15, topMargin = 20, bottomMargin = 20;
            const contentWidth = pageWidth - leftMargin - rightMargin;
            const contentStartY = 40;
            let y = contentStartY;
            let x = leftMargin;

            const addLogo = () => {
                doc.addImage(logo, "PNG", 2, 10, 60, 20);
            };

            const addFooter = () => {
                const footerWidth = 180;
                const footerHeight = 15;
                const footerX = (pageWidth - footerWidth) / 2;
                const footerY = pageHeight - 20;
                doc.addImage(footerImg, "PNG", footerX, footerY, footerWidth, footerHeight);
            };

            const checkPageBreak = (blockHeight = 10): void => {
                if (y + blockHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    addLogo();
                    y = contentStartY;
                }
            };

            const formatDate = (dateString?: string | null): string => {
                if (!dateString) return "N/A";
                const d = new Date(dateString);
                return isNaN(d.getTime()) ? "Invalid Date" : `${d.getDate().toString().padStart(2, '0')} - ${(d.getMonth() + 1).toString().padStart(2, '0')} - ${d.getFullYear()}`;
            };

            const addRow = (label: string, value?: string) => {
                const labelWidth = 55;
                const valueX = leftMargin + labelWidth + 2;
                const lines = doc.splitTextToSize(value || "N/A", contentWidth - labelWidth - 10);
                const blockHeight = lines.length * 8;
                checkPageBreak(blockHeight);

                doc.setFont("times", "bold").setFontSize(11).setTextColor(0);
                doc.text(label, leftMargin, y);
                doc.setFont("times", "normal").setTextColor(50);
                lines.forEach((line: string, i: number) => {
                    doc.text(": " + line, valueX, y + i * 8);
                });
                y += blockHeight;
            };

            addLogo();

            doc.setFont("times", "bold").setFontSize(16).setTextColor(0, 51, 102);
            doc.text("CALIBRATION CERTIFICATE", pageWidth / 2, y, { align: "center" });
            y += 12;

            addRow("Certificate No.", certificateToDownload.certificate_no);
            addRow("Customer Name", certificateToDownload.customer_name);
            addRow("Site Location", certificateToDownload.site_location);
            addRow("Make & Model", certificateToDownload.make_model);
            addRow("Range", certificateToDownload.range);
            addRow("Serial No.", certificateToDownload.serial_no);
            addRow("Calibration Gas", certificateToDownload.calibration_gas);
            addRow("Gas Canister Details", certificateToDownload.gas_canister_details);
            y += 5;
            addRow("Date of Calibration", formatDate(certificateToDownload.date_of_calibration));
            addRow("Calibration Due Date", formatDate(certificateToDownload.calibration_due_date));
            addRow("Status", certificateToDownload.status);
            y += 5;

            checkPageBreak(10);
            doc.setDrawColor(180);
            doc.setLineWidth(0.3);
            doc.line(leftMargin, y, pageWidth - rightMargin, y);
            y += 10;

            doc.setFont("times", "bold").setFontSize(12).setTextColor(0, 51, 102);
            doc.text("OBSERVATIONS", leftMargin, y);
            y += 10;

            const colWidths = [20, 70, 40, 40];
            const headers = ["Sr. No.", "Concentration of Gas", "Reading Before", "Reading After"];

            // --- TABLE HEADER ---
            checkPageBreak(10);
            doc.setFont("times", "bold").setFontSize(10).setTextColor(0);
            x = leftMargin;

            headers.forEach((header, i) => {
                doc.rect(x, y, colWidths[i], 8); // Draw header cell border
                doc.text(header, x + 2, y + 6);  // Left-aligned header text
                x += colWidths[i];
            });
            y += 8;

            // --- TABLE BODY ---
            doc.setFont("times", "normal").setFontSize(10);
            certificateToDownload.observations.forEach((obs, index) => {
                const rowData = [
                    `${index + 1}`,
                    obs.gas || "",
                    obs.before || "",
                    obs.after || ""
                ];

                const cellLines = rowData.map((text, i) =>
                    doc.splitTextToSize(text, colWidths[i] - 4)
                );

                const rowHeight = Math.max(...cellLines.map(lines => lines.length)) * 6;
                checkPageBreak(rowHeight);
                x = leftMargin;

                cellLines.forEach((lines, colIndex) => {
                    const colX = x;
                    const colW = colWidths[colIndex];

                    doc.rect(colX, y, colW, rowHeight); // border

                    lines.forEach((line: string, lineIndex: number) => {
                        const textY = y + lineIndex * 6 + 5;
                        const align: "left" | "center" = colIndex === 0 ? "center" : "left";
                        const textX = colIndex === 0
                            ? colX + colW / 2
                            : colX + 2;

                        doc.text(line, textX, textY, { align });
                    });


                    x += colW;
                });

                y += rowHeight;
            });

            y += 15;

            const conclusion = "The above-mentioned Gas Detector was calibrated successfully, and the result confirms that the performance of the instrument is within acceptable limits.";
            const conclusionLines = doc.splitTextToSize(conclusion, contentWidth);
            checkPageBreak(conclusionLines.length * 6 + 10);
            doc.setFont("times", "normal").setFontSize(10).setTextColor(0);
            doc.text(conclusionLines, leftMargin, y);
            y += conclusionLines.length * 6 + 15;

            checkPageBreak(20);
            doc.setFont("times", "bold");
            doc.text("Tested & Calibrated By", pageWidth - rightMargin, y, { align: "right" });
            doc.setFont("times", "normal");
            doc.text(certificateToDownload.engineer_name || "________________", pageWidth - rightMargin, y + 10, { align: "right" });
            y += 20;

            const addFooterToAllPages = () => {
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    addFooter();

                    if (i === pageCount) {  // <-- Only on the last page
                        const footerTextY = pageHeight - bottomMargin - 20;
                        const generatedOnY = footerTextY + 10;

                        doc.setFontSize(8).setTextColor(100);
                        doc.text(
                            "This certificate is electronically generated and does not require a physical signature.",
                            leftMargin,
                            footerTextY
                        );
                        doc.text(
                            `Generated on: ${new Date().toLocaleString()}`,
                            leftMargin,
                            generatedOnY
                        );
                    }
                }
            };


            addFooterToAllPages();

            doc.save(`calibration-certificate-${certificateToDownload.certificate_no}.pdf`);
        } catch (error) {
            console.error("Error generating PDF", error);
            toast({
                title: "Failed to generate certificate",
                variant: "destructive",
            });
        } finally {
            setIsDownloading(null);
        }
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

    const bottomContent = (
        <div className="py-2 px-2">
            <span className="text-default-400 text-small">
                Total {filteredItems.length} certificates
            </span>
        </div>
    );

    const handleSelectionChange = (keys: Selection) => {
        if (keys === "all") {
            setSelectedKeys(new Set(certificates.map(cert => cert.id)));
        } else {
            setSelectedKeys(keys as Set<string>);
        }
    };

    const handleVisibleColumnsChange = (keys: Selection) => {
        setVisibleColumns(keys);
    };


    const renderCell = React.useCallback(
        (certificate: Certificate, columnKey: string): React.ReactNode => {
            // Handle actions column separately
            if (columnKey === "actions") {
                return (
                    <div className="relative flex items-center gap-2">
                        <Tooltip>
                            <span
                                className="text-lg text-danger cursor-pointer active:opacity-50"
                                onClick={() => handleDownload(certificate.id)}
                            >
                                <Download className="h-6 w-6" />
                            </span>
                        </Tooltip>


                    </div>
                );
            }

            // For all other columns, ensure we're accessing valid properties
            const cellValue = certificate[columnKey as keyof Certificate];

            // Handle date columns
            if ((columnKey === "date_of_calibration" || columnKey === "calibration_due_date") && cellValue) {
                return formatDate(cellValue as string);
            }

            // Handle observations column
            if (columnKey === "observations" && Array.isArray(cellValue)) {
                return (cellValue as Observation[]).map((obs, index) => (
                    <div key={index}>
                        <span>{obs.gas || '-'}</span> - <span>{obs.before || '-'}</span> - <span>{obs.after || '-'}</span>
                    </div>
                ));
            }

            // Return default cell value
            return (cellValue as string) || "N/A";
        },
        [handleDownload, handleDelete, router]
    );

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
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/user/dashboard">
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/user/certificateform">
                                        Create Certificate
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>

                    </div>
                </header>
                <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 pt-15">
                    <Card className="max-w-7xl mx-auto">
                        <CardHeader>
                            <CardTitle className="text-3xl font-bold text-center">Certificate Record</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table
                                isHeaderSticky
                                aria-label="Leads table with custom cells, pagination and sorting"
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
                                                if (column.sortable) {
                                                    setSortDescriptor(prev => ({
                                                        column: column.uid,
                                                        direction: prev.column === column.uid && prev.direction === 'ascending'
                                                            ? 'descending'
                                                            : 'ascending'
                                                    }));
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-1 cursor-pointer">
                                                {column.name}
                                                {sortDescriptor.column === column.uid && (
                                                    <span className="ml-1">
                                                        {sortDescriptor.direction === 'ascending' ? (
                                                            <ArrowUpIcon className="h-4 w-4" />
                                                        ) : (
                                                            <ArrowDownIcon className="h-4 w-4" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </TableColumn>
                                    )}
                                </TableHeader>
                                <TableBody emptyContent={"No certificates found"} items={[...sortedItems].reverse()}>
                                    {(item) => (
                                        <TableRow key={item.id}>
                                            {(columnKey) => <TableCell style={{ fontSize: "12px", padding: "8px" }}>{renderCell(item as Certificate, columnKey as string)}</TableCell>}
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
};

function setPage(arg0: number) {
    throw new Error("Function not implemented");
}
