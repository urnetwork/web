var A_MODE = 0;
var CONTAINER_ID = null; 

let blendBuffer;
let blendBufferContext;
let blendBuffer2;
let blendBufferContext2;


let lineBuffer1;
let lineBuffer2;
let lineBuffer3;

let step1;
let base1;
let threshold1;
let rotation1;


let step2;
let base2;
let threshold2;
let rotation2;


let step3;
let base3;
let threshold3;
let rotation3;

let fps;
let rps;

function setup() {
  fps = 5;
  rps = PI / 16;
  
  step1 = 8 * 0.005;
  base1 = 8 * 500;
  threshold1 = 0.4;
  rbase1 = 2 * PI / 3 + PI / 4;
  
  
  step2 = 12 * 0.005;
  base2 = 12 * 500;
  threshold2 = 0.45;
  rbase2 = 2 * 2 * PI / 3 + PI / 4;
  
  
  step3 = 20 * 0.005;
  base3 = 20 * 500;
  threshold3 = 0.5;
  rbase3 = PI / 4;

  let canvas = createCanvas(displayWidth, displayHeight);
  if (null != CONTAINER_ID) {
    canvas.parent(CONTAINER_ID);
  }
  frameRate(60);
  
  
  let w = displayWidth;
  let h = displayHeight;
  blendBuffer = createGraphics(w, h);
  blendBufferContext = blendBuffer.canvas.getContext('2d');
  
  blendBuffer2 = createGraphics(w, h);
  blendBuffer2Context = blendBuffer2.canvas.getContext('2d');
  
  lineBuffer1 = createGraphics(w, h);
  lineBuffer2 = createGraphics(w, h);
  lineBuffer3 = createGraphics(w, h);
}


//function draw() {
//  drawLines(lineBuffer1, base1, step1, threshold1);
  
//  clear();
//  image(lineBuffer1, 0, 0);
//}


function drawLines(g, c, r, f, base, step, threshold) {
  // compute width of lines
  
  g.push();
  g.translate(g.width / 2, g.height / 2);
  g.rotate(r);
  g.translate(-g.width / 2, -g.height / 2);
  
  
  let w = max(g.width, g.height) * 1.4;
  
  //let lines = Array();
  
  //g.push();
  
  let rf = round(f);
  g.translate((g.width - w) / 2.0 + (f - rf), (g.height - w) / 2.0);
  
  g.strokeCap(SQUARE);
  g.stroke(c);
  g.noFill();
  
  var i;
  
  
  for (i = 0; i < w; ++i) {
    var v = noise(base + (i - rf) * step);
    //print(v);
    if (threshold <= v) {
      let i0 = i;
      for (++i; i < w; ++i) {
        v = noise(base + (i - rf) * step);
        if (v < threshold) {
          break;
        }
      }
      let i1 = i;
      //lines.push(i0);
      //lines.push(i1);
      
      let weight = i1 - i0;
      let x = (i1 + i0) / 2.0;
      g.strokeWeight(weight);
      g.line(x, 0, x, w);
    }
  }
  
  
  
  //g.strokeCap(SQUARE);
  //g.stroke(c);
  //g.noFill();
  //for (i = 0; i < lines.length; i += 2) {
  //  let i0 = lines[i];
  //  let i1 = lines[i + 1];
  //  let weight = i1 - i0;
  //  let x = (i1 + i0) / 2.0;
  //  g.strokeWeight(weight);
  //  g.line(x, 0, x, w);
  //}
  
  //g.pop();
  
  g.pop();
}


function draw() {
  
  let f;
  if (0 == A_MODE) {
    f = -25 * cos(rps * millis() / 1000.0) + 340;
  } else if (1 == A_MODE) {
    f = 30 * sin(rps * millis() / 1000.0) + 840;
  } else {
    f = fps * millis() / 1000.0 + 300;
  }
  
  
  
  //let f = 30 * sin(rps * millis() / 1000.0) + 335;
  
  //let mode = floor(frameCount / 300.0) % 4;
  let mode = 2;
  
  let bg = color(245, 245, 245, 150);
  let color1 = color(255, 0, 0, 255);
  let color2 = color(0, 255, 0, 255);
  let color3 = color(0, 0, 255, 255);
  
  let rotation1 = rbase1 + PI * f * 0.001;
  let rotation2 = rbase2 + PI * f * 0.002;
  let rotation3 = rbase3 + PI * f * 0.003;
  
  
  lineBuffer1.clear();
  drawLines(lineBuffer1, bg, rotation1, f, base1, step1, threshold1);
  lineBuffer2.clear();
  drawLines(lineBuffer2, bg, rotation2, f, base2, step2, threshold2);
  lineBuffer3.clear();
  drawLines(lineBuffer3, bg, rotation3, f, base3, step3, threshold3);
  
  // compose mode dest atop, draw line1 in gray
  // compose mode source atop, draw line2 with color with blend ADD
  // compose mode dest atop, draw line2 in gray
  // compose mode source atop, draw line3 with color with blend ADD
  // compose mode dest atop, draw line 3 in gray
  
  blendBuffer.clear();
  
  
  // pairwise intersections between each
  // add all pairwise
  
  
  blendBuffer2.clear()
  //blendBuffer2Context.globalCompositeOperation = 'destination-over';
  blendBuffer2Context.globalCompositeOperation = 'source-over';
  //blendBuffer2.stroke(color(120, 120, 120, 255));
  //blendBuffer2.strokeWeight(10);
  //blendBuffer2.line(100, 100, 200, 200);
  blendBuffer2.image(lineBuffer1, 0, 0);
  
  blendBuffer2Context.globalCompositeOperation = 'destination-in';
  //blendBuffer2.stroke(color(120, 120, 120, 255));
  //blendBuffer2.strokeWeight(10);
  //blendBuffer2.line(100, 200, 200, 100);
  blendBuffer2.image(lineBuffer2, 0, 0);
  
  
  blendBufferContext.globalCompositeOperation = 'source-over';
  blendBuffer.image(blendBuffer2, 0, 0);
  
  
  
  blendBuffer2.clear()
  //blendBuffer2Context.globalCompositeOperation = 'destination-over';
  blendBuffer2Context.globalCompositeOperation = 'source-over';
  //blendBuffer2.stroke(color(120, 120, 120, 255));
  //blendBuffer2.strokeWeight(10);
  //blendBuffer2.line(100, 100, 200, 200);
  blendBuffer2.image(lineBuffer1, 0, 0);
  
  blendBuffer2Context.globalCompositeOperation = 'destination-in';
  //blendBuffer2.stroke(color(120, 120, 120, 255));
  //blendBuffer2.strokeWeight(20);
  //blendBuffer2.line(100, 150, 200, 150);
  blendBuffer2.image(lineBuffer3, 0, 0);
  
  
  blendBufferContext.globalCompositeOperation = 'source-over';
  blendBuffer.image(blendBuffer2, 0, 0);
  
  
  blendBuffer2.clear()
  //blendBuffer2Context.globalCompositeOperation = 'destination-over';
  blendBuffer2Context.globalCompositeOperation = 'source-over';
  //blendBuffer2.stroke(color(120, 120, 120, 255));
  //blendBuffer2.strokeWeight(10);
  //blendBuffer2.line(100, 200, 200, 100);
  blendBuffer2.image(lineBuffer2, 0, 0);
  
  blendBuffer2Context.globalCompositeOperation = 'destination-in';
  //blendBuffer2.stroke(color(120, 120, 120, 255));
  //blendBuffer2.strokeWeight(20);
  //blendBuffer2.line(100, 150, 200, 150);
  blendBuffer2.image(lineBuffer3, 0, 0);
  
  
  blendBufferContext.globalCompositeOperation = 'source-over';
  blendBuffer.image(blendBuffer2, 0, 0);
  
  
  
  
  
  // draw all color
  blendBuffer2.clear();
  
  //blendBuffer2Context.globalCompositeOperation = 'destination-over';
  blendBuffer2Context.globalCompositeOperation = 'source-over';
  //blendBuffer2.stroke(color(0, 0, 255, 255));
  //blendBuffer2.strokeWeight(10);
  //blendBuffer2.line(100, 100, 200, 200);
  drawLines(blendBuffer2, color1, rotation1, f, base1, step1, threshold1);
  
  
  
  blendBuffer2Context.globalCompositeOperation = 'screen';
  //blendBuffer.blendMode(SCREEN);
  //blendBuffer2.stroke(color(255, 0, 0, 255));
  //blendBuffer2.strokeWeight(10);
  //blendBuffer2.line(100, 200, 200, 100);
  drawLines(blendBuffer2, color2, rotation2, f, base2, step2, threshold2);
  
  blendBuffer2Context.globalCompositeOperation = 'screen';
  //blendBuffer2.stroke(color(0, 255, 0, 255));
  //blendBuffer2.strokeWeight(20);
  //blendBuffer2.line(100, 150, 200, 150);
  drawLines(blendBuffer2, color3, rotation3, f,  base3, step3, threshold3);
  
  // draw color into the pairwise intersection points
  
  
  blendBufferContext.globalCompositeOperation = 'source-atop';
  blendBuffer.image(blendBuffer2, 0, 0);
  
  
  if (0 == mode || 3 == mode) {
  blendBufferContext.globalCompositeOperation = 'destination-over';
  //blendBuffer.stroke(color(120, 120, 120, 255));
  //blendBuffer.strokeWeight(10);
  //blendBuffer.line(100, 100, 200, 200);
  blendBuffer.image(lineBuffer1, 0, 0);
  
  blendBufferContext.globalCompositeOperation = 'destination-over';
  //blendBuffer.stroke(color(120, 120, 120, 255));
  //blendBuffer.strokeWeight(10);
  //blendBuffer.line(100, 200, 200, 100);
  blendBuffer.image(lineBuffer2, 0, 0);
  
  blendBufferContext.globalCompositeOperation = 'destination-over';
  //blendBuffer.stroke(color(120, 120, 120, 255));
  //blendBuffer.strokeWeight(20);
  //blendBuffer.line(100, 150, 200, 150);
  blendBuffer.image(lineBuffer3, 0, 0);
  }
  
  
  
  
  //blendBuffer.blendMode(OVERLAY);
  
  ////blendBufferContext.globalCompositeOperation = 'destination-over';
  //blendBuffer.stroke(color(120, 120, 120, 255));
  //blendBuffer.strokeWeight(10);
  //blendBuffer.line(100, 100, 200, 200);
  
  ////blendBufferContext.globalCompositeOperation = 'destination-over';
  //blendBuffer.stroke(color(120, 120, 120, 255));
  //blendBuffer.strokeWeight(10);
  //blendBuffer.line(100, 200, 200, 100);
  
  //line(10, 10, 20, 20);
  if (0 == mode || 2 == mode) {
  clear();
  }
  imageMode(CENTER);
  image(blendBuffer, width / 2.0, height / 2.0);
  
  
  
  //fill(color(255, 255, 255, 255));
  //noStroke();
  //rectMode(CENTER);
  //rect(width / 2.0, height / 2.0, 400, 300);
  
  //textAlign(CENTER, CENTER);
  //text(str(round(f * 1000) / 1000.0), 100, 10);
}
