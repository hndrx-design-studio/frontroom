window.FR = { modules: [], register: function (m) { this.modules.push(m); } };

/* ============================================================
   1. MODAL   (Archive, Work)
   Openers: data-modal-open="Name"
   Modals:  data-modal="Name"
   Closers: data-modal-close        closes ALL, value ignored
   Lock:    data-modal-lock="never" on the modal to skip scroll lock
   ============================================================ */
FR.register((function () {
  var onClick, onKey, observers = [];

  function modalFor(name) { return document.querySelector('[data-modal="' + name + '"]'); }
  function isOpen(m) { return m.classList.contains('is-open'); }

  function shouldLock(m) {
    return (m.getAttribute('data-modal-lock') || '').toLowerCase() !== 'never';
  }

  function anyLockingOpen() {
    var list = document.querySelectorAll('[data-modal].is-open');
    for (var i = 0; i < list.length; i++) if (shouldLock(list[i])) return true;
    return false;
  }

  function open(m) {
    if (!m) return;
    m.classList.add('is-open');
    if (window.lenis && shouldLock(m)) lenis.stop();
  }

  function closeAll() {
    document.querySelectorAll('[data-modal].is-open').forEach(function (m) {
      m.classList.remove('is-open');
    });
    if (window.lenis && !anyLockingOpen()) lenis.start();
  }

  return {
    name: 'modal',
    init: function () {
      var modals = document.querySelectorAll('[data-modal]');
      if (!modals.length) return;

      onClick = function (e) {
        if (e.target.closest('[data-modal-close]')) { closeAll(); return; }
        var opener = e.target.closest('[data-modal-open]');
        if (!opener) return;
        closeAll();
        open(modalFor(opener.getAttribute('data-modal-open')));
      };
      document.addEventListener('click', onClick);

      onKey = function (e) { if (e.key === 'Escape') closeAll(); };
      document.addEventListener('keydown', onKey);

      modals.forEach(function (m) {
        if (!m.hasAttribute('data-modal-autoclose')) return;
        m.querySelectorAll('.w-form-done').forEach(function (done) {
          var ob = new MutationObserver(function () {
            if (getComputedStyle(done).display !== 'none' && isOpen(m)) {
              setTimeout(closeAll, 2000);
            }
          });
          ob.observe(done, { attributes: true, attributeFilter: ['style'] });
          observers.push(ob);
        });
      });
    },
    destroy: function () {
      if (onClick) document.removeEventListener('click', onClick);
      if (onKey)   document.removeEventListener('keydown', onKey);
      observers.forEach(function (o) { o.disconnect(); });
      observers = [];
      onClick = onKey = null;
    }
  };
})());


/* ============================================================
   1b. HOVER SWAP   (About page services)
   Openers: data-hover-open="Name"
   Targets: data-hover-target="Name"

   >=768px  hover to show, leave to hide, no scroll lock
   <768px   tap to show, tap again or a closer to hide, locks scroll
   Closers: data-hover-close        closes ALL, value ignored
   Toggled class: is-open
   ============================================================ */
FR.register((function () {
  var DESKTOP = '(min-width: 768px)';
  var mq, onMQ, onClick, onKey, bound = [];

  function targetFor(name) { return document.querySelector('[data-hover-target="' + name + '"]'); }
  function isDesktop() { return mq ? mq.matches : window.matchMedia(DESKTOP).matches; }

  function closeAll() {
    document.querySelectorAll('[data-hover-target].is-open').forEach(function (el) {
      el.classList.remove('is-open');
    });
    // scroll only ever locked on mobile, so release it here
    if (window.lenis && !isDesktop()) lenis.start();
  }

  function show(el, lock) {
    if (!el) return;
    el.classList.add('is-open');
    if (lock && window.lenis) lenis.stop();
  }

  function bindHover() {
    if (bound.length) return;
    document.querySelectorAll('[data-hover-open]').forEach(function (opener) {
      var enter = function () {
        if (!isDesktop()) return;
        closeAll();
        show(targetFor(opener.getAttribute('data-hover-open')), false);
      };
      var leave = function () { if (isDesktop()) closeAll(); };
      opener.addEventListener('mouseenter', enter);
      opener.addEventListener('mouseleave', leave);
      bound.push({ el: opener, enter: enter, leave: leave });
    });
  }

  function unbindHover() {
    bound.forEach(function (b) {
      b.el.removeEventListener('mouseenter', b.enter);
      b.el.removeEventListener('mouseleave', b.leave);
    });
    bound = [];
  }

  return {
    name: 'hoverSwap',
    init: function () {
      if (!document.querySelector('[data-hover-open]')) return;
      mq = window.matchMedia(DESKTOP);

      if (isDesktop()) bindHover();
      onMQ = function (e) {
        closeAll();
        e.matches ? bindHover() : unbindHover();
      };
      mq.addEventListener('change', onMQ);

      // mobile: tap to toggle
      onClick = function (e) {
        if (e.target.closest('[data-hover-close]')) { closeAll(); return; }
        if (isDesktop()) return;
        var opener = e.target.closest('[data-hover-open]');
        if (!opener) return;
        var el = targetFor(opener.getAttribute('data-hover-open'));
        if (el && el.classList.contains('is-open')) { closeAll(); return; }
        closeAll();
        show(el, true);
      };
      document.addEventListener('click', onClick);

      onKey = function (e) { if (e.key === 'Escape') closeAll(); };
      document.addEventListener('keydown', onKey);
    },
    destroy: function () {
      unbindHover();
      if (mq && onMQ) mq.removeEventListener('change', onMQ);
      if (onClick) document.removeEventListener('click', onClick);
      if (onKey)   document.removeEventListener('keydown', onKey);
      mq = null; onMQ = onClick = onKey = null;
    }
  };
})());

/* ============================================================
   2. ARCHIVE FILTER  (was duplicated twice ? now single)
   ============================================================ */
FR.register((function () {
  var onClick;

  function norm(v) { return (v || '').trim().toLowerCase(); }

  return {
    name: 'archiveFilter',
    init: function () {
      if (!document.querySelector('[data-modal-open]')) return;

      onClick = function (e) {
        var card = e.target.closest && e.target.closest('[data-modal-open]');
        if (!card || card.closest('[data-modal]')) return;

        var modal = document.querySelector('[data-modal="' + card.getAttribute('data-modal-open') + '"]');
        if (!modal) return;

        var work = norm(card.getAttribute('data-work'));
        if (!work) return;

        modal.querySelectorAll('[data-work-text]').forEach(function (el) {
          el.style.display = norm(el.getAttribute('data-work')) === work ? '' : 'none';
        });

        document.dispatchEvent(new CustomEvent('archivefiltered', {
          detail: { key: work, keyAttr: 'data-work', modal: modal }
        }));
      };
      document.addEventListener('click', onClick, true);
    },
    destroy: function () {
      if (onClick) document.removeEventListener('click', onClick, true);
      onClick = null;
    }
  };
})());


/* ============================================================
   3. ARCHIVE LAYOUT  (row chunking)
   ============================================================ */
FR.register((function () {
  var ITEM = '.archive_item', COLS = 5, MIN = 768, UP = 1.2;
  var track = null, cells = [], current = null, onResize, onFiltered, t;

  function active() { return window.innerWidth >= MIN; }

  function cellFor(el) {
    var c = el.closest('.w-dyn-item');
    return (c && c !== el && c.contains(el)) ? c : el;
  }

  function collect() {
    var found = document.querySelectorAll(ITEM);
    if (!found.length) return false;
    cells = [];
    Array.prototype.forEach.call(found, function (el) {
      var cell = cellFor(el);
      if (cells.indexOf(cell) === -1) cells.push(cell);
    });
    track = cells[0].parentElement;
    return true;
  }

  function flatten() {
    if (!track) return;
    Array.prototype.forEach.call(track.querySelectorAll('.archive-row'), function (row) {
      while (row.firstChild) {
        if (row.firstChild.classList && row.firstChild.classList.contains('archive-spacer')) {
          row.removeChild(row.firstChild);
        } else {
          track.insertBefore(row.firstChild, row);
        }
      }
      track.removeChild(row);
    });
  }

  function build() {
    if (!track && !collect()) return;
    flatten();

    if (!active()) {
      track.style.display = '';
      track.style.flexDirection = '';
      track.style.flexWrap = '';
      current = false;
      return;
    }

    track.style.display = 'flex';
    track.style.flexDirection = 'column';
    track.style.flexWrap = 'nowrap';
    current = true;

    var visible = cells.filter(function (c) { return c.offsetParent !== null; });
    var down = (COLS - UP) / (COLS - 1);

    for (var i = 0; i < visible.length; i += COLS) {
      var chunk = visible.slice(i, i + COLS);
      var row = document.createElement('div');
      row.className = 'archive-row';
      row.style.setProperty('--up', String(UP));
      row.style.setProperty('--down', String(down));
      track.insertBefore(row, chunk[0]);
      chunk.forEach(function (cell) { row.appendChild(cell); });
      for (var k = chunk.length; k < COLS; k++) {
        var pad = document.createElement('div');
        pad.className = 'archive-spacer';
        row.appendChild(pad);
      }
    }
  }

  return {
    name: 'archiveLayout',
    init: function () {
      track = null; cells = []; current = null;
      if (!document.querySelector(ITEM)) return;
      build();

      onResize = function () {
        clearTimeout(t);
        t = setTimeout(function () { if (active() !== current) build(); }, 150);
      };
      onFiltered = function () { requestAnimationFrame(build); };
      window.addEventListener('resize', onResize);
      document.addEventListener('archivefiltered', onFiltered);
    },
    destroy: function () {
      clearTimeout(t);
      if (onResize)   window.removeEventListener('resize', onResize);
      if (onFiltered) document.removeEventListener('archivefiltered', onFiltered);
      onResize = onFiltered = null;
      track = null; cells = []; current = null;
    }
  };
})());


/* ============================================================
   4. ARCHIVE SLIDER  (Swiper, filter-aware)
   ============================================================ */
FR.register((function () {
  var SPEED = 600, DELAY = 3000;
  var MQ = window.matchMedia('(max-width: 767px)');
  var entries = [], onMQ, onFiltered;

  function vertical() { return !MQ.matches; }
  function norm(v) { return (v || '').trim().toLowerCase(); }

  function scopeFor(el) {
    return el.closest('[data-slider-wrap]') || el.closest('[data-modal]') || el.parentElement || document;
  }

  function navFor(scope) {
    var prev = null, next = null;
    scope.querySelectorAll('[data-slide],[data-slider]').forEach(function (n) {
      var v = norm(n.getAttribute('data-slide') || n.getAttribute('data-slider'));
      if (!prev && v.indexOf('prev') === 0) prev = n;
      if (!next && v.indexOf('next') === 0) next = n;
    });
    return { prev: prev, next: next, wrap: scope.querySelector('.slider-nav') };
  }

  function snapshot(wrapper) {
    var master = [];
    Array.prototype.forEach.call(wrapper.children, function (child) {
      if (child.classList.contains('w-dyn-empty')) return;
      if (child.classList.contains('swiper-slide-duplicate')) return;
      if (!child.classList.contains('swiper-slide')) {
        var inner = child.querySelector('.swiper-slide');
        if (inner) inner.classList.remove('swiper-slide');
        child.classList.add('swiper-slide');
      }
      master.push(child);
    });
    return master;
  }

  function showNav(nav, on) {
    var v = on ? '' : 'none';
    if (nav.wrap) nav.wrap.style.display = v;
    if (nav.prev) nav.prev.style.display = v;
    if (nav.next) nav.next.style.display = v;
  }

  function build(entry) {
    var el = entry.el;
    var unique = entry.key
      ? entry.master.filter(function (s) { return norm(s.getAttribute(entry.keyAttr)) === entry.key; })
      : entry.master.slice();

    entry.scope.classList.toggle('is-single', unique.length === 1);
    if (!el.clientWidth || !el.clientHeight) return;

    if (entry.swiper && !entry.swiper.destroyed) entry.swiper.destroy(true, true);
    entry.swiper = null;

    var slides = unique.slice();
    if (slides.length > 1) {
      var need = Math.max(4, unique.length * 3);
      while (slides.length < need) {
        slides = slides.concat(unique.map(function (s) { return s.cloneNode(true); }));
      }
    }

    entry.wrapper.innerHTML = '';
    slides.forEach(function (s) {
      s.style.display = '';
      s.classList.remove('swiper-slide-active', 'swiper-slide-next', 'swiper-slide-prev');
      entry.wrapper.appendChild(s);
    });

    var vert = vertical();
    var total = unique.reduce(function (sum, s) {
      return sum + (vert ? s.offsetHeight : s.offsetWidth);
    }, 0);
    var limit = vert ? el.clientHeight : el.clientWidth;
    var enough = unique.length > 1 && total > limit + 1;

    showNav(entry.nav, enough);
    if (!enough) return;

    entry.swiper = new Swiper(el, {
      direction: vert ? 'vertical' : 'horizontal',
      slidesPerView: 'auto',
      spaceBetween: 0,
      speed: SPEED,
      loop: true,
      freeMode: true,
      grabCursor: true,
      autoplay: { delay: DELAY, disableOnInteraction: false, pauseOnMouseEnter: true },
      navigation: { prevEl: entry.nav.prev, nextEl: entry.nav.next }
    });
  }

  function queue(entry) {
    clearTimeout(entry.t);
    entry.t = setTimeout(function () { build(entry); }, 60);
  }

  return {
    name: 'archiveSlider',
    init: function () {
      entries = [];
      // only claim sliders that live inside a modal / slider wrap (Archive's)
      document.querySelectorAll('.swiper').forEach(function (el) {
        var scope = scopeFor(el);
        if (!el.closest('[data-modal]') && !el.closest('[data-slider-wrap]')) return;
        var wrapper = el.querySelector('.swiper-wrapper');
        if (!wrapper) return;

        var entry = {
          el: el, wrapper: wrapper, scope: scope,
          master: snapshot(wrapper), nav: navFor(scope),
          swiper: null, key: null, keyAttr: 'data-work', t: null, w: 0, h: 0, ro: null
        };
        entries.push(entry);

        if (window.ResizeObserver) {
          entry.ro = new ResizeObserver(function () {
            var w = el.clientWidth, h = el.clientHeight;
            if (w === entry.w && h === entry.h) return;
            entry.w = w; entry.h = h;
            if (w > 0 && h > 0) queue(entry);
            else if (entry.swiper && entry.swiper.autoplay) entry.swiper.autoplay.stop();
          });
          entry.ro.observe(el);
        }
        queue(entry);
      });
      if (!entries.length) return;

      onMQ = function () { entries.forEach(queue); };
      MQ.addEventListener('change', onMQ);

      onFiltered = function (e) {
        var d = e.detail || {};
        var scope = d.modal || document;
        entries.forEach(function (entry) {
          if (!scope.contains(entry.el)) return;
          entry.key = norm(d.key);
          entry.keyAttr = d.keyAttr || 'data-work';
          queue(entry);
        });
      };
      document.addEventListener('archivefiltered', onFiltered);
    },
    destroy: function () {
      entries.forEach(function (entry) {
        clearTimeout(entry.t);
        if (entry.ro) entry.ro.disconnect();
        if (entry.swiper && !entry.swiper.destroyed) entry.swiper.destroy(true, true);
      });
      entries = [];
      if (onMQ) MQ.removeEventListener('change', onMQ);
      if (onFiltered) document.removeEventListener('archivefiltered', onFiltered);
      onMQ = onFiltered = null;
    }
  };
})());


/* ============================================================
   6. WORK SLIDER  (mobile only)
   ============================================================ */
FR.register((function () {
  var mq = window.matchMedia('(max-width: 767px)');
  var swiper = null, container = null, onMQ;

  function handle(e) {
    if (e.matches && !swiper && container) {
      swiper = new Swiper(container, {
        freeMode: true,
        slidesPerView: 'auto',
        grabCursor: true,
        touchStartPreventDefault: false
      });
    } else if (!e.matches && swiper) {
      swiper.destroy(true, true);
      swiper = null;
    }
  }

  return {
    name: 'workSlider',
    init: function () {
      container = null;
      document.querySelectorAll('.swiper').forEach(function (el) {
        if (container) return;
        if (el.closest('[data-modal]') || el.closest('[data-slider-wrap]')) return;
        container = el;
      });
      if (!container) return;
      onMQ = function (e) { handle(e); };
      handle(mq);
      mq.addEventListener('change', onMQ);
    },
    destroy: function () {
      if (swiper && !swiper.destroyed) swiper.destroy(true, true);
      swiper = null;
      if (onMQ) mq.removeEventListener('change', onMQ);
      onMQ = null;
      container = null;
    }
  };
})());


/* ============================================================
   7. CMS NEXT  (project prev/next)
   ============================================================ */
FR.register({
  name: 'cmsNext',
  init: function () {
    if (typeof window.$ !== 'function') return;
    if (!$("[tr-cmsnext-element='component']").length) return;

    $("[tr-cmsnext-element='component']").each(function () {
      var componentEl = $(this),
          cmsListEl = componentEl.find('.w-dyn-items').first(),
          cmsItemEl = cmsListEl.children(),
          currentItemEl,
          noResultEl = componentEl.find("[tr-cmsnext-element='no-result']");

      cmsItemEl.each(function () {
        if ($(this).find('.w--current').length) currentItemEl = $(this);
      });
      if (!currentItemEl) return;

      var nextItemEl = currentItemEl.next(),
          prevItemEl = currentItemEl.prev();

      if (componentEl.attr('tr-cmsnext-loop') === 'true') {
        if (!nextItemEl.length) nextItemEl = cmsItemEl.first();
        if (!prevItemEl.length) prevItemEl = cmsItemEl.last();
      }

      var displayEl = nextItemEl;
      if (componentEl.attr('tr-cmsnext-showprev') === 'true') displayEl = prevItemEl;

      if (componentEl.attr('tr-cmsnext-showall') === 'true') {
        prevItemEl.addClass('is-prev');
        currentItemEl.addClass('is-current');
        nextItemEl.addClass('is-next');
      } else {
        cmsItemEl.not(displayEl).remove();
        if (!displayEl.length) noResultEl.show();
        if (!displayEl.length && componentEl.attr('tr-cmsnext-hideempty') === 'true') componentEl.hide();
      }
    });
  },
  destroy: function () { /* DOM-only, removed with the old wrapper */ }
});


/* ============================================================
   8. FINSWEET  (restart on each navigation)
   ============================================================ */
FR.register({
  name: 'finsweet',
  init: function () {
    if (!document.querySelector('[fs-list-element], [fs-list-field], [fs-list-instance]')) return;
    try {
      window.FinsweetAttributes = window.FinsweetAttributes || [];
      window.FinsweetAttributes.push(['list', function (instances) {
        (instances || []).forEach(function (i) { if (i && i.restart) i.restart(); });
      }]);
    } catch (e) {}
  },
  destroy: function () {}
});


/* ============================================================
   9. THE ROUTER
   ============================================================ */
(function () {
  var SLIDE_MS = 800, NAV_DELAY = 400, NAV_MS = 400, OVERLAY_MS = 400;
  var EASE = 'cubic-bezier(.39,.575,.565,1)';

  var SEL = {
    wrapper: '.page-wrapper',
    main:    '.main-wrapper',
    overlay: '.overlay',
    navDesk: '.navbar_component',
    navMob:  '.mobile_rm-wrap'
  };

  var animating = false;

  function initAll()    { FR.modules.forEach(function (m) { try { m.init(); }    catch (e) { console.warn('[FR] init ' + m.name, e); } }); }
  function destroyAll() { FR.modules.forEach(function (m) { try { m.destroy(); } catch (e) { console.warn('[FR] destroy ' + m.name, e); } }); }

  function isInternal(a) {
    if (!a || !a.href) return false;
    if (a.target === '_blank' || a.hasAttribute('download')) return false;
    var href = a.getAttribute('href');
    if (!href || href.indexOf('#') === 0 || /^(mailto:|tel:)/i.test(href)) return false;
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return false; }
    if (u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.hash) return false;
    return true;
  }

  function swapHead(doc) {
    var t = doc.querySelector('title');
    if (t) document.title = t.textContent;
    ['description', 'og:title', 'og:description', 'og:image', 'og:url'].forEach(function (n) {
      var sel = n.indexOf('og:') === 0 ? 'meta[property="' + n + '"]' : 'meta[name="' + n + '"]';
      var inc = doc.querySelector(sel), cur = document.querySelector(sel);
      if (inc && cur) cur.setAttribute('content', inc.getAttribute('content'));
    });
    var c1 = doc.querySelector('link[rel="canonical"]'), c2 = document.querySelector('link[rel="canonical"]');
    if (c1 && c2) c2.setAttribute('href', c1.getAttribute('href'));
  }

  // Rebind Webflow IX2 to the new DOM. The data-wf-page attribute tells IX2
  // which page's interaction definitions to load, so it MUST be copied from
  // the incoming document before init or IX2 binds the wrong page's data.
  function reinitWebflow(doc) {
    try {
      var incomingHtml = doc.documentElement;
      var page = incomingHtml && incomingHtml.getAttribute('data-wf-page');
      if (page) document.documentElement.setAttribute('data-wf-page', page);

      if (!window.Webflow) return;
      window.Webflow.destroy();
      window.Webflow.ready();
      var ix2 = window.Webflow.require && window.Webflow.require('ix2');
      if (ix2 && ix2.init) ix2.init();
      document.dispatchEvent(new Event('readystatechange'));

      // reset the active nav link
      document.querySelectorAll('.w--current').forEach(function (el) {
        el.classList.remove('w--current');
      });
      document.querySelectorAll('a[href]').forEach(function (a) {
        try {
          if (new URL(a.href, location.href).pathname === location.pathname) {
            a.classList.add('w--current');
          }
        } catch (e) {}
      });
    } catch (e) { console.warn('[FR] webflow reinit', e); }
  }

  function go(url, holdNav, push) {
    if (animating) return;
    animating = true;

    var overlay = document.querySelector(SEL.overlay);
    var oldWrapper = document.querySelector(SEL.wrapper);
    if (oldWrapper) oldWrapper.style.zIndex = '40';

    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var incoming = doc.querySelector(SEL.wrapper);
        if (!incoming) { location.href = url; return; }

        incoming.querySelectorAll(SEL.overlay).forEach(function (o) { o.remove(); });
        // page-level scripts are dead weight now; the router owns all init
        incoming.querySelectorAll('script').forEach(function (s) { s.remove(); });

        incoming.style.position = 'fixed';
        incoming.style.inset = '0';
        incoming.style.zIndex = '60';
        incoming.style.width = '100%';
        document.body.appendChild(incoming);

        var main = incoming.querySelector(SEL.main);
        var navs = [incoming.querySelector(SEL.navDesk),
                    incoming.querySelector(SEL.navMob)].filter(Boolean);

        var anims = [];

        function settle() {
          destroyAll();

          anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
          main.style.transform = '';
          navs.forEach(function (n) { n.style.transform = ''; });

          incoming.style.position = incoming.style.inset =
            incoming.style.zIndex = incoming.style.width = '';
          if (oldWrapper && oldWrapper.parentNode) oldWrapper.remove();

          if (push) history.pushState({ url: url }, '', url);
          swapHead(doc);
          reinitWebflow(doc);

          if (window.lenis) lenis.scrollTo(0, { immediate: true });
          else window.scrollTo(0, 0);

          initAll();
          animating = false;
        }

        // starting positions, set before animating to avoid a flash
        main.style.transform = 'translateY(100vh)';
        if (!holdNav) navs.forEach(function (n) { n.style.transform = 'translateY(-100%)'; });

        // page slides up
        anims.push(main.animate(
          [{ transform: 'translateY(100vh)' }, { transform: 'translateY(0)' }],
          { duration: SLIDE_MS, easing: EASE, fill: 'forwards' }
        ));

        // nav slides down, unless this link holds it
        if (!holdNav) {
          navs.forEach(function (n) {
            anims.push(n.animate(
              [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }],
              { duration: NAV_MS, delay: NAV_DELAY, easing: EASE, fill: 'forwards' }
            ));
          });
        }

        // overlay fades in over the first half, out over the second
        if (overlay) {
          overlay.style.visibility = 'visible';
          overlay.style.pointerEvents = 'none';
          anims.push(overlay.animate(
            [
              { opacity: 0, offset: 0,   easing: EASE },
              { opacity: 1, offset: OVERLAY_MS / SLIDE_MS, easing: EASE },
              { opacity: 0, offset: 1 }
            ],
            { duration: SLIDE_MS, fill: 'forwards' }
          ));
        }

        Promise.all(anims.map(function (a) { return a.finished; }))
          .then(settle)
          .catch(settle);
      })
      .catch(function () { location.href = url; });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a');
    if (!isInternal(a)) return;
    e.preventDefault();
    var hold = a.getAttribute('data-vt') === 'hold' ||
               !!(a.closest(SEL.navDesk) || a.closest(SEL.navMob));
    go(a.href, hold, true);
  });

  window.addEventListener('popstate', function () { go(location.href, false, false); });

  // first load
  initAll();
})();
