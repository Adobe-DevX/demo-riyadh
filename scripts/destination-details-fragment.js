// resolves a single Destination content fragment by its DAM path (picked with a Universal Editor
// content-fragment picker on the "destinations-details" block) through the existing persisted
// query "riyadh/destination-by-path" and renders it as a destination detail view: a page-level
// heading, a hero image and an introductory sub-heading + description. The sub-heading and
// description are rendered only when the query returns "subtitle" / "description" fields.
import getGraphqlHost, { isAuthorEnvironment } from './graphql-host.js';
import { instrumentFragment, instrumentField } from './cf-instrumentation.js';

const BY_PATH_QUERY = 'riyadh/destination-by-path';

/**
 * fetches a single Destination content fragment item by its DAM path
 * @param {string} aemHost the AEM host to fetch the persisted query from
 * @param {string} destinationPath the fragment's absolute DAM path
 * @returns {Promise<object|null>} the matching item, or null if not found
 */
export async function fetchDestinationByPath(aemHost, destinationPath) {
  // deliberately NOT url-encoded: the persisted query expects the literal path with slashes
  const url = `${aemHost}/graphql/execute.json/${BY_PATH_QUERY};destinationPath=${destinationPath}`;
  try {
    // on author, bypass the HTTP cache so edited fragments show up after a UE reload
    const res = await fetch(url, isAuthorEnvironment() ? { cache: 'no-store' } : undefined);
    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    return json?.data?.destinationsByPath?.item || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`destination-details-fragment: failed to load path "${destinationPath}"`, error);
    return null;
  }
}

function resolveImageUrl(item, aemHost) {
  // GraphQL's Content Fragment schema names these fields with a leading underscore.
  // _dynamicUrl (a Dynamic Media rendition) is preferred over the raw DAM _path.
  // eslint-disable-next-line no-underscore-dangle
  const imagePath = item.backgroundImage?._dynamicUrl || item.backgroundImage?._path;
  if (!imagePath) return null;
  return imagePath.startsWith('/') ? `${aemHost}${imagePath}` : imagePath;
}

/**
 * renders a Destination content fragment item as the destination detail view
 * @param {object} item the content fragment item, as returned by "destination-by-path"
 * @param {string} aemHost the AEM host, used to resolve relative image paths
 * @returns {DocumentFragment} the rendered markup
 */
export function renderDestinationDetails(item, aemHost) {
  const fragment = document.createDocumentFragment();
  const city = item.destinationCity || '';

  const header = document.createElement('div');
  header.className = 'destinations-details-header';
  if (item.destinationCountry) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'destinations-details-eyebrow';
    eyebrow.textContent = item.destinationCountry;
    instrumentField(eyebrow, 'destinationCountry', 'text', 'Country');
    header.append(eyebrow);
  }
  const title = item.title || (city ? `Flights to ${city}` : '');
  if (title) {
    const h1 = document.createElement('h1');
    h1.className = 'destinations-details-title';
    h1.textContent = title;
    instrumentField(h1, item.title ? 'title' : 'destinationCity', 'text', 'Title');
    header.append(h1);
  }
  if (header.children.length) fragment.append(header);

  const imageUrl = resolveImageUrl(item, aemHost);
  if (imageUrl) {
    const picture = document.createElement('div');
    picture.className = 'destinations-details-image';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = [city, item.destinationCountry].filter(Boolean).join(', ');
    // the hero image is usually the LCP element of a destination page
    img.loading = 'eager';
    img.fetchPriority = 'high';
    if (item.backgroundImage?.width) img.width = item.backgroundImage.width;
    if (item.backgroundImage?.height) img.height = item.backgroundImage.height;
    instrumentField(img, 'backgroundImage', 'media', 'Image');
    picture.append(img);
    fragment.append(picture);
  }

  const body = document.createElement('div');
  body.className = 'destinations-details-body';
  if (item.subtitle) {
    const h2 = document.createElement('h2');
    h2.className = 'destinations-details-subtitle';
    h2.textContent = item.subtitle;
    instrumentField(h2, 'subtitle', 'text', 'Subtitle');
    body.append(h2);
  }
  const { html, plaintext } = item.description || item.destinationDetails || {};
  if (html || plaintext) {
    const description = document.createElement('div');
    description.className = 'destinations-details-description';
    if (html) {
      description.innerHTML = html;
    } else {
      const p = document.createElement('p');
      p.textContent = plaintext;
      description.append(p);
    }
    instrumentField(description, 'description', 'richtext', 'Description');
    body.append(description);
  }
  if (body.children.length) fragment.append(body);

  return fragment;
}

/**
 * loads the Destination content fragment for the given path and renders it into container
 * @param {Element} container the element to render into (keeps its own attributes)
 * @param {string} destinationPath the fragment's DAM path
 * @returns {Promise<boolean>} true when a fragment was found and rendered
 */
export async function loadDestinationDetails(container, destinationPath) {
  const aemHost = getGraphqlHost();
  const item = await fetchDestinationByPath(aemHost, destinationPath);
  if (!item) return false;
  container.replaceChildren(renderDestinationDetails(item, aemHost));
  // eslint-disable-next-line no-underscore-dangle
  instrumentFragment(container, item._path, item.destinationCity || 'Destination');
  return true;
}
