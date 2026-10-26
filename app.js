(function () {
  'use strict';

  var API_BASE = 'http://192.168.1.3:3000';
  
  var loginLayer = document.getElementById('loginLayer');
  var usernameInput = document.getElementById('username');
  var passwordInput = document.getElementById('password');
  var loginMessage = document.getElementById('loginMessage');
  var loginKeyboard = document.getElementById('loginKeyboard');
  var btnLogin = document.getElementById('btnLogin');

  var appShell = document.getElementById('appShell');
  var nav = document.getElementById('mainNav');
  var grid = document.getElementById('contentGrid');
  var statusMessage = document.getElementById('statusMessage');
  
  var btnOpenSearch = document.getElementById('btnOpenSearch');
  var searchModal = document.getElementById('searchModal');
  var moduleSearchInput = document.getElementById('moduleSearchInput');
  var virtualKeyboard = document.getElementById('virtualKeyboard');
  var btnCloseSearch = document.getElementById('btnCloseSearch');
  
  var playerLayer = document.getElementById('playerLayer');
  var video = document.getElementById('videoPlayer');
  var iframeHost = document.getElementById('iframeHost');
  var btnVolver = document.getElementById('btnVolver');
  var playerStatus = document.getElementById('playerStatus');
  
  var currentView = 'movies';
  var activeData = []; 
  var searchString = "";
  var previousFocus = null;
  var hlsInstance = null;
  var activeLoginInput = null;
  
  var configMap = { 
    movies: { title: 'Películas', endpoint: '/api/movies' },
    tv: { title: 'TV en Vivo', endpoint: '/api/channels' },
    matches: { title: 'Deportes', endpoint: '/api/matches' }
  };

  // Función clave para Smart TVs: Asignar Enter físico como Clic en los elementos
  function bindEnterToClick(element) {
    element.addEventListener('keydown', function(e) {
      if (e.keyCode === 13) {
        e.preventDefault();
        element.click();
      }
    });
  }

  // --- TECLADO DEL LOGIN ---
  function buildLoginKeyboard() {
    loginKeyboard.innerHTML = '';
    var isCaps = false;
    var letterButtons = [];
    
    var btnSpc = document.createElement('button'); btnSpc.className = 'log-key key-spc'; btnSpc.tabIndex = 0; btnSpc.textContent = 'ESPACIO';
    btnSpc.onclick = function() { if(activeLoginInput) activeLoginInput.value += ' '; }; 
    bindEnterToClick(btnSpc); loginKeyboard.appendChild(btnSpc);

    var btnDel = document.createElement('button'); btnDel.className = 'log-key key-del'; btnDel.tabIndex = 0; btnDel.textContent = '⌫ BORRAR';
    btnDel.onclick = function() { if(activeLoginInput) activeLoginInput.value = activeLoginInput.value.slice(0, -1); }; 
    bindEnterToClick(btnDel); loginKeyboard.appendChild(btnDel);

    var btnShift = document.createElement('button'); btnShift.className = 'log-key'; btnShift.tabIndex = 0; btnShift.textContent = 'MAYÚS';
    btnShift.style.gridColumn = 'span 6'; btnShift.style.backgroundColor = '#5830a6';
    btnShift.onclick = function() { 
      isCaps = !isCaps; 
      btnShift.textContent = isCaps ? 'MINÚS' : 'MAYÚS';
      letterButtons.forEach(function(btn) {
        var char = btn.getAttribute('data-char');
        btn.textContent = isCaps ? char.toUpperCase() : char.toLowerCase();
      });
    }; 
    bindEnterToClick(btnShift); loginKeyboard.appendChild(btnShift);

    var keys = 'abcdefghijklmnopqrstuvwxyz1234567890'.split('');
    keys.forEach(function(k) {
      var btn = document.createElement('button'); btn.className = 'log-key'; btn.tabIndex = 0; btn.textContent = k;
      btn.setAttribute('data-char', k);
      btn.onclick = function() { if(activeLoginInput) activeLoginInput.value += btn.textContent; }; 
      bindEnterToClick(btn); loginKeyboard.appendChild(btn);
      if (/[a-z]/.test(k)) letterButtons.push(btn);
    });

    var btnEnter = document.createElement('button'); btnEnter.className = 'log-key key-enter'; btnEnter.tabIndex = 0; btnEnter.textContent = 'ENTER (Ocultar)';
    btnEnter.onclick = function() { loginKeyboard.classList.add('is-hidden'); btnLogin.focus(); }; 
    bindEnterToClick(btnEnter); loginKeyboard.appendChild(btnEnter);
  }
  buildLoginKeyboard();

  bindEnterToClick(btnLogin);
  bindEnterToClick(usernameInput);
  bindEnterToClick(passwordInput);

  usernameInput.addEventListener('focus', function() { activeLoginInput = usernameInput; loginKeyboard.classList.remove('is-hidden'); });
  passwordInput.addEventListener('focus', function() { activeLoginInput = passwordInput; loginKeyboard.classList.remove('is-hidden'); });

  window.onload = function() { setTimeout(function() { if(usernameInput) usernameInput.focus(); }, 300); };

  // --- TECLADO DEL BUSCADOR PRINCIPAL ---
  function buildMainKeyboard() {
    virtualKeyboard.innerHTML = '';
    var keys = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789'.split('');
    keys.forEach(function(k) {
      var btn = document.createElement('button'); btn.className = 'kbd-key'; btn.tabIndex = 0; btn.textContent = k;
      btn.onclick = function() { searchString += k; updateLocalSearch(); }; 
      bindEnterToClick(btn); virtualKeyboard.appendChild(btn);
    });
    
    var spaceBtn = document.createElement('button'); spaceBtn.className = 'kbd-key'; spaceBtn.tabIndex = 0; spaceBtn.textContent = 'ESPACIO'; spaceBtn.style.gridColumn = 'span 3';
    spaceBtn.onclick = function() { searchString += ' '; updateLocalSearch(); }; 
    bindEnterToClick(spaceBtn); virtualKeyboard.appendChild(spaceBtn);

    var delBtn = document.createElement('button'); delBtn.className = 'kbd-key'; delBtn.tabIndex = 0; delBtn.textContent = 'BORRAR'; delBtn.style.gridColumn = 'span 2'; delBtn.style.backgroundColor = '#e50914';
    delBtn.onclick = function() { searchString = searchString.slice(0, -1); updateLocalSearch(); }; 
    bindEnterToClick(delBtn); virtualKeyboard.appendChild(delBtn);
  }
  buildMainKeyboard();

  function updateLocalSearch() { moduleSearchInput.value = searchString; renderFilteredItems(); }

  btnOpenSearch.addEventListener('click', function() {
    searchModal.classList.remove('is-hidden');
    var firstKey = virtualKeyboard.querySelector('.kbd-key'); if (firstKey) firstKey.focus();
  });
  bindEnterToClick(btnOpenSearch);

  btnCloseSearch.addEventListener('click', function() {
    searchModal.classList.add('is-hidden');
    var firstCard = grid.querySelector('.catalog-card');
    if (firstCard) firstCard.focus(); else btnOpenSearch.focus();
  });
  bindEnterToClick(btnCloseSearch);
  
  // --- CARGA DE DATOS ---
  function setStatus(msg) { statusMessage.textContent = msg || ''; }

  function fetchJson(url) {
    return fetch(url).then(function (res) { if (!res.ok) throw new Error('Error API'); return res.json(); });
  }

  function loadView(view) {
    currentView = view; searchString = ""; moduleSearchInput.value = "";
    document.getElementById('pageTitle').textContent = configMap[view].title;
    grid.innerHTML = ''; activeData = []; setStatus('Cargando contenido…');
    
    fetchJson(API_BASE + configMap[view].endpoint).then(function (payload) {
      if (view === 'movies' && payload.movies) activeData = payload.movies.map(function(m) { return { id: m.id, title: m.title, image: m.poster, type: 'movie' }; });
      else if (view === 'tv' && payload.channels) activeData = payload.channels.map(function(c) { return { id: c.url, title: c.name, image: c.logo, type: 'tv' }; });
      else if (view === 'matches' && payload.matches) activeData = payload.matches.map(function(m) { return { id: m.url, title: m.title, time: m.time, type: 'match' }; });
      renderFilteredItems();
    }).catch(function () { setStatus('Error de conexión.'); });
  }

  function renderFilteredItems() {
    grid.innerHTML = ''; setStatus('');
    var q = searchString.toLowerCase();
    var filtered = activeData.filter(function(item) { return item.title.toLowerCase().indexOf(q) > -1; });

    if (!filtered.length) { setStatus('No se encontraron resultados.'); return; }

    if (currentView === 'tv' && q === '') {
      var favs = [], others = [];
      filtered.forEach(function(i) {
        var isFav = ['latina', 'america', 'panamericana', 'atv'].some(function(kw) { return i.title.toLowerCase().indexOf(kw) > -1; });
        if (isFav) favs.push(i); else others.push(i);
      });
      if (favs.length) {
        var titleFav = document.createElement('div'); titleFav.className = 'section-title'; titleFav.textContent = 'Canales Favoritos'; grid.appendChild(titleFav);
        favs.forEach(function(i) { grid.appendChild(createCard(i)); });
      }
      if (others.length) {
        var titleAll = document.createElement('div'); titleAll.className = 'section-title'; titleAll.textContent = 'Todos los Canales'; grid.appendChild(titleAll);
        others.forEach(function(i) { grid.appendChild(createCard(i)); });
      }
    } else {
      filtered.forEach(function(item) { grid.appendChild(createCard(item)); });
    }
  }

  // LIMPIADOR INTELIGENTE DE NOMBRES PARA LOGOS EXACTOS
  function cleanTeamName(text) {
    var name = text.replace(/^.*:\s*/, ''); // Quita prefijos como "Super Lig: " o "WTA: "
    name = name.replace(/(ESPN|DSports|BeIN|Star\+|Disney\+|LaLiga|Liga1|Directv|Fox Sports|Gol Peru|TyC).*$/i, ''); // Quita canales de TV
    name = name.replace(/\(.*?\)/g, ''); // Quita textos en paréntesis "(rival a confirmar)"
    return name.trim();
  }

  function createCard(item) {
    var card = document.createElement('div');
    card.tabIndex = 0; card.setAttribute('data-id', item.id); card.setAttribute('data-type', item.type);
    bindEnterToClick(card); // Activa el Enter del control remoto

    if (item.type === 'match') {
      card.className = 'sports-ticket catalog-card';
      
      var teams = item.title.split(/(?:\s+vs\.?\s+|\s+-\s+|\s+x\s+)/i);
      if (teams.length === 2) {
        // Nombres limpios para buscar el escudo sin que se confunda con el canal
        var t1_clean = cleanTeamName(teams[0]);
        var t2_clean = cleanTeamName(teams[1]);
        
        var query1 = encodeURIComponent(t1_clean + ' escudo logo png');
        var query2 = encodeURIComponent(t2_clean + ' escudo logo png');
        var logo1 = 'https://tse2.mm.bing.net/th?q=' + query1 + '&w=100&h=100&c=7&pid=1.7';
        var logo2 = 'https://tse2.mm.bing.net/th?q=' + query2 + '&w=100&h=100&c=7&pid=1.7';
        
        // Si el equipo es muy desconocido y falla el escudo real, dibuja un círculo con sus iniciales
        var fallback1 = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t1_clean) + '&background=random&color=fff&bold=true&size=100';
        var fallback2 = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t2_clean) + '&background=random&color=fff&bold=true&size=100';
        
        card.innerHTML = `
          <div class="ticket-kicker">VYRO SPORTS</div>
          <div class="match-teams">
            <div class="team"><img src="${logo1}" class="team-logo" onerror="this.src='${fallback1}'"><span class="team-name">${t1_clean}</span></div>
            <div class="vs-badge">VS</div>
            <div class="team"><img src="${logo2}" class="team-logo" onerror="this.src='${fallback2}'"><span class="team-name">${t2_clean}</span></div>
          </div>
          <div class="ticket-time">${item.time || 'En vivo'}</div>
        `;
      } else {
        card.innerHTML = '<div class="ticket-title">' + item.title + '</div><div class="ticket-time">' + (item.time || 'En vivo') + '</div>';
      }
    } else if (item.type === 'tv') {
      card.className = 'catalog-card tv-card';
      if (item.image) {
        var img = document.createElement('img'); img.src = item.image;
        img.onerror = function() { this.style.display = 'none'; }; card.appendChild(img);
      }
      var cap = document.createElement('div'); cap.className = 'tv-caption'; cap.textContent = item.title; card.appendChild(cap);
    } else {
      card.className = 'catalog-card poster-card';
      if (item.image) {
        var imgP = document.createElement('img'); imgP.src = item.image; card.appendChild(imgP);
      }
      var capP = document.createElement('div'); capP.className = 'card-caption'; capP.textContent = item.title; card.appendChild(capP);
    }
    
    card.addEventListener('click', function () { playItem(card); });
    return card;
  }

  // --- REPRODUCTOR ---
  function playItem(card) {
    var type = card.getAttribute('data-type');
    var targetId = card.getAttribute('data-id');
    if (!targetId) return;
    
    previousFocus = card;
    playerLayer.classList.remove('is-hidden'); appShell.classList.add('is-hidden');
    video.pause(); video.removeAttribute('src'); video.classList.add('is-hidden');
    iframeHost.innerHTML = ''; iframeHost.classList.add('is-hidden');
    playerStatus.textContent = 'Cargando...'; btnVolver.focus();

    if (type === 'movie') {
      fetchJson(API_BASE + '/api/stream/find/' + targetId).then(function(res) {
        if (!res.success || !res.servers) throw new Error('Error');
        launchIframe(res.servers[0].embed_url, false);
      }).catch(function() { playerStatus.textContent = "Error al cargar"; });
    } else if (type === 'match') {
      launchIframe(targetId, true);
    } else if (type === 'tv') {
      launchHls(targetId);
    }
  }

  function launchIframe(url, useSandbox) {
    playerStatus.textContent = ''; iframeHost.classList.remove('is-hidden');
    var frame = document.createElement('iframe');
    frame.src = url; frame.setAttribute('allow', 'autoplay; fullscreen');
    if (useSandbox) frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframeHost.appendChild(frame); btnVolver.focus();
  }

  function launchHls(url) {
    video.classList.remove('is-hidden');
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url; video.play().catch(function(){}); playerStatus.textContent = ''; btnVolver.focus();
    } else {
      var script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js';
      script.onload = function() {
        if (window.Hls.isSupported()) {
          hlsInstance = new window.Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(video);
          hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function() { video.play(); playerStatus.textContent = ''; btnVolver.focus(); });
        }
      };
      document.head.appendChild(script);
    }
  }

  function closePlayer() {
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    video.pause(); video.removeAttribute('src'); iframeHost.innerHTML = '';
    playerLayer.classList.add('is-hidden'); appShell.classList.remove('is-hidden');
    if (previousFocus) previousFocus.focus();
  }
  btnVolver.addEventListener('click', closePlayer);
  bindEnterToClick(btnVolver);

  // --- NAVEGACIÓN ESPACIAL ---
  function moveSpatially(keyCode) {
    var active = document.activeElement;
    if (!playerLayer.classList.contains('is-hidden')) { btnVolver.focus(); return; }

    var container = document.body;
    if (!searchModal.classList.contains('is-hidden')) container = searchModal;
    else if (!loginLayer.classList.contains('is-hidden')) container = loginLayer;

    var focusables = Array.prototype.slice.call(container.querySelectorAll('[tabindex="0"]')).filter(function(el) { return el.offsetWidth > 0 || el.offsetHeight > 0; });
    
    if (active === document.body || focusables.indexOf(active) < 0) {
      if (focusables.length) focusables[0].focus(); return;
    }
    
    var rect = active.getBoundingClientRect();
    var cx = rect.left + rect.width / 2; var cy = rect.top + rect.height / 2;
    var best = null; var bestScore = Infinity;

    if (keyCode === 37 && active.closest('.main-content')) {
      if (rect.left < 300) { var navActive = nav.querySelector('.is-active'); if (navActive) navActive.focus(); return; }
    }
    if (keyCode === 39 && active.closest('#sidebar')) {
      var firstContent = document.querySelector('.main-content [tabindex="0"]'); if (firstContent) firstContent.focus(); return;
    }

    focusables.forEach(function (candidate) {
      if (candidate === active) return;
      var other = candidate.getBoundingClientRect();
      var ox = other.left + other.width / 2; var oy = other.top + other.height / 2;
      var dx = ox - cx; var dy = oy - cy;
      var primary, secondary;

      if (keyCode === 37 && dx < -1) { primary = -dx; secondary = Math.abs(dy); } 
      else if (keyCode === 39 && dx > 1) { primary = dx; secondary = Math.abs(dy); } 
      else if (keyCode === 38 && dy < -1) { primary = -dy; secondary = Math.abs(dx); } 
      else if (keyCode === 40 && dy > 1) { primary = dy; secondary = Math.abs(dx); } 
      else return;

      var score = primary + secondary * 1.5;
      if (score < bestScore) { bestScore = score; best = candidate; }
    });

    if (best) best.focus();
  }

  document.addEventListener('keydown', function (event) {
    var code = event.keyCode;
    if (code >= 37 && code <= 40) { event.preventDefault(); moveSpatially(code); }
    
    if (code === 10009 || code === 27) {
      event.preventDefault();
      if (!playerLayer.classList.contains('is-hidden')) { closePlayer(); return; }
      if (!searchModal.classList.contains('is-hidden')) { btnCloseSearch.click(); return; }
      if (!loginKeyboard.classList.contains('is-hidden')) { loginKeyboard.classList.add('is-hidden'); btnLogin.focus(); return; }
      var selected = nav.querySelector('.is-active');
      if (selected && document.activeElement !== selected && loginLayer.classList.contains('is-hidden')) selected.focus();
    }
  });

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (usernameInput.value.trim().toLowerCase() === 'randy' && passwordInput.value === '123') {
      loginLayer.classList.add('is-hidden'); appShell.classList.remove('is-hidden');
      nav.querySelector('[data-view="movies"]').classList.add('is-active');
      loadView('movies');
    } else { loginMessage.textContent = 'Usuario o contraseña incorrectos.'; }
  });

  nav.querySelectorAll('.nav-item').forEach(function(btn) {
    bindEnterToClick(btn);
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(nav.querySelectorAll('.nav-item'), function (b) { b.classList.toggle('is-active', b === btn); });
      loadView(btn.getAttribute('data-view'));
    });
  });

  try { if (window.tizen) window.tizen.tvinputdevice.registerKey('10009'); } catch (e) {}
}());