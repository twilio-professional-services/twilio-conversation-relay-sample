import { WebSocket } from "ws";
import { DTMFHelper } from "./dtmfHelper";
import { EventEmitter } from "events";

export class IdleTimer extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private timeoutDuration: number;
  private dtmfHelper: DTMFHelper;

  constructor(timeoutDuration: number, dtmfHelper: DTMFHelper) {
    super();
    this.timeoutDuration = timeoutDuration;
    this.dtmfHelper = dtmfHelper;
  }

  public start(): void {
    this.clear(); // Clear any existing timer
    this.timer = setTimeout(() => {
      console.log("Idle timer expired. Resetting state.");
      this.dtmfHelper.resetState();
      this.emit("idleTimeout", {
        type: "idleTimeout",
        message: "Session timed out due to inactivity.",
      });
    }, this.timeoutDuration);
  }

  public clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
