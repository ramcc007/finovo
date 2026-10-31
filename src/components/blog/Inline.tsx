import Link from 'next/link';
import { Fragment } from 'react';

// Renders **bold** and [text](/internal-path) inline markup safely (no HTML injection).
const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export default function Inline({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-[#0D1117]"><Inline text={part.slice(2, -2)} /></strong>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return <Link key={i} href={link[2]} className="text-[#EA580C] underline underline-offset-2 hover:text-[#C2410C]">{link[1]}</Link>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
