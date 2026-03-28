/* ==========================================================================
   Creeping Thoughts — Backrooms Effects
   ========================================================================== */

(function () {
  'use strict';

  var pageLoadTime = Date.now();

  /* ------------------------------------------------------------------
     State
     ------------------------------------------------------------------ */

  var liminalScrollHandler = null;
  var liminalResizeHandler = null;
  var liminalCursorHandler = null;
  var timeGhostInterval = null;
  var clockInterval = null;
  var parallaxScrollHandler = null;
  var parallaxResizeHandler = null;

  /* ------------------------------------------------------------------
     Letter-spacing drift on scroll
     ------------------------------------------------------------------ */

  function initLetterSpacingDrift() {
    var driftEls = document.querySelectorAll(
      '.hero__title, .essay-card__title'
    );
    driftEls.forEach(function (el) { el.classList.add('liminal-drift'); });

    var maxDrift = 0.1;
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

  /* ------------------------------------------------------------------
     Cursor-repel on essay cards
     ------------------------------------------------------------------ */

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
     Live clock
     ------------------------------------------------------------------ */

  function initLiveClock() {
    var clock = document.querySelector('.live-clock');
    if (!clock) return;

    function updateClock() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2, '0');
      var m = String(now.getMinutes()).padStart(2, '0');
      var s = String(now.getSeconds()).padStart(2, '0');
      clock.textContent = h + ':' + m + ':' + s;
    }

    updateClock();
    clockInterval = setInterval(updateClock, 1000);
  }

  /* ------------------------------------------------------------------
     Time-on-page ghost — flickers in the margin gutters
     ------------------------------------------------------------------ */

  function initTimeOnPage() {
    var el = document.querySelector('.time-ghost');
    if (!el) {
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
        var onLeft2 = Math.random() > 0.5;
        left = onLeft2 ? pad : Math.max(vw - elW - pad, pad);
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
        { opacity: 0.5,  duration: 60 },
        { opacity: 0,    duration: 80 },
        { opacity: 0.7,  duration: 50 },
        { opacity: 0,    duration: 100 },
        { opacity: 0.4,  duration: 40 },
        { opacity: 0,    duration: 70 },
        { opacity: 0.6,  duration: 60 },
        { opacity: 0.55, duration: 15000 },
        { opacity: 0,    duration: 80 },
        { opacity: 0.3,  duration: 50 },
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

  /* ------------------------------------------------------------------
     Doorway transition — two panels splitting apart
     ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------
     Water stains
     ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------
     Subtle depth shift on scroll
     ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */

  function init() {
    initLetterSpacingDrift();
    initCursorRepel();
    initLiveClock();
    initTimeOnPage();
    initDoorwayTransition();
    initWaterStains();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
