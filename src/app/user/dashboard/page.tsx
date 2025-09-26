'use client';
import { AppSidebar } from "@/components/app-sidebar"
import { Breadcrumb, BreadcrumbPage, BreadcrumbList, BreadcrumbItem } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import React, { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from "@/components/ui/button"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Selection, ChipProps } from "@heroui/react"
import { Pagination } from "@heroui/react"
import PrivateRoute from "@/components/PrivateRoute";

interface Certificate {
    _id: string;
    certificateNo: string;
    customerName: string;
    siteLocation: string;
    makeModel: string;
    range: string;
    serialNo: string;
    calibrationGas: string;
    gasCanisterDetails: string;
    dateOfCalibration: string;
    calibrationDueDate: string;
    engineerName: string;
    [key: string]: string;
}
interface Service {
    [x: string]: any;
    _id: string;
    nameAndLocation: string;
    contactPerson: string;
    contactNumber: string;
    serviceEngineer: string;
    date: string;
    place: string;
    placeOptions: string;
    natureOfJob: string;
    reportNo: string;
    makeModelNumberoftheInstrumentQuantity: string;
    serialNumberoftheInstrumentCalibratedOK: string;
    serialNumberoftheFaultyNonWorkingInstruments: string;
    engineerName: string;
}
interface User {
    _id: string;
    name: string;
    email: string;
    contact: number;
}
type SortDescriptor = {
    column: string;
    direction: 'ascending' | 'descending';
}
type sortDescriptorService = {
    column: string;
    direction: 'ascending' | 'descending';
}
interface CertificateResponse {
    certificateId: string;
    message: string;
    downloadUrl: string;
}
interface ServiceResponse {
    serviceId: string;
    message: string;
    downloadUrl: string;
}

const generateUniqueId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
const generateUniqueIdService = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
};

const columns = [
    { name: "Certificate Number", uid: "certificate_no", sortable: true, width: "120px" },
    { name: "Customer", uid: "customer_name", sortable: true, width: "120px" },
    { name: "Site Location", uid: "site_location", sortable: true, width: "120px" },
    { name: "Make Model", uid: "make_model", sortable: true, width: "120px" },
    { name: "Serial Number", uid: "serial_no", sortable: true, width: "120px" },
    { name: "Engineer Name", uid: "engineer_name", sortable: true, width: "120px" },
];
const columnsservice = [
    { name: "Report Number", uid: "report_no", sortable: true, width: "120px" },
    { name: "Contact Person", uid: "contact_person", sortable: true, width: "120px" },
    { name: "Contact Number", uid: "contact_number", sortable: true, width: "120px" },
    { name: "Service Engineer", uid: "service_engineer", sortable: true, width: "120px" },
];

export default function Page() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [certificate, setCertificate] = useState<CertificateResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set([]));
    const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(columns.map(column => column.uid)));
    const [statusFilter, setStatusFilter] = React.useState<Selection>("all");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({ column: "certificateNo", direction: "ascending" });
    const [page, setPage] = React.useState(1);
    const router = useRouter();
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [service, setService] = useState<ServiceResponse | null>(null);
    const [errorService, setErrorService] = useState<string | null>(null);
    const [selectedKeysService, setSelectedKeysService] = React.useState<Set<string>>(new Set([]));
    const [visibleColumnsService, setVisibleColumnsService] = React.useState<Selection>(new Set(columnsservice.map(column => column.uid)));
    const [statusFilterService, setStatusFilterService] = React.useState<Selection>("all");
    const [rowsPerPageService, setRowsPerPageService] = useState(10);
    const [sortDescriptorService, setSortDescriptorService] = React.useState<sortDescriptorService>({ column: "nameAndLocation", direction: "ascending" });
    const [pageService, setPageService] = React.useState(1);
    const routerService = useRouter();
    const [isDownloadingService, setIsDownloadingService] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    const fetchCertificates = async () => {
        try {
            const response = await axios.get(
                "/api/certificates",
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            console.log('Full API Response:', {
                status: response.status,
                data: response.data,
                type: typeof response.data,
                hasData: 'data' in response.data
            });
            let certificatesData;
            if (typeof response.data === 'object' && 'data' in response.data) {
                certificatesData = response.data.data;
            } else if (Array.isArray(response.data)) {
                certificatesData = response.data;
            } else {
                console.error('Unexpected response format:', response.data);
                throw new Error('Invalid response format');
            }
            if (!Array.isArray(certificatesData)) {
                certificatesData = [];
            }
            const certificatesWithKeys = certificatesData.map((certificate: Certificate) => ({
                ...certificate,
                key: certificate._id || generateUniqueId()
            }));
            setCertificates(certificatesWithKeys);
            setError(null);
        } catch (error) {
            console.error("Error fetching leads:", error);
            if (axios.isAxiosError(error)) {
                setError(`Failed to fetch leads: ${error.response?.data?.message || error.message}`);
            } else {
                setError("Failed to fetch leads.");
            }
            setCertificates([]);
        }
    };
    useEffect(() => {
        fetchCertificates();
    }, []);

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
            console.log('Full API Response:', {
                status: response.status,
                data: response.data,
                type: typeof response.data,
                hasData: 'data' in response.data
            });
            let servicesData;
            if (typeof response.data === 'object' && 'data' in response.data) {
                servicesData = response.data.data;
            } else if (Array.isArray(response.data)) {
                servicesData = response.data;
            } else {
                console.error('Unexpected response format:', response.data);
                throw new Error('Invalid response format');
            }
            if (!Array.isArray(servicesData)) {
                servicesData = [];
            }
            const servicesWithKeys = servicesData.map((service: Service) => ({
                ...service,
                key: service._id || generateUniqueIdService()
            }));
            setServices(servicesWithKeys);
            setError(null);
        } catch (error) {
            console.error("Error fetching leads:", error);
            if (axios.isAxiosError(error)) {
                setError(`Failed to fetch leads: ${error.response?.data?.message || error.message}`);
            } else {
                setError("Failed to fetch leads.");
            }
            setServices([]);
        }
    };
    useEffect(() => {
        fetchServices();
    }, []);

    const [filterValue, setFilterValue] = useState("");
    const [filterValueservice, setFilterValueservice] = useState("");
    const hasSearchFilter = Boolean(filterValue);
    const hasSearchFilterservice = Boolean(filterValueservice);
    const headerColumns = React.useMemo(() => {
        if (visibleColumns === "all") return columns;
        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);
    const headerColumnsservice = React.useMemo(() => {
        if (visibleColumnsService === "all") return columnsservice;
        return columnsservice.filter((column) => Array.from(visibleColumnsService).includes(column.uid));
    }, [visibleColumnsService]);
    const filteredItems = React.useMemo(() => {
        let filteredCertificates = [...certificates];
        if (hasSearchFilter) {
            filteredCertificates = filteredCertificates.filter((certificate) =>
                certificate.certificate_no.toLowerCase().includes(filterValue.toLowerCase()) ||
                certificate.customer_name.toLowerCase().includes(filterValue.toLowerCase()) ||
                certificate.site_location.toLowerCase().includes(filterValue.toLowerCase()) ||
                certificate.make_model.toLowerCase().includes(filterValue.toLowerCase()) ||
                certificate.serial_no.toLowerCase().includes(filterValue.toLowerCase()) ||
                certificate.engineer_name.toLowerCase().includes(filterValue.toLowerCase())
            );
        }
        return filteredCertificates;
    }, [certificates, hasSearchFilter, filterValue]);
    const filteredItemsservice = React.useMemo(() => {
        let filteredServices = [...services];
        if (hasSearchFilterservice) {
            filteredServices = filteredServices.filter((service) =>
                service.contact_person.toLowerCase().includes(filterValueservice.toLowerCase()) ||
                service.contact_number.toLowerCase().includes(filterValueservice.toLowerCase()) ||
                service.service_engineer.toLowerCase().includes(filterValueservice.toLowerCase()) ||
                service.report_no.toLowerCase().includes(filterValueservice.toLowerCase())
            );
        }
        return filteredServices;
    }, [services, hasSearchFilterservice, filterValueservice]);
    const pages = Math.ceil(filteredItems.length / rowsPerPage);
    const pageservices = Math.ceil(filteredItemsservice.length / rowsPerPageService);
    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);
    const itemsservice = React.useMemo(() => {
        const start = (pageService - 1) * rowsPerPageService;
        const end = start + rowsPerPageService;
        return filteredItemsservice.slice(start, end);
    }, [pageService, filteredItemsservice, rowsPerPageService]);
    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => {
            const first = a[sortDescriptor.column as keyof Certificate];
            const second = b[sortDescriptor.column as keyof Certificate];
            const cmp = first < second ? -1 : first > second ? 1 : 0;
            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, items]);
    const sortedItemsservice = React.useMemo(() => {
        return [...itemsservice].sort((a, b) => {
            const first = a[sortDescriptorService.column as keyof Service];
            const second = b[sortDescriptorService.column as keyof Service];
            const cmp = first < second ? -1 : first > second ? 1 : 0;
            return sortDescriptorService.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptorService, itemsservice]);

    const onNextPage = React.useCallback(() => {
        if (page < pages) {
            setPage(page + 1);
        }
    }, [page, pages]);

    const onNextPageservice = React.useCallback(() => {
        if (pageService < pageservices) {
            setPageService(pageService + 1);
        }
    }, [pageService, pageservices]);

    const onPreviousPage = React.useCallback(() => {
        if (page > 1) {
            setPage(page - 1);
        }
    }, [page]);

    const onPreviousPageService = React.useCallback(() => {
        if (pageService > 1) {
            setPageService(pageService - 1);
        }
    }, [pageService]);

    const onRowsPerPageChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(Number(e.target.value));
        setPage(1);
    }, []);

    const onRowsPerPageChangeservice = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPageService(Number(e.target.value));
        setPageService(1);
    }, []);

    const onSearchChange = React.useCallback((value: string) => {
        if (value) {
            setFilterValue(value);
            setPage(1);
        } else {
            setFilterValue("");
        }
    }, []);

    const onSearchChangeservice = React.useCallback((value: string) => {
        if (value) {
            setFilterValueservice(value);
            setPageService(1);
        } else {
            setFilterValueservice("");
        }
    }, []);

    const topContent = React.useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-end">
                    <div className="relative w-full sm:max-w-[20%]">
                        <Input
                            isClearable
                            className="w-full pr-12 sm:pr-14 pl-12"
                            startContent={<SearchIcon className="h-4 w-5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />}
                            placeholder="Search"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            onClear={() => setFilterValue("")}
                        />
                    </div>
                </div>
            </div>
        );
    }, [
        filterValue,
        statusFilter,
        visibleColumns,
        onRowsPerPageChange,
        certificates.length,
        onSearchChange,
    ]);

    const topContentservice = React.useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-end">
                    <div className="relative w-full sm:max-w-[20%]">
                        <Input
                            isClearable
                            className="w-full pr-12 sm:pr-14 pl-12"
                            placeholder="Search"
                            startContent={<SearchIcon className="h-4 w-5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />}
                            value={filterValueservice}
                            onChange={(e) => setFilterValueservice(e.target.value)}
                            onClear={() => setFilterValueservice("")}
                        />
                    </div>
                </div>
            </div>
        );
    }, [
        filterValueservice,
        statusFilterService,
        visibleColumnsService,
        onRowsPerPageChangeservice,
        services.length,
        onSearchChangeservice,
    ]);

    const bottomContent = React.useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400">
                </span>
                <Pagination
                    isCompact
                    showShadow
                    color="success"
                    page={page}
                    total={pages}
                    onChange={setPage}
                    classNames={{
                        cursor: "bg-[hsl(339.92deg_91.04%_52.35%)] shadow-md",
                        item: "data-[active=true]:bg-[hsl(339.92deg_91.04%_52.35%)] data-[active=true]:text-white rounded-lg",
                    }}
                />
                <div className="rounded-lg bg-default-100 hover:bg-default-200 hidden sm:flex w-[30%] justify-end gap-2">
                    <Button
                        className="bg-[hsl(339.92deg_91.04%_52.35%)]"
                        variant="default"
                        size="sm"
                        disabled={page === 1}
                        onClick={onPreviousPage}
                    >
                        Previous
                    </Button>
                    <Button
                        className="bg-[hsl(339.92deg_91.04%_52.35%)]"
                        variant="default"
                        size="sm"
                        disabled={page === pages}
                        onClick={onNextPage}
                    >
                        Next
                    </Button>
                </div>
            </div>
        );
    }, [selectedKeys, items.length, page, pages, hasSearchFilter]);

    const bottomContentservice = React.useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400">
                </span>
                <Pagination
                    isCompact
                    showShadow
                    color="success"
                    page={pageService}
                    total={pageservices}
                    onChange={setPageService}
                    classNames={{
                        cursor: "bg-[hsl(339.92deg_91.04%_52.35%)] shadow-md",
                        item: "data-[active=true]:bg-[hsl(339.92deg_91.04%_52.35%)] data-[active=true]:text-white rounded-lg",
                    }}
                />
                <div className="rounded-lg bg-default-100 hover:bg-default-200 hidden sm:flex w-[30%] justify-end gap-2">
                    <Button
                        className="bg-[hsl(339.92deg_91.04%_52.35%)]"
                        variant="default"
                        size="sm"
                        disabled={pageService === 1}
                        onClick={onPreviousPageService}
                    >
                        Previous
                    </Button>
                    <Button
                        className="bg-[hsl(339.92deg_91.04%_52.35%)]"
                        variant="default"
                        size="sm"
                        disabled={pageService === pageservices}
                        onClick={onNextPageservice}
                    >
                        Next
                    </Button>
                </div>
            </div>
        );
    }, [selectedKeys, items.length, pageService, pageservices, hasSearchFilterservice]);

    const handleSelectionChange = (keys: Selection) => {
        if (keys === "all") {
            setSelectedKeys(new Set(certificates.map(cert => cert._id)));
        } else {
            setSelectedKeys(keys as Set<string>);
        }
    };

    const handleSelectionChangeservice = (keys: Selection) => {
        if (keys === "all") {
            setSelectedKeysService(new Set(services.map(service => service._id)));
        } else {
            setSelectedKeysService(keys as Set<string>);
        }
    }

    const renderCell = React.useCallback((certificate: Certificate, columnKey: string): React.ReactNode => {
        const cellValue = certificate[columnKey];
        if ((columnKey === "dateOfCalibration" || columnKey === "calibrationDueDate") && cellValue) {
            return formatDate(cellValue);
        }
        return cellValue;
    }, [isDownloading]);

    const renderCellservice = React.useCallback((service: Service, columnKey: string): React.ReactNode => {
        const cellValue = service[columnKey as keyof Service];
        if ((columnKey === "dateOfCalibration" || columnKey === "calibrationDueDate") && cellValue) {
            return formatDate(cellValue);
        }
        return cellValue;
    }, [isDownloadingService]);

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
                                    <BreadcrumbPage>
                                        Dashboard
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col p-4 ">
                    <div className="grid p-2 auto-rows-min gap-4 md:grid-cols-2">
                        <Card className="rounded-lg border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold">Total Certificates</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-bold">{certificates.length}</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-lg border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold">Total Services</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-bold">{services.length}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex-1 p-2 py-4 overflow-hidden flex flex-col">
                            <Card className="h-full flex flex-col bg-background rounded-lg border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-3xl font-bold text-center">Certificate Record</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table
                                        isHeaderSticky
                                        aria-label="Leads table with custom cells, pagination and sorting"
                                        bottomContent={bottomContent}
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
                                                >
                                                    {column.name}
                                                </TableColumn>
                                            )}
                                        </TableHeader>
                                        <TableBody emptyContent={"Go to create certificate and add data"} items={[...sortedItems].reverse()}>
                                            {(item) => (
                                                <TableRow key={item._id}>
                                                    {(columnKey) => <TableCell style={{ fontSize: "12px", padding: "8px" }}>{renderCell(item as Certificate, columnKey as string)}</TableCell>}
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="flex-1 p-2 overflow-hidden flex flex-col">
                            <Card className="h-full flex flex-col bg-background rounded-lg border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-3xl font-bold text-center">Service Record</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table
                                        isHeaderSticky
                                        aria-label="Leads table with custom cells, pagination and sorting"
                                        bottomContent={bottomContentservice}
                                        bottomContentPlacement="outside"
                                        classNames={{
                                            wrapper: "max-h-[382px] ower-flow-y-auto",
                                        }}
                                        selectedKeys={selectedKeysService}
                                        sortDescriptor={sortDescriptorService}
                                        topContent={topContentservice}
                                        topContentPlacement="outside"
                                        onSelectionChange={handleSelectionChangeservice}
                                        onSortChange={(descriptor) => {
                                            setSortDescriptorService({
                                                column: descriptor.column as string,
                                                direction: descriptor.direction as "ascending" | "descending",
                                            });
                                        }}
                                    >
                                        <TableHeader columns={headerColumnsservice}>
                                            {(column) => (
                                                <TableColumn
                                                    key={column.uid}
                                                    align={column.uid === "actions" ? "center" : "start"}
                                                    allowsSorting={column.sortable}
                                                >
                                                    {column.name}
                                                </TableColumn>
                                            )}
                                        </TableHeader>
                                        <TableBody emptyContent={"Go to create service and add data"} items={[...sortedItemsservice].reverse()}>
                                            {(item) => (
                                                <TableRow key={item._id}>
                                                    {(columnKey) => <TableCell style={{ fontSize: "12px", padding: "8px" }}>{renderCellservice(item as Service, columnKey as string)}</TableCell>}
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
        </PrivateRoute>
    )
}