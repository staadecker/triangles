let c = document.getElementById("canvas");
let ctx = c.getContext("2d");
ctx.lineWidth = 0.5;
const CIRCLE_SIZE = 6;
const NUM_CIRCLES = 4;
const FORCE = 1;
const DAMPING = 0.5;
const TOWARDS_CENTER = 1;
const SPRING = 0.01;
const SPRING_LEN = 100;
const STOP_SPIN = 0.01;

// Get canvas width
const BOUNDS_X = c.width;
const BOUNDS_Y = c.height;
const INNER_BOUNDS = 0.5;

const items = [];
let anti_spin = 0;

let mouseX = 0;
window.addEventListener("mousemove", function (event) {
  var rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
});

class Triangle {
  constructor(pos) {
    this.x = getRandomInBounds(BOUNDS_X);
    this.y = getRandomInBounds(BOUNDS_Y);
    this.link1 = Math.floor(Math.random() * (NUM_CIRCLES - 1));
    this.link2 = Math.floor(Math.random() * (NUM_CIRCLES - 2));
    if (this.link1 >= pos) {
      this.link1++;
    }
    if (this.link2 >= pos) {
      this.link2++;
    }
    if (this.link2 >= this.link1) {
      this.link2++;
      if (this.link2 == pos) {
        this.link2++;
      }
    }
    this.vx = 0;
    this.vy = 0;
    this.pos = pos;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, CIRCLE_SIZE, 0, 2 * Math.PI);
    if (this.pos == 0) {
      ctx.fillStyle = "#00FF00";
    } else {
      ctx.fillStyle = "#000000";
    }
    ctx.fill();

    ctx.strokeStyle = "#5F0000";
    ctx.beginPath();
    // get mouse x position

    for (let link of [this.link1, this.link2]) {
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        (items[link].x - this.x) / 3 + this.x,
        (items[link].y - this.y) / 3 + this.y
      );
    }

    ctx.stroke();
  }
}

function getRandomInBounds(bound) {
  return ((Math.random() - 0.5) * INNER_BOUNDS + 0.5) * bound;
}

function setup() {
  for (let i = 0; i < NUM_CIRCLES; i++) {
    items.push(new Triangle(i));
  }
  draw();
}

function draw() {
  for (const item of items) {
    item.draw();
  }
}

function getTargets() {
  let targets = [];
  for (let i = 0; i < NUM_CIRCLES; i++) {
    const node = items[i];
    const link1 = items[node.link1];
    const link2 = items[node.link2];
    const dy = link2.y - link1.y;
    const dx = link2.x - link1.x;
    const angle = Math.atan2(dy, dx);
    const r = Math.sqrt(dy ** 2 + dx ** 2);
    const x1 = link1.x + r * Math.cos(angle + Math.PI / 3);
    const y1 = link1.y + r * Math.sin(angle + Math.PI / 3);
    const x2 = link1.x + r * Math.cos(angle - Math.PI / 3);
    const y2 = link1.y + r * Math.sin(angle - Math.PI / 3);
    const dist_1 = (x1 - node.x) ** 2 + (y1 - node.y) ** 2;
    const dist_2 = (x2 - node.x) ** 2 + (y2 - node.y) ** 2;

    const x = dist_1 < dist_2 ? x1 : x2;
    const y = dist_1 < dist_2 ? y1 : y2;
    targets.push([x, y]);
  }
  return targets;
}

function updatePosition(elapsed) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const targets = getTargets();
  for (let i = 0; i < NUM_CIRCLES; i++) {
    const item = items[i];
    const dir_x = targets[i][0] - item.x;
    const dir_y = targets[i][1] - item.y;
    item.vx = -item.vx * DAMPING + dir_x * FORCE;
    item.vy = -item.vy * DAMPING + dir_y * FORCE;

    for (const link in [item.link1, item.link2]) {
      const linkItem = items[link];
      const dx = item.x - linkItem.x;
      const dy = item.y - linkItem.y;
      const dist = Math.sqrt(dx ** 2 + dy ** 2);
      item.vx -= dx * (dist - SPRING_LEN) * SPRING;
      item.vy -= dy * (dist - SPRING_LEN) * SPRING;
    }
  }

  const avg_x = items.reduce((acc, item) => acc + item.x, 0) / NUM_CIRCLES;
  const avg_y = items.reduce((acc, item) => acc + item.y, 0) / NUM_CIRCLES;
  const avg_vx = items.reduce((acc, item) => acc + item.vx, 0) / NUM_CIRCLES;
  const avg_vy = items.reduce((acc, item) => acc + item.vy, 0) / NUM_CIRCLES;

  ctx.beginPath();
  ctx.arc(avg_x, avg_y, 2, 0, 2 * Math.PI);
  ctx.fill();

  const correct_x = (BOUNDS_X / 2 - avg_x) * TOWARDS_CENTER;
  const correct_y = (BOUNDS_Y / 2 - avg_y) * TOWARDS_CENTER;
  for (const item of items) {
    item.vx += correct_x;
    item.vy += correct_y;
  }

  let moment = 0;
  for (let i = 0; i < NUM_CIRCLES; i++) {
    const item = items[i];
    const dx = item.x - avg_x;
    const dy = item.y - avg_y;
    const dvx = item.vx - avg_vx;
    const dvy = item.vy - avg_vy;
    
    const radius = Math.sqrt(dx ** 2 + dy ** 2);
    const speed = Math.sqrt(dvx ** 2 + dvy ** 2);
    const arm_angle = Math.atan2(dy, dx);
    const speed_angle = Math.atan2(dvy, dvx);
    const radial_velocity = speed * Math.sin(arm_angle - speed_angle);
    if (i == 0) {
        // console.log(radius, speed, arm_angle * 180 / Math.PI, speed_angle * 180 / Math.PI, radial_velocity);
    }
    item.vx -= Math.cos(arm_angle) * anti_spin * radius;
    item.vy -= Math.sin(arm_angle) * anti_spin * radius;
    moment += radial_velocity / radius;
  }
  moment /= NUM_CIRCLES;

  anti_spin -= moment * STOP_SPIN;

  console.log(moment, anti_spin);

  for (const item of items) {
    item.x += item.vx * elapsed;
    item.y += item.vy * elapsed;
  }
}

let previousTime;

function step(timeStamp) {
  const elapsed = timeStamp - previousTime;
  if (previousTime !== undefined) {
    updatePosition(elapsed / 1000);
    draw();
  } else {
    previousTime = timeStamp;
    requestAnimationFrame(step);
  }
  previousTime = timeStamp;
  requestAnimationFrame(step);
}

setup();
requestAnimationFrame(step);
