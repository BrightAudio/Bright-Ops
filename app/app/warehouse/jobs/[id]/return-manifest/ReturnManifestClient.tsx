"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProfessionalReturnManifest from "@/components/ProfessionalReturnManifest";

type Job = {
  id: string;
  code: string;
  title: string;
  expected_return_date: string | null;
};

export default function ReturnManifestClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    async function loadJob() {
      const { data } = await supabase
        .from("jobs")
        .select("id, code, title, expected_return_date")
        .eq("id", jobId)
        .single();
      
      if (data) {
        setJob(data as any);
      }
    }
    loadJob();
  }, [jobId]);

  return <ProfessionalReturnManifest jobId={jobId} job={job || undefined} />;
}
