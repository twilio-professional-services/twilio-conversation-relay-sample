export class DTMFHelper {
  private dtmfMapping: { [key: string]: string } = {
    "1": "The caller has requested to switch to Spanish.",
  };

  private state: string = "languageSwitch"; // Initial state
  private inputBuffer: string = ""; // Buffer to store input digits
  private isCollectionComplete: boolean = false; // Flag to indicate collection completion

  public processDTMF(digit: string): string {
    this.isCollectionComplete = false;
    this.inputBuffer += digit; // Append digit to buffer

    switch (this.state) {
      case "languageSwitch":
        if (digit === "1") {
          this.inputBuffer = ""; // Clear buffer for next input
          this.isCollectionComplete = true; // Reset completion flag
          return "Language switched to Spanish.";
        }
        this.inputBuffer = ""; // Clear buffer for invalid input
        return "Invalid input for language selection.";

      case "phoneNumber":
        if (this.inputBuffer.length === 10) {
          const phoneNumber = this.inputBuffer;
          this.inputBuffer = ""; // Clear buffer for next input
          this.isCollectionComplete = true; // Mark collection as complete
          return `Phone number received: ${phoneNumber}.`;
        }
        this.isCollectionComplete = false; // Collection not yet complete
        return "Collecting phone number...";

      case "dateOfBirth":
        if (this.inputBuffer.length === 8) {
          const dateOfBirth = this.inputBuffer;
          this.inputBuffer = ""; // Clear buffer after completion
          this.isCollectionComplete = true; // Mark collection as complete
          return `Date of birth received: ${dateOfBirth}.`;
        }
        this.isCollectionComplete = false; // Collection not yet complete
        return "Collecting date of birth...";

      default:
        this.inputBuffer = ""; // Clear buffer for unknown state
        this.isCollectionComplete = true; // Reset completion flag
        return "Unknown state.";
    }
  }

  public resetState(): void {
    this.state = "languageSwitch"; // Reset to initial state
    this.inputBuffer = ""; // Clear buffer
  }

  public setState(newState: string): void {
    this.state = newState; // Set the new state
    this.inputBuffer = ""; // Clear buffer for new input
    this.isCollectionComplete = false; // Reset completion flag
  }

  public isComplete(): boolean {
    return this.isCollectionComplete; // Return completion status
  }
}
