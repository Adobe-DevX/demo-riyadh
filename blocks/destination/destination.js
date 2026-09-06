import { buildDestinationCard } from '../../scripts/destination-fragment.js';

/**
 * loads and decorates the destination block: a single card built from the block's own fields
 * (a Content Fragment reference + display style). The card's content is fetched live from
 * that fragment (see buildDestinationCard); the fetch itself runs in the background so this
 * block never blocks the rest of the page. Placing several destination blocks inside one
 * section, with that section's "Destination Carousel" style applied, lays them out as a
 * horizontally-scrolling carousel via CSS alone (see destination.css) — no JS carousel
 * orchestration needed.
 * @param {Element} block The destination block element
 */
export default function decorate(block) {
  const card = buildDestinationCard([...block.children]);
  const ul = document.createElement('ul');
  ul.append(card);
  block.replaceChildren(ul);
}
