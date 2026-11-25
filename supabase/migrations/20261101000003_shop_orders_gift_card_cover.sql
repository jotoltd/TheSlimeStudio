-- Persist how much of a shop order's price was covered by a gift card, so
-- SumUp confirm/webhook flows can redeem exactly that amount (Stripe keeps it
-- in session metadata). Without this the cover was recomputed from
-- min(balance, order.total) after the charge — double-charging the customer.
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS gift_card_cover numeric(10,2) DEFAULT 0;
