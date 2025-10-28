// script.js - versão corrigida
const mediaStreams = [
  {
    name: "CBN Fortaleza",
    url: "https://ice.fabricahost.com.br/cbnfortaleza",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio",
    autoplay: false // Desativei o autoplay para evitar problemas
  },
  {
    name: "Clube FM Fortaleza",
    url: "https://ice.fabricahost.com.br/clubefmfortaleza", 
    logo: "https://tudoradio.com/img/uploads/noticias/664762a4e9075.png",
    type: "audio",
    autoplay: false
  },
  {
    name: "CBN Cariri",
    url: "https://ice.fabricahost.com.br/cbncariri",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio",
    autoplay: false
  },
  {
    name: "Nova Brasil Fortaleza",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASIL_FORAAC.aac",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-nova-br.webp",
    type: "audio",
    autoplay: false
  },
  {
    name: "TV O POVO",
    embedUrl: "https://v-us-01.wisestream.io/e8740862-7a1f-45f3-acb2-4f357e144059.html",
    fallbackUrl: "https://www.opovo.com.br/tvopovo",
    type: "iframe",
    autoplay: true
  },
  {
    name: "Canal FDR",
    embedUrl: "https://v-us-01.wisestream.io/e4ade538-7924-4359-81ef-b9d4dd229e91.html",
    fallbackUrl: "https://www.fdr.com.br/aovivo",
    type: "iframe",
    autoplay: true
  }
];

const SEGMENTS = 20;
const REFRESH_TIME = 5 * 60 * 1000; // 5 minutes

function createMediaElements() {
  const container = document.getElementById('mediaContainer');
  container.innerHTML = '';

  mediaStreams.forEach((stream) => {
    const box = document.createElement('div');
    box.className = `media-box ${stream.type}-box`;

    if (stream.logo) {
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

    if (stream.type === 'audio') {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'none'; // Mudei para 'none' para evitar pré-carregamento
      
      const status = document.createElement('div');
      status.className = 'status-message';
      status.textContent = 'Clique para carregar';
      status.style.color = '#666';
      status.style.fontSize = '0.8rem';
      status.style.marginBottom = '1rem';
      box.appendChild(status);

      // Container do VU Meter
      const vuContainer = document.createElement('div');
      vuContainer.className = 'vu-container';
      
      // Labels da escala
      const labels = document.createElement('div');
      labels.className = 'vu-labels';
      const scalePoints = ['-30','-25','-20','-15','-9','-6','-3','0','+3','+6','+9','+15'];
      scalePoints.forEach(t => { 
        const lbl = document.createElement('span'); 
        lbl.textContent = t; 
        if (t==='0') lbl.classList.add('zero-mark'); 
        labels.appendChild(lbl); 
      });
      
      // Canal R (Right)
      const leftRow = document.createElement('div'); 
      leftRow.className='channel-row';
      const leftLetter = document.createElement('span'); 
      leftLetter.className='channel-letter'; 
      leftLetter.textContent='R'; 
      leftRow.appendChild(leftLetter);
      const leftMeter = document.createElement('div'); 
      leftMeter.className='vu-meter';
      for (let i=0;i<SEGMENTS;i++) {
        const segment = document.createElement('div');
        segment.className='vu-segment';
        leftMeter.appendChild(segment);
      }
      leftRow.appendChild(leftMeter);
      
      // Canal L (Left)
      const rightRow = document.createElement('div'); 
      rightRow.className='channel-row';
      const rightLetter = document.createElement('span'); 
      rightLetter.className='channel-letter'; 
      rightLetter.textContent='L'; 
      rightRow.appendChild(rightLetter);
      const rightMeter = document.createElement('div'); 
      rightMeter.className='vu-meter';
      for (let i=0;i<SEGMENTS;i++) {
        const segment = document.createElement('div');
        segment.className='vu-segment';
        rightMeter.appendChild(segment);
      }
      rightRow.appendChild(rightMeter);
      
      vuContainer.appendChild(labels); 
      vuContainer.appendChild(leftRow); 
      vuContainer.appendChild(rightRow);
      box.appendChild(vuContainer);

      // Adiciona o áudio por último
      box.appendChild(audio);

      // Event listeners para o áudio
      audio.addEventListener('loadstart', () => {
        status.textContent = 'Conectando...';
        status.style.color = '#ffcc00';
      });
      
      audio.addEventListener('canplay', () => {
        status.textContent = 'Pronto para reproduzir';
        status.style.color = '#00cc00';
      });
      
      audio.addEventListener('play', () => {
        status.textContent = 'Reproduzindo...';
        status.style.color = '#00ff00';
        startVU(audio, leftMeter, rightMeter);
      });
      
      audio.addEventListener('pause', () => {
        status.textContent = 'Pausado';
        status.style.color = '#666';
        stopVU(leftMeter, rightMeter);
      });
      
      audio.addEventListener('waiting', () => {
        status.textContent = 'Buffering...';
        status.style.color = '#ffcc00';
      });
      
      audio.addEventListener('error', (e) => {
        status.textContent = 'Erro ao carregar';
        status.style.color = '#ff3333';
        console.error('Erro no áudio:', stream.name, e);
        
        // Tenta URL alternativa se disponível
        if (stream.name.includes('CBN') || stream.name.includes('Clube FM')) {
          setTimeout(() => {
            status.textContent = 'Tentando HTTP...';
            audio.src = stream.url.replace('https://', 'http://');
          }, 2000);
        }
      });
      
      // Configura a fonte do áudio quando o usuário interagir
      box.addEventListener('click', (e) => {
        if (e.target !== audio && !audio.src) {
          status.textContent = 'Carregando stream...';
          status.style.color = '#ffcc00';
          audio.src = stream.url;
        }
      });

    } else if (stream.type === 'iframe') {
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'iframe-container';
      const iframe = document.createElement('iframe');
      const sep = stream.embedUrl.includes('?') ? '&' : '?';
      
      iframe.src = stream.embedUrl + sep + 'autoplay=1';
      iframe.allow = 'autoplay; fullscreen; encrypted-media';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      
      iframeContainer.appendChild(iframe);
      box.appendChild(iframeContainer);
    }

    container.appendChild(box);
  });
}

let vuAnimationId = null;

function startVU(audioEl, leftMeter, rightMeter) {
  // Para qualquer animação anterior
  if (vuAnimationId) {
    cancelAnimationFrame(vuAnimationId);
  }
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported');
      return;
    }

    const audioCtx = new AudioContext();
    
    // Verifica se o áudio já está conectado a um contexto
    if (audioEl.crossOrigin === null) {
      audioEl.crossOrigin = "anonymous";
    }
    
    const source = audioCtx.createMediaElementSource(audioEl);
    const analyserL = audioCtx.createAnalyser();
    const analyserR = audioCtx.createAnalyser();
    
    analyserL.fftSize = 256;
    analyserR.fftSize = 256;
    analyserL.smoothingTimeConstant = 0.8;
    analyserR.smoothingTimeConstant = 0.8;
    
    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);

    // Conecta os analisadores
    source.connect(analyserL);
    source.connect(analyserR);
    analyserL.connect(audioCtx.destination);
    analyserR.connect(audioCtx.destination);

    function update() {
      if (audioEl.paused || audioEl.ended) {
        stopVU(leftMeter, rightMeter);
        return;
      }
      
      analyserL.getByteFrequencyData(dataL);
      analyserR.getByteFrequencyData(dataR);
      
      // Calcula RMS (Root Mean Square) para cada canal
      const rmsL = Math.sqrt(dataL.reduce((sum, value) => sum + value * value, 0) / dataL.length);
      const rmsR = Math.sqrt(dataR.reduce((sum, value) => sum + value * value, 0) / dataR.length);
      
      // Converte para dB
      let dBL = 20 * Math.log10(rmsL / 255);
      let dBR = 20 * Math.log10(rmsR / 255);
      
      // Limita os valores entre -60 e 0 dB
      dBL = Math.max(-60, Math.min(0, dBL));
      dBR = Math.max(-60, Math.min(0, dBR));
      
      // Converte para nível (0-20 segments)
      const levelL = Math.floor(((dBL + 60) / 60) * SEGMENTS);
      const levelR = Math.floor(((dBR + 60) / 60) * SEGMENTS);
      
      setSegments(leftMeter, levelL);
      setSegments(rightMeter, levelR);
      
      vuAnimationId = requestAnimationFrame(update);
    }
    
    update();
    
  } catch (error) {
    console.warn('Erro ao iniciar VU:', error);
    // Fallback: animação simulada se o Web Audio API falhar
    simulateVU(leftMeter, rightMeter);
  }
}

function stopVU(leftMeter, rightMeter) {
  if (vuAnimationId) {
    cancelAnimationFrame(vuAnimationId);
    vuAnimationId = null;
  }
  setSegments(leftMeter, 0);
  setSegments(rightMeter, 0);
}

function simulateVU(leftMeter, rightMeter) {
  let level = 0;
  let direction = 1;
  
  function animate() {
    if (vuAnimationId) {
      cancelAnimationFrame(vuAnimationId);
    }
    
    level += direction;
    if (level >= 15 || level <= 0) {
      direction *= -1;
    }
    
    setSegments(leftMeter, level);
    setSegments(rightMeter, level - 2); // Diferença entre os canais
    
    vuAnimationId = requestAnimationFrame(animate);
  }
  
  animate();
}

function setSegments(meter, level) {
  Array.from(meter.children).forEach((segment, index) => {
    segment.className = 'vu-segment';
    
    if (index < level) {
      segment.classList.add('on');
      
      // Define cores baseadas no nível
      if (index < 10) {
        segment.classList.add('green');
      } else if (index < 16) {
        segment.classList.add('yellow');
      } else {
        segment.classList.add('red');
      }
    }
  });
}

function setupAutoRefresh() {
  setInterval(() => {
    console.log('Recarregando página para manter streams...');
    location.reload();
  }, REFRESH_TIME);
}

document.addEventListener('DOMContentLoaded', () => { 
  createMediaElements(); 
  setupAutoRefresh();
});
