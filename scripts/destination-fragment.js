// resolves a single Destination content fragment by its DAM path. The path itself comes from
// a Universal Editor content-fragment picker (via the "content-fragment" block nested inside
// "destination"), rather than a hand-typed slug, so it's always valid at the time it's authored.
import { moveInstrumentation } from './scripts.js';
import getGraphqlHost, { isAuthorEnvironment } from './graphql-host.js';
import { instrumentFragment, instrumentField } from './cf-instrumentation.js';

const BY_PATH_QUERY = 'riyadh/destination-by-path';

/**
 * fetches a single Destination content fragment item by its DAM path
 * @param {string} aemHost the AEM host to fetch the persisted query from
 * @param {string} destinationPath the fragment's absolute DAM path (e.g. picked via a
 * Universal Editor content-fragment picker)
 * @returns {Promise<object|null>} the matching item, or null if not found
 */
export async function fetchDestinationByPath(aemHost, destinationPath) {
  // deliberately NOT url-encoded: AEM's persisted-query matrix-parameter parsing doesn't
  // decode "%2F" back to "/" for this value, so encodeURIComponent would mangle the path
  // into something the server reports as "no resource available" — the literal path with
  // real slashes is what this query expects (see teaser-fragment.js's fetchTeaserByPath)
  const url = `${aemHost}/graphql/execute.json/${BY_PATH_QUERY};destinationPath=${destinationPath}`;
  try {
    // when authoring, bypass the browser HTTP cache so a just-edited Content Fragment shows
    // up on Universal Editor's post-edit reload instead of a stale cached response; published
    // pages keep the caching
    const res = await fetch(url, isAuthorEnvironment() ? { cache: 'no-store' } : undefined);
    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    return json?.data?.destinationsByPath?.item || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`destination-fragment: failed to load path "${destinationPath}"`, error);
    return null;
  }
}

/**
 * renders a Destination content fragment item using the .destination-card markup
 * @param {object} item the content fragment item ({ destinationCity, destinationCountry,
 * backgroundImage }), as returned by the "destination-by-path" persisted query
 * @param {string} aemHost the AEM host, used to resolve relative image paths
 * @param {string} [style] optional "style-<value>" modifier class for this card
 * @returns {HTMLLIElement} the rendered card
 */
function renderDestinationCard(item, aemHost, style) {
  const li = document.createElement('li');
  li.className = 'destination-card';
  if (style && style !== 'default') li.classList.add(`style-${style}`);

  const wrapper = document.createElement('a');
  wrapper.className = 'destination-card-link';
  wrapper.href = '#';

  // GraphQL's Content Fragment schema names these fields with a leading underscore.
  // _dynamicUrl (a pre-sized Dynamic Media rendition) is preferred over the raw DAM _path.
  // eslint-disable-next-line no-underscore-dangle
  const imagePath = item.backgroundImage?._dynamicUrl || item.backgroundImage?._path;
  if (imagePath) {
    const imageUrl = imagePath.startsWith('/') ? `${aemHost}${imagePath}` : imagePath;
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'destination-card-image';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = item.destinationCity || '';
    img.loading = 'lazy';
    instrumentField(img, 'backgroundImage', 'media', 'Image');
    imageWrapper.append(img);
    wrapper.append(imageWrapper);
  }

  const body = document.createElement('div');
  body.className = 'destination-card-body';
  if (item.destinationCity) {
    const cityEl = document.createElement('p');
    cityEl.className = 'destination-card-city';
    cityEl.textContent = item.destinationCity;
    instrumentField(cityEl, 'destinationCity', 'text', 'City');
    body.append(cityEl);
  }
  if (item.destinationCountry) {
    const countryEl = document.createElement('p');
    countryEl.className = 'destination-card-country';
    countryEl.textContent = item.destinationCountry;
    instrumentField(countryEl, 'destinationCountry', 'text', 'Country');
    body.append(countryEl);
  }
  wrapper.append(body);
  li.append(wrapper);
  return li;
}

// fetches a CF item by its fragment path and fills the placeholder card in once it arrives.
// Updates the placeholder's own class/content in place rather than replacing the element
// outright — a caller may have attached Universal Editor's data-aue-* markers to the
// placeholder itself (see moveInstrumentation in buildDestinationCard below), and swapping in
// a brand-new element here would silently drop them, making the item unselectable/invisible in
// the editor. Not awaited by the caller, so a CF-backed card never blocks the rest of the
// page's sections from loading (see loadSections/loadSection in scripts/aem.js, which await
// each section/block in sequence).
async function loadCfCard(placeholder, destinationPath, style) {
  const aemHost = getGraphqlHost();
  const item = await fetchDestinationByPath(aemHost, destinationPath);
  if (!item) return;
  const card = renderDestinationCard(item, aemHost, style);
  placeholder.className = card.className;
  placeholder.replaceChildren(...card.childNodes);
  // the container's Content Fragment instrumentation goes on the placeholder — the element that
  // stays in the DOM — because only the rendered card's className and children are copied above,
  // not its attributes; the field instrumentation rides along on the copied child nodes
  instrumentFragment(placeholder, destinationPath, item.destinationCity || 'Destination');
}

/**
 * builds one destination card from a "content-fragment" model's field divs — the block's own
 * children. The Content Fragment reference is the only content source; the card is fetched
 * live from that fragment (fired in the background, not awaited here — see loadCfCard).
 * @param {Element[]} fields the field divs, in [fileReference] order
 * @param {string} [style] optional "style-<value>" modifier class for this card, e.g. the
 * containing "destination" block's own uniform style setting
 * @param {Element} [instrumentationSource] the authored element to move Universal Editor's
 * editing instrumentation from, if different from the rendered card itself
 * @returns {HTMLLIElement} the rendered (or not-yet-filled) <li class="destination-card">
 */
export function buildDestinationCard(fields, style, instrumentationSource) {
  const [fileReferenceDiv] = fields;
  const destinationPath = fileReferenceDiv?.textContent.trim();

  const li = document.createElement('li');
  li.className = 'destination-card';
  if (instrumentationSource) moveInstrumentation(instrumentationSource, li);

  if (destinationPath) loadCfCard(li, destinationPath, style);
  return li;
}
