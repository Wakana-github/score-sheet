// //PPreparing for refactor api-route for group.ts, and recotds.ts
// // have not been applied 
// import { JSDOM } from "jsdom";
// import DOMPurify from "dompurify";

// // Initialize JSDOM and pass it to enable DOMPurify functionality 
// // DOMPurify is used to sanitize all user-supplied input against XSS attacks.
// const { window } = new JSDOM("");
// export const domPurify = DOMPurify(window as any);

// interface SanitizeResult {
//   error?: string;
//   value?: string;
// }


// export const sanitizeAndValidateString = (
//   input: string,
//   maxLength: number,
//   fieldName: string,
// ): SanitizeResult => {
//   if (typeof input !== "string") {
//     return { error: `Invalid type for ${fieldName}.` };
//   }

//   const trimmedInput = input.trim();
//   const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
//   const realLength = [...segmenter.segment(trimmedInput)].length;

//   if (realLength > maxLength) {
//     return { error: `${fieldName} cannot exceed ${maxLength} characters.` };
//   }

//   const sanitized = domPurify.sanitize(trimmedInput);
//   return { value: sanitized };
// };