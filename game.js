const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const livesEl = document.getElementById('lives');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');

const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;

// ピクセルアートスプライト (1=描画, 0=透明)
const SPRITES = {
  player: [
    [0,0,0,0,0,1,0,0,0,0,0],
    [0,0,0,0,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1]
  ],
  invaderA: [
    [0,0,1,1,0,0,0,1,1,0,0],
    [0,1,1,1,1,0,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,0,1,1,1,1,1,1,1,0,1],
    [1,0,1,1,1,1,1,1,1,0,1],
    [0,0,1,0,0,0,0,0,1,0,0],
    [0,0,0,1,1,0,1,1,0,0,0],
    [0,0,1,1,0,0,0,1,1,0,0]
  ],
  invaderB: [
    [0,0,0,1,1,0,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,0,0],
    [0,1,1,0,1,1,1,0,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1],
    [0,0,1,1,0,0,0,1,1,0,0],
    [0,1,0,0,1,1,1,0,0,1,0],
    [1,0,0,0,0,0,0,0,0,0,1]
  ],
  invaderC: [
    [0,0,1,0,0,0,0,0,1,0,0],
    [0,0,0,1,0,0,0,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,0,0],
    [0,1,1,0,1,1,1,0,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,0,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,1],
    [0,0,0,1,1,0,1,1,0,0,0]
  ]
};

const ALIEN_COLORS = ['#f00', '#0f0', '#ff0'];
const ALIEN_ROWS = 5;
const ALIEN_COLS = 11;
const ALIEN_WIDTH = 33;
const ALIEN_HEIGHT = 24;
const ALIEN_GAP_X = 16;
const ALIEN_GAP_Y = 16;
const ALIEN_START_Y = 60;
const PLAYER_WIDTH = 33;
const PLAYER_HEIGHT = 24;
const PLAYER_Y = SCREEN_HEIGHT - 40;
const BULLET_SPEED = 6;
const ALIEN_BULLET_SPEED = 3;
const PLAYER_SPEED = 4;
const BARRIER_COUNT = 4;
const BARRIER_PIXEL_SIZE = 3;
const BARRIER_PATTERN = [
  '00011111111111111000',
  '00111111111111111100',
  '01111111111111111110',
  '11111111111111111111',
  '11111111111111111111',
  '11111111111111111111',
  '11111111000011111111',
  '11111110000001111111',
  '11111100000000111111',
  '11111000000000011111'
];
const INITIAL_ALIEN_COUNT = ALIEN_ROWS * ALIEN_COLS;

let keys = {};
let gameState = 'start'; // start, playing, gameover
let score = 0;
let highScore = 0;
let lives = 3;
let frameCount = 0;

let player = {
  x: SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2,
  y: PLAYER_Y,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  alive: true
};

let aliens = [];
let bullets = [];
let alienBullets = [];
let particles = [];
let alienDir = 1;
let alienStepDown = false;
let alienSpeed = 0.5;
let alienMoveInterval = 30;
let alienShootChance = 0.01;
let mysteryShip = null;
let barriers = [];

function initAliens() {
  aliens = [];
  for (let r = 0; r < ALIEN_ROWS; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      let type = r < 1 ? 'invaderA' : r < 3 ? 'invaderB' : 'invaderC';
      aliens.push({
        x: 60 + c * (ALIEN_WIDTH + ALIEN_GAP_X),
        y: ALIEN_START_Y + r * (ALIEN_HEIGHT + ALIEN_GAP_Y),
        width: ALIEN_WIDTH,
        height: ALIEN_HEIGHT,
        type: type,
        color: ALIEN_COLORS[r % ALIEN_COLORS.length],
        alive: true,
        anim: 0
      });
    }
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  player.x = SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2;
  player.alive = true;
  bullets = [];
  alienBullets = [];
  particles = [];
  mysteryShip = null;
  alienDir = 1;
  alienSpeed = 0.5;
  alienMoveInterval = 60;
  alienShootChance = 0.005;
  initAliens();
  initBarriers();
  updateUI();
}

function initBarriers() {
  barriers = [];
  for (let i = 0; i < BARRIER_COUNT; i++) {
    barriers.push({
      x: 80 + i * 140,
      y: PLAYER_Y - 40,
      cells: BARRIER_PATTERN.map(row => row.split('').map(cell => cell === '1'))
    });
  }
}

function drawSprite(ctx, sprite, x, y, scale, color) {
  ctx.fillStyle = color;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      if (sprite[row][col]) {
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

function drawPlayer() {
  if (player.alive) {
    drawSprite(ctx, SPRITES.player, player.x, player.y, 3, '#0f0');
  }
}

function drawAliens() {
  let anim = Math.floor(frameCount / getAlienMoveInterval()) % 2;
  for (let alien of aliens) {
    if (!alien.alive) continue;
    let sprite = SPRITES[alien.type];
    // アニメーションで少し歪める簡易表現
    drawSprite(ctx, sprite, alien.x, alien.y, 3, alien.color);
  }
}

function drawBullets() {
  ctx.fillStyle = '#fff';
  for (let b of bullets) {
    ctx.fillRect(b.x, b.y, 2, 10);
  }
  ctx.fillStyle = '#f00';
  for (let b of alienBullets) {
    ctx.fillRect(b.x, b.y, 2, 10);
  }
}

function drawMysteryShip() {
  if (mysteryShip) {
    ctx.fillStyle = '#f0f';
    ctx.fillRect(mysteryShip.x, mysteryShip.y, 48, 12);
    ctx.fillRect(mysteryShip.x + 8, mysteryShip.y - 6, 32, 6);
  }
}

function drawParticles() {
  for (let p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
}

function drawBarriers() {
  ctx.fillStyle = '#0f0';
  for (let barrier of barriers) {
    for (let row = 0; row < barrier.cells.length; row++) {
      for (let col = 0; col < barrier.cells[row].length; col++) {
        if (!barrier.cells[row][col]) continue;
        ctx.fillRect(
          barrier.x + col * BARRIER_PIXEL_SIZE,
          barrier.y + row * BARRIER_PIXEL_SIZE,
          BARRIER_PIXEL_SIZE,
          BARRIER_PIXEL_SIZE
        );
      }
    }
  }
}

function getAlienMoveInterval() {
  const aliveAliens = aliens.filter(alien => alien.alive).length;
  const aliveRatio = aliveAliens / INITIAL_ALIEN_COUNT;
  const speedScale = 0.35 + aliveRatio * 0.65;
  return Math.max(2, Math.floor(alienMoveInterval * speedScale));
}

function updatePlayer() {
  if (keys['ArrowLeft'] && player.x > 0) {
    player.x -= PLAYER_SPEED;
  }
  if (keys['ArrowRight'] && player.x < SCREEN_WIDTH - player.width) {
    player.x += PLAYER_SPEED;
  }
}

function updateAliens() {
  if (frameCount % getAlienMoveInterval() !== 0) return;

  let edge = false;
  for (let alien of aliens) {
    if (!alien.alive) continue;
    if ((alienDir === 1 && alien.x + alien.width >= SCREEN_WIDTH - 10) ||
        (alienDir === -1 && alien.x <= 10)) {
      edge = true;
      break;
    }
  }

  for (let alien of aliens) {
    if (!alien.alive) continue;
    if (edge) {
      alien.y += ALIEN_HEIGHT;
    } else {
      alien.x += alienDir * 10;
    }
  }

  if (edge) {
    alienDir *= -1;
    alienMoveInterval *= 0.96;
    alienShootChance += 0.0005;
  }

  // 謎の宇宙船出現
  if (!mysteryShip && Math.random() < 0.002) {
    mysteryShip = { x: -60, y: 30, width: 48, height: 18, dir: 1 };
  }
}

function updateMysteryShip() {
  if (!mysteryShip) return;
  mysteryShip.x += mysteryShip.dir * 2;
  if (mysteryShip.x > SCREEN_WIDTH + 60) {
    mysteryShip = null;
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.y -= BULLET_SPEED;
    if (b.y < 0) bullets.splice(i, 1);
  }

  for (let i = alienBullets.length - 1; i >= 0; i--) {
    let b = alienBullets[i];
    b.y += ALIEN_BULLET_SPEED;
    if (b.y > SCREEN_HEIGHT) alienBullets.splice(i, 1);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 20 + Math.random() * 10,
      size: 2 + Math.random() * 2,
      color: color
    });
  }
}

function damageBarrierAt(x, y, isAlienBullet) {
  for (let barrier of barriers) {
    const width = barrier.cells[0].length * BARRIER_PIXEL_SIZE;
    const height = barrier.cells.length * BARRIER_PIXEL_SIZE;
    if (x < barrier.x || x >= barrier.x + width || y < barrier.y || y >= barrier.y + height) continue;

    const cellX = Math.floor((x - barrier.x) / BARRIER_PIXEL_SIZE);
    const cellY = Math.floor((y - barrier.y) / BARRIER_PIXEL_SIZE);
    if (!barrier.cells[cellY][cellX]) return false;

    const blast = isAlienBullet
      ? [[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1], [0, 2]]
      : [[0, 0], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [0, -2]];

    for (let [dx, dy] of blast) {
      const nx = cellX + dx;
      const ny = cellY + dy;
      if (ny < 0 || ny >= barrier.cells.length) continue;
      if (nx < 0 || nx >= barrier.cells[ny].length) continue;
      barrier.cells[ny][nx] = false;
    }
    return true;
  }
  return false;
}

function checkCollisions() {
  // プレイヤー弾 vs エイリアン
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    if (damageBarrierAt(b.x, b.y, false)) {
      bullets.splice(i, 1);
      continue;
    }
    let hit = false;
    for (let alien of aliens) {
      if (!alien.alive) continue;
      if (b.x >= alien.x && b.x <= alien.x + alien.width &&
          b.y >= alien.y && b.y <= alien.y + alien.height) {
        alien.alive = false;
        hit = true;
        createExplosion(alien.x + alien.width/2, alien.y + alien.height/2, alien.color);
        score += alien.type === 'invaderA' ? 30 : alien.type === 'invaderB' ? 20 : 10;
        updateUI();
        break;
      }
    }
    // 謎の宇宙船
    if (!hit && mysteryShip &&
        b.x >= mysteryShip.x && b.x <= mysteryShip.x + mysteryShip.width &&
        b.y >= mysteryShip.y && b.y <= mysteryShip.y + mysteryShip.height) {
      hit = true;
      createExplosion(mysteryShip.x + 24, mysteryShip.y + 6, '#f0f');
      score += 100;
      mysteryShip = null;
      updateUI();
    }
    if (hit) bullets.splice(i, 1);
  }

  // エイリアン弾 vs プレイヤー
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    let b = alienBullets[i];
    if (!b) continue;
    if (damageBarrierAt(b.x, b.y, true)) {
      alienBullets.splice(i, 1);
      continue;
    }
    if (b.x >= player.x && b.x <= player.x + player.width &&
        b.y >= player.y && b.y <= player.y + player.height) {
      alienBullets.splice(i, 1);
      createExplosion(player.x + player.width/2, player.y + player.height/2, '#0f0');
      loseLife();
      break;
    }
  }

  // エイリアンが下端に到達
  for (let alien of aliens) {
    if (alien.alive && alien.y + alien.height >= PLAYER_Y - 30) {
      gameOver();
      return;
    }
  }

  // 全エイリアン撃破
  if (aliens.every(a => !a.alive)) {
    initAliens();
    alienMoveInterval *= 0.85;
  }
}

function alienShoot() {
  let aliveAliens = aliens.filter(a => a.alive);
  if (aliveAliens.length === 0) return;
  // 下の列のエイリアンのみ発射
  let shooters = [];
  for (let c = 0; c < ALIEN_COLS; c++) {
    let lowest = null;
    for (let r = ALIEN_ROWS - 1; r >= 0; r--) {
      let a = aliens[r * ALIEN_COLS + c];
      if (a.alive) { lowest = a; break; }
    }
    if (lowest) shooters.push(lowest);
  }
  for (let s of shooters) {
    if (Math.random() < alienShootChance) {
      alienBullets.push({
        x: s.x + s.width / 2,
        y: s.y + s.height
      });
    }
  }
}

function loseLife() {
  lives--;
  updateUI();
  if (lives <= 0) {
    gameOver();
  } else {
    player.x = SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2;
    bullets = [];
    alienBullets = [];
  }
}

function gameOver() {
  gameState = 'gameover';
  gameOverScreen.classList.remove('hidden');
  if (score > highScore) highScore = score;
  updateUI();
}

function updateUI() {
  scoreEl.textContent = `SCORE: ${score}`;
  highScoreEl.textContent = `HI-SCORE: ${highScore}`;
  livesEl.textContent = `LIVES: ${lives}`;
}

function startGame() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  resetGame();
  gameState = 'playing';
}

let lastShot = 0;
function gameLoop() {
  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  drawBarriers();

  if (gameState === 'playing') {
    frameCount++;
    updatePlayer();
    updateAliens();
    updateMysteryShip();
    updateBullets();
    updateParticles();
    checkCollisions();
    alienShoot();

    // 発射
    if (keys[' '] && frameCount - lastShot > 18) {
      bullets.push({ x: player.x + player.width / 2, y: player.y });
      lastShot = frameCount;
    }
  }

  drawPlayer();
  drawAliens();
  drawBullets();
  drawMysteryShip();
  drawParticles();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((gameState === 'start' || gameState === 'gameover') && e.key === ' ') {
    startGame();
  }
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

canvas.addEventListener('click', () => {
  if (gameState === 'start' || gameState === 'gameover') {
    startGame();
  }
});

updateUI();
initBarriers();
requestAnimationFrame(gameLoop);
