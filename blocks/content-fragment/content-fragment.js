import { buildDestinationCard } from '../../scripts/destination-fragment.js';

/**
 * loads and decorates the content-fragment block: a single Destination card built from the
 * block's own field (a Content Fragment reference). The card's content is fetched live from
 * that fragment (see buildDestinationCard); the fetch itself runs in the background so this
 * block never blocks the rest of the page.
 * @param {Element} block The content-fragment block element
 */
export default function decorate(block) {
  const card = buildDestinationCard([...block.children]);
  const ul = document.createElement('ul');
  ul.append(card);
  block.replaceChildren(ul);
}
