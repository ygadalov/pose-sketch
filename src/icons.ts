const paths:Record<string,string>={
 logo:'<circle cx="12" cy="4" r="2"/><path d="m5 11 7-3 7 3M12 8v6m0 0-5 7m5-7 5 7"/>',
 move:'<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m3 3 3 3-3 3M9 18l3 3 3-3M6 9l-3 3 3 3"/>',
 rotate:'<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6"/>',
 undo:'<path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12"/>',
 redo:'<path d="m16 4 5 5-5 5M21 9H10a6 6 0 0 0 0 12"/>',
 fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z"/>',
 cube:'<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10v8M3 8l9 5 9-5M8 5l9 5v7"/>',
 reset:'<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .5-1 1.2-1 2.2M12 17h.01"/>',
};
export const icon=(name:string)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.logo}</svg>`;
