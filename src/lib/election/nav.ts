// The header and footer link to the live election page for one week, then it is removed
// from both. The page itself stays online and indexed. Change the date to extend or end it.
export const ELECTION_LINK_UNTIL = Date.parse('2026-11-10T17:00:00Z');
export const electionLinkActive = (now = Date.now()) => now < ELECTION_LINK_UNTIL;
export const ELECTION_PATH = '/us-midterm-elections';
