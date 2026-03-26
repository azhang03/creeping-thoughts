/* ==========================================================================
   Creeping Thoughts — Liminal Tier System
   Tier A: liminal  |  Tier B: reframe  |  Tier C: backrooms
   ========================================================================== */

(function () {
  'use strict';

  var THEME_KEY = 'creeping-thoughts-tier';
  var TIERS = ['liminal', 'reframe', 'backrooms'];
  var TIER_LABELS = { liminal: 'LIMINAL', reframe: 'REFRAME', backrooms: 'BACKROOMS' };

  var pageLoadTime = Date.now();

  /* ------------------------------------------------------------------
     State
     ------------------------------------------------------------------ */

  var currentTier = null;
  var liminalScrollHandler = null;
  var liminalResizeHandler = null;
  var liminalCursorHandler = null;
  var timeGhostInterval = null;
  var clockInterval = null;
  var parallaxScrollHandler = null;
  var parallaxResizeHandler = null;
  var audioCtx = null;
  var humGain = null;
  var humOsc = null;
  var humActive = false;

  /* ------------------------------------------------------------------
     Tier Toggle
     ------------------------------------------------------------------ */

  function getSavedTier() {
    var saved = localStorage.getItem(THEME_KEY);
    return TIERS.indexOf(saved) !== -1 ? saved : 'liminal';
  }

  function cycleTier() {
    var idx = TIERS.indexOf(currentTier);
    var next = TIERS[(idx + 1) % TIERS.length];
    applyTier(next);
  }

  function applyTier(tier) {
    teardownAll();
    currentTier = tier;
    localStorage.setItem(THEME_KEY, tier);
    document.body.setAttribute('data-theme', tier);
    updateToggleLabel(tier);

    initLiminalBase();

    if (tier === 'reframe' || tier === 'backrooms') {
      initReframe();
    } else {
      teardownReframe();
    }

    if (tier === 'backrooms') {
      initBackrooms();
    } else {
      teardownBackrooms();
    }
  }

  function updateToggleLabel(tier) {
    var btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = TIER_LABELS[tier] || tier.toUpperCase();
  }

  /* ------------------------------------------------------------------
     TIER A — Liminal Base (always active)
     ------------------------------------------------------------------ */

  function initLiminalBase() {
    initLetterSpacingDrift();
    initCursorRepel();
  }

  /* Letter-spacing drift — maxScroll cached to prevent feedback loop */
  function initLetterSpacingDrift() {
    var driftEls = document.querySelectorAll(
      '.hero__title, .essay-header__title, .essay-card__title'
    );
    driftEls.forEach(function (el) { el.classList.add('liminal-drift'); });

    var maxDrift = currentTier === 'backrooms' ? 0.1 : 0.06;
    var cachedMaxScroll = document.body.scrollHeight - window.innerHeight;

    liminalResizeHandler = function () {
      cachedMaxScroll = document.body.scrollHeight - window.innerHeight;
    };
    window.addEventListener('resize', liminalResizeHandler, { passive: true });

    liminalScrollHandler = function () {
      var progress = Math.min(window.scrollY / Math.max(cachedMaxScroll, 1), 1);
      var drift = progress * maxDrift;

      driftEls.forEach(function (el) {
        el.style.letterSpacing = drift + 'em';
      });
    };

    window.addEventListener('scroll', liminalScrollHandler, { passive: true });
  }

  /* Cursor-repel on essay cards */
  function initCursorRepel() {
    var cards = document.querySelectorAll('.essay-card');
    if (!cards.length) return;

    liminalCursorHandler = function (e) {
      cards.forEach(function (card) {
        var rect = card.getBoundingClientRect();
        var cardCenterY = rect.top + rect.height / 2;
        var dy = e.clientY - cardCenterY;
        var distance = Math.abs(dy);

        if (distance < 200) {
          var intensity = 1 - distance / 200;
          var shift = (dy > 0 ? -1 : 1) * intensity * 2;
          card.style.transform = 'translateY(' + shift + 'px)';
        } else {
          card.style.transform = '';
        }
      });
    };

    document.addEventListener('mousemove', liminalCursorHandler, { passive: true });
  }

  /* ------------------------------------------------------------------
     TIER B — Reframe (language swaps, live clock, time-on-page)
     ------------------------------------------------------------------ */

  var originalTexts = {};

  function storeOriginal(el, key) {
    if (!originalTexts[key]) {
      originalTexts[key] = el.textContent;
    }
  }

  function initReframe() {
    swapTextsToReframe();
    initLiveClock();
    initTimeOnPage();
  }

  function teardownReframe() {
    restoreOriginalTexts();
    destroyLiveClock();
    destroyTimeOnPage();
  }

  function swapTextsToReframe() {
    document.querySelectorAll('.essay-card__number').forEach(function (el) {
      storeOriginal(el, 'num-' + el.textContent.trim());
      var num = el.textContent.trim();
      if (num.indexOf('ROOM') === -1) {
        el.textContent = 'ROOM ' + num;
      }
    });

    var heading = document.querySelector('.essay-index__heading');
    if (heading) {
      storeOriginal(heading, 'index-heading');
      heading.textContent = 'DIRECTORY';
    }

    document.querySelectorAll('.essay-nav__back').forEach(function (el) {
      storeOriginal(el, 'nav-back');
      el.textContent = 'EXIT';
    });
  }

  function restoreOriginalTexts() {
    document.querySelectorAll('.essay-card__number').forEach(function (el) {
      var key = 'num-' + el.textContent.replace('ROOM ', '').trim();
      if (originalTexts[key]) el.textContent = originalTexts[key];
    });

    var heading = document.querySelector('.essay-index__heading');
    if (heading && originalTexts['index-heading']) {
      heading.textContent = originalTexts['index-heading'];
    }

    document.querySelectorAll('.essay-nav__back').forEach(function (el) {
      if (originalTexts['nav-back']) el.textContent = originalTexts['nav-back'];
    });
  }

  /* Live clock */
  function initLiveClock() {
    var existing = document.querySelector('.live-clock');
    if (existing) {
      existing.style.display = '';
      updateClock(existing);
      clockInterval = setInterval(function () { updateClock(existing); }, 1000);
      return;
    }

    var header = document.querySelector('.site-header .content-col');
    if (!header) return;

    var clock = document.createElement('span');
    clock.className = 'live-clock';
    var toggle = header.querySelector('.theme-toggle');
    if (toggle) {
      header.insertBefore(clock, toggle);
    } else {
      header.appendChild(clock);
    }

    updateClock(clock);
    clockInterval = setInterval(function () { updateClock(clock); }, 1000);
  }

  function updateClock(el) {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = h + ':' + m + ':' + s;
  }

  function destroyLiveClock() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    var clock = document.querySelector('.live-clock');
    if (clock) clock.style.display = 'none';
  }

  /* Time-on-page ghost — flickers in the margin gutters */
  function initTimeOnPage() {
    var el = document.querySelector('.time-ghost');
    if (el) {
      el.style.display = '';
    } else {
      el = document.createElement('div');
      el.className = 'time-ghost';
      document.body.appendChild(el);
    }

    function getTimeText() {
      var elapsed = Math.floor((Date.now() - pageLoadTime) / 60000);
      if (elapsed < 1) return 'You have been here for less than a minute.';
      if (elapsed === 1) return 'You have been here for 1 minute.';
      return 'You have been here for ' + elapsed + ' minutes.';
    }

    function safePosition() {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var pad = 16;
      var contentW = Math.min(660, vw);
      var gutterW = (vw - contentW) / 2;

      if (gutterW > 60) {
        el.style.maxWidth = Math.floor(gutterW - pad * 2) + 'px';
      } else {
        el.style.maxWidth = Math.floor(vw * 0.4) + 'px';
      }

      var elW = el.offsetWidth;
      var elH = el.offsetHeight;

      var maxTop = Math.max(vh - elH - pad, pad);
      var top = pad + Math.random() * (maxTop - pad);

      var left;
      if (gutterW > elW + pad * 2) {
        var onLeft = Math.random() > 0.5;
        if (onLeft) {
          left = pad + Math.random() * Math.max(gutterW - elW - pad * 2, 0);
        } else {
          var rightStart = vw - gutterW + pad;
          left = rightStart + Math.random() * Math.max(gutterW - elW - pad * 2, 0);
        }
      } else {
        var onLeft = Math.random() > 0.5;
        left = onLeft ? pad : Math.max(vw - elW - pad, pad);
      }

      el.style.top = Math.round(top) + 'px';
      el.style.left = Math.round(left) + 'px';
      el.style.right = '';
    }

    function flickerSequence() {
      el.textContent = getTimeText();
      el.style.opacity = '0';
      safePosition();

      var steps = [
        { opacity: 0.35, duration: 60 },
        { opacity: 0,    duration: 80 },
        { opacity: 0.5,  duration: 50 },
        { opacity: 0,    duration: 100 },
        { opacity: 0.25, duration: 40 },
        { opacity: 0,    duration: 70 },
        { opacity: 0.4,  duration: 60 },
        { opacity: 0.35, duration: 30000 },
        { opacity: 0,    duration: 80 },
        { opacity: 0.2,  duration: 50 },
        { opacity: 0,    duration: 0 }
      ];

      var i = 0;
      function runStep() {
        if (i >= steps.length) {
          scheduleNext();
          return;
        }
        el.style.opacity = steps[i].opacity;
        var dur = steps[i].duration;
        i++;
        if (dur > 0) {
          setTimeout(runStep, dur);
        } else {
          scheduleNext();
        }
      }

      runStep();
    }

    function scheduleNext() {
      timeGhostInterval = setTimeout(flickerSequence, 1000 + Math.random() * 2000);
    }

    timeGhostInterval = setTimeout(flickerSequence, 2000 + Math.random() * 3000);
  }

  function destroyTimeOnPage() {
    if (timeGhostInterval) { clearTimeout(timeGhostInterval); timeGhostInterval = null; }
    var el = document.querySelector('.time-ghost');
    if (el) { el.style.opacity = '0'; el.style.display = 'none'; }
  }

  /* ------------------------------------------------------------------
     TIER C — Backrooms (doorway, water stains, hum, parallax)
     ------------------------------------------------------------------ */

  function initBackrooms() {
    initDoorwayTransition();
    initWaterStains();
    initHumToggle();
    initParallax();
  }

  function teardownBackrooms() {
    destroyHum();
    destroyParallax();
    var humBtn = document.querySelector('.hum-toggle');
    if (humBtn) humBtn.style.display = 'none';
  }

  /* Doorway transition — two panels splitting apart */
  function initDoorwayTransition() {
    document.querySelectorAll('.doorway-left, .doorway-right').forEach(function (el) {
      el.remove();
    });

    var left = document.createElement('div');
    left.className = 'doorway-left entering';
    var right = document.createElement('div');
    right.className = 'doorway-right entering';

    document.body.appendChild(left);
    document.body.appendChild(right);

    left.addEventListener('animationend', function () { left.remove(); });
    right.addEventListener('animationend', function () { right.remove(); });
  }

  /* Water stains */
  function initWaterStains() {
    if (document.querySelector('.water-stain')) return;

    var stains = [
      { top: '10%', left: '3%', w: 320, h: 220 },
      { top: '45%', right: '2%', w: 280, h: 300 },
      { top: '75%', left: '12%', w: 350, h: 180 }
    ];

    stains.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'water-stain';
      el.style.width = s.w + 'px';
      el.style.height = s.h + 'px';
      if (s.top) el.style.top = s.top;
      if (s.left) el.style.left = s.left;
      if (s.right) el.style.right = s.right;
      document.body.appendChild(el);
    });
  }

  /* Ambient hum — Web Audio API */
  function initHumToggle() {
    var existing = document.querySelector('.hum-toggle');
    if (existing) {
      existing.style.display = '';
      return;
    }

    var footer = document.querySelector('.site-footer');
    if (!footer) return;

    var btn = document.createElement('button');
    btn.className = 'hum-toggle';
    btn.textContent = 'HUM: OFF';
    btn.setAttribute('aria-label', 'Toggle ambient hum');
    footer.appendChild(btn);

    btn.addEventListener('click', function () {
      if (humActive) {
        stopHum();
        btn.textContent = 'HUM: OFF';
        btn.classList.remove('active');
      } else {
        startHum();
        btn.textContent = 'HUM: ON';
        btn.classList.add('active');
      }
    });
  }

  function startHum() {
    if (humActive) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      humOsc = audioCtx.createOscillator();
      humOsc.type = 'sine';
      humOsc.frequency.value = 60;

      var lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.3;
      var lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 2;
      lfo.connect(lfoGain);
      lfoGain.connect(humOsc.frequency);
      lfo.start();

      humGain = audioCtx.createGain();
      humGain.gain.value = 0;
      humOsc.connect(humGain);
      humGain.connect(audioCtx.destination);
      humOsc.start();

      humGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 1.5);
      humActive = true;
    } catch (e) {
      /* Web Audio not supported — silently fail */
    }
  }

  function stopHum() {
    if (!humActive || !audioCtx) return;
    try {
      humGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      setTimeout(function () {
        if (humOsc) { humOsc.stop(); humOsc = null; }
        if (audioCtx) { audioCtx.close(); audioCtx = null; }
        humGain = null;
      }, 600);
    } catch (e) { /* safe cleanup */ }
    humActive = false;
  }

  function destroyHum() {
    stopHum();
    var btn = document.querySelector('.hum-toggle');
    if (btn) {
      btn.textContent = 'HUM: OFF';
      btn.classList.remove('active');
    }
  }

  /* Subtle depth shift — 2D scale avoids 3D compositing scroll jitter */
  function initParallax() {
    var cols = document.querySelectorAll('.essay-body.content-col, .essay-index.content-col, .intro.content-col');
    if (!cols.length) return;

    var cachedMax = document.body.scrollHeight - window.innerHeight;

    parallaxResizeHandler = function () {
      cachedMax = document.body.scrollHeight - window.innerHeight;
    };
    window.addEventListener('resize', parallaxResizeHandler, { passive: true });

    parallaxScrollHandler = function () {
      var progress = Math.min(window.scrollY / Math.max(cachedMax, 1), 1);
      var s = 1 + progress * 0.008;
      for (var i = 0; i < cols.length; i++) {
        cols[i].style.transform = 'scale(' + s + ')';
      }
    };
    window.addEventListener('scroll', parallaxScrollHandler, { passive: true });
  }

  function destroyParallax() {
    if (parallaxScrollHandler) {
      window.removeEventListener('scroll', parallaxScrollHandler);
      parallaxScrollHandler = null;
    }
    if (parallaxResizeHandler) {
      window.removeEventListener('resize', parallaxResizeHandler);
      parallaxResizeHandler = null;
    }
    document.querySelectorAll('.content-col').forEach(function (col) {
      col.style.transform = '';
    });
  }

  /* ------------------------------------------------------------------
     Teardown helpers
     ------------------------------------------------------------------ */

  function teardownAll() {
    if (liminalScrollHandler) {
      window.removeEventListener('scroll', liminalScrollHandler);
      liminalScrollHandler = null;
    }
    if (liminalResizeHandler) {
      window.removeEventListener('resize', liminalResizeHandler);
      liminalResizeHandler = null;
    }
    if (liminalCursorHandler) {
      document.removeEventListener('mousemove', liminalCursorHandler);
      liminalCursorHandler = null;
    }
    if (timeGhostInterval) {
      clearTimeout(timeGhostInterval);
      timeGhostInterval = null;
    }

    document.querySelectorAll('.liminal-drift').forEach(function (el) {
      el.style.letterSpacing = '';
    });
    document.querySelectorAll('.essay-card').forEach(function (el) {
      el.style.transform = '';
    });
  }

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */

  function init() {
    var btn = document.querySelector('.theme-toggle');
    if (btn) btn.addEventListener('click', cycleTier);

    var saved = getSavedTier();
    applyTier(saved);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
