const streams = [
  {
    name: "CBN Fortaleza",
    url: "https://ice.fabricahost.com.br/cbnfortaleza",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp"
  },
  {
    name: "Clube FM Fortaleza",
    url: "https://ice.fabricahost.com.br/clubefmfortaleza",
    logo: "https://tudoradio.com/img/uploads/noticias/664762a4e9075.png"
  },
  {
    name: "CBN Cariri",
    url: "https://ice.fabricahost.com.br/cbncariri",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-cbn.webp"
  },
  {
    name: "Nova Brasil Fortaleza",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASIL_FORAAC.aac",
    logo: "https://www.opovo.com.br/reboot/includes/assets/img/menu/icon-nova-br.webp"
  }
];

const segments = 20;
const container = document.getElementById('radiosContainer');
const audioElements = [];

streams.forEach(stream => {
  const box = document.createElement('div');
  box.className = 'radio-box';

  const img = document.createElement('img');
  img.src = stream.logo;
  img.alt = stream.name;
  img.className = 'logo';

  const title = document.createElement('div');
  title.className = 'channel-label';
  title.textContent = stream.name;

  const audio = document.createElement('audio');
  audio.src = stream.url;
  audio.crossOrigin = "anonymous";
  audio.controls = true;
  audio.loop = true;

  audioElements.push(audio);

  const vuWrap = document.createElement('div');
  vuWrap.className = 'vu-container';

  const labels = document.createElement('div');
  labels.className = 'vu-labels';

  const scalePoints = ['-30', '-25', '-20', '-15', '-9', '-6', '-3', '0', '+3', '+6', '+9', '+15', '+20', '+25'];
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

  for (let i = 0; i < segments; i++) {
    const segL = document.createElement('div');
    const segR = document.createElement('div');
    segL.className = 'vu-segment';
    segR.className = 'vu-segment';
    colL.appendChild(segL);
    colR.appendChild(segR);
  }

  vuWrap.appendChild(labels);
  vuWrap.appendChild(colL);
  vuWrap.appendChild(colR);

  box.appendChild(img);
  box.appendChild(title);
  box.appendChild(audio);
  box.appendChild(vuWrap);

  container.appendChild(box);

  audio.addEventListener('playing', () => {
    startVU(audio, colL, colR);
  });

  audio.addEventListener('canplay', () => {
    audio.play().catch(err => {
      console.warn('Autoplay bloqueado:', err);
    });
  });
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

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    let dB = rms > 0 ? 20 * Math.log10(rms / 255) : -100;
    dB = Math.max(-35, Math.min(5, dB));

    let level;
    if (dB >= 0) {
      level = Math.floor((dB / 5) * 6) + 14;
    } else {
      level = Math.floor((dB + 35) / 35 * 14);
    }

    const levelL = Math.min(segments, Math.max(0, level));
    const levelR = levelL;

    setSegments(leftBar, levelL);
    setSegments(rightBar, levelR);
    requestAnimationFrame(update);
  }

  update();
}

function setSegments(bar, level) {
  Array.from(bar.children).forEach((seg, i) => {
    seg.className = 'vu-segment';
    if (i < level) {
      if (i < 10) seg.classList.add('on', 'green');
      else if (i < 16) seg.classList.add('on', 'yellow');
      else seg.classList.add('on', 'red');
    }
  });
}

window.addEventListener('load', () => {
  const fakeButton = document.createElement('button');
  fakeButton.style.display = 'none';
  document.body.appendChild(fakeButton);

  fakeButton.addEventListener('click', () => {
    audioElements.forEach(audio => {
      audio.play().catch(() => {});
    });
  });

  fakeButton.click(); // tentativa de autoplay
});
