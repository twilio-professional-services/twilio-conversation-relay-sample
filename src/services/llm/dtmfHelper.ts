
export class DTMFHelper {
  private dtmfMapping: { [key: string]: string } = {
    "1": "The caller has requested to switch to Spanish.",
          
    // "2": "Two",
    // "3": "Three",
    // "4": "Four",
    // "5": "Five",
    // "6": "Six",
    // "7": "Seven",
    // "8": "Eight",
    // "9": "Nine",
    // "0": "Zero",
    // "*": "Star",
    // "#": "Pound"
  };

  public processDTMF(digit: string):string {
    const result = this.dtmfMapping[digit];
    return result || "Unknown";
  }
}