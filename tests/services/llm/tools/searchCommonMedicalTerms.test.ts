import { searchCommonMedicalTerms } from '../../../../src/services/llm/tools/searchCommonMedicalTerms';
import mockData from '../../../../src/data/mock-data';

jest.mock('../../../../src/data/mock-data', () => ({
  common_terms: {
    deductible:
      "Deductible is the amount you pay for covered health care services before your insurance plan starts to pay.",
    copay:
      "A copay is a fixed amount you pay for a covered health care service after you’ve paid your deductible.",
    hsa: "A Health Savings Account (HSA) is a type of savings account that lets you set aside money on a pre-tax basis to pay for qualified medical expenses.",
    out_of_pocket_max:
      "The most you have to pay for covered services in a plan year.",
  },
}));

enum InquirerType {
  DEDUCTIBLE,
  COPAY,
  HSA,
  OUT_OF_POCKET_MAX,
}

describe("searchCommonMedicalTerms", () => {
  it("should return the correct definition for DEDUCTIBLE using enum", async () => {
    const result = await searchCommonMedicalTerms(InquirerType.DEDUCTIBLE);
    expect(result).toBe(mockData.common_terms.deductible);
  });

  it("should return the correct definition for COPAY using string", async () => {
    const result = await searchCommonMedicalTerms("copay");
    expect(result).toBe(mockData.common_terms.copay);
  });

  it("should return the correct definition for HSA using object", async () => {
    const result = await searchCommonMedicalTerms({ inquiry: "hsa" });
    expect(result).toBe(mockData.common_terms.hsa);
  });

  it("should return the correct definition for OUT_OF_POCKET_MAX using enum", async () => {
    const result = await searchCommonMedicalTerms(
      InquirerType.OUT_OF_POCKET_MAX
    );
    expect(result).toBe(mockData.common_terms.out_of_pocket_max);
  });

  it("should return a default message for an unknown inquiry", async () => {
    const result = await searchCommonMedicalTerms("unknown");
    expect(result).toBe(
      "No information found. Please let the caller know that you could not find the information they were looking for."
    );
  });

  it("should return a default message for an unknown inquiry object", async () => {
    const result = await searchCommonMedicalTerms({ inquiry: "unknown" });
    expect(result).toBe(
      "No information found. Please let the caller know that you could not find the information they were looking for."
    );
  });
});
