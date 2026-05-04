"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = {
  hearts: document.getElementById("hearts"),
  levelName: document.getElementById("levelName"),
  shards: document.getElementById("shards"),
  relics: document.getElementById("relics"),
};
const menuPanel = document.getElementById("menuPanel");
const startButton = document.getElementById("startButton");
const muteButton = document.getElementById("muteButton");
const cinema = document.getElementById("cinema");
const cinemaKicker = document.getElementById("cinemaKicker");
const cinemaTitle = document.getElementById("cinemaTitle");
const cinemaText = document.getElementById("cinemaText");
const cinemaButton = document.getElementById("cinemaButton");
const choicePanel = document.getElementById("choicePanel");
const choiceKicker = document.getElementById("choiceKicker");
const choiceTitle = document.getElementById("choiceTitle");
const choiceText = document.getElementById("choiceText");
const choiceActions = document.getElementById("choiceActions");
const toast = document.getElementById("toast");

const W = 960;
const H = 540;
const G = 0.72;
const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

canvas.width = W * DPR;
canvas.height = H * DPR;
ctx.scale(DPR, DPR);

const input = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  down: false,
  dash: false,
  jumpPressed: false,
  attackPressed: false,
  dashPressed: false,
};

const pressed = new Set();
const particles = [];
let last = 0;
let state = "menu";
let camera = { x: 0, y: 0, shake: 0 };
let levelIndex = 0;
let activeLevel = null;
let player = null;
let cutsceneQueue = [];
let currentCutscene = null;
let toastTimer = 0;
let unlockedAudio = false;
let muted = false;
let audioCtx = null;
let totalRelics = 0;
let totalShards = 0;
let time = 0;
let pendingChoice = null;
let run = null;
let save = null;

const SAVE_KEY = "oscarTheKnightSaveV1";

const atlas = new Image();
atlas.src = "./assets/generated/oscar-painted-atlas.png";
let atlasReady = false;
atlas.addEventListener("load", () => {
  atlasReady = true;
});

const envAtlas = new Image();
envAtlas.src = "./assets/generated/oscar-environment-atlas.png";
let envReady = false;
envAtlas.addEventListener("load", () => {
  envReady = true;
});

const BACKDROP_SOURCES = {
  gate: "./assets/generated/bg-moonlit-gate.png",
  briar: "./assets/generated/bg-briar-quarry.png",
  ember: "./assets/generated/bg-ember-keep.png",
  observatory: "./assets/generated/bg-starfall-observatory.png",
};
const backdrops = {};
for (const [key, src] of Object.entries(BACKDROP_SOURCES)) {
  const img = new Image();
  img.src = src;
  img.ready = false;
  img.addEventListener("load", () => {
    img.ready = true;
  });
  backdrops[key] = img;
}

const SPRITES = {
  oscarIdle: { x: 36, y: 30, w: 128, h: 174 },
  oscarShield: { x: 204, y: 32, w: 126, h: 170 },
  oscarWalkA: { x: 368, y: 34, w: 140, h: 166 },
  oscarWalkB: { x: 525, y: 40, w: 148, h: 158 },
  oscarRun: { x: 690, y: 46, w: 160, h: 152 },
  oscarCrouch: { x: 862, y: 50, w: 140, h: 150 },
  oscarJump: { x: 1040, y: 18, w: 144, h: 184 },
  oscarAirSlash: { x: 1200, y: 30, w: 286, h: 164 },
  oscarBlock: { x: 35, y: 232, w: 140, h: 148 },
  oscarSlide: { x: 372, y: 247, w: 170, h: 132 },
  oscarSlash: { x: 748, y: 245, w: 250, h: 132 },
  oscarHit: { x: 1200, y: 250, w: 168, h: 128 },
  imp: { x: 42, y: 540, w: 110, h: 112 },
  impWalk: { x: 158, y: 540, w: 116, h: 112 },
  guard: { x: 276, y: 540, w: 160, h: 116 },
  batA: { x: 764, y: 548, w: 120, h: 92 },
  batB: { x: 898, y: 548, w: 144, h: 92 },
  batC: { x: 1055, y: 548, w: 164, h: 95 },
  emberA: { x: 50, y: 690, w: 96, h: 114 },
  emberB: { x: 154, y: 690, w: 110, h: 114 },
  emberC: { x: 304, y: 684, w: 170, h: 126 },
  regentA: { x: 575, y: 665, w: 240, h: 168 },
  regentB: { x: 828, y: 650, w: 360, h: 188 },
  regentC: { x: 1214, y: 656, w: 286, h: 184 },
  shardA: { x: 24, y: 862, w: 126, h: 126 },
  shardB: { x: 164, y: 858, w: 108, h: 132 },
  shardC: { x: 288, y: 858, w: 118, h: 132 },
  shardD: { x: 418, y: 858, w: 122, h: 132 },
  crest: { x: 610, y: 854, w: 142, h: 154 },
  crestSide: { x: 770, y: 852, w: 102, h: 148 },
  lanternA: { x: 944, y: 846, w: 98, h: 154 },
  lanternB: { x: 1094, y: 846, w: 98, h: 154 },
  lanternC: { x: 1244, y: 846, w: 98, h: 154 },
  lanternD: { x: 1394, y: 846, w: 98, h: 154 },
};

const ENV = {
  mossLong: { x: 12, y: 76, w: 286, h: 112 },
  mossMid: { x: 336, y: 88, w: 181, h: 86 },
  mossSmall: { x: 32, y: 202, w: 123, h: 76 },
  mossPillar: { x: 205, y: 201, w: 101, h: 80 },
  mossIsland: { x: 546, y: 90, w: 126, h: 114 },
  doorGate: { x: 704, y: 36, w: 225, h: 250 },
  doorBriar: { x: 940, y: 50, w: 164, h: 236 },
  doorEmber: { x: 1127, y: 39, w: 184, h: 248 },
  doorObservatory: { x: 1320, y: 38, w: 190, h: 250 },
  obsLong: { x: 33, y: 330, w: 236, h: 86 },
  obsSmall: { x: 289, y: 333, w: 76, h: 80 },
  obsMid: { x: 389, y: 334, w: 72, h: 78 },
  emberLong: { x: 480, y: 334, w: 216, h: 86 },
  emberMid: { x: 717, y: 335, w: 120, h: 78 },
  emberSmall: { x: 856, y: 340, w: 52, h: 74 },
  woodLong: { x: 936, y: 334, w: 242, h: 78 },
  woodMid: { x: 1224, y: 336, w: 132, h: 74 },
  woodCrateBridge: { x: 1355, y: 333, w: 150, h: 92 },
  bannerRed: { x: 51, y: 525, w: 58, h: 172 },
  bannerTorn: { x: 188, y: 520, w: 62, h: 172 },
  bannerBlue: { x: 300, y: 520, w: 76, h: 178 },
  brambleA: { x: 430, y: 556, w: 150, h: 96 },
  brambleB: { x: 607, y: 536, w: 150, h: 132 },
  spikesA: { x: 780, y: 572, w: 156, h: 72 },
  spikesB: { x: 964, y: 590, w: 126, h: 58 },
  lavaVentA: { x: 1138, y: 530, w: 88, h: 150 },
  lavaVentB: { x: 1272, y: 530, w: 94, h: 152 },
  lavaSplash: { x: 1395, y: 560, w: 94, h: 118 },
  lanternHook: { x: 42, y: 734, w: 94, h: 130 },
  lanternGold: { x: 163, y: 734, w: 82, h: 130 },
  lanternBlue: { x: 278, y: 731, w: 88, h: 136 },
  chainLong: { x: 510, y: 724, w: 54, h: 146 },
  chainU: { x: 592, y: 729, w: 164, h: 106 },
  vineA: { x: 948, y: 724, w: 66, h: 140 },
  vineB: { x: 1024, y: 718, w: 72, h: 146 },
  vineC: { x: 1113, y: 720, w: 76, h: 142 },
  rope: { x: 1480, y: 722, w: 28, h: 140 },
  crateA: { x: 29, y: 926, w: 74, h: 66 },
  crateB: { x: 116, y: 916, w: 76, h: 78 },
  barrel: { x: 274, y: 925, w: 68, h: 72 },
  rockA: { x: 392, y: 928, w: 96, h: 66 },
  rockB: { x: 675, y: 910, w: 142, h: 86 },
  rockC: { x: 850, y: 906, w: 136, h: 90 },
  rockD: { x: 1010, y: 916, w: 130, h: 80 },
  rockE: { x: 1188, y: 920, w: 100, h: 76 },
  rockF: { x: 1322, y: 909, w: 118, h: 86 },
};

function setOverlayMode(mode) {
  document.body.classList.toggle("menu-open", mode === "menu");
  document.body.classList.toggle("cinema-open", mode === "cinema");
}

const KEYMAP = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  KeyJ: "attack",
  KeyK: "attack",
  KeyX: "attack",
  ArrowDown: "down",
  KeyS: "down",
  ShiftLeft: "dash",
  ShiftRight: "dash",
  KeyL: "dash",
  Digit1: "choice1",
  Digit2: "choice2",
  Digit3: "choice3",
  KeyP: "pause",
  Escape: "pause",
};

const CUTSCENES = {
  prologue: [
    {
      kicker: "Prologue",
      title: "The Bell That Would Not Ring",
      text: "Every dawn in Rowanvale began with the Crown Lantern chiming from the old tower. Then the Thorn Regent stole it, and morning arrived pale and unfinished.",
    },
    {
      kicker: "Oscar",
      title: "A Small Knight With A Large Oath",
      text: "Oscar had inherited one bright blade, one weather-stained cloak, and a habit of volunteering before anyone finished describing the danger.",
    },
    {
      kicker: "Quest",
      title: "Four Gates To Sunrise",
      text: "To relight the tower, Oscar must gather moon shards, wake three forgotten crests, and carry the Lantern through the Ember Keep.",
    },
  ],
  afterGate: [
    {
      kicker: "The Gate",
      title: "A Crest Remembers",
      text: "The first crest opened like an eye. Somewhere above the trees, the stolen Lantern answered with one tired spark.",
    },
  ],
  afterBriar: [
    {
      kicker: "The Quarry",
      title: "Stone Learns To Sing",
      text: "The quarry walls hummed as Oscar passed. The Thorn Regent had buried old roads, but moon shards still knew the way upward.",
    },
  ],
  afterEmber: [
    {
      kicker: "The Keep",
      title: "A Door Made Of Heat",
      text: "Oscar's cloak smoked at the edges. Ahead waited the Observatory, where the Regent wound shadows around the Crown Lantern.",
    },
  ],
  ending: [
    {
      kicker: "Finale",
      title: "Sunrise, Properly Introduced",
      text: "The Crown Lantern rang once, then again, until every window in Rowanvale blushed gold. Oscar bowed to the light and quietly checked whether anyone had saved breakfast.",
    },
  ],
};

const SKILLS = [
  { id: "blade", name: "Longer Blade", branch: "Sword", cost: 3, max: 3, desc: "+12% slash reach and damage per rank." },
  { id: "guard", name: "Lion Guard", branch: "Shield", cost: 3, max: 3, desc: "+1 max heart on ranks 1 and 3." },
  { id: "dash", name: "Dawn Dash", branch: "Mobility", cost: 4, max: 1, desc: "Unlock a quick mid-air dash with Shift/L." },
  { id: "magnet", name: "Moon Pull", branch: "Lantern", cost: 2, max: 3, desc: "Moon shards drift toward Oscar." },
  { id: "pockets", name: "Royal Pockets", branch: "Economy", cost: 3, max: 3, desc: "Start with shards and haggle better shop prices." },
  { id: "luck", name: "Relic Luck", branch: "Lantern", cost: 4, max: 2, desc: "More treasure rooms and better relic rolls." },
  { id: "vitality", name: "Stone Vow", branch: "Shield", cost: 5, max: 2, desc: "Rooms sometimes restore a heart after hard clears." },
  { id: "revive", name: "Last Bell", branch: "Lantern", cost: 8, max: 1, desc: "Once per run, revive with 2 hearts." },
];

const RELICS = [
  { id: "thornbreaker", name: "Thornbreaker", desc: "Deal extra damage to imps, guards, and brambles.", color: "#9fe2ad" },
  { id: "emberBoots", name: "Ember Boots", desc: "Lava and ember hazards hurt less.", color: "#ffb15a" },
  { id: "moonMagnet", name: "Moon Magnet", desc: "Shards fly to Oscar and are worth more.", color: "#a6e6d6" },
  { id: "crownSpark", name: "Crown Spark", desc: "Every 6 shards charges a brighter slash.", color: "#ffe07a" },
  { id: "lionHeart", name: "Lion Heart", desc: "+1 max heart for this run.", color: "#ff8a7c" },
  { id: "quarryHook", name: "Quarry Hook", desc: "Jump higher after landing on small platforms.", color: "#d6b26d" },
  { id: "starGlass", name: "Star Glass", desc: "Projectiles move slower near Oscar.", color: "#b6d7ff" },
  { id: "roseCloak", name: "Rose Cloak", desc: "First hit in each room is ignored.", color: "#d4586a" },
  { id: "swiftGreaves", name: "Swift Greaves", desc: "Move faster and keep a little more speed in the air.", color: "#9fe2ad" },
  { id: "silverLedger", name: "Silver Ledger", desc: "Combat rooms bank one extra Sun Sigil.", color: "#e2e0d2" },
  { id: "duelistRibbon", name: "Duelist Ribbon", desc: "Every fifth defeated foe restores a heart.", color: "#d4586a" },
  { id: "glassBell", name: "Glass Bell", desc: "Taking damage drops a burst of moon shards.", color: "#a6e6d6" },
];

const ROOM_KINDS = [
  "combat", "parkour", "treasure", "combat", "shop", "elite",
  "fountain", "combat", "challenge", "gauntlet", "treasure", "miniboss",
  "shop", "parkour", "fountain", "combat", "altar", "challenge",
  "elite", "treasure", "gauntlet", "shop", "fountain", "miniboss",
  "parkour", "challenge", "altar", "treasure", "elite", "boss",
];

const PALETTES = {
  gate: {
    skyTop: "#324f72",
    skyMid: "#8b6870",
    skyLow: "#e2ad6d",
    far: "#293855",
    mid: "#3a654e",
    near: "#22332f",
    earth: "#5a4935",
    earthDark: "#2b2430",
    grass: "#70b76a",
    accent: "#f0c45b",
  },
  briar: {
    skyTop: "#475e62",
    skyMid: "#b77c5d",
    skyLow: "#f0c18a",
    far: "#425064",
    mid: "#59683f",
    near: "#31422c",
    earth: "#6c4e3e",
    earthDark: "#30242c",
    grass: "#8aaa50",
    accent: "#d4586a",
  },
  ember: {
    skyTop: "#39253a",
    skyMid: "#8e3d34",
    skyLow: "#e87932",
    far: "#442b35",
    mid: "#6b3330",
    near: "#2b1b24",
    earth: "#6a352c",
    earthDark: "#211923",
    grass: "#d48a3c",
    accent: "#ffcf66",
  },
  observatory: {
    skyTop: "#162339",
    skyMid: "#355176",
    skyLow: "#88a4ad",
    far: "#20294c",
    mid: "#355165",
    near: "#1c2738",
    earth: "#4b4f65",
    earthDark: "#181b2b",
    grass: "#8bb0b5",
    accent: "#a6e6d6",
  },
};

const LEVELS = [
  {
    name: "Moonlit Gate",
    subtitle: "The first wall of Rowanvale",
    palette: "gate",
    width: 2550,
    storyAfter: "afterGate",
    spawn: { x: 90, y: 336 },
    exit: { x: 2405, y: 270, w: 72, h: 132 },
    platforms: [
      { x: 0, y: 440, w: 520, h: 120 },
      { x: 600, y: 430, w: 360, h: 130 },
      { x: 1070, y: 448, w: 320, h: 112 },
      { x: 1510, y: 430, w: 310, h: 130 },
      { x: 1940, y: 430, w: 610, h: 130 },
      { x: 340, y: 342, w: 170, h: 28, trim: "wood" },
      { x: 660, y: 322, w: 160, h: 28, trim: "wood" },
      { x: 960, y: 285, w: 132, h: 26, trim: "stone" },
      { x: 1245, y: 352, w: 148, h: 26, trim: "wood" },
      { x: 1610, y: 320, w: 170, h: 26, trim: "stone" },
      { x: 1995, y: 322, w: 135, h: 26, trim: "wood" },
      { x: 2195, y: 276, w: 132, h: 26, trim: "stone" },
    ],
    hazards: [
      { x: 530, y: 464, w: 70, h: 58, type: "bramble" },
      { x: 1410, y: 468, w: 78, h: 58, type: "bramble" },
      { x: 1845, y: 468, w: 78, h: 58, type: "bramble" },
    ],
    pickups: [
      { x: 382, y: 304 },
      { x: 704, y: 286 },
      { x: 1000, y: 244 },
      { x: 1284, y: 314 },
      { x: 1652, y: 282 },
      { x: 2030, y: 286 },
      { x: 2240, y: 236 },
      { x: 2320, y: 388 },
    ],
    relics: [{ x: 1164, y: 394, kind: "crest" }],
    enemies: [
      { type: "imp", x: 720, y: 390, min: 650, max: 900 },
      { type: "bat", x: 1350, y: 260, min: 1180, max: 1440 },
      { type: "imp", x: 2060, y: 390, min: 1980, max: 2300 },
    ],
    checkpoints: [{ x: 1515, y: 380 }],
  },
  {
    name: "Briar Quarry",
    subtitle: "Where bridges remember feet",
    palette: "briar",
    width: 2870,
    storyAfter: "afterBriar",
    spawn: { x: 80, y: 326 },
    exit: { x: 2720, y: 246, w: 76, h: 154 },
    platforms: [
      { x: 0, y: 430, w: 430, h: 130 },
      { x: 530, y: 458, w: 270, h: 102 },
      { x: 870, y: 410, w: 280, h: 150 },
      { x: 1240, y: 465, w: 300, h: 95 },
      { x: 1655, y: 426, w: 260, h: 134 },
      { x: 2030, y: 466, w: 270, h: 94 },
      { x: 2430, y: 420, w: 440, h: 140 },
      { x: 330, y: 326, w: 122, h: 24, trim: "wood" },
      { x: 618, y: 300, w: 116, h: 24, trim: "wood" },
      { x: 936, y: 278, w: 122, h: 24, trim: "stone" },
      { x: 1320, y: 340, w: 150, h: 24, trim: "wood" },
      { x: 1715, y: 300, w: 142, h: 24, trim: "stone" },
      { x: 2070, y: 318, w: 124, h: 24, trim: "wood" },
      { x: 2320, y: 282, w: 126, h: 24, trim: "stone" },
      { x: 2555, y: 248, w: 118, h: 24, trim: "wood" },
    ],
    hazards: [
      { x: 438, y: 474, w: 76, h: 56, type: "bramble" },
      { x: 805, y: 484, w: 60, h: 52, type: "pit" },
      { x: 1542, y: 486, w: 92, h: 54, type: "bramble" },
      { x: 1930, y: 484, w: 84, h: 54, type: "pit" },
      { x: 2314, y: 490, w: 90, h: 50, type: "bramble" },
    ],
    pickups: [
      { x: 360, y: 286 },
      { x: 652, y: 260 },
      { x: 978, y: 238 },
      { x: 1372, y: 304 },
      { x: 1758, y: 260 },
      { x: 2110, y: 280 },
      { x: 2362, y: 242 },
      { x: 2594, y: 208 },
      { x: 2650, y: 378 },
    ],
    relics: [{ x: 1878, y: 374, kind: "crest" }],
    enemies: [
      { type: "imp", x: 600, y: 416, min: 540, max: 780 },
      { type: "bat", x: 1120, y: 230, min: 940, max: 1260 },
      { type: "guard", x: 1715, y: 384, min: 1660, max: 1900 },
      { type: "bat", x: 2250, y: 270, min: 2050, max: 2420 },
    ],
    checkpoints: [{ x: 1242, y: 412 }, { x: 2036, y: 412 }],
  },
  {
    name: "Ember Keep",
    subtitle: "A castle chewing on its own fire",
    palette: "ember",
    width: 3050,
    storyAfter: "afterEmber",
    spawn: { x: 84, y: 328 },
    exit: { x: 2900, y: 224, w: 80, h: 176 },
    platforms: [
      { x: 0, y: 432, w: 500, h: 128 },
      { x: 610, y: 456, w: 220, h: 104 },
      { x: 920, y: 428, w: 240, h: 132 },
      { x: 1300, y: 458, w: 225, h: 102 },
      { x: 1640, y: 418, w: 280, h: 142 },
      { x: 2020, y: 462, w: 230, h: 98 },
      { x: 2350, y: 425, w: 700, h: 135 },
      { x: 300, y: 310, w: 134, h: 24, trim: "stone" },
      { x: 660, y: 285, w: 116, h: 24, trim: "stone" },
      { x: 1010, y: 292, w: 126, h: 24, trim: "stone" },
      { x: 1364, y: 322, w: 124, h: 24, trim: "stone" },
      { x: 1708, y: 284, w: 148, h: 24, trim: "stone" },
      { x: 2110, y: 314, w: 118, h: 24, trim: "stone" },
      { x: 2424, y: 284, w: 126, h: 24, trim: "stone" },
      { x: 2650, y: 246, w: 142, h: 24, trim: "stone" },
    ],
    hazards: [
      { x: 502, y: 472, w: 98, h: 58, type: "lava" },
      { x: 838, y: 480, w: 76, h: 54, type: "lava" },
      { x: 1180, y: 476, w: 100, h: 54, type: "lava" },
      { x: 1536, y: 478, w: 94, h: 54, type: "lava" },
      { x: 1934, y: 478, w: 76, h: 54, type: "lava" },
      { x: 2260, y: 478, w: 80, h: 54, type: "lava" },
    ],
    pickups: [
      { x: 334, y: 270 },
      { x: 696, y: 245 },
      { x: 1048, y: 252 },
      { x: 1400, y: 282 },
      { x: 1752, y: 244 },
      { x: 2150, y: 274 },
      { x: 2462, y: 244 },
      { x: 2690, y: 206 },
      { x: 2796, y: 382 },
    ],
    relics: [{ x: 2290, y: 370, kind: "crest" }],
    enemies: [
      { type: "guard", x: 950, y: 386, min: 930, max: 1140 },
      { type: "bat", x: 1470, y: 266, min: 1320, max: 1660 },
      { type: "ember", x: 1750, y: 372, min: 1650, max: 1900 },
      { type: "guard", x: 2490, y: 382, min: 2370, max: 2780 },
    ],
    checkpoints: [{ x: 1304, y: 410 }, { x: 2356, y: 378 }],
  },
  {
    name: "Starfall Observatory",
    subtitle: "The Thorn Regent's last balcony",
    palette: "observatory",
    width: 3180,
    storyAfter: "ending",
    spawn: { x: 80, y: 328 },
    exit: { x: 3040, y: 202, w: 90, h: 198 },
    platforms: [
      { x: 0, y: 432, w: 470, h: 128 },
      { x: 570, y: 448, w: 240, h: 112 },
      { x: 900, y: 402, w: 250, h: 158 },
      { x: 1260, y: 458, w: 260, h: 102 },
      { x: 1640, y: 418, w: 280, h: 142 },
      { x: 2010, y: 462, w: 250, h: 98 },
      { x: 2380, y: 420, w: 800, h: 140 },
      { x: 316, y: 306, w: 124, h: 24, trim: "stone" },
      { x: 646, y: 278, w: 116, h: 24, trim: "stone" },
      { x: 980, y: 250, w: 124, h: 24, trim: "stone" },
      { x: 1338, y: 312, w: 132, h: 24, trim: "stone" },
      { x: 1698, y: 282, w: 142, h: 24, trim: "stone" },
      { x: 2072, y: 318, w: 128, h: 24, trim: "stone" },
      { x: 2360, y: 280, w: 116, h: 24, trim: "stone" },
      { x: 2554, y: 248, w: 122, h: 24, trim: "stone" },
      { x: 2768, y: 218, w: 130, h: 24, trim: "stone" },
    ],
    hazards: [
      { x: 480, y: 476, w: 86, h: 54, type: "void" },
      { x: 820, y: 482, w: 74, h: 54, type: "void" },
      { x: 1160, y: 474, w: 90, h: 54, type: "void" },
      { x: 1530, y: 482, w: 102, h: 54, type: "void" },
      { x: 1934, y: 482, w: 70, h: 54, type: "void" },
      { x: 2270, y: 484, w: 102, h: 54, type: "void" },
    ],
    pickups: [
      { x: 350, y: 266 },
      { x: 682, y: 238 },
      { x: 1018, y: 210 },
      { x: 1378, y: 272 },
      { x: 1736, y: 242 },
      { x: 2112, y: 278 },
      { x: 2398, y: 240 },
      { x: 2594, y: 208 },
      { x: 2810, y: 178 },
      { x: 2935, y: 378 },
    ],
    relics: [{ x: 1844, y: 370, kind: "lantern" }],
    enemies: [
      { type: "bat", x: 1120, y: 220, min: 900, max: 1260 },
      { type: "ember", x: 1710, y: 374, min: 1640, max: 1910 },
      { type: "guard", x: 2460, y: 378, min: 2390, max: 2760 },
      { type: "regent", x: 2870, y: 358, min: 2700, max: 2975 },
    ],
    checkpoints: [{ x: 1266, y: 410 }, { x: 2386, y: 372 }],
  },
];

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 34;
    this.h = 54;
    this.vx = 0;
    this.vy = 0;
    this.dir = 1;
    this.hp = 5;
    this.maxHp = 5;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.attackTimer = 0;
    this.invincible = 0;
    this.doubleReady = true;
    this.dashReady = true;
    this.dashTimer = 0;
    this.damageBoost = 1;
    this.step = 0;
    this.spawn = { x, y };
    this.roseGuard = false;
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt) {
    const accel = this.grounded ? 0.84 : 0.5;
    const max = input.down ? 2.6 : 4.2 + skillLevel("blade") * 0.12 + (hasRelic("swiftGreaves") ? 0.45 : 0);
    if (input.left) this.vx -= accel;
    if (input.right) this.vx += accel;
    if (!input.left && !input.right) this.vx *= this.grounded ? 0.78 : hasRelic("swiftGreaves") ? 0.98 : 0.95;
    this.vx = clamp(this.vx, -max, max);
    if (Math.abs(this.vx) > 0.18) this.dir = Math.sign(this.vx);

    if (input.dashPressed) {
      input.dashPressed = false;
      if (skillLevel("dash") > 0 && this.dashReady) {
        this.dashTimer = 11;
        this.dashReady = false;
        this.vx = this.dir * 11.2;
        this.vy = Math.min(this.vy, 0);
        burst(this.x + this.w / 2, this.y + this.h / 2, 22, "#a6e6d6", 3);
        playTone("jump2");
      }
    }

    if (input.jumpPressed) {
      this.jumpBuffer = 9;
      input.jumpPressed = false;
    }

    if (this.jumpBuffer > 0) {
      if (this.grounded || this.coyote > 0) {
        this.vy = -12.7;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.doubleReady = true;
        burst(this.x + this.w / 2, this.y + this.h, 8, "#ffe7a8", 1.6);
        playTone("jump");
      } else if (this.doubleReady) {
        this.vy = -11.2;
        this.doubleReady = false;
        this.jumpBuffer = 0;
        burst(this.x + this.w / 2, this.y + this.h * 0.45, 14, "#a6e6d6", 2.1);
        playTone("jump2");
      }
    }
    this.jumpBuffer--;

    if (!input.jump && this.vy < -2.8) this.vy *= 0.88;
    if (this.dashTimer > 0) {
      this.dashTimer--;
      this.vy *= 0.3;
    } else {
      this.vy += G;
    }
    this.vy = Math.min(this.vy, 16);

    this.moveAxis("x");
    this.moveAxis("y");

    if (this.grounded) {
      this.coyote = 8;
      this.doubleReady = true;
      this.dashReady = true;
    } else {
      this.coyote--;
    }

    if (input.attackPressed) {
      this.attackTimer = 16;
      input.attackPressed = false;
      playTone("slash");
      burst(this.x + this.w / 2 + this.dir * 28, this.y + 28, 7, "#f0c45b", 2.6);
    }

    if (this.attackTimer > 0) this.attackTimer--;
    if (this.invincible > 0) this.invincible--;
    if (this.y > H + 180) this.fallOut();
    this.step += Math.abs(this.vx) * 0.18 + 0.05;
  }

  moveAxis(axis) {
    if (axis === "x") {
      this.x += this.vx;
      for (const p of activeLevel.platforms) {
        if (rects(this.rect, p)) {
          if (this.vx > 0) this.x = p.x - this.w;
          if (this.vx < 0) this.x = p.x + p.w;
          this.vx = 0;
        }
      }
      this.x = clamp(this.x, 0, activeLevel.width - this.w);
    } else {
      this.y += this.vy;
      this.grounded = false;
      for (const p of activeLevel.platforms) {
        if (rects(this.rect, p)) {
          if (this.vy > 0) {
            this.y = p.y - this.h;
            this.grounded = true;
          }
          if (this.vy < 0) this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }
  }

  attackBox() {
    if (this.attackTimer <= 4) return null;
    const reach = 46 + skillLevel("blade") * 7;
    return {
      x: this.dir > 0 ? this.x + this.w - 4 : this.x - reach + 4,
      y: this.y + 11,
      w: reach,
      h: 30,
    };
  }

  damage(amount = 1, knock = 1) {
    if (this.invincible > 0) return;
    if (run?.roomShield) {
      run.roomShield = false;
      this.invincible = 44;
      showToast("Rose Cloak catches the blow.");
      burst(this.x + this.w / 2, this.y + 24, 18, "#d4586a", 2.4);
      return;
    }
    if (hasRelic("emberBoots") && activeLevel?.hazards?.some((h) => h.type === "lava" && rects(this.rect, h))) {
      amount = Math.max(1, amount - 1);
    }
    this.hp -= amount;
    if (hasRelic("glassBell")) {
      for (let i = 0; i < 4; i++) activeLevel.pickups.push(makePickup(this.x + 4 + i * 12, this.y + 8, true));
    }
    this.invincible = 74;
    this.vx = knock * 6.4;
    this.vy = -8.2;
    camera.shake = 12;
    playTone("hurt");
    burst(this.x + this.w / 2, this.y + 25, 24, "#d4586a", 3.2);
    if (this.hp <= 0) {
      if (run?.active && skillLevel("revive") > 0 && !run.revived) {
        run.revived = true;
        this.hp = Math.min(this.maxHp, 2);
        this.invincible = 140;
        showToast("The Last Bell rings. Oscar rises.");
        updateHud();
        return;
      }
      if (run?.active) {
        finishRun(false);
        return;
      }
      this.hp = this.maxHp;
      this.x = this.spawn.x;
      this.y = this.spawn.y;
      this.vx = 0;
      this.vy = 0;
      showToast("Oscar returns to the last banner.");
    }
    updateHud();
  }

  fallOut() {
    if (this.invincible > 0) return;
    if (run?.active && this.hp <= 1) {
      finishRun(false);
      return;
    }
    this.hp = Math.max(1, this.hp - 1);
    this.invincible = 80;
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.vx = 0;
    this.vy = 0;
    camera.shake = 8;
    burst(this.x + this.w / 2, this.y + this.h, 18, "#a6e6d6", 2.7);
    playTone("hurt");
    showToast("Oscar returns to the last banner.");
    updateHud();
  }
}

class Enemy {
  constructor(def) {
    Object.assign(this, def);
    this.w = def.type === "bat" ? 38 : def.type === "regent" ? 58 : 42;
    this.h = def.type === "bat" ? 28 : def.type === "regent" ? 66 : 40;
    this.vx = def.type === "guard" ? 1.6 : def.type === "regent" ? 1.25 : 1;
    this.vy = 0;
    this.dir = 1;
    this.hp = def.type === "regent" ? 7 : def.type === "guard" ? 2 : 1;
    this.dead = false;
    this.t = Math.random() * 100;
    this.baseY = def.y;
    this.cooldown = 0;
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update() {
    if (this.dead) return;
    this.t += 0.06;
    this.cooldown--;
    const speed = (this.type === "regent" ? 1.25 : this.type === "guard" ? 1.6 : 1.05) * (this.speedScale || 1);
    this.x += this.dir * speed;
    if (this.x < this.min || this.x > this.max) this.dir *= -1;

    if (this.type === "bat") {
      this.y = this.baseY + Math.sin(this.t * 2.2) * 22;
    } else if (this.type === "ember") {
      this.y = this.baseY + Math.sin(this.t * 2.7) * 8;
      if (Math.random() < 0.08) burst(this.x + this.w / 2, this.y + 24, 1, "#ffcf66", 1.8);
    } else {
      this.vy += G;
      this.y += this.vy;
      for (const p of activeLevel.platforms) {
        if (rects(this.rect, p)) {
          if (this.vy > 0) {
            this.y = p.y - this.h;
            this.vy = 0;
          }
        }
      }
    }

    if (this.type === "regent" && this.cooldown <= 0 && Math.abs(player.x - this.x) < 420) {
      activeLevel.projectiles.push({
        x: this.x + this.w / 2,
        y: this.y + 22,
        vx: Math.sign(player.x - this.x) * 4.2,
        vy: -1.2,
        life: 150,
      });
      this.cooldown = 86;
      playTone("orb");
    }

    const attack = player.attackBox();
    if (attack && rects(attack, this.rect)) {
      this.hit();
    } else if (player.invincible <= 0 && rects(player.rect, this.rect)) {
      if (player.vy > 3 && player.y + player.h < this.y + 16) {
        player.vy = -9.2;
        this.hit();
      } else {
        player.damage(1, player.x < this.x ? -1 : 1);
      }
    }
  }

  hit() {
    if (this.dead) return;
    let damage = 1 + skillLevel("blade") * 0.35;
    if (hasRelic("thornbreaker") && ["imp", "guard", "regent"].includes(this.type)) damage += 0.75;
    if (hasRelic("crownSpark") && run?.sparkReady) {
      damage += 2.5;
      run.sparkReady = false;
      burst(this.x + this.w / 2, this.y + this.h / 2, 34, "#ffe07a", 4);
    }
    this.hp -= damage;
    this.x += player.dir * 12;
    camera.shake = Math.max(camera.shake, 4);
    burst(this.x + this.w / 2, this.y + this.h / 2, 18, this.type === "regent" ? "#a6e6d6" : "#f0c45b", 2.4);
    playTone("hit");
    if (this.hp <= 0) {
      this.dead = true;
      if (this.type === "regent") {
        showToast("The Thorn Regent drops the Lantern's shadow cage.");
        if (!run?.active) activeLevel.exit.open = true;
      }
      if (run?.active) run.kills++;
      if (hasRelic("duelistRibbon") && run?.kills > 0 && run.kills % 5 === 0 && player.hp < player.maxHp) {
        player.hp++;
        showToast("Duelist Ribbon restores a heart.");
        updateHud();
      }
      for (let i = 0; i < 3; i++) activeLevel.pickups.push(makePickup(this.x + i * 15, this.y + 5, true));
    }
  }
}

function makePickup(x, y, bonus = false) {
  return { x, y, w: 22, h: 22, taken: false, bonus, spin: Math.random() * Math.PI * 2 };
}

function defaultSave() {
  return { sigils: 0, skills: {}, bestRoom: 0, runs: 0, wins: 0 };
}

function loadSave() {
  try {
    save = { ...defaultSave(), ...JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") };
  } catch {
    save = defaultSave();
  }
  for (const skill of SKILLS) {
    save.skills[skill.id] = clamp(save.skills[skill.id] || 0, 0, skill.max);
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function skillLevel(id) {
  return save?.skills?.[id] || 0;
}

function hasRelic(id) {
  return !!run?.relics?.some((r) => r.id === id);
}

function startRun() {
  unlockAudio();
  menuPanel.classList.add("hidden");
  setOverlayMode(null);
  const firstRelic = pickRelics(3);
  run = {
    active: true,
    room: 0,
    maxRooms: ROOM_KINDS.length,
    moon: 0,
    sigilsEarned: 0,
    relics: [],
    kills: 0,
    openedChest: false,
    bought: false,
    fountainUsed: false,
    roomShield: false,
    sparkReady: false,
    revived: false,
    startedAt: performance.now(),
  };
  totalShards = skillLevel("pockets") * 4;
  totalRelics = 0;
  chooseRelic(firstRelic, "Starting Relic", "Choose Oscar's first advantage for this Lantern Run.", () => {
    loadRogueRoom(0);
    state = "playing";
  });
}

function loadRogueRoom(roomNumber) {
  const level = generateRogueLevel(roomNumber);
  activeLevel = level;
  levelIndex = level.biomeIndex;
  player = new Player(activeLevel.spawn.x, activeLevel.spawn.y);
  applyRunStats();
  if (hasRelic("roseCloak")) run.roomShield = true;
  camera.x = 0;
  camera.y = 0;
  showToast(`${activeLevel.name}: ${activeLevel.subtitle}`);
  updateHud();
}

function applyRunStats() {
  if (!player) return;
  player.maxHp = 5 + (skillLevel("guard") >= 1 ? 1 : 0) + (skillLevel("guard") >= 3 ? 1 : 0);
  if (hasRelic("lionHeart")) player.maxHp += 1;
  player.hp = Math.min(player.hp || player.maxHp, player.maxHp);
}

function generateRogueLevel(roomNumber) {
  const kind = ROOM_KINDS[roomNumber] || "combat";
  const biomeIndex = Math.min(3, Math.floor(roomNumber / 8));
  const source = LEVELS[biomeIndex];
  const safeRoom = ["shop", "fountain", "treasure", "altar"].includes(kind);
  const width = kind === "boss" || kind === "miniboss" || kind === "elite" ? 2050 : safeRoom ? 1450 : 1850 + (roomNumber % 2) * 220;
  const theme = source.palette;
  const groundY = theme === "observatory" ? 432 : theme === "ember" ? 440 : 438;
  const platforms = [
    { x: 0, y: groundY, w: 410, h: 122 },
    { x: 510, y: groundY + 10, w: 260, h: 112 },
    { x: 870, y: groundY - 22, w: 300, h: 144 },
    { x: 1270, y: groundY + 4, w: width - 1270, h: 118 },
  ];
  const floaters = [
    { x: 265, y: 318 - (roomNumber % 2) * 16, w: 132, h: 24, trim: theme === "briar" ? "wood" : "stone" },
    { x: 610, y: 282 + (roomNumber % 3) * 12, w: 140, h: 24, trim: theme === "briar" ? "wood" : "stone" },
    { x: 995, y: 304 - (roomNumber % 2) * 18, w: 150, h: 24, trim: roomNumber % 2 ? "wood" : "stone" },
    { x: 1340, y: 284, w: 138, h: 24, trim: theme === "gate" || theme === "briar" ? "wood" : "stone" },
  ].filter((p) => p.x + p.w < width - 110);
  platforms.push(...floaters);

  if (kind === "parkour" || kind === "challenge") {
    platforms.push(
      { x: 420, y: 242, w: 92, h: 22, trim: theme === "briar" ? "wood" : "stone" },
      { x: 790, y: 226, w: 92, h: 22, trim: "stone" },
      { x: 1160, y: 246, w: 96, h: 22, trim: theme === "gate" ? "wood" : "stone" },
      { x: 1530, y: 236, w: 92, h: 22, trim: "stone" },
    );
  }

  const hazards = [];
  if (!safeRoom) {
    const hazardType = theme === "ember" ? "lava" : theme === "observatory" ? "void" : roomNumber % 2 ? "pit" : "bramble";
    hazards.push({ x: 430, y: groundY + 38, w: 72, h: 54, type: hazardType });
    hazards.push({ x: 1180, y: groundY + 38, w: 82, h: 54, type: hazardType });
    if (["parkour", "challenge", "gauntlet", "boss"].includes(kind)) hazards.push({ x: 780, y: groundY + 38, w: 78, h: 54, type: hazardType });
    if (["gauntlet", "boss"].includes(kind)) hazards.push({ x: 1510, y: groundY + 38, w: 84, h: 54, type: hazardType });
  }

  const pickups = [];
  for (let i = 0; i < 8; i++) {
    const p = floaters[i % floaters.length] || platforms[0];
    pickups.push({ x: p.x + 30 + (i % 3) * 34, y: p.y - 42 - (i % 2) * 12 });
  }

  const enemies = [];
  if (kind === "combat" || kind === "challenge" || kind === "gauntlet") {
    enemies.push({ type: roomNumber > 4 ? "guard" : "imp", x: 620, y: groundY - 42, min: 520, max: 760 });
    enemies.push({ type: roomNumber > 2 ? "bat" : "imp", x: 1020, y: 250, min: 890, max: 1160 });
    if (roomNumber > 5) enemies.push({ type: theme === "ember" ? "ember" : "guard", x: 1430, y: groundY - 44, min: 1320, max: width - 190 });
    if (kind === "gauntlet") {
      enemies.push({ type: "bat", x: 710, y: 220, min: 540, max: 850 });
      enemies.push({ type: roomNumber > 16 ? "regent" : "guard", x: width - 420, y: groundY - 52, min: width - 560, max: width - 210 });
    }
  }
  if (kind === "elite") {
    enemies.push({ type: "regent", x: width - 400, y: groundY - 72, min: width - 560, max: width - 190 });
    enemies.push({ type: theme === "ember" ? "ember" : "guard", x: 900, y: groundY - 48, min: 720, max: 1120 });
  }
  if (kind === "miniboss") {
    enemies.push({ type: roomNumber > 8 ? "regent" : "guard", x: width - 360, y: groundY - 68, min: width - 520, max: width - 180 });
    enemies.push({ type: "bat", x: width - 720, y: 230, min: width - 820, max: width - 540 });
  }
  if (kind === "boss") {
    enemies.push({ type: "regent", x: width - 350, y: groundY - 72, min: width - 500, max: width - 170 });
    enemies.push({ type: "bat", x: width - 650, y: 240, min: width - 780, max: width - 520 });
  }

  const interactables = [];
  if (kind === "treasure") interactables.push({ type: "chest", x: 835, y: groundY - 58, w: 52, h: 48, used: false });
  if (kind === "shop") {
    interactables.push({ type: "shop", x: 760, y: groundY - 72, w: 62, h: 66, used: false });
    pickups.push({ x: 630, y: groundY - 90 }, { x: 940, y: groundY - 90 });
  }
  if (kind === "fountain") interactables.push({ type: "fountain", x: 800, y: groundY - 76, w: 70, h: 70, used: false });
  if (kind === "altar") interactables.push({ type: "altar", x: 800, y: groundY - 82, w: 72, h: 76, used: false });

  return {
    name: `${source.name} ${roomNumber + 1}/${run?.maxRooms || 12}`,
    subtitle: roomSubtitle(kind, roomNumber),
    palette: PALETTES[theme],
    theme,
    roomKind: kind,
    biomeIndex,
    width,
    spawn: { x: 80, y: groundY - 74 },
    exit: { x: width - 112, y: groundY - 132, w: 78, h: 132, open: safeRoom || kind === "parkour" },
    platforms,
    hazards,
    pickups: pickups.map((p) => makePickup(p.x, p.y)),
    relics: [],
    enemies: enemies.map((e) => {
      const enemy = new Enemy(e);
      enemy.hp += Math.floor(roomNumber / 6) + (kind === "challenge" ? 1 : 0);
      enemy.speedScale = 1 + roomNumber * 0.012;
      return enemy;
    }),
    projectiles: [],
    checkpoints: [],
    interactables,
    roomRewarded: false,
  };
}

function roomSubtitle(kind, roomNumber) {
  const map = {
    combat: "Clear the room to open the gate.",
    parkour: "A dangerous crossing. Reach the far gate cleanly.",
    challenge: "A harder room. Better rewards.",
    gauntlet: "A long room packed with enemies and hazards.",
    elite: "An elite champion carries extra Sigils.",
    miniboss: "A knight of thorns guards the road.",
    treasure: "A moon chest waits quietly.",
    shop: "Spend moon shards before the road turns mean.",
    fountain: "The old fountain remembers your wounds.",
    altar: "Trade blood or shards for a dangerous blessing.",
    boss: "Survive the Thorn Regent's ambush.",
  };
  return map[kind] || `Room ${roomNumber + 1}`;
}

function nextRogueRoom() {
  run.room++;
  run.openedChest = false;
  run.bought = false;
  run.fountainUsed = false;
  if (run.room >= run.maxRooms) {
    finishRun(true);
    return;
  }
  if (run.room % 3 === 0) {
    chooseRelic(pickRelics(3), "Relic Gate", "The Lantern offers a new rule for the rest of this run.", () => {
      loadRogueRoom(run.room);
      state = "playing";
    });
  } else {
    loadRogueRoom(run.room);
  }
}

function finishRun(won) {
  const roomBonus = Math.max(1, run.room + (won ? 4 : 0));
  const earned = run.sigilsEarned + roomBonus + Math.floor(totalShards / 12);
  save.sigils += earned;
  save.runs++;
  if (won) save.wins++;
  save.bestRoom = Math.max(save.bestRoom || 0, run.room + 1);
  saveGame();
  state = "summary";
  menuPanel.classList.remove("hidden");
  setOverlayMode("menu");
  menuPanel.querySelector(".kicker").textContent = won ? "Run complete" : "Run ended";
  menuPanel.querySelector("h1").textContent = won ? "The Crown Burns Bright" : "Back To Dawn";
  menuPanel.querySelector(".subtitle").textContent = `Earned ${earned} Sun Sigils. Vault: ${save.sigils}. Best room: ${save.bestRoom}.`;
  startButton.textContent = "Spend Sigils";
}

function pickRelics(count) {
  const owned = new Set(run?.relics?.map((r) => r.id) || []);
  const pool = RELICS.filter((r) => !owned.has(r.id));
  const luck = skillLevel("luck");
  const sorted = shuffle(pool).slice(0, Math.min(pool.length, count + (luck > 0 ? 1 : 0)));
  return sorted.slice(0, count);
}

function chooseRelic(options, title, text, done) {
  pendingChoice = { type: "relic", done };
  state = "choice";
  setOverlayMode("cinema");
  choiceKicker.textContent = "Relic Choice";
  choiceTitle.textContent = title;
  choiceText.textContent = text;
  choiceActions.innerHTML = "";
  for (const relic of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${relic.name}</strong><span>${relic.desc}</span>`;
    button.addEventListener("click", () => {
      run.relics.push(relic);
      totalRelics = run.relics.length;
      if (relic.id === "lionHeart" && player) {
        player.maxHp++;
        player.hp = player.maxHp;
      }
      choicePanel.classList.add("hidden");
      setOverlayMode(null);
      pendingChoice = null;
      showToast(`${relic.name} claimed.`);
      updateHud();
      done();
    });
    choiceActions.appendChild(button);
  }
  choicePanel.classList.remove("hidden");
}

function openSkillTree() {
  pendingChoice = { type: "skills" };
  state = "choice";
  setOverlayMode("cinema");
  choiceKicker.textContent = "Hall of Dawn";
  choiceTitle.textContent = `Sun Sigils: ${save.sigils}`;
  choiceText.textContent = "Buy permanent upgrades, then begin another Lantern Run.";
  choiceActions.innerHTML = "";
  const runButton = document.createElement("button");
  runButton.type = "button";
  runButton.className = "primary-choice";
  runButton.innerHTML = "<strong>Begin Lantern Run</strong><span>Enter a 30-room rogue-lite chain with relics, shops, altars, fountains, and bosses.</span>";
  runButton.addEventListener("click", () => {
    choicePanel.classList.add("hidden");
    pendingChoice = null;
    startRun();
  });
  choiceActions.appendChild(runButton);
  for (const skill of SKILLS) {
    const level = skillLevel(skill.id);
    const cost = skill.cost + level * 2;
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = level >= skill.max || save.sigils < cost;
    button.innerHTML = `<strong>${skill.branch}: ${skill.name} ${level}/${skill.max}</strong><span>${level >= skill.max ? "Mastered" : `${cost} Sigils. ${skill.desc}`}</span>`;
    button.addEventListener("click", () => {
      if (save.sigils < cost || level >= skill.max) return;
      save.sigils -= cost;
      save.skills[skill.id] = level + 1;
      saveGame();
      openSkillTree();
    });
    choiceActions.appendChild(button);
  }
  choicePanel.classList.remove("hidden");
}

function shuffle(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loadLevel(index) {
  const source = LEVELS[index];
  activeLevel = clone(source);
  activeLevel.theme = source.palette;
  activeLevel.palette = PALETTES[source.palette];
  activeLevel.pickups = source.pickups.map((p) => makePickup(p.x, p.y));
  activeLevel.relics = source.relics.map((r) => ({ ...r, w: 30, h: 34, taken: false, spin: 0 }));
  activeLevel.enemies = source.enemies.map((e) => new Enemy(e));
  activeLevel.projectiles = [];
  activeLevel.exit.open = index !== LEVELS.length - 1;
  player = new Player(activeLevel.spawn.x, activeLevel.spawn.y);
  camera.x = 0;
  camera.y = 0;
  updateHud();
  showToast(activeLevel.subtitle);
}

function startQuest() {
  unlockAudio();
  menuPanel.classList.add("hidden");
  openSkillTree();
}

function beginCutscene(frames, done) {
  state = "cutscene";
  setOverlayMode("cinema");
  cutsceneQueue = frames.slice();
  currentCutscene = { done };
  cinema.classList.remove("hidden");
  nextCutsceneFrame();
}

function nextCutsceneFrame() {
  const frame = cutsceneQueue.shift();
  if (!frame) {
    cinema.classList.add("hidden");
    setOverlayMode(null);
    const done = currentCutscene?.done;
    currentCutscene = null;
    if (done) done();
    return;
  }
  cinemaKicker.textContent = frame.kicker;
  cinemaTitle.textContent = frame.title;
  cinemaText.textContent = frame.text;
}

function completeLevel() {
  state = "cutscene";
  const frames = CUTSCENES[activeLevel.storyAfter] || [];
  const lastLevel = levelIndex >= LEVELS.length - 1;
  beginCutscene(frames, () => {
    if (lastLevel) {
      state = "victory";
      menuPanel.classList.remove("hidden");
      setOverlayMode("menu");
      menuPanel.querySelector(".kicker").textContent = "Quest complete";
      menuPanel.querySelector("h1").textContent = "The Lantern Rings";
      menuPanel.querySelector(".subtitle").textContent = `Oscar carried home ${totalShards} moon shards and woke ${totalRelics} relics.`;
      startButton.textContent = "Play Again";
    } else {
      levelIndex++;
      loadLevel(levelIndex);
      state = "playing";
    }
  });
}

function update(dt) {
  if (state !== "playing") return;
  time += dt;
  player.update(dt);

  for (const e of activeLevel.enemies) e.update(dt);
  activeLevel.enemies = activeLevel.enemies.filter((e) => !e.dead);
  updateRoomState();

  updateProjectiles();
  collectItems();
  handleInteractables();
  handleHazards();
  handleCheckpoints();
  handleExit();

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.g;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  camera.x += ((player.x + player.w / 2 - W * 0.44) - camera.x) * 0.09;
  camera.x = clamp(camera.x, 0, activeLevel.width - W);
  camera.y += ((player.y - H * 0.56) - camera.y) * 0.04;
  camera.y = clamp(camera.y, -60, 40);
  camera.shake *= 0.84;
}

function updateProjectiles() {
  for (let i = activeLevel.projectiles.length - 1; i >= 0; i--) {
    const p = activeLevel.projectiles[i];
    const nearSlow = hasRelic("starGlass") && Math.hypot(player.x + player.w / 2 - p.x, player.y + player.h / 2 - p.y) < 210;
    const speedScale = nearSlow ? 0.62 : 1;
    p.x += p.vx * speedScale;
    p.y += p.vy * speedScale;
    p.vy += 0.05;
    p.life--;
    if (Math.random() < 0.45) burst(p.x, p.y, 1, "#a6e6d6", 1.4);
    if (rects(player.rect, { x: p.x - 7, y: p.y - 7, w: 14, h: 14 })) {
      player.damage(1, p.vx > 0 ? 1 : -1);
      activeLevel.projectiles.splice(i, 1);
    } else if (p.life <= 0) {
      activeLevel.projectiles.splice(i, 1);
    }
  }
}

function collectItems() {
  for (const p of activeLevel.pickups) {
    p.spin += 0.09;
    const magnetRange = 86 + skillLevel("magnet") * 54 + (hasRelic("moonMagnet") ? 90 : 0);
    const dx = player.x + player.w / 2 - (p.x + 11);
    const dy = player.y + player.h / 2 - (p.y + 11);
    const dist = Math.hypot(dx, dy);
    if (!p.taken && dist < magnetRange) {
      p.x += (dx / Math.max(1, dist)) * (1.8 + skillLevel("magnet") * 0.55);
      p.y += (dy / Math.max(1, dist)) * (1.8 + skillLevel("magnet") * 0.55);
    }
    if (!p.taken && rects(player.rect, { x: p.x, y: p.y, w: p.w, h: p.h })) {
      p.taken = true;
      const value = 1 + (hasRelic("moonMagnet") && p.bonus ? 1 : 0);
      totalShards += value;
      if (run?.active) {
        run.moon += value;
        if (hasRelic("crownSpark") && totalShards > 0 && totalShards % 6 === 0) {
          run.sparkReady = true;
          showToast("Crown Spark charged.");
        }
      }
      burst(p.x + 11, p.y + 11, 16, "#ffe7a8", 2.3);
      playTone("pickup");
      updateHud();
    }
  }

  for (const r of activeLevel.relics) {
    r.spin += 0.035;
    if (!r.taken && rects(player.rect, { x: r.x, y: r.y, w: r.w, h: r.h })) {
      r.taken = true;
      totalRelics++;
      player.maxHp = Math.min(6, player.maxHp + 1);
      player.hp = player.maxHp;
      burst(r.x + 15, r.y + 16, 32, "#a6e6d6", 3.3);
      playTone("relic");
      showToast(r.kind === "lantern" ? "The Crown Lantern is free." : "A forgotten crest wakes in Oscar's pack.");
      updateHud();
    }
  }
}

function handleHazards() {
  for (const h of activeLevel.hazards) {
    if (rects(player.rect, h)) player.damage(h.type === "lava" ? 2 : 1, player.x < h.x ? -1 : 1);
  }
}

function handleCheckpoints() {
  for (const c of activeLevel.checkpoints) {
    if (!c.active && player.x + player.w > c.x) {
      c.active = true;
      player.spawn = { x: c.x, y: c.y - player.h };
      showToast("Banner lit.");
      burst(c.x + 14, c.y - 30, 20, "#f0c45b", 2.5);
      playTone("checkpoint");
    }
  }
}

function updateRoomState() {
  if (!run?.active || !activeLevel) return;
  if (!activeLevel.exit.open && activeLevel.enemies.length === 0) {
    activeLevel.exit.open = true;
    awardRoomClear(activeLevel.roomKind);
    const reward = roomReward(activeLevel.roomKind);
    showToast(`Gate opened. +${reward} Sun Sigil${reward > 1 ? "s" : ""}.`);
    burst(activeLevel.exit.x + 35, activeLevel.exit.y + 46, 30, activeLevel.palette.accent, 3);
  }
}

function roomReward(kind) {
  const base = kind === "challenge" ? 3 : kind === "gauntlet" ? 4 : kind === "elite" ? 5 : kind === "miniboss" ? 6 : kind === "boss" ? 12 : kind === "parkour" ? 2 : 1;
  return base + (hasRelic("silverLedger") && ["combat", "challenge", "gauntlet", "elite", "miniboss", "boss"].includes(kind) ? 1 : 0);
}

function awardRoomClear(kind) {
  if (activeLevel.roomRewarded) return 0;
  const reward = roomReward(kind);
  run.sigilsEarned += reward;
  activeLevel.roomRewarded = true;
  if (skillLevel("vitality") > 0 && ["challenge", "gauntlet", "elite", "miniboss", "boss"].includes(kind) && player.hp < player.maxHp) {
    const chance = 0.35 + skillLevel("vitality") * 0.22;
    if (Math.random() < chance) {
      player.hp++;
      updateHud();
      showToast("Stone Vow restores a heart.");
    }
  }
  return reward;
}

function handleInteractables() {
  if (!run?.active || !activeLevel?.interactables) return;
  for (const item of activeLevel.interactables) {
    if (item.used || !rects(player.rect, item)) continue;
    if (item.type === "chest") {
      item.used = true;
      run.openedChest = true;
      burst(item.x + 25, item.y + 20, 28, "#ffe07a", 3.4);
      playTone("relic");
      chooseRelic(pickRelics(3), "Moon Chest", "Choose one relic. The others fade.", () => {
        state = "playing";
      });
    } else if (item.type === "shop") {
      item.used = true;
      openShop();
    } else if (item.type === "fountain") {
      item.used = true;
      const healed = Math.max(1, Math.ceil(player.maxHp * 0.45));
      player.hp = Math.min(player.maxHp, player.hp + healed);
      run.sigilsEarned += 1;
      burst(item.x + 35, item.y + 18, 30, "#a6e6d6", 2.8);
      playTone("relic");
      showToast(`Fountain restored ${healed} heart${healed > 1 ? "s" : ""}.`);
      updateHud();
    } else if (item.type === "altar") {
      item.used = true;
      openAltar();
    }
  }
}

function openShop() {
  const discount = skillLevel("pockets") * 2;
  const options = [
    { name: "Heal", desc: "Restore 2 hearts.", cost: 8, action: () => { player.hp = Math.min(player.maxHp, player.hp + 2); } },
    { name: "Sun Sigil", desc: "Bank 3 permanent Sigils.", cost: 12, action: () => { run.sigilsEarned += 3; } },
    { name: "Relic Roll", desc: "Choose a new relic.", cost: 15, action: () => {
      chooseRelic(pickRelics(3), "Shop Relic", "A purchased relic joins this run.", () => { state = "playing"; });
      return "choice";
    } },
  ].map((opt) => ({ ...opt, cost: Math.max(4, opt.cost - discount) }));
  state = "choice";
  setOverlayMode("cinema");
  pendingChoice = { type: "shop" };
  choiceKicker.textContent = "Shop";
  choiceTitle.textContent = `Moon Shards: ${totalShards}`;
  choiceText.textContent = "Spend carefully. Shards vanish when the run ends.";
  choiceActions.innerHTML = "";
  for (const opt of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = totalShards < opt.cost;
    button.innerHTML = `<strong>${opt.name}</strong><span>${opt.desc} Cost: ${opt.cost} Moon Shards.</span>`;
    button.addEventListener("click", () => {
      if (totalShards < opt.cost) return;
      totalShards -= opt.cost;
      const result = opt.action();
      if (result === "choice") {
        updateHud();
        showToast(`${opt.name} bought.`);
        return;
      }
      choicePanel.classList.add("hidden");
      pendingChoice = null;
      setOverlayMode(null);
      state = "playing";
      updateHud();
      showToast(`${opt.name} bought.`);
    });
    choiceActions.appendChild(button);
  }
  const leave = document.createElement("button");
  leave.type = "button";
  leave.innerHTML = "<strong>Leave</strong><span>Keep your shards and move on.</span>";
  leave.addEventListener("click", () => {
    choicePanel.classList.add("hidden");
    pendingChoice = null;
    setOverlayMode(null);
    state = "playing";
  });
  choiceActions.appendChild(leave);
  choicePanel.classList.remove("hidden");
}

function openAltar() {
  state = "choice";
  setOverlayMode("cinema");
  pendingChoice = { type: "altar" };
  choiceKicker.textContent = "Thorn Altar";
  choiceTitle.textContent = "Choose A Bargain";
  choiceText.textContent = "The altar pays well, but it always takes something first.";
  choiceActions.innerHTML = "";
  const options = [
    {
      name: "Blood Oath",
      desc: "Lose 1 heart now. Choose a relic.",
      enabled: () => player.hp > 1,
      action: () => {
        player.hp--;
        chooseRelic(pickRelics(3), "Blood Oath", "The altar answers with a relic.", () => { state = "playing"; });
        return "choice";
      },
    },
    {
      name: "Shard Offering",
      desc: "Spend 10 Moon Shards. Bank 5 Sun Sigils.",
      enabled: () => totalShards >= 10,
      action: () => {
        totalShards -= 10;
        run.sigilsEarned += 5;
        showToast("The altar banks 5 Sun Sigils.");
      },
    },
    {
      name: "Quiet Prayer",
      desc: "Restore 1 heart and leave.",
      enabled: () => true,
      action: () => {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        showToast("The altar grants a small mercy.");
      },
    },
  ];
  for (const opt of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = !opt.enabled();
    button.innerHTML = `<strong>${opt.name}</strong><span>${opt.desc}</span>`;
    button.addEventListener("click", () => {
      if (!opt.enabled()) return;
      const result = opt.action();
      if (result === "choice") {
        updateHud();
        return;
      }
      choicePanel.classList.add("hidden");
      pendingChoice = null;
      setOverlayMode(null);
      state = "playing";
      updateHud();
    });
    choiceActions.appendChild(button);
  }
  choicePanel.classList.remove("hidden");
}

function handleExit() {
  const gate = activeLevel.exit;
  if (run?.active) {
    if (!gate.open) {
      if (rects(player.rect, gate)) showToast("Clear the room first.");
      return;
    }
    if (rects(player.rect, gate)) {
      if (activeLevel.roomKind === "parkour" && !activeLevel.roomRewarded) {
        const reward = awardRoomClear("parkour");
        showToast(`Crossing complete. +${reward} Sun Sigils.`);
      }
      nextRogueRoom();
    }
    return;
  }
  if (levelIndex === LEVELS.length - 1 && !gate.open) return;
  if (levelIndex === LEVELS.length - 1 && !finalLanternTaken()) return;
  if (rects(player.rect, gate)) completeLevel();
}

function finalLanternTaken() {
  return activeLevel?.relics?.some((r) => r.kind === "lantern" && r.taken);
}

function render() {
  const shakeX = (Math.random() - 0.5) * camera.shake;
  const shakeY = (Math.random() - 0.5) * camera.shake;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(activeLevel || { palette: PALETTES.gate, width: W }, state === "menu" ? 0 : camera.x);
  if (activeLevel) {
    ctx.translate(Math.round(-camera.x + shakeX), Math.round(-camera.y + shakeY));
    drawWorld();
    ctx.restore();
    drawVignette();
    drawRunOverlay();
    if (state === "paused") drawPauseOverlay();
  } else {
    drawTitleOscar();
    ctx.restore();
  }
}

function drawRunOverlay() {
  if (!run?.active || !activeLevel) return;
  ctx.save();
  const x = 18;
  const y = H - 44;
  const w = 278;
  const h = 24;
  ctx.fillStyle = "rgba(31, 22, 31, 0.58)";
  roundRect(x, y, w, h, 7);
  ctx.fill();
  const progress = clamp((run.room + 1) / run.maxRooms, 0, 1);
  const fill = ctx.createLinearGradient(x, 0, x + w, 0);
  fill.addColorStop(0, "#f0c45b");
  fill.addColorStop(1, "#a6e6d6");
  ctx.fillStyle = fill;
  roundRect(x + 3, y + 3, (w - 6) * progress, h - 6, 5);
  ctx.fill();
  ctx.fillStyle = "#fff4d6";
  ctx.font = "800 11px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Run ${(save?.runs || 0) + 1} · Room ${run.room + 1}/${run.maxRooms} · ${run.relics.map((r) => r.name).slice(0, 2).join(", ") || "No relics"}`, x + 10, y + 12);
  ctx.restore();
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(15, 10, 20, 0.48)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffeebf";
  ctx.font = "800 64px Georgia";
  ctx.fillText("Paused", W / 2, H / 2 - 18);
  ctx.font = "800 16px Trebuchet MS";
  ctx.fillText("Press P or Esc to resume", W / 2, H / 2 + 22);
  ctx.restore();
}

function drawBackground(level, camX) {
  const p = level.palette;
  if (drawPaintedBackdrop(level, camX, p)) return;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(0.5, p.skyMid);
  sky.addColorStop(1, p.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 38; i++) {
    const x = (i * 173 - camX * 0.08) % (W + 180) - 90;
    const y = 42 + ((i * 97) % 138);
    star(x, y, 1.2 + (i % 4) * 0.55, i % 3 === 0 ? "#fff4d6" : "#a6e6d6");
  }
  ctx.globalAlpha = 1;

  drawSunMoon(736 - camX * 0.04, 92, p.accent);
  drawMountainLayer(camX * 0.16, 306, p.far, 0.58, 150);
  drawMountainLayer(camX * 0.28, 362, p.mid, 0.72, 118);
  drawForestLayer(camX * 0.42, 405, p.near);

  ctx.fillStyle = "rgba(18, 18, 24, 0.22)";
  ctx.fillRect(0, 446, W, 94);
}

function drawPaintedBackdrop(level, camX, palette) {
  const theme = level.theme || "gate";
  const img = backdrops[theme];
  if (!img?.ready) return false;

  const progress = level.width > W ? clamp(camX / (level.width - W), 0, 1) : 0;
  const zoom = theme === "observatory" ? 1.1 : 1.08;
  const dw = W * zoom;
  const dh = H * zoom;
  const dx = -progress * (dw - W);
  const dy = theme === "ember" ? -26 : theme === "observatory" ? -24 : -18;
  ctx.drawImage(img, dx, dy, dw, dh);

  drawBackdropGrade(theme, palette);
  drawDistantParallax(theme, camX, palette);
  drawAmbientMotes(theme, camX, palette);
  drawLowerReadabilityWash(theme);
  return true;
}

function drawBackdropGrade(theme, palette) {
  ctx.save();
  const top = ctx.createLinearGradient(0, 0, 0, H);
  if (theme === "ember") {
    top.addColorStop(0, "rgba(48, 20, 42, 0.16)");
    top.addColorStop(0.55, "rgba(89, 26, 20, 0.02)");
    top.addColorStop(1, "rgba(23, 10, 13, 0.44)");
  } else if (theme === "observatory") {
    top.addColorStop(0, "rgba(8, 19, 45, 0.08)");
    top.addColorStop(0.58, "rgba(21, 59, 89, 0.02)");
    top.addColorStop(1, "rgba(8, 12, 24, 0.38)");
  } else {
    top.addColorStop(0, "rgba(19, 25, 37, 0.1)");
    top.addColorStop(0.58, "rgba(19, 25, 37, 0.0)");
    top.addColorStop(1, "rgba(18, 16, 18, 0.36)");
  }
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawDistantParallax(theme, camX, palette) {
  ctx.save();
  if (theme === "ember") {
    ctx.strokeStyle = "rgba(35, 18, 18, 0.46)";
    ctx.lineWidth = 6;
    for (let x = -160; x < W + 180; x += 210) {
      const px = x - (camX * 0.05) % 210;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.bezierCurveTo(px + 40, 90, px - 20, 180, px + 70, 280);
      ctx.stroke();
    }
  } else if (theme === "observatory") {
    ctx.strokeStyle = "rgba(166, 230, 214, 0.16)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = 290 + i * 160 - (camX * 0.035) % 80;
      ctx.beginPath();
      ctx.ellipse(x, 104 + i * 22, 64 + i * 12, 20 + i * 5, -0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = theme === "briar" ? 0.18 : 0.22;
    drawForestLayer(camX * 0.24, theme === "briar" ? 430 : 418, palette.near);
  }
  ctx.restore();
}

function drawAmbientMotes(theme, camX, palette) {
  ctx.save();
  const count = theme === "observatory" ? 70 : theme === "ember" ? 52 : 42;
  for (let i = 0; i < count; i++) {
    const speed = theme === "ember" ? 0.09 : 0.035;
    const x = (i * 137 - camX * 0.04 + time * speed * (i % 5 + 1)) % (W + 80) - 40;
    const yBase = theme === "ember" ? 70 : 48;
    const y = yBase + ((i * 83) % 390) + Math.sin(time * 0.0015 + i) * 8;
    const r = theme === "observatory" ? 1 + (i % 3) * 0.55 : 1.2 + (i % 4) * 0.45;
    ctx.globalAlpha = theme === "ember" ? 0.24 + (i % 3) * 0.08 : 0.12 + (i % 4) * 0.05;
    ctx.fillStyle = theme === "ember" ? "#ffb15a" : i % 4 === 0 ? palette.accent : "#fff4d6";
    if (theme === "observatory") {
      star(x, y, r, ctx.fillStyle);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLowerReadabilityWash(theme) {
  ctx.save();
  const wash = ctx.createLinearGradient(0, H * 0.5, 0, H);
  wash.addColorStop(0, "rgba(0, 0, 0, 0)");
  wash.addColorStop(0.56, theme === "ember" ? "rgba(17, 9, 12, 0.12)" : "rgba(8, 15, 18, 0.10)");
  wash.addColorStop(1, theme === "ember" ? "rgba(16, 8, 10, 0.46)" : "rgba(8, 14, 16, 0.42)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = theme === "observatory" ? 0.12 : 0.08;
  ctx.fillStyle = "#fff4d6";
  for (let y = 384; y < H; y += 18) {
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

function drawWorld() {
  drawBackDressing();
  for (const h of activeLevel.hazards) drawHazard(h);
  for (const p of activeLevel.platforms) drawPlatform(p);
  drawPlatformDressing();
  for (const c of activeLevel.checkpoints) drawCheckpoint(c);
  drawExit(activeLevel.exit);
  drawInteractables();
  for (const item of activeLevel.pickups) if (!item.taken) drawShard(item);
  for (const relic of activeLevel.relics) if (!relic.taken) drawRelic(relic);
  for (const e of activeLevel.enemies) if (!e.dead) drawEnemy(e);
  for (const p of activeLevel.projectiles) drawOrb(p);
  drawPlayer(player);
  drawParticles();
}

function drawPlatform(p) {
  if (envReady) {
    drawPaintedPlatform(p);
    return;
  }
  const palette = activeLevel.palette;
  const theme = activeLevel.theme;
  ctx.save();
  roundRect(p.x, p.y, p.w, p.h, 6);
  const grad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  grad.addColorStop(0, p.trim === "wood" ? "#9a7048" : palette.earth);
  grad.addColorStop(0.52, theme === "observatory" ? "#32374c" : theme === "ember" ? "#43272a" : "#3f332c");
  grad.addColorStop(1, palette.earthDark);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,244,214,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowColor = theme === "ember" ? "rgba(255, 129, 48, 0.34)" : "rgba(255, 244, 214, 0.14)";
  ctx.shadowBlur = theme === "ember" ? 10 : 4;
  ctx.fillStyle = p.trim === "wood" ? "#c88a53" : palette.grass;
  roundRect(p.x - 2, p.y - 8, p.w + 4, 14, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  drawPlatformFaceTexture(p, theme);
  drawPlatformTopLife(p, theme, palette);

  ctx.fillStyle = theme === "ember" ? "rgba(255, 178, 82, 0.16)" : "rgba(255, 244, 214, 0.14)";
  for (let x = p.x + 8; x < p.x + p.w - 8; x += 26) {
    const h = 5 + ((x * 13) % 9);
    ctx.beginPath();
    ctx.moveTo(x, p.y - 4);
    ctx.lineTo(x + 5, p.y - 4 - h);
    ctx.lineTo(x + 10, p.y - 4);
    ctx.fill();
  }

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "rgba(255,244,214,0.22)";
  ctx.lineWidth = 1;
  for (let y = p.y + 24; y < p.y + p.h - 10; y += 32) {
    ctx.beginPath();
    for (let x = p.x + 12; x < p.x + p.w - 10; x += 64) {
      ctx.moveTo(x + ((y / 3) % 24), y);
      ctx.lineTo(Math.min(p.x + p.w - 12, x + 34 + ((y / 3) % 24)), y + ((x / 5) % 5) - 2);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = theme === "observatory" ? "#a6e6d6" : "#fff4d6";
  for (let x = p.x + 12; x < p.x + p.w - 12; x += 52) {
    ctx.fillRect(x, p.y + 22 + ((x / 7) % 26), 22, 3);
  }
  ctx.restore();
}

function drawPaintedPlatform(p) {
  const theme = activeLevel.theme;
  const frame = platformFrameFor(p, theme);
  const visual = platformVisualBox(p, theme, frame);
  ctx.save();
  drawEnvSprite(frame, visual.x, visual.y, visual.w, visual.h);
  drawPlatformTopLife(p, theme, activeLevel.palette);
  ctx.restore();
}

function platformFrameFor(p, theme) {
  if (p.trim === "wood") return p.w > 145 ? ENV.woodLong : ENV.woodMid;
  if (theme === "ember") return p.w > 150 ? ENV.emberLong : p.w > 80 ? ENV.emberMid : ENV.emberSmall;
  if (theme === "observatory") return p.w > 150 ? ENV.obsLong : p.w > 85 ? ENV.obsSmall : ENV.obsMid;
  if (p.w > 220) return ENV.mossLong;
  if (p.w > 130) return ENV.mossMid;
  return p.h > 70 ? ENV.mossPillar : ENV.mossSmall;
}

function platformVisualBox(p, theme, frame) {
  const isGround = p.h > 60;
  const overhang = isGround ? 7 : 11;
  const topLift = p.trim === "wood" ? 18 : theme === "observatory" ? 18 : 20;
  const h = isGround ? Math.min(128, p.h + 36) : theme === "observatory" ? 70 : p.trim === "wood" ? 62 : 68;
  return {
    x: p.x - overhang,
    y: p.y - topLift,
    w: p.w + overhang * 2,
    h,
  };
}

function drawPlatformFaceTexture(p, theme) {
  ctx.save();
  ctx.beginPath();
  roundRect(p.x, p.y, p.w, p.h, 6);
  ctx.clip();

  if (theme === "ember") {
    ctx.strokeStyle = "rgba(255, 150, 61, 0.12)";
    ctx.lineWidth = 2;
    for (let x = p.x + 28; x < p.x + p.w; x += 78) {
      ctx.beginPath();
      ctx.moveTo(x, p.y + 16);
      ctx.lineTo(x + 18, p.y + 42);
      ctx.lineTo(x + 5, p.y + 70);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 184, 83, 0.18)";
    for (let x = p.x + 36; x < p.x + p.w - 20; x += 96) {
      ctx.beginPath();
      ctx.arc(x, p.y + p.h - 18 - ((x / 11) % 22), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === "observatory") {
    ctx.strokeStyle = "rgba(166, 230, 214, 0.16)";
    ctx.lineWidth = 1.5;
    for (let x = p.x + 30; x < p.x + p.w - 24; x += 92) {
      ctx.beginPath();
      ctx.arc(x, p.y + 40, 10, 0, Math.PI * 2);
      ctx.moveTo(x - 16, p.y + 40);
      ctx.lineTo(x + 16, p.y + 40);
      ctx.moveTo(x, p.y + 24);
      ctx.lineTo(x, p.y + 56);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "rgba(30, 18, 20, 0.16)";
    for (let x = p.x + 20; x < p.x + p.w; x += 44) {
      const w = 18 + ((x / 9) % 18);
      ctx.fillRect(x, p.y + p.h - 18 - ((x / 13) % 34), w, 4);
    }
  }
  ctx.restore();
}

function drawPlatformTopLife(p, theme, palette) {
  ctx.save();
  const topY = p.y - 9;
  if (theme === "ember") {
    ctx.fillStyle = "rgba(255, 222, 123, 0.26)";
    for (let x = p.x + 18; x < p.x + p.w - 14; x += 58) {
      const flicker = Math.sin(time * 0.012 + x) * 4;
      ctx.beginPath();
      ctx.moveTo(x, topY + 10);
      ctx.quadraticCurveTo(x + 4, topY - 5 - flicker, x + 10, topY + 10);
      ctx.fill();
    }
  } else if (theme === "observatory") {
    ctx.strokeStyle = "rgba(255, 244, 214, 0.22)";
    ctx.lineWidth = 1;
    for (let x = p.x + 18; x < p.x + p.w - 20; x += 72) {
      star(x, topY + 5, 4, "#a6e6d6");
    }
  } else {
    ctx.fillStyle = "rgba(255, 244, 214, 0.24)";
    for (let x = p.x + 20; x < p.x + p.w - 22; x += theme === "briar" ? 48 : 70) {
      ctx.beginPath();
      ctx.moveTo(x, topY + 9);
      ctx.lineTo(x + 4, topY - 5);
      ctx.lineTo(x + 8, topY + 9);
      ctx.fill();

      if (theme === "briar" && x % 2 < 1) {
        ctx.fillStyle = "#d4586a";
        ctx.beginPath();
        ctx.arc(x + 14, topY + 2, 3, 0, Math.PI * 2);
        ctx.arc(x + 19, topY + 1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 244, 214, 0.24)";
      } else if (theme === "gate") {
        ctx.fillStyle = palette.accent;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.arc(x + 12, topY + 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(255, 244, 214, 0.24)";
      }
    }
  }
  ctx.restore();
}

function drawHazard(h) {
  if (envReady) {
    drawPaintedHazard(h);
    return;
  }
  ctx.save();
  if (h.type === "lava") {
    const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
    g.addColorStop(0, "#ffcf66");
    g.addColorStop(0.45, "#e87932");
    g.addColorStop(1, "#6b1d2d");
    ctx.fillStyle = g;
    roundRect(h.x, h.y, h.w, h.h, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,244,214,0.5)";
    for (let x = h.x + 8; x < h.x + h.w; x += 22) {
      ctx.beginPath();
      ctx.arc(x, h.y + 14 + Math.sin(time * 0.01 + x) * 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (h.type === "void" || h.type === "pit") {
    ctx.fillStyle = h.type === "void" ? "#111726" : "#201a23";
    roundRect(h.x, h.y, h.w, h.h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(166,230,214,0.26)";
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#2f3328";
    ctx.lineWidth = 4;
    for (let x = h.x + 8; x < h.x + h.w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, h.y + h.h);
      ctx.lineTo(x + 8, h.y + 8);
      ctx.lineTo(x + 16, h.y + h.h);
      ctx.stroke();
    }
    ctx.fillStyle = "#d4586a";
    for (let x = h.x + 11; x < h.x + h.w; x += 28) {
      ctx.beginPath();
      ctx.arc(x, h.y + 22, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPaintedHazard(h) {
  ctx.save();
  if (h.type === "lava") {
    const frame = h.w > 88 ? ENV.lavaVentA : ENV.lavaSplash;
    drawEnvSprite(frame, h.x - 9, h.y - 76 + Math.sin(time * 0.012 + h.x) * 2, h.w + 18, h.h + 90, false, {
      glow: "#ff9d38",
      blur: 24,
    });
  } else if (h.type === "void" || h.type === "pit") {
    drawEnvSprite(h.w > 76 ? ENV.spikesA : ENV.spikesB, h.x - 8, h.y - 22, h.w + 16, h.h + 26, false, {
      glow: h.type === "void" ? "#a6e6d6" : null,
      blur: h.type === "void" ? 10 : 0,
    });
    if (h.type === "void") {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = "#111726";
      roundRect(h.x, h.y + 12, h.w, h.h - 12, 8);
      ctx.fill();
    }
  } else {
    const frame = h.w > 80 ? ENV.brambleB : ENV.brambleA;
    drawEnvSprite(frame, h.x - 18, h.y - 54, h.w + 36, h.h + 62);
  }
  ctx.restore();
}

function drawCheckpoint(c) {
  if (envReady) {
    const frame = activeLevel.theme === "observatory" ? ENV.bannerBlue : c.active ? ENV.bannerRed : ENV.bannerTorn;
    drawEnvSprite(frame, c.x - 20, c.y - 96, 48, 94, false, {
      glow: c.active ? activeLevel.palette.accent : null,
      blur: c.active ? 12 : 0,
    });
    if (c.active) {
      burst(c.x + 6, c.y - 76, 1, activeLevel.palette.accent, 0.7);
    }
    return;
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.fillStyle = "#402b2e";
  ctx.fillRect(0, -70, 8, 70);
  ctx.fillStyle = c.active ? "#f0c45b" : "#8b6870";
  ctx.beginPath();
  ctx.moveTo(8, -68);
  ctx.lineTo(48, -56);
  ctx.lineTo(8, -42);
  ctx.closePath();
  ctx.fill();
  if (c.active) {
    ctx.globalAlpha = 0.5 + Math.sin(time * 0.012) * 0.2;
    ctx.fillStyle = "#ffe7a8";
    ctx.beginPath();
    ctx.arc(8, -72, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawExit(gate) {
  if (envReady) {
    drawPaintedExit(gate);
    return;
  }
  ctx.save();
  ctx.translate(gate.x, gate.y);
  const open = gate.open !== false;
  ctx.fillStyle = "#221725";
  roundRect(0, 0, gate.w, gate.h, 8);
  ctx.fill();
  ctx.strokeStyle = open ? "#f0c45b" : "#6b3330";
  ctx.lineWidth = 6;
  roundRect(8, 8, gate.w - 16, gate.h - 8, 6);
  ctx.stroke();
  ctx.fillStyle = open ? "rgba(240,196,91,0.22)" : "rgba(17,23,38,0.72)";
  roundRect(16, 18, gate.w - 32, gate.h - 28, 8);
  ctx.fill();
  if (open) {
    ctx.globalAlpha = 0.65 + Math.sin(time * 0.01) * 0.22;
    ctx.fillStyle = "#fff4d6";
    ctx.beginPath();
    ctx.arc(gate.w / 2, 32, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPaintedExit(gate) {
  const theme = activeLevel.theme;
  const frame = theme === "briar" ? ENV.doorBriar : theme === "ember" ? ENV.doorEmber : theme === "observatory" ? ENV.doorObservatory : ENV.doorGate;
  const open = gate.open !== false;
  const w = theme === "observatory" ? 104 : 100;
  const h = theme === "observatory" ? 134 : 128;
  ctx.save();
  drawEnvSprite(frame, gate.x - 15, gate.y - 4, w, h, false, {
    glow: open ? activeLevel.palette.accent : null,
    blur: open ? 16 : 0,
  });
  if (open) {
    ctx.globalAlpha = 0.26 + Math.sin(time * 0.01) * 0.08;
    ctx.fillStyle = theme === "observatory" ? "#a6e6d6" : "#ffe7a8";
    roundRect(gate.x + 19, gate.y + 28, gate.w - 36, gate.h - 44, 9);
    ctx.fill();
  }
  ctx.restore();
}

function drawInteractables() {
  if (!activeLevel?.interactables) return;
  for (const item of activeLevel.interactables) {
    ctx.save();
    if (envReady) {
      if (item.type === "chest") {
        drawEnvSprite(item.used ? ENV.crateA : ENV.crateB, item.x - 8, item.y - 6, 66, 54, false, {
          glow: item.used ? null : "#ffe07a",
          blur: item.used ? 0 : 10,
        });
      } else if (item.type === "shop") {
        drawEnvSprite(ENV.lanternGold, item.x - 6, item.y - 42, 56, 88, false, { glow: "#f0c45b", blur: 16 });
        drawEnvSprite(ENV.barrel, item.x + 36, item.y + 12, 38, 40);
      } else if (item.type === "fountain") {
        drawEnvSprite(ENV.lanternBlue, item.x + 4, item.y - 32, 58, 94, false, { glow: "#a6e6d6", blur: 18 });
        ctx.globalAlpha = 0.6 + Math.sin(time * 0.012) * 0.16;
        ctx.fillStyle = "#a6e6d6";
        ctx.beginPath();
        ctx.arc(item.x + 34, item.y + 24, 18, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === "altar") {
        drawEnvSprite(ENV.doorBriar, item.x - 12, item.y - 34, 92, 116, false, { glow: "#d4586a", blur: 14 });
        drawEnvSprite(ENV.lanternGold, item.x + 14, item.y - 42, 42, 68, false, { glow: "#f0c45b", blur: 12 });
      }
    } else {
      ctx.fillStyle = item.type === "fountain" ? "#a6e6d6" : item.type === "shop" ? "#f0c45b" : "#9b6a3c";
      roundRect(item.x, item.y, item.w, item.h, 8);
      ctx.fill();
    }
    if (!item.used && rects(player?.rect || { x: -999, y: -999, w: 0, h: 0 }, item)) {
      drawWorldLabel(item.x + item.w / 2, item.y - 18, item.type === "shop" ? "Shop" : item.type === "fountain" ? "Heal" : item.type === "altar" ? "Pray" : "Open");
    }
    ctx.restore();
  }
}

function drawWorldLabel(x, y, text) {
  ctx.save();
  ctx.font = "800 12px Trebuchet MS";
  const width = ctx.measureText(text).width + 18;
  ctx.fillStyle = "rgba(31, 22, 31, 0.84)";
  roundRect(x - width / 2, y - 18, width, 24, 7);
  ctx.fill();
  ctx.fillStyle = "#ffe7a8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y - 6);
  ctx.restore();
}

function drawBackDressing() {
  if (!envReady || !activeLevel) return;
  const theme = activeLevel.theme;
  ctx.save();
  if (theme === "ember") {
    for (let x = 420; x < activeLevel.width; x += 620) {
      drawEnvSprite(ENV.chainLong, x, 70 + ((x / 17) % 36), 34, 96);
    }
  } else if (theme === "observatory") {
    for (let x = 300; x < activeLevel.width; x += 740) {
      drawEnvSprite(ENV.lanternBlue, x, 292, 42, 66, false, { glow: "#a6e6d6", blur: 18 });
    }
  } else if (theme === "briar") {
    for (let x = 250; x < activeLevel.width; x += 520) {
      drawEnvSprite(ENV.vineB, x, 90 + ((x / 19) % 70), 46, 96);
    }
  } else {
    for (let x = 380; x < activeLevel.width; x += 760) {
      drawEnvSprite(ENV.lanternGold, x, 294, 40, 64, false, { glow: "#f0c45b", blur: 16 });
    }
  }
  ctx.restore();
}

function drawPlatformDressing() {
  if (!envReady || !activeLevel) return;
  const theme = activeLevel.theme;
  ctx.save();
  for (const p of activeLevel.platforms) {
    if (p.h < 60 || p.w < 180) continue;
    const seed = Math.floor(p.x / 37) % 5;
    if (theme === "ember") {
      if (seed % 2 === 0) drawEnvSprite(ENV.chainU, p.x + p.w - 154, p.y - 88, 112, 62);
    } else if (theme === "observatory") {
      if (seed % 2 === 0) drawEnvSprite(ENV.rockD, p.x + p.w - 120, p.y - 66, 88, 56);
    } else if (theme === "briar") {
      drawEnvSprite(seed % 2 ? ENV.rockB : ENV.rockA, p.x + p.w - 118, p.y - 58, 90, 52);
    } else {
      if (seed % 2 === 0) drawEnvSprite(ENV.crateA, p.x + p.w - 92, p.y - 62, 54, 48);
    }
  }
  ctx.restore();
}

function drawShard(item) {
  if (atlasReady) {
    const frames = [SPRITES.shardA, SPRITES.shardB, SPRITES.shardC, SPRITES.shardD];
    const frame = frames[Math.floor((time * 0.006 + item.spin) % frames.length)];
    drawAtlasSprite(frame, item.x - 9, item.y - 13 + Math.sin(time * 0.01 + item.x) * 4, 42, 42, false, {
      glow: item.bonus ? "#a6e6d6" : "#ffe07a",
      blur: 14,
    });
    return;
  }
  ctx.save();
  ctx.translate(item.x + 11, item.y + 11 + Math.sin(time * 0.01 + item.x) * 4);
  ctx.rotate(item.spin);
  ctx.shadowColor = "#f0c45b";
  ctx.shadowBlur = 18;
  ctx.fillStyle = item.bonus ? "#a6e6d6" : "#ffe07a";
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(7, -2);
  ctx.lineTo(13, 0);
  ctx.lineTo(7, 3);
  ctx.lineTo(0, 13);
  ctx.lineTo(-7, 3);
  ctx.lineTo(-13, 0);
  ctx.lineTo(-7, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRelic(relic) {
  if (atlasReady) {
    const frame = relic.kind === "lantern"
      ? [SPRITES.lanternA, SPRITES.lanternB, SPRITES.lanternC, SPRITES.lanternD][Math.floor(time * 0.008) % 4]
      : SPRITES.crest;
    const w = relic.kind === "lantern" ? 42 : 48;
    const h = relic.kind === "lantern" ? 62 : 54;
    drawAtlasSprite(frame, relic.x - 8, relic.y - 18 + Math.sin(time * 0.008) * 5, w, h, false, {
      glow: relic.kind === "lantern" ? "#ffe7a8" : "#a6e6d6",
      blur: 20,
    });
    return;
  }
  ctx.save();
  ctx.translate(relic.x + 15, relic.y + 17 + Math.sin(time * 0.008) * 5);
  ctx.shadowColor = "#a6e6d6";
  ctx.shadowBlur = 22;
  ctx.fillStyle = relic.kind === "lantern" ? "#ffe7a8" : "#9fe2ad";
  if (relic.kind === "lantern") {
    roundRect(-12, -14, 24, 30, 6);
    ctx.fill();
    ctx.strokeStyle = "#2b2430";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#f0a82c";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-15, 12);
    ctx.lineTo(-10, -10);
    ctx.lineTo(0, -2);
    ctx.lineTo(10, -10);
    ctx.lineTo(15, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#397c5d";
    ctx.fillRect(-10, 8, 20, 5);
  }
  ctx.restore();
}

function drawEnemy(e) {
  if (atlasReady) {
    drawPaintedEnemy(e);
    return;
  }
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
  ctx.scale(e.dir, 1);
  if (e.type === "bat") {
    ctx.fillStyle = "#2b2430";
    ctx.beginPath();
    ctx.ellipse(0, 2, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4d3650";
    const flap = Math.sin(e.t * 4) * 8;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(-28, -18 + flap, -36, 4);
    ctx.quadraticCurveTo(-20, 2, -8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.quadraticCurveTo(28, -18 + flap, 36, 4);
    ctx.quadraticCurveTo(20, 2, 8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f0c45b";
    ctx.fillRect(-6, -2, 4, 3);
    ctx.fillRect(3, -2, 4, 3);
  } else if (e.type === "ember") {
    const flame = ctx.createLinearGradient(0, -26, 0, 24);
    flame.addColorStop(0, "#ffef9f");
    flame.addColorStop(0.4, "#e87932");
    flame.addColorStop(1, "#8e2534");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.bezierCurveTo(22, -6, 16, 24, 0, 24);
    ctx.bezierCurveTo(-18, 18, -22, -2, 0, -24);
    ctx.fill();
    ctx.fillStyle = "#211923";
    ctx.fillRect(-8, 2, 5, 5);
    ctx.fillRect(5, 2, 5, 5);
  } else {
    const regent = e.type === "regent";
    ctx.fillStyle = regent ? "#26364f" : "#6b3330";
    roundRect(-e.w / 2, -e.h / 2 + 8, e.w, e.h - 8, 8);
    ctx.fill();
    ctx.fillStyle = regent ? "#a6e6d6" : "#d4586a";
    ctx.beginPath();
    ctx.moveTo(-e.w / 2 + 4, -e.h / 2 + 16);
    ctx.lineTo(0, -e.h / 2 - (regent ? 12 : 2));
    ctx.lineTo(e.w / 2 - 4, -e.h / 2 + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe7a8";
    ctx.fillRect(-9, -8, 6, 5);
    ctx.fillRect(5, -8, 6, 5);
    if (regent) {
      ctx.strokeStyle = "#a6e6d6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(40, -22);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawOrb(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = "#a6e6d6";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#a6e6d6";
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(pl) {
  if (atlasReady) {
    drawPaintedPlayer(pl);
    return;
  }
  ctx.save();
  ctx.translate(pl.x + pl.w / 2, pl.y + pl.h / 2);
  ctx.scale(pl.dir, 1);
  if (pl.invincible > 0 && Math.floor(pl.invincible / 5) % 2 === 0) ctx.globalAlpha = 0.45;
  const walk = Math.sin(pl.step) * (pl.grounded ? 1 : 0.25);

  ctx.fillStyle = "#4f2d37";
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.quadraticCurveTo(-32, 10 + walk * 4, -16, 32);
  ctx.lineTo(0, 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e2e0d2";
  roundRect(-13, -19, 27, 32, 7);
  ctx.fill();
  ctx.strokeStyle = "#7d8191";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f0c45b";
  ctx.beginPath();
  ctx.moveTo(-15, -22);
  ctx.lineTo(15, -22);
  ctx.lineTo(8, -38);
  ctx.lineTo(-6, -36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2b2430";
  ctx.fillRect(-9, -29, 18, 4);
  ctx.fillStyle = "#d4586a";
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.quadraticCurveTo(18, -54, 24, -30);
  ctx.quadraticCurveTo(10, -35, 0, -40);
  ctx.fill();

  ctx.fillStyle = "#343849";
  ctx.fillRect(-11, 12, 9, 22 + walk * 2);
  ctx.fillRect(4, 12, 9, 22 - walk * 2);
  ctx.fillStyle = "#1b1421";
  ctx.fillRect(-15, 31 + walk * 2, 15, 6);
  ctx.fillRect(2, 31 - walk * 2, 15, 6);

  ctx.strokeStyle = "#fff4d6";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  if (pl.attackTimer > 4) {
    const arc = 1 - pl.attackTimer / 16;
    ctx.save();
    ctx.rotate(-0.7 + arc * 1.8);
    ctx.beginPath();
    ctx.moveTo(10, -8);
    ctx.lineTo(57, -13);
    ctx.stroke();
    ctx.strokeStyle = "#f0c45b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(22, -10, 44, -0.6, 0.6);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(11, -6);
    ctx.lineTo(36, -24);
    ctx.stroke();
  }

  ctx.fillStyle = "#f0c45b";
  ctx.beginPath();
  ctx.arc(-16, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a4a2f";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawPaintedPlayer(pl) {
  const attacking = pl.attackTimer > 4;
  let frame = SPRITES.oscarIdle;
  let drawW = 92;
  let drawH = 102;
  let offX = -29;
  let offY = -49;

  if (attacking) {
    frame = pl.grounded ? SPRITES.oscarSlash : SPRITES.oscarAirSlash;
    drawW = pl.grounded ? 142 : 160;
    drawH = pl.grounded ? 78 : 92;
    offX = pl.dir > 0 ? -40 : -68;
    offY = pl.grounded ? -34 : -48;
  } else if (pl.invincible > 0 && Math.floor(pl.invincible / 6) % 2 === 0) {
    frame = SPRITES.oscarHit;
    drawW = 102;
    drawH = 78;
    offX = -34;
    offY = -26;
  } else if (!pl.grounded) {
    frame = SPRITES.oscarJump;
    drawW = 94;
    drawH = 116;
    offX = -31;
    offY = -58;
  } else if (input.down) {
    frame = SPRITES.oscarCrouch;
    drawW = 92;
    drawH = 92;
    offX = -29;
    offY = -38;
  } else if (Math.abs(pl.vx) > 2.8) {
    frame = SPRITES.oscarRun;
    drawW = 104;
    drawH = 98;
    offX = -37;
    offY = -45;
  } else if (Math.abs(pl.vx) > 0.35) {
    frame = Math.floor(pl.step) % 2 ? SPRITES.oscarWalkA : SPRITES.oscarWalkB;
    drawW = 94;
    drawH = 100;
    offX = -31;
    offY = -47;
  } else if (Math.floor(time * 0.002) % 5 === 0) {
    frame = SPRITES.oscarShield;
  }

  ctx.save();
  if (pl.invincible > 0 && Math.floor(pl.invincible / 5) % 2 === 0) ctx.globalAlpha = 0.58;
  drawOvalShadow(pl.x + pl.w / 2, pl.y + pl.h - 5, 30, 7);
  drawAtlasSprite(frame, pl.x + offX, pl.y + offY, drawW, drawH, pl.dir < 0);
  ctx.restore();
}

function drawPaintedEnemy(e) {
  let frame = SPRITES.imp;
  let drawW = 72;
  let drawH = 72;
  let offX = -15;
  let offY = -30;

  if (e.type === "bat") {
    frame = [SPRITES.batA, SPRITES.batB, SPRITES.batC][Math.floor(e.t * 5) % 3];
    drawW = 76;
    drawH = 54;
    offX = -19;
    offY = -18;
  } else if (e.type === "guard") {
    frame = SPRITES.guard;
    drawW = 92;
    drawH = 72;
    offX = -23;
    offY = -31;
  } else if (e.type === "ember") {
    frame = [SPRITES.emberA, SPRITES.emberB, SPRITES.emberC][Math.floor(e.t * 6) % 3];
    drawW = 72;
    drawH = 76;
    offX = -15;
    offY = -33;
  } else if (e.type === "regent") {
    frame = [SPRITES.regentA, SPRITES.regentB, SPRITES.regentC][Math.floor(e.t * 2.2) % 3];
    drawW = 168;
    drawH = 112;
    offX = -56;
    offY = -50;
  } else {
    frame = Math.floor(e.t * 4) % 2 ? SPRITES.imp : SPRITES.impWalk;
  }

  if (e.type !== "bat" && e.type !== "ember") {
    drawOvalShadow(e.x + e.w / 2, e.y + e.h - 4, e.type === "regent" ? 60 : 30, 8);
  }
  drawAtlasSprite(frame, e.x + offX, e.y + offY, drawW, drawH, e.dir < 0, {
    glow: e.type === "ember" ? "#ffcf66" : null,
    blur: e.type === "ember" ? 16 : 0,
  });
}

function drawAtlasSprite(frame, x, y, w, h, flip = false, options = {}) {
  if (!atlasReady) return;
  ctx.save();
  if (options.glow) {
    ctx.shadowColor = options.glow;
    ctx.shadowBlur = options.blur || 12;
  }
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, 0, 0, w, h);
  } else {
    ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, x, y, w, h);
  }
  ctx.restore();
}

function drawEnvSprite(frame, x, y, w, h, flip = false, options = {}) {
  if (!envReady || !frame) return;
  ctx.save();
  if (options.glow) {
    ctx.shadowColor = options.glow;
    ctx.shadowBlur = options.blur || 12;
  }
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(envAtlas, frame.x, frame.y, frame.w, frame.h, 0, 0, w, h);
  } else {
    ctx.drawImage(envAtlas, frame.x, frame.y, frame.w, frame.h, x, y, w, h);
  }
  ctx.restore();
}

function drawOvalShadow(cx, cy, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(18, 10, 18, 0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawVignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 620);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(14,10,18,0.34)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawTitleOscar() {
  ctx.save();
  ctx.translate(W / 2, 295);
  ctx.scale(2.2, 2.2);
  drawPlayer({
    x: -17,
    y: -46,
    w: 34,
    h: 54,
    dir: 1,
    grounded: true,
    invincible: 0,
    attackTimer: 14,
    step: time * 0.02,
  });
  ctx.restore();
}

function drawSunMoon(x, y, color) {
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(x, y, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMountainLayer(offset, baseY, color, alpha, height) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-60, H);
  for (let x = -120; x <= W + 180; x += 140) {
    const px = x - (offset % 140);
    ctx.lineTo(px + 70, baseY - height - ((x / 140) % 3) * 28);
    ctx.lineTo(px + 150, baseY);
  }
  ctx.lineTo(W + 80, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawForestLayer(offset, baseY, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let x = -60; x < W + 100; x += 42) {
    const px = x - (offset % 42);
    const h = 42 + ((x * 19) % 58);
    ctx.beginPath();
    ctx.moveTo(px, baseY);
    ctx.lineTo(px + 20, baseY - h);
    ctx.lineTo(px + 42, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(px + 17, baseY - 7, 7, 34);
  }
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function star(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function burst(x, y, count, color, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed + 0.4;
    const life = 22 + Math.random() * 26;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 0.8,
      g: 0.05,
      r: 1.5 + Math.random() * 2.8,
      color,
      life,
      max: life,
    });
  }
}

function rects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = 160;
}

function updateToast() {
  if (toastTimer > 0) {
    toastTimer--;
    if (toastTimer <= 0) toast.classList.remove("show");
  }
}

function updateHud() {
  hud.levelName.textContent = run?.active && activeLevel ? `${activeLevel.name} · ${activeLevel.roomKind}` : activeLevel?.name || "Oscar The Knight";
  hud.shards.textContent = totalShards;
  hud.relics.textContent = run?.active ? `${run.relics.length} / ${run.sigilsEarned}S` : totalRelics;
  hud.hearts.innerHTML = "";
  const max = player?.maxHp || 5;
  const hp = player?.hp || 5;
  for (let i = 0; i < max; i++) {
    const heart = document.createElement("span");
    heart.className = `heart${i >= hp ? " empty" : ""}`;
    hud.hearts.appendChild(heart);
  }
}

function unlockAudio() {
  if (unlockedAudio) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  unlockedAudio = true;
}

function playTone(kind) {
  if (muted || !audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const map = {
    jump: [360, 620, 0.12, "triangle"],
    jump2: [520, 880, 0.14, "sine"],
    pickup: [760, 1180, 0.1, "sine"],
    relic: [380, 980, 0.34, "triangle"],
    slash: [220, 90, 0.08, "sawtooth"],
    hit: [160, 60, 0.1, "square"],
    hurt: [150, 70, 0.24, "sawtooth"],
    checkpoint: [420, 720, 0.22, "triangle"],
    orb: [260, 190, 0.16, "sine"],
  };
  const [from, to, dur, type] = map[kind] || map.pickup;
  osc.type = type;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, now);
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === "hurt" ? 0.09 : 0.045, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function syncInput() {
  input.left = pressed.has("left");
  input.right = pressed.has("right");
  input.jump = pressed.has("jump");
  input.attack = pressed.has("attack");
  input.down = pressed.has("down");
  input.dash = pressed.has("dash");
}

document.addEventListener("keydown", (e) => {
  const action = KEYMAP[e.code];
  if (!action) return;
  if (action === "pause") {
    if (state === "playing") {
      state = "paused";
      showToast("Paused. Press P or Esc to resume.");
    } else if (state === "paused") {
      state = "playing";
      showToast("Back to the run.");
    }
    e.preventDefault();
    return;
  }
  if (action.startsWith("choice") && state === "choice") {
    const index = Number(action.replace("choice", "")) - 1;
    const button = choiceActions.querySelectorAll("button")[index];
    if (button && !button.disabled) button.click();
    e.preventDefault();
    return;
  }
  if (!pressed.has(action)) {
    if (action === "jump") input.jumpPressed = true;
    if (action === "attack") input.attackPressed = true;
    if (action === "dash") input.dashPressed = true;
  }
  pressed.add(action);
  syncInput();
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});

document.addEventListener("keyup", (e) => {
  const action = KEYMAP[e.code];
  if (!action) return;
  pressed.delete(action);
  syncInput();
});

document.querySelectorAll("[data-touch]").forEach((button) => {
  const action = button.dataset.touch;
  const start = (e) => {
    e.preventDefault();
    if (!pressed.has(action)) {
      if (action === "jump") input.jumpPressed = true;
      if (action === "attack") input.attackPressed = true;
      if (action === "dash") input.dashPressed = true;
    }
    pressed.add(action);
    syncInput();
  };
  const end = (e) => {
    e.preventDefault();
    pressed.delete(action);
    syncInput();
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointercancel", end);
  button.addEventListener("pointerleave", end);
});

startButton.addEventListener("click", startQuest);
cinemaButton.addEventListener("click", () => {
  unlockAudio();
  nextCutsceneFrame();
});
muteButton.addEventListener("click", () => {
  muted = !muted;
  muteButton.textContent = muted ? "Sound Off" : "Sound On";
  muteButton.setAttribute("aria-pressed", String(muted));
});

function loop(now) {
  const dt = Math.min(32, now - last || 16);
  last = now;
  update(dt);
  updateToast();
  render();
  input.attackPressed = false;
  input.dashPressed = false;
  requestAnimationFrame(loop);
}

loadSave();
loadLevel(0);
state = "menu";
setOverlayMode("menu");
menuPanel.querySelector(".kicker").textContent = "Rogue-lite platform quest";
menuPanel.querySelector(".subtitle").textContent = "Enter the Lantern Run, find relics, bank Sun Sigils, and grow Oscar between runs.";
startButton.textContent = "Hall of Dawn";
requestAnimationFrame(loop);
