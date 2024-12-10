import mockData from "../../../data/mock-data";

export interface CheckPendingBillParams {
  userId: string;
}

export async function checkPendingBill(
  params: CheckPendingBillParams
): Promise<string> {
  const bill = mockData.bills.find((bill) => bill.userId === params.userId);

  if (!bill) {
    return "No pending bill found.";
  }

  return JSON.stringify({ userId: params.userId, bill });
}
