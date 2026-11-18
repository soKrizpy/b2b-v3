/**
 * B2B LEARNING ENGINE — SVG ILLUSTRATION LIBRARY
 * Lightweight inline SVG assets. No external dependencies.
 * Style: Bright, friendly, educational adventure (Remembero-inspired).
 * All SVGs use currentColor or explicit palette to respect design tokens.
 */

/* ============================================================
   MASCOT — Byte the Robot Coder
   A friendly little robot with a screen face and antenna.
   Used in hero card and empty states.
   ============================================================ */
export const SVG_MASCOT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" role="img" aria-label="Byte si Robot Koder">
  <!-- Antenna -->
  <line x1="60" y1="8" x2="60" y2="22" stroke="#0ea5e9" stroke-width="3" stroke-linecap="round"/>
  <circle cx="60" cy="6" r="5" fill="#f59e0b"/>
  <!-- Head -->
  <rect x="22" y="22" width="76" height="60" rx="16" fill="#0284c7"/>
  <rect x="26" y="26" width="68" height="52" rx="13" fill="#0ea5e9"/>
  <!-- Screen face -->
  <rect x="30" y="30" width="60" height="42" rx="10" fill="#1e3a5f"/>
  <!-- Eyes -->
  <circle cx="47" cy="50" r="8" fill="#38bdf8"/>
  <circle cx="73" cy="50" r="8" fill="#38bdf8"/>
  <circle cx="49" cy="49" r="3" fill="#0a1326"/>
  <circle cx="75" cy="49" r="3" fill="#0a1326"/>
  <circle cx="50" cy="47" r="1.5" fill="white"/>
  <circle cx="76" cy="47" r="1.5" fill="white"/>
  <!-- Smile -->
  <path d="M 44 62 Q 60 72 76 62" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Ears -->
  <rect x="10" y="36" width="14" height="20" rx="5" fill="#0284c7"/>
  <rect x="96" y="36" width="14" height="20" rx="5" fill="#0284c7"/>
  <!-- Body -->
  <rect x="28" y="84" width="64" height="44" rx="14" fill="#0284c7"/>
  <!-- Chest screen -->
  <rect x="38" y="92" width="44" height="28" rx="8" fill="#1e3a5f"/>
  <rect x="42" y="96" width="12" height="8" rx="3" fill="#0ea5e9" opacity="0.9"/>
  <rect x="58" y="96" width="20" height="4" rx="2" fill="#f59e0b" opacity="0.8"/>
  <rect x="58" y="104" width="14" height="4" rx="2" fill="#34d399" opacity="0.8"/>
  <!-- Arms -->
  <rect x="6" y="88" width="22" height="12" rx="6" fill="#0284c7"/>
  <circle cx="6" cy="94" r="6" fill="#0ea5e9"/>
  <rect x="92" y="88" width="22" height="12" rx="6" fill="#0284c7"/>
  <circle cx="114" cy="94" r="6" fill="#0ea5e9"/>
  <!-- Legs -->
  <rect x="34" y="128" width="20" height="10" rx="5" fill="#0284c7"/>
  <rect x="66" y="128" width="20" height="10" rx="5" fill="#0284c7"/>
</svg>`;

/* ============================================================
   SCRATCH FOREST ISLAND — Orange-green tropical forest
   Bright turquoise water, lush trees, Scratch orange cat silhouette
   ============================================================ */
export const SVG_ISLAND_SCRATCH = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" role="img" aria-label="Scratch Forest Island">
  <!-- Ocean -->
  <ellipse cx="100" cy="130" rx="96" ry="30" fill="#bae6fd"/>
  <ellipse cx="100" cy="130" rx="96" ry="30" fill="none" stroke="#7dd3fc" stroke-width="1" opacity="0.5"/>
  <!-- Island base -->
  <ellipse cx="100" cy="108" rx="80" ry="34" fill="#86efac"/>
  <ellipse cx="100" cy="100" rx="70" ry="28" fill="#4ade80"/>
  <!-- Dirt path center -->
  <ellipse cx="100" cy="102" rx="30" ry="12" fill="#fbbf24" opacity="0.6"/>
  <!-- Big trees -->
  <circle cx="58" cy="72" r="22" fill="#16a34a"/>
  <circle cx="58" cy="72" r="16" fill="#22c55e"/>
  <rect x="54" y="90" width="8" height="18" rx="3" fill="#92400e"/>
  <circle cx="142" cy="78" r="18" fill="#15803d"/>
  <circle cx="142" cy="78" r="12" fill="#16a34a"/>
  <rect x="138" y="92" width="8" height="16" rx="3" fill="#92400e"/>
  <!-- Small bush -->
  <circle cx="78" cy="90" r="12" fill="#16a34a"/>
  <circle cx="122" cy="88" r="10" fill="#22c55e"/>
  <!-- Scratch cat silhouette (simplified orange cat shape) -->
  <g transform="translate(85,55)">
    <!-- body -->
    <ellipse cx="15" cy="26" rx="13" ry="10" fill="#ff7b00"/>
    <!-- head -->
    <circle cx="15" cy="14" r="11" fill="#ff7b00"/>
    <!-- ears -->
    <polygon points="6,8 2,0 12,6" fill="#ff7b00"/>
    <polygon points="24,8 28,0 18,6" fill="#ff7b00"/>
    <polygon points="7,7 4,2 11,6" fill="#ffb347"/>
    <polygon points="23,7 26,2 19,6" fill="#ffb347"/>
    <!-- eyes -->
    <ellipse cx="10" cy="13" rx="3" ry="3.5" fill="white"/>
    <ellipse cx="20" cy="13" rx="3" ry="3.5" fill="white"/>
    <circle cx="10" cy="14" r="2" fill="#1e3a5f"/>
    <circle cx="20" cy="14" r="2" fill="#1e3a5f"/>
    <!-- nose -->
    <polygon points="15,17 13,20 17,20" fill="#ff5500"/>
    <!-- whiskers -->
    <line x1="2" y1="17" x2="11" y2="18" stroke="#fff" stroke-width="1" opacity="0.8"/>
    <line x1="2" y1="20" x2="11" y2="20" stroke="#fff" stroke-width="1" opacity="0.8"/>
    <line x1="29" y1="17" x2="19" y2="18" stroke="#fff" stroke-width="1" opacity="0.8"/>
    <line x1="29" y1="20" x2="19" y2="20" stroke="#fff" stroke-width="1" opacity="0.8"/>
    <!-- tail -->
    <path d="M 26 30 Q 38 20 36 10" stroke="#ff7b00" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
  <!-- Sparkles -->
  <circle cx="45" cy="55" r="3" fill="#fbbf24"/>
  <circle cx="160" cy="60" r="2" fill="#fbbf24"/>
  <circle cx="30" cy="90" r="2" fill="#fbbf24"/>
  <!-- Island name label area -->
  <rect x="65" y="130" width="70" height="18" rx="9" fill="#0ea5e9" opacity="0.9"/>
  <text x="100" y="143" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="system-ui,sans-serif">SCRATCH FOREST</text>
</svg>`;

/* ============================================================
   ROBLOX KINGDOM ISLAND — Grey stone castle, purple realm
   ============================================================ */
export const SVG_ISLAND_ROBLOX = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" role="img" aria-label="Roblox Kingdom Island">
  <!-- Ocean -->
  <ellipse cx="100" cy="130" rx="96" ry="30" fill="#c4b5fd"/>
  <!-- Island base -->
  <ellipse cx="100" cy="108" rx="80" ry="34" fill="#a78bfa"/>
  <ellipse cx="100" cy="100" rx="70" ry="28" fill="#8b5cf6"/>
  <!-- Ground -->
  <ellipse cx="100" cy="102" rx="50" ry="16" fill="#6d28d9" opacity="0.5"/>
  <!-- Castle keep -->
  <rect x="72" y="50" width="56" height="58" rx="4" fill="#6b7280"/>
  <rect x="74" y="52" width="52" height="54" rx="3" fill="#9ca3af"/>
  <!-- Castle gate arch -->
  <rect x="88" y="82" width="24" height="30" rx="12" fill="#374151"/>
  <!-- Windows -->
  <rect x="82" y="62" width="10" height="12" rx="5" fill="#374151"/>
  <rect x="108" y="62" width="10" height="12" rx="5" fill="#374151"/>
  <!-- Battlements -->
  <rect x="72" y="42" width="10" height="12" rx="2" fill="#6b7280"/>
  <rect x="86" y="42" width="10" height="12" rx="2" fill="#6b7280"/>
  <rect x="100" y="42" width="10" height="12" rx="2" fill="#6b7280"/>
  <rect x="114" y="42" width="10" height="12" rx="2" fill="#6b7280"/>
  <!-- Tower left -->
  <rect x="58" y="56" width="20" height="50" rx="4" fill="#6b7280"/>
  <rect x="60" y="58" width="16" height="46" rx="3" fill="#9ca3af"/>
  <rect x="58" y="48" width="6" height="12" rx="2" fill="#6b7280"/>
  <rect x="66" y="48" width="6" height="12" rx="2" fill="#6b7280"/>
  <rect x="60" y="68" width="8" height="10" rx="4" fill="#374151"/>
  <!-- Tower right -->
  <rect x="122" y="56" width="20" height="50" rx="4" fill="#6b7280"/>
  <rect x="124" y="58" width="16" height="46" rx="3" fill="#9ca3af"/>
  <rect x="122" y="48" width="6" height="12" rx="2" fill="#6b7280"/>
  <rect x="130" y="48" width="6" height="12" rx="2" fill="#6b7280"/>
  <rect x="132" y="68" width="8" height="10" rx="4" fill="#374151"/>
  <!-- Flag -->
  <line x1="100" y1="20" x2="100" y2="45" stroke="#374151" stroke-width="2"/>
  <polygon points="100,22 118,30 100,38" fill="#ef4444"/>
  <!-- Lock icon (realm locked) -->
  <circle cx="156" cy="78" r="14" fill="#6d28d9"/>
  <rect x="150" y="78" width="12" height="10" rx="3" fill="white"/>
  <path d="M 152 78 Q 152 70 156 70 Q 160 70 160 78" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Name label -->
  <rect x="58" y="130" width="84" height="18" rx="9" fill="#7c3aed" opacity="0.9"/>
  <text x="100" y="143" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="system-ui,sans-serif">ROBLOX KINGDOM</text>
</svg>`;

/* ============================================================
   PYTHON LABORATORY ISLAND — Blue-teal scientific island
   ============================================================ */
export const SVG_ISLAND_PYTHON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" role="img" aria-label="Python Laboratory Island">
  <!-- Ocean -->
  <ellipse cx="100" cy="130" rx="96" ry="30" fill="#a7f3d0"/>
  <!-- Island base -->
  <ellipse cx="100" cy="108" rx="80" ry="34" fill="#6ee7b7"/>
  <ellipse cx="100" cy="100" rx="70" ry="28" fill="#34d399"/>
  <!-- Lab building -->
  <rect x="62" y="58" width="76" height="50" rx="8" fill="#e2e8f0"/>
  <rect x="64" y="60" width="72" height="46" rx="7" fill="white"/>
  <!-- Roof -->
  <polygon points="58,60 100,36 142,60" fill="#0891b2"/>
  <!-- Windows lab -->
  <rect x="72" y="70" width="18" height="16" rx="4" fill="#bae6fd"/>
  <rect x="110" y="70" width="18" height="16" rx="4" fill="#a5f3fc"/>
  <!-- Door -->
  <rect x="90" y="88" width="20" height="20" rx="4" fill="#0891b2"/>
  <circle cx="107" cy="98" r="2" fill="white"/>
  <!-- Big flask -->
  <g transform="translate(145,45)">
    <rect x="10" y="0" width="8" height="16" rx="3" fill="#94a3b8"/>
    <path d="M 4 16 Q 0 32 14 36 Q 28 32 24 16 Z" fill="#06b6d4" opacity="0.85"/>
    <circle cx="10" cy="28" r="4" fill="#22d3ee" opacity="0.9"/>
    <circle cx="17" cy="22" r="2.5" fill="#67e8f9" opacity="0.8"/>
    <circle cx="8" cy="24" r="1.5" fill="#a5f3fc" opacity="0.9"/>
  </g>
  <!-- Small flask 2 -->
  <g transform="translate(40,55)">
    <rect x="8" y="0" width="6" height="12" rx="2.5" fill="#94a3b8"/>
    <path d="M 3 12 Q 0 24 11 26 Q 22 24 19 12 Z" fill="#a855f7" opacity="0.8"/>
    <circle cx="11" cy="20" r="3" fill="#c084fc" opacity="0.9"/>
  </g>
  <!-- Python snake logo (simplified) -->
  <g transform="translate(78,74)">
    <path d="M 10 2 Q 2 2 2 10 Q 2 15 7 16 L 13 16 Q 15 16 15 18 L 15 22 Q 15 28 9 28 Q 3 28 3 22" 
          stroke="#306998" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 20 26 Q 28 26 28 18 Q 28 13 23 12 L 17 12 Q 15 12 15 10 L 15 6 Q 15 0 21 0 Q 27 0 27 6"
          stroke="#FFD43B" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <!-- Lock icon -->
  <circle cx="156" cy="80" r="14" fill="#0891b2"/>
  <rect x="150" y="80" width="12" height="10" rx="3" fill="white"/>
  <path d="M 152 80 Q 152 72 156 72 Q 160 72 160 80" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Name label -->
  <rect x="52" y="130" width="96" height="18" rx="9" fill="#0891b2" opacity="0.9"/>
  <text x="100" y="143" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="system-ui,sans-serif">PYTHON LABORATORY</text>
</svg>`;

/* ============================================================
   GAME DEV REALM ISLAND — Yellow sunny game island
   ============================================================ */
export const SVG_ISLAND_GAMEDEV = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" role="img" aria-label="Game Dev Realm Island">
  <!-- Ocean -->
  <ellipse cx="100" cy="130" rx="96" ry="30" fill="#fde68a"/>
  <!-- Island base -->
  <ellipse cx="100" cy="108" rx="80" ry="34" fill="#fbbf24"/>
  <ellipse cx="100" cy="100" rx="70" ry="28" fill="#f59e0b"/>
  <!-- Sun rays background -->
  <circle cx="100" cy="70" r="30" fill="#fef3c7" opacity="0.4"/>
  <!-- Controller body -->
  <g transform="translate(58,46)">
    <rect x="0" y="8" width="84" height="46" rx="22" fill="#374151"/>
    <!-- Grips -->
    <ellipse cx="16" cy="48" rx="16" ry="12" fill="#374151"/>
    <ellipse cx="68" cy="48" rx="16" ry="12" fill="#374151"/>
    <!-- D-pad -->
    <rect x="16" y="22" width="8" height="22" rx="3" fill="#6b7280"/>
    <rect x="10" y="28" width="20" height="10" rx="3" fill="#6b7280"/>
    <!-- Buttons right -->
    <circle cx="62" cy="22" r="5" fill="#ef4444"/>
    <circle cx="72" cy="30" r="5" fill="#22c55e"/>
    <circle cx="52" cy="30" r="5" fill="#3b82f6"/>
    <circle cx="62" cy="38" r="5" fill="#f59e0b"/>
    <!-- Center buttons -->
    <rect x="34" y="27" width="10" height="6" rx="3" fill="#6b7280"/>
    <rect x="48" y="27" width="10" height="6" rx="3" fill="#6b7280"/>
    <!-- Joystick nubs -->
    <circle cx="26" cy="40" r="6" fill="#4b5563"/>
    <circle cx="58" cy="44" r="6" fill="#4b5563"/>
  </g>
  <!-- Star decorations -->
  <polygon points="38,46 40,40 42,46 48,44 43,48 45,54 40,51 35,54 37,48 32,44" fill="#fef08a"/>
  <polygon points="162,55 164,50 166,55 171,53 167,57 169,62 164,59 159,62 161,57 156,53" fill="#fef08a"/>
  <!-- Lock icon -->
  <circle cx="156" cy="82" r="14" fill="#d97706"/>
  <rect x="150" y="82" width="12" height="10" rx="3" fill="white"/>
  <path d="M 152 82 Q 152 74 156 74 Q 160 74 160 82" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Name label -->
  <rect x="56" y="130" width="88" height="18" rx="9" fill="#d97706" opacity="0.9"/>
  <text x="100" y="143" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="system-ui,sans-serif">GAME DEV REALM</text>
</svg>`;

/* ============================================================
   QUEST NODE ICONS — SVG icons for quest nodes (no emoji)
   ============================================================ */

/** Scratch cat icon for active quest */
export const SVG_ICON_SCRATCH_CAT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Scratch Cat">
  <circle cx="24" cy="22" r="14" fill="#ff7b00"/>
  <polygon points="13,13 10,4 19,10" fill="#ff7b00"/>
  <polygon points="35,13 38,4 29,10" fill="#ff7b00"/>
  <polygon points="14,12 11,5 18,10" fill="#ffb347"/>
  <polygon points="34,12 37,5 30,10" fill="#ffb347"/>
  <ellipse cx="19" cy="21" rx="4" ry="4.5" fill="white"/>
  <ellipse cx="29" cy="21" rx="4" ry="4.5" fill="white"/>
  <circle cx="19" cy="22" r="2.5" fill="#1a1a2e"/>
  <circle cx="29" cy="22" r="2.5" fill="#1a1a2e"/>
  <circle cx="20" cy="20" r="1.2" fill="white"/>
  <circle cx="30" cy="20" r="1.2" fill="white"/>
  <polygon points="24,27 22,31 26,31" fill="#ff5500"/>
  <ellipse cx="24" cy="38" rx="10" ry="8" fill="#ff7b00"/>
  <path d="M 33 38 Q 42 30 40 20" stroke="#ff7b00" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

/** Lock icon for locked quests */
export const SVG_ICON_LOCK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Terkunci">
  <rect x="10" y="22" width="28" height="22" rx="8" fill="#94a3b8"/>
  <path d="M 14 22 L 14 16 Q 14 6 24 6 Q 34 6 34 16 L 34 22" 
        stroke="#94a3b8" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="24" cy="33" r="4" fill="white"/>
  <rect x="22" y="33" width="4" height="6" rx="2" fill="white"/>
</svg>`;

/** Treasure chest icon for bonus node */
export const SVG_ICON_CHEST = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Peti Harta">
  <!-- Chest body -->
  <rect x="6" y="22" width="36" height="20" rx="5" fill="#92400e"/>
  <rect x="8" y="24" width="32" height="16" rx="4" fill="#b45309"/>
  <!-- Chest lid -->
  <rect x="6" y="10" width="36" height="14" rx="5" fill="#b45309"/>
  <rect x="8" y="12" width="32" height="10" rx="4" fill="#d97706"/>
  <!-- Lock -->
  <rect x="20" y="24" width="8" height="6" rx="2" fill="#f59e0b"/>
  <circle cx="24" cy="22" r="3" fill="#f59e0b" stroke="#92400e" stroke-width="1"/>
  <!-- Gold coins -->
  <circle cx="16" cy="34" r="4" fill="#fbbf24"/>
  <circle cx="24" cy="36" r="4" fill="#fbbf24"/>
  <circle cx="32" cy="34" r="4" fill="#fbbf24"/>
  <!-- Shine -->
  <circle cx="12" cy="16" r="2" fill="#fef3c7" opacity="0.6"/>
  <circle cx="20" cy="14" r="1.5" fill="#fef3c7" opacity="0.5"/>
  <!-- Stars -->
  <circle cx="38" cy="8" r="2" fill="#fbbf24"/>
  <circle cx="8" cy="8" r="2" fill="#fbbf24"/>
</svg>`;

/** Star / XP reward icon */
export const SVG_ICON_STAR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Bintang XP">
  <polygon points="16,2 20,12 30,12 22,18 25,28 16,22 7,28 10,18 2,12 12,12" 
           fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
  <polygon points="16,6 19,13 27,13 21,17 23,25 16,20 9,25 11,17 5,13 13,13" 
           fill="#fbbf24"/>
</svg>`;

/** Trophy / achievement icon */
export const SVG_ICON_TROPHY = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Trofi Prestasi">
  <!-- Cup -->
  <path d="M 12 8 Q 12 32 24 34 Q 36 32 36 8 Z" fill="#f59e0b"/>
  <path d="M 14 8 Q 14 30 24 32 Q 34 30 34 8 Z" fill="#fbbf24"/>
  <!-- Handles -->
  <path d="M 12 10 Q 4 10 4 18 Q 4 24 12 24" stroke="#d97706" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M 36 10 Q 44 10 44 18 Q 44 24 36 24" stroke="#d97706" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Base -->
  <rect x="18" y="34" width="12" height="5" rx="2" fill="#d97706"/>
  <rect x="14" y="38" width="20" height="6" rx="3" fill="#b45309"/>
  <!-- Star on cup -->
  <polygon points="24,12 26,18 32,18 27,22 29,28 24,24 19,28 21,22 16,18 22,18" fill="#fef3c7" opacity="0.8"/>
</svg>`;

/** Streak fire icon */
export const SVG_ICON_STREAK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Streak Api">
  <path d="M 24 4 Q 28 12 24 18 Q 32 10 36 20 Q 40 30 32 36 Q 36 28 28 28 Q 36 42 24 44 Q 12 42 20 28 Q 12 28 16 36 Q 8 30 12 20 Q 16 10 24 18 Q 20 12 24 4 Z" fill="#ef4444"/>
  <path d="M 24 16 Q 27 22 24 26 Q 28 20 32 26 Q 34 32 28 36 Q 30 28 24 28 Q 30 38 24 40 Q 18 38 24 28 Q 18 28 20 36 Q 14 32 16 26 Q 20 20 24 26 Q 21 22 24 16 Z" fill="#fb923c"/>
  <path d="M 24 26 Q 26 30 24 34 Q 22 30 24 26 Z" fill="#fbbf24"/>
</svg>`;

/** Map / compass icon for dashboard nav */
export const SVG_ICON_MAP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Peta Petualangan">
  <!-- Map scroll -->
  <rect x="6" y="8" width="36" height="32" rx="4" fill="#fef3c7"/>
  <rect x="8" y="10" width="32" height="28" rx="3" fill="#fffbeb"/>
  <!-- Map lines -->
  <path d="M 12 20 L 22 16 L 30 22 L 38 18" stroke="#d97706" stroke-width="1.5" fill="none" stroke-dasharray="3,2"/>
  <path d="M 12 28 Q 20 24 28 28 Q 34 32 38 28" stroke="#16a34a" stroke-width="1.5" fill="none" stroke-dasharray="3,2"/>
  <!-- Current location pin -->
  <circle cx="22" cy="24" r="5" fill="#ef4444"/>
  <circle cx="22" cy="24" r="3" fill="white"/>
  <circle cx="22" cy="24" r="1.5" fill="#ef4444"/>
  <!-- Compass rose (top-right) -->
  <circle cx="34" cy="16" r="5" fill="#bae6fd" stroke="#0284c7" stroke-width="1"/>
  <polygon points="34,11 35.5,15.5 34,14 32.5,15.5" fill="#ef4444"/>
  <polygon points="34,21 35.5,16.5 34,18 32.5,16.5" fill="#6b7280"/>
  <polygon points="29,16 33.5,17.5 32,16 33.5,14.5" fill="#6b7280"/>
  <polygon points="39,16 34.5,17.5 36,16 34.5,14.5" fill="#6b7280"/>
  <!-- Scroll handles -->
  <rect x="4" y="8" width="4" height="32" rx="2" fill="#d97706"/>
  <rect x="40" y="8" width="4" height="32" rx="2" fill="#d97706"/>
</svg>`;

/** Target / goal icon */
export const SVG_ICON_TARGET = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Target Harian">
  <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" stroke-width="3"/>
  <circle cx="24" cy="24" r="14" fill="none" stroke="#fca5a5" stroke-width="3"/>
  <circle cx="24" cy="24" r="8" fill="none" stroke="#f87171" stroke-width="3"/>
  <circle cx="24" cy="24" r="4" fill="#ef4444"/>
  <!-- Arrow -->
  <line x1="38" y1="10" x2="26" y2="22" stroke="#374151" stroke-width="2.5" stroke-linecap="round"/>
  <polygon points="38,10 32,12 36,16" fill="#374151"/>
</svg>`;

/** Badge / shield icon for achievements */
export const SVG_ICON_BADGE_SHIELD = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Lencana Prestasi">
  <path d="M 24 4 L 40 10 L 40 24 Q 40 36 24 44 Q 8 36 8 24 L 8 10 Z" fill="#8b5cf6"/>
  <path d="M 24 7 L 37 12 L 37 24 Q 37 34 24 41 Q 11 34 11 24 L 11 12 Z" fill="#a78bfa"/>
  <circle cx="24" cy="22" r="10" fill="#7c3aed" stroke="#c4b5fd" stroke-width="1.5"/>
  <polygon points="24,13 26.5,20 34,20 28,24 30,31 24,27 18,31 20,24 14,20 21.5,20" fill="#fbbf24"/>
</svg>`;

/** Checkmark / complete icon */
export const SVG_ICON_CHECK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Selesai">
  <circle cx="24" cy="24" r="20" fill="#22c55e"/>
  <circle cx="24" cy="24" r="17" fill="#16a34a"/>
  <path d="M 13 24 L 20 32 L 35 16" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* ============================================================
   QUEST MAP SVG — Full illustrated island map canvas
   Used as the background visual for the Quest Map section
   ============================================================ */
export const SVG_QUEST_MAP_BG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Peta Kepulauan Koding">
  <!-- Ocean background gradient -->
  <defs>
    <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bae6fd"/>
      <stop offset="100%" stop-color="#7dd3fc"/>
    </linearGradient>
    <radialGradient id="islandGlow1" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#bbf7d0" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#bbf7d0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="islandGlow2" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#ede9fe" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ede9fe" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="320" fill="url(#oceanGrad)"/>
  
  <!-- Ocean texture waves -->
  <path d="M 0 240 Q 150 220 300 240 Q 450 260 600 240 Q 750 220 900 240" 
        stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M 0 260 Q 120 245 240 260 Q 360 275 480 260 Q 600 245 720 260 Q 840 275 900 260" 
        stroke="white" stroke-width="1" fill="none" opacity="0.3"/>
  <path d="M 0 280 Q 180 268 360 280 Q 540 292 720 280 Q 810 274 900 280" 
        stroke="white" stroke-width="1" fill="none" opacity="0.2"/>

  <!-- === ISLAND 1: SCRATCH FOREST (left, active) === -->
  <ellipse cx="175" cy="195" rx="140" ry="55" fill="#86efac"/>
  <ellipse cx="175" cy="183" rx="118" ry="45" fill="#4ade80"/>
  <ellipse cx="175" cy="178" rx="80" ry="30" fill="#22c55e"/>
  <!-- Trees -->
  <circle cx="110" cy="145" r="30" fill="#16a34a"/>
  <circle cx="110" cy="145" r="22" fill="#22c55e"/>
  <rect x="106" y="168" width="8" height="20" rx="4" fill="#92400e"/>
  <circle cx="155" cy="150" r="22" fill="#15803d"/>
  <circle cx="155" cy="150" r="16" fill="#16a34a"/>
  <rect x="151" y="165" width="8" height="18" rx="4" fill="#92400e"/>
  <circle cx="230" cy="148" r="26" fill="#16a34a"/>
  <circle cx="230" cy="148" r="18" fill="#22c55e"/>
  <rect x="226" y="168" width="8" height="18" rx="4" fill="#92400e"/>
  <!-- Scratch cat icon on island -->
  <circle cx="175" cy="168" r="18" fill="#ff7b00"/>
  <polygon points="167,158 164,150 172,156" fill="#ff7b00"/>
  <polygon points="183,158 186,150 178,156" fill="#ff7b00"/>
  <ellipse cx="171" cy="167" rx="3.5" ry="4" fill="white"/>
  <ellipse cx="179" cy="167" rx="3.5" ry="4" fill="white"/>
  <circle cx="171" cy="168" r="2" fill="#1a1a2e"/>
  <circle cx="179" cy="168" r="2" fill="#1a1a2e"/>
  <polygon points="175,172 173,175 177,175" fill="#ff5500"/>
  <!-- Active glow -->
  <ellipse cx="175" cy="195" rx="140" ry="55" fill="url(#islandGlow1)"/>

  <!-- === CONNECTING PATH 1→2 (Scratch → Roblox) === -->
  <path d="M 310 185 Q 400 140 490 175" 
        stroke="#0ea5e9" stroke-width="4" fill="none" 
        stroke-dasharray="12,8" stroke-linecap="round" opacity="0.7"/>
  <!-- Path arrows -->
  <polygon points="488,170 500,175 488,180" fill="#0ea5e9" opacity="0.7"/>

  <!-- === ISLAND 2: ROBLOX KINGDOM (top-center, locked) === -->
  <ellipse cx="560" cy="145" rx="130" ry="52" fill="#c4b5fd"/>
  <ellipse cx="560" cy="134" rx="108" ry="42" fill="#a78bfa"/>
  <ellipse cx="560" cy="128" rx="75" ry="28" fill="#8b5cf6"/>
  <!-- Castle keep -->
  <rect x="525" y="78" width="70" height="58" rx="4" fill="#6b7280"/>
  <rect x="527" y="80" width="66" height="54" rx="3" fill="#9ca3af"/>
  <rect x="537" y="108" width="26" height="30" rx="12" fill="#374151"/>
  <!-- Battlements -->
  <rect x="525" y="70" width="10" height="12" rx="2" fill="#6b7280"/>
  <rect x="539" y="70" width="10" height="12" rx="2" fill="#6b7280"/>
  <rect x="553" y="70" width="10" height="12" rx="2" fill="#6b7280"/>
  <rect x="567" y="70" width="10" height="12" rx="2" fill="#6b7280"/>
  <rect x="581" y="70" width="10" height="12" rx="2" fill="#6b7280"/>
  <!-- Tower left -->
  <rect x="508" y="84" width="20" height="50" rx="4" fill="#6b7280"/>
  <rect x="510" y="86" width="16" height="46" rx="3" fill="#9ca3af"/>
  <rect x="508" y="76" width="6" height="12" rx="2" fill="#6b7280"/>
  <rect x="516" y="76" width="6" height="12" rx="2" fill="#6b7280"/>
  <!-- Tower right -->
  <rect x="572" y="84" width="20" height="50" rx="4" fill="#6b7280"/>
  <rect x="574" y="86" width="16" height="46" rx="3" fill="#9ca3af"/>
  <rect x="572" y="76" width="6" height="12" rx="2" fill="#6b7280"/>
  <rect x="580" y="76" width="6" height="12" rx="2" fill="#6b7280"/>
  <!-- Flag -->
  <line x1="560" y1="48" x2="560" y2="72" stroke="#374151" stroke-width="2"/>
  <polygon points="560,50 576,58 560,66" fill="#ef4444"/>
  <!-- Lock overlay -->
  <ellipse cx="560" cy="145" rx="130" ry="52" fill="#6d28d9" opacity="0.25"/>
  <circle cx="560" cy="130" r="22" fill="#7c3aed" opacity="0.9"/>
  <rect x="552" y="130" width="16" height="14" rx="4" fill="white"/>
  <path d="M 554 130 Q 554 120 560 120 Q 566 120 566 130" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- === CONNECTING PATH 2→3 (Roblox → Python) === -->
  <path d="M 560 200 Q 600 240 650 230" 
        stroke="#94a3b8" stroke-width="3" fill="none"
        stroke-dasharray="10,8" stroke-linecap="round" opacity="0.4"/>
  <polygon points="648,225 660,230 648,235" fill="#94a3b8" opacity="0.4"/>

  <!-- === ISLAND 3: PYTHON LAB (bottom-right, locked) === -->
  <ellipse cx="760" cy="230" rx="125" ry="50" fill="#6ee7b7"/>
  <ellipse cx="760" cy="219" rx="104" ry="40" fill="#34d399"/>
  <ellipse cx="760" cy="213" rx="70" ry="27" fill="#059669"/>
  <!-- Lab building -->
  <rect x="724" y="162" width="72" height="58" rx="6" fill="#e2e8f0"/>
  <rect x="726" y="164" width="68" height="54" rx="5" fill="white"/>
  <!-- Roof -->
  <polygon points="720,164 760,140 800,164" fill="#0891b2"/>
  <!-- Windows -->
  <rect x="732" y="174" width="16" height="14" rx="4" fill="#bae6fd"/>
  <rect x="772" y="174" width="16" height="14" rx="4" fill="#a5f3fc"/>
  <!-- Door -->
  <rect x="750" y="192" width="20" height="24" rx="4" fill="#0891b2"/>
  <!-- Big flask top-right -->
  <g transform="translate(802,148)">
    <rect x="8" y="0" width="8" height="14" rx="3" fill="#94a3b8"/>
    <path d="M 2 14 Q 0 28 12 32 Q 24 28 22 14 Z" fill="#06b6d4" opacity="0.85"/>
    <circle cx="12" cy="24" r="5" fill="#22d3ee" opacity="0.8"/>
  </g>
  <!-- Lock overlay -->
  <ellipse cx="760" cy="230" rx="125" ry="50" fill="#0891b2" opacity="0.2"/>
  <circle cx="760" cy="210" r="20" fill="#0891b2" opacity="0.9"/>
  <rect x="753" y="210" width="14" height="12" rx="4" fill="white"/>
  <path d="M 755 210 Q 755 202 760 202 Q 765 202 765 210" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>

  <!-- === DECORATIVE CLOUDS === -->
  <!-- Cloud 1 -->
  <ellipse cx="400" cy="55" rx="50" ry="20" fill="white" opacity="0.8"/>
  <ellipse cx="380" cy="50" rx="30" ry="18" fill="white" opacity="0.8"/>
  <ellipse cx="425" cy="50" rx="28" ry="16" fill="white" opacity="0.8"/>
  <!-- Cloud 2 -->
  <ellipse cx="720" cy="78" rx="40" ry="16" fill="white" opacity="0.7"/>
  <ellipse cx="704" cy="74" rx="24" ry="14" fill="white" opacity="0.7"/>
  <ellipse cx="738" cy="74" rx="22" ry="13" fill="white" opacity="0.7"/>
  <!-- Cloud 3 small -->
  <ellipse cx="80" cy="80" rx="30" ry="13" fill="white" opacity="0.6"/>
  <ellipse cx="66" cy="76" rx="18" ry="12" fill="white" opacity="0.6"/>
  <ellipse cx="96" cy="76" rx="16" ry="11" fill="white" opacity="0.6"/>

  <!-- === DECORATIVE BIRDS === -->
  <path d="M 350 90 Q 358 84 366 90" stroke="#374151" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M 370 80 Q 376 75 382 80" stroke="#374151" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M 850 100 Q 856 95 862 100" stroke="#374151" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- === LEGEND BADGE ISLANDS === -->
  <!-- Scratch label -->
  <rect x="122" y="228" width="106" height="20" rx="10" fill="#059669"/>
  <text x="175" y="242" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="system-ui,sans-serif">🌲 Scratch Forest</text>
  <!-- Roblox label -->
  <rect x="508" y="184" width="104" height="20" rx="10" fill="#7c3aed"/>
  <text x="560" y="198" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="system-ui,sans-serif">🏰 Roblox Kingdom</text>
  <!-- Python label -->
  <rect x="710" y="262" width="100" height="20" rx="10" fill="#0891b2"/>
  <text x="760" y="276" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="system-ui,sans-serif">🔬 Python Lab</text>
  <!-- Game Dev hint (off-map) -->
  <rect x="12" y="260" width="100" height="34" rx="10" fill="#d97706" opacity="0.7"/>
  <text x="62" y="274" text-anchor="middle" font-size="9" fill="white" font-family="system-ui,sans-serif">🎮 Game Dev Realm</text>
  <text x="62" y="287" text-anchor="middle" font-size="9" fill="white" font-family="system-ui,sans-serif">Butuh Level 15 →</text>
</svg>`;

/* ============================================================
   GAS ISLAND ASSETS — 7 Illustrated Low-Poly Islands
   Designed for the Student Adventure Map.
   Each island shares the same isometric hex footprint
   (viewBox 0 0 260 260) and three stage groups:
   stage-beginner, stage-intermediate, stage-advanced.
   ============================================================ */

/** Island 1 — Scratch Forest
 *  Green meadow, hut, low-poly cliffs, puzzle gate, golden cat monument */
export const SVG_GAS_ISLAND_SCRATCH_FOREST = `
<svg id="island-scratch-forest" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-scratch">
      <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z"/>
    </clipPath>
  </defs>
  <g id="stage-beginner">
    <path d="M 34,175 Q 34,178 40,181 L 118,220 Q 124,223 130,223 L 130,237 Q 124,237 118,234 L 40,195 Q 34,192 34,189 Z" fill="#8C4828"/>
    <path d="M 130,223 Q 136,223 142,220 L 220,181 Q 226,178 226,175 L 226,189 Q 226,192 220,195 L 142,234 Q 136,237 130,237 Z" fill="#633018"/>
    <path d="M 34,163 Q 34,166 40,169 L 118,208 Q 124,211 130,211 L 130,223 Q 124,223 118,220 L 40,181 Q 34,178 34,175 Z" fill="#D97B43"/>
    <path d="M 130,211 Q 136,211 142,208 L 220,169 Q 226,166 226,163 L 226,175 Q 226,178 220,181 L 142,220 Q 136,223 130,223 Z" fill="#AE5929"/>
    <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z" fill="#A4C953"/>
    <g clip-path="url(#clip-scratch)">
      <path d="M 105,205 C 115,185 150,182 162,164 C 172,148 140,136 126,122 L 106,128 C 122,142 142,150 132,164 C 122,178 90,182 84,198 Z" fill="#F0DBAE"/>
      <path d="M 52,168 C 70,154 96,158 104,172 C 110,184 82,196 58,184 Z" fill="#EFFAFE"/>
      <path d="M 56,169 C 72,158 92,162 99,173 C 103,182 80,192 60,182 Z" fill="#2CA8E2"/>
    </g>
    <polygon points="130,185 152,176 164,182 142,191" fill="#1E293B" opacity="0.16"/>
    <polygon points="122,172 136,179 136,192 122,185" fill="#E6C29F"/>
    <polygon points="136,179 150,172 150,185 136,192" fill="#B88B61"/>
    <polygon points="127,181 131,183 131,190 127,188" fill="#5E3A1C"/>
    <polygon points="119,172 136,181 136,161" fill="#F97316"/>
    <polygon points="136,181 153,172 136,161" fill="#C2410C"/>
    <ellipse cx="184" cy="176" rx="14" ry="6" fill="#1E293B" opacity="0.14"/>
    <rect x="179" y="156" width="5" height="18" fill="#6D4C3D"/>
    <circle cx="174" cy="152" r="9" fill="#6F9A2D"/>
    <circle cx="188" cy="154" r="8" fill="#577A22"/>
    <circle cx="181" cy="144" r="10" fill="#8EBA3E"/>
    <circle cx="78" cy="145" r="7" fill="#6F9A2D"/>
    <circle cx="85" cy="140" r="8" fill="#8EBA3E"/>
  </g>
  <g id="stage-intermediate">
    <polygon points="94,142 122,94 134,138" fill="#D8C7A8"/>
    <polygon points="122,94 152,136 134,138" fill="#7D756D"/>
    <polygon points="82,146 102,114 114,148" fill="#C9B798"/>
    <polygon points="102,114 124,144 114,148" fill="#665E56"/>
    <polygon points="150,144 157,147.5 157,166 150,162.5" fill="#38BDF8"/>
    <polygon points="157,147.5 163,144.5 163,163 157,166" fill="#0284C7"/>
    <polygon points="169,153.5 176,157 176,175.5 169,172" fill="#38BDF8"/>
    <polygon points="176,157 182,154 182,172.5 176,175.5" fill="#0284C7"/>
    <polygon points="156,136 182,149 176,152 150,139" fill="#FEF08A"/>
    <polygon points="150,139 176,152 176,158 150,145" fill="#FACC15"/>
    <polygon points="176,152 182,149 182,155 176,158" fill="#CA8A04"/>
  </g>
  <g id="stage-advanced">
    <polygon points="114,88 122,92 122,102 114,98" fill="#FACC15"/>
    <polygon points="122,92 130,88 130,98 122,102" fill="#D97706"/>
    <polygon points="122,84 130,88 122,92 114,88" fill="#FEF08A"/>
    <polygon points="114,88 118,90 116,78" fill="#FACC15"/>
    <polygon points="126,90 130,88 128,78" fill="#D97706"/>
    <polygon points="94,94 99,102 94,106" fill="#A5F3FC"/>
    <polygon points="94,94 94,106 89,102" fill="#22D3EE"/>
    <polygon points="89,102 94,106 94,113" fill="#0284C7"/>
  </g>
</svg>`;

/** Island 2 — Logic Maze
 *  Blue-slate valley, curved labyrinth paths, Bit-Bot, golden flag */
export const SVG_GAS_ISLAND_LOGIC_MAZE = `
<svg id="island-logic-maze" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-maze">
      <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z"/>
    </clipPath>
  </defs>
  <g id="stage-beginner">
    <path d="M 34,175 Q 34,178 40,181 L 118,220 Q 124,223 130,223 L 130,237 Q 124,237 118,234 L 40,195 Q 34,192 34,189 Z" fill="#2D3B4E"/>
    <path d="M 130,223 Q 136,223 142,220 L 220,181 Q 226,178 226,175 L 226,189 Q 226,192 220,195 L 142,234 Q 136,237 130,237 Z" fill="#1D2634"/>
    <path d="M 34,163 Q 34,166 40,169 L 118,208 Q 124,211 130,211 L 130,223 Q 124,223 118,220 L 40,181 Q 34,178 34,175 Z" fill="#3B82B8"/>
    <path d="M 130,211 Q 136,211 142,208 L 220,169 Q 226,166 226,163 L 226,175 Q 226,178 220,181 L 142,220 Q 136,223 130,223 Z" fill="#25618F"/>
    <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z" fill="#6CB4DE"/>
    <g clip-path="url(#clip-maze)">
      <path d="M 96,196 L 128,180 L 96,164 L 142,141 L 174,157 L 194,147 L 178,139 L 142,157 L 122,147 L 76,170 L 108,186 L 82,199 Z" fill="#E0F2FE"/>
    </g>
    <polygon points="88,188 100,194 92,198 80,192" fill="#FEF08A"/>
    <polygon points="80,192 92,198 92,203 80,197" fill="#FACC15"/>
    <polygon points="92,198 100,194 100,199 92,203" fill="#D97706"/>
    <ellipse cx="106" cy="184" rx="8" ry="3.5" fill="#1E293B" opacity="0.18"/>
    <polygon points="102,170 109,173.5 102,177 95,173.5" fill="#BAE6FD"/>
    <polygon points="95,173.5 102,177 102,185 95,181.5" fill="#FACC15"/>
    <polygon points="102,177 109,173.5 109,181.5 102,185" fill="#D97706"/>
    <circle cx="98.5" cy="178.5" r="1.1" fill="#1E3A8A"/>
  </g>
  <g id="stage-intermediate">
    <polygon points="62,148 86,136 96,141 72,153" fill="#BAE6FD"/>
    <polygon points="62,148 72,153 72,167 62,162" fill="#38BDF8"/>
    <polygon points="72,153 96,141 96,155 72,167" fill="#0284C7"/>
    <polygon points="106,126 146,106 156,111 116,131" fill="#E0F2FE"/>
    <polygon points="106,126 116,131 116,148 106,143" fill="#38BDF8"/>
    <polygon points="116,131 156,111 156,128 116,148" fill="#0284C7"/>
    <polygon points="148,144 176,158 166,163 138,149" fill="#BAE6FD"/>
    <polygon points="138,149 166,163 166,179 138,165" fill="#22D3EE"/>
    <polygon points="166,163 176,158 176,174 166,179" fill="#0891B2"/>
    <polygon points="116,138 140,150 132,154 108,142" fill="#FEF08A"/>
    <polygon points="108,142 132,154 132,161 108,149" fill="#FACC15"/>
    <polygon points="132,154 140,150 140,157 132,161" fill="#D97706"/>
  </g>
  <g id="stage-advanced">
    <polygon points="164,122 186,111 198,117 176,128" fill="#E0F2FE"/>
    <polygon points="164,122 176,128 176,148 164,142" fill="#38BDF8"/>
    <polygon points="176,128 198,117 198,137 176,148" fill="#1D4ED8"/>
    <polygon points="181,106 190,110.5 181,115 172,110.5" fill="#FEF08A"/>
    <polygon points="172,110.5 181,115 181,123 172,118.5" fill="#FACC15"/>
    <polygon points="181,115 190,110.5 190,118.5 181,123" fill="#D97706"/>
    <rect x="180" y="84" width="2" height="25" fill="#334155"/>
    <polygon points="182,84 200,92 182,99" fill="#FB7185"/>
  </g>
</svg>`;

/** Island 3 — Creative Coding Realm
 *  Purple valley, cyan energy river, crystal cathedral */
export const SVG_GAS_ISLAND_CREATIVE_CODING = `
<svg id="island-creative-coding" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-creative">
      <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z"/>
    </clipPath>
  </defs>
  <g id="stage-beginner">
    <path d="M 34,175 Q 34,178 40,181 L 118,220 Q 124,223 130,223 L 130,237 Q 124,237 118,234 L 40,195 Q 34,192 34,189 Z" fill="#4C1D95"/>
    <path d="M 130,223 Q 136,223 142,220 L 220,181 Q 226,178 226,175 L 226,189 Q 226,192 220,195 L 142,234 Q 136,237 130,237 Z" fill="#2E1065"/>
    <path d="M 34,163 Q 34,166 40,169 L 118,208 Q 124,211 130,211 L 130,223 Q 124,223 118,220 L 40,181 Q 34,178 34,175 Z" fill="#8B5CF6"/>
    <path d="M 130,211 Q 136,211 142,208 L 220,169 Q 226,166 226,163 L 226,175 Q 226,178 220,181 L 142,220 Q 136,223 130,223 Z" fill="#6D28D9"/>
    <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z" fill="#C4B5FD"/>
    <g clip-path="url(#clip-creative)">
      <path d="M 92,196 C 110,178 124,168 142,156 C 156,146 164,132 170,124 L 148,116 C 142,128 134,142 118,150 C 98,160 80,174 68,188 Z" fill="#ECFEFF"/>
      <path d="M 88,194 C 106,176 122,165 138,154 C 152,144 160,130 166,122 L 152,117 C 146,128 136,142 120,150 C 102,160 84,174 72,188 Z" fill="#22D3EE"/>
    </g>
    <polygon points="82,150 92,155 82,160 72,155" fill="#FDE047"/>
    <polygon points="72,155 82,160 82,171 72,166" fill="#FB923C"/>
    <polygon points="82,160 92,155 92,166 82,171" fill="#EA580C"/>
    <circle cx="186" cy="156" r="8" fill="#A855F7"/>
    <circle cx="194" cy="150" r="9" fill="#C084FC"/>
  </g>
  <g id="stage-intermediate">
    <path d="M 106,162 Q 124,142 142,158 L 132,164 Q 122,154 114,167 Z" fill="#A5F3FC"/>
    <path d="M 114,167 Q 122,154 132,164 L 132,170 Q 122,160 114,172 Z" fill="#0891B2"/>
    <polygon points="76,126 92,118 104,124 88,132" fill="#F9A8D4"/>
    <polygon points="76,126 88,132 88,154 76,148" fill="#EC4899"/>
    <polygon points="88,132 104,124 104,146 88,154" fill="#9D174D"/>
  </g>
  <g id="stage-advanced">
    <polygon points="146,126 164,117 180,125 162,134" fill="#E9D5FF"/>
    <polygon points="146,126 162,134 162,164 146,156" fill="#A855F7"/>
    <polygon points="162,134 180,125 180,155 162,164" fill="#6B21A8"/>
    <polygon points="164,74 178,98 164,105" fill="#A5F3FC"/>
    <polygon points="164,74 164,105 150,98" fill="#22D3EE"/>
    <polygon points="150,98 164,105 164,124" fill="#38BDF8"/>
    <polygon points="164,105 178,98 164,124" fill="#2563EB"/>
  </g>
</svg>`;

/** Island 4 — App Development Island
 *  Green tech park, smartphone monolith, relay antenna, satellite drone */
export const SVG_GAS_ISLAND_APP_DEVELOPMENT = `
<svg id="island-app-development" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-app">
      <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z"/>
    </clipPath>
  </defs>
  <g id="stage-beginner">
    <path d="M 34,175 Q 34,178 40,181 L 118,220 Q 124,223 130,223 L 130,237 Q 124,237 118,234 L 40,195 Q 34,192 34,189 Z" fill="#47423D"/>
    <path d="M 130,223 Q 136,223 142,220 L 220,181 Q 226,178 226,175 L 226,189 Q 226,192 220,195 L 142,234 Q 136,237 130,237 Z" fill="#2E2A27"/>
    <path d="M 34,163 Q 34,166 40,169 L 118,208 Q 124,211 130,211 L 130,223 Q 124,223 118,220 L 40,181 Q 34,178 34,175 Z" fill="#4D8B6F"/>
    <path d="M 130,211 Q 136,211 142,208 L 220,169 Q 226,166 226,163 L 226,175 Q 226,178 220,181 L 142,220 Q 136,223 130,223 Z" fill="#35634D"/>
    <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z" fill="#A9CF54"/>
    <g clip-path="url(#clip-app)">
      <path d="M 62,174 C 82,162 108,166 116,180 C 122,190 96,204 70,192 Z" fill="#EFFAFE"/>
      <path d="M 66,176 C 84,166 106,170 112,181 C 116,189 94,200 72,190 Z" fill="#2CA8E2"/>
      <path d="M 114,158 L 154,138 L 182,152 L 142,172 Z" fill="#E2E8F0"/>
    </g>
    <circle cx="72" cy="146" r="8" fill="#6F9A2D"/>
    <circle cx="80" cy="142" r="9" fill="#8EBA3E"/>
    <ellipse cx="94" cy="166" rx="7" ry="3" fill="#1E293B" opacity="0.16"/>
    <polygon points="94,152 101,155.5 94,159 87,155.5" fill="#D9F99D"/>
    <polygon points="87,155.5 94,159 94,166 87,162.5" fill="#84CC16"/>
    <polygon points="94,159 101,155.5 101,162.5 94,166" fill="#4D7C0F"/>
    <circle cx="90.5" cy="160" r="1" fill="#FFFFFF"/>
  </g>
  <g id="stage-intermediate">
    <polygon points="124,90 152,104 142,109 114,95" fill="#475569"/>
    <polygon points="114,95 142,109 142,164 114,150" fill="#334155"/>
    <polygon points="142,109 152,104 152,159 142,164" fill="#1E293B"/>
    <polygon points="117,101 139,112 139,154 117,143" fill="#F8FAFC"/>
    <polygon points="119,107 125,110 125,118 119,115" fill="#84CC16"/>
    <polygon points="129,112 136,115.5 136,123.5 129,120" fill="#38BDF8"/>
    <polygon points="119,122 136,130.5 136,137.5 119,129" fill="#FACC15"/>
    <polygon points="119,134 127,138 127,146 119,142" fill="#FB7185"/>
    <polygon points="176,144 184,148 176,152 168,148" fill="#BAE6FD"/>
    <polygon points="168,148 176,152 176,165 168,161" fill="#38BDF8"/>
    <polygon points="176,152 184,148 184,161 176,165" fill="#0284C7"/>
  </g>
  <g id="stage-advanced">
    <ellipse cx="188" cy="136" rx="8" ry="3" fill="#1E293B" opacity="0.18"/>
    <path d="M 140,86 Q 166,76 186,98" fill="none" stroke="#38BDF8" stroke-width="2" stroke-dasharray="4 4"/>
    <path d="M 176,144 L 188,114" fill="none" stroke="#38BDF8" stroke-width="1.8" stroke-dasharray="3 3"/>
    <polygon points="188,92 198,97 188,102 178,97" fill="#BAE6FD"/>
    <polygon points="178,97 188,102 188,112 178,107" fill="#38BDF8"/>
    <polygon points="188,102 198,97 198,107 188,112" fill="#0284C7"/>
    <polygon points="134,68 144,73 134,78 124,73" fill="#FEF08A"/>
    <polygon points="124,73 134,78 134,86 124,81" fill="#FACC15"/>
    <polygon points="134,78 144,73 144,81 134,86" fill="#D97706"/>
  </g>
</svg>`;

/** Island 5 — Python Ice Kingdom
 *  Snowy peaks, ice cave, twin Python serpents (blue & gold) */
export const SVG_GAS_ISLAND_PYTHON_ICE_KINGDOM = `
<svg id="island-python-ice-kingdom" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-python">
      <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z"/>
    </clipPath>
  </defs>
  <g id="stage-beginner">
    <path d="M 34,175 Q 34,178 40,181 L 118,220 Q 124,223 130,223 L 130,237 Q 124,237 118,234 L 40,195 Q 34,192 34,189 Z" fill="#2A303B"/>
    <path d="M 130,223 Q 136,223 142,220 L 220,181 Q 226,178 226,175 L 226,189 Q 226,192 220,195 L 142,234 Q 136,237 130,237 Z" fill="#1B2028"/>
    <path d="M 34,163 Q 34,166 40,169 L 118,208 Q 124,211 130,211 L 130,223 Q 124,223 118,220 L 40,181 Q 34,178 34,175 Z" fill="#2CA8E2"/>
    <path d="M 130,211 Q 136,211 142,208 L 220,169 Q 226,166 226,163 L 226,175 Q 226,178 220,181 L 142,220 Q 136,223 130,223 Z" fill="#197DB3"/>
    <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z" fill="#2CA8E2"/>
    <g clip-path="url(#clip-python)">
      <path d="M 46,154 C 74,148 92,168 118,170 C 142,172 162,190 212,164 L 144,114 L 56,142 Z" fill="#FFFFFF"/>
      <path d="M 52,150 C 78,144 96,164 120,166 C 144,168 164,186 216,160 L 142,112 L 52,144 Z" fill="#F1F5F9"/>
    </g>
    <polygon points="72,148 84,136 98,144 86,156" fill="#475569"/>
    <polygon points="78,146 86,142 92,148 84,154" fill="#0F172A"/>
    <polygon points="85,146 88,151 85,155 82,151" fill="#22D3EE"/>
  </g>
  <g id="stage-intermediate">
    <polygon points="78,146 102,96 114,148" fill="#4D6E8C"/>
    <polygon points="102,96 124,142 114,148" fill="#1E3A5F"/>
    <polygon points="102,96 95,112 102,108 109,112" fill="#FFFFFF"/>
    <polygon points="102,144 134,58 148,148" fill="#3776AB"/>
    <polygon points="134,58 170,138 148,148" fill="#1E3A8A"/>
    <polygon points="134,58 124,84 134,78 144,84" fill="#FFFFFF"/>
    <polygon points="152,140 178,86 188,144" fill="#4D6E8C"/>
    <polygon points="178,86 206,138 188,144" fill="#1E3A5F"/>
    <polygon points="178,86 171,102 178,98 185,102" fill="#FFFFFF"/>
  </g>
  <g id="stage-advanced">
    <polygon points="150,158 164,165 150,172 136,165" fill="#BAE6FD"/>
    <polygon points="136,165 150,172 150,178 136,171" fill="#3776AB"/>
    <polygon points="150,172 164,165 164,171 150,178" fill="#1E3A8A"/>
    <polygon points="146,128 152,131 152,164 146,161" fill="#3776AB"/>
    <polygon points="152,131 158,128 158,161 152,164" fill="#1E3A8A"/>
    <polygon points="146,128 158,134 152,137 140,131" fill="#93C5FD"/>
    <polygon points="152,134 162,139 156,142 146,137" fill="#60A5FA"/>
    <circle cx="155" cy="140" r="1.2" fill="#FEF08A"/>
    <polygon points="156,138 162,141 162,168 156,165" fill="#FACC15"/>
    <polygon points="162,141 168,138 168,165 162,168" fill="#D97706"/>
    <polygon points="144,142 158,149 152,152 138,145" fill="#FEF08A"/>
    <polygon points="138,145 152,152 152,158 138,151" fill="#FACC15"/>
    <circle cx="143" cy="149" r="1.2" fill="#1E3A8A"/>
  </g>
</svg>`;

/** Island 6 — Web Development Harbor
 *  Tropical beach, HTML/CSS studio, JS lighthouse with gradient beam */
export const SVG_GAS_ISLAND_WEB_HARBOR = `
<svg id="island-web-harbor" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-web">
      <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z"/>
    </clipPath>
    <linearGradient id="beam-harbor" x1="100%" y1="50%" x2="0%" y2="50%">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.48"/>
      <stop offset="100%" stop-color="#FDE047" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g id="stage-beginner">
    <path d="M 34,175 Q 34,178 40,181 L 118,220 Q 124,223 130,223 L 130,237 Q 124,237 118,234 L 40,195 Q 34,192 34,189 Z" fill="#2A303B"/>
    <path d="M 130,223 Q 136,223 142,220 L 220,181 Q 226,178 226,175 L 226,189 Q 226,192 220,195 L 142,234 Q 136,237 130,237 Z" fill="#1B2028"/>
    <path d="M 34,163 Q 34,166 40,169 L 118,208 Q 124,211 130,211 L 130,223 Q 124,223 118,220 L 40,181 Q 34,178 34,175 Z" fill="#2CA8E2"/>
    <path d="M 130,211 Q 136,211 142,208 L 220,169 Q 226,166 226,163 L 226,175 Q 226,178 220,181 L 142,220 Q 136,223 130,223 Z" fill="#197DB3"/>
    <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z" fill="#2CA8E2"/>
    <g clip-path="url(#clip-web)">
      <path d="M 48,156 C 72,158 84,178 106,174 C 128,170 144,188 196,176 L 144,114 L 54,146 Z" fill="#FFFFFF"/>
      <path d="M 54,152 C 76,154 88,173 108,170 C 130,166 146,184 202,172 L 142,112 L 54,144 Z" fill="#F5DCB0"/>
    </g>
    <path d="M 88,154 Q 90,136 96,124 L 101,125 Q 95,138 93,155 Z" fill="#7D5A44"/>
    <path d="M 98,124 Q 82,118 74,128 Q 86,126 98,126 Z" fill="#8EBA3E"/>
    <path d="M 98,124 Q 114,118 120,128 Q 108,126 98,126 Z" fill="#6F9A2D"/>
    <path d="M 98,124 Q 96,108 106,108 Q 102,116 98,124 Z" fill="#A4C953"/>
    <polygon points="84,176 96,182 84,188 72,182" fill="#DDA15E"/>
    <polygon points="72,182 84,188 84,193 72,187" fill="#BC6C25"/>
    <polygon points="84,188 96,182 96,187 84,193" fill="#8C4E18"/>
    <polygon points="104,152 118,159 118,172 104,165" fill="#E76F51"/>
    <polygon points="118,159 130,153 130,166 118,172" fill="#9C6644"/>
    <polygon points="104,146 118,153 130,147 116,140" fill="#94A3B8"/>
  </g>
  <g id="stage-intermediate">
    <polygon points="128,128 152,140 138,147 114,135" fill="#0F766E"/>
    <polygon points="114,135 138,147 138,174 114,162" fill="#F8FAFC"/>
    <polygon points="138,147 152,140 152,167 138,174" fill="#CBD5E1"/>
    <polygon points="114,135 138,147 138,153 114,141" fill="#1E293B"/>
    <polygon points="118,149 134,157 134,168 118,160" fill="#14B8A6"/>
    <polygon points="164,144 174,149 174,162 164,157" fill="#F43F5E"/>
    <polygon points="174,149 184,144 184,157 174,162" fill="#BE123C"/>
    <polygon points="164,132 174,137 174,149 164,144" fill="#F8FAFC"/>
    <polygon points="174,137 184,132 184,144 174,149" fill="#CBD5E1"/>
  </g>
  <g id="stage-advanced">
    <polygon points="164,120 174,125 174,137 164,132" fill="#F43F5E"/>
    <polygon points="174,125 184,120 184,132 174,137" fill="#BE123C"/>
    <polygon points="164,106 174,111 174,120 164,115" fill="#FDE047"/>
    <polygon points="174,111 184,106 184,115 174,120" fill="#F59E0B"/>
    <polygon points="164,106 174,111 174,94" fill="#F43F5E"/>
    <polygon points="174,111 184,106 174,94" fill="#BE123C"/>
    <polygon points="164,110 82,82 94,128" fill="url(#beam-harbor)"/>
  </g>
</svg>`;

/** Island 7 — Roblox Obby Fortress
 *  Red-slate canyon, obby stepping platforms, Ruby portal cube, trophy crown */
export const SVG_GAS_ISLAND_ROBLOX_OBBY = `
<svg id="island-roblox-obby" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-roblox">
      <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z"/>
    </clipPath>
  </defs>
  <g id="stage-beginner">
    <path d="M 34,175 Q 34,178 40,181 L 118,220 Q 124,223 130,223 L 130,237 Q 124,237 118,234 L 40,195 Q 34,192 34,189 Z" fill="#1E293B"/>
    <path d="M 130,223 Q 136,223 142,220 L 220,181 Q 226,178 226,175 L 226,189 Q 226,192 220,195 L 142,234 Q 136,237 130,237 Z" fill="#0F172A"/>
    <path d="M 34,163 Q 34,166 40,169 L 118,208 Q 124,211 130,211 L 130,223 Q 124,223 118,220 L 40,181 Q 34,178 34,175 Z" fill="#475569"/>
    <path d="M 130,211 Q 136,211 142,208 L 220,169 Q 226,166 226,163 L 226,175 Q 226,178 220,181 L 142,220 Q 136,223 130,223 Z" fill="#334155"/>
    <path d="M 118,118 Q 130,112 142,118 L 220,157 Q 232,163 220,169 L 142,208 Q 130,214 118,208 L 40,169 Q 28,163 40,157 Z" fill="#94A3B8"/>
    <g clip-path="url(#clip-roblox)">
      <path d="M 96,204 C 102,188 122,182 142,172 C 164,160 156,144 134,132 L 116,140 C 134,150 138,160 120,168 C 100,178 82,184 74,196 Z" fill="#FDE2E4"/>
    </g>
    <ellipse cx="86" cy="196" rx="8" ry="3" fill="#1E293B" opacity="0.22"/>
    <polygon points="86,182 96,187 86,192 76,187" fill="#FEF08A"/>
    <polygon points="76,187 86,192 86,197 76,192" fill="#FACC15"/>
    <polygon points="86,192 96,187 96,192 86,197" fill="#D97706"/>
    <ellipse cx="106" cy="186" rx="8" ry="3" fill="#1E293B" opacity="0.22"/>
    <polygon points="106,170 116,175 106,180 96,175" fill="#A5F3FC"/>
    <polygon points="96,175 106,180 106,185 96,180" fill="#22D3EE"/>
    <polygon points="106,180 116,175 116,180 106,185" fill="#0284C7"/>
  </g>
  <g id="stage-intermediate">
    <ellipse cx="126" cy="176" rx="8" ry="3" fill="#1E293B" opacity="0.22"/>
    <polygon points="126,158 136,163 126,168 116,163" fill="#BBF7D0"/>
    <polygon points="116,163 126,168 126,173 116,168" fill="#4ADE80"/>
    <polygon points="126,168 136,163 136,168 126,173" fill="#16A34A"/>
    <polygon points="72,142 90,133 102,139 84,148" fill="#64748B"/>
    <polygon points="72,142 84,148 84,166 72,160" fill="#475569"/>
    <polygon points="84,148 102,139 102,157 84,166" fill="#334155"/>
    <polygon points="124,132 152,118 176,130 148,144" fill="#FDA4AF"/>
    <polygon points="124,132 148,144 148,162 124,150" fill="#F43F5E"/>
    <polygon points="148,144 176,130 176,148 148,162" fill="#BE123C"/>
  </g>
  <g id="stage-advanced">
    <polygon points="150,82 172,93 150,104 128,93" fill="#F8FAFC"/>
    <polygon points="128,93 150,104 150,136 128,125" fill="#E2E8F0"/>
    <polygon points="150,104 172,93 172,125 150,136" fill="#94A3B8"/>
    <polygon points="135,104 143,108 143,122 135,118" fill="#F43F5E"/>
    <polygon points="150,62 159,66.5 150,71 141,66.5" fill="#FEF08A"/>
    <polygon points="141,66.5 150,71 150,79 141,74.5" fill="#FACC15"/>
    <polygon points="150,71 159,66.5 159,74.5 150,79" fill="#D97706"/>
  </g>
</svg>`;
