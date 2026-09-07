import { getMetadata } from '../../scripts/aem.js';
import { getLocale } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// fallback used if the query index can't be read (offline, blocked request, etc.)
const DEFAULT_LANGUAGES = ['en', 'ar'];

/**
 * Derives the list of language copies from the delivered site itself, rather than AEM's
 * authoring content tree: `paths.json` maps both `/content/riyadh/` and
 * `/content/riyadh/language-masters/` to the delivered root, so a page authored under
 * language-masters/en is simply delivered at /en/... — the "language-masters" segment never
 * appears in a published URL or in /query-index.json. Each language copy does, however, always
 * publish its own /<code>/nav and /<code>/footer fragments (see header.js/footer.js), so a
 * 2-letter path that has both of those siblings in the index is treated as a language root.
 * @returns {Promise<string[]>} available language codes
 */
async function getAvailableLanguages() {
  try {
    const resp = await fetch('/query-index.json?limit=500');
    if (!resp.ok) throw new Error(`${resp.status}`);
    const { data } = await resp.json();
    const paths = new Set(data.map(({ path }) => path));
    const codes = [...new Set(
      data
        .map(({ path }) => path.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\/?$/i))
        .filter(Boolean)
        .map(([, code]) => code.toLowerCase()),
    )].filter((code) => paths.has(`/${code}/nav`) && paths.has(`/${code}/footer`));
    if (codes.length) return codes;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Could not read available languages, using defaults', e);
  }
  return DEFAULT_LANGUAGES;
}

/**
 * @param {string} code a language code, e.g. "en"
 * @returns {string} the language's name, in its own language, e.g. "English" or "العربية"
 */
function getLanguageLabel(code) {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code);
  } catch (e) {
    return code.toUpperCase();
  }
}

/**
 * Swaps (or adds) the locale segment of a path.
 * @param {string} pathname the current page's pathname
 * @param {string[]} languages the known language codes
 * @param {string} code the language code to switch to
 * @returns {string} the equivalent path in the given language
 */
function getLocalizedPath(pathname, languages, code) {
  const segments = pathname.split('/');
  if (languages.includes(segments[1])) {
    segments[1] = code;
  } else {
    segments.splice(1, 0, code);
  }
  return segments.join('/') || '/';
}

/**
 * Builds the language switcher dropdown in place of the nav's globe icon.
 * @param {Element} globeIcon the nav-tools globe icon element; replaced in the DOM as a
 *   side effect of calling this function
 */
async function buildLanguageSwitcher(globeIcon) {
  const languages = await getAvailableLanguages();
  const { pathname } = window.location;
  const [, maybeLocale] = pathname.split('/');
  const current = languages.includes(maybeLocale) ? maybeLocale : languages[0];

  const wrapper = document.createElement('span');
  wrapper.className = 'nav-lang';
  // insert the wrapper at the icon's current position before moving the icon into
  // the button below — reversing this order would make the icon replace itself
  // with an element that (by then) already contains it
  globeIcon.replaceWith(wrapper);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-lang-toggle';
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Select language');
  toggle.append(globeIcon);

  const currentLabel = document.createElement('span');
  currentLabel.className = 'nav-lang-current';
  currentLabel.textContent = current;
  toggle.append(currentLabel);

  const list = document.createElement('span');
  list.className = 'nav-lang-list';
  list.setAttribute('role', 'listbox');
  languages.forEach((code) => {
    const link = document.createElement('a');
    link.setAttribute('role', 'option');
    link.href = getLocalizedPath(pathname, languages, code);
    link.textContent = getLanguageLabel(code);
    link.setAttribute('aria-selected', code === current ? 'true' : 'false');
    list.append(link);
  });

  const closeList = () => {
    wrapper.classList.remove('nav-lang-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = wrapper.classList.toggle('nav-lang-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeList();
  });

  wrapper.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      closeList();
      toggle.focus();
    }
  });

  wrapper.append(toggle, list);
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const locale = getLocale();
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : `${locale ? `/${locale}` : ''}/nav`;
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) {
        navSection.classList.add('nav-drop');
      } else if (!navSection.querySelector('a')) {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = navSection.textContent;
        navSection.replaceChildren(link);
      }
      navSection.addEventListener('click', (e) => {
        if (isDesktop.matches && navSection.classList.contains('nav-drop')) {
          e.preventDefault();
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // make tool icons act as links
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const globeIcon = navTools.querySelector('.icon-globe');
    if (globeIcon) {
      await buildLanguageSwitcher(globeIcon);
    }

    navTools.querySelectorAll('.icon').forEach((icon) => {
      if (icon.closest('a') || icon.closest('.nav-lang')) return;
      const link = document.createElement('a');
      link.href = '#';
      icon.replaceWith(link);
      link.append(icon);
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // swap the transparent hero scrim for a solid background once the page scrolls past it
  const updateScrolled = () => navWrapper.classList.toggle('scrolled', window.scrollY > 24);
  updateScrolled();
  window.addEventListener('scroll', updateScrolled, { passive: true });
}
