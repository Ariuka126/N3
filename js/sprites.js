/* Pixel sprites: string grids rendered to crisp SVG rects. Palette values may be CSS vars. */
window.N3 = window.N3 || {};

(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Merge horizontal runs of the same color so sprites stay light in the DOM.
  function rects(grid, pal, x0 = 0, y0 = 0, cls) {
    let out = '';
    grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (c === '.' || !pal[c]) { x++; continue; }
        let w = 1;
        while (row[x + w] === c) w++;
        out += `<rect x="${x0 + x}" y="${y0 + y}" width="${w}" height="1" style="fill:${pal[c]}"${cls ? ` class="${cls}"` : ''}/>`;
        x += w;
      }
    });
    return out;
  }

  const CAT_PAL = {
    O: 'var(--cat-line)', B: 'var(--cat-fur)', S: 'var(--cat-stripe)', L: 'var(--cat-belly)',
    P: '#e98a8a', R: '#f2a39a', E: 'var(--cat-line)'
  };

  const CAT_BODY = [
    '..O........O....',
    '.OBO......OBO...',
    '.OPBO....OBPO...',
    'OBBBBOOOOBBBBO..',
    'OBBBBBSSBBBBBO..',
    'OBBBBBBBBBBBBO..',
    'OBBBBBBBBBBBBO..',
    'OBBBBBPPBBBBBO..',
    'OBRBBBBBBBBRBO..',
    '.OBBBBBBBBBBO...',
    '..OOBBBBBBOO....',
    '..OBBLLLLBBO....',
    '.OSBLLLLLLBSO...',
    '.OBBLLLLLLBBO...',
    '.OSBLLLLLLBSO...',
    '.OBBBLLLLBBBO...',
    '.OBOBBBBBBOBO...',
    '..OOOOOOOOOO....'
  ];
  const CAT_EYES = [
    '...E......E', // y=5
    '...E......E'  // y=6
  ];
  const CAT_TAIL = [
    '...O.',
    '..OBO',
    '..OSO',
    '.OBO.',
    '.OSO.',
    'OBO..',
    'OBO..',
    'OO...'
  ];
  const CAT_CURL = [
    '.O....O...........',
    'OBO..OBO...OOOOO..',
    'OBBOOBBBOOOBBBBBO.',
    'OBBBBBBBBBBBBBSBBO',
    'OBBBBBBBBBBBBSBBBO',
    'OBEEBBEEBBBBBBBBBO',
    'OBBBPPBBBBBBBSBBBO',
    'OBRBBBBRBBBBSBBBBO',
    '.OBBBBBBOOOOOOOOO.',
    '..OOOOOOBBBBBBBBO.',
    '.......OOOOOOOOO..'
  ];

  const NOTEBOOK = [
    'OOOOOOOO',
    'ONNNNNNO',
    'ONnnnnNO',
    'OOOOOOOO'
  ];
  const PENCIL = [
    '..Y',
    '.Y.',
    'k..'
  ];

  const ACCESSORIES = {
    scarf: { x: 2, y: 10, pal: { G: '#4f7a4a', g: '#3a5c37' }, grid: [
      'GGGGGGGGGG',
      'gGGGGGGGGg',
      '.......GG.',
      '.......Gg.'
    ] },
    glasses: { x: 2, y: 4, pal: { K: '#8a5a2b' }, grid: [
      'KKK....KKK',
      'K.KKKKKK.K',
      'K.K....K.K',
      'KKK....KKK'
    ] },
    sprout: { x: 4, y: -3, pal: { V: '#7cb45a', T: '#4f7a4a' }, grid: [
      'V...V',
      'VVTVV',
      '..T..',
      '..T..',
      '..T..',
      '..T..'
    ] },
    bell: { x: 3, y: 10, pal: { r: '#d9534f', Y: '#f2c14e', y: '#b8862b' }, grid: [
      'rrrrrrrr',
      '...YY...',
      '...yy...'
    ] },
    hat: { x: 1, y: -5, pal: { W: '#6b5ba8', w: '#4e4185', Y: '#f2c14e' }, grid: [
      '.....WW.....',
      '.....Ww.....',
      '....WWYW....',
      '....WWWW....',
      '...WWWWWW...',
      '...WYWWWW...',
      '..WWWWWWWW..',
      '..YYYYYYYY..',
      'wwwwwwwwwwww'
    ] }
  };

  function accessory(id) {
    const a = ACCESSORIES[id];
    return a ? `<g class="acc acc-${id}">${rects(a.grid, a.pal, a.x, a.y)}</g>` : '';
  }

  /* Full cat: pose groups toggled by a class on the root svg (pose-idle / pose-focus / pose-break). */
  N3.catSVG = function (equipped = {}) {
    const acc = ['head', 'neck', 'face'].map(s => equipped[s] ? accessory(equipped[s]) : '').join('');
    return `<svg class="cat-svg" viewBox="-1 -6 20 24" shape-rendering="crispEdges" aria-hidden="true">
      <g class="sit">
        <g class="tail">${rects(CAT_TAIL, CAT_PAL, 12, 8)}</g>
        <g class="body">
          ${rects(CAT_BODY, CAT_PAL)}
          <g class="eyes">${rects(CAT_EYES, CAT_PAL, 0, 5)}</g>
          <g class="focus-prop">${rects(NOTEBOOK, { O: 'var(--cat-line)', N: '#fff8e7', n: '#c9b79a' }, 4, 13)}
            <g class="pencil">${rects(PENCIL, { Y: '#f2c14e', k: '#3b2a2a' }, 10, 11)}</g></g>
          ${acc}
        </g>
      </g>
      <g class="curl">
        <g class="body">${rects(CAT_CURL, CAT_PAL, 0, 7)}</g>
      </g>
    </svg>`;
  };

  /* Closet preview of a single accessory on a tiny bust. */
  N3.accessoryPreview = function (id) {
    return `<svg viewBox="-1 -6 20 24" shape-rendering="crispEdges" aria-hidden="true">
      ${rects(CAT_BODY, CAT_PAL)}${rects(CAT_EYES, CAT_PAL, 0, 5)}${accessory(id)}</svg>`;
  };

  N3.gemSVG = function (hue = 190) {
    const pal = { W: '#fffdf4', C: `hsl(${hue} 75% 62%)`, c: `hsl(${hue} 65% 45%)` };
    return `<svg viewBox="0 0 5 5" shape-rendering="crispEdges" aria-hidden="true">${rects([
      '..W..', '.WCC.', 'CCCCc', '.Ccc.', '..c..'
    ], pal)}</svg>`;
  };

  /* Glass jar with gem cells stacked from the bottom. Interior: 10 wide x 15 tall. */
  N3.jarSVG = function (count, fresh = 0) {
    const pal = { G: 'var(--jar-line)', g: 'var(--jar-glass)', l: 'var(--jar-lid)', L: 'var(--jar-lid-dark)', h: 'rgba(255,255,255,.55)' };
    const jar = rects([
      '...LLLLLLLLLL...',
      '...llllllllll...',
      '...LLLLLLLLLL...',
      '....GggggggG....',
      '...GggggggggG...',
      '..GggggggggggG..',
      '.GhgggggggggggG.',
      '.GhgggggggggggG.',
      '.GhgggggggggggG.',
      '.GhgggggggggggG.',
      '.GhgggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '.GggggggggggggG.',
      '..GggggggggggG..',
      '...GGGGGGGGGG...'
    ], pal);
    // Gems are 2x1 pebbles, six per row; 78 fit before the jar is full.
    let gems = '';
    const n = Math.min(count, 78);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 6), col = i % 6;
      const y = 19 - row;
      const x = 2 + col * 2;
      const hue = [330, 45, 190, 140, 265, 15][(i * 5) % 6];
      const cls = i >= n - fresh ? ' class="fresh"' : '';
      gems += `<rect x="${x}" y="${y}" width="2" height="1" style="fill:hsl(${hue} 80% 58%)"${cls}/>`
        + `<rect x="${x}" y="${y}" width="1" height="1" style="fill:hsl(${hue} 90% 80%)"/>`;
    }
    return `<svg class="jar-svg" viewBox="0 0 16 22" shape-rendering="crispEdges" aria-hidden="true">${jar}<g class="jar-gems">${gems}</g></svg>`;
  };

  /* Scene pieces */
  N3.bakerySVG = function () {
    const pal = {
      R: 'var(--roof)', r: 'var(--roof-dark)', w: 'var(--wall)', f: 'var(--frame)', g: 'var(--window)',
      d: 'var(--door)', D: 'var(--window)', a: 'var(--awning)', A: '#fff6ea', S: 'var(--sign)', o: 'var(--frame)', c: 'var(--frame)'
    };
    return `<svg class="bakery" viewBox="0 0 24 18" shape-rendering="crispEdges" aria-hidden="true">${rects([
      '.................cc.....',
      '.................cc.....',
      '........RRRRRRRRRccR....',
      '.......RRRRRRRRRRRRRR...',
      '......RRRRRRRRRRRRRRRR..',
      '.....rrrrrrrrrrrrrrrrrr.',
      '......wwwwwwwwwwwwwwww..',
      '......wffffwwSSwwffffw..',
      '......wfggfwwSSwwfggfw..',
      '......wfggfwwwwwwfggfw..',
      '......wffffwwwwwwffffw..',
      '.....aAaAaAaAaAaAaAaAaA.',
      '......wwwwwwddddwwwwww..',
      '......wffffwddddwffffw..',
      '......wfggfwdddDwfggfw..',
      '......wffffwddddwffffw..',
      '......wwwwwwddddwwwwww..',
      '.....oooooooooooooooooo.'
    ], pal)}</svg>`;
  };

  N3.treeSVG = function () {
    const pal = { F: 'var(--leaf)', f: 'var(--leaf-dark)', h: 'var(--leaf-light)', T: 'var(--trunk)' };
    return `<svg class="tree" viewBox="0 0 12 14" shape-rendering="crispEdges" aria-hidden="true">
      <g class="trunk">${rects(['.....TT.....', '.....TT.....', '.....TT.....', '....TTTT....'], pal, 0, 10)}</g>
      <g class="foliage">${rects([
        '....hhFF....',
        '..hhFFFFFF..',
        '.hFFFFFFfFF.',
        'hFFFfFFFFFFf',
        'FFFFFFFFFfFF',
        'FFfFFFFFFFFf',
        '.fFFFFFfFFf.',
        '..ffFFFFff..',
        '....ffff....',
        '.....TT.....'
      ], pal)}</g></svg>`;
  };

  N3.cloudSVG = function () {
    return `<svg class="cloud-svg" viewBox="0 0 16 6" shape-rendering="crispEdges" aria-hidden="true">${rects([
      '.....CCCC.......',
      '...CCCCCCCC.CC..',
      '..CCCCCCCCCCCCC.',
      'CCCCCCCCCCCCCCCC',
      '.ssssssssssssss.'
    ], { C: 'var(--cloud)', s: 'var(--cloud-shade)' })}</svg>`;
  };

  N3.lanternSVG = function () {
    return `<svg viewBox="0 0 5 8" shape-rendering="crispEdges" aria-hidden="true">${rects([
      '..k..', '.kkk.', 'lLLLl', 'lLYLl', 'lLLLl', 'lLLLl', '.kkk.', '..k..'
    ], { k: '#3b2a2a', l: '#d9534f', L: '#f08a5d', Y: '#ffe29a' })}</svg>`;
  };

  N3.lampSVG = function () {
    return `<svg viewBox="0 0 7 14" shape-rendering="crispEdges" aria-hidden="true">${rects([
      '..sss..', '.sssss.', 'sssssss', '...b...', '...b...', '...b...', '...b...',
      '...b...', '...b...', '...b...', '...b...', '...b...', '..bbb..', '.bbbbb.'
    ], { s: 'var(--lamp-shade)', b: 'var(--frame)' })}</svg>`;
  };

  N3.svgNS = NS;
})();
