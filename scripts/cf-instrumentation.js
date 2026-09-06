import { isAuthorEnvironment } from './graphql-host.js';

// Universal Editor addresses editable content by a resource URN. For a Content Fragment, the
// editable field values live under the fragment's master-variation data node, so the URN points
// there rather than at the fragment root.
const CONNECTION = 'urn:aemconnection';

/**
 * Builds the Universal Editor resource URN for a Content Fragment's editable field values.
 * @param {string} fragmentPath the fragment's absolute DAM path
 * @returns {string} the resource URN targeting the fragment's master-variation data node
 */
export function fragmentResourceUrn(fragmentPath) {
  return `${CONNECTION}:${fragmentPath}/jcr:content/data/master`;
}

/**
 * Marks an element as the editable Content Fragment container: selectable in Universal Editor
 * and the resource its child fields (see instrumentField) save back to. No-op outside the AEM
 * author environment, so published pages stay free of editing attributes.
 * @param {Element} element the container element (e.g. the card wrapper)
 * @param {string} fragmentPath the fragment's absolute DAM path
 * @param {string} [label] a friendly label shown for the selectable fragment
 */
export function instrumentFragment(element, fragmentPath, label) {
  if (!isAuthorEnvironment() || !element || !fragmentPath) return;
  element.setAttribute('data-aue-resource', fragmentResourceUrn(fragmentPath));
  element.setAttribute('data-aue-type', 'reference');
  element.setAttribute('data-aue-filter', 'cf');
  if (label) element.setAttribute('data-aue-label', label);
}

/**
 * Marks an element as an inline-editable Content Fragment field, resolved against the nearest
 * ancestor instrumented by instrumentFragment. No-op outside the AEM author environment.
 * @param {Element} element the element rendering the field's value
 * @param {string} prop the Content Fragment field name
 * @param {string} type the Universal Editor field type ('text', 'richtext', 'media', ...)
 * @param {string} [label] a friendly label shown for the field
 */
export function instrumentField(element, prop, type, label) {
  if (!isAuthorEnvironment() || !element || !prop) return;
  element.setAttribute('data-aue-prop', prop);
  element.setAttribute('data-aue-type', type);
  if (label) element.setAttribute('data-aue-label', label);
}
