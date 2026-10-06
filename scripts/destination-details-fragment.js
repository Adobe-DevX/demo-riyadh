// resolves a single Destination content fragment by its "slug" field (authored as plain text on
// the "destinations-details" block) and renders it as a destination detail view: a page-level
// heading, a hero image and an introductory sub-heading + description.
//
// Expected persisted query in AEM (Tools > General > GraphQL Query Editor), saved as
// "riyadh/destination-by-slug":
//
//   query ($slug: String!) {
//     destinationsList(filter: { slug: { _expressions: [{ value: $slug }] } }, limit: 1) {
//       items {
//         _path
//         slug
//         destinationCity
//         destinationCountry
//         title
//         subtitle
//         description { html plaintext }
//         backgroundImage {
//           ... on ImageRef { _path _dynamicUrl width height }
//         }
//       }
//     }
//   }
import getGraphqlHost, { isAuthorEnvironment } from './graphql-host.js';
import { instrumentFragment, instrumentField } from './cf-instrumentation.js';

const BY_SLUG_QUERY = 'riyadh/destination-by-slug';

/**
 * fetches a single Destination content fragment item by its slug
 * @param {string} aemHost the AEM host to fetch the persisted query from
 * @param {string} slug the destination's slug, e.g. "bangkok"
 * @returns {Promise<object|null>} the matching item, or null if not found
 */
export async function fetchDestinationBySlug(aemHost, slug) {
  const url = `${aemHost}/graphql/execute.json/${BY_SLUG_QUERY};slug=${encodeURIComponent(slug)}`;
  try {
    // when authoring, bypass the browser HTTP cache so a just-edited Content Fragment shows
    // up on Universal Editor's post-edit reload; published pages keep the caching
    const res = await fetch(url, isAuthorEnvironment() ? { cache: 'no-store' } : undefined);
    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    const result = Object.values(json?.data || {})[0];
    return result?.items?.[0] || result?.item || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`destination-details-fragment: failed to load slug "${slug}"`, error);
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
 * @param {object} item the content fragment item, as returned by "destination-by-slug"
 * @param {string} aemHost the AEM host, used to resolve relative image paths
 * @returns {DocumentFragment} the rendered markup
 */
export function renderDestinationDetails(item, aemHost) {
  const fragment = document.createDocumentFragment();
  const city = item.destinationCity || '';

  const title = item.title || (city ? `Flights to ${city}` : '');
  if (title) {
    const h1 = document.createElement('h1');
    h1.className = 'destinations-details-title';
    h1.textContent = title;
    instrumentField(h1, item.title ? 'title' : 'destinationCity', 'text', 'Title');
    fragment.append(h1);
  }

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
  const { html, plaintext } = item.description || {};
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
 * loads the Destination content fragment for the given slug and renders it into container
 * @param {Element} container the element to render into (keeps its own attributes)
 * @param {string} slug the destination's slug
 * @returns {Promise<boolean>} true when a fragment was found and rendered
 */
export async function loadDestinationDetails(container, slug) {
  const aemHost = getGraphqlHost();
  const item = await fetchDestinationBySlug(aemHost, slug);
  if (!item) return false;
  container.replaceChildren(renderDestinationDetails(item, aemHost));
  // eslint-disable-next-line no-underscore-dangle
  instrumentFragment(container, item._path, item.destinationCity || 'Destination');
  return true;
}
