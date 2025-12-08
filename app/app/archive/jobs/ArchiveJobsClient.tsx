'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

type ArchivedJob = {
  id: string;
  code: string;
  title: string;
  status: string;
  client: string;
  expected_return_date: string | null;
  created_at: string;
  archived: boolean;
};

type ReturnManifest = {
  id: string;
  job_id: string;
  finalized_by: string;
  finalized_at: string;
  signature: string;
  manifest_data: any;
};

export default function ArchiveJobsClient() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ArchivedJob[]>([]);
  const [manifests, setManifests] = useState<Record<string, ReturnManifest>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadArchivedJobs();
  }, []);

  const loadArchivedJobs = async () => {
    try {
      setLoading(true);

      // Load all archived jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, code, title, status, client, expected_return_date, created_at, archived')
        .eq('archived', true)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      setJobs((jobsData as any[]) || []);

      // Try to load return manifests if table exists
      const { data: manifestsData } = await supabase
        .from('return_manifests')
        .select('*');

      if (manifestsData) {
        const manifestMap: Record<string, ReturnManifest> = {};
        (manifestsData as any[]).forEach(manifest => {
          manifestMap[manifest.job_id] = manifest;
        });
        setManifests(manifestMap);
      }
    } catch (error) {
      console.error('Error loading archived jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;
  const selectedManifest = selectedJobId ? manifests[selectedJobId] : null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with Tabs */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">Archive</h1>
          <div className="flex gap-2 border-b border-zinc-700">
            <Link
              href="/app/archive/jobs"
              className="px-4 py-2 text-amber-400 border-b-2 border-amber-400 font-medium"
            >
              Completed Jobs
            </Link>
            <Link
              href="/app/archive/parts"
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Speaker Parts/Drivers
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-6">
          <div className="text-2xl font-bold text-white">{jobs.length}</div>
          <div className="text-sm text-zinc-400">Archived Jobs</div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg">
              <div className="p-4 border-b border-zinc-700">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredJobs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No archived jobs found</div>
              ) : (
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredJobs.map(job => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-blue-50 transition ${
                        selectedJobId === job.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{job.code}</div>
                      <div className="text-sm text-gray-600">{job.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                      {manifests[job.id] && (
                        <div className="text-xs text-green-600 font-semibold mt-1">✓ Returned</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job Details */}
          <div className="lg:col-span-2">
            {!selectedJob ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select a job to view details
              </div>
            ) : (
              <div className="space-y-6">
                {/* Job Summary Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedJob.code}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Job Title</div>
                      <div className="font-semibold text-gray-900">{selectedJob.title}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Client</div>
                      <div className="font-semibold text-gray-900">{selectedJob.client || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Status</div>
                      <div className="font-semibold text-green-600 capitalize">{selectedJob.status || 'Completed'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Expected Return Date</div>
                      <div className="font-semibold text-gray-900">
                        {selectedJob.expected_return_date
                          ? new Date(selectedJob.expected_return_date).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Created</div>
                      <div className="font-semibold text-gray-900">
                        {new Date(selectedJob.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Archived</div>
                      <div className="font-semibold text-blue-600">Yes</div>
                    </div>
                  </div>
                </div>

                {/* Return Manifest Card */}
                {selectedManifest ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Return Manifest</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600">Finalized By</div>
                        <div className="font-semibold text-gray-900">{selectedManifest.finalized_by}</div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600">Finalized At</div>
                        <div className="font-semibold text-gray-900">
                          {new Date(selectedManifest.finalized_at).toLocaleString()}
                        </div>
                      </div>

                      {selectedManifest.manifest_data && (
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Return Summary</div>
                          <div className="bg-gray-50 p-3 rounded text-sm">
                            <div>Items Returned: <span className="font-semibold">{selectedManifest.manifest_data.total_returned} / {selectedManifest.manifest_data.total_required}</span></div>
                          </div>
                        </div>
                      )}

                      {selectedManifest.signature && (
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Signature</div>
                          <img
                            src={selectedManifest.signature}
                            alt="Signature"
                            className="border border-gray-300 rounded max-w-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <p className="text-sm text-yellow-800">No return manifest found for this job</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
