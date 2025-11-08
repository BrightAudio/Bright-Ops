import MySchedule from "@/components/MySchedule";
import Tasks from "@/components/Tasks";
import OpenInvoices from "@/components/OpenInvoices";

export default function DashboardPage() {
  return (
    <div className="dashboard-content">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MySchedule />
        <Tasks />
        <OpenInvoices />
      </div>
    </div>
  );
}
