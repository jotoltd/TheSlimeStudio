-- Royal Mail Click & Drop shipment state per shop order.
-- JSONB so the shape can grow (label URL, despatch date, tracking) without
-- further migrations as the integration matures.
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS rm_shipment jsonb;
