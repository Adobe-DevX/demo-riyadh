import { loadDestinationDetails } from '../../scripts/destination-details-fragment.js';

/**
 * loads and decorates the destinations-details block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const slug = block.children[0]?.textContent.trim();
  block.textContent = '';

  const container = document.createElement('div');
  container.className = 'destinations-details-container';

  if (!slug) {
    const empty = document.createElement('p');
    empty.className = 'destinations-details-empty';
    empty.textContent = 'Add a destination slug to render destination details.';
    container.append(empty);
    block.append(container);
    return;
  }

  const loaded = await loadDestinationDetails(container, slug);
  if (!loaded) {
    const empty = document.createElement('p');
    empty.className = 'destinations-details-empty';
    empty.textContent = `No destination found for slug "${slug}".`;
    container.replaceChildren(empty);
  }

  block.append(container);
}
