import { decorateIcons } from '../../scripts/aem.js';

// Unlike image references, DAM video references aren't rewritten onto the media bus,
// so a raw /content/dam path only resolves against the AEM publish origin.
const AEM_ASSET_ORIGIN = 'https://publish-p220753-e2271497.adobeaemcloud.com';

function resolveAssetHref(href) {
  return href && href.startsWith('/content/dam/') ? `${AEM_ASSET_ORIGIN}${href}` : href;
}

export default function decorate(block) {
  const videoLink = block.querySelector('a[href]');
  const poster = block.querySelector('picture img, img');
  const textCell = [...block.children].find(
    (cell) => !cell.contains(videoLink) && !cell.contains(poster),
  );
  const caption = textCell ? textCell.innerHTML : '';

  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  if (poster) video.poster = poster.src;
  if (videoLink) {
    const source = document.createElement('source');
    source.src = resolveAssetHref(videoLink.getAttribute('href'));
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
