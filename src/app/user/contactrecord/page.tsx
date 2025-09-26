'use client';
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { SearchIcon, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { AppSidebar } from "@/components/app-sidebar";

interface ContactPerson {
  id: string;
  first_name: string;
  contact_no: string;
  email: string;
  designation: string;
  company_id: string;
  key?: string;
  createdAt: string;
}
interface companies {
  id: string;
  company_name?: string;
  companyName?: string;
}
interface SortDescriptor {
  column: string;
  direction: "ascending" | "descending";
}

const columns = [
  { name: "Customer Name", uid: "first_name", sortable: true, width: "120px" },
  { name: "Company Name", uid: "company_id", sortable: true, width: "120px" },
  { name: "Contact Number", uid: "contact_no", sortable: true, width: "120px" },
  { name: "Email Address", uid: "email", sortable: true, width: "120px" },
  { name: "Designation", uid: "designation", sortable: true, width: "120px" },
];
const INITIAL_VISIBLE_COLUMNS = ["first_name", "contact_no", "email", "designation", "company_id"];

export default function ContactRecordTable() {
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [companies, setCompanies] = useState<companies[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [filterValue, setFilterValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: "createdAt", direction: "descending" });
  const router = useRouter();
  const hasSearchFilter = Boolean(filterValue);

  useEffect(() => {
    const fetchData = async () => {
      setIsSubmitting(true);
      try {
        const [contactsRes, companiesRes] = await Promise.all([
          axios.get('/api/contactPersons'),
          axios.get('/api/companies')
        ]);
        console.log(contactsRes.data);
        setContactPersons(contactsRes.data);
        setCompanies(companiesRes.data);
      } catch (err: any) {
        console.error("Error fetching data", err);
        toast({
          title: 'Failed to fetch data',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    };
    fetchData();
  }, []);

  const getCompanyName = (companyId: string): string => {
    const company = companies.find(c => c.id === companyId);
    return company?.company_name || company?.companyName || "Unknown";
  };

  const handleDelete = useCallback((contactId: string) => {
    if (!contactId) return;
    fetch(`/api/contactpersons?id=${contactId}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Contact deleted successfully") {
          alert("Contact deleted successfully");
          setContactPersons(prev => prev.filter(c => c.id !== contactId));
        } else {
          alert("Failed to delete contact");
        }
      })
      .catch((error) => {
        console.error("Error deleting contact", error);
        alert("Error deleting contact");
      });
  }, []);

  const filteredItems = React.useMemo(() => {
    let filtered = [...contactPersons];
    if (hasSearchFilter) {
      const searchLower = filterValue.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.first_name.toLowerCase().includes(searchLower) ||
        contact.contact_no.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower) ||
        contact.designation.toLowerCase().includes(searchLower) ||
        getCompanyName(contact.company_id).toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [contactPersons, filterValue, hasSearchFilter, companies]);

  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof ContactPerson] || "";
      const second = b[sortDescriptor.column as keyof ContactPerson] || "";
      let cmp = 0;
      if (first < second) cmp = -1;
      if (first > second) cmp = 1;
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
        Total {filteredItems.length} {filteredItems.length === 1 ? "y" : "Contact"}
      </span>
    </div>
  );

  const renderCell = useCallback((contactPerson: ContactPerson, columnKey: string) => {
    if (columnKey === "company_id") {
      return getCompanyName(contactPerson.company_id);
    }
    return contactPerson[columnKey as keyof ContactPerson];
  }, [router, handleDelete, companies]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 transition-[width,height] ease-linear">
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
                  <BreadcrumbLink href="/user/contactform">Create Contact</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 pt-15">
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Contact Record</CardTitle>
            </CardHeader>
            <CardContent>
              <Table
                isHeaderSticky
                aria-label="Contact persons table"
                bottomContentPlacement="outside"
                classNames={{ wrapper: "max-h-[382px] overflow-y-auto" }}
                selectedKeys={selectedKeys}
                sortDescriptor={sortDescriptor}
                topContent={topContent}
                topContentPlacement="outside"
                onSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
                onSortChange={(descriptor) =>
                  setSortDescriptor({
                    column: descriptor.column as string,
                    direction: descriptor.direction as "ascending" | "descending",
                  })
                }
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
                        Go to create contact and add data
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((contactPerson) => (
                      <TableRow key={contactPerson.id}> 
                        {columns.map((column) => (
                          <TableCell key={column.uid}>
                            {renderCell(contactPerson, column.uid)}
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
  );
}
