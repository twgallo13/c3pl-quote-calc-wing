-- Seed script for RateCards table
-- Columns expected: id (text), name (text), version (text), monthly_minimum_cents (int), prices (jsonb)
INSERT INTO ratecards (id, name, version, monthly_minimum_cents, prices)
VALUES
  ('rc-startup-2025', 'Startup Plan 2025', 'v1.0.0', 150000, '{"fulfillment":{"aovPercentage":0.05,"baseFeeCents":275,"perAdditionalUnitCents":95},"storage":{"smallUnitCents":80,"mediumUnitCents":160,"largeUnitCents":275,"palletCents":8500},"shippingAndHandling":{"standard":{"smallPackageCents":325,"mediumPackageCents":650,"largePackageCents":1250},"customerAccount":{"smallPackageCents":100,"mediumPackageCents":150,"largePackageCents":275}}}'::jsonb),
  ('rc-growth-2025', 'Growth Plan 2025', 'v1.0.0', 300000, '{"fulfillment":{"aovPercentage":0.05,"baseFeeCents":250,"perAdditionalUnitCents":75},"storage":{"smallUnitCents":75,"mediumUnitCents":150,"largeUnitCents":250,"palletCents":7500},"shippingAndHandling":{"standard":{"smallPackageCents":300,"mediumPackageCents":600,"largePackageCents":1200},"customerAccount":{"smallPackageCents":75,"mediumPackageCents":125,"largePackageCents":250}}}'::jsonb),
  ('rc-enterprise-2025', 'Enterprise Plan 2025', 'v1.0.0', 750000, '{"fulfillment":{"aovPercentage":0.04,"baseFeeCents":200,"perAdditionalUnitCents":50},"storage":{"smallUnitCents":60,"mediumUnitCents":120,"largeUnitCents":200,"palletCents":6000},"shippingAndHandling":{"standard":{"smallPackageCents":285,"mediumPackageCents":585,"largePackageCents":1185},"customerAccount":{"smallPackageCents":50,"mediumPackageCents":100,"largePackageCents":225}}}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  monthly_minimum_cents = EXCLUDED.monthly_minimum_cents,
  prices = EXCLUDED.prices;