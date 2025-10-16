/**
 * sanitizeHelper.ts
 *
 * This helper module provides sanitization functions for cleaning user input
 * and ensuring that data sent from the API or displayed in the client is safe.
 * It removes or escapes potentially dangerous HTML or script content to
 * prevent XSS (Cross-Site Scripting) attacks.
 *
 * Usage:
 * - Use in API routes before returning user-generated content.
 * - Use in client-side rendering when displaying dynamic data.
 */

import sanitizeHtml from "sanitize-html";
import { NextResponse } from "next/server";

// Validation result structure.
export interface SanitizeResult {
  error?: string;
  value?: string;
}

//Sanitize plain text strictly (no tags, no attributes) used for user input fields like names, titles, etc.
export const sanitizePlainText = (input: string): string => {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

/**
 * Validate and sanitize a string input with:
 * - Type check, Empty check, Length check (grapheme-based, handles Japanese/emoji)
 * - HTML tag sanitization
 */

export const sanitizeAndValidateString = (
  input: unknown,
  maxLength: number,
  fieldName: string
): SanitizeResult => {
  if (typeof input !== "string" || input.trim() === "") {
    return { error: `${fieldName} cannot be empty.` };
  }

  const trimmed = input.trim();

  // Measure visible length (multi-byte safe)
  const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
  const realLength = [...segmenter.segment(trimmed)].length;

  if (realLength > maxLength) {
    return { error: `${fieldName} cannot exceed ${maxLength} characters.` };
  }

  // Strict sanitize: remove all tags and attributes
  const sanitized = sanitizePlainText(trimmed);

  if (sanitized.trim() === "") {
    return { error: `${fieldName} contains invalid characters or was removed.` };
  }

  return { value: sanitized };
};

//Logs server details but returns generic messages to clients.

export const handleServerError = (context: string, error: unknown, status: number = 500) => {
  if (error instanceof Error) {
    console.error(`${context}:`, error.message);
  } else {
    console.error(`${context}:`, error);
  }

  // Avoid exposing internal details to the client
    return NextResponse.json(
        { message: "An unexpected server error occurred." }, 
        { status: status }
    );
};