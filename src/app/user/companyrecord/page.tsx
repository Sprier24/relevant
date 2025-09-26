'use client';
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SearchIcon, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Pagination, Tooltip } from "@heroui/react";
import { AppSidebar } from "@/components/app-sidebar";
import PrivateRoute from "@/components/PrivateRoute";

interface Company {
    id: string;
    company_name: string;
    address: string;
    gst_number: string;
    industries: string;
    website: string;
    industries_type: string;
    flag: string;
    createdAt: string; // Ensure this field exists in your data
}

interface SortDescriptor {
    column: string;
    direction: "ascending" | "descending";
}

const columns = [
    { name: "Company Name", uid: "company_name", sortable: true, width: "120px" },
    { name: "Company Address", uid: "address", sortable: true, width: "120px" },
    { name: "Industries", uid: "industries", sortable: true, width: "120px" },
    { name: "Industries Type", uid: "industries_type", sortable: true, width: "120px" },
    { name: "GST Number", uid: "gst_number", sortable: true, width: "120px" },
    { name: "Website", uid: "website", sortable: true, width: "120px" },
    { name: "Flag", uid: "flag", sortable: true, width: "120px" },
];

const INITIAL_VISIBLE_COLUMNS = ["company_name", "address", "gst_number", "industries", "website", "industries_type", "flag"];

const companiesSchema = z.object({
    companyName: z.string().min(1, { message: "Company name is required" }),
    address: z.string().min(1, { message: "Address is required" }),
    industries: z.string().min(1, { message: "Industries is required" }),
    industriesType: z.string().min(1, { message: "Industry type is required" }),
    gstNumber: z.string().min(1, { message: "GST number is required" }),
    website: z.preprocess(val => (val === "" ? undefined : val), z.string().url({ message: "Invalid website URL" }).optional()),
    flag: z.enum(["Red", "Yellow", "Green"], { required_error: "Please select a flag color" }),
});

export default function CompanyDetailsTable() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [filterValue, setFilterValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: "createdAt", direction: "descending" });
    const router = useRouter();
    const hasSearchFilter = Boolean(filterValue);

    useEffect(() => {
        const fetchCompanies = async () => {
            setIsSubmitting(true);
            try {
                const res = await axios.get('/api/companies');
                const sortedData = res.data.sort((a: Company, b: Company) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateB.getTime() - dateA.getTime(); // Sort descending
                });
                setCompanies(sortedData);
            } catch (err: any) {
                console.error("Error fetching company", err);
                toast({
                    title: 'Failed to fetch company',
                    variant: 'destructive',
                });
            } finally {
                setIsSubmitting(false);
            }
        };
        fetchCompanies();
    }, []);

    const handleDelete = useCallback((companyId: string) => {
        if (!companyId) {
            console.error("No company ID provided for deletion");
            return;
        }
        const confirmed = window.confirm("Are you sure you want to delete this company?");
        if (!confirmed) return;
        setIsSubmitting(true);
        fetch(`/api/companies?id=${companyId}`, {
            method: "DELETE",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.message === "Company deleted successfully") {
                    setCompanies(prev => prev.filter(company => company.id !== companyId));
                    toast({
                        title: "Company deleted successfully",
                        variant: "default",
                    });
                } else {
                    toast({
                        title: "Failed to delete company",
                        variant: "destructive",
                    });
                }
            })
            .catch((error) => {
                console.error("Error deleting company", error);
                toast({
                    title: "Failed to delete company",
                    variant: "destructive",
                });
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }, []);

    const filteredItems = React.useMemo(() => {
        let filtered = [...companies];
        if (hasSearchFilter) {
            const searchLower = filterValue.toLowerCase();
            filtered = filtered.filter(company =>
                (company.company_name?.toLowerCase() ?? "").includes(searchLower) ||
                (company.address?.toLowerCase() ?? "").includes(searchLower) ||
                (company.industries?.toLowerCase() ?? "").includes(searchLower) ||
                (company.industries_type?.toLowerCase() ?? "").includes(searchLower) ||
                (company.gst_number?.toLowerCase() ?? "").includes(searchLower) ||
                (company.website?.toLowerCase() ?? "").includes(searchLower) ||
                (company.flag?.toLowerCase() ?? "").includes(searchLower)
            );
        }
        return filtered;
    }, [companies, filterValue, hasSearchFilter]);

    const sortedItems = React.useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const first = a[sortDescriptor.column as keyof Company] || "";
            const second = b[sortDescriptor.column as keyof Company] || "";
            let cmp = 0;
            if (first < second)

            cmp = -1;
            if (first > second)
                cmp = 1;
            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [filteredItems, sortDescriptor]);

    const paginatedItems = [...sortedItems].reverse();

    const topContent = (
        <div className="flex justify-between items-center gap-4 w-full">
            <Input
                isClearable
                className="w-full max-w-[300px]"
                placeholder="Search"
                startContent={<SearchIcon className="h-4 w-5 text-muted-foreground" />}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onClear={() => setFilterValue("")}
            />
            <span className="text-default-400 text-sm whitespace-nowrap">
                Total {filteredItems.length} {filteredItems.length === 1 ? "Company" : "Companies"}
            </span>
        </div>
    );

    const renderCell = useCallback((company: Company, columnKey: string) => {
        const value = company[columnKey as keyof Company];
        if (columnKey === "gst_number" || columnKey === "website") {
            return value && value.toString().trim() !== "" ? value : "N/A";
        }
        return value;
    }, []);

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
                                    <BreadcrumbLink href="/user/dashboard">Dashboard</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/user/companyform">Create Company</BreadcrumbLink>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 pt-15">
                    <Card className="max-w-6xl mx-auto">
                        <CardHeader>
                            <CardTitle className="text-3xl font-bold text-center">Company Record</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table
                                isHeaderSticky
                                aria-label="Companies table with custom cells, pagination and sorting"
                                classNames={{
                                    wrapper: "max-h-[382px] overflow-y-auto",
                                }}
                                selectedKeys={selectedKeys}
                                sortDescriptor={sortDescriptor}
                                topContent={topContent}
                                topContentPlacement="outside"
                                onSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
                                onSortChange={(descriptor) => {
                                    setSortDescriptor({
                                        column: descriptor.column as string,
                                        direction: descriptor.direction as "ascending" | "descending",
                                    });
                                }}
                            >
                                <TableHeader>
                                    {columns.map((column) => (
                                        <TableColumn
                                            key={column.uid}
                                            allowsSorting={column.sortable}
                                            onClick={() => {
                                                if (!column.sortable) return;
                                                setSortDescriptor(prev => ({
                                                    column: column.uid,
                                                    direction:
                                                        prev.column === column.uid && prev.direction === "ascending"
                                                            ? "descending"
                                                            : "ascending",
                                                }));
                                            }}
                                            style={{ cursor: column.sortable ? "pointer" : "default" }}
                                        >
                                            {column.name}
                                        </TableColumn>
                                    ))}
                                </TableHeader>
                                    <TableBody emptyContent={"No contact found"} items={paginatedItems}>
                                    {paginatedItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-6">
                                                Go to create company and add data
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedItems.map((company) => (
                                            <TableRow key={company.id}>
                                                {columns.map((column) => (
                                                    <TableCell key={column.uid}>
                                                        {renderCell(company, column.uid)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </SidebarInset>
        </SidebarProvider>
        </PrivateRoute>
    );
}
