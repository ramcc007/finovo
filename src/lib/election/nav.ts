// The live election page is no longer linked from the header or footer (4 Nov 2026 coverage has ended).
// The page and its section and race pages stay online and indexed. To bring the links back,
// make electionLinkActive return true again (or compare against a date, as before).
export const electionLinkActive = (): boolean => false;
export const ELECTION_PATH = '/us-midterm-elections';
