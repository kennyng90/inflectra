/* An expected failure whose message is safe to show the user as-is. Anything
   else is unexpected, and shows the caller's fallback instead. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export function userFacingMessage(error: unknown, fallback: string): string {
  return error instanceof UserFacingError ? error.message : fallback;
}

export const SERVER_UNCONFIGURED =
  "The server connection isn't set up yet. Restart the app and retry.";
