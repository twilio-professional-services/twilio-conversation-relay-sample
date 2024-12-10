import express, { Request, Response } from 'express';
import { handleConnectAction } from '../controllers/connectActionController';

const router = express.Router();

router.post('/action', async (req: Request, res: Response) => {
  try {
    await handleConnectAction(req.body);
    res.type('text/xml');
    res.status(200).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to process connect action' });
  }
});

export default router;