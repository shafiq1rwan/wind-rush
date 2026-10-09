// Handcrafted level layouts. Edit freely - LevelManager builds everything from these objects.
//
//  ground          solid street segments ({ x, width }); gaps between them are pits
//  obstacles       crate stacks; `heights` lists the stack height (in 64px crates) of each column
//  signs           tutorial signposts (`touchText` replaces `text` when touch controls are shown)
//  scriptedPickups pickups that fly in once the player passes `triggerX`
//  wind.pattern    looping list of wind steps: state (calm|breeze|strong|extreme), dir (-1 left, 1 right), seconds
//  debris.types    relative spawn weights for hazard types

export const LEVELS = [
  {
    id: 'windy-street',
    name: 'Windy Street',
    width: 6000,
    // Keep the street surface at 520: the 200 px below it is reserved for the touch controls.
    groundY: 520,
    playerStartX: 140,
    parTime: 50,
    decorSeed: 'windy-street',

    ground: [{ x: 0, width: 6000 }],

    obstacles: [
      { x: 1050, heights: [1] },
      { x: 1900, heights: [1, 2, 1] },
      { x: 2800, heights: [1] },
      { x: 3550, heights: [1, 2] },
      { x: 4300, heights: [1, 1] },
      { x: 4950, heights: [1, 2, 1] },
    ],

    signs: [
      {
        x: 330,
        text: 'Reach the SHELTER\nA / D  or  ← / →',
        touchText: 'Reach the SHELTER\nuse the ◀ ▶ buttons',
      },
      {
        x: 720,
        text: 'SPACE to jump\nhold it to jump higher',
        touchText: 'Tap JUMP to jump\nhold it to jump higher',
      },
      { x: 1420, text: 'GUST coming?\nHold S to ANCHOR!', touchText: 'GUST coming?\nHold ANCHOR!' },
      { x: 2450, text: 'Blue umbrella = shield\nGreen kit = +1 heart' },
      { x: 3300, text: 'Hide in front of crates:\nthey block wind & debris' },
    ],

    shelter: { x: 5720 },

    scriptedPickups: [
      { type: 'umbrella', triggerX: 2150 },
      { type: 'heal', triggerX: 3350 },
      { type: 'umbrella', triggerX: 4450 },
    ],

    wind: {
      prevailingDirection: -1,
      pattern: [
        { state: 'calm', dir: -1, duration: 3 },
        { state: 'breeze', dir: -1, duration: 4 },
        { state: 'strong', dir: -1, duration: 3.5 },
        { state: 'breeze', dir: 1, duration: 3 },
        { state: 'extreme', dir: -1, duration: 2.2 },
        { state: 'breeze', dir: -1, duration: 3 },
        { state: 'strong', dir: 1, duration: 3 },
        { state: 'calm', dir: -1, duration: 2 },
        { state: 'extreme', dir: -1, duration: 2.5 },
      ],
    },

    debris: {
      density: 1,
      types: { plank: 0.75, brick: 0.25 },
    },
  },
];
