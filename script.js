const mediaStreams = [
  // Todas as 4 rádios com autoplay 
  {
    name: "CBN Fortaleza",
    url: "https://ice.fabricahost.com.br/cbnfortaleza",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio"
  },
  {
    name: "Clube FM Fortaleza",
    url: "https://ice4.fabricahost.com.br/cbnfortaleza",
    logo: "https://tudoradio.com/img/uploads/noticias/664762a4e9075.png",
    type: "audio"
  },
  {
    name: "CBN Cariri",
    url: "https://ice.fabricahost.com.br/cbncariri",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio"
  },
  {
    name: "Nova Brasil Fortaleza",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASIL_FORAAC.aac",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-nova-br.webp",
    type: "audio"
  },
  
  // 2 TVs sem autoplay
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
const REFRESH_TIME = 5 * 60 * 1000; // 5 minutos em milissegundos

// Função otimizada para autoplay
function startAutoplay(audioElement) {
  audioElement.muted = true; // Necessário para contornar bloqueios
  const playAttempt = setInterval(() => {
    audioElement.play()
      .then(() => {
        audioElement.muted = false;
        clearInterval(playAttempt);
        console.log(`Autoplay iniciado: ${audioElement.src}`);
      })
      .catch(e => {
        console.log(`Aguardando autoplay para: ${audioElement.parentNode.querySelector('.channel-label').textContent}`);
      });
  }, 1000);
}

// Criar elementos de mídia
function createMediaElements() {
  const container = document.getElementById('mediaContainer');
  container.innerHTML = '';

  mediaStreams.forEach(stream => {
    const box = document.createElement('div');
    box.className = `media-box ${stream.type}-box`;

    // Logo
    if (stream.logo) {
      const img = document.createElement('img');
      img.src = stream.logo;
      img.alt = stream.name;
      img.className = 'logo';
      box.appendChild(img);
    }

    // Título
    const title = document.createElement('div');
    title.className = 'channel-label';
    title.textContent = stream.name;
    box.appendChild(title);

    // Player de Áudio (Rádios)
    if (stream.type === "audio") {
      const audio = document.createElement('audio');
      audio.src = stream.url;
      audio.crossOrigin = "anonymous";
      audio.controls = true;
      audio.loop = true;
      box.appendChild(audio);

      // VU Meter
      const vuContainer = document.createElement('div');
      vuContainer.className = 'vu-container';
      
      const labels = document.createElement('div');
      labels.className = 'vu-labels';
      const scalePoints = ['-30', '-25', '-20', '-15', '-9', '-6', '-3', '0', '+3', '+6', '+9', '+15'];
      scalePoints.forEach(t => {
        const lbl = document.createElement('span');
        lbl.textContent = t;
        if (t === '0') lbl.classList.add('zero-mark');
        labels.appendChild(lbl);
      });

      const leftChannel = document.createElement('div');
      leftChannel.className = 'channel-row';
      const leftLabel = document.createElement('span');
      leftLabel.className = 'channel-letter';
      leftLabel.textContent = 'R';
      leftChannel.appendChild(leftLabel);
      
      const leftMeter = document.createElement('div');
      leftMeter.className = 'vu-meter';
      for (let i = 0; i < SEGMENTS; i++) {
        leftMeter.appendChild(document.createElement('div')).className = 'vu-segment';
      }
      leftChannel.appendChild(leftMeter);

      const rightChannel = document.createElement('div');
      rightChannel.className = 'channel-row';
      const rightLabel = document.createElement('span');
      rightLabel.className = 'channel-letter';
      rightLabel.textContent = 'L';
      rightChannel.appendChild(rightLabel);
      
      const rightMeter = document.createElement('div');
      rightMeter.className = 'vu-meter';
      for (let i = 0; i < SEGMENTS; i++) {
        rightMeter.appendChild(document.createElement('div')).className = 'vu-segment';
      }
      rightChannel.appendChild(rightMeter);

      vuContainer.appendChild(labels);
      vuContainer.appendChild(leftChannel);
      vuContainer.appendChild(rightChannel);

      box.appendChild(vuContainer);

      // Iniciar autoplay após 500ms
      setTimeout(() => startAutoplay(audio), 500);

      // Configurar VU Meter quando começar a tocar
      audio.addEventListener('playing', () => {
        startVU(audio, leftMeter, rightMeter);
      });
    } 
    // Iframe (TVs)
    else if (stream.type === "iframe") {
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
}

// Função do VU Meter (original mantida)
function startVU(audioEl, leftMeter, rightMeter) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audioEl);
  const splitter = audioCtx.createChannelSplitter(2);
  const analyserL = audioCtx.createAnalyser();
  const analyserR = audioCtx.createAnalyser();
  analyserL.fftSize = 256;
  analyserR.fftSize = 256;
  
  const dataArrayL = new Uint8Array(analyserL.frequencyBinCount);
  const dataArrayR = new Uint8Array(analyserR.frequencyBinCount);

  source.connect(splitter);
  splitter.connect(analyserL, 0);
  splitter.connect(analyserR, 1);
  analyserL.connect(audioCtx.destination);
  analyserR.connect(audioCtx.destination);

  function update() {
    analyserL.getByteFrequencyData(dataArrayL);
    analyserR.getByteFrequencyData(dataArrayR);
    
    const rmsL = Math.sqrt(dataArrayL.reduce((sum, val) => sum + val * val, 0) / dataArrayL.length);
    const rmsR = Math.sqrt(dataArrayR.reduce((sum, val) => sum + val * val, 0) / dataArrayR.length);
    
    let dBL = rmsL > 0 ? 20 * Math.log10(rmsL / 255) : -100;
    let dBR = rmsR > 0 ? 20 * Math.log10(rmsR / 255) : -100;
    
    dBL = Math.max(-35, Math.min(5, dBL));
    dBR = Math.max(-35, Math.min(5, dBR));
    
    const levelL = dBL >= 0 
      ? Math.floor((dBL / 5) * 6) + 14 
      : Math.floor((dBL + 35) / 35 * 14);
    
    const levelR = dBR >= 0 
      ? Math.floor((dBR / 5) * 6) + 14 
      : Math.floor((dBR + 35) / 35 * 14);
    
    setSegments(leftMeter, levelL);
    setSegments(rightMeter, levelR);
    
    requestAnimationFrame(update);
  }

  update();
}

function setSegments(meter, level) {
  Array.from(meter.children).forEach((seg, i) => {
    seg.className = 'vu-segment';
    if (i < level) {
      seg.classList.add('on');
      if (i < 10) seg.classList.add('green');
      else if (i < 16) seg.classList.add('yellow');
      else seg.classList.add('red');
    }
  });
}

// Configurar atualização automática
function setupAutoRefresh() {
  console.log(`Atualização automática em ${REFRESH_TIME/60000} minutos...`);
  setTimeout(() => {
    location.reload();
  }, REFRESH_TIME);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  createMediaElements();
  setupAutoRefresh();
  
  // Animação de entrada
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 100);
});
