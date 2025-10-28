// script.js - corrigido: problema CORS resolvido
const mediaStreams = [
  {
    name: "CBN Fortaleza",
    url: "https://ice.fabricahost.com.br/cbnfortaleza",

    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio",
    autoplay: true
  },
  {
    name: "Clube FM Fortaleza",
    url: "https://ice.fabricahost.com.br/clubefmfortaleza", 

    logo: "https://tudoradio.com/img/uploads/noticias/664762a4e9075.png",
    type: "audio",
    autoplay: true
  },
  {
    name: "CBN Cariri",
    url: "https://ice.fabricahost.com.br/cbncariri",

    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio",
    autoplay: true
  },
  {
    name: "Nova Brasil Fortaleza",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASIL_FORAAC.aac",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-nova-br.webp",
    type: "audio",
    autoplay: true
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
let userInteracted = false;

// Função para testar URLs e encontrar uma que funcione
async function testStreamUrl(stream) {
  const urlsToTest = [];
  
  // Adiciona URLs alternativas baseadas no nome da rádio
  if (stream.name.includes('CBN Fortaleza')) {
    urlsToTest.push(
      'https://ice.fabricahost.com.br/cbnfortaleza',
     
      'http://ice.fabricahost.com.br/cbnfortaleza'
    );
  } else if (stream.name.includes('Clube FM')) {
    urlsToTest.push(
      'https://ice.fabricahost.com.br/clubefmfortaleza',
 
      'http://ice.fabricahost.com.br/clubefmfortaleza'
    );
  } else if (stream.name.includes('CBN Cariri')) {
    urlsToTest.push(
      'https://ice.fabricahost.com.br/cbncariri',
     
      'http://ice.fabricahost.com.br/cbncariri'
    );
  } else {
    // Para outras rádios, testa a URL original e proxy
    urlsToTest.push(stream.url);
    if (stream.proxyUrl) {
      urlsToTest.push(stream.proxyUrl);
    }
  }

  // Testa cada URL
  for (const testUrl of urlsToTest) {
    try {
      console.log('Testando URL:', testUrl);
      
      if (testUrl.includes('corsproxy.io')) {
        // Para proxy, faz uma requisição HEAD para verificar
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('URL funcionou via proxy:', testUrl);
          return testUrl;
        }
      } else {
        // Para URLs diretas, tenta criar um elemento de áudio
        return await new Promise((resolve) => {
          const audioTest = new Audio();
          audioTest.crossOrigin = "anonymous";
          audioTest.preload = "none";
          
          audioTest.addEventListener('canplay', () => {
            console.log('URL direta funcionou:', testUrl);
            resolve(testUrl);
          });
          
          audioTest.addEventListener('error', () => {
            console.log('URL direta falhou:', testUrl);
            resolve(null);
          });
          
          audioTest.src = testUrl;
          setTimeout(() => resolve(null), 3000);
        });
      }
    } catch (error) {
      console.log('Erro ao testar URL:', testUrl, error);
      continue;
    }
  }
  
  console.log('Nenhuma URL funcionou para:', stream.name);
  return null;
}

async function resolveRedirect(url) {
  try {
    // Tenta com HEAD primeiro
    const resp = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { 
      method: 'HEAD', 
      cache: 'no-store' 
    });
    if (resp && resp.ok) {
      return resp.url.replace('https://corsproxy.io/?', '') || url;
    }
  } catch (err) {
    console.warn('HEAD redirect failed for', url, err);
  }
  
  return url;
}

async function startAutoplayAndUnmute(audioEl) {
  if (!userInteracted) {
    console.log('Aguardando interação do usuário para autoplay...');
    return false;
  }

  try {
    audioEl.muted = false;
    await audioEl.play();
    console.log('Autoplay succeeded (unmuted)');
    return true;
  } catch (err) {
    try {
      audioEl.muted = true;
      await audioEl.play();
      console.log('Autoplay succeeded (muted)');
      
      // Tenta desmutar após a reprodução iniciar
      setTimeout(() => {
        try { 
          audioEl.muted = false; 
          console.log('Attempted to unmute'); 
        } catch(e) {
          console.log('Could not unmute:', e);
        }
      }, 1000);
      
      return true;
    } catch (err2) {
      console.warn('Autoplay blocked', err2);
      return false;
    }
  }
}

function createMediaElements() {
  const container = document.getElementById('mediaContainer');
  container.innerHTML = '';

  mediaStreams.forEach(async (stream) => {
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
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.preload = 'metadata';
      box.appendChild(audio);

      const status = document.createElement('div');
      status.className = 'status-message';
      status.textContent = 'Carregando...';
      status.style.color = '#ffcc00';
      status.style.fontSize = '0.8rem';
      status.style.marginBottom = '1rem';
      box.appendChild(status);

      const vuContainer = document.createElement('div');
      vuContainer.className = 'vu-container';
      const labels = document.createElement('div');
      labels.className = 'vu-labels';
      const scalePoints = ['-30','-25','-20','-15','-9','-6','-3','0','+3','+6','+9','+15'];
      scalePoints.forEach(t => { 
        const lbl = document.createElement('span'); 
        lbl.textContent = t; 
        if (t==='0') lbl.classList.add('zero-mark'); 
        labels.appendChild(lbl); 
      });
      
      const leftRow = document.createElement('div'); 
      leftRow.className='channel-row';
      const leftLetter = document.createElement('span'); 
      leftLetter.className='channel-letter'; 
      leftLetter.textContent='R'; 
      leftRow.appendChild(leftLetter);
      const leftMeter = document.createElement('div'); 
      leftMeter.className='vu-meter';
      for (let i=0;i<SEGMENTS;i++) leftMeter.appendChild(document.createElement('div')).className='vu-segment';
      leftRow.appendChild(leftMeter);
      
      const rightRow = document.createElement('div'); 
      rightRow.className='channel-row';
      const rightLetter = document.createElement('span'); 
      rightLetter.className='channel-letter'; 
      rightLetter.textContent='L'; 
      rightRow.appendChild(rightLetter);
      const rightMeter = document.createElement('div'); 
      rightMeter.className='vu-meter';
      for (let i=0;i<SEGMENTS;i++) rightMeter.appendChild(document.createElement('div')).className='vu-segment';
      rightRow.appendChild(rightMeter);
      
      vuContainer.appendChild(labels); 
      vuContainer.appendChild(leftRow); 
      vuContainer.appendChild(rightRow);
      box.appendChild(vuContainer);

      // Configura o áudio
      (async () => {
        try {
          status.textContent = 'Procurando stream...';
          
          let workingUrl = stream.url;
          
          // Para as rádios com problema de CORS, usa o proxy
          if (stream.name.includes('CBN') || stream.name.includes('Clube FM')) {
            workingUrl = stream.proxyUrl || `https://corsproxy.io/?${encodeURIComponent(stream.url)}`;
            status.textContent = 'Usando proxy CORS...';
          }
          
          console.log('Configurando áudio para:', stream.name, 'URL:', workingUrl);
          audio.src = workingUrl;
          
          // Event listeners para status
          audio.addEventListener('loadstart', () => {
            status.textContent = 'Conectando...';
            status.style.color = '#ffcc00';
          });
          
          audio.addEventListener('canplay', () => {
            status.textContent = 'Pronto para reproduzir';
            status.style.color = '#00ff88';
            console.log('Áudio pronto:', stream.name);
          });
          
          audio.addEventListener('play', () => {
            status.textContent = 'Reproduzindo...';
            status.style.color = '#00ff88';
          });
          
          audio.addEventListener('error', (e) => {
            status.textContent = 'Erro ao carregar';
            status.style.color = '#ff3333';
            console.error('Erro no áudio:', stream.name, e);
            
            // Tenta URL alternativa se disponível
            if (stream.proxyUrl && audio.src !== stream.proxyUrl) {
              setTimeout(() => {
                status.textContent = 'Tentando URL alternativa...';
                audio.src = stream.proxyUrl;
              }, 2000);
            }
          });
          
          // Tenta autoplay se configurado
          if (stream.autoplay) {
            setTimeout(async () => {
              const ok = await startAutoplayAndUnmute(audio);
              if (ok) {
                try { 
                  startVU(audio, leftMeter, rightMeter); 
                } catch (e) { 
                  console.warn('VU start failed for', stream.name, e); 
                }
              }
            }, 1000);
          }
          
          // Inicia VU quando o usuário clicar manualmente
          audio.addEventListener('play', () => {
            try { 
              startVU(audio, leftMeter, rightMeter); 
            } catch(e) { 
              console.warn('VU unavailable for', stream.name, e); 
            }
          });
          
        } catch (error) {
          console.error('Erro ao configurar áudio para', stream.name, error);
          status.textContent = 'Erro de configuração';
          status.style.color = '#ff3333';
        }
      })();

    } else if (stream.type === 'iframe') {
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'iframe-container';
      const iframe = document.createElement('iframe');
      const sep = stream.embedUrl.includes('?') ? '&' : '?';
      
      iframe.src = stream.embedUrl + sep + 'autoplay=1';
      iframe.allow = 'autoplay; fullscreen; encrypted-media';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.setAttribute('autoplay', 'true');
      
      iframeContainer.appendChild(iframe);
      box.appendChild(iframeContainer);
    }

    container.appendChild(box);
  });
}

function startVU(audioEl, leftMeter, rightMeter) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported');
      return;
    }

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(audioEl);
    const splitter = audioCtx.createChannelSplitter(2);
    const analyserL = audioCtx.createAnalyser();
    const analyserR = audioCtx.createAnalyser();
    analyserL.fftSize = 256;
    analyserR.fftSize = 256;
    const dataL = new Uint8Array(analyserL.frequencyBinCount);
    const dataR = new Uint8Array(analyserR.frequencyBinCount);

    source.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);
    analyserL.connect(audioCtx.destination);
    analyserR.connect(audioCtx.destination);

    function update() {
      if (audioEl.paused || audioEl.ended) return;
      
      analyserL.getByteFrequencyData(dataL);
      analyserR.getByteFrequencyData(dataR);
      const rmsL = Math.sqrt(dataL.reduce((s,v)=>s+v*v,0)/dataL.length);
      const rmsR = Math.sqrt(dataR.reduce((s,v)=>s+v*v,0)/dataR.length);
      let dBL = rmsL>0?20*Math.log10(rmsL/255):-100;
      let dBR = rmsR>0?20*Math.log10(rmsR/255):-100;
      dBL = Math.max(-35, Math.min(5, dBL));
      dBR = Math.max(-35, Math.min(5, dBR));
      const levelL = dBL>=0?Math.floor((dBL/5)*6)+14:Math.floor((dBL+35)/35*14);
      const levelR = dBR>=0?Math.floor((dBR/5)*6)+14:Math.floor((dBR+35)/35*14);
      setSegments(leftMeter, levelL);
      setSegments(rightMeter, levelR);
      requestAnimationFrame(update);
    }
    update();
  } catch (error) {
    console.warn('Erro ao iniciar VU:', error);
  }
}

function setSegments(meter, level) {
  Array.from(meter.children).forEach((seg,i)=>{
    seg.className = 'vu-segment';
    if (i < level) {
      seg.classList.add('on');
      if (i < 10) seg.classList.add('green');
      else if (i < 16) seg.classList.add('yellow');
      else seg.classList.add('red');
    }
  });
}

function setupAutoRefresh() {
  setTimeout(()=>location.reload(), REFRESH_TIME);
}

function setupUserInteraction() {
  const handleUserInteraction = () => {
    if (!userInteracted) {
      userInteracted = true;
      console.log('Usuário interagiu - autoplay liberado');
      
      // Tenta iniciar autoplay para todas as rádios configuradas
      document.querySelectorAll('audio').forEach(audio => {
        if (audio.paused && audio.src) {
          audio.play().catch(e => console.log('Autoplay ainda bloqueado para:', audio.src));
        }
      });
      
      // Remove os event listeners após a primeira interação
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    }
  };

  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('touchstart', handleUserInteraction);
  document.addEventListener('keydown', handleUserInteraction);
}

document.addEventListener('DOMContentLoaded', () => { 
  createMediaElements(); 
  setupAutoRefresh(); 
  setupUserInteraction();
  setTimeout(() => document.body.classList.add('loaded'), 100); 
});
