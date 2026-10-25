(function () {
  'use strict';

  // Cambia X.X.X.X por la IP LAN del servidor antes de instalar en el televisor.
  var API_BASE = 'http://192.168.1.3:3000';
  var loginLayer = document.getElementById('loginLayer');
  var loginForm = document.getElementById('loginForm');
  var usernameInput = document.getElementById('username');
  var passwordInput = document.getElementById('password');
  var loginMessage = document.getElementById('loginMessage');
  var appShell = document.getElementById('appShell');
  var sidebar = document.getElementById('sidebar');
  var nav = document.getElementById('mainNav');
  var grid = document.getElementById('contentGrid');
  var statusMessage = document.getElementById('statusMessage');
  var pageTitle = document.getElementById('pageTitle');
  var pageEyebrow = document.getElementById('pageEyebrow');
  var searchPanel = document.getElementById('searchPanel');
  var searchInput = document.getElementById('searchInput');
  var playerLayer = document.getElementById('playerLayer');
  var video = document.getElementById('videoPlayer');
  var iframeHost = document.getElementById('iframeHost');
  var btnVolver = document.getElementById('btnVolver');
  var playerStatus = document.getElementById('playerStatus');
  var currentView = 'movies';
  var previousFocus = null;
  var hlsInstance = null;
  var searchTimer = null;
  var currentTitle = '';
  var viewRequest = 0;
  var titleMap = { matches: 'Partidos', movies: 'Películas', featured: 'Destacadas', series: 'Series', episodes: 'Episodios', search: 'Búsqueda' };
  var endpointMap = { matches: '/api/matches', movies: '/api/movies', featured: '/api/movies/featured', series: '/api/series', episodes: '/api/episodes' };

  function setStatus(message, isError) {
    statusMessage.textContent = message || '';
    statusMessage.className = isError ? 'status-message error' : 'status-message';
  }

  function setPlayerStatus(message) { playerStatus.textContent = message || ''; }

  function fetchJson(url) {
    return fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } }).then(function (response) {
      if (!response.ok) { throw new Error('Respuesta HTTP ' + response.status); }
      return response.json();
    });
  }

  function loadView(view, query) {
    currentView = view;
    viewRequest += 1;
    var requestId = viewRequest;
    pageTitle.textContent = titleMap[view] || 'VYRO';
    pageEyebrow.textContent = view === 'matches' ? 'EN VIVO Y PRÓXIMAMENTE' : (view === 'search' ? 'ENCUENTRA TU PRÓXIMA HISTORIA' : 'EXPLORA VYRO');
    setStatus('');
    grid.innerHTML = '';
    grid.className = view === 'matches' ? 'content-grid sports-grid' : 'content-grid';
    var endpoint = view === 'search' ? '/api/search?q=' + encodeURIComponent(query || '') : endpointMap[view];
    if (!endpoint) { return; }
    if (view === 'search' && (!query || !query.trim())) {
      renderEmpty('Escribe para buscar películas, series y más.');
      return;
    }
    setStatus('Cargando contenido…');
    fetchJson(API_BASE + endpoint).then(function (payload) {
      if (requestId !== viewRequest) { return; }
      if (!payload || payload.success !== true) { throw new Error('La API devolvió una respuesta no válida.'); }
      var records = view === 'matches' ? payload.matches : payload.data;
      if (!Array.isArray(records)) { throw new Error('La respuesta no contiene una lista de contenido.'); }
      renderItems(records, view === 'matches');
    }).catch(function () {
      if (requestId !== viewRequest) { return; }
      grid.innerHTML = '';
      setStatus('No se pudo conectar con VYRO. Comprueba que el servicio esté disponible en ' + API_BASE + '.', true);
      renderEmpty('Vuelve a intentarlo desde el menú.');
    });
  }

  function renderEmpty(message) {
    grid.innerHTML = '';
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = message;
    grid.appendChild(empty);
  }

  function renderItems(items, isSports) {
    grid.innerHTML = '';
    setStatus('');
    if (!items.length) { renderEmpty('Todavía no hay contenido para mostrar.'); return; }
    var fragment = document.createDocumentFragment();
    items.forEach(function (item) {
      if (!item || !item.title || !item.url) { return; }
      var card = document.createElement('div');
      card.className = isSports ? 'catalog-card sports-ticket' : 'catalog-card poster-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('data-url', item.url);
      card.setAttribute('aria-label', isSports ? item.title + (item.time ? ', ' + item.time : '') : item.title);
      if (isSports) {
        var kicker = document.createElement('div');
        kicker.className = 'ticket-kicker';
        kicker.textContent = 'VYRO SPORTS';
        var title = document.createElement('div');
        title.className = 'ticket-title';
        title.textContent = item.title;
        var time = document.createElement('div');
        time.className = 'ticket-time';
        time.textContent = item.time || 'Disponible próximamente';
        var play = document.createElement('div');
        play.className = 'ticket-play';
        play.setAttribute('aria-hidden', 'true');
        play.textContent = '▶';
        card.appendChild(kicker);
        card.appendChild(title);
        card.appendChild(time);
        card.appendChild(play);
      } else {
        if (item.poster) {
          var image = document.createElement('img');
          image.src = item.poster;
          image.alt = item.title;
          image.onerror = function () {
            var fallback = document.createElement('div');
            fallback.className = 'poster-fallback';
            fallback.textContent = item.title;
            if (image.parentNode) { image.parentNode.replaceChild(fallback, image); }
          };
          card.appendChild(image);
        } else {
          var placeholder = document.createElement('div');
          placeholder.className = 'poster-fallback';
          placeholder.textContent = item.title;
          card.appendChild(placeholder);
        }
        var caption = document.createElement('div');
        caption.className = 'card-caption';
        caption.textContent = item.title;
        card.appendChild(caption);
      }
      card.addEventListener('click', function () { playItem(card); });
      card.addEventListener('keydown', function (event) {
        if (event.keyCode === 13) { event.preventDefault(); playItem(card); }
      });
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    var first = grid.querySelector('[tabindex="0"]');
    if (first) { first.focus(); }
    else { renderEmpty('Todavía no hay contenido para mostrar.'); }
  }

  function activateLogin() {
    var username = usernameInput.value.trim();
    var password = passwordInput.value;
    if (username !== 'Randy' || password !== '123') {
      loginMessage.textContent = 'Usuario o contraseña incorrectos.';
      passwordInput.focus();
      return;
    }
    loginMessage.textContent = '';
    loginLayer.classList.add('is-hidden');
    appShell.classList.remove('is-hidden');
    var moviesButton = nav.querySelector('[data-view="movies"]');
    if (moviesButton) { moviesButton.focus(); }
    loadView('movies');
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    activateLogin();
  });

  nav.addEventListener('click', function (event) {
    var button = event.target.closest('.nav-item');
    if (!button) { return; }
    var view = button.getAttribute('data-view');
    Array.prototype.forEach.call(nav.querySelectorAll('.nav-item'), function (navButton) {
      navButton.classList.toggle('is-active', navButton === button);
    });
    if (view === 'search') {
      searchPanel.classList.remove('is-hidden');
      searchInput.value = '';
      loadView('search', '');
      searchInput.focus();
    } else {
      searchPanel.classList.add('is-hidden');
      loadView(view);
    }
  });

  searchInput.addEventListener('input', function () {
    if (searchTimer) { clearTimeout(searchTimer); }
    searchTimer = setTimeout(function () { loadView('search', searchInput.value); }, 300);
  });

  function loadHlsLibrary() {
    return new Promise(function (resolve, reject) {
      if (window.Hls) { resolve(window.Hls); return; }
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@0.14.17/dist/hls.min.js';
      script.onload = function () { resolve(window.Hls); };
      script.onerror = function () { reject(new Error('No se pudo cargar el reproductor HLS.')); };
      document.head.appendChild(script);
    });
  }

  function playItem(card) {
    var selectedUrl = card.getAttribute('data-url');
    if (!selectedUrl) { return; }
    previousFocus = card;
    currentTitle = card.getAttribute('aria-label') || '';
    playerLayer.classList.remove('is-hidden');
    appShell.classList.add('is-hidden');
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.classList.remove('is-hidden');
    iframeHost.innerHTML = '';
    iframeHost.classList.add('is-hidden');
    setPlayerStatus('Preparando reproducción…');
    btnVolver.focus();
    fetchJson(API_BASE + '/api/stream?url=' + encodeURIComponent(selectedUrl)).then(function (payload) {
      if (!payload || payload.success !== true || !payload.streamUrl) { throw new Error('No se recibió una dirección de reproducción.'); }
      if (payload.type === 'iframe') {
        video.classList.add('is-hidden');
        iframeHost.classList.remove('is-hidden');
        var frame = document.createElement('iframe');
        frame.src = payload.streamUrl;
        frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        frame.setAttribute('allowfullscreen', 'allowfullscreen');
        frame.setAttribute('title', currentTitle || 'Reproductor VYRO');
        iframeHost.appendChild(frame);
        setPlayerStatus('');
        return;
      }
      if (payload.type !== 'hls') { throw new Error('El formato de reproducción no es compatible.'); }
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = payload.streamUrl;
        video.play().catch(function () {});
        setPlayerStatus('');
        return;
      }
      return loadHlsLibrary().then(function (Hls) {
        if (!Hls || !Hls.isSupported()) { throw new Error('Este televisor no puede reproducir este stream HLS.'); }
        hlsInstance = new Hls({ maxBufferLength: 20, maxMaxBufferLength: 300 });
        hlsInstance.loadSource(payload.streamUrl);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
          video.play().catch(function () {});
          setPlayerStatus('');
        });
        hlsInstance.on(Hls.Events.ERROR, function (event, data) {
          if (data && data.fatal) { setPlayerStatus('No se pudo reproducir este contenido.'); }
        });
      });
    }).catch(function (error) {
      setPlayerStatus(error.message || 'No se pudo iniciar la reproducción.');
      btnVolver.focus();
    });
  }

  function stopPlayback(returnToUi) {
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    video.pause();
    video.removeAttribute('src');
    video.load();
    iframeHost.innerHTML = '';
    iframeHost.classList.add('is-hidden');
    video.classList.remove('is-hidden');
    setPlayerStatus('');
    playerLayer.classList.add('is-hidden');
    if (returnToUi) {
      appShell.classList.remove('is-hidden');
      if (previousFocus && document.body.contains(previousFocus)) { previousFocus.focus(); }
      else { sidebar.focus(); }
    }
  }

  btnVolver.addEventListener('click', function () { stopPlayback(true); });

  function moveSpatially(keyCode) {
    var active = document.activeElement;
    if (active === btnVolver || !playerLayer.classList.contains('is-hidden')) { return; }
    if (active && active.closest && active.closest('#sidebar')) {
      var navItems = Array.prototype.slice.call(nav.querySelectorAll('.nav-item'));
      var index = navItems.indexOf(active);
      if (keyCode === 38 && index > 0) { navItems[index - 1].focus(); }
      else if (keyCode === 40 && index < navItems.length - 1) { navItems[index + 1].focus(); }
      else if (keyCode === 39) {
        if (currentView === 'search' && !searchPanel.classList.contains('is-hidden')) { searchInput.focus(); }
        else { var firstCard = grid.querySelector('[tabindex="0"]'); if (firstCard) { firstCard.focus(); } }
      }
      return;
    }
    if (active === searchInput) {
      if (keyCode === 37) { var searchButton = nav.querySelector('[data-view="search"]'); if (searchButton) { searchButton.focus(); } }
      else if (keyCode === 40) { var searchCard = grid.querySelector('[tabindex="0"]'); if (searchCard) { searchCard.focus(); } }
      return;
    }
    var cards = Array.prototype.slice.call(grid.querySelectorAll('[tabindex="0"]'));
    var current = cards.indexOf(active);
    if (current < 0) { return; }
    if (keyCode === 37 && currentView === 'search') { return; }
    if (keyCode === 37 && active.getBoundingClientRect().left <= grid.getBoundingClientRect().left + 8) {
      if (currentView === 'search' && !searchPanel.classList.contains('is-hidden')) { searchInput.focus(); }
      else { var focusedNav = nav.querySelector('.is-active'); if (focusedNav) { focusedNav.focus(); } }
      return;
    }
    if (keyCode === 38 && active.getBoundingClientRect().top <= grid.getBoundingClientRect().top + 8) {
      if (currentView === 'search' && !searchPanel.classList.contains('is-hidden')) { searchInput.focus(); }
      return;
    }
    var rect = active.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var best = null;
    var bestScore = Infinity;
    cards.forEach(function (candidate) {
      if (candidate === active) { return; }
      var other = candidate.getBoundingClientRect();
      var ox = other.left + other.width / 2;
      var oy = other.top + other.height / 2;
      var dx = ox - cx;
      var dy = oy - cy;
      var primary;
      var secondary;
      if (keyCode === 37 && dx < -1) { primary = -dx; secondary = Math.abs(dy); }
      else if (keyCode === 39 && dx > 1) { primary = dx; secondary = Math.abs(dy); }
      else if (keyCode === 38 && dy < -1) { primary = -dy; secondary = Math.abs(dx); }
      else if (keyCode === 40 && dy > 1) { primary = dy; secondary = Math.abs(dx); }
      else { return; }
      var score = primary + secondary * 1.65;
      if (score < bestScore) { bestScore = score; best = candidate; }
    });
    if (best) { best.focus(); }
  }

  document.addEventListener('keydown', function (event) {
    var code = event.keyCode;
    if (code === 37 || code === 38 || code === 39 || code === 40) {
      var active = document.activeElement;
      if (active === usernameInput || active === passwordInput) { return; }
      event.preventDefault();
      moveSpatially(code);
      return;
    }
    if (code === 10009 || code === 27) {
      event.preventDefault();
      if (!playerLayer.classList.contains('is-hidden')) { stopPlayback(true); return; }
      if (appShell.classList.contains('is-hidden')) { return; }
      var focused = document.activeElement;
      if (focused && focused.closest && focused.closest('#sidebar')) {
        try {
          if (window.tizen && window.tizen.application) { window.tizen.application.getCurrentApplication().exit(); }
        } catch (ignore) {}
      } else {
        var selected = nav.querySelector('.is-active');
        if (selected) { selected.focus(); } else { sidebar.focus(); }
      }
    }
  });

  try {
    if (window.tizen && window.tizen.tvinputdevice) { window.tizen.tvinputdevice.registerKey('Return'); }
  } catch (ignore) {}

  usernameInput.focus();
}());
