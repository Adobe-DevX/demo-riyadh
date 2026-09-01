const AUTHOR_HOST = 'https://author-p220753-e2271497.adobeaemcloud.com';
const PUBLISH_HOST = 'https://publish-p220753-e2271497.adobeaemcloud.com';

/**
 * True when the page itself is being viewed on the AEM author instance (as opposed to the
 * published site, aem.page/aem.live preview, or local dev) — i.e. when GraphQL fetches are
 * same-origin and automatically authenticated via the browser's existing session cookie.
 * @returns {boolean}
 */
export function isAuthorEnvironment() {
  return window.location.hostname.startsWith('author-');
}

/**
 * Resolves which AEM host a block's GraphQL fetch should target: the author host when the
 * page itself is being viewed on the author instance (same-origin, session-cookie
 * authenticated), or the publish host everywhere else (published site, aem.page/aem.live
 * preview, local dev).
 * @returns {string} the AEM host to fetch GraphQL persisted queries from
 */
export default function getGraphqlHost() {
  return isAuthorEnvironment() ? AUTHOR_HOST : PUBLISH_HOST;
}
