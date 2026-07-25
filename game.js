const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const soundEl = document.getElementById('sound');
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
let soundEnabled = true;
let audioCtx = null;
let alienStepTone = 0;
let lastUfoHumFrame = -999;

const INVADER_MOVE_NOTES = [220, 196, 174, 164];

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

function ensureAudioRunning() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

function playTone(freq, duration, type, volume, endFreq) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playShotSound() {
  playTone(1400, 0.09, 'sawtooth', 0.07, 380);
}

function playUfoMoveSound() {
  playTone(250, 0.1, 'square', 0.04, 180);
}

function playUfoHitSound() {
  playTone(620, 0.06, 'square', 0.07, 460);
  playTone(220, 0.14, 'sawtooth', 0.05, 110);
}

function playInvaderHitSound() {
  playTone(520, 0.07, 'square', 0.06, 260);
}

function playInvaderMoveSound() {
  const freq = INVADER_MOVE_NOTES[alienStepTone];
  playTone(freq, 0.07, 'square', 0.05);
  alienStepTone = (alienStepTone + 1) % INVADER_MOVE_NOTES.length;
}

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
  alienStepTone = 0;
  lastUfoHumFrame = -999;
  initAliens();
  updateUI();
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
  let anim = Math.floor(frameCount / alienMoveInterval) % 2;
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
  // 簡易的な4つの防衛壁
  ctx.fillStyle = '#0f0';
  for (let i = 0; i < 4; i++) {
    let bx = 80 + i * 140;
    let by = PLAYER_Y - 40;
    ctx.fillRect(bx, by, 60, 15);
    ctx.fillRect(bx + 10, by + 15, 40, 10);
  }
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
  if (frameCount % Math.max(2, Math.floor(alienMoveInterval)) !== 0) return;

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
  playInvaderMoveSound();

  if (edge) {
    alienDir *= -1;
    alienMoveInterval *= 0.96;
    alienShootChance += 0.0005;
  }

  // 謎の宇宙船出現
  if (!mysteryShip && Math.random() < 0.002) {
    mysteryShip = { x: -60, y: 30, width: 48, height: 18, dir: 1 };
    lastUfoHumFrame = frameCount - 30;
  }
}

function updateMysteryShip() {
  if (!mysteryShip) return;
  mysteryShip.x += mysteryShip.dir * 2;
  if (frameCount - lastUfoHumFrame >= 24) {
    playUfoMoveSound();
    lastUfoHumFrame = frameCount;
  }
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

function checkCollisions() {
  // プレイヤー弾 vs エイリアン
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    let hit = false;
    for (let alien of aliens) {
      if (!alien.alive) continue;
      if (b.x >= alien.x && b.x <= alien.x + alien.width &&
          b.y >= alien.y && b.y <= alien.y + alien.height) {
        alien.alive = false;
        hit = true;
        createExplosion(alien.x + alien.width/2, alien.y + alien.height/2, alien.color);
        playInvaderHitSound();
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
      playUfoHitSound();
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
  if (soundEl) soundEl.textContent = `SOUND: ${soundEnabled ? 'ON' : 'OFF'}`;
  livesEl.textContent = `LIVES: ${lives}`;
}

function startGame() {
  ensureAudioRunning();
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
      playShotSound();
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
  if ((e.key === 's' || e.key === 'S') && !e.repeat) {
    soundEnabled = !soundEnabled;
    ensureAudioRunning();
    updateUI();
  }
  if ((gameState === 'start' || gameState === 'gameover') && e.key === ' ') {
    ensureAudioRunning();
    startGame();
  }
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

canvas.addEventListener('click', () => {
  ensureAudioRunning();
  if (gameState === 'start' || gameState === 'gameover') {
    startGame();
  }
});

updateUI();
requestAnimationFrame(gameLoop);
