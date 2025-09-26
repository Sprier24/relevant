"use client";
import { useState, useEffect, useCallback, ChangeEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { Trash2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from "jspdf";
import PrivateRoute from "@/components/PrivateRoute";

interface Contact {
    id: string;
    firstName: string;
    contactNo: string;
    companyName?: string;
}
interface EngineerRemark {
    serviceSpares: string;
    partNo: string;
    rate: string;
    quantity: string;
    total: string;
    poNo: string;
}
interface ServiceRequest {
    id: string;
    serviceId?: string;
    customerName: string;
    customerLocation: string;
    contactPerson: string;
    contactNumber: string;
    serviceEngineer: string;
    serviceEngineerId?: string;
    date: string;
    place: string;
    placeOptions: string;
    natureOfJob: string;
    reportNo: string;
    makeModelNumberoftheInstrumentQuantity: string;
    serialNumberoftheInstrumentCalibratedOK: string;
    serialNumberoftheFaultyNonWorkingInstruments: string;
    engineerReport: string;
    customerReport: string;
    engineerRemarks: EngineerRemark[];
    engineerName: string;
    engineerId?: string;
    status: string;
}
interface ServiceResponse {
    serviceId: string;
    message: string;
    downloadUrl: string;
}
interface Engineer {
    id: string;
    name: string;
}
interface ServiceEngineer {
    id: string;
    name: string;
}

const initialFormData: ServiceRequest = {
    id: "",
    customerName: "",
    customerLocation: "",
    contactPerson: "",
    contactNumber: "",
    serviceEngineer: "",
    date: new Date().toISOString().split('T')[0],
    place: "",
    placeOptions: "At Site",
    natureOfJob: "AMC",
    reportNo: "",
    makeModelNumberoftheInstrumentQuantity: "",
    serialNumberoftheInstrumentCalibratedOK: "",
    serialNumberoftheFaultyNonWorkingInstruments: "",
    engineerReport: "",
    customerReport: "",
    engineerRemarks: [{ serviceSpares: "", partNo: "", rate: "", quantity: "", poNo: "", total: "" }],
    engineerName: "",
    status: "checked"
};



export default function ServiceFormWrapper() {
    return (
        <Suspense fallback={<ServiceFormLoading />}>
            <GenerateService />
        </Suspense>
    );
}

function ServiceFormLoading() {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            <span className="ml-4">Loading Service form...</span>
        </div>
    );
}


function GenerateService() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const serviceId = searchParams.get('id');
    const isEditMode = !!serviceId;
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState<string>(today);
    const [formData, setFormData] = useState<ServiceRequest>(initialFormData);
    const [contactPersons, setContactPersons] = useState<Contact[]>([]);
    const [service, setService] = useState<ServiceResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [engineers, setEngineers] = useState<Engineer[]>([]);
    const [serviceEngineers, setServiceEngineers] = useState<ServiceEngineer[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [isLoadingEngineers, setIsLoadingEngineers] = useState(true);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSendingPDF, setIsSendingPDF] = useState(false);

    const generateReportNo = useCallback(async (increment: boolean = false) => {
        try {
            const response = await fetch("/api/service_report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ increment }), // Pass increment flag to backend
            });

            if (!response.ok) throw new Error("Failed to generate service report number");

            const data = await response.json();
            return data.serviceReportNo;
        } catch (error) {
            console.error("Error generating service report number:", error);

            // Fallback logic (same as certificate number logic)
            const now = new Date();
            const currentYear = now.getFullYear();
            const shortStartYear = String(currentYear).slice(-2);
            const shortEndYear = String(currentYear + 1).slice(-2);
            const yearRange = `${shortStartYear}-${shortEndYear}`;

            const randomNum = Math.floor(Math.random() * 9999) + 1;
            const padded = String(randomNum).padStart(4, "0");

            return `RPS/SER/${yearRange}/${padded}`;
        }
    }, []);




    const fetchContactPersons = useCallback(async () => {
        setIsLoadingContacts(true);
        try {
            const response = await axios.get("/api/contact", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            const data = Array.isArray(response.data?.data)
                ? response.data.data
                : Array.isArray(response.data)
                    ? response.data
                    : [];

            setContactPersons(data);
            setFilteredContacts(data);
        } catch (error) {
            console.error("Error fetching contact", error);
            toast({
                title: "Failed to load contact",
                variant: "destructive",
            });
            setContactPersons([]);
            setFilteredContacts([]);
        } finally {
            setIsLoadingContacts(false);
        }
    }, []);

    const fetchEngineers = useCallback(async () => {
        try {
            const res = await fetch("/api/engineers");
            const data = await res.json();
            setEngineers(Array.isArray(data) ? data : []);
        } catch (error) {
            toast({
                title: "Failed to load engineers",
                variant: "destructive"
            });
        }
    }, []);

    const fetchServiceEngineers = useCallback(async () => {
        try {
            const res = await fetch("/api/service-engineers");
            const data = await res.json();
            setServiceEngineers(Array.isArray(data) ? data : []);
        } catch (error) {
            toast({
                title: "Failed to load service engineers",
                variant: "destructive"
            });
        } finally {
            setIsLoadingEngineers(false);
        }
    }, []);

    const fetchServiceData = useCallback(async () => {
        if (!isEditMode) return;
        try {
            setLoading(true);
            const response = await axios.get(`/api/services?id=${serviceId}`);
            const serviceData = response.data;

            let engineerRemarks: EngineerRemark[] = [];

            try {
                if (typeof serviceData.engineer_remarks === 'string') {
                    engineerRemarks = JSON.parse(serviceData.engineer_remarks);
                } else if (Array.isArray(serviceData.engineer_remarks)) {
                    engineerRemarks = serviceData.engineer_remarks;
                } else if (Array.isArray(serviceData.engineerRemarks)) {
                    engineerRemarks = serviceData.engineerRemarks;
                }
            } catch (e) {
                console.error("Error parsing engineer remarks", e);
                engineerRemarks = [{ serviceSpares: "", partNo: "", rate: "", quantity: "", total: "", poNo: "" }];
            }

            // Ensure we have at least one empty remark if none exist
            if (engineerRemarks.length === 0) {
                engineerRemarks = [{ serviceSpares: "", partNo: "", rate: "", quantity: "", total: "", poNo: "" }];
            }

            setFormData({
                id: serviceData.id || serviceData._id || '',
                serviceId: serviceData.serviceId || serviceData.id || serviceData._id || '',
                customerName: serviceData.customer_name || '',
                customerLocation: serviceData.customer_location || '',
                contactPerson: serviceData.contact_person || '',
                contactNumber: serviceData.contact_number || serviceData.contactNo || '',
                serviceEngineer: serviceData.service_engineer || '',
                serviceEngineerId: serviceData.serviceEngineerId || serviceData.service_engineer_id || '',
                date: serviceData.date
                    ? new Date(serviceData.date).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                place: serviceData.place || '',
                placeOptions: serviceData.place_options || "At Site",
                natureOfJob: serviceData.nature_of_Job || "AMC",
                reportNo: serviceData.report_no || generateReportNo(),
                makeModelNumberoftheInstrumentQuantity:
                    serviceData.make_model_number_of_the_instrument_quantity ||
                    serviceData.makeModelNumber ||
                    serviceData.instrumentDetails || '',
                serialNumberoftheInstrumentCalibratedOK:
                    serviceData.serial_number_of_the_instrument_calibrated_ok ||
                    serviceData.serialNumberCalibrated ||
                    serviceData.calibratedInstruments || '',
                serialNumberoftheFaultyNonWorkingInstruments:
                    serviceData.serial_number_of_the_faulty_non_working_instruments ||
                    serviceData.serialNumberFaulty ||
                    serviceData.faultyInstruments || '',
                engineerReport: serviceData.engineer_report || '',
                customerReport: serviceData.customer_report || '',
                engineerRemarks: engineerRemarks.map((remark: any) => ({
                    serviceSpares: remark.serviceSpares || '',
                    partNo: remark.partNo || '',
                    rate: remark.rate?.toString() || '0',
                    quantity: remark.quantity?.toString() || '0',
                    total: remark.total?.toString() ||
                        (Number(remark.rate || 0) * Number(remark.quantity || 0)).toString(),
                    poNo: remark.poNo || ''
                })),
                engineerName: serviceData.engineer_name || '',
                engineerId: serviceData.engineerId || '',
                status: serviceData.status || "checked"
            });
        } catch (error) {
            console.error("Error fetching service data", error);
            toast({
                title: "Failed to load service data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [isEditMode, serviceId, generateReportNo]);


    useEffect(() => {
        if (!serviceId) {
            generateReportNo(false).then((number) => {
                setFormData(prev => ({
                    ...prev,
                    reportNo: number
                }));
            });
        }
    }, [serviceId]);


    useEffect(() => {
        fetchContactPersons();
        fetchEngineers();
        fetchServiceEngineers();
        if (isEditMode) fetchServiceData();
    }, [fetchContactPersons, fetchEngineers, fetchServiceEngineers, fetchServiceData, isEditMode]);

    useEffect(() => {
        if (!Array.isArray(contactPersons)) {
            setFilteredContacts([]);
            return;
        }
        const customerNameInput = formData.customerName.trim().toLowerCase();
        setFilteredContacts(
            customerNameInput.length > 0
                ? contactPersons.filter(person =>
                    (person.companyName || '').toLowerCase().includes(customerNameInput) ||
                    (person.firstName || '').toLowerCase().includes(customerNameInput)
                )
                : contactPersons
        );
    }, [formData.customerName, contactPersons]);

    const handleServiceEngineerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedEngineer = serviceEngineers.find(engineer => engineer.id === selectedId);
        setFormData(prev => ({ ...prev, serviceEngineerId: selectedId, serviceEngineer: selectedEngineer?.name || "" }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEngineerRemarksChange = (index: number, field: keyof EngineerRemark, value: string) => {
        const updatedEngineerRemarks = [...formData.engineerRemarks];
        updatedEngineerRemarks[index] = { ...updatedEngineerRemarks[index], [field]: value };
        if (field === 'rate' || field === 'quantity') {
            const rate = parseFloat(updatedEngineerRemarks[index].rate) || 0;
            const quantity = parseFloat(updatedEngineerRemarks[index].quantity) || 0;
            updatedEngineerRemarks[index].total = (rate * quantity).toString();
        }
        setFormData({ ...formData, engineerRemarks: updatedEngineerRemarks });
    };

    const removeEngineerRemark = (index: number) => {
        const updatedEngineerRemarks = [...formData.engineerRemarks];
        updatedEngineerRemarks.splice(index, 1);
        setFormData({ ...formData, engineerRemarks: updatedEngineerRemarks });
    };

    const addEngineerRemark = () => {
        if (formData.engineerRemarks.length < 10) {
            setFormData({
                ...formData,
                engineerRemarks: [
                    ...formData.engineerRemarks,
                    { serviceSpares: "", partNo: "", rate: "", quantity: "", poNo: "", total: "" }
                ]
            });
        }
    };

    const validateForm = (): boolean => {
        const requiredFields = [
            'customerName', 'customerLocation', 'contactPerson', 'contactNumber',
            'serviceEngineer', 'date', 'place', 'natureOfJob',
            'makeModelNumberoftheInstrumentQuantity', 'serialNumberoftheInstrumentCalibratedOK',
            'serialNumberoftheFaultyNonWorkingInstruments', 'engineerReport', 'engineerName'
        ];
        const missingFields = requiredFields.filter(field => {
            const value = formData[field as keyof typeof formData];
            return typeof value === 'string' ? value.trim() === '' : !value;
        });
        if (missingFields.length > 0) {
            setError(`Please fill all required fields: ${missingFields.join(', ')}`);
            return false;
        }
        const validRemarks = formData.engineerRemarks.filter(remark =>
            remark.serviceSpares?.trim() &&
            remark.partNo?.trim() &&
            remark.rate?.toString().trim() &&
            remark.quantity?.toString().trim() &&
            remark.total?.toString().trim() &&
            remark.poNo?.trim()
        );
        if (validRemarks.length === 0) {
            setError("Please add at least one valid engineer remark");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitted) {
            toast({
                title: "Already Submitted",
                description: "This service has already been submitted. Please create a new entry if needed.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        setError(null);

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            const isEditMode = !!formData.id;
            let reportNo = formData.reportNo;

            if (!isEditMode) {
                if (!reportNo) {
                    reportNo = await generateReportNo(false);
                    setFormData(prev => ({ ...prev, reportNo }));
                }
                reportNo = await generateReportNo(true);
            }

            // Use the date exactly as it comes from the form
            const serviceDate = formData.date || new Date().toISOString().split('T')[0];

            const payload = {
                id: formData.id || uuidv4(),
                serviceId: formData.serviceId || formData.id || uuidv4(),
                customerName: formData.customerName.trim(),
                customerLocation: formData.customerLocation.trim(),
                contactPerson: formData.contactPerson.trim(),
                contactNumber: formData.contactNumber.trim(),
                serviceEngineer: formData.serviceEngineer.trim(),
                serviceEngineerId: formData.serviceEngineerId,
                date: serviceDate, // Use the date from form
                place: formData.place.trim(),
                placeOptions: formData.placeOptions,
                natureOfJob: formData.natureOfJob.trim(),
                reportNo: reportNo.trim(),
                makeModelNumberoftheInstrumentQuantity: formData.makeModelNumberoftheInstrumentQuantity.trim(),
                serialNumberoftheInstrumentCalibratedOK: formData.serialNumberoftheInstrumentCalibratedOK.trim(),
                serialNumberoftheFaultyNonWorkingInstruments: formData.serialNumberoftheFaultyNonWorkingInstruments.trim(),
                engineerReport: formData.engineerReport.trim(),
                customerReport: formData.customerReport?.trim() || "",
                engineerRemarks: formData.engineerRemarks
                    .filter(remark => remark.serviceSpares.trim())
                    .map(remark => ({
                        serviceSpares: remark.serviceSpares.trim(),
                        partNo: remark.partNo.trim(),
                        rate: remark.rate.toString().trim(),
                        quantity: Number(remark.quantity),
                        total: remark.total.toString().trim(),
                        poNo: remark.poNo.trim()
                    })),
                engineerName: formData.engineerName.trim(),
                engineerId: formData.engineerId,
                status: formData.status || "checked"
            };

            const response = await axios({
                method: isEditMode ? 'put' : 'post',
                url: isEditMode ? `/api/services?id=${formData.id}` : '/api/services',
                data: payload,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'application/json',
                }
            });

            setIsSubmitted(true);
            setService({
                serviceId: response.data.id || formData.id || uuidv4(),
                message: isEditMode ? "Service updated successfully" : "Service created successfully",
                downloadUrl: response.data.downloadUrl || ""
            });

            if (!isEditMode) {
                setFormData(prev => ({
                    ...prev,
                    id: response.data.id || prev.id,
                    serviceId: response.data.id || prev.id,
                    reportNo: reportNo.trim()
                }));
            }

            toast({
                title: isEditMode ? "Service updated successfully" : "Service created successfully",
                variant: "default",
            });

        } catch (err: any) {
            console.error("API Error:", err);
            setError(err.response?.data?.error ||
                (formData.id ? "Failed to update service" : "Failed to create service"));
            toast({
                title: "Error",
                description: err.response?.data?.error || "An error occurred",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };



    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            toast({
                title: "Error Form Submission",
                description: "Please use the submit button to submit the form",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setFormData({
            id: "",
            serviceId: "",
            reportNo: "",
            customerName: "",
            customerLocation: "",
            contactPerson: "",
            status: "",
            contactNumber: "",
            serviceEngineer: "",
            serviceEngineerId: "",
            date: "",
            place: "",
            placeOptions: "",
            natureOfJob: "",
            makeModelNumberoftheInstrumentQuantity: "",
            serialNumberoftheInstrumentCalibratedOK: "",
            serialNumberoftheFaultyNonWorkingInstruments: "",
            engineerReport: "",
            customerReport: "",
            engineerRemarks: [],
            engineerName: "",
            engineerId: "",
        });

        // Reset any additional UI state if needed
        setIsSubmitted(false);
    };


    const handleDownload = async (serviceId: string) => {
        if (!serviceId) {
            toast({
                title: "Error",
                description: "No service ID available",
                variant: "destructive",
            });
            return;
        }

        setIsSendingPDF(true);

        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Load images
            const logo = new Image();
            logo.src = "/img/rps.png";
            const footerImg = new Image();
            footerImg.src = "/img/handf.png";

            await new Promise<void>((resolve, reject) => {
                let loaded = 0;
                const checkLoaded = () => {
                    loaded++;
                    if (loaded === 2) resolve();
                };
                logo.onload = checkLoaded;
                footerImg.onload = checkLoaded;
                logo.onerror = reject;
                footerImg.onerror = reject;
            });

            const leftMargin = 15;
            const rightMargin = 15;
            const topMargin = 20;
            const contentWidth = pageWidth - leftMargin - rightMargin;
            let y = topMargin;

            const checkPageBreak = (blockHeight = 10) => {
                if (y + blockHeight > pageHeight - 30) {
                    doc.addPage();
                    y = topMargin;
                    doc.addImage(logo, "PNG", 5, 5, 50, 15); // Add logo on new page
                    y = 40;
                }
            };

            const formatDate = (inputDate: string | undefined): string => {
                if (!inputDate) return "N/A";
                const d = new Date(inputDate);
                return isNaN(d.getTime())
                    ? "N/A"
                    : `${String(d.getDate()).padStart(2, "0")} - ${String(d.getMonth() + 1).padStart(2, "0")} - ${d.getFullYear()}`;
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

            addRow("Report No.", formData.reportNo);
            addRow("Customer Name", formData.customerName);
            addRow("Customer Location", formData.customerLocation);
            addRow("Contact Person", formData.contactPerson);
            addRow("Status", formData.status);
            addRow("Contact Number", formData.contactNumber);
            addRow("Service Engineer", formData.serviceEngineer);
            addRow("Date", formatDate(formData.date));
            addRow("Place", formData.place);
            addRow("Place Options", formData.placeOptions);
            addRow("Nature of Job", formData.natureOfJob);
            addRow("Make & Model Number", formData.makeModelNumberoftheInstrumentQuantity);
            y += 5;
            addRow("Calibrated & Tested OK", formData.serialNumberoftheInstrumentCalibratedOK);
            addRow("Sr.No Faulty/Non-Working", formData.serialNumberoftheFaultyNonWorkingInstruments);
            y += 10;

            doc.setFont("times", "bold").setFontSize(10).setTextColor(0);
            doc.text("Customer Remarks:", leftMargin, y);
            y += 5;

            const engLines = doc.splitTextToSize(formData.engineerReport || "No report provided", contentWidth - 5);
            const engHeight = engLines.length * 6 + 5;
            checkPageBreak(engHeight);
            doc.rect(leftMargin, y, contentWidth, engHeight);
            doc.setFont("times", "normal").setFontSize(9);
            doc.text(engLines, leftMargin + 2, y + 5);
            y += engHeight + 5;

            // Add new page for ENGINEER REMARKS
            doc.addPage();
            y = topMargin;
            doc.addImage(logo, "PNG", 5, 5, 50, 15); // Add logo on new page
            y = 40;

            doc.setFont("times", "bold").setFontSize(10).setTextColor(0);
            doc.text("ENGINEER REMARKS", leftMargin, y);
            y += 8;

            const headers = ["Sr. No.", "Service/Spares", "Part No.", "Rate", "Quantity", "Total", "PO No."];
            const colWidths = [15, 50, 25, 20, 20, 25, 25];
            let x = leftMargin;

            headers.forEach((header, i) => {
                doc.rect(x, y, colWidths[i], 8);
                doc.text(header, x + 2, y + 6);
                x += colWidths[i];
            });
            y += 8;

            doc.setFont("times", "normal").setFontSize(9);
            formData.engineerRemarks.forEach((item, index) => {
                const rowData = [
                    String(index + 1),
                    item.serviceSpares || "",
                    item.partNo || "",
                    item.rate || "",
                    item.quantity || "",
                    item.total || "",
                    item.poNo || ""
                ];
                const cellLines = rowData.map((text, i) => doc.splitTextToSize(text, colWidths[i] - 4));
                const rowHeight = Math.max(...cellLines.map(lines => lines.length)) * 7;
                checkPageBreak(rowHeight);
                x = leftMargin;
                cellLines.forEach((lines, i) => {
                    doc.rect(x, y, colWidths[i], rowHeight);
                    doc.text(lines, x + 1, y + 5);
                    x += colWidths[i];
                });
                y += rowHeight;
            });

            y += 10;
            doc.setFont("times", "bold").setFontSize(10);
            doc.text("Customer Report:", leftMargin, y);
            y += 5;
            const custLines = doc.splitTextToSize(formData.customerReport || "No report provided", contentWidth - 5);
            const custHeight = custLines.length * 6 + 5;
            checkPageBreak(custHeight);
            doc.rect(leftMargin, y, contentWidth, custHeight);
            doc.setFont("times", "normal").setFontSize(9);
            doc.text(custLines, leftMargin + 2, y + 5);
            y += custHeight + 35;

            doc.text("Customer Name,Seal & Sign", leftMargin, y);
            doc.text("Service Engineer,Seal & Sign", pageWidth - rightMargin - 40, y);
            doc.text(formData.serviceEngineer || "", pageWidth - rightMargin - 40, y + 5);

            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, "0");
            const date = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
            const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            doc.setFontSize(9).setTextColor(100);
            doc.text(`Report Generated On: ${date} ${time}`, leftMargin, pageHeight - 30);

            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.addImage(footerImg, "PNG", (pageWidth - 180) / 2, pageHeight - 20, 180, 15);
            }

            const pdfBlob = doc.output("blob");
            const base64data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result?.toString().split(",")[1];
                    if (base64) resolve(base64);
                    else reject("Base64 conversion failed");
                };
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
            });

            await axios.post("/api/send-service", {
                serviceId: formData.id || formData.serviceId || uuidv4(),
                pdfData: base64data,
                customerName: formData.customerName,
            });

            doc.save(`service-${serviceId}.pdf`);

            const updatedReportNo = await generateReportNo(true);
            setFormData(prev => ({
                ...prev,
                reportNo: updatedReportNo,
            }));

            resetForm();

            toast({
                title: "Success",
                description: "PDF downloaded and sent via email",
            });

        } catch (err: any) {
            console.error("Error sending PDF:", err);
            toast({
                title: "Error",
                description: err?.message || "Failed to send PDF",
                variant: "destructive",
            });
        } finally {
            setIsSendingPDF(false);
        }
    };










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
                                        <BreadcrumbLink href="/user/servicerecord">
                                            Service Record
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </header>

                    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 pt-15">
                        <Card className="max-w-6xl mx-auto">
                            <CardHeader>
                                <CardTitle className="text-3xl font-bold text-center">
                                    {isEditMode ? "Update Service" : "Create Service"}
                                </CardTitle>
                                <CardDescription className="text-center">
                                    {isEditMode
                                        ? "Modify the service details below"
                                        : "Fill out the form below to create a new service"}
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                name="customerName"
                                                placeholder="Customer Name"
                                                value={formData.customerName}
                                                onChange={e => (handleChange(e), setShowDropdown(true))}
                                                onFocus={() => setShowDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                                className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                                required
                                            />
                                            {showDropdown && (
                                                <ul className="absolute left-0 top-full mt-1 z-20 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-y-auto">
                                                    {isLoadingContacts ? (
                                                        <li className="px-4 py-2 text-gray-500">Start typing to search company</li>
                                                    ) : filteredContacts.length > 0 ? (
                                                        filteredContacts.map((contact) => (
                                                            <li
                                                                key={contact.id}
                                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                                                onClick={() => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        customerName: contact.companyName || "",
                                                                        contactPerson: contact.firstName || "",
                                                                        contactNumber: contact.contactNo || "",
                                                                    }));
                                                                    setShowDropdown(false);
                                                                }}
                                                            >
                                                                <div className="font-medium">{contact.companyName || "No company"}</div>
                                                                <div className="text-sm text-gray-600">
                                                                    {`Contact: ${contact.firstName} | Phone: ${contact.contactNo}`}
                                                                </div>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="px-4 py-2 text-gray-500">
                                                            {contactPersons.length === 0
                                                                ? "Create customer and add data"
                                                                : "No matching contact found"}
                                                        </li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            name="customerLocation"
                                            placeholder="Site Location"
                                            value={formData.customerLocation}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            placeholder="Contact Person"
                                            value={formData.contactPerson}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                        <input
                                            type="tel"
                                            name="contactNumber"
                                            placeholder="Contact Number"
                                            value={formData.contactNumber}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        >
                                            <option value="checked">Checked</option>
                                            <option value="unchecked">Unchecked</option>
                                        </select>
                                        <select
                                            name="serviceEngineerId"
                                            value={formData.serviceEngineerId || ""}
                                            onChange={handleServiceEngineerChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                            disabled={isLoadingEngineers}
                                        >
                                            <option value="">{isLoadingEngineers ? "Loading engineers..." : "Select Service Engineer"}</option>
                                            {serviceEngineers.map((engineer) => (
                                                <option key={engineer.id} value={engineer.id}>
                                                    {engineer.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleChange}
                                            className="p-2 rounded-md border bg-gray-300"

                                        />
                                        <input
                                            type="text"
                                            name="place"
                                            placeholder="Enter Place"
                                            value={formData.place}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <label className="font-medium text-black">Place :</label>
                                        <div className="flex gap-4">
                                            {["At Site", "In House"].map((option) => (
                                                <label key={option} className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="placeOptions"
                                                        value={option}
                                                        checked={formData.placeOptions === option}
                                                        onChange={handleChange}
                                                        className={`
                        appearance-none w-4 h-4 border border-gray-400 rounded-full mr-2
                        checked:bg-blue-600 checked:border-blue-600
                        transition-colors duration-200
                    `}
                                                        style={{
                                                            backgroundColor:
                                                                formData.placeOptions === option ? "#2563EB" : "#ffffff",
                                                        }}
                                                    />
                                                    <span className="text-black">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <label className="font-medium text-black">Nature of Job :</label>
                                        <div className="flex gap-4 flex-wrap">
                                            {["AMC", "Charged", "Warranty"].map((option) => (
                                                <label key={option} className="flex items-center cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="natureOfJob"
                                                        value={option}
                                                        checked={formData.natureOfJob === option}
                                                        onChange={handleChange}
                                                        className={`
                        appearance-none w-4 h-4 border border-gray-400 rounded-full mr-2
                        checked:bg-blue-600 checked:border-blue-600
                        transition-colors duration-200
                    `}
                                                        style={{
                                                            backgroundColor:
                                                                formData.natureOfJob === option ? "#2563EB" : "#ffffff",
                                                        }}
                                                    />
                                                    <span className="text-black">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <input
                                            type="text"
                                            name="reportNo"
                                            placeholder="Report Number"
                                            value={formData.reportNo}
                                            onChange={handleChange}
                                            readOnly
                                            className="bg-gray-100 text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                        />
                                        <select
                                            name="engineerName"
                                            value={formData.engineerName}
                                            onChange={handleChange}
                                            className="bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        >
                                            <option value="">Created By</option>
                                            {engineers.map((eng) => (
                                                <option key={eng.id} value={eng.name}>
                                                    {eng.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <input
                                            name="makeModelNumberoftheInstrumentQuantity"
                                            placeholder="Model Number of the Instrument Quantity"
                                            value={formData.makeModelNumberoftheInstrumentQuantity}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                        <input
                                            name="serialNumberoftheInstrumentCalibratedOK"
                                            placeholder="Serial Number of the Instrument Calibrated & OK"
                                            value={formData.serialNumberoftheInstrumentCalibratedOK}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                        <input
                                            name="serialNumberoftheFaultyNonWorkingInstruments"
                                            placeholder="Serial Number of Faulty / Non-Working Instruments"
                                            value={formData.serialNumberoftheFaultyNonWorkingInstruments}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                        <input
                                            name="engineerReport"
                                            placeholder="Engineer Report"
                                            value={formData.engineerReport}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end mb-4">
                                        <button
                                            type="button"
                                            onClick={addEngineerRemark}
                                            className="bg-purple-950 text-white px-4 py-2 border rounded hover:bg-purple-900"
                                            disabled={formData.engineerRemarks.length >= 10}
                                        >
                                            Add Engineer Remark
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="table-auto border-collapse border border-gray-500 rounded w-full">
                                            <thead>
                                                <tr>
                                                    <th className="border p-2">#</th>
                                                    <th className="border p-2">Service / Spares</th>
                                                    <th className="border p-2">Part Number</th>
                                                    <th className="border p-2">Rate</th>
                                                    <th className="border p-2">Quantity</th>
                                                    <th className="border p-2">Total</th>
                                                    <th className="border p-2">PO Number</th>
                                                    <th className="border p-2">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.engineerRemarks.map((engineerRemark, index) => (
                                                    <tr key={index}>
                                                        <td className="border p-2">{index + 1}</td>
                                                        <td className="border p-2">
                                                            <input
                                                                type="text"
                                                                value={engineerRemark.serviceSpares}
                                                                onChange={(e) => handleEngineerRemarksChange(index, 'serviceSpares', e.target.value)}
                                                                className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-1 rounded-md"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="border p-2">
                                                            <input
                                                                type="text"
                                                                value={engineerRemark.partNo}
                                                                onChange={(e) => handleEngineerRemarksChange(index, 'partNo', e.target.value)}
                                                                className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-1 rounded-md"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="border p-2">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={engineerRemark.rate}
                                                                onChange={(e) => handleEngineerRemarksChange(index, 'rate', e.target.value)}
                                                                className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-1 rounded-md"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="border p-2">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={engineerRemark.quantity}
                                                                onChange={(e) => handleEngineerRemarksChange(index, 'quantity', e.target.value)}
                                                                className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-1 rounded-md"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="border p-2">
                                                            <input
                                                                type="text"
                                                                value={engineerRemark.total || ""}
                                                                readOnly
                                                                className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-1 rounded-md"
                                                            />
                                                        </td>
                                                        <td className="border p-2">
                                                            <input
                                                                type="text"
                                                                value={engineerRemark.poNo}
                                                                onChange={(e) => handleEngineerRemarksChange(index, 'poNo', e.target.value)}
                                                                className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-1 rounded-md"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="border p-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeEngineerRemark(index)}
                                                                className="text-black-600 hover:text-black-800"
                                                                aria-label="Remove remark"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {formData.engineerRemarks.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="border p-2 text-center text-gray-500">
                                                            Click "Add Engineer Remark" to add one
                                                        </td>
                                                    </tr>
                                                )}
                                                {formData.engineerRemarks.length >= 10 && (
                                                    <tr>
                                                        <td colSpan={8} className="border p-2 text-center text-yellow-600">
                                                            Maximum limit of 10 engineer remarks reached.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <input
                                            name="customerReport"
                                            placeholder="Customer Report"
                                            value={formData.customerReport}
                                            onChange={handleChange}
                                            className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black p-2 rounded-md"
                                        />
                                    </div>

                                    {error && (
                                        <div className="text-red-500 text-sm p-2 border border-red-300 rounded bg-red-50">
                                            {error}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className={`bg-purple-950 text-white p-2 rounded-md w-full ${loading ? "opacity-75" : isSubmitted ? "bg-purple-950950" : "hover:bg-purple-900"
                                            }`}
                                        disabled={loading || isSubmitted}
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center">
                                                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                                                Generating...
                                            </span>
                                        ) : "Generate Certificate"}
                                    </button>
                                </form>

                               
                                {(service?.serviceId || formData.id) && (
                                    <div className="mt-4 flex justify-center"> {/* Changed from text-center to flex justify-center */}
                                        <div className="text-center"> {/* Added an inner div for text alignment */}
                                            <p className="text-green-600 mb-2">Service report ready for download</p>
                                            <button
                                                onClick={() => handleDownload(service?.serviceId || formData.id)}
                                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center justify-center"
                                                disabled={isGeneratingPDF}
                                            >
                                                {isGeneratingPDF ? (
                                                    <span className="flex items-center justify-center">
                                                        <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                                                        Generating PDF...
                                                    </span>
                                                ) : "Download Service Report & Send Email"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </PrivateRoute>
    );
}