let c = document.getElementById("canvas");

// set canvas width to page width
c.width = window.innerWidth * 0.9;
c.height = window.innerHeight * 0.8;

let ctx = c.getContext("2d");
ctx.lineWidth = 0.5;
const CIRCLE_SIZE = 6;
const NUM_CIRCLES = 10;
const FORCE = 1;
const DAMPING = 0.5;
const TOWARDS_CENTER = 10;
const TOWARDS_CENTER_DAMP = 0.6;
const SPRING = 0.05;
const SPRING_LEN = 200;
const SPRING_DAMPEN = 0.4;
const STOP_SPIN = 0.01;
const MAX_SPEED = 300;
const DEBUG = false;

let avg_vx_acc = 0;
let avg_vy_acc = 0;

// Get canvas width
const BOUNDS_X = c.width;
const BOUNDS_Y = c.height;
function forDrawY(y) {
  return BOUNDS_Y - y;
}
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
    this.spring1_acc = 0;
    this.spring2_acc = 0;
  }

  dirToTarget() {
    const link1 = items[this.link1];
    const link2 = items[this.link2];
    const dy = link2.y - link1.y;
    const dx = link2.x - link1.x;
    const angle = Math.atan2(dy, dx);
    const r = Math.sqrt(dy ** 2 + dx ** 2);
    const x1 = link1.x + r * Math.cos(angle + Math.PI / 3);
    const y1 = link1.y + r * Math.sin(angle + Math.PI / 3);
    const x2 = link1.x + r * Math.cos(angle - Math.PI / 3);
    const y2 = link1.y + r * Math.sin(angle - Math.PI / 3);
    const dist_1 = (x1 - this.x) ** 2 + (y1 - this.y) ** 2;
    const dist_2 = (x2 - this.x) ** 2 + (y2 - this.y) ** 2;

    const x = dist_1 < dist_2 ? x1 : x2;
    const y = dist_1 < dist_2 ? y1 : y2;

    if (DEBUG && this.pos == 0) {
      ctx.beginPath();
      ctx.arc(x, forDrawY(y), 2, 0, 2 * Math.PI);
      ctx.stroke();
    }

    const dir_x = x - this.x;
    const dir_y = y - this.y;

    return [dir_x, dir_y];
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, forDrawY(this.y), CIRCLE_SIZE, 0, 2 * Math.PI);
    if (DEBUG && this.pos == 0) {
      ctx.fillStyle = "#00FF00";
    } else {
      ctx.fillStyle = "#000000";
    }
    ctx.fill();

    ctx.strokeStyle = "#5F0000";
    ctx.beginPath();

    for (let link of [this.link1, this.link2]) {
      ctx.moveTo(this.x, forDrawY(this.y));
      ctx.lineTo(
        (items[link].x - this.x) / 3 + this.x,
        forDrawY((items[link].y - this.y) / 3 + this.y)
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
}

function updatePosition(elapsed) {
  for (let i = 0; i < NUM_CIRCLES; i++) {
    const item = items[i];
    const dirToTarget = item.dirToTarget();
    item.vx += dirToTarget[0] * FORCE;
    item.vy += dirToTarget[1] * FORCE;

    const link1 = items[item.link1];
    const dx = link1.x - item.x;
    const dy = link1.y - item.y;
    const dist = Math.sqrt(dx ** 2 + dy ** 2);
    const error_in_dist = dist - SPRING_LEN;
    item.spring1_acc *= SPRING_DAMPEN;
    item.spring1_acc += error_in_dist * SPRING;
    item.vx += dx * item.spring1_acc;
    item.vy += dy * item.spring1_acc;

    const link2 = items[item.link2];
    const dx2 = link2.x - item.x;
    const dy2 = link2.y - item.y;
    const dist2 = Math.sqrt(dx2 ** 2 + dy2 ** 2);
    const error_in_dist2 = dist2 - SPRING_LEN;
    item.spring2_acc *= SPRING_DAMPEN;
    item.spring2_acc += error_in_dist2 * SPRING;
    item.vx += dx2 * item.spring2_acc;
    item.vy += dy2 * item.spring2_acc;
    
    if (DEBUG && item.pos == 0) {
        console.log(dist, item.spring1_acc);
    }
  }

  const avg_x = items.reduce((acc, item) => acc + item.x, 0) / NUM_CIRCLES;
  const avg_y = items.reduce((acc, item) => acc + item.y, 0) / NUM_CIRCLES;
  const avg_vx = items.reduce((acc, item) => acc + item.vx, 0) / NUM_CIRCLES;
  const avg_vy = items.reduce((acc, item) => acc + item.vy, 0) / NUM_CIRCLES;

  const offset_x = (avg_x - BOUNDS_X / 2) * TOWARDS_CENTER;
  const offset_y = (avg_y - BOUNDS_Y / 2) * TOWARDS_CENTER;
  avg_vx_acc *= TOWARDS_CENTER_DAMP;
  avg_vy_acc *= TOWARDS_CENTER_DAMP;
  avg_vx_acc += offset_x;
  avg_vy_acc += offset_y;
  for (const item of items) {
    item.vx -= avg_vx_acc;
    item.vy -= avg_vy_acc;
  }

  if (DEBUG) {
    ctx.beginPath();
    ctx.arc(avg_x, forDrawY(avg_y), 2, 0, 2 * Math.PI);
    ctx.arc(BOUNDS_X / 2, forDrawY(BOUNDS_Y / 2), 2, 0, 2 * Math.PI);
    ctx.fill();
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

//   console.log(moment, anti_spin);

  for (const item of items) {
    item.vx *= DAMPING;
    item.vy *= DAMPING;
    item.vx = Math.min(item.vx, MAX_SPEED);
    item.vy = Math.min(item.vy, MAX_SPEED);
    item.x += item.vx * elapsed;
    item.y += item.vy * elapsed;
  }
}

let previousTime;

function step(timeStamp) {
  const elapsed = timeStamp - previousTime;
  if (previousTime !== undefined) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePosition(elapsed / 1000);
    for (const item of items) {
      item.draw();
    }
  } else {
    previousTime = timeStamp;
    requestAnimationFrame(step);
  }
  previousTime = timeStamp;
  requestAnimationFrame(step);
}

setup();
requestAnimationFrame(step);
