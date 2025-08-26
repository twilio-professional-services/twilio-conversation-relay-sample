import mockData from "../../../data/mock-data";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

interface VerifyUserParams {
  firstName: string;
  lastName: string;
  DOB: string;
}

export async function verifyUser(params: VerifyUserParams): Promise<string> {
  console.log("Verify User Params", params);

  for (const user of mockData.users) {
    console.log("User", user);
    if (
      user.firstName === params.firstName &&
      user.lastName === params.lastName &&
      user.dob === params.DOB
    ) {
      return JSON.stringify({
        userId: user.userId,
        verified: true,
      });
    }
  }

  return JSON.stringify({
    userId: null,
    verified: false,
  });
}

export const verifyUserTool = tool(
  async ({
    firstName,
    lastName,
    DOB,
  }: {
    firstName: string;
    lastName: string;
    DOB: string;
  }) => {
    console.log("Verify User Tool Called", { firstName, lastName, DOB });
    return await verifyUser({ firstName, lastName, DOB });
  },
  {
    name: "verify_user",
    description:
      "Verify a user's identity by matching their first name, last name, and date of birth. Returns user ID if verified successfully, or verification failure status.",
    schema: z.object({
      firstName: z.string().min(1).describe("The user's first name (REQUIRED)"),
      lastName: z.string().min(1).describe("The user's last name (REQUIRED)"),
      DOB: z
        .string()
        .min(1)
        .describe(
          "The user's date of birth (REQUIRED) - format: YYYY-MM-DD or similar"
        ),
    }) as any,
  }
);
