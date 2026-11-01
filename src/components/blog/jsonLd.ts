/** JSON for a <script type="application/ld+json">; escapes "<" so content can't close the tag. */
export const ld = (d: unknown) => JSON.stringify(d).replace(/</g, '\\u003c');
