import { Response } from 'express';

/**
 * Handles server errors, securely logs details, and returns a general error to the client.
 * @param res The Express Response object.
 * @param error The caught error object (unknown type).
 * @param endpointName The name of the endpoint where the error occurred (for logging).
 */

export const handleServerError = (
  res: Response,
  error: unknown,
  endpointName: string
): Response => {
  // Log detailed information on the server side
  let logMessage = `[${endpointName}] Server Error: `;

  if (error instanceof Error) {
    // For Error objects
    logMessage += error.message;
    console.error(logMessage, { stack: error.stack, errorObject: error });
  } else {
    // For other unknown/non-Error objects
    logMessage += "Unknown/Non-Error object caught.";
    console.error(logMessage, error);
  }

  //Return a general, safe message to the client
  return res.status(500).json({ message: "An unexpected server error occurred." });
};