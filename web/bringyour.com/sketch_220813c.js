let BG_A_MODE = 0;
let BG_CONTAINER_ID = null;
let BG_STATIC = false;
let BG_H1 = 1000;


let bgp5 = new p5((sketch) => {

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
  
  
  sketch.windowResized = () => {
      sketch.resizeCanvas(sketch.windowWidth, sketch.max(sketch.windowHeight, BG_H1));
      initBuffers();
  }
  
  
  sketch.setup = () => {
    fps = 5;
    rps = sketch.PI / 16;
    
    step1 = 8 * 0.005;
    base1 = 8 * 500;
    threshold1 = 0.4;
    rbase1 = 2 * sketch.PI / 3 + sketch.PI / 4;
    
    
    step2 = 12 * 0.005;
    base2 = 12 * 500;
    threshold2 = 0.45;
    rbase2 = 2 * 2 * sketch.PI / 3 + sketch.PI / 4;
    
    
    step3 = 20 * 0.005;
    base3 = 20 * 500;
    threshold3 = 0.5;
    rbase3 = sketch.PI / 4;
  
    let canvas = sketch.createCanvas(sketch.windowWidth, sketch.max(sketch.windowHeight, BG_H1));
    if (null != BG_CONTAINER_ID) {
      canvas.parent(BG_CONTAINER_ID);
    }
    initBuffers();
    
    sketch.frameRate(30);
  }
  
  
  function initBuffers() {
    let w = sketch.width;
    let h = sketch.height;
    blendBuffer = sketch.createGraphics(w, h);
    blendBufferContext = blendBuffer.canvas.getContext('2d');
    
    blendBuffer2 = sketch.createGraphics(w, h);
    blendBuffer2Context = blendBuffer2.canvas.getContext('2d');
    
    lineBuffer1 = sketch.createGraphics(w, h);
    lineBuffer2 = sketch.createGraphics(w, h);
    lineBuffer3 = sketch.createGraphics(w, h);
  }
  
  
  function drawLines(g, c, r, f, base, step, threshold) {
    g.push();
      g.translate(g.width / 2, g.height / 2);
      g.rotate(r);
      g.translate(-g.width / 2, -g.height / 2);
      
      let w = sketch.max(g.width, g.height) * 1.4;
      
      let rf = sketch.round(f);
      g.translate((g.width - w) / 2.0 + (f - rf), (g.height - w) / 2.0);
      
      g.strokeCap(sketch.SQUARE);
      g.stroke(c);
      g.noFill();
      
      var i;
      for (i = 0; i < w; ++i) {
        var v = sketch.noise(base + (i - rf) * step);
        if (threshold <= v) {
          let i0 = i;
          for (++i; i < w; ++i) {
            v = sketch.noise(base + (i - rf) * step);
            if (v < threshold) {
              break;
            }
          }
          let i1 = i;
          
          let weight = i1 - i0;
          let x = (i1 + i0) / 2.0;
          g.strokeWeight(weight);
          g.line(x, 0, x, w);
        }
      }
    
    g.pop();
  }
  
  
  sketch.draw = () => {
    if (BG_STATIC) {
      sketch.frameRate(0);
    }
    
    let f;
    if (0 == BG_A_MODE) {
      if (BG_STATIC) {
        f = 340;
      } else {
        f = -25 * sketch.cos(rps * sketch.millis() / 1000.0) + 340;
      }
    } else if (1 == BG_A_MODE) {
      if (BG_STATIC) {
        f = 840;
      } else {
        f = 30 * sketch.sin(rps * sketch.millis() / 1000.0) + 840;
      }
    } else {
      if (BG_STATIC) {
        f = 300;
      } else {
        f = fps * sketch.millis() / 1000.0 + 300;
      }
    }
    
    
    let mode = 2;
    
    let bg = sketch.color(245, 245, 245, 150);
    let color1 = sketch.color(255, 0, 0, 255);
    let color2 = sketch.color(0, 255, 0, 255);
    let color3 = sketch.color(0, 0, 255, 255);
    
    let rotation1 = rbase1 + sketch.PI * f * 0.001;
    let rotation2 = rbase2 + sketch.PI * f * 0.002;
    let rotation3 = rbase3 + sketch.PI * f * 0.003;
    
    
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
    blendBuffer2Context.globalCompositeOperation = 'source-over';
    blendBuffer2.image(lineBuffer1, 0, 0);
    
    blendBuffer2Context.globalCompositeOperation = 'destination-in';
    blendBuffer2.image(lineBuffer2, 0, 0);
    
    blendBufferContext.globalCompositeOperation = 'source-over';
    blendBuffer.image(blendBuffer2, 0, 0);
    
    
    blendBuffer2.clear()
    blendBuffer2Context.globalCompositeOperation = 'source-over';
    blendBuffer2.image(lineBuffer1, 0, 0);
    
    blendBuffer2Context.globalCompositeOperation = 'destination-in';
    blendBuffer2.image(lineBuffer3, 0, 0);
    
    blendBufferContext.globalCompositeOperation = 'source-over';
    blendBuffer.image(blendBuffer2, 0, 0);
    
    
    blendBuffer2.clear()
    blendBuffer2Context.globalCompositeOperation = 'source-over';
    blendBuffer2.image(lineBuffer2, 0, 0);
    
    blendBuffer2Context.globalCompositeOperation = 'destination-in';
    blendBuffer2.image(lineBuffer3, 0, 0);
    
    blendBufferContext.globalCompositeOperation = 'source-over';
    blendBuffer.image(blendBuffer2, 0, 0);
    
    
    // draw all color
    blendBuffer2.clear();
    blendBuffer2Context.globalCompositeOperation = 'source-over';
    drawLines(blendBuffer2, color1, rotation1, f, base1, step1, threshold1);
    
    blendBuffer2Context.globalCompositeOperation = 'screen';
    drawLines(blendBuffer2, color2, rotation2, f, base2, step2, threshold2);
    
    blendBuffer2Context.globalCompositeOperation = 'screen';
    drawLines(blendBuffer2, color3, rotation3, f,  base3, step3, threshold3);
    
    
    // draw color into the pairwise intersection points
    blendBufferContext.globalCompositeOperation = 'source-atop';
    blendBuffer.image(blendBuffer2, 0, 0);
    
    
    if (0 == mode || 3 == mode) {
      // draw non-overlapping lines
      blendBufferContext.globalCompositeOperation = 'destination-over';
      blendBuffer.image(lineBuffer1, 0, 0);
    
      blendBufferContext.globalCompositeOperation = 'destination-over';
      blendBuffer.image(lineBuffer2, 0, 0);
    
      blendBufferContext.globalCompositeOperation = 'destination-over';
      blendBuffer.image(lineBuffer3, 0, 0);
    }
    

    if (0 == mode || 2 == mode) {
      sketch.clear();
    }
    
    sketch.imageMode(sketch.CENTER);
    sketch.image(blendBuffer, sketch.width / 2.0, sketch.height / 2.0);
  }

});
