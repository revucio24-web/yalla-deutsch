import type { ReactNode } from 'react';
import type { Word } from './domain';
import { isWordIllustrationKey, type WordIllustrationKey } from './illustrationKeys';

const ink = '#31585a';
const green = '#83b9a0';
const mint = '#d8eee0';
const peach = '#f0a17e';
const yellow = '#f4c85f';
const cream = '#fff3d4';
const blue = '#8fc9d0';

const illustrations: Record<WordIllustrationKey, ReactNode> = {
  room: <><rect x="8" y="9" width="48" height="46" rx="4" fill={cream} stroke={ink} strokeWidth="3"/><path d="M8 39h48M16 39V25h15v14M37 18h11v13H37z" fill={blue} stroke={ink} strokeWidth="2.5"/><path d="M31 39v12M16 51h32" stroke={ink} strokeWidth="3" strokeLinecap="round"/></>,
  table: <><rect x="8" y="18" width="48" height="12" rx="4" fill={yellow} stroke={ink} strokeWidth="3"/><path d="M15 30l-3 25M49 30l3 25" stroke={ink} strokeWidth="4" strokeLinecap="round"/><path d="M20 34h24" stroke="#d58a51" strokeWidth="2"/></>,
  chair: <><rect x="17" y="8" width="30" height="27" rx="6" fill={green} stroke={ink} strokeWidth="3"/><rect x="12" y="31" width="40" height="9" rx="4" fill={yellow} stroke={ink} strokeWidth="3"/><path d="M17 40l-3 15M47 40l3 15" stroke={ink} strokeWidth="4" strokeLinecap="round"/></>,
  wardrobe: <><rect x="12" y="7" width="40" height="50" rx="4" fill="#f3d2a6" stroke={ink} strokeWidth="3"/><path d="M32 8v48" stroke={ink} strokeWidth="2.5"/><path d="M27 29v5M37 29v5" stroke={ink} strokeWidth="3" strokeLinecap="round"/><path d="M17 13h10M37 13h10" stroke="#fff4db" strokeWidth="2"/></>,
  lamp: <><path d="M19 10h26l7 20H12z" fill={yellow} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M32 30v18M22 53h20" stroke={ink} strokeWidth="4" strokeLinecap="round"/><path d="M32 5V2M10 14l-4-3M54 14l4-3" stroke={peach} strokeWidth="3" strokeLinecap="round"/></>,
  'bread-roll': <><ellipse cx="32" cy="36" rx="23" ry="17" fill="#e9b66f" stroke={ink} strokeWidth="3"/><path d="M21 27l6 7M31 21l6 8M41 25l5 7" stroke="#fff0c9" strokeWidth="3" strokeLinecap="round"/><path d="M16 47q16 9 32 0" stroke="#cf8d50" strokeWidth="2" fill="none"/></>,
  flour: <><path d="M22 8h20l-2 7 8 8-4 32H20l-4-32 8-8z" fill={cream} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M24 8h16M22 29q10-9 20 0M25 39h14" stroke={ink} strokeWidth="2.5" strokeLinecap="round"/><path d="M27 47h10" stroke={peach} strokeWidth="3" strokeLinecap="round"/></>,
  bottle: <><path d="M26 7h12v9l6 6v31q0 4-4 4H24q-4 0-4-4V22l6-6z" fill={blue} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M26 16h12M21 30h22" stroke={ink} strokeWidth="2.5"/><path d="M32 34v10M27 39h10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></>,
  'cash-register': <><path d="M10 31h44v23H10z" fill={peach} stroke={ink} strokeWidth="3"/><path d="M17 12h30v19H17z" rx="3" fill={mint} stroke={ink} strokeWidth="3"/><path d="M21 18h21v7H21z" fill={blue} stroke={ink} strokeWidth="2"/><circle cx="20" cy="40" r="2" fill={ink}/><circle cx="28" cy="40" r="2" fill={ink}/><circle cx="36" cy="40" r="2" fill={ink}/><path d="M16 49h32" stroke={ink} strokeWidth="2.5"/></>,
  platform: <><path d="M7 48h50" stroke={ink} strokeWidth="4"/><path d="M13 46V25h38v21" fill={blue} stroke={ink} strokeWidth="3"/><path d="M9 55h46" stroke="#879b99" strokeWidth="3" strokeDasharray="5 4"/><path d="M18 20h28" stroke={yellow} strokeWidth="5"/><path d="M19 31h8M35 31h8" stroke="#fff" strokeWidth="3" strokeLinecap="round"/><path d="M14 42h36" stroke={peach} strokeWidth="3"/></>,
  intersection: <><path d="M26 4h12v20h20v12H38v24H26V36H6V24h20z" fill="#9aafae" stroke={ink} strokeWidth="2.5"/><path d="M32 5v13M32 44v14M7 30h12M45 30h13" stroke={cream} strokeWidth="2.5" strokeDasharray="4 4"/></>,
  'ticket-machine': <><path d="M19 8h26v44H19z" fill={peach} stroke={ink} strokeWidth="3"/><path d="M23 13h18v13H23z" fill={blue} stroke={ink} strokeWidth="2"/><path d="M24 33h16M24 38h11" stroke={ink} strokeWidth="2.5" strokeLinecap="round"/><path d="M22 44h20v8H22z" fill={cream} stroke={ink} strokeWidth="2"/><path d="M27 57v4M37 57v4" stroke={ink} strokeWidth="3" strokeLinecap="round"/></>,
  departure: <><circle cx="23" cy="27" r="17" fill={cream} stroke={ink} strokeWidth="3"/><path d="M23 17v11l8 4" stroke={ink} strokeWidth="3" strokeLinecap="round"/><path d="M34 45h22M48 38l8 7-8 7" stroke={peach} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 53h23" stroke={ink} strokeWidth="3" strokeLinecap="round"/></>,
  arrival: <><path d="M8 16h48v39H8z" fill={cream} stroke={ink} strokeWidth="3"/><path d="M19 55V32a13 13 0 0 1 26 0v23" fill={blue} stroke={ink} strokeWidth="3"/><path d="M9 26h10M45 26h10" stroke={peach} strokeWidth="4" strokeLinecap="round"/><path d="M22 44h20" stroke={ink} strokeWidth="2.5"/></>,
  path: <><path d="M8 58Q20 47 19 39T32 29Q45 20 42 7h14q4 20-10 30T39 58z" fill="#e8c48a" stroke={ink} strokeWidth="3" strokeLinejoin="round"/><circle cx="15" cy="18" r="5" fill={green}/><circle cx="51" cy="16" r="5" fill={green}/></>,
  corner: <><path d="M16 8v31q0 9 9 9h27" stroke="#e9bd6f" strokeWidth="15" fill="none" strokeLinecap="round"/><path d="M16 8v31q0 9 9 9h27" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round"/><path d="M44 40l8 8-8 8" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
  delay: <><circle cx="30" cy="31" r="20" fill={cream} stroke={ink} strokeWidth="3"/><path d="M30 18v14l10 6" stroke={ink} strokeWidth="3" strokeLinecap="round"/><path d="M49 11l6 6M55 11l-6 6" stroke={peach} strokeWidth="3.5" strokeLinecap="round"/><path d="M7 56h47" stroke={ink} strokeWidth="3" strokeLinecap="round"/></>,
  driver: <><circle cx="32" cy="34" r="22" fill={blue} stroke={ink} strokeWidth="3"/><circle cx="32" cy="34" r="7" fill={cream} stroke={ink} strokeWidth="3"/><path d="M32 27V13M26 37L15 45M38 37l11 8" stroke={ink} strokeWidth="3.5" strokeLinecap="round"/><circle cx="32" cy="11" r="5" fill={peach} stroke={ink} strokeWidth="2"/></>,
  transfer: <><rect x="5" y="13" width="21" height="30" rx="5" fill={blue} stroke={ink} strokeWidth="3"/><rect x="38" y="25" width="21" height="30" rx="5" fill={yellow} stroke={ink} strokeWidth="3"/><path d="M25 22h16M35 16l7 6-7 6" stroke={peach} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="47" r="3" fill={ink}/><circle cx="21" cy="47" r="3" fill={ink}/><circle cx="44" cy="59" r="3" fill={ink}/><circle cx="54" cy="59" r="3" fill={ink}/></>,
  profession: <><rect x="9" y="20" width="46" height="32" rx="5" fill={yellow} stroke={ink} strokeWidth="3"/><path d="M23 20v-7h18v7M9 32h46M27 31v6h10v-6" stroke={ink} strokeWidth="3" fill="none" strokeLinejoin="round"/><path d="M19 44h8M37 44h8" stroke={peach} strokeWidth="3" strokeLinecap="round"/></>,
  interview: <><circle cx="18" cy="19" r="8" fill={peach}/><circle cx="46" cy="19" r="8" fill={blue}/><path d="M7 45q1-16 11-16t11 16M35 45q1-16 11-16t11 16" fill={mint} stroke={ink} strokeWidth="2.5"/><path d="M14 49h36v7H14z" fill={yellow} stroke={ink} strokeWidth="2.5"/><path d="M29 8h15l4 5-4 5H29z" fill={cream} stroke={ink} strokeWidth="2"/></>,
  head: <><path d="M18 50V31a15 15 0 1 1 30 0v10h-7l-3 9z" fill={peach} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M20 30q3-20 22-14 8 3 8 14" fill={ink}/><path d="M37 35h1" stroke={ink} strokeWidth="3" strokeLinecap="round"/><path d="M42 41q-4 3-8 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round"/></>,
  abdomen: <><path d="M22 9q10 6 20 0l4 12 9 9-6 7-4-4-2 24H21l-2-24-4 4-6-7 10-9z" fill={blue} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><ellipse cx="32" cy="38" rx="9" ry="8" fill={peach} stroke={ink} strokeWidth="2.5"/><path d="M27 20h10" stroke={ink} strokeWidth="2"/></>,
  back: <><path d="M22 9q10 6 20 0l4 12 9 9-6 7-4-4-2 24H21l-2-24-4 4-6-7 10-9z" fill={green} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M32 20v30M29 25h6M29 31h6M29 37h6M29 43h6" stroke={peach} strokeWidth="3" strokeLinecap="round"/></>,
  pharmacy: <><path d="M9 25h46v31H9z" fill={cream} stroke={ink} strokeWidth="3"/><path d="M6 25l26-17 26 17" fill={peach} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M25 15h14v4H25z" fill={mint}/><path d="M28 11h8v12h-8zM26 13h12v8H26z" fill="#fff" stroke={ink} strokeWidth="2"/><path d="M15 36h11v20H15zM39 36h11v11H39z" fill={blue} stroke={ink} strokeWidth="2"/><path d="M30 44h5v12h-5z" fill={yellow}/></>,
  pain: <><circle cx="31" cy="20" r="9" fill={peach} stroke={ink} strokeWidth="2.5"/><path d="M21 33q10-9 20 0l5 23H17z" fill={blue} stroke={ink} strokeWidth="3"/><path d="M48 17l3-6 3 6 6 2-6 3-2 6-3-6-6-2z" fill={peach} stroke={ink} strokeWidth="1.5"/><path d="M11 12l2 4M7 20l5 1" stroke={peach} strokeWidth="3" strokeLinecap="round"/></>,
  cough: <><circle cx="30" cy="31" r="20" fill={peach} stroke={ink} strokeWidth="3"/><path d="M15 23q13-16 31 0" fill={ink}/><circle cx="24" cy="30" r="2" fill={ink}/><circle cx="37" cy="30" r="2" fill={ink}/><path d="M28 38q4-3 8 0M48 32h9M47 38h8M45 44h7" stroke={ink} strokeWidth="2.5" strokeLinecap="round"/><path d="M21 48l-5 7h19" fill={cream} stroke={ink} strokeWidth="2.5" strokeLinejoin="round"/></>,
  medicine: <><path d="M23 9h18v9l6 7v27q0 4-4 4H21q-4 0-4-4V25l6-7z" fill={blue} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M23 18h18M19 31h28" stroke={ink} strokeWidth="2.5"/><path d="M32 35v12M26 41h12" stroke="#fff" strokeWidth="4" strokeLinecap="round"/></>,
  tablet: <><g transform="rotate(-38 32 32)"><rect x="18" y="12" width="28" height="40" rx="14" fill={cream} stroke={ink} strokeWidth="3"/><path d="M18 32h28" stroke={ink} strokeWidth="3"/><path d="M21 21q2-5 7-6" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></g></>,
  visitor: <><path d="M11 55V15h25v40" fill={cream} stroke={ink} strokeWidth="3"/><circle cx="42" cy="29" r="8" fill={peach} stroke={ink} strokeWidth="2"/><path d="M31 52q1-14 11-14t11 14" fill={blue} stroke={ink} strokeWidth="2.5"/><path d="M19 32h10M19 38h7" stroke={ink} strokeWidth="2"/><path d="M14 9h18" stroke={yellow} strokeWidth="3" strokeLinecap="round"/></>,
  gram: <><path d="M21 14h22l6 10-5 29H20l-5-29z" fill="#c5d6d3" stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M25 14v-5h14v5" stroke={ink} strokeWidth="3" fill="none"/><text x="32" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill={ink}>1 g</text></>,
  pay: <><path d="M9 42q7-11 15-9l7 4h15q7 0 7 6t-7 6H32" fill={peach} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><circle cx="22" cy="21" r="11" fill={yellow} stroke={ink} strokeWidth="3"/><path d="M22 15v12M18 19h7" stroke={ink} strokeWidth="2.5" strokeLinecap="round"/><path d="M14 56h36" stroke={ink} strokeWidth="3" strokeLinecap="round"/></>,
  destination: <><path d="M8 17l15-7 18 7 15-7v39l-15 7-18-7-15 7z" fill={mint} stroke={ink} strokeWidth="3" strokeLinejoin="round"/><path d="M23 10v39M41 17v39" stroke={ink} strokeWidth="2.5"/><path d="M33 22q-9 0-9 9 0 7 9 15 9-8 9-15 0-9-9-9z" fill={peach} stroke={ink} strokeWidth="2.5"/><circle cx="33" cy="31" r="3" fill="#fff"/></>,
  reserve: <><path d="M18 12h28v23H18z" fill={blue} stroke={ink} strokeWidth="3"/><path d="M13 35h38v8H13zM18 43v12M46 43v12" stroke={ink} strokeWidth="3" strokeLinecap="round"/><circle cx="47" cy="17" r="11" fill={mint} stroke={ink} strokeWidth="2.5"/><path d="M42 17l4 4 7-8" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
  reschedule: <><rect x="10" y="13" width="37" height="42" rx="4" fill={cream} stroke={ink} strokeWidth="3"/><path d="M10 25h37M20 8v10M37 8v10" stroke={ink} strokeWidth="3" strokeLinecap="round"/><path d="M21 34h5M32 34h5M21 43h5" stroke={blue} strokeWidth="4" strokeLinecap="round"/><path d="M39 47l8-7 8 7M47 40v16" stroke={peach} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
  allergy: <><path d="M31 30q-1-17 0-23M31 30q-18-10-22-3M31 30q-14 15-10 21M31 30q15 13 22 9M31 30q15-15 20-14" stroke={green} strokeWidth="5" strokeLinecap="round"/><circle cx="31" cy="30" r="8" fill={yellow} stroke={ink} strokeWidth="2.5"/><circle cx="10" cy="13" r="2.5" fill={peach}/><circle cx="54" cy="26" r="3" fill={peach}/><circle cx="49" cy="53" r="2.5" fill={peach}/><path d="M10 46l2-4 2 4 4 2-4 2-2 4-2-4-4-2z" fill={peach}/></>,
  healthy: <><path d="M32 52S9 39 9 24a12 12 0 0 1 23-5 12 12 0 0 1 23 5c0 15-23 28-23 28z" fill={peach} stroke={ink} strokeWidth="3"/><path d="M23 32l6 6 13-15" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
};

export default function WordIllustration({
  word,
  className = '',
  decorative,
}: {
  word: Word;
  className?: string;
  decorative: boolean;
}) {
  const visual = isWordIllustrationKey(word.illustration) ? illustrations[word.illustration] : undefined;
  return <span
    className={`word-illustration ${className}`.trim()}
    aria-hidden={decorative ? true : undefined}
  >
    {visual ? <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">{visual}</svg> : <span aria-hidden="true">{word.icon}</span>}
    {!decorative && <span className="word-illustration-labels"><span lang="de" dir="ltr">{word.german}</span><span aria-hidden="true"> · </span><span lang="ar">{word.arabic}</span></span>}
  </span>;
}
