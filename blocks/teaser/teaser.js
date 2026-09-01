import { buildTeaserCard } from '../../scripts/teaser-fragment.js';

/**
 * loads and decorates the teaser block: a single card built from the block's own fields
 * (a Content Fragment reference + display style). The card's content is fetched live from
 * that fragment (see buildTeaserCard); the fetch itself runs in the background so this block
 * never blocks the rest of the page.
 * @param {Element} block The teaser block element
 */
export default function decorate(block) {
  const card = buildTeaserCard([...block.children]);
  const ul = document.createElement('ul');
  ul.append(card);
  block.replaceChildren(ul);
}
