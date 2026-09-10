import { supabase } from "@/integrations/supabase/client";

export type PublicProfile = {
  id: string;
  name: string;
  profile_photo: string | null;
  gender: string | null;
  role: string;
  verification_status: string;
  rating: number;
  reliability_score: number;
  account_status: string;
  created_at: string;
};

export async function fetchPublicProfiles(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (unique.length === 0) return {} as Record<string, PublicProfile>;
  const { data, error } = await supabase.rpc("get_public_profiles", { _ids: unique });
  if (error) throw error;
  const map: Record<string, PublicProfile> = {};
  for (const p of (data ?? []) as PublicProfile[]) map[p.id] = p;
  return map;
}

export const RIDE_SELECT =
  "*, routes(*), trips(id,status,started_at,completed_at)" as const;

export type RideRow = {
  id: string;
  driver_id: string;
  route_id: string;
  date: string;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  price_per_passenger: number;
  status: string;
  routes: {
    origin_text: string;
    origin_lat: number;
    origin_lng: number;
    destination_text: string;
    destination_lat: number;
    destination_lng: number;
    departure_time: string;
    recurring_days: number[];
  } | null;
  trips: { id: string; status: string; started_at: string | null; completed_at: string | null }[];
};

export async function fetchBlockedIds() {
  const { data, error } = await supabase.from("user_blocks").select("blocker_id,blocked_id");
  if (error) throw error;
  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add(row.blocked_id);
    ids.add(row.blocker_id);
  }
  return ids;
}
