// Zod schemas for AI-generated structured data (§8).
// Every structured AI output is validated before persist/use.
const { z } = require('zod');

const citationSchema = z.object({
  doc: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).max(10000),
});

const tutorSchema = z.object({
  answer: z.string().min(1).max(8000),
  citations: z.array(citationSchema).max(4).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
});

const mcqSchema = z.object({
  stem: z.string().min(5).max(2000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  answerKey: z.string().min(1).max(500),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

const openQSchema = z.object({
  stem: z.string().min(5).max(2000),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

const gradeSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  covered: z.array(z.string().max(300)).max(10).default([]),
  missing: z.array(z.string().max(300)).max(10).default([]),
  feedback: z.string().min(1).max(3000),
});

const conceptsSchema = z.object({
  concepts: z
    .array(z.object({ name: z.string().min(1).max(120), description: z.string().max(500).default('') }))
    .min(1)
    .max(10),
});

const recommendSchema = z.object({
  text: z.string().min(5).max(600),
  reason: z.string().max(300).default(''),
});

module.exports = { tutorSchema, mcqSchema, openQSchema, gradeSchema, conceptsSchema, recommendSchema };
