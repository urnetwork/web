

var mask;


function setup() {
  mask = loadImage("ur-mask.png");

  createCanvas(256, 256);
  
}


function draw() {
  
  let u = map(cos(frameCount / 128), -1, 1, 1, 0);
  u = pow(u, 0.5);
  
  let s = lerp(1, 2.3, u);
  let s1 = 1.5 * s;
  let s2 = s;
  let s3 = 1.2 * s;
  let s4 = s;
  let s5 = s;
  
  background(color(255, 255, 255));
  
  
  ellipseMode(CENTER);
  
  noStroke();
  
  fill(color(224, 148, 249));
  circle(96, 64, 300 * s1);
  
  fill(color(237, 117, 96));
  circle(32, 96, 300 * s2);
  
  
  fill(color(241, 247, 193));
  circle(128, 196, 150 * s3);
  
  
  fill(color(164, 249, 123));
  circle(196, 220, 150 * s4);
  
  
  
  
  if (0.7 <= u) {
    
    let v = map(u, 0.7, 1, 0, 1);
    
    
  fill(lerpColor(color(217, 229, 243), color(240, 240, 240), v));
  circle(64, 64, 200 * s5);
  
    rectMode(CENTER);
    fill(color(0, 0, 0, 255 * v));
    rect(128, 128, 32, 32);
  } else {
    
  fill(color(217, 229, 243));
  circle(64, 64, 200 * s5);
  }
  
  
  if (u < 0.3) {
    
    let v = map(u, 0, 0.3, 1, 0);
    
    fill(color(0, 0, 0, 255 * v));
    triangle(128 - 16 + 6, 128 - 16, 128 - 16 + 6, 128 + 16, 128 + 16 + 6, 128);
  }
  
  
  image(mask, 0, 0, 256, 256);
  

}
