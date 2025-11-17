'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { ArrowLeft, Calendar, TrendingUp, Download, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SavedReport {
  id: string;
  quarter: string;
  year: number;
  quarter_target: number;
  daily_goal: number;
  weekly_goal: number;
  analysis: string;
  recommendations: string[];
  projected_outcome: string;
  created_at: string;
  updated_at: string;
}

export default function SavedReportsClient() {
  const router = useRouter();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    loadReports();
  }, [selectedYear]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const supabaseBrowserInstance = supabaseBrowser();
      const { data: { user } } = await supabaseBrowserInstance.auth.getUser();

      if (!user) return;

      const { data: reportsData } = await (supabaseBrowserInstance as any)
        .from('financial_goals_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

      if (reportsData) {
        setReports(reportsData);
        
        // Get unique years
        const uniqueYearsSet = new Set<number>();
        reportsData.forEach((r: any) => uniqueYearsSet.add(r.year));
        const uniqueYears = Array.from(uniqueYearsSet).sort((a, b) => b - a);
        setYears(uniqueYears);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      const supabaseBrowserInstance = supabaseBrowser();
      await (supabaseBrowserInstance as any)
        .from('financial_goals_reports')
        .delete()
        .eq('id', id);

      setReports(reports.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  const downloadReport = (report: SavedReport) => {
    const reportContent = `
FINANCIAL GOALS REPORT
${report.quarter} ${report.year}

TARGETS
Quarterly Target: $${report.quarter_target.toLocaleString()}
Weekly Goal: $${report.weekly_goal.toLocaleString()}
Daily Goal: $${report.daily_goal.toLocaleString()}

ANALYSIS
${report.analysis}

RECOMMENDATIONS
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

PROJECTED OUTCOME
${report.projected_outcome}

Generated: ${new Date(report.created_at).toLocaleDateString()}
Last Updated: ${new Date(report.updated_at).toLocaleDateString()}
    `.trim();

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent));
    element.setAttribute('download', `Goals_${report.quarter}_${report.year}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const quarterColors = {
    Q1: '#FCD34D',
    Q2: '#FBBF24',
    Q3: '#F59E0B',
    Q4: '#D97706',
  };

  const filteredReports = reports.filter(r => r.year === selectedYear);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
      {/* Header */}
      <div
        style={{ backgroundColor: '#fff8f0', borderBottom: '2px solid #fcd34d' }}
        className="sticky top-0 z-10"
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/app/warehouse/financial/goals')}
            className="flex items-center gap-2 mb-4"
            style={{ color: '#d97706' }}
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Goals</span>
          </button>
          <h1 style={{ color: '#b45309' }} className="text-4xl font-bold">
            Saved Reports
          </h1>
          <p style={{ color: '#a16207' }} className="mt-2 font-medium">
            View and manage your quarterly financial goals reports
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Year Filter */}
        {years.length > 0 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            {years.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                style={{
                  backgroundColor: selectedYear === year ? '#fbbf24' : 'white',
                  color: selectedYear === year ? 'white' : '#b45309',
                  borderLeft: `4px solid ${selectedYear === year ? '#fbbf24' : '#e5e7eb'}`,
                }}
                className="px-4 py-2 rounded-lg font-bold transition hover:shadow-lg"
              >
                {year}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p style={{ color: '#b45309' }}>Loading reports...</p>
          </div>
        )}

        {!loading && filteredReports.length === 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderLeft: '4px solid #fcd34d',
              borderRadius: '8px',
            }}
            className="p-8 text-center"
          >
            <p style={{ color: '#a16207' }} className="text-lg font-medium">
              No reports found for {selectedYear}
            </p>
            <p style={{ color: '#a16207' }} className="text-sm mt-2">
              Generate quarterly goals to create your first report
            </p>
          </div>
        )}

        {!loading && filteredReports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReports.map(report => (
              <div
                key={report.id}
                style={{
                  backgroundColor: 'white',
                  borderTop: `4px solid ${quarterColors[report.quarter as keyof typeof quarterColors]}`,
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
                }}
                className="rounded-lg p-6"
              >
                {/* Quarter Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 style={{ color: '#b45309' }} className="text-2xl font-bold">
                      {report.quarter}
                    </h3>
                    <p style={{ color: '#a16207' }} className="text-sm">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    style={{
                      backgroundColor: quarterColors[report.quarter as keyof typeof quarterColors],
                      color: 'white',
                    }}
                    className="px-3 py-1 rounded-full font-bold text-sm"
                  >
                    {report.year}
                  </div>
                </div>

                {/* Key Targets */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <p style={{ color: '#a16207' }} className="text-xs font-bold">
                      QUARTERLY TARGET
                    </p>
                    <p style={{ color: '#b45309' }} className="text-2xl font-black">
                      ${report.quarter_target.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p style={{ color: '#a16207' }} className="text-xs font-bold">
                        WEEKLY
                      </p>
                      <p style={{ color: '#0891b2' }} className="text-lg font-bold">
                        ${report.weekly_goal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#a16207' }} className="text-xs font-bold">
                        DAILY
                      </p>
                      <p style={{ color: '#059669' }} className="text-lg font-bold">
                        ${report.daily_goal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analysis */}
                <div className="mb-4">
                  <p style={{ color: '#78716c' }} className="text-sm leading-relaxed">
                    {report.analysis}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadReport(report)}
                    style={{
                      backgroundColor: '#fbbf24',
                      color: '#78210f',
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                    }}
                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-sm hover:shadow-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
