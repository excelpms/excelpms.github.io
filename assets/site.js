// Progressive enhancements. All content and navigation also work without JavaScript.
for (const carousel of document.querySelectorAll('[data-carousel]')) {
  const slides = [...carousel.querySelectorAll('[data-carousel-slide]')];
  const choices = [...carousel.querySelectorAll('[data-carousel-go]')];
  const play = carousel.querySelector('[data-carousel-play]');
  const counter = carousel.querySelector('[data-carousel-counter]');
  const status = carousel.querySelector('[data-carousel-status]');
  const motion = window.matchMedia('(prefers-reduced-motion:reduce)');
  let current = 0, playing = !motion.matches, hovering = false, focused = false;
  let inView = true, playThroughFocus = false, timer, gesture, suppressClickUntil = 0;
  const schedule = () => {
    clearTimeout(timer);
    play.textContent = playing ? play.dataset.pauseLabel : play.dataset.playLabel;
    play.setAttribute('aria-label', play.textContent);
    if (!playing || hovering || (focused && !playThroughFocus) || !inView || document.hidden || document.querySelector('dialog[open]')) return;
    timer = setTimeout(() => show(current + 1), 6000);
  };
  const show = (index, manual = false) => {
    current = (index + slides.length) % slides.length;
    if (manual) playing = false;
    slides.forEach((slide, i) => {slide.hidden = i !== current;});
    choices.forEach((choice, i) => {
      if (i === current) choice.setAttribute('aria-current', 'true');
      else choice.removeAttribute('aria-current');
    });
    counter.textContent = `${String(current + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    if (manual) status.textContent = slides[current].getAttribute('aria-label');
    // Load the active image and the following one before the next rotation.
    for (const i of [current,(current+1)%slides.length]) slides[i].querySelector('img').loading = 'eager';
    schedule();
  };
  for (const control of carousel.querySelectorAll('[data-carousel-controls]')) control.hidden = false;
  choices.forEach((choice,i) => choice.addEventListener('click', () => show(i,true)));
  carousel.querySelector('[data-carousel-prev]').addEventListener('click', () => show(current-1,true));
  carousel.querySelector('[data-carousel-next]').addEventListener('click', () => show(current+1,true));
  play.addEventListener('click', () => {playing = !playing;playThroughFocus = playing;schedule();});
  carousel.addEventListener('pointerenter', event => {if (event.pointerType !== 'touch') {hovering = true;schedule();}});
  carousel.addEventListener('pointerleave', event => {if (event.pointerType !== 'touch') {hovering = false;schedule();}});
  carousel.addEventListener('focusin', event => {
    focused = true;playThroughFocus = false;
    if (event.target !== play) playing = false;
    schedule();
  });
  carousel.addEventListener('focusout', event => {if (!carousel.contains(event.relatedTarget)) {focused = false;playThroughFocus = false;schedule();}});
  carousel.addEventListener('keydown', event => {
    if (!event.target.matches('[data-carousel-go]')) return;
    let next;
    if (event.key === 'ArrowRight') next = (current+1)%slides.length;
    if (event.key === 'ArrowLeft') next = (current+slides.length-1)%slides.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = slides.length-1;
    if (next !== undefined) {event.preventDefault();show(next,true);choices[next].focus();}
  });
  carousel.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && event.target.closest('.carousel-visual')) gesture = {x:event.clientX,y:event.clientY};
  }, {passive:true});
  carousel.addEventListener('pointercancel', () => {gesture = null;});
  carousel.addEventListener('pointerup', event => {
    if (!gesture) return;
    const dx = event.clientX-gesture.x, dy = event.clientY-gesture.y;
    gesture = null;
    if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.4) {suppressClickUntil=performance.now()+600;show(current+(dx<0?1:-1),true);}
  }, {passive:true});
  carousel.addEventListener('click', event => {
    if (performance.now()<suppressClickUntil && event.target.closest('[data-image-viewer]')) {event.preventDefault();event.stopPropagation();suppressClickUntil=0;}
  }, true);
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('close', schedule, true);
  motion.addEventListener('change', () => {if (motion.matches) playing=false;schedule();});
  if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver(entries => {inView=entries[0].isIntersecting;schedule();}, {threshold:0.2}).observe(carousel);
  show(0);
}

// The original-image links remain usable when JavaScript is disabled.
const imageLinks = [...document.querySelectorAll('[data-image-viewer]')];
if (imageLinks.length && typeof HTMLDialogElement !== 'undefined') {
  const zh = document.documentElement.lang.startsWith('zh');
  const dialog = document.createElement('dialog');
  dialog.className = 'image-dialog';
  dialog.setAttribute('aria-label', zh ? '产品界面截图' : 'Product screenshot');
  dialog.innerHTML = `<div class="image-dialog-toolbar"><p></p><div><button type="button" data-zoom>${zh ? '原始尺寸' : 'Actual size'}</button><a target="_blank" rel="noopener">${zh ? '独立窗口' : 'Open image'} ↗</a><button type="button" data-close>${zh ? '关闭' : 'Close'} ×</button></div></div><div class="image-scroll"><img alt=""></div>`;
  document.body.append(dialog);
  const img = dialog.querySelector('img');
  const zoom = dialog.querySelector('[data-zoom]');
  let previous;
  const close = () => dialog.close();
  dialog.querySelector('[data-close]').addEventListener('click', close);
  dialog.addEventListener('close', () => {document.documentElement.classList.remove('image-open');previous?.focus({preventScroll:true});});
  dialog.addEventListener('click', event => {if (event.target === dialog) close();});
  zoom.addEventListener('click', () => {
    const actual = dialog.classList.toggle('actual-size');
    zoom.textContent = actual ? (zh ? '适应窗口' : 'Fit to window') : (zh ? '原始尺寸' : 'Actual size');
  });
  for (const link of imageLinks) link.addEventListener('click', event => {
    event.preventDefault();
    previous = link;
    const caption = link.dataset.caption || link.querySelector('img')?.alt || '';
    img.src = link.href;
    img.alt = caption;
    dialog.querySelector('p').textContent = caption;
    dialog.querySelector('a').href = link.href;
    const mobile = window.matchMedia('(max-width:800px)').matches;
    dialog.classList.toggle('actual-size', mobile);
    zoom.textContent = mobile ? (zh ? '适应窗口' : 'Fit to window') : (zh ? '原始尺寸' : 'Actual size');
    dialog.querySelector('.image-scroll').scrollTo(0, 0);
    dialog.showModal();
    document.documentElement.classList.add('image-open');
    if (mobile) {
      dialog.querySelector('p').textContent = caption + (zh ? ' 左右滑动可查看原图细节。' : ' Swipe horizontally to explore details.');
      const url = link.href;
      img.decode().then(() => {if (dialog.open && img.src === url) dialog.querySelector('.image-scroll').scrollTo(Number(link.dataset.imageX)||0, Number(link.dataset.imageY)||0);}).catch(() => {});
    }
  });
}

for (const demo of document.querySelectorAll('[data-workflow]')) {
  const tabs = [...demo.querySelectorAll('[data-stage]')];
  const panels = [...demo.querySelectorAll('[data-panel]')];
  demo.querySelector('.workflow-tabs').setAttribute('role', 'tablist');
  const activate = index => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
  };
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', tab.id);
    panels[i].tabIndex = 0;
    tab.addEventListener('click', event => { event.preventDefault(); activate(i); });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (event.key === ' ') next = i;
      if (next !== undefined) { event.preventDefault(); activate(next); tabs[next].focus(); }
    });
  });
  const initial = panels.findIndex(panel => `#${panel.id}` === location.hash);
  activate(initial >= 0 ? initial : 0);
}

const manual = document.querySelector('[data-manual-base]');
if (manual) {
  const syncManual = () => {
    const section = location.hash.slice(1);
    const valid = /^[a-z0-9_]+$/.test(section);
    manual.src = manual.dataset.manualBase + (valid ? '#' + section : '');
    const languageLink = document.querySelector('.language-switch');
    if (languageLink) languageLink.hash = valid ? section : '';
  };
  syncManual();
  window.addEventListener('hashchange', syncManual);
  // Native HTML links still open and scroll the iframe on file:// previews.
  for (const link of document.querySelectorAll('[data-manual-section]')) {
    link.addEventListener('click', event => {
      event.preventDefault();
      const hash = '#' + link.dataset.manualSection;
      if (location.hash === hash) syncManual();
      else location.hash = hash;
    });
  }
}
