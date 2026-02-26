import express, { Request, Response } from "express";
import { handleOutboundLegAnswer } from "../controllers/outboundLegController";
import { validateTwilioWebhookConditional } from "../middleware/webhookValidation";

const router = express.Router();

router.post(
  "/outbound-leg-answer",
  validateTwilioWebhookConditional,
  async (req: Request, res: Response) => {
    try {
      const twiml = await handleOutboundLegAnswer(req.body);
      res.type("text/xml");
      console.log("Outbound leg TwiML:", twiml);
      res.status(200).send(twiml);
    } catch (error) {
      console.error("Failed to process outbound leg answer:", error);
      res.status(500).json({ error: "Failed to process outbound leg answer" });
    }
  }
);

export default router;
