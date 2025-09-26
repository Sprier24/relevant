import * as React from "react";
import { NavUser } from "@/components/nav-user";
import { NavMain } from "@/components/nav-main";
import { Building2, Files, LayoutDashboard } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/user/dashboard",
      icon: LayoutDashboard,
     
    },
    {
      title: "Company Info",
      url: "#",
      icon: Building2,
      items: [
        {
          title: "Create Company",
          url: "/user/companyform",
        },
        {
          title: "Company Record",
          url: "/user/companyrecord",
        },
        {
          title: "Create Contact",
          url: "/user/contactform",
        },
        {
          title: "Contact Record",
          url: "/user/contactrecord",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: Files,
      items: [
        {
          title: "Create Certificate",
          url: "/user/certificateform",
        },
        {
          title: "Certificate Record",
          url: "/user/certificaterecord",
        },
        {
          title: "Create Service",
          url: "/user/serviceform",
        },
        {
          title: "Service Record",
          url: "/user/servicerecord",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
