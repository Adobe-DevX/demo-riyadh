// resolves a page of Destination content fragments (city + country + background image),
// sorted/rendered server-side; used by the destination block's carousel. Unlike the Teaser
// model, this query takes no path/folder scoping — it's a flat, paginated list — so the
// destination block itself needs no content-reference field, just how many items to show.
const LIST_QUERY = 'riyadh/destinations-all';

/**
 * fetches a page of Destination content fragments
 * @param {string} aemHost the AEM host to fetch the persisted query from
 * @param {number} [limit] max number of items to fetch
 * @param {number} [offset] pagination offset
 * @returns {Promise<object[]>} the matching items, or an empty array if none/on error
 */
export async function fetchDestinations(aemHost, limit = 12, offset = 0) {
  const url = `${aemHost}/graphql/execute.json/${LIST_QUERY};offset=${offset};limit=${limit}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    return Object.values(json?.data || {})[0]?.items || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('destination-fragment: failed to load destinations', error);
    return [];
  }
}

/**
 * renders a Destination content fragment item using the .destination-card markup
 * @param {object} item the content fragment item ({ destinationCity, destinationCountry,
 * backgroundImage }), as returned by the "destinations-all" persisted query — backgroundImage
 * may be null when an author hasn't set one yet
 * @param {string} aemHost the AEM host, used to resolve relative image paths
 * @param {string} [style] optional "style-<value>" modifier class for this card
 * @returns {HTMLLIElement} the rendered card
 */
export function renderDestinationCard(item, aemHost, style) {
  const li = document.createElement('li');
  li.className = 'destination-card';
  if (style && style !== 'default') li.classList.add(`style-${style}`);

  const wrapper = document.createElement('div');
  wrapper.className = 'destination-card-link';

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
    imageWrapper.append(img);
    wrapper.append(imageWrapper);
  }

  const body = document.createElement('div');
  body.className = 'destination-card-body';
  if (item.destinationCity) {
    const cityEl = document.createElement('p');
    cityEl.className = 'destination-card-city';
    cityEl.textContent = item.destinationCity;
    body.append(cityEl);
  }
  if (item.destinationCountry) {
    const countryEl = document.createElement('p');
    countryEl.className = 'destination-card-country';
    countryEl.textContent = item.destinationCountry;
    body.append(countryEl);
  }
  wrapper.append(body);
  li.append(wrapper);
  return li;
}
