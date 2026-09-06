import { buildDestinationCard } from '../../scripts/destination-fragment.js';

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

/**
 * loads and decorates the destination block: a carousel built from the author-selected
 * "content-fragment" child blocks nested inside it (one per selected Destination content
 * fragment). Each card is built via buildDestinationCard, which fetches its own fragment's
 * content in the background — not awaited here, so this block never blocks the rest of the
 * page's sections from loading (see loadSections/loadSection in scripts/aem.js, which await
 * each section/block in sequence). Nested child blocks aren't picked up by the framework's own
 * decorateBlocks (which only decorates direct children of a section), so their field divs are
 * read directly here instead of going through content-fragment.js's own decorate().
 * @param {Element} block The destination block element
 */
export default function decorate(block) {
  const [styleDiv] = block.children;
  const style = styleDiv?.textContent.trim();

  const slides = [...block.querySelectorAll(':scope div.content-fragment')]
    .map((cf) => buildDestinationCard([...cf.children], style, cf));

  block.replaceChildren();
  if (slides.length) buildCarousel(block, slides);
}
