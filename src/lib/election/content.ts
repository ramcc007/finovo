import { PAGE_PATH } from './types';

export const BASE = 'https://www.scripwise.co.in';
export const PAGE_URL = `${BASE}${PAGE_PATH}`;
export const PAGE_TITLE = 'US Midterm Elections 2026: Live Updates and Results';
export const PAGE_DESCRIPTION =
  'Live updates and results from the US midterm elections of 3 November 2026: Senate, House and governors, with the market impact for the US, Europe and India. Every update credits its source.';

export const INTRO =
  'Voters in the United States are electing all 435 seats of the House of Representatives, 35 Senate seats and 36 governors in the midterm elections of 3 November 2026. This page will carry the latest updates until the full results are known.';

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'When will the full results of the midterm elections be known?',
    a: 'Many races are called on the night of the vote or on the following day. Close contests, and states that count mail ballots slowly, can take several days or longer to be called.',
  },
  {
    q: 'How is control of the US Congress decided?',
    a: 'A party controls a chamber when it holds a majority of the seats in it. That is 218 of 435 seats in the House, and 51 of 100 seats in the Senate, where the Vice President casts the deciding vote in case of a tie.',
  },
  {
    q: 'How do midterm elections usually affect US stocks, the dollar and Treasury yields?',
    a: 'Markets mostly react to what an outcome may mean for taxes, government spending and borrowing. The effect has differed from one election to another, and no fixed pattern is guaranteed.',
  },
  {
    q: 'What do the midterm elections mean for European markets and the euro?',
    a: 'European investors will follow the outcome for its bearing on US trade policy, defence spending and interest rates. Any effect on the euro or on European shares will depend on the policies that follow.',
  },
  {
    q: 'What do the midterm elections mean for Indian markets?',
    a: 'Indian investors will follow the outcome for its bearing on US trade policy, interest rates and the dollar, which influence foreign portfolio investor flows and the rupee. The Nifty and the rupee can also move for reasons unrelated to the elections.',
  },
  {
    q: 'Where do the updates on this page come from?',
    a: 'They are compiled from public news feeds of established publishers, rewritten in the words of Scripwise, and each update links to the report it is based on.',
  },
];

export const HOW_IT_WORKS =
  'Scripwise collects headlines from the public news feeds of publishers such as AP, Reuters, NPR, BBC News, Politico, The Hill and The Guardian, and from Google News. Automated tools help to sort these reports by importance and to rewrite them in short, plain language. Only the facts stated in the original report are used, and the report is credited beneath every update. Seat counts are shown only after they have been checked by the Scripwise team. The team can edit or remove any update. All times are shown in US Pacific Time (PT), and hovering over a time shows US Eastern time. Pictures and videos are never stored by Scripwise. They load from free-licence image sites or from the YouTube player, and each one is credited.';
