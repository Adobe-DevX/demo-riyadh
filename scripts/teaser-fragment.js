import { moveInstrumentation } from './scripts.js';
import getGraphqlHost from './graphql-host.js';
import { instrumentFragment, instrumentField } from './cf-instrumentation.js';

// resolves a single Teaser fragment by its DAM path. The path itself comes from a Universal
// Editor content-fragment picker rather than a hand-typed slug, so it's always valid at the
// time it's authored.
const BY_PATH_QUERY = 'riyadh/teaser-by-path';

// the CF model's ctaLink is a page reference (its _path is the JCR content path, e.g.
// "/content/riyadh/index"), but this project's fstab mounts the whole "demo-riyadh" site at
// "/", so the public URL is that same path with the "/content/<site>" root stripped and a
// trailing/lone "index" segment collapsed to "/"
function resolvePageHref(pagePath) {
  if (!pagePath) return undefined;
  const stripped = pagePath.replace(/^\/content\/[^/]+/, '').replace(/\/index$/, '');
  return stripped || '/';
}

/**
 * fetches a single Teaser content fragment item by its DAM path
 * @param {string} aemHost the AEM host to fetch the persisted query from
 * @param {string} fragmentPath the fragment's absolute DAM path (e.g. picked via a
 * Universal Editor content-fragment picker)
 * @returns {Promise<object|null>} the matching item, or null if not found
 */
export async function fetchTeaserByPath(aemHost, fragmentPath) {
  // deliberately NOT url-encoded: AEM's persisted-query matrix-parameter parsing doesn't
  // decode "%2F" back to "/" for this value, so encodeURIComponent would mangle the path
  // into something the server reports as "no resource available" — the literal path with
  // real slashes is what this query expects
  const url = `${aemHost}/graphql/execute.json/${BY_PATH_QUERY};teaserPath=${fragmentPath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    return Object.values(json?.data || {})[0]?.item || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`teaser-fragment: failed to load path "${fragmentPath}"`, error);
    return null;
  }
}

/**
 * renders a Teaser content fragment item using the .teaser-card markup
 * @param {object} item the content fragment item ({ heading, description, backgroundImage,
 * ctaLabel, ctaLink }), as returned by the "teaser-by-path" persisted query
 * @param {string} aemHost the AEM host, used to resolve relative image paths
 * @param {string} [style] optional "style-<value>" modifier class for this card
 * @returns {HTMLLIElement} the rendered card
 */
export function renderTeaserCard(item, aemHost, style) {
  const li = document.createElement('li');
  li.className = 'teaser-card';
  if (style && style !== 'default') li.classList.add(`style-${style}`);

  // GraphQL's Content Fragment schema names these fields with a leading underscore
  // eslint-disable-next-line no-underscore-dangle
  const href = resolvePageHref(item.ctaLink?._path);
  const link = href ? document.createElement('a') : document.createElement('div');
  if (href) link.href = href;
  link.className = 'teaser-card-link';

  // GraphQL's Content Fragment schema names these fields with a leading underscore
  // eslint-disable-next-line no-underscore-dangle
  const imagePath = item.backgroundImage?._path;
  if (imagePath) {
    const imageUrl = imagePath.startsWith('/') ? `${aemHost}${imagePath}` : imagePath;
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'teaser-card-image';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = item.heading || '';
    img.loading = 'lazy';
    instrumentField(img, 'backgroundImage', 'media', 'Image');
    imageWrapper.append(img);
    link.append(imageWrapper);
  }

  const body = document.createElement('div');
  body.className = 'teaser-card-body';
  if (item.heading) {
    const titleEl = document.createElement('p');
    titleEl.className = 'teaser-card-title';
    titleEl.textContent = item.heading;
    instrumentField(titleEl, 'heading', 'text', 'Heading');
    body.append(titleEl);
  }
  if (item.description?.plaintext) {
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'teaser-card-description';
    descriptionEl.textContent = item.description.plaintext;
    instrumentField(descriptionEl, 'description', 'richtext', 'Description');
    body.append(descriptionEl);
  }
  if (item.ctaLabel) {
    const ctaEl = document.createElement('p');
    ctaEl.className = 'teaser-card-cta';
    ctaEl.textContent = item.ctaLabel;
    instrumentField(ctaEl, 'ctaLabel', 'text', 'CTA Label');
    body.append(ctaEl);
  }
  link.append(body);
  li.append(link);
  return li;
}

// fetches a CF item by its fragment path and fills the placeholder card in once it arrives.
// Updates the placeholder's own class/content in place rather than replacing the element
// outright — a caller may have attached Universal Editor's data-aue-* markers to the
// placeholder itself (see moveInstrumentation in buildTeaserCard below), and swapping in a
// brand-new element here would silently drop them, making the item unselectable/invisible in
// the editor. Not awaited by the caller, so a CF-backed card never blocks the rest of the
// page's sections from loading (see loadSections/loadSection in scripts/aem.js, which await
// each section/block in sequence).
async function loadCfCard(placeholder, fragmentPath, style) {
  const aemHost = getGraphqlHost();
  const item = await fetchTeaserByPath(aemHost, fragmentPath);
  if (!item) return;
  const card = renderTeaserCard(item, aemHost, style);
  placeholder.className = card.className;
  placeholder.replaceChildren(...card.childNodes);
  // the container's Content Fragment instrumentation goes on the placeholder — the element that
  // stays in the DOM — because only the rendered card's className and children are copied above,
  // not its attributes; the field instrumentation rides along on the copied child nodes
  instrumentFragment(placeholder, fragmentPath, item.heading || 'Teaser');
}

/**
 * builds one teaser card from a "teaser" model's field divs — the block's own children.
 * The Content Fragment reference is the only content source; the card is fetched live from
 * that fragment (fired in the background, not awaited here — see loadCfCard).
 * @param {Element[]} fields the field divs, in [fragmentPath, style] order
 * @param {Element} [instrumentationSource] the authored element to move Universal Editor's
 * editing instrumentation from, if different from the rendered card itself
 * @returns {HTMLLIElement} the rendered (or not-yet-filled) <li class="teaser-card">
 */
export function buildTeaserCard(fields, instrumentationSource) {
  const [fragmentPathDiv, styleDiv] = fields;
  const fragmentPath = fragmentPathDiv?.textContent.trim();
  const style = styleDiv?.textContent.trim();

  const li = document.createElement('li');
  li.className = 'teaser-card';
  if (instrumentationSource) moveInstrumentation(instrumentationSource, li);

  if (fragmentPath) loadCfCard(li, fragmentPath, style);
  return li;
}
