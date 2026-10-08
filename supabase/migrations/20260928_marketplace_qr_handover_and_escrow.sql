-- ====================================================================
-- SUPABASE MIGRATION: MARKETPLACE QR CODE HANDOVER & ESCROW PAYMENT
-- Ghana Farmers Market℠ Produce Marketplace
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PRODUCE HANDOVERS TABLE
-- Tracks physical verification tokens, quality inspections, and escrow releases.
CREATE TABLE IF NOT EXISTS public.produce_handovers (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    verification_code TEXT NOT NULL UNIQUE,
    buyer_id TEXT,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT,
    seller_id TEXT,
    seller_name TEXT NOT NULL,
    seller_phone TEXT,
    item_name TEXT NOT NULL,
    quantity TEXT NOT NULL,
    unit TEXT DEFAULT 'consignment',
    total_amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GHS',
    payment_method TEXT NOT NULL DEFAULT 'Mobile Money (MTN/Telecel/AirtelTigo)',
    payment_status TEXT NOT NULL CHECK (payment_status IN ('escrowed', 'pending_verification', 'released', 'refunded')) DEFAULT 'escrowed',
    fulfillment_status TEXT NOT NULL CHECK (fulfillment_status IN ('awaiting_handover', 'in_transit', 'verified_and_delivered', 'disputed')) DEFAULT 'awaiting_handover',
    handover_checkpoint TEXT NOT NULL DEFAULT 'Regional Farm Gate Depot',
    region TEXT NOT NULL DEFAULT 'All Regions',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by_user_id TEXT,
    verified_by_role TEXT,
    handover_notes TEXT,
    quality_check JSONB DEFAULT '{}'::jsonb,
    digital_signature_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optimize search indexes
CREATE INDEX IF NOT EXISTS idx_produce_handovers_code 
ON public.produce_handovers (verification_code);

CREATE INDEX IF NOT EXISTS idx_produce_handovers_order 
ON public.produce_handovers (order_id);

CREATE INDEX IF NOT EXISTS idx_produce_handovers_seller 
ON public.produce_handovers (seller_id, fulfillment_status);

CREATE INDEX IF NOT EXISTS idx_produce_handovers_buyer 
ON public.produce_handovers (buyer_id, fulfillment_status);

-- 3. ENHANCE ORDERS TABLE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'handover_code'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN handover_code TEXT;
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'escrowed';
        ALTER TABLE public.orders ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.produce_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to produce_handovers"
ON public.produce_handovers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert of produce_handovers"
ON public.produce_handovers FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update of produce_handovers"
ON public.produce_handovers FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. REALTIME BROADCAST ENABLING
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'produce_handovers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.produce_handovers;
    END IF;
END $$;

-- 6. STORED PROCEDURE: PROCESS SECURE HANDOVER & RELEASE ESCROW
CREATE OR REPLACE FUNCTION public.process_secure_handover(
    p_verification_code TEXT,
    p_verifier_user_id TEXT,
    p_verifier_role TEXT,
    p_quality_check JSONB DEFAULT '{}'::jsonb,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_handover RECORD;
    v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
BEGIN
    -- Look up handover by code
    SELECT * INTO v_handover 
    FROM public.produce_handovers 
    WHERE upper(verification_code) = upper(p_verification_code);

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Invalid verification code. Record not found.'
        );
    END IF;

    IF v_handover.fulfillment_status = 'verified_and_delivered' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'This produce consignment has already been verified and delivered on ' || to_char(v_handover.verified_at, 'YYYY-MM-DD HH24:MI:SS'),
            'handover', row_to_json(v_handover)
        );
    END IF;

    -- Update Handover Record
    UPDATE public.produce_handovers
    SET 
        fulfillment_status = 'verified_and_delivered',
        payment_status = 'released',
        verified_at = v_now,
        verified_by_user_id = p_verifier_user_id,
        verified_by_role = p_verifier_role,
        handover_notes = p_notes,
        quality_check = p_quality_check
    WHERE id = v_handover.id;

    -- Update Orders Table Status
    UPDATE public.orders
    SET 
        status = 'Delivered',
        payment_status = 'released',
        verified_at = v_now
    WHERE id = v_handover.order_id;

    -- Record in Activity Audit Log
    INSERT INTO public.user_activity_logs (
        user_id,
        user_name,
        user_type,
        action,
        details,
        region,
        metadata,
        created_at
    )
    VALUES (
        p_verifier_user_id,
        COALESCE(v_handover.buyer_name, 'Market Verifier'),
        COALESCE(p_verifier_role, 'buyer'),
        'QR_HANDOVER_VERIFIED',
        'Physical produce verified and GHS ' || v_handover.total_amount || ' escrow released for order ' || v_handover.order_id,
        v_handover.region,
        jsonb_build_object(
            'order_id', v_handover.order_id,
            'handover_id', v_handover.id,
            'amount', v_handover.total_amount,
            'quality_check', p_quality_check
        ),
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Produce verified! GHS ' || v_handover.total_amount || ' escrow payment released to seller.',
        'order_id', v_handover.order_id,
        'amount_released', v_handover.total_amount,
        'verified_at', v_now
    );
END;
$$;

-- 7. INITIAL SEED PRODUCE HANDOVERS
INSERT INTO public.produce_handovers (
    id, order_id, verification_code, buyer_id, buyer_name, buyer_phone,
    seller_id, seller_name, seller_phone, item_name, quantity, total_amount,
    currency, payment_method, payment_status, fulfillment_status,
    handover_checkpoint, region
)
VALUES
    (
        'HND-2026-7782', 'ORD-7782', 'GH-7782-X9', 'usr-buyer-01', 'Kwame Mensah', '+233 24 123 4567',
        'usr-farmer-01', 'Ejura Organic Grain Farms', '+233 20 555 1234', 'Certified Maize Seeds (2kg)',
        '5 bags (50kg total)', 430.00, 'GHS', 'Mobile Money (MTN/Telecel/AirtelTigo)', 'escrowed',
        'awaiting_handover', 'Ejura Warehouse Ag-Hub, Depot Gate 2', 'Ashanti'
    ),
    (
        'HND-2026-7781', 'ORD-7781', 'GH-7781-B4', 'usr-buyer-02', 'Ama Serwaa', '+233 27 987 6543',
        'usr-farmer-02', 'Techiman Produce Cooperative', '+233 24 444 8989', 'Heavy-Duty Cutlass & Tooling Set',
        '1 set', 80.00, 'GHS', 'Digital Escrow', 'escrowed',
        'in_transit', 'Techiman Wholesale Market, Stall 44', 'Bono / Techiman'
    ),
    (
        'HND-2026-7750', 'ORD-7750', 'GH-7750-V2', 'usr-buyer-01', 'Kwame Mensah', '+233 24 123 4567',
        'usr-farmer-03', 'Navrongo Agrochemicals & Irrigation', '+233 50 111 2233', 'Knapsack Sprayer (16L Pressure)',
        '1 unit', 250.00, 'GHS', 'Mobile Money (MTN/Telecel/AirtelTigo)', 'released',
        'verified_and_delivered', 'Tamale Central Dispatch Hub', 'Northern / Tamale'
    )
ON CONFLICT (verification_code) DO NOTHING;
