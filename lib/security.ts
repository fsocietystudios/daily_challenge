import { z } from 'zod';

// Input validation schemas
const idNumberSchema = z.string().min(1, "נא להזין מספר תעודת זהות");
const nameSchema = z.string().min(1, "נא להזין שם");
const guessSchema = z.string().min(1, "נא להזין ניחוש");
const answerSchema = z.string().min(1, "נא להזין תשובה");

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input.trim();
}

// Validate and sanitize input for user submissions
export function validateAndSanitize(input: {
  idNumber?: string
  name?: string
  guess?: string
  answer?: string
}) {
  try {
    const schema = z.object({
      idNumber: idNumberSchema,
      name: nameSchema,
      guess: guessSchema,
      answer: answerSchema.optional(),
    });

    const result = schema.parse(input);
    return {
      idNumber: sanitizeInput(result.idNumber),
      name: sanitizeInput(result.name),
      guess: sanitizeInput(result.guess),
      answer: result.answer ? sanitizeInput(result.answer) : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return null;
    }
    throw error;
  }
}

// Validate and sanitize input for admin panel
export function validateAndSanitizeAdmin(input: {
  answer?: string
}) {
  try {
    const schema = z.object({
      answer: answerSchema,
    });

    const result = schema.parse(input);
    return {
      answer: sanitizeInput(result.answer),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return null;
    }
    throw error;
  }
} 