import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface VenueFile {
  name: string;
  url: string;
  uploaded_at: string;
  size?: number;
  type?: string;
}

export interface Venue {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  business_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  show_files?: VenueFile[] | null;
  room_tuning_files?: VenueFile[] | null;
  notes?: string | null;
}

interface UseVenuesOptions {
  search?: string;
}

interface UseVenuesResult {
  data: Venue[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVenues(options: UseVenuesOptions = {}): UseVenuesResult {
  const [data, setData] = useState<Venue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { search } = options;

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("venues")
        .select("*")
        .order("name", { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,business_name.ilike.%${search}%,city.ilike.%${search}%,address.ilike.%${search}%`);
      }

      const { data: venues, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setData(venues as Venue[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch venues");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [search]);

  return { data, loading, error, refetch: fetchVenues };
}

export function useVenue(id?: string) {
  const [data, setData] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchVenue() {
      try {
        setLoading(true);
        setError(null);

        const { data: venue, error: fetchError } = await supabase
          .from("venues")
          .select("*")
          .eq("id", id!)
          .single();

        if (fetchError) throw fetchError;

        setData(venue as Venue);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch venue");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchVenue();
  }, [id]);

  return { data, loading, error };
}

export async function createVenue(venue: Partial<Venue>): Promise<Venue> {
  const insertData: any = {
    name: venue.name,
    business_name: venue.business_name,
    address: venue.address,
    city: venue.city,
    state: venue.state,
    zip_code: venue.zip_code,
    country: venue.country,
    contact_name: venue.contact_name,
    contact_phone: venue.contact_phone,
    contact_email: venue.contact_email,
    notes: venue.notes,
    show_files: venue.show_files || [],
    room_tuning_files: venue.room_tuning_files || [],
  };

  const { data, error } = await supabase
    .from("venues")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as Venue;
}

export async function updateVenue(id: string, updates: Partial<Venue>): Promise<Venue> {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase
    .from("venues")
    // @ts-expect-error - Supabase type inference issue
    .update(updateData)
    .eq("id", id)
    .select()
    .single());

  if (error) throw error;
  return data as Venue;
}

export async function deleteVenue(id: string): Promise<void> {
  const { error } = await supabase
    .from("venues")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// File upload helper for Supabase Storage
export async function uploadVenueFile(
  venueId: string,
  file: File,
  fileType: 'show' | 'tuning'
): Promise<VenueFile> {
  const bucket = 'venue-files';
  const folderPath = fileType === 'show' ? 'show-files' : 'room-tuning';
  const filePath = `${venueId}/${folderPath}/${Date.now()}-${file.name}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    name: file.name,
    url: urlData.publicUrl,
    uploaded_at: new Date().toISOString(),
    size: file.size,
    type: file.type,
  };
}

export async function deleteVenueFile(url: string): Promise<void> {
  // Extract path from URL
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const filePath = pathParts.slice(pathParts.indexOf('venue-files') + 1).join('/');

  const { error } = await supabase.storage
    .from('venue-files')
    .remove([filePath]);

  if (error) throw error;
}
