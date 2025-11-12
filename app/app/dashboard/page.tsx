import MySchedule from "@/components/MySchedule";
import Tasks from "@/components/Tasks";
import OpenInvoices from "@/components/OpenInvoices";
import GigCalendar from "@/components/GigCalendar";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
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
