import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number;
  created_at: string;
};

export type Enquiry = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  enquiry_type: string | null;
  preferred_date: string | null;
  message: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  date: string;
  time_slot: string;
  people: number;
  total_price: number;
  name: string;
  email: string;
  phone: string | null;
  is_party: boolean;
  payment_status?: string;
  stripe_session_id?: string;
  created_at: string;
};

export type BookingSettings = {
  id: number;
  price_per_person: number;
  updated_at: string;
};

export type SubscriptionSettings = {
  id: number;
  enabled: boolean;
  box_name: string;
  price: number;
  frequency: string;
  current_theme: string;
  current_theme_description: string;
  perks: string[];
  updated_at: string;
};

export type ShopSettings = {
  id: number;
  live: boolean;
  launch_date: string;
  updated_at: string;
};

export type Subscriber = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  status: string;
  stripe_session_id?: string;
  payment_status?: string;
  created_at: string;
};

export type Admin = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  maintenance_mode: boolean;
  launch_date: string;
  stripe_mode?: string;
  updated_at: string;
};

export const TIME_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
export const SLOT_CAPACITY = 5;
export const MAX_DAILY_BOOKINGS = 5;
export const PRICE_PER_PERSON = 15;
