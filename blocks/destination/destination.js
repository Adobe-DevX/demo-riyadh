import getGraphqlHost from '../../scripts/graphql-host.js';
import { fetchDestinations, renderDestinationCard } from '../../scripts/destination-fragment.js';

// the "destinations-all" persisted query is a flat, paginated list with no author-facing
// scoping field, so the carousel size is a fixed constant rather than an authored value
const CAROUSEL_SIZE = 12;

/**
 * builds the carousel chrome (track, indicators, prev/next controls) around a set of
 * already-rendered slide cards, and wires up click/autoplay navigation.
 * @param {Element} block the destination block element
 * @param {Element[]} slides the rendered <li class="destination-card"> cards to show as slides
 */
function buildCarousel(block, slides) {
  const track = document.createElement('ul');
  track.className = 'destination-track';

  const indicators = document.createElement('div');
  indicators.className = 'destination-indicators';

  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === 0);
    track.append(slide);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show slide ${i + 1} of ${slides.length}`);
    if (i === 0) dot.classList.add('active');
    indicators.append(dot);
  });

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'destination-control destination-control-prev';
  prevButton.setAttribute('aria-label', 'Previous slide');
  prevButton.innerHTML = '<span class="destination-arrow-icon"></span>';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'destination-control destination-control-next';
  nextButton.setAttribute('aria-label', 'Next slide');
  nextButton.innerHTML = '<span class="destination-arrow-icon"></span>';

  let current = 0;
  let timer;

  function goToSlide(index) {
    const total = slides.length;
    current = ((index % total) + total) % total;
    [...track.children].forEach((slide, i) => slide.classList.toggle('active', i === current));
    [...indicators.children].forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  // for multi-card carousel styles (track laid out as a scrollable row instead of stacked
  // fade slides), also slide the track by one card width; a no-op when the track has no
  // overflow, so this is safe to call unconditionally regardless of style
  function slideBy(dir) {
    const card = track.children[0];
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const amount = card.getBoundingClientRect().width + gap;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  function stopAutoplay() {
    if (timer) clearInterval(timer);
  }

  function startAutoplay() {
    stopAutoplay();
    if (slides.length > 1) timer = setInterval(() => goToSlide(current + 1), 4000);
  }

  prevButton.addEventListener('click', () => { goToSlide(current - 1); slideBy(-1); startAutoplay(); });
  nextButton.addEventListener('click', () => { goToSlide(current + 1); slideBy(1); startAutoplay(); });
  [...indicators.children].forEach((dot, i) => {
    dot.addEventListener('click', () => { goToSlide(i); startAutoplay(); });
  });

  block.replaceChildren(track, indicators);
  if (slides.length > 1) {
    block.append(prevButton, nextButton);
    block.addEventListener('mouseenter', stopAutoplay);
    block.addEventListener('mouseleave', startAutoplay);
    startAutoplay();
  }
}

// fetches the Destination content fragments and renders them as carousel slides in the
// background — not awaited by decorate() so this block's network round-trip never blocks the
// rest of the page's sections from loading (see loadSections/loadSection in scripts/aem.js,
// which await each section/block in sequence)
async function loadCarousel(block, style) {
  const aemHost = getGraphqlHost();
  const items = await fetchDestinations(aemHost, CAROUSEL_SIZE);
  if (!items.length) return;
  const slides = items.map((item) => renderDestinationCard(item, aemHost, style));
  buildCarousel(block, slides);
}

/**
 * loads and decorates the destination block: a carousel built from every Destination content
 * fragment returned by a fixed-size persisted query (see loadCarousel). The fetch runs in the
 * background so this block never blocks the rest of the page.
 * @param {Element} block The destination block element
 */
export default function decorate(block) {
  const [styleDiv] = block.children;
  const style = styleDiv?.textContent.trim();
  block.replaceChildren();

  loadCarousel(block, style);
}
