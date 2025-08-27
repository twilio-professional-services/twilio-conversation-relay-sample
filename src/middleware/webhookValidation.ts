import { Request, Response, NextFunction } from "express";
import { validateRequest } from "twilio";

/**
 * Middleware to validate Twilio webhook requests
 * Ensures requests are actually coming from Twilio and haven't been tampered with
 */
export function validateTwilioWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN not configured");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Get the Twilio signature from the request headers
  const twilioSignature = req.get("X-Twilio-Signature");

  if (!twilioSignature) {
    console.error("Missing X-Twilio-Signature header");
    return res.status(403).json({ error: "Forbidden - Invalid signature" });
  }

  // Construct the full URL that Twilio used to make the request
  const host = req.get("host");
  const url = `https://${host}${req.originalUrl}`;

  // Validate the request using Twilio's validation function
  const isValid = validateRequest(authToken, twilioSignature, url, req.body);

  if (!isValid) {
    console.error(`Invalid Twilio signature for URL: ${url}`);
    return res.status(403).json({ error: "Forbidden - Invalid signature" });
  }

  // If validation passes, continue to the next middleware/handler
  next();
}

/**
 * Conditional webhook validation middleware
 * Only validates in production, allows all requests in development
 */
export function validateTwilioWebhookConditional(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip validation in development environment
  if (process.env.NODE_ENV !== "production") {
    console.log("Development mode - skipping Twilio webhook validation");
    return next();
  }

  // Use full validation in production
  return validateTwilioWebhook(req, res, next);
}
