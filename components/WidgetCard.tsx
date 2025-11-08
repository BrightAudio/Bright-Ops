"use client";

export default function WidgetCard({ 
  title, 
  children,
  icon 
}: { 
  title: string; 
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        {icon && <i className={`${icon} text-blue-600 text-xl`}></i>}
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="text-gray-700">
        {children}
      </div>
    </div>
  );
}
