export default function ShopIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" /></>,
    tech: <><rect x="4" y="3" width="16" height="13" rx="1"/><path d="M2 20h20M9 16v4m6-4v4"/></>,
    sport: <><path d="M6 5v14M3 8v8M18 5v14m3-11v8M6 12h12"/></>,
    appliance: <><path d="M7 3h10l-1 14H8L7 3ZM6 21h12M9 17l-2 4m8-4 2 4"/><circle cx="12" cy="10" r="1"/></>,
    fashion: <><path d="M10 5a2 2 0 1 1 3 1.7L12 8v3l9 7v2H3v-2l9-7"/></>,
    game: <><path d="M7 7h10c4 0 6 12 3 13-2 1-4-4-5-4H9c-1 0-3 5-5 4C1 19 3 7 7 7Z"/><path d="M6 11h5m-2-2v5m7-3h.1m2 2h.1"/></>,
    tag: <><path d="m3 13 10-10h8v8L11 21 3 13Z"/><circle cx="17" cy="7" r="1"/></>,
    bell: <><path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4Zm5 3h4"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    trophy: <><path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm4 11v6m-4 1h8M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></>,
    fire: <path d="M13 2c2 6-4 7-2 11 2-1 3-3 3-5 7 6 6 13-2 14C3 21 2 14 7 9c0 4 2 4 2 4-1-5 4-7 4-11Z"/>,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.tag}</svg>;
}
