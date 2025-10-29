const mediaStreams = [
  // Radio Stations
  {
    name: "CBN Fortaleza",
    url: "https://ice-br.fabricahost.com.br/play/cbnfortaleza",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio"
  },
  {
    name: "Clube FM Fortaleza",
    url: "https://ice-br.fabricahost.com.br/play/clubefmfortaleza",
    logo: "https://tudoradio.com/img/uploads/noticias/664762a4e9075.png",
    type: "audio"
  },
  {
    name: "CBN Cariri",
    url: "https://ice-br.fabricahost.com.br/play/cbncariri",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio"
  },
  {
    name: "Nova Brasil Fortaleza",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASIL_FORAAC.aac",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-nova-br.webp",
    type: "audio"
  },
  // TV Channels
  {
    name: "TV O POVO",
    embedUrl: "https://v-us-01.wisestream.io/e8740862-7a1f-45f3-acb2-4f357e144059.html",
    fallbackUrl: "https://www.opovo.com.br/tvopovo",
    type: "iframe"
  },
  {
    name: "Canal FDR",
    embedUrl: "https://v-us-01.wisestream.io/e4ade538-7924-4359-81ef-b9d4dd229e91.html",
    fallbackUrl: "https://www.fdr.com.br/aovivo",
    type: "iframe"
  }
];

const SEGMENTS = 20;
const container = document.getElementById('mediaContainer');
const audioElements = [];

mediaStreams.forEach(stream => {
  const box = document.createElement('div');
  box.className = `media-box ${stream.type}-box`;

  if (stream.type === "audio") {
    // Radio Station with logo
    const img = document.createElement('img');
    img.src = stream.logo;
    img.alt = stream.name;
    img.className = 'logo';
    box.appendChild(img);
  }

  const title = document.createElement('div');
  title.className = 'channel-label';
  title.textContent = stream.name;
  box.appendChild(title);

  if (stream.type === "audio") {
    const audio = document.createElement('audio');
    audio.src = stream.url;
    audio.crossOrigin = "";
    audio.controls = true;
    audio.loop = true;

    audioElements.push(audio);

    const vuWrap = document.createElement('div');
    vuWrap.className = 'vu-container';

    const labels = document.createElement('div');
    labels.className = 'vu-labels';
    const scalePoints = ['-30', '-25', '-20', '-15', '-9', '-6', '-3', '0', '+3', '+6', '+9', '+15'];
    scalePoints.forEach(t => {
      const lbl = document.createElement('span');
      lbl.textContent = t;
      if (t === '0') lbl.classList.add('zero-mark');
      labels.appendChild(lbl);
    });

    const colL = document.createElement('div');
    colL.className = 'vu-column vu-left';
    const colR = document.createElement('div');
    colR.className = 'vu-column vu-right';

    for (let i = 0; i < SEGMENTS; i++) {
      colL.appendChild(document.createElement('div')).className = 'vu-segment';
      colR.appendChild(document.createElement('div')).className = 'vu-segment';
    }

    vuWrap.appendChild(labels);
    vuWrap.appendChild(colL);
    vuWrap.appendChild(colR);

    box.appendChild(audio);
    box.appendChild(vuWrap);

    audio.addEventListener('playing', () => {
      startVU(audio, colL, colR);
    });

    audio.addEventListener('canplay', () => {
      audio.play().catch(err => {
        console.warn('Autoplay bloqueado:', err);
      });
    });
  } else if (stream.type === "iframe") {
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'iframe-container';
    
    const iframe = document.createElement('iframe');
    iframe.src = stream.embedUrl;
    iframe.allow = "autoplay; fullscreen";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    
    iframe.onerror = () => {
      iframeContainer.innerHTML = `
        <div class="fallback-message">
          <p>Player indisponível</p>
          <a href="${stream.fallbackUrl}" target="_blank" class="fallback-button">
            Assistir no site oficial
          </a>
        </div>
      `;
    };
    
    iframeContainer.appendChild(iframe);
    box.appendChild(iframeContainer);
  }

  container.appendChild(box);
});

function startVU(audioEl, leftBar, rightBar) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audioEl);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  function update() {
    analyser.getByteFrequencyData(dataArray);
    const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length);
    let dB = rms > 0 ? 20 * Math.log10(rms / 255) : -100;
    dB = Math.max(-35, Math.min(5, dB));

    const level = dB >= 0 
      ? Math.floor((dB / 5) * 6) + 14 
      : Math.floor((dB + 35) / 35 * 14);
    
    const activeSegments = Math.min(SEGMENTS, Math.max(0, level));
    setSegments(leftBar, activeSegments);
    setSegments(rightBar, activeSegments);
    
    requestAnimationFrame(update);
  }

  update();
}

function setSegments(bar, level) {
  Array.from(bar.children).forEach((seg, i) => {
    seg.className = 'vu-segment';
    if (i < level) {
      seg.classList.add('on');
      if (i < 10) seg.classList.add('green');
      else if (i < 16) seg.classList.add('yellow');
      else seg.classList.add('red');
    }
  });
}

window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  setTimeout(() => {
    document.querySelectorAll('.media-box').forEach(box => {
      box.style.opacity = '1';
      box.style.transform = 'translateY(0)';
    });
  }, 100);
});
