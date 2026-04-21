import express, { Request, Response } from 'express';
import { initiateOutboundCall, OutboundCallRequest } from '../controllers/outboundCallController';

const router = express.Router();

router.post('/outbound-call', async (req: Request, res: Response) => {
  try {
    const { to, from, client_name, first_name, date, start_time, end_time, occupation } = req.body as OutboundCallRequest;

    if (!to) {
      res.status(400).json({ error: 'Destination phone number (to) is required' });
      return;
    }

    const requiredFields = { client_name, first_name, date, start_time, end_time, occupation };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
      return;
    }

    const result = await initiateOutboundCall({ to, from, client_name, first_name, date, start_time, end_time, occupation });

    res.status(200).json({
      success: true,
      callSid: result.callSid,
      status: result.status,
      message: 'Outbound call initiated successfully',
    });
  } catch (error) {
    console.error('Error initiating outbound call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate outbound call',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
