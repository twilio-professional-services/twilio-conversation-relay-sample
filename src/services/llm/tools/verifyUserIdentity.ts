import mockData from "../../../data/mock-data";


export interface VerifyUserParams {
  firstName: string;
  lastName: string;
  DOB: string;
}

export async function verifyUser(params: VerifyUserParams): Promise<string> {

  console.log('Verify User Params', params);

  for (const user of mockData.users) {
    console.log('User', user);
    if (user.firstName === params.firstName && user.lastName === params.lastName && user.dob === params.DOB) {
      return JSON.stringify({
        userId: user.userId,
        verified: true
      });
    }
  }

  return JSON.stringify({
    userId: null,
    verified: false
  });
}


