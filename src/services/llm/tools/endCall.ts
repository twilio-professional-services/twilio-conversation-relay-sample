export interface EndCallParams {
  reason: string;
}

export async function endCall(params: EndCallParams): Promise<string> {
  console.log(`Ending call. Reason: ${params.reason}`);

  // Return a message that will be spoken before the call ends
  return `Thank you for calling. Have a great day, goodbye!`;
}
