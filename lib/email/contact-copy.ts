/** Client-safe copy and flags for the subscribers admin. No server imports. */

/** Wording for the confirm dialog. Always states the exact number. */
export function deleteConfirmText(n: number): string {
  return n === 1
    ? "Delete 1 subscriber? This removes them from the list and the waitlist, and cancels any email still queued for them. It cannot be undone."
    : `Delete ${n} subscribers? This removes them from the list and the waitlist, and cancels any email still queued for them. It cannot be undone.`;
}

/** Bounced or complained rows stay read only so the suppression record is not edited away. Delete is still allowed. */
export function editLocked(status: string, suppressed: boolean): boolean {
  return suppressed || status === "bounced" || status === "complained";
}
