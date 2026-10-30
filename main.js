const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const FIELD_W = canvas.width;
const FIELD_H = canvas.height;
const PLAYER_RADIUS = 10;
const PLAYER_AREA = FIELD_W * 0.35;
const GRID_SIZE = PLAYER_AREA / 8;

let player = { x: PLAYER_AREA / 2, y: FIELD_H / 2, alive: true };

let pointerActive = false;

// 弾の種類
const BULLET_TYPES = {
  NORMAL: 0,
  ORBIT: 1,
  SHOOTER: 2,
  BOOST: 3,
  FAN: 4,
};

const BULLET_COLORS = [
  "#ff4444", // NORMAL
  "#44aaff", // ORBIT
  "#ffff44", // SHOOTER
  "#44ff44", // BOOST
  "#ff44ff", // FAN
  "#aaaaff", // 小弾
];

let bullets = [];
let time = 0;
let spawnInterval = 60;
let difficulty = 1;

// プレイヤー操作
document.children[0].addEventListener('pointermove', e => {
  if (e.pointerType !== "mouse") return;
  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  // 左側のみ
  if (x > PLAYER_AREA) x = PLAYER_AREA;
  if (x < PLAYER_RADIUS) x = PLAYER_RADIUS;
  if (y < PLAYER_RADIUS) y = PLAYER_RADIUS;
  if (y > FIELD_H - PLAYER_RADIUS) y = FIELD_H - PLAYER_RADIUS;
  player.x = x;
  player.y = y;
});

// 弾生成
function spawnBullet() {
  // 難易度で種類・量増加
  let types = [BULLET_TYPES.NORMAL];
  if (difficulty > 1) types.push(BULLET_TYPES.ORBIT);
  if (difficulty > 2) types.push(BULLET_TYPES.SHOOTER);
  if (difficulty > 3) types.push(BULLET_TYPES.BOOST);
  if (difficulty > 4) types.push(BULLET_TYPES.FAN);

  let type = types[Math.floor(Math.random() * types.length)];
  let y = Math.random() * (FIELD_H - 40) + 20;
  let angle = Math.random() * Math.PI - Math.PI / 2; // 左向きのみ
  let speed = 4 + Math.random() * difficulty;

  switch (type) {
    case BULLET_TYPES.NORMAL:
      bullets.push({
        type, x: FIELD_W - 20, y, vx: -speed * Math.cos(angle), vy: speed * Math.sin(angle), r: 10, color: BULLET_COLORS[type], ref: 0
      });
      break;
    case BULLET_TYPES.ORBIT:
      let layer = Math.random() < 0.5 ? 1 : 2;
      bullets.push({
        type, x: FIELD_W - 30, y, vx: -speed * Math.cos(angle), vy: speed * Math.sin(angle), r: 10, color: BULLET_COLORS[type],
        orbit: Array.from({ length: layer * 3 }, (_, i) => ({ angle: (i * 2 + (i > 3)) * Math.PI / 3 })), layer, rotation: Math.random() < 0.5 ? 1 : -1, ref: 0
      });
      break;
    case BULLET_TYPES.SHOOTER:
      bullets.push({
        type, x: FIELD_W - 30, y, vx: -speed * Math.cos(angle), vy: speed * Math.sin(angle), r: 10, color: BULLET_COLORS[type],
        shootTimer: 0, ref: 0
      });
      break;
    case BULLET_TYPES.BOOST:
      bullets.push({
        type, x: FIELD_W - 30, y, vx: -speed * Math.cos(angle), vy: speed * Math.sin(angle), r: 10, color: BULLET_COLORS[type],
        stopTimer: 0, boosted: false, ref: 0
      });
      break;
    case BULLET_TYPES.FAN:
      bullets.push({
        type, x: FIELD_W - 30, y, vx: -speed * Math.cos(angle), vy: speed * Math.sin(angle), r: 10, color: BULLET_COLORS[type],
        fanTimer: 0, fanShot: false, fanAngle: angle, ref: 0
      });
      break;
  }
}

// 小弾生成
function spawnSmallBullet(x, y, angle, speed = 3) {
  bullets.push({
    type: "small", x, y, vx: -speed * Math.cos(angle), vy: speed * Math.sin(angle), r: 8, color: BULLET_COLORS[5]
  });
}

// 弾更新
function updateBullets() {
  for (let b of bullets) {
    function reflect() {
      if (b.ref < 5) {
        b.vy *= -1;
        b.ref++;
      }
    }

    // 壁反射
    if (b.y < b.r && b.vy < 0) reflect();
    if (b.y > FIELD_H - b.r && b.vy > 0) reflect();

    // 右側に飛ばない
    if (b.vx > 0) b.vx = -Math.abs(b.vx);

    switch (b.type) {
      case BULLET_TYPES.NORMAL:
        b.x += b.vx / 5;
        b.y += b.vy / 5;
        break;
      case BULLET_TYPES.ORBIT:
        b.x += b.vx / 5;
        b.y += b.vy / 5;
        // 小弾の回転
        for (let i = 0; i < b.orbit.length; i++) {
          b.orbit[i].angle += 0.002 * b.rotation;
        }
        break;
      case BULLET_TYPES.SHOOTER:
        b.x += b.vx / 5;
        b.y += b.vy / 5;
        b.shootTimer++;
        if (b.shootTimer % (300 - difficulty * 5) === 0) {
          let angle = Math.random() * Math.PI - Math.PI / 2;
          spawnSmallBullet(b.x, b.y, angle, 3.5 + difficulty);
        }
        break;
      case BULLET_TYPES.BOOST:
        if (!b.boosted) {
          if (b.stopTimer === 0) {
            b.x += b.vx / 5;
            b.y += b.vy / 5;
          }
          console.log(b)
          if (b.x < PLAYER_AREA * 1.3) b.stopTimer++;
          if (b.stopTimer > 80) {
            let dx = player.x - b.x;
            let dy = player.y - b.y;
            let d = Math.sqrt(dx ** 2 + dy ** 2);
            b.vx = b.ax = dx / d;
            b.vy = b.ay = dy / d;
            b.boosted = true;
          }
        } else {
          b.vx += b.ax / 10;
          b.vy += b.ay / 10;
          b.x += b.vx / 5;
          b.y += b.vy / 5;
        }
        break;
      case BULLET_TYPES.FAN:
        b.x += b.vx / 5;
        b.y += b.vy / 5;
        b.fanTimer++;
        if (!b.fanShot && b.fanTimer > 40) {
          for (let i = -2; i <= 2; i++) {
            let angle = b.fanAngle + i * 0.15;
            spawnSmallBullet(b.x, b.y, angle, 3.2 + difficulty * 0.5);
          }
          b.fanShot = true;
        }
        break;
      case "small":
        b.x += b.vx / 5;
        b.y += b.vy / 5;
        break;
    }
  }
  // 小弾の寿命
  bullets = bullets.filter(b => b.x > -30 && b.x < FIELD_W + 30 && b.y > -30 && b.y < FIELD_H + 30);
}

// 弾描画
function drawBullets() {
  for (let b of bullets) {
    drawBullet(b.x, b.y, b.r, b.color);

    // ORBIT弾の小弾
    if (b.type === BULLET_TYPES.ORBIT) {
      for (let i = 0; i < b.orbit.length; i++) {
        let angle = b.orbit[i].angle;
        let dist = b.layer === 2 ? 100 + (i >= 3 ? 100 : 0) : 100;
        let ox = b.x + Math.cos(angle) * dist;
        let oy = b.y + Math.sin(angle) * dist;

        drawBullet(ox, oy, 8, BULLET_COLORS[5], false);
      }
    }
    if (b.type === BULLET_TYPES.BOOST) {
      if (!b.boosted) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 15, -Math.PI / 2, Math.PI * (b.stopTimer - 20) / 40);
        ctx.strokeStyle = BULLET_COLORS[3];
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }
}

function drawBullet(x, y, r, color, detailed = true) {
  // 1. 外側の発光。描画専用で、当たり判定には影響しない
  const glowRadius = r * 3.2;
  const glow = ctx.createRadialGradient(
    x, y, 0,
    x, y, glowRadius
  );
  glow.addColorStop(0, color + "38");
  glow.addColorStop(0.35, color + "18");
  glow.addColorStop(1, color + "00");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. 細いリング
  if (detailed) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = color + "99";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3. 中心の丸。半径 b.r は変更しない
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // 4. 小さなハイライト
  if (detailed) {
    ctx.beginPath();
    ctx.arc(
      x - r * 0.25,
      y - r * 0.25,
      Math.max(1, r * 0.2),
      0, Math.PI * 2
    );
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fill();
  }
}

// プレイヤー描画
function drawPlayer() {
  const color = "#8AF9FF";

  // 広く、弱い発光
  const glow = ctx.createRadialGradient(
    player.x, player.y, 0, player.x, player.y, PLAYER_RADIUS * 4
  );
  glow.addColorStop(0, "#65F5FF44");
  glow.addColorStop(1, "#65F5FF00");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS * (4 + Math.sin(time / 30)), 0, Math.PI * 2);
  ctx.fill();

  // 外側のリング
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#C2FCFF";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // プレイヤー本体
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // 白いハイライト
  ctx.beginPath();
  ctx.arc(player.x - 2, player.y - 2, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, FIELD_H, FIELD_H);
  g.addColorStop(0, "#080D18");
  g.addColorStop(0.5, "#101A2B");
  g.addColorStop(1, "#080D18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  // ごく薄いグリッド
  ctx.strokeStyle = "rgba(130, 160, 200, 0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= FIELD_H; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }

  // 中央の控えめな光
  const glow = ctx.createRadialGradient(
    FIELD_W / 2, FIELD_H / 2, 10, FIELD_W / 2, FIELD_H / 2, FIELD_W * 0.55
  );
  glow.addColorStop(0, "rgba(45, 90, 145, 0.09)");
  glow.addColorStop(1, "rgba(8, 13, 24, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
}

// 当たり判定
function checkCollision() {
  for (let b of bullets) {
    // ORBIT弾の小弾
    if (b.type === BULLET_TYPES.ORBIT) {
      for (let i = 0; i < b.orbit.length; i++) {
        let angle = b.orbit[i].angle;
        let dist = b.layer === 2 ? 100 + (i >= 3 ? 100 : 0) : 100;
        let ox = b.x + Math.cos(angle) * dist;
        let oy = b.y + Math.sin(angle) * dist;
        let dx = player.x - ox, dy = player.y - oy;
        if (dx * dx + dy * dy < (PLAYER_RADIUS + 6) ** 2) player.alive = false;
      }
    }
    // 他弾
    let dx = player.x - b.x, dy = player.y - b.y;
    if (dx * dx + dy * dy < (PLAYER_RADIUS + b.r) ** 2) player.alive = false;
  }
}

// 難易度調整
function updateDifficulty() {
  time++;
  if (time % 600 === 0 && difficulty < 5) difficulty++;
  spawnInterval = Math.max(20, 60 - difficulty * 7);
}

const restartBtn = document.getElementById('restartBtn');

restartBtn.addEventListener('click', () => {
  // 初期化
  player = { x: PLAYER_AREA / 2, y: FIELD_H / 2, alive: true };
  bullets = [];
  time = 0;
  difficulty = 1;
  restartBtn.style.display = "none";
  loop();
});
// メインループ
function loop() {
  if (!player.alive) {
    let hs = localStorage.getItem("highscore") || 0;
    if (hs < time) {
      localStorage.setItem("highscore", hs = time);
    }
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    ctx.fillStyle = "#fff";
    ctx.font = "36px cursive";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", FIELD_W / 2, FIELD_H / 2 - 40);
    ctx.font = "20px cursive";
    ctx.fillText(`生存時間: ${(time / 60).toFixed(1)}秒`, FIELD_W / 2, FIELD_H / 2);
    ctx.fillText(`ハイスコア: ${(hs / 60).toFixed(1)}秒`, FIELD_W / 2, FIELD_H / 2 + 40);
    restartBtn.style.display = "block";
    return;
  }
  restartBtn.style.display = "none";
  ctx.clearRect(0, 0, FIELD_W, FIELD_H);
  //背景
  drawBackground();
  // 左側エリア
  ctx.strokeStyle = "#FF70D822";
  ctx.lineWidth = 15;
  ctx.shadowColor = "#FF70D8";
  ctx.shadowBlur = 45;
  ctx.beginPath();
  ctx.moveTo(PLAYER_AREA, 0);
  ctx.lineTo(PLAYER_AREA, FIELD_H);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = "#EEB0FC66";
  ctx.lineWidth = 6;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(PLAYER_AREA, 0);
  ctx.lineTo(PLAYER_AREA, FIELD_H);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = "#FFD9F6";
  ctx.lineWidth = 3;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.moveTo(PLAYER_AREA, 0);
  ctx.lineTo(PLAYER_AREA, FIELD_H);
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;
  drawPlayer();
  drawBullets();
  for (let i = 0; i < 5; i++) {
    updateBullets();
    checkCollision();
  }
  updateDifficulty();
  // 弾生成
  if (time % spawnInterval === 0) spawnBullet();
  requestAnimationFrame(loop);
}

loop();
