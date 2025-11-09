import MySchedule from "@/components/MySchedule";
import Tasks from "@/components/Tasks";
import OpenInvoices from "@/components/OpenInvoices";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";

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
        
        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Link 
            href="/app/jobs" 
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90">Jobs</div>
                <div className="text-2xl font-bold">All Jobs</div>
              </div>
              <i className="fas fa-briefcase text-3xl opacity-80"></i>
            </div>
          </Link>
          
          <Link 
            href="/app/invoices" 
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90">Invoices</div>
                <div className="text-2xl font-bold">View All</div>
              </div>
              <i className="fas fa-file-invoice-dollar text-3xl opacity-80"></i>
            </div>
          </Link>
          
          <Link 
            href="/app/warehouse" 
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-4 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90">Warehouse</div>
                <div className="text-2xl font-bold">Inventory</div>
              </div>
              <i className="fas fa-boxes text-3xl opacity-80"></i>
            </div>
          </Link>
          
          <Link 
            href="/app/warehouse/pull-sheets" 
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90">Pull Sheets</div>
                <div className="text-2xl font-bold">Active</div>
              </div>
              <i className="fas fa-clipboard-list text-3xl opacity-80"></i>
            </div>
          </Link>
        </div>
        
        {/* Dashboard grid with 2-column layout (responsive) */}
        <div className="dashboard-grid">
          <MySchedule />
          <Tasks />
          <OpenInvoices />
        </div>
      </div>
    </DashboardLayout>
  );
}
