import { decorateIcons } from '../../scripts/aem.js';

export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  const [videoCell, posterCell, textCell] = row.children;

  const videoLink = videoCell.querySelector('a');
  const poster = posterCell.querySelector('img');
  const caption = textCell.innerHTML;

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  if (poster) video.poster = poster.src;
  if (videoLink) {
    const source = document.createElement('source');
    source.src = videoLink.href;
    source.type = 'video/mp4';
    video.append(source);
  }

  const overlay = document.createElement('div');
  overlay.className = 'video-overlay';
  overlay.innerHTML = `<span class="video-mark"></span>${caption}<span class="video-mark"></span>`;

  const playToggle = document.createElement('button');
  playToggle.type = 'button';
  playToggle.className = 'video-play-toggle';

  const muteToggle = document.createElement('button');
  muteToggle.type = 'button';
  muteToggle.className = 'video-mute-toggle';

  const setPlayIcon = () => {
    const playing = !video.paused && !video.ended;
    playToggle.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    playToggle.innerHTML = `<span class="icon icon-${playing ? 'pause' : 'play'}"></span>`;
    decorateIcons(playToggle);
  };

  const setMuteIcon = () => {
    muteToggle.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    muteToggle.innerHTML = `<span class="icon icon-${video.muted ? 'volume-mute' : 'volume'}"></span>`;
    decorateIcons(muteToggle);
  };

  playToggle.addEventListener('click', () => {
    if (video.paused || video.ended) video.play();
    else video.pause();
  });
  video.addEventListener('play', setPlayIcon);
  video.addEventListener('pause', setPlayIcon);

  muteToggle.addEventListener('click', () => {
    video.muted = !video.muted;
    setMuteIcon();
  });

  const controls = document.createElement('div');
  controls.className = 'video-controls';
  controls.append(playToggle, muteToggle);

  block.replaceChildren(video, overlay, controls);
  setPlayIcon();
  setMuteIcon();
  video.play().catch(() => setPlayIcon());
}
