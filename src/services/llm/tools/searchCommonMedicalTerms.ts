import mockData from "../../../data/mock-data";

enum InquirerType {
   DEDUCTIBLE,
   COPAY,
   HSA,
   OUT_OF_POCKET_MAX,
}

export async function searchCommonMedicalTerms(
   inquiry: InquirerType | string | { inquiry: string }
): Promise<string> {

   const normalizedInquiry = 
     typeof inquiry === "object" && "inquiry" in inquiry 
       ? inquiry.inquiry.toUpperCase()
       : typeof inquiry === "string"
         ? inquiry.toUpperCase()
         : InquirerType[inquiry];

   const inquiryKeyMap: {
     [key: string]: keyof typeof mockData.common_terms;
   } = {
     DEDUCTIBLE: "deductible",
     COPAY: "copay",
     HSA: "hsa",
     OUT_OF_POCKET_MAX: "out_of_pocket_max",
   };

   const term = mockData.common_terms[inquiryKeyMap[normalizedInquiry]];

   return (
     term ||
     "No information found. Please let the caller know that you could not find the information they were looking for."
   );
}
