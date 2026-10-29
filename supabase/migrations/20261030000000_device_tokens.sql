-- Device token stamped on bookings/gift cards at purchase time so push
-- notifications reach the buying device even when the customer has no
-- account (the token can't be linked to a customer row in that case).
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS device_token text;
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS device_token text;
