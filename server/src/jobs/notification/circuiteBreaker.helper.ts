class CircuitBreaker {
  private readonly FAILURE_THRESHOLD = 5;
  readonly COOLDOWN_PERIOD_MS = 60 * 1000;
  private recentFailures = 0;
  private lastFailureTimestamp = 0;
  public circuitBreakerIsOpen() {
    return (
      this.recentFailures >= this.FAILURE_THRESHOLD &&
      Date.now() - this.lastFailureTimestamp < this.COOLDOWN_PERIOD_MS
    );
  }
  public recordFailure() {
    this.recentFailures++;
    this.lastFailureTimestamp = Date.now();
  }
  public reset() {
    this.recentFailures = 0;
    this.lastFailureTimestamp = 0;
  }
}

export default CircuitBreaker;