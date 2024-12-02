import { handleIncomingCall } from '../../src/controllers/callController';

describe('Call Controller', () => {
  it('should process a valid incoming call', async () => {
    const callData = { phoneNumber: '+1234567890' };
    const result = await handleIncomingCall(callData);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('timestamp');
    expect(result.phoneNumber).toBe('+1234567890');
    expect(result.status).toBe('received');
  });

  it('should throw an error for invalid call data', async () => {
    await expect(handleIncomingCall({})).rejects.toThrow('Invalid call data');
    await expect(handleIncomingCall(null)).rejects.toThrow('Invalid call data');
  });
});
