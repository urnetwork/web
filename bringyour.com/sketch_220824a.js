
var CONTAINER_ID = null; 
let LOGO_S0 = 60;
let LOGO_S1 = 400;
//S3_MIN = 20;
let WORDMARK = 'BringYour';

let FONT_SIZE = 18;
let EMPH = 3;

let A_MODE = 0;

let s3min = 0;


let cycleTime = 10000;
let arkitechFont;


function windowResized() {
  if (2 == A_MODE) {
    resizeCanvas(LOGO_S1, min(LOGO_S1, windowHeight));
  }
}


function setup() {
  arkitechFont = loadFont('res/fonts/Arkitech-Light.ttf');
  
  let canvas = createCanvas(LOGO_S1, min(LOGO_S1, windowHeight));
  if (null != CONTAINER_ID) {
    canvas.parent(CONTAINER_ID);
  }
  frameRate(60);
  
}


function draw() {
  if (0 == A_MODE || 2 == A_MODE) {
    // fix to only render on demand
    frameRate(0);
  }
  
  let u;
  
  let h0 = LOGO_S0;
  let h1 = LOGO_S1;
  
  if (1 == A_MODE) {
    let c = millis() % (2 * cycleTime);
    
    if (c < cycleTime) {
      u = c / cycleTime;
    } else {
      u = (2 * cycleTime - c) / cycleTime;
    }
    u = 1 - u
  } else {
    u = map(max(min(min(width, height), h1), h0), h0, h1, 0, 1);
  }
  
  let k0 = 0.3;
  let k1 = 0.8;
  
  if (0 == s3min) {
    textFont(arkitechFont);
    textSize(FONT_SIZE);
    s3min = textWidth(WORDMARK) / 8;
  }
  
  clear();
  
  
  let h = lerp(h0, h1, u);
  //stroke(color(0, 0, 0));
  //noFill();
  //rectMode(CORNERS);
  //rect(0, 0, LOGO_S1, h);
  
  
  
  if (k1 < u) {
    let v = (u - k1) / (1 - k1);
    draw0(0, 0, h1, h, 1 - v);
  } else if (k0 < u) {
    let v = (u - k0) / (k1 - k0);
    draw1(0, 0, h1, h, 1 - v);
  } else {
    let v = u / k0;
    draw2(0, 0, h1, h, lerp(h0, h1, k0), 1 - v);
  }
  
}


function draw0(x0, y0, x1, y1, u) {
  // 0->1
  
  textFont(arkitechFont);
  textSize(FONT_SIZE);
  
  let a = lerp(0, PI, u);
  
  ellipseMode(CENTER);
  let th = 40;
  let p = 20;
  
  //let s3min = textWidth(WORDMARK) / 8;
  //console.log(textSize(WORDMARK));
  let s = max(
    min(x1 - x0, y1 - y0) - th - p,
    s3min * 2 / 0.414214
  );
  let s2 = 0.414214 * s;
  let s3 = s2 / 2.0;
  
  
  let cx = (x1 - x0) / 2.0;
  let cy = (y1 - y0) / 2.0 - th / 2.0;
  
  
  noFill();
  strokeWeight(1);
  stroke(lerpColor(color(220, 220, 220, 255), color(220, 220, 220, 0), u));
  ellipse(cx, cy, s, s);
  
  
  
  
  
  
  
  
  strokeWeight(1);
  stroke(lerpColor(color(220, 220, 220), color(0, 0, 0), u));
  
  //let yoff = 0.292893 * s / 2;
  ellipse(cx + s2 / 2.0, cy - s2 / 2.0, s2, s2);
  ellipse(cx + s2 / 2.0, cy + s2 / 2.0, s2, s2);
  ellipse(cx - s2 / 2.0, cy - s2 / 2.0, s2, s2);
  ellipse(cx - s2 / 2.0, cy + s2 / 2.0, s2, s2);
  
  
  
  stroke(lerpColor(color(0, 0, 0, 255), color(220, 220, 220, 0), u));
  strokeWeight(lerp(EMPH, 1, u));
  arc(cx, cy, s, s, PI, 1.5 * PI);
  
  
  
  //fill(color(220, 220, 220));
  
  
  
  
  stroke(lerpColor(color(220, 220, 220, 0), color(0, 0, 0, 255), u));
  strokeWeight(1);
  ellipse(cx + s2 / 2.0 + cos(a) * s3 / 2.0, cy - s2 / 2.0 + sin(a) * s3 / 2.0, s3, s3);
  ellipse(cx + s2 / 2.0 - cos(a) * s3 / 2.0, cy - s2 / 2.0 - sin(a) * s3 / 2.0, s3, s3);
  
  
  
  ellipse(cx + s2 / 2.0 + cos(a) * s3 / 2.0, cy + s2 / 2.0 + sin(a) * s3 / 2.0, s3, s3);
  ellipse(cx + s2 / 2.0 - cos(a) * s3 / 2.0, cy + s2 / 2.0 - sin(a) * s3 / 2.0, s3, s3);
  
  
  
  
  ellipse(cx - s2 / 2.0 + cos(a) * s3 / 2.0, cy + s2 / 2.0 + sin(a) * s3 / 2.0, s3, s3);
  ellipse(cx - s2 / 2.0 - cos(a) * s3 / 2.0, cy + s2 / 2.0 - sin(a) * s3 / 2.0, s3, s3);
  
  
  
  
  stroke(color(0, 0, 0));
  
  strokeWeight(lerp(EMPH, 1, u));
  ellipse(cx - s2 / 2.0 + cos(a) * s3 / 2.0, cy - s2 / 2.0 + sin(a) * s3 / 2.0, s3, s3);
  ellipse(cx - s2 / 2.0 - cos(a) * s3 / 2.0, cy - s2 / 2.0 - sin(a) * s3 / 2.0, s3, s3);
  
  
  
  stroke(lerpColor(color(0, 0, 0, 255), color(220, 220, 220, 0), u));
  ellipse(cx - s2 / 2.0 - sin(a) * s3 / 2.0, cy - s2 / 2.0 + cos(a) * s3 / 2.0, s3, s3);
  ellipse(cx - s2 / 2.0 + sin(a) * s3 / 2.0, cy - s2 / 2.0 - cos(a) * s3 / 2.0, s3, s3);
  
  
  strokeWeight(1);
  
  textAlign(CENTER, CENTER);
  noStroke();
  fill(color(0, 0, 0));
  textFont(arkitechFont);
  textSize(FONT_SIZE);
  text(WORDMARK, (x1 - x0) / 2.0, y1 - 20);
}


function draw1(x0, y0, x1, y1, u) {
  // 1->2
  
  textFont(arkitechFont);
  textSize(FONT_SIZE);
  
  ellipseMode(CENTER);
  let th = 40;
  let p = 20;
  //let s3min = textWidth(WORDMARK) / 8;
  let s = max(
    min(x1 - x0, y1 - y0) - th - p,
    s3min * 2 / 0.414214
  );
  let s2 = 0.414214 * s;
  let s3 = s2 / 2.0;
  
  
  let cx = (x1 - x0) / 2.0;
  let cy = (y1 - y0) / 2.0 - th / 2.0;
  //ellipse(cx, cy, s, s);

  
  let xoff0 = lerp(0, 0.5 * s2, u);
  let xoff1 = lerp(0, -s2, u);
  let xoff2 = lerp(0, s2, u);
  let xoff3 = lerp(0, -0.5 * s2, u);
  
  noFill();
  stroke(color(0, 0, 0, lerp(255, 0, u)));
  ellipse(xoff2 + cx + s2 / 2.0, cy - s2 / 2.0, s2, s2);
  ellipse(xoff3 + cx + s2 / 2.0, cy + s2 / 2.0, s2, s2);
  ellipse(xoff0 + cx - s2 / 2.0, cy - s2 / 2.0, s2, s2);
  ellipse(xoff1 + cx - s2 / 2.0, cy + s2 / 2.0, s2, s2);
  
  stroke(color(0, 0, 0));
  
  //fill(color(220, 220, 220));
  ellipse(xoff2 + cx + s2 / 2.0 + s3 / 2.0, cy - s2 / 2.0, s3, s3);
  ellipse(xoff2 + cx + s2 / 2.0 - s3 / 2.0, cy - s2 / 2.0, s3, s3);
  
  ellipse(xoff3 + cx + s2 / 2.0 + s3 / 2.0, cy + s2 / 2.0, s3, s3);
  ellipse(xoff3 + cx + s2 / 2.0 - s3 / 2.0, cy + s2 / 2.0, s3, s3);
  
  ellipse(xoff0 + cx - s2 / 2.0 + s3 / 2.0, cy - s2 / 2.0, s3, s3);
  ellipse(xoff0 + cx - s2 / 2.0 - s3 / 2.0, cy - s2 / 2.0, s3, s3);
  
  ellipse(xoff1 + cx - s2 / 2.0 + s3 / 2.0, cy + s2 / 2.0, s3, s3);
  ellipse(xoff1 + cx - s2 / 2.0 - s3 / 2.0, cy + s2 / 2.0, s3, s3);
  
  
  
  textAlign(CENTER, CENTER);
  noStroke();
  fill(color(0, 0, 0));
  textFont(arkitechFont);
  textSize(FONT_SIZE);
  text(WORDMARK, (x1 - x0) / 2.0, y1 - 20);
}

function draw2(x0, y0, x1, y1, y1t, u) {
  // 2->3
  
  textFont(arkitechFont);
  textSize(FONT_SIZE);
  
  ellipseMode(CENTER);
  let th = 40;
  let p = 20;
  //let s3min = textWidth(WORDMARK) / 8;
  let s = max(
    min(x1 - x0, y1 - y0) - th - p,
    s3min * 2 / 0.414214
  );
  let s2 = 0.414214 * s;
  let s3 = s2 / 2.0;
  
  
  let cx = (x1 - x0) / 2.0;
  let cy = (y1 - y0) / 2.0 - th / 2.0;
  
  let xoff0 = 0.5 * s2;
  let xoff1 = -s2;
  let xoff2 = s2;
  let xoff3 = -0.5 * s2;
  
  let yc = -s3 + p / 2
  
  let xoff00 = lerp(0, -s3, pow(u, 0.3));
  let yoff00 = lerp(0, s2 + yc, u);
  let xoff01 = lerp(0, s3, pow(u, 0.3));
  let yoff01 = lerp(0, s2 + yc, u);
  let xoff10 = 0;
  let yoff10 = lerp(0, yc, u);
  let xoff11 = 0;
  let yoff11 = lerp(0, yc, u);
  let xoff20 = 0;
  let yoff20 = lerp(0, s2 + yc, u);
  let xoff21 = 0;
  let yoff21 = lerp(0, s2 + yc, u);
  let xoff30 = 0;
  let yoff30 = lerp(0, yc, u);
  let xoff31 = 0;
  let yoff31 = lerp(0, yc, u);
  
  
  noFill();
  stroke(color(0, 0, 0));
  strokeWeight(1);
  
  
  //fill(color(220, 220, 220));
  
  ellipse(xoff2 + xoff21 + cx + s2 / 2.0 + s3 / 2.0, yoff21 + cy - s2 / 2.0, s3, s3);
  ellipse(xoff2 + xoff20 + cx + s2 / 2.0 - s3 / 2.0, yoff20 + cy - s2 / 2.0, s3, s3);
  
  ellipse(xoff3 + xoff31 + cx + s2 / 2.0 + s3 / 2.0, yoff31 + cy + s2 / 2.0, s3, s3);
  ellipse(xoff3 + xoff30 + cx + s2 / 2.0 - s3 / 2.0, yoff30 + cy + s2 / 2.0, s3, s3);
  
  ellipse(xoff0 + xoff01 + cx - s2 / 2.0 + s3 / 2.0, yoff01 + cy - s2 / 2.0, s3, s3);
  ellipse(xoff0 + xoff00 + cx - s2 / 2.0 - s3 / 2.0, yoff00 + cy - s2 / 2.0, s3, s3);
  
  ellipse(xoff1 + xoff11 + cx - s2 / 2.0 + s3 / 2.0, yoff11 + cy + s2 / 2.0, s3, s3);
  ellipse(xoff1 + xoff10 + cx - s2 / 2.0 - s3 / 2.0, yoff10 + cy + s2 / 2.0, s3, s3);
  
  
  textAlign(CENTER, CENTER);
  noStroke();
  fill(color(0, 0, 0));
  textFont(arkitechFont);
  textSize(FONT_SIZE);
  text(WORDMARK, (x1 - x0) / 2.0, y1 - 20);
}
