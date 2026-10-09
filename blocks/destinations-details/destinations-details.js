import { loadDestinationDetails } from '../../scripts/destination-details-fragment.js';
import { resolvePageHref } from '../../scripts/destination-fragment.js';
import { getHomeHref } from '../../scripts/scripts.js';

function getFieldHref(row) {
  const link = row?.querySelector('a');
  return link?.getAttribute('href') || row?.textContent.trim() || '';
}

function buildBackLink(href, label) {
  const nav = document.createElement('nav');
  nav.className = 'destinations-details-nav';
  nav.setAttribute('aria-label', 'Breadcrumb');
  const a = document.createElement('a');
  a.className = 'destinations-details-back';
  a.href = href;
  const icon = document.createElement('span');
  icon.className = 'destinations-details-back-icon';
  icon.setAttribute('aria-hidden', 'true');
  a.append(icon, document.createTextNode(label));
  nav.append(a);
  return nav;
}

function buildEmpty(message) {
  const empty = document.createElement('p');
  empty.className = 'destinations-details-empty';
  empty.textContent = message;
  return empty;
}

/**
 * loads and decorates the destinations-details block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const [pathRow, backLinkRow, backTextRow] = [...block.children];
  const destinationPath = pathRow?.textContent.trim();
  let backHref = getFieldHref(backLinkRow);
  // authored /content/... paths only resolve on author; map them to site paths elsewhere
  if (backHref.startsWith('/content/') && !window.location.pathname.startsWith('/content/')) {
    backHref = resolvePageHref(backHref);
  }
  backHref = backHref || getHomeHref();
  const backText = backTextRow?.textContent.trim() || 'Back to home';
  block.textContent = '';

  const container = document.createElement('div');
  container.className = 'destinations-details-container';

  if (!destinationPath) {
    container.append(buildEmpty('Select a destination content fragment to render destination details.'));
  } else if (!(await loadDestinationDetails(container, destinationPath))) {
    container.replaceChildren(buildEmpty(`No destination found for "${destinationPath}".`));
  }

  block.append(buildBackLink(backHref, backText), container);
}
