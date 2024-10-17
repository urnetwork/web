
/*
let LOGO_CONTAINER_ID = null;
let LOGO_S0 = 60;
let LOGO_S1 = 400;
let LOGO_A_MODE = 1;
*/

const LOGO_S1=200;
const LOGO_S0=60;
const LOGO_CONTAINER_ID='logo';
const LOGO_A_MODE=0;

let logop5 = new p5((sketch) => {

  let WORDMARK = 'BringYour';
  let FONT_SIZE = 18;
  let EMPH = 3;
  
  let s3min = 0;
  
  let cycleTime = 10000;
  let arkitechFont = null;
  let useArkitechFont = true;
  
  
  sketch.windowResized = () => {
    if (2 == LOGO_A_MODE) {
      sketch.resizeCanvas(LOGO_S1, sketch.min(LOGO_S1, sketch.windowHeight));
    }
  }
  
  
  
  //sketch.preload = () => {
  //  arkitechFont = sketch.loadFont('res/fonts/Arkitech-Light.ttf');
  //}
  
  
  sketch.setup = () => {
    
    sketch.loadFont('/res/fonts/Arkitech-Light.ttf', (font) => {
      arkitechFont = font;
    },
    () => {
      useArkitechFont = false;
    });

    let canvas = sketch.createCanvas(LOGO_S1, sketch.min(LOGO_S1, sketch.windowHeight));
    if (null != LOGO_CONTAINER_ID) {
      canvas.parent(LOGO_CONTAINER_ID);
    }
    canvas.id('logo-canvas');
    //sketch.frameRate(60);
    
    let placeholderElement = document.getElementById('logo-placeholder')
    placeholderElement.parentNode.removeChild(placeholderElement)

    if (typeof updateScroll == 'function') {
      updateScroll()
    }
  }
  
  
  sketch.draw = () => {
    if (null == arkitechFont && useArkitechFont) {
      return;
    }
    
    if (0 == LOGO_A_MODE || 2 == LOGO_A_MODE) {
      // fix to only render on demand
      sketch.frameRate(0);
    }
    
    let u;
    
    let h0 = LOGO_S0;
    let h1 = LOGO_S1;
    
    if (1 == LOGO_A_MODE) {
      let c = sketch.millis() % (2 * cycleTime);
      
      if (c < cycleTime) {
        u = c / cycleTime;
      } else {
        u = (2 * cycleTime - c) / cycleTime;
      }
      u = 1 - u
    } else {
      u = sketch.map(
        sketch.max(sketch.min(sketch.min(sketch.width, sketch.height), h1), h0),
        h0, h1,
        0, 1
      );
    }
    
    let k0 = 0.3;
    let k1 = 0.8;
    
    if (0 == s3min) {
      if (useArkitechFont) {
        sketch.textFont(arkitechFont);
      }
      sketch.textSize(FONT_SIZE);
      s3min = sketch.textWidth(WORDMARK) / 8;
    }
    
    sketch.clear();
    
    let h = sketch.lerp(h0, h1, u);
    
    if (k1 < u) {
      let v = sketch.map(u, k1, 1, 0, 1);//(u - k1) / (1 - k1);
      draw0(0, 0, h1, h, 1 - v);
    } else if (k0 < u) {
      let v = sketch.map(u, k0, k1, 0, 1);//(u - k0) / (k1 - k0);
      draw1(0, 0, h1, h, 1 - v);
    } else {
      let v = sketch.map(u, 0, k0, 0, 1);//u / k0;
      draw2(0, 0, h1, h, 1 - v);
    }
    
  }
  
  
  function draw0(x0, y0, x1, y1, u) {
    // 0->1
    
    let a = sketch.lerp(0, sketch.PI, u);
    
    sketch.ellipseMode(sketch.CENTER);
    let th = 40;
    let p = 20;
    
    let s = sketch.max(
      sketch.min(x1 - x0, y1 - y0) - th - p,
      s3min * 2 / 0.414214
    );
    let s2 = 0.414214 * s;
    let s3 = s2 / 2.0;
    
    let cx = (x1 - x0) / 2.0;
    let cy = (y1 - y0) / 2.0 - th / 2.0;
    
    sketch.noFill();
    sketch.strokeWeight(1);
    sketch.stroke(sketch.lerpColor(
      sketch.color(220, 220, 220, 255),
      sketch.color(220, 220, 220, 0),
      u
    ));
    sketch.ellipse(cx, cy, s, s);
    
    
    sketch.strokeWeight(1);
    sketch.stroke(sketch.lerpColor(
      sketch.color(220, 220, 220),
      sketch.color(0, 0, 0),
      u
    ));
    
    
    sketch.ellipse(cx + s2 / 2.0, cy - s2 / 2.0, s2, s2);
    sketch.ellipse(cx + s2 / 2.0, cy + s2 / 2.0, s2, s2);
    sketch.ellipse(cx - s2 / 2.0, cy - s2 / 2.0, s2, s2);
    sketch.ellipse(cx - s2 / 2.0, cy + s2 / 2.0, s2, s2);
    
    
    sketch.stroke(sketch.lerpColor(
      sketch.color(0, 0, 0, 255),
      sketch.color(220, 220, 220, 0),
      u
    ));
    sketch.strokeWeight(sketch.lerp(EMPH, 1, u));
    sketch.arc(cx, cy, s, s, sketch.PI, 1.5 * sketch.PI);
    
    
    sketch.stroke(sketch.lerpColor(
      sketch.color(220, 220, 220, 0),
      sketch.color(0, 0, 0, 255),
      u
    ));
    sketch.strokeWeight(1);
    sketch.ellipse(cx + s2 / 2.0 + sketch.cos(a) * s3 / 2.0, cy - s2 / 2.0 + sketch.sin(a) * s3 / 2.0, s3, s3);
    sketch.ellipse(cx + s2 / 2.0 - sketch.cos(a) * s3 / 2.0, cy - s2 / 2.0 - sketch.sin(a) * s3 / 2.0, s3, s3);
    
    sketch.ellipse(cx + s2 / 2.0 + sketch.cos(a) * s3 / 2.0, cy + s2 / 2.0 + sketch.sin(a) * s3 / 2.0, s3, s3);
    sketch.ellipse(cx + s2 / 2.0 - sketch.cos(a) * s3 / 2.0, cy + s2 / 2.0 - sketch.sin(a) * s3 / 2.0, s3, s3);
    
    sketch.ellipse(cx - s2 / 2.0 + sketch.cos(a) * s3 / 2.0, cy + s2 / 2.0 + sketch.sin(a) * s3 / 2.0, s3, s3);
    sketch.ellipse(cx - s2 / 2.0 - sketch.cos(a) * s3 / 2.0, cy + s2 / 2.0 - sketch.sin(a) * s3 / 2.0, s3, s3);
    
    
    sketch.stroke(sketch.color(0, 0, 0));
    sketch.strokeWeight(sketch.lerp(EMPH, 1, u));
    sketch.ellipse(cx - s2 / 2.0 + sketch.cos(a) * s3 / 2.0, cy - s2 / 2.0 + sketch.sin(a) * s3 / 2.0, s3, s3);
    sketch.ellipse(cx - s2 / 2.0 - sketch.cos(a) * s3 / 2.0, cy - s2 / 2.0 - sketch.sin(a) * s3 / 2.0, s3, s3);
    
    sketch.stroke(sketch.lerpColor(
      sketch.color(0, 0, 0, 255),
      sketch.color(220, 220, 220, 0),
      u
    ));
    sketch.ellipse(cx - s2 / 2.0 - sketch.sin(a) * s3 / 2.0, cy - s2 / 2.0 + sketch.cos(a) * s3 / 2.0, s3, s3);
    sketch.ellipse(cx - s2 / 2.0 + sketch.sin(a) * s3 / 2.0, cy - s2 / 2.0 - sketch.cos(a) * s3 / 2.0, s3, s3);
    
    
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
    sketch.noStroke();
    sketch.fill(sketch.color(0, 0, 0));
    if (useArkitechFont) {
      sketch.textFont(arkitechFont);
    }
    sketch.textSize(FONT_SIZE);
    sketch.text(WORDMARK, (x1 - x0) / 2.0, y1 - 20);
  }
  
  
  function draw1(x0, y0, x1, y1, u) {
    // 1->2
    
    sketch.ellipseMode(sketch.CENTER);
    let th = 40;
    let p = 20;
    let s = sketch.max(
      sketch.min(x1 - x0, y1 - y0) - th - p,
      s3min * 2 / 0.414214
    );
    let s2 = 0.414214 * s;
    let s3 = s2 / 2.0;
    
    let cx = (x1 - x0) / 2.0;
    let cy = (y1 - y0) / 2.0 - th / 2.0;
    
    
    let xoff0 = sketch.lerp(0, 0.5 * s2, u);
    let xoff1 = sketch.lerp(0, -s2, u);
    let xoff2 = sketch.lerp(0, s2, u);
    let xoff3 = sketch.lerp(0, -0.5 * s2, u);
    
    sketch.noFill();
    sketch.stroke(sketch.color(0, 0, 0, sketch.lerp(255, 0, u)));
    sketch.strokeWeight(1);
    sketch.ellipse(xoff2 + cx + s2 / 2.0, cy - s2 / 2.0, s2, s2);
    sketch.ellipse(xoff3 + cx + s2 / 2.0, cy + s2 / 2.0, s2, s2);
    sketch.ellipse(xoff0 + cx - s2 / 2.0, cy - s2 / 2.0, s2, s2);
    sketch.ellipse(xoff1 + cx - s2 / 2.0, cy + s2 / 2.0, s2, s2);
    
    sketch.stroke(sketch.color(0, 0, 0));
    sketch.ellipse(xoff2 + cx + s2 / 2.0 + s3 / 2.0, cy - s2 / 2.0, s3, s3);
    sketch.ellipse(xoff2 + cx + s2 / 2.0 - s3 / 2.0, cy - s2 / 2.0, s3, s3);
    
    sketch.ellipse(xoff3 + cx + s2 / 2.0 + s3 / 2.0, cy + s2 / 2.0, s3, s3);
    sketch.ellipse(xoff3 + cx + s2 / 2.0 - s3 / 2.0, cy + s2 / 2.0, s3, s3);
    
    sketch.ellipse(xoff0 + cx - s2 / 2.0 + s3 / 2.0, cy - s2 / 2.0, s3, s3);
    sketch.ellipse(xoff0 + cx - s2 / 2.0 - s3 / 2.0, cy - s2 / 2.0, s3, s3);
    
    sketch.ellipse(xoff1 + cx - s2 / 2.0 + s3 / 2.0, cy + s2 / 2.0, s3, s3);
    sketch.ellipse(xoff1 + cx - s2 / 2.0 - s3 / 2.0, cy + s2 / 2.0, s3, s3);
    
    
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
    sketch.noStroke();
    sketch.fill(sketch.color(0, 0, 0));
    if (useArkitechFont) {
      sketch.textFont(arkitechFont);
    }
    sketch.textSize(FONT_SIZE);
    sketch.text(WORDMARK, (x1 - x0) / 2.0, y1 - 20);
  }
  
  
  function draw2(x0, y0, x1, y1, u) {
    // 2->3
    
    sketch.ellipseMode(sketch.CENTER);
    let th = 40;
    let p = 20;
    let s = sketch.max(
      sketch.min(x1 - x0, y1 - y0) - th - p,
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
    
    let xoff00 = sketch.lerp(0, -s3, sketch.pow(u, 0.4));
    let yoff00 = sketch.lerp(0, s2 + yc, u);
    let xoff01 = sketch.lerp(0, s3, sketch.pow(u, 0.4));
    let yoff01 = sketch.lerp(0, s2 + yc, u);
    let xoff10 = 0;
    let yoff10 = sketch.lerp(0, yc, u);
    let xoff11 = 0;
    let yoff11 = sketch.lerp(0, yc, u);
    let xoff20 = 0;
    let yoff20 = sketch.lerp(0, s2 + yc, u);
    let xoff21 = 0;
    let yoff21 = sketch.lerp(0, s2 + yc, u);
    let xoff30 = 0;
    let yoff30 = sketch.lerp(0, yc, u);
    let xoff31 = 0;
    let yoff31 = sketch.lerp(0, yc, u);
    
    
    sketch.noFill();
    sketch.stroke(sketch.color(0, 0, 0));
    sketch.strokeWeight(1);
    sketch.ellipse(xoff2 + xoff21 + cx + s2 / 2.0 + s3 / 2.0, yoff21 + cy - s2 / 2.0, s3, s3);
    sketch.ellipse(xoff2 + xoff20 + cx + s2 / 2.0 - s3 / 2.0, yoff20 + cy - s2 / 2.0, s3, s3);
    
    sketch.ellipse(xoff3 + xoff31 + cx + s2 / 2.0 + s3 / 2.0, yoff31 + cy + s2 / 2.0, s3, s3);
    sketch.ellipse(xoff3 + xoff30 + cx + s2 / 2.0 - s3 / 2.0, yoff30 + cy + s2 / 2.0, s3, s3);
    
    sketch.ellipse(xoff0 + xoff01 + cx - s2 / 2.0 + s3 / 2.0, yoff01 + cy - s2 / 2.0, s3, s3);
    sketch.ellipse(xoff0 + xoff00 + cx - s2 / 2.0 - s3 / 2.0, yoff00 + cy - s2 / 2.0, s3, s3);
    
    sketch.ellipse(xoff1 + xoff11 + cx - s2 / 2.0 + s3 / 2.0, yoff11 + cy + s2 / 2.0, s3, s3);
    sketch.ellipse(xoff1 + xoff10 + cx - s2 / 2.0 - s3 / 2.0, yoff10 + cy + s2 / 2.0, s3, s3);
    
    
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
    sketch.noStroke();
    sketch.fill(sketch.color(0, 0, 0));
    if (useArkitechFont) {
      sketch.textFont(arkitechFont);
    }
    sketch.textSize(FONT_SIZE);
    sketch.text(WORDMARK, (x1 - x0) / 2.0, y1 - 20);
  }
});

//logop5.resizeCanvas(10, 10);
