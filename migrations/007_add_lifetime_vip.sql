-- Add support for lifetime VIP packages
-- Migration 007

-- Add a default VIP package for lifetime
INSERT INTO vip_packages (duration_months, price, title, description, discount_label, display_order, is_featured, is_active)
VALUES (0, 500000, 'Lifetime VIP', 'One-time payment for permanent VIP access', 'BEST VALUE', 5, 1, 1);

PRINT 'Added Lifetime VIP package';
GO
