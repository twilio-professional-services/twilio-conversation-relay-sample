/**
 * Outbound Call Routes
 * Defines REST API and webhook endpoints for outbound calling with AMD
 */

import express, { Request, Response } from 'express';
import {
  initiateOutboundCall,
  handleOutboundCallAnswer,
  handleAMDStatus,
  handleConversationRelayConnect,
  handleVoicemail,
  handleCallStatus,
} from '../controllers/outboundCallController';
import { validateTwilioWebhookConditional } from '../middleware/webhookValidation';
import { PhoneValidator } from '../helpers/phoneValidator';

const router = express.Router();

/**
 * POST /api/outbound-call
 * REST API to initiate an outbound call
 */
router.post(
  '/outbound-call',
  async (req: Request, res: Response) => {
    try {
      const { to, customerContext, voicemailMessage, from } = req.body;

      // Validate required fields
      if (!to) {
        res.status(400).json({ error: '"to" field is required' });
        return;
      }

      // Validate phone number format
      const validation = PhoneValidator.validate(to);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Invalid phone number',
          message: validation.error,
        });
        return;
      }

      // Validate from number if provided
      if (from) {
        const fromValidation = PhoneValidator.validate(from);
        if (!fromValidation.valid) {
          res.status(400).json({
            error: 'Invalid "from" phone number',
            message: fromValidation.error,
          });
          return;
        }
      }

      // Initiate call
      const result = await initiateOutboundCall({
        to,
        customerContext,
        voicemailMessage,
        from,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('[API] Failed to initiate outbound call:', error);
      res.status(500).json({
        error: 'Failed to initiate call',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/outbound-call-answer
 * Webhook called when outbound call is answered (before AMD result)
 */
router.post(
  '/outbound-call-answer',
  validateTwilioWebhookConditional,
  async (req: Request, res: Response) => {
    try {
      const twiml = await handleOutboundCallAnswer(req.body);
      res.type('text/xml');
      res.status(200).send(twiml);
    } catch (error: any) {
      console.error('[Webhook] Failed to handle call answer:', error);
      res.status(500).json({
        error: 'Failed to handle call answer',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/outbound-call-amd
 * Webhook for async AMD status callback
 * Called when AMD detection completes
 */
router.post(
  '/outbound-call-amd',
  validateTwilioWebhookConditional,
  async (req: Request, res: Response) => {
    try {
      await handleAMDStatus(req.body);
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('[Webhook] Failed to handle AMD status:', error);
      res.status(500).json({
        error: 'Failed to handle AMD status',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/outbound-call-connect
 * Webhook to connect call to ConversationRelay (human detected)
 */
router.post(
  '/outbound-call-connect',
  validateTwilioWebhookConditional,
  async (req: Request, res: Response) => {
    try {
      const twiml = await handleConversationRelayConnect(req.body);
      res.type('text/xml');
      res.status(200).send(twiml);
    } catch (error: any) {
      console.error('[Webhook] Failed to connect to ConversationRelay:', error);
      res.status(500).json({
        error: 'Failed to connect',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/outbound-call-voicemail
 * Webhook to play voicemail message (machine detected)
 */
router.post(
  '/outbound-call-voicemail',
  validateTwilioWebhookConditional,
  async (req: Request, res: Response) => {
    try {
      const twiml = await handleVoicemail(req.body);
      res.type('text/xml');
      res.status(200).send(twiml);
    } catch (error: any) {
      console.error('[Webhook] Failed to play voicemail:', error);
      res.status(500).json({
        error: 'Failed to play voicemail',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/outbound-call-status
 * Webhook for call status updates
 * Called for each status change (initiated, ringing, answered, completed)
 */
router.post(
  '/outbound-call-status',
  validateTwilioWebhookConditional,
  async (req: Request, res: Response) => {
    try {
      await handleCallStatus(req.body);
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('[Webhook] Failed to handle call status:', error);
      res.status(500).json({
        error: 'Failed to handle status update',
        message: error.message,
      });
    }
  }
);

export default router;
