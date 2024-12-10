import mockData from "../../../data/mock-data";

export interface CheckHsaAccountParams {
  userId: string;
}

export async function checkHsaAccount(params: CheckHsaAccountParams): Promise<string> {

  console.log('Check HSA Account Params', params);

  const user = mockData.users.find((user) => user.userId === params.userId);

  if(user?.hsaAccount) { 
    return JSON.stringify({ userId: params.userId, hsaAccount: user.hsaAccount });
  } else {
    return "No HSA account found.";
  }
}
