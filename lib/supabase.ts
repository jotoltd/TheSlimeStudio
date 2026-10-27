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

export type PaymentMethod = "sumup" | "stripe" | "manual" | "unknown";

export function paymentMethodFor(ref?: string | null): PaymentMethod {
  if (!ref) return "unknown";
  if (ref.startsWith("SLM-BOOK-") || ref.startsWith("SLM-SHOP-") || ref.startsWith("SLM-EVENT-") || ref.startsWith("SLM-GIFT-")) return "sumup";
  if (ref.startsWith("pi_") || ref.startsWith("cs_")) return "stripe";
  if (ref.startsWith("manual_")) return "manual";
  return "unknown";
}

// True for the auto-created second row of a 2-hour booking — it only exists to
// hold capacity in the next slot, so it must never count toward people totals
// or the daily cap. Identified by the `_slot2` payment-ref suffix the admin
// route assigns, or the note it stamps on the row.
export function isSlotPlaceholder(b: { stripe_session_id?: string | null; notes?: string | null }) {
  return !!b.stripe_session_id?.endsWith("_slot2") || !!b.notes?.startsWith("[Blocked for 2-hour");
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  sumup: "SumUp",
  stripe: "Stripe",
  manual: "Manual",
  unknown: "—",
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
  next_theme?: string;
  next_theme_description?: string;
  theme_change_date?: string | null;
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

export type SiteTheme = "default" | "halloween";

export type SiteSettings = {
  id: number;
  maintenance_mode: boolean;
  loyalty_enabled: boolean;
  referrals_enabled?: boolean;
  theme?: SiteTheme;
  theme_end_date?: string | null;
  stamps_per_reward: number;
  launch_date: string;
  stripe_mode?: string;
  payment_provider?: "stripe" | "sumup";
  fb_pixel_id: string | null;
  fb_pixel_enabled: boolean;
  ga_measurement_id: string | null;
  ga_enabled: boolean;
  tiktok_pixel_id: string | null;
  tiktok_pixel_enabled: boolean;
  google_ads_id: string | null;
  google_ads_enabled: boolean;
  snapchat_pixel_id: string | null;
  snapchat_pixel_enabled: boolean;
  updated_at: string;
};

export const TIME_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
export const SLOT_CAPACITY = 10;
export const MAX_DAILY_BOOKINGS = 5;

export const STUDIO_ADDRESS = "Unit A, Feathers Yard, Holt, NR25 6BF";
// Opens Google Maps directions with the studio pre-filled as the destination —
// on phones it hands straight off to the Maps app.
export const STUDIO_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `The Slime Studio, ${STUDIO_ADDRESS}`
)}`;
export const PARKING_NOTE =
  "Nearest car park: Budgens — a 30-second walk from the studio. Alternative: Albert Street car park, about a 5-minute walk.";

export type LoyaltyCard = {
  id: string;
  email: string;
  name: string;
  stamps: number;
  total_stamps: number;
  rewards_earned: number;
  rewards_redeemed: number;
  reward_code: string | null;
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

export type FAQ = {
  id: string;
  question: string;
  answer: string;
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
  fulfillment_status?: string | null;
  stripe_session_id: string | null;
  notes: string | null;
  created_at: string;
};
