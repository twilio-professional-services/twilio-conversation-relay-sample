import request from 'supertest';
import { app } from '../../src/server';

describe('Call Routes', () => {
  it('should handle incoming call', async () => {
    const response = await request(app)
      .post('/api/incoming-call')
      .send({ phoneNumber: '+1234567890' })
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body.phoneNumber).toBe('+1234567890');
    expect(response.body.status).toBe('received');
  });

  it('should return 500 for invalid call data', async () => {
    await request(app)
      .post('/api/incoming-call')
      .send({})
      .expect(500);
  });
});
