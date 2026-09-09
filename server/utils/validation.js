import { z } from 'zod';
import { AppError } from './errors.js';

const text = (min, max) => z.string().trim().min(min).max(max);
const id = text(1, 150).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid identifier');
const name = text(2, 80);
const category = text(2, 60);
const image = text(1, 1000).refine(
  (value) => /^\/images\/[\w.-]+$/.test(value) || /^https:\/\//.test(value),
  'Use a local /images/ path or an HTTPS image URL',
);
const campaignFields = {
  title: text(5, 120),
  category,
  summary: text(10, 240),
  description: text(20, 12000),
  location: text(2, 120),
  image,
  target: z.number().int().min(100).max(100000000),
  status: z.enum(['active', 'paused', 'completed']).default('active'),
};
const opportunityFields = {
  title: text(5, 120),
  category,
  description: text(20, 12000),
  location: text(2, 120),
  date: text(10, 40).refine((value) => !Number.isNaN(Date.parse(value)), 'Provide a valid date'),
  commitment: text(2, 120),
  spots: z.number().int().min(1).max(10000),
  skills: z.array(text(1, 60)).max(20).default([]),
  status: z.enum(['open', 'closed']).default('open'),
};

export const schemas = {
  id,
  demo: z.object({ role: z.enum(['user', 'organization', 'admin']) }).strict(),
  login: z
    .object({
      email: z
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .strict(),
  register: z
    .object({
      name,
      email: z
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      password: z.string().min(8).max(128),
      role: z.enum(['user', 'organization']).default('user'),
      organizationName: text(2, 120).optional(),
    })
    .strict(),
  sync: z
    .object({
      name: name.optional(),
      role: z.enum(['user', 'organization']).optional(),
      organizationName: text(2, 120).optional(),
    })
    .strict(),
  profile: z
    .object({
      name: name.optional(),
      bio: text(0, 600).optional(),
      location: text(0, 120).optional(),
      organizationName: text(2, 120).optional(),
    })
    .strict(),
  campaign: z.object(campaignFields).strict(),
  campaignPatch: z
    .object({ ...campaignFields, status: z.enum(['active', 'paused', 'completed']) })
    .partial()
    .strict(),
  opportunity: z.object(opportunityFields).strict(),
  opportunityPatch: z
    .object({
      ...opportunityFields,
      skills: z.array(text(1, 60)).max(20),
      status: z.enum(['open', 'closed']),
    })
    .partial()
    .strict(),
  application: z.object({ opportunityId: id, motivation: text(10, 2000) }).strict(),
  applicationPatch: z
    .object({ status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']) })
    .strict(),
  adminUser: z
    .object({
      role: z.enum(['user', 'organization', 'admin']).optional(),
      disabled: z.boolean().optional(),
    })
    .strict(),
  order: z
    .object({
      campaignId: id,
      amount: z.number().int().min(1).max(1000000),
      anonymous: z.boolean().default(false),
    })
    .strict(),
  demoPayment: z.object({ orderId: id }).strict(),
  verify: z
    .object({
      razorpay_order_id: id,
      razorpay_payment_id: id,
      razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Invalid payment signature'),
    })
    .strict(),
};

export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(
      400,
      result.error.issues
        .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
        .join('; '),
    );
  return result.data;
}
