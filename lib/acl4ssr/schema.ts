import { z } from 'zod';
import { ACL_TEMPLATE_VARIANTS } from './variants';

const templateKeys = ACL_TEMPLATE_VARIANTS.map((v) => v.key);

export const subscriptionSettingsSchema = z.object({
  templateKey: z.string().refine((key) => templateKeys.includes(key), {
    message: 'Unknown template variant',
  }),
  enableDns: z.boolean().default(true),
});

export const createSubscriptionRequestSchema = z.object({
  input: z.string().trim().min(1).max(200_000),
  settings: subscriptionSettingsSchema,
});

export const renderRequestSchema = z.object({
  input: z.string().trim().min(1).max(200_000),
  settings: subscriptionSettingsSchema,
});