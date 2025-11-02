const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const FIELD_W = canvas.width;
const FIELD_H = canvas.height;
const PLAYER_RADIUS = 10;
const PLAYER_AREA = FIELD_W * 0.35;

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
        orbit: Array.from({length: layer * 3}, (_,i)=>({angle: (i*2+(i>3)) * Math.PI/3})), layer, rotation: Math.random() < 0.5 ? 1 : -1, ref: 0
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
        b.ref ++;
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
        if (b.shootTimer % (300 - difficulty*5) === 0) {
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
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
    ctx.fillStyle = b.color;
    ctx.fill();
    // ORBIT弾の小弾
    if (b.type === BULLET_TYPES.ORBIT) {
      for (let i = 0; i < b.orbit.length; i++) {
        let angle = b.orbit[i].angle;
        let dist = b.layer === 2 ? 100 + (i>=3?100:0) : 100;
        let ox = b.x + Math.cos(angle) * dist;
        let oy = b.y + Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, 2 * Math.PI);
        ctx.fillStyle = BULLET_COLORS[5];
        ctx.fill();
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

// プレイヤー描画
function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
}

// 当たり判定
function checkCollision() {
  for (let b of bullets) {
    // ORBIT弾の小弾
    if (b.type === BULLET_TYPES.ORBIT) {
      for (let i = 0; i < b.orbit.length; i++) {
        let angle = b.orbit[i].angle;
        let dist = b.layer === 2 ? 100 + (i>=3?100:0) : 100;
        let ox = b.x + Math.cos(angle) * dist;
        let oy = b.y + Math.sin(angle) * dist;
        let dx = player.x - ox, dy = player.y - oy;
        if (dx*dx + dy*dy < (PLAYER_RADIUS+6)**2) player.alive = false;
      }
    }
    // 他弾
    let dx = player.x - b.x, dy = player.y - b.y;
    if (dx*dx + dy*dy < (PLAYER_RADIUS+b.r)**2) player.alive = false;
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
    ctx.fillRect(0,0,FIELD_W,FIELD_H);
    ctx.fillStyle = "#fff";
    ctx.font = "36px cursive";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", FIELD_W/2, FIELD_H/2 - 40);
    ctx.font = "20px cursive";
    ctx.fillText(`生存時間: ${(time/60).toFixed(1)}秒`, FIELD_W/2, FIELD_H/2);
    ctx.fillText(`ハイスコア: ${(hs/60).toFixed(1)}秒`, FIELD_W/2, FIELD_H/2+40);
    restartBtn.style.display = "block";
    return;
  }
  restartBtn.style.display = "none";
  ctx.clearRect(0,0,FIELD_W,FIELD_H);
  // 左側エリア
  ctx.fillStyle = "#333";
  ctx.fillRect(0,0,PLAYER_AREA,FIELD_H);
  drawPlayer();
  drawBullets();
  for (let i = 0; i < 5; i ++) {
    updateBullets();
    checkCollision();
  }
  updateDifficulty();
  // 弾生成
  if (time % spawnInterval === 0) spawnBullet();
  // 壁
  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,FIELD_W,4);
  ctx.fillRect(0,FIELD_H-4,FIELD_W,4);
  requestAnimationFrame(loop);
}

loop();
