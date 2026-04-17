-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.available_cash (
  id uuid NOT NULL DEFAULT gen_random_uuid() CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid),
  amount numeric NOT NULL DEFAULT 0.00,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT available_cash_pkey PRIMARY KEY (id)
);
CREATE TABLE public.available_cash_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  previous_amount numeric NOT NULL,
  new_amount numeric NOT NULL,
  difference numeric NOT NULL,
  reason text,
  timestamp timestamp without time zone DEFAULT now(),
  admin_id uuid,
  CONSTRAINT available_cash_logs_pkey PRIMARY KEY (id),
  CONSTRAINT available_cash_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id)
);
CREATE TABLE public.deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  amount numeric NOT NULL,
  method text CHECK (method = ANY (ARRAY['cash'::text, 'mbway'::text, 'adjustment'::text])),
  timestamp timestamp without time zone DEFAULT now(),
  CONSTRAINT deposits_pkey PRIMARY KEY (id),
  CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.inventory_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  type text CHECK (type = ANY (ARRAY['sale'::text, 'add_stock'::text, 'correction'::text, 'theft'::text])),
  quantity integer NOT NULL,
  order_item_id uuid,
  timestamp timestamp without time zone DEFAULT now(),
  admin_id uuid,
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT inventory_movements_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id),
  CONSTRAINT inventory_movements_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_per_unit numeric NOT NULL,
  subtotal numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  total numeric NOT NULL,
  payment_method text CHECK (payment_method = ANY (ARRAY['balance'::text, 'cash'::text])),
  timestamp timestamp without time zone DEFAULT now(),
  payment_processed boolean NOT NULL DEFAULT false,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image text,
  stock integer DEFAULT 0,
  purchase_price numeric NOT NULL,
  selling_price_member numeric NOT NULL,
  selling_price_non_member numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  is_vip_only boolean NOT NULL DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text UNIQUE,
  name text NOT NULL,
  is_member boolean DEFAULT false,
  balance numeric DEFAULT 0,
  role text DEFAULT 'user'::text CHECK (role = ANY (ARRAY['admin'::text, 'user'::text])),
  created_at timestamp without time zone DEFAULT now(),
  is_vip boolean NOT NULL DEFAULT false,
  debt_started_at timestamp with time zone,
  max_debt_ever numeric NOT NULL DEFAULT 0,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
