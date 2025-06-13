import { z } from 'zod';
import { db } from './db';

// Input validation schemas
const idNumberSchema = z.string().min(1, "נא להזין מספר תעודת זהות");
const nameSchema = z.string().min(1, "נא להזין שם");
const guessSchema = z.string().min(1, "נא להזין ניחוש");
const answerSchema = z.array(z.string().min(1, "נא להזין תשובה"));

// List of accepted participants
// const ACCEPTED_PARTICIPANTS = [ ... ];

export async function isParticipantAllowed(idNumber: string): Promise<boolean> {
  return await db.isParticipantApproved(idNumber);
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input.trim();
}

interface ValidationSchema {
  [key: string]: 'string' | 'number' | 'boolean' | 'array';
}

export function validateAndSanitize<T extends Record<string, any>>(
  data: T,
  schema: ValidationSchema
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, type] of Object.entries(schema)) {
    const value = data[key];

    if (value === undefined || value === null) {
      continue;
    }

    switch (type) {
      case 'string':
        if (typeof value === 'string') {
          // Basic XSS prevention
          result[key] = value
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
        break;
      case 'number':
        if (typeof value === 'number' || !isNaN(Number(value))) {
          result[key] = Number(value);
        }
        break;
      case 'boolean':
        if (typeof value === 'boolean') {
          result[key] = value;
        }
        break;
      case 'array':
        if (Array.isArray(value)) {
          result[key] = value;
        }
        break;
    }
  }

  return result;
}

// Validate and sanitize input for user submissions
export function validateAndSanitizeUser(input: {
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
      answer: result.answer ? result.answer.map(ans => sanitizeInput(ans)) : undefined,
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
  answer?: string[]
}) {
  try {
    const schema = z.object({
      answer: answerSchema,
    });

    const result = schema.parse(input);
    return {
      answer: result.answer.map(ans => sanitizeInput(ans)),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return null;
    }
    throw error;
  }
} 