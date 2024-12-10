import mockData from "../../../data/mock-data";

export interface CheckPaymentOptionsParams {
  userId: string;
  hsaAccountBalance: number;
  balance: number;
}

export async function checkPaymentOptions(params: CheckPaymentOptionsParams): Promise<string> {

  console.log('Check Payment Options Params', params);

  if (params.balance <= params.hsaAccountBalance) {
    return JSON.stringify({ userId: params.userId, paymentOptions: "[HSA Account]" });
  } else {
    return JSON.stringify({ userId: params.userId, paymentOptions: "[Payment Plan - ask caller if they would like to discus payment plan options. And invoke transfer to human agent if caller wants to learn more ]" });
  } 
}