import { z } from 'zod';

export const ScopeInputSchema = z.object({
    monthlyOrders: z.number().int().nonnegative(),
    averageUnitsPerOrder: z.number().int().positive(),
    averageOrderValue: z.number().nonnegative(), // dollars
    shippingModel: z.enum(['standard', 'customerAccount']),
    shippingSizeMix: z.object({
        small: z.number().nonnegative(),
        medium: z.number().nonnegative(),
        large: z.number().nonnegative()
    })
});

export const RateCardIdSchema = z.object({
    rateCardId: z.string().min(1)
});