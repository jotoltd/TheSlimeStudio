import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock: number;
  weight?: number | null;
  image_url: string | null;
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
  status?: string;
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
  notes?: string;
  attendance_status?: string;
  created_at: string;
};

export type BookingSettings = {
  id: number;
  price_per_person: number;
  time_slots?: string[];
  slot_capacity?: number;
  max_daily_bookings?: number;
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
  loyalty_enabled: boolean;
  stamps_per_reward: number;
  launch_date: string;
  stripe_mode?: string;
  updated_at: string;
};

export const TIME_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
export const SLOT_CAPACITY = 5;
export const MAX_DAILY_BOOKINGS = 5;

export type LoyaltyCard = {
  id: string;
  email: string;
  name: string;
  stamps: number;
  total_stamps: number;
  rewards_earned: number;
  rewards_redeemed: number;
  created_at: string;
  updated_at: string;
};

export const STAMPS_PER_REWARD = 10;
export const PRICE_PER_PERSON = 15;

export type GalleryImage = {
  id: string;
  image_url: string;
  caption: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
};

export type OpeningHour = {
  id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  is_open: boolean;
  time_slots: string[];
};

export type DateOverride = {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  is_open: boolean;
  time_slots: string[];
  label: string | null;
};

export type ShopOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_method: string; // 'collection' or 'delivery'
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postcode: string | null;
  items: { product_id: string; name: string; price: number; quantity: number; image_url: string | null }[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_status: string;
  stripe_session_id: string | null;
  notes: string | null;
  created_at: string;
};
