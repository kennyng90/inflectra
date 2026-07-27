/* An expected failure whose message is safe to show the user as-is. Anything
   else is unexpected, and shows the caller's fallback instead. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

/* A failure that will fail the same way next time, so nothing is gained by
   offering the user a retry. */
export class PermanentError extends UserFacingError {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentError';
  }
}

export function isPermanent(error: unknown): boolean {
  return error instanceof PermanentError;
}

export function userFacingMessage(error: unknown, fallback: string): string {
  return error instanceof UserFacingError ? error.message : fallback;
}

export const SERVER_UNCONFIGURED =
  "The server connection isn't set up yet. Restart the app and retry.";
