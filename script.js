# Writing updated script.js with redirect resolution, autoplay with sound, VU meter when possible,
# and updating index.html and reusing style.css from existing files.
import zipfile, os, shutil, json, textwrap

# Paths
index_path = "/mnt/data/index.html"
style_path = "/mnt/data/style.css"
script_path = "/mnt/data/script_final_unmuted.js"
zip_path = "/mnt/data/monitor_radios_tvs_unmuted_final.zip"

# Updated script content
script_content = r"""// script.js - final: resolves redirects, autoplay (attempts unmuted), VU when possible
const mediaStreams = [
  {
    name: "CBN Fortaleza",
    url: "https://ice.fabricahost.com.br/cbnfortaleza",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp",
    type: "audio"
  },
  {
    name: "Clube FM Fortaleza",
    url: "https://ice.fabricahost.com.br/clubefmfortaleza",
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
const REFRESH_TIME = 5 * 60 * 1000; // 5 minutes

async function resolveRedirect(url) {
  // Try to follow redirects using fetch HEAD; some servers disallow HEAD, so fallback to GET with range
  try {
    const resp = await fetch(url, { method: 'HEAD', redirect: 'follow', cache: 'no-store' });
    if (resp && resp.ok) {
      return resp.url || url;
    }
    // If HEAD not ok, try GET but don't download the whole body.
    const resp2 = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' });
    return resp2.url || url;
  } catch (err) {
    console.warn('resolveRedirect failed for', url, err);
    return url;
  }
}

// Autoplay logic: attempt to play (muted first if needed), then unmute to deliver sound to user
async function startAutoplayAndUnmute(audioEl) {
  // Try to play unmuted first (some browsers may still block)
  try {
    await audioEl.play();
    // success => try to unmute (should already be unmuted)
    try { audioEl.muted = false; } catch(e) {}
    console.log('Autoplay succeeded (unmuted):', audioEl.src);
    return true;
  } catch (err) {
    // try muted play then unmute
    try {
      audioEl.muted = true;
      await audioEl.play();
      // After successful muted play, unmute to deliver sound (may still be blocked by browser policy)
      setTimeout(() => {
        try { audioEl.muted = false; console.log('Attempted to unmute after muted autoplay'); } catch(e) {}
      }, 600);
      console.log('Autoplay succeeded (muted then unmuted attempt):', audioEl.src);
      return true;
    } catch (err2) {
      console.warn('Autoplay blocked for', audioEl.src, err2);
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
      audio.crossOrigin = 'anonymous'; // required for Web Audio API (VU) when CORS allows
      box.appendChild(audio);

      // VU container
      const vuContainer = document.createElement('div');
      vuContainer.className = 'vu-container';
      const labels = document.createElement('div');
      labels.className = 'vu-labels';
      const scalePoints = ['-30','-25','-20','-15','-9','-6','-3','0','+3','+6','+9','+15'];
      scalePoints.forEach(t => { const lbl = document.createElement('span'); lbl.textContent = t; if (t==='0') lbl.classList.add('zero-mark'); labels.appendChild(lbl); });
      const leftRow = document.createElement('div'); leftRow.className='channel-row';
      const leftLetter = document.createElement('span'); leftLetter.className='channel-letter'; leftLetter.textContent='R'; leftRow.appendChild(leftLetter);
      const leftMeter = document.createElement('div'); leftMeter.className='vu-meter';
      for (let i=0;i<SEGMENTS;i++) leftMeter.appendChild(document.createElement('div')).className='vu-segment';
      leftRow.appendChild(leftMeter);
      const rightRow = document.createElement('div'); rightRow.className='channel-row';
      const rightLetter = document.createElement('span'); rightLetter.className='channel-letter'; rightLetter.textContent='L'; rightRow.appendChild(rightLetter);
      const rightMeter = document.createElement('div'); rightMeter.className='vu-meter';
      for (let i=0;i<SEGMENTS;i++) rightMeter.appendChild(document.createElement('div')).className='vu-segment';
      rightRow.appendChild(rightMeter);
      vuContainer.appendChild(labels); vuContainer.appendChild(leftRow); vuContainer.appendChild(rightRow);
      box.appendChild(vuContainer);

      // Resolve redirect (if any) then set src and attempt autoplay + VU
      (async () => {
        const resolved = await resolveRedirect(stream.url);
        audio.src = resolved;
        // attempt autoplay & unmute
        const ok = await startAutoplayAndUnmute(audio);
        // start VU if autoplay/stream allowed and audio context is available
        if (ok) {
          try {
            startVU(audio, leftMeter, rightMeter);
          } catch (e) {
            console.warn('VU start failed for', stream.name, e);
          }
        } else {
          // still try VU; it may fail if CORS prevents AudioContext
          try { startVU(audio, leftMeter, rightMeter); } catch(e) { console.warn('VU unavailable for', stream.name, e); }
        }
      })();
    } else if (stream.type === 'iframe') {
      const iframeContainer = document.createElement('div');
      iframeContainer.className = 'iframe-container';
      const iframe = document.createElement('iframe');
      // try adding autoplay params; user requested sound enabled, so we do not force mute param
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

// VU meter functions (Web Audio API)
function startVU(audioEl, leftMeter, rightMeter) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error('Web Audio API not supported');

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

document.addEventListener('DOMContentLoaded', ()=>{ createMediaElements(); setupAutoRefresh(); setTimeout(()=>document.body.classList.add('loaded'),100); });
"""

# Write the new script file
with open(script_path, "w", encoding="utf-8") as f:
    f.write(script_content)

# Create ZIP
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    # include index.html and style.css from existing files if present
    if os.path.exists(index_path):
        z.write(index_path, "index.html")
    if os.path.exists(style_path):
        z.write(style_path, "style.css")
    z.write(script_path, "script.js")

zip_path
