import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { Sidebar } from "@/components/ui/Sidebar";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { OutletProvider } from "@/context/OutletContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <OutletProvider initialUser={user}>
      <div className="min-h-screen bg-cream flex flex-col font-sans">
        {/* Top Demo Banner */}
        <DemoBanner currentUser={user} />

        {/* Main Header */}
        <BrandHeader user={user} />

        {/* Body Layout */}
        <div className="flex-1 flex">
          <Sidebar userRole={user.role} />

          <main className="flex-1 lg:pl-64 flex flex-col">
            <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OutletProvider>
  );
}
