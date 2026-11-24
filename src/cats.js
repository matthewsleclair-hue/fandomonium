/* Fandoms: display name, colour (white text sits on it), icon, and group on the setup screen.
   The key must match a key in BANK (src/bank.js). Icons are simple original glyphs, not logos. */
const CATS={
hp:{n:"Harry Potter",c:"#946600",i:"bolt",g:"Movies"},
mcu:{n:"Marvel",c:"#c0182b",i:"star",g:"Movies"},
dc:{n:"DC",c:"#283593",i:"mask",g:"Movies"},
sw:{n:"Star Wars",c:"#1f5fa8",i:"planet",g:"Movies"},
lotr:{n:"Lord of the Rings",c:"#2f7d3a",i:"ring",g:"Movies"},
dis:{n:"Disney & Pixar",c:"#6b3fc4",i:"castle",g:"Movies"},
hg:{n:"Hunger Games",c:"#a63d17",i:"arrow",g:"Movies"},
jp:{n:"Jurassic Park",c:"#5a6e12",i:"track",g:"Movies"},
fr:{n:"Friends",c:"#8e2c7a",i:"cup",g:"TV"},
off:{n:"The Office",c:"#4a5568",i:"paper",g:"TV"},
pkmn:{n:"Pokémon",c:"#b45309",i:"paw",g:"Anime and games"},
op:{n:"One Piece",c:"#0e7c86",i:"anchor",g:"Anime and games"},
nar:{n:"Naruto",c:"#d9480f",i:"shuriken",g:"Anime and games"},
aot:{n:"Attack on Titan",c:"#6d4c41",i:"wall",g:"Anime and games"}
};
const FICON={
bolt:'<path d="M13.5 2 5 13.5h5.5L9.5 22 19 10h-5.8z" fill="currentColor"/>',
star:'<path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor"/>',
planet:'<circle cx="12" cy="12" r="6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10.5" ry="3.4" fill="none" stroke="currentColor" stroke-width="1.8" transform="rotate(-20 12 12)"/>',
castle:'<path d="M3 21V8h3v2h2V8h2.5v2h3V8H16v2h2V8h3v13h-7v-4a2 2 0 0 0-4 0v4z" fill="currentColor"/>',
ring:'<circle cx="12" cy="14" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="m9 6.5 3-4 3 4-3 2.5z" fill="currentColor"/>',
mask:'<path fill-rule="evenodd" d="M2 9c3-2 6.5-2.2 10-.6C15.5 6.8 19 7 22 9c-.3 4.6-2.6 7-5.6 7-2 0-3.2-1.5-4.4-2.6C10.8 14.5 9.6 16 7.6 16 4.6 16 2.3 13.6 2 9zM6.3 10.8a2.1 1.4 0 1 0 4.2 0 2.1 1.4 0 1 0-4.2 0zM13.5 10.8a2.1 1.4 0 1 0 4.2 0 2.1 1.4 0 1 0-4.2 0z" fill="currentColor"/>',
arrow:'<path d="M5 19 18 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="m13 4.2 7-.9-.9 7z" fill="currentColor"/><path d="M5 19l-.4-4.4M5 19l4.4.4M7.6 16.4l-.4-4M7.6 16.4l4 .4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none"/>',
track:'<path d="M12 22c-2 0-3.2-1.4-3-3.2L9.6 14 4 6.5l1.3-1 5.6 6.3L12 2l1.1 9.8 5.6-6.3 1.3 1L14.4 14l.6 4.8c.2 1.8-1 3.2-3 3.2z" fill="currentColor"/>',
cup:'<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z" fill="currentColor"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
paper:'<path d="M6 2.5h8.5L19 7v14.5H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 3v4.5h4.5M9 12h7M9 16h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
paw:'<circle cx="5" cy="10.5" r="2.2" fill="currentColor"/><circle cx="9" cy="6" r="2.2" fill="currentColor"/><circle cx="15" cy="6" r="2.2" fill="currentColor"/><circle cx="19" cy="10.5" r="2.2" fill="currentColor"/><path d="M12 11c-3.3 0-6.5 3.8-6.5 6.6 0 2 1.6 2.9 3.4 2.9 1.2 0 2-.6 3.1-.6s1.9.6 3.1.6c1.8 0 3.4-.9 3.4-2.9 0-2.8-3.2-6.6-6.5-6.6z" fill="currentColor"/>',
anchor:'<circle cx="12" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.2V21M8 11h8M4.5 14.5c.8 3.8 3.9 6.5 7.5 6.5s6.7-2.7 7.5-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
shuriken:'<path fill-rule="evenodd" d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2zM10.4 12a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0z" fill="currentColor"/>',
wall:'<path d="M3 5h18v14H3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" stroke="currentColor" stroke-width="1.8"/>'
};
