import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  created_at: string;
};

export const TIME_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
export const SLOT_CAPACITY = 10;
export const PRICE_PER_PERSON = 15;
