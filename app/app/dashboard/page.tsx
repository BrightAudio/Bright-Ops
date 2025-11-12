import MySchedule from "@/components/MySchedule";
import Tasks from "@/components/Tasks";
import OpenInvoices from "@/components/OpenInvoices";
import GigCalendar from "@/components/GigCalendar";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div style={{ padding: '1.5rem' }}>
        <h1 style={{ 
          fontSize: '1.75rem', 
          fontWeight: 600, 
          color: 'var(--color-text-main)', 
          marginBottom: '1.5rem' 
        }}>
          Dashboard
        </h1>
        
        {/* Dashboard grid with 2-column layout (responsive) */}
        <div className="dashboard-grid">
          <MySchedule />
          <Tasks />
          <OpenInvoices />
        </div>

        {/* Gig Calendar - Full Width */}
        <div className="mt-6">
          <GigCalendar />
        </div>
      </div>
    </DashboardLayout>
  );
}
