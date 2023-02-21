LOGO_S1=200;
LOGO_S0=60;
LOGO_CONTAINER_ID='logo';
LOGO_A_MODE=0;

let lastKnownScrollPosition = 0;
let ticking = false;

function resizeLogo(scrollPos) {
  let h = document.getElementById('header');
  let c = document.getElementById('logo-canvas');
  if (c) {
        let height0 = LOGO_S0;
        let height1 = LOGO_S1;
        let u = Math.min(scrollPos / (height1 - height0), 1.0);
        let height = Math.round(height0 * u + height1 * (1 - u));
        c.style.height = height + 'px';
        c.style.width = LOGO_S1 + 'px';
        logop5.resizeCanvas(LOGO_S1, height);

        let a = Math.round(10 * 0.5 * u) / 10.0;
        if (a <= 0) {
                h.style['box-shadow'] = 'none'
        } else {
                h.style['box-shadow'] = '0px 5px 10px 0px rgba(0, 0, 0, ' + a + ')';
        }
  }
}

function updateScroll() {
  lastKnownScrollPosition = window.scrollY;

  if (!ticking) {
    window.requestAnimationFrame(() => {
      resizeLogo(lastKnownScrollPosition);
      ticking = false;
    });

    ticking = true;
  }
}

window.addEventListener('scroll', (e) => {
  updateScroll();
});

window.addEventListener('load', (e) => {
  updateScroll();
});
