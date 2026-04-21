export async function confirmShiftBid(): Promise<string> {
  // Generate a random 6-8 character confirmation ID
  const length = Math.floor(Math.random() * 3) + 6; // 6, 7, or 8 characters
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, 1, I
  let confirmationId = '';

  for (let i = 0; i < length; i++) {
    confirmationId += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  console.log(`Shift bid confirmed. Confirmation ID: ${confirmationId}`);

  return `Your shift bid has been recorded. Your confirmation number is ${confirmationId}. Please write this down. You will receive a confirmation call if you are awarded this shift.`;
}
