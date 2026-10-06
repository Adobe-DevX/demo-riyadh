import { loadDestinationDetails } from '../../scripts/destination-details-fragment.js';

/**
 * loads and decorates the destinations-details block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const destinationPath = block.children[0]?.textContent.trim();
  block.textContent = '';

  const container = document.createElement('div');
  container.className = 'destinations-details-container';

  if (!destinationPath) {
    const empty = document.createElement('p');
    empty.className = 'destinations-details-empty';
    empty.textContent = 'Select a destination content fragment to render destination details.';
    container.append(empty);
    block.append(container);
    return;
  }

  const loaded = await loadDestinationDetails(container, destinationPath);
  if (!loaded) {
    const empty = document.createElement('p');
    empty.className = 'destinations-details-empty';
    empty.textContent = `No destination found for "${destinationPath}".`;
    container.replaceChildren(empty);
  }

  block.append(container);
}
