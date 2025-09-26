'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useState, useEffect,Suspense } from "react";
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
import PrivateRoute from "@/components/PrivateRoute";

const companiesSchema = z.object({
  companyName: z.string().nonempty({ message: "Required" }),
  address: z.string().nonempty({ message: "Required" }),
  industries: z.string().nonempty({ message: "Required" }),
  industriesType: z.string().nonempty({ message: "Required" }),
  gstNumber: z.string().optional(),
  website: z.preprocess(val => (val === "" ? undefined : val), z.string().url({ message: "Invalid Website URL" }).optional()),
  flag: z.enum(["Red", "Yellow", "Green"], { required_error: "Required" }),
});

  export default function CompanyFormWrapper() {
    return (
        <Suspense fallback={<CompanyFormLoading />}>
            <CompanyForm />
        </Suspense>
    );
}

function CompanyFormLoading() {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            <span className="ml-4">Loading company form...</span>
        </div>
    );
}

 function CompanyForm() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('id');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof companiesSchema>>({
    resolver: zodResolver(companiesSchema),
    defaultValues: {
      companyName: "",
      address: "",
      gstNumber: "",
      industries: "",
      website: "",
      industriesType: "",
      flag: undefined,
    },
  });

  useEffect(() => {
    if (companyId) {
      const fetchCompany = async () => {
        try {
          setIsSubmitting(true);
          const res = await axios.get(`/api/companies?id=${companyId}`);
          if (res.data) {
            form.reset({
              companyName: res.data.company_name,
              address: res.data.address,
              gstNumber: res.data.gst_number,
              industries: res.data.industries,
              website: res.data.website || "",
              industriesType: res.data.industries_type,
              flag: res.data.flag,
            });
          }
        } catch (err) {
          console.error(err);
          toast({
            title: "Failed to load company",
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
      };
      fetchCompany();
    }
  }, [companyId, form]);

  const onSubmit = async (values: z.infer<typeof companiesSchema>) => {
    setIsSubmitting(true);
    try {
      if (companyId) {
        const res = await axios.put(`/api/companies?id=${companyId}`, values);
        if (res.status === 200) {
          toast({ title: "Company updated successfully" });
        } else {
          throw new Error("Failed to update company");
        }
      } else {
        const res = await axios.post("/api/companies", {
          ...values,
          id: crypto.randomUUID(),
        });
        if (res.status === 201) {
          toast({ title: "Company created successfully" });
          form.reset();
        } else {
          throw new Error("Failed to create company");
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

  const fieldLabels: Record<string, string> = {
    companyName: "Company Name",
    address: "Company Address",
    industries: "Industries",
    industriesType: "Industries Type",
    gstNumber: "GST Number (Optional)",
    website: "Website (Optional)",
  };

  return (
    <PrivateRoute>
      <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/user/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/user/companyrecord">Company Record</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="container mx-auto py-10 px-4">
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl text-center font-bold">
                {companyId ? "Update Company" : "Create Company"}
              </CardTitle>
              <CardDescription className="text-center">
                {companyId
                  ? "Edit existing company details"
                  : "Fill out the form to add a new company"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {Object.entries(fieldLabels).map(([name, label]) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name as keyof z.infer<typeof companiesSchema>}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={`Enter ${label}`}
                                {...field}
                                className="bg-white"
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                    <FormField
                      control={form.control}
                      name="flag"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flag</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="bg-white border px-3 py-2 rounded-md w-full"
                              disabled={isSubmitting}
                            >
                              <option value="">Select Flag</option>
                              <option value="Red">Red</option>
                              <option value="Yellow">Yellow</option>
                              <option value="Green">Green</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-purple-950 text-white hover:bg-purple-900"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin mr-2" />
                        {companyId ? "Updating..." : "Creating..."}
                      </>
                    ) : companyId ? "Update Company" : "Create Company"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </PrivateRoute>
  );
}
