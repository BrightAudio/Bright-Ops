"use client";

import { useEffect, useState } from "react";
import MySchedule from "@/components/MySchedule";
import Tasks from "@/components/Tasks";
import OpenInvoices from "@/components/OpenInvoices";
import GigCalendar from "@/components/GigCalendar";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  // Get user's organization
  useEffect(() => {
    async function getOrganization() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          // Organization loaded, can proceed
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setLoading(false);
      }
    }

    getOrganization();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4 md:mb-6">
          Dashboard
        </h1>

        {/* Dashboard grid with 2-column layout (responsive) */}
        <div className="dashboard-grid grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <MySchedule />
          <Tasks />
          <OpenInvoices />
        </div>

        {/* Gig Calendar - Full Width */}
        <div className="mt-4 md:mt-6">
          <GigCalendar />
        </div>
      </div>
    </DashboardLayout>
  );
}
