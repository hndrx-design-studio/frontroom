/* ============================================================
   FRONT ROOM - TRANSITION ROUTER

   Load this file AFTER gsap, ScrollTrigger, Swiper and Lenis.
   See the setup notes in chat for the exact Webflow footer order.
   ============================================================ */

/* ============================================================
   0. NAMESPACE + LENIS (persistent, never destroyed)
   ============================================================ */
window.FR = { modules: [], register: function (m) { this.modules.push(m); } };

gsap.registerPlugin(ScrollTrigger);

window.lenis = new Lenis({
  duration: 2.2,
  easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  autoRaf: true
});

document.addEventListener('click', function (e) {
  if (e.target.closest('[data-lenis-stop]'))  lenis.stop();
  if (e.target.closest('[data-lenis-start]')) lenis.start();
  var toggle = e.target.closest('[data-lenis-toggle]');
  if (toggle) {
    toggle.classList.toggle('stop-scroll');
    toggle.classList.contains('stop-scroll') ? lenis.stop() : lenis.start();
  }
});


/* ============================================================
   1. MODAL  (merged: Archive's lenis control + Work's autoclose)
   ============================================================ */
FR.register((function () {
  var onClick, onKey, observers = [];

  function getModal(name) { return document.querySelector('[data-modal="' + name + '"]'); }
  function isOpen(m) { return m.classList.contains('is-open'); }
  function open(m)  { m.classList.add('is-open');    if (window.lenis) lenis.stop(); }
  function close(m) { m.classList.remove('is-open'); if (window.lenis) lenis.start(); }

  return {
    name: 'modal',
    init: function () {
      var modals = document.querySelectorAll('[data-modal]');
      if (!modals.length) return;

      onClick = function (e) {
        var opener = e.target.closest('[data-modal-open]');
        if (opener) {
          var m = getModal(opener.getAttribute('data-modal-open'));
          if (m) open(m);
          return;
        }
        var closer = e.target.closest('[data-modal-close]');
        if (closer) {
          var mc = getModal(closer.getAttribute('data-modal-close'));
          if (mc) close(mc);
        }
      };
      onKey = function (e) {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('[data-modal].is-open').forEach(close);
      };
      document.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);

      // opt-in autoclose after successful form submit
      modals.forEach(function (m) {
        if (!m.hasAttribute('data-modal-autoclose')) return;
        m.querySelectorAll('.w-form-done').forEach(function (done) {
          var ob = new MutationObserver(function () {
            if (getComputedStyle(done).display !== 'none' && isOpen(m)) {
              setTimeout(function () { close(m); }, 2000);
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
   2. ARCHIVE FILTER  (was duplicated twice — now single)
   ============================================================ */
FR.register((function () {
  var SINGLE = 'fragments';
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
        var keyAttr = work === SINGLE ? 'data-name' : 'data-work';
        var key = norm(card.getAttribute(keyAttr));
        if (!key) return;

        modal.querySelectorAll('[data-work-text]').forEach(function (el) {
          el.style.display = norm(el.getAttribute('data-work')) === work ? '' : 'none';
        });

        document.dispatchEvent(new CustomEvent('archivefiltered', {
          detail: { key: key, keyAttr: keyAttr, modal: modal }
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
   5. WORK HOVER  (GSAP flex-grow)
   ============================================================ */
FR.register((function () {
  var mq = window.matchMedia('(min-width: 768px)');
  var handlers = [], items = [], onMQ;

  function bind() {
    if (handlers.length || !items.length) return;
    var origins = ['left top', 'left top', 'center top', 'right top', 'right top'];
    items.forEach(function (item, i) {
      gsap.set(item, { transformOrigin: origins[i] || 'center top' });
      var enter = function () {
        gsap.to(item, { flexGrow: 1.2, duration: 0.6, ease: 'power3.inOut' });
        gsap.to(items.filter(function (el) { return el !== item; }),
          { flexGrow: 1, opacity: 0.4, duration: 0.5, ease: 'power2.inOut' });
      };
      var leave = function () {
        gsap.to(items, { flexGrow: 1, opacity: 1, duration: 0.5, ease: 'power3.inOut' });
      };
      item.addEventListener('mouseenter', enter);
      item.addEventListener('mouseleave', leave);
      handlers.push({ item: item, enter: enter, leave: leave });
    });
  }

  function unbind() {
    handlers.forEach(function (h) {
      h.item.removeEventListener('mouseenter', h.enter);
      h.item.removeEventListener('mouseleave', h.leave);
    });
    handlers.length = 0;
    if (items.length) gsap.set(items, { flexGrow: 1, opacity: 1, clearProps: 'transform' });
  }

  return {
    name: 'workHover',
    init: function () {
      // Work's slides only: not inside a modal
      items = gsap.utils.toArray('.swiper-slide').filter(function (el) {
        return !el.closest('[data-modal]');
      });
      if (!items.length) return;
      onMQ = function (e) { e.matches ? bind() : unbind(); };
      onMQ(mq);
      mq.addEventListener('change', onMQ);
    },
    destroy: function () {
      unbind();
      if (onMQ) mq.removeEventListener('change', onMQ);
      onMQ = null;
      items = [];
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
  var EASE = 'sine.out';

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

        gsap.set(main, { y: '100vh' });
        if (!holdNav && navs.length) gsap.set(navs, { yPercent: -100 });

        var tl = gsap.timeline({
          onComplete: function () {
            destroyAll();

            incoming.style.position = incoming.style.inset =
              incoming.style.zIndex = incoming.style.width = '';
            gsap.set([main].concat(navs), { clearProps: 'transform' });
            if (oldWrapper && oldWrapper.parentNode) oldWrapper.remove();

            if (push) history.pushState({ url: url }, '', url);
            swapHead(doc);

            if (window.lenis) lenis.scrollTo(0, { immediate: true });
            else window.scrollTo(0, 0);

            initAll();
            ScrollTrigger.refresh();
            animating = false;
          }
        });

        if (overlay) {
          gsap.set(overlay, { visibility: 'visible', pointerEvents: 'none' });
          tl.fromTo(overlay, { opacity: 0 },
              { opacity: 1, duration: OVERLAY_MS / 1000, ease: EASE }, 0)
            .to(overlay, { opacity: 0, duration: OVERLAY_MS / 1000, ease: EASE },
              SLIDE_MS / 1000 - OVERLAY_MS / 1000);
        }
        tl.to(main, { y: 0, duration: SLIDE_MS / 1000, ease: EASE }, 0);
        if (!holdNav && navs.length) {
          tl.to(navs, { yPercent: 0, duration: NAV_MS / 1000, ease: EASE }, NAV_DELAY / 1000);
        }
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
  ScrollTrigger.refresh();
})();
