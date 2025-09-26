'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { AppSidebar } from "@/components/app-sidebar";

interface companies {
  id: string;
  company_name?: string;
  companyName?: string;
}

const contactPersonsSchema = z.object({
  firstName: z.string().nonempty({ message: "Required" }),
  contactNo: z.string().regex(/^\d*$/, { message: "Contact number must be numeric" }).nonempty({ message: "Required" }),
  email: z.string().email({ message: "Invalid email id" }),
  designation: z.string().nonempty({ message: "Required" }),
  company: z.string().nonempty({ message: "Required" }),
  companyId: z.string().nonempty({ message: "Missing company" }),
});

export default function ContactFormWrapper() {
  return (
    <Suspense fallback={<ContactFormLoading />}>
      <ContactForm />
    </Suspense>
  );
}

function ContactFormLoading() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      <span className="ml-4">Loading contact form...</span>
    </div>
  );
}
function ContactForm() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get('id');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<companies[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const form = useForm<z.infer<typeof contactPersonsSchema>>({
    resolver: zodResolver(contactPersonsSchema),
    defaultValues: {
      firstName: "",
      contactNo: "",
      email: "",
      designation: "",
      company: "",
      companyId: "",
    },
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("/api/companies");
        if (res.status === 200) {
          setCompanies(res.data);
        }
      } catch (err) {
        console.error("Error fetching company", err);
        toast({
          title: "Failed to load company",
          variant: "destructive",
        });
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchContact = async () => {
      if (!contactId || contactId === "undefined" || companies.length === 0) return;
      try {
        setIsSubmitting(true);
        const res = await axios.get(`/api/contactPersons?id=${contactId}`);
        if (res.data) {
          const company = companies.find((c) => c.id === res.data.company_id);
          if (company) {
            const companyName = company.company_name || company.companyName || "";
            form.reset({
              firstName: res.data.first_name,
              contactNo: res.data.contact_no,
              email: res.data.email,
              designation: res.data.designation,
              company: companyName,
              companyId: res.data.company_id,
            });
          } else {
            toast({
              title: "Company not found for the contact",
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        toast({
          title: "Failed to load contact",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    };
    fetchContact();
  }, [contactId, companies, form]);

  useEffect(() => {
    if (contactId === "undefined") {
      toast({
        title: "The contact ID in the URL is not valid",
        variant: "destructive",
      });
    }
  }, [contactId]);

  const onSubmit = async (values: z.infer<typeof contactPersonsSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        company: values.companyId,
      };
      if (contactId) {
        const res = await axios.put(`/api/contactPersons?id=${contactId}`, payload);
        if (res.status === 200) {
          toast({ title: "Contact updated successfully" });
        } else {
          throw new Error("Failed to update contact");
        }
      } else {
        const res = await axios.post("/api/contactPersons", payload);
        if (res.status === 201) {

          toast({ title: "Contact created successfully" });
          form.reset();
        } else {
          throw new Error("Failed to create contact");
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
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
                  <BreadcrumbLink href="/user/contactrecord">Contact Record</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 pt-15">
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">
                {contactId ? "Update Contact" : "Create Contact"}
              </CardTitle>
              <CardDescription className="text-center">
                {contactId ? "Edit existing contact details" : "Fill out the form below to create a new contact"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Customer Name" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Enter Company Name"
                                {...field}
                                disabled={isSubmitting}
                                autoComplete="off"
                                onChange={(e) => {
                                  field.onChange(e);
                                  setShowCompanyDropdown(true);
                                }}
                              />
                              {showCompanyDropdown && field.value && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-40 overflow-auto">
                                  {companies
                                    .filter((company) => {
                                      const name = company.company_name || company.companyName || "";
                                      return name.toLowerCase().includes(field.value.toLowerCase());
                                    })
                                    .map((company) => {
                                      const name = company.company_name || company.companyName || "";
                                      return (
                                        <div
                                          key={company.id}
                                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                          onClick={() => {
                                            form.setValue("company", name);
                                            form.setValue("companyId", company.id);
                                            setShowCompanyDropdown(false);
                                          }}
                                        >
                                          {name}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contactNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter Contact Number"
                              {...field}
                              disabled={isSubmitting}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/\D/g, '');
                                field.onChange(numericValue);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Email Address" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Designation" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem style={{ display: 'none' }}>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <CardFooter className="px-0">
                    <Button type="submit" className="w-full bg-purple-950 text-white hover:bg-purple-900" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin mr-2" />
                          {contactId ? "Updating..." : "Creating..."}
                        </>
                      ) : contactId ? "Update Contact" : "Create Contact"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
