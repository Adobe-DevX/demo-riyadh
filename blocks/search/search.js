import { decorateIcons } from '../../scripts/aem.js';

export default function decorate(block) {
  const bar = document.createElement('div');
  bar.className = 'search-bar';

  [...block.children].forEach((field, i) => {
    const [label, value] = field.children;
    label.className = 'search-field-label';
    value.className = 'search-field-value';
    field.className = 'search-field';
    bar.append(field);

    if (i === 0) {
      const swap = document.createElement('div');
      swap.className = 'search-swap';
      swap.innerHTML = '<span class="icon icon-arrows"></span>';
      bar.append(swap);
    }
  });

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'search-submit';
  submit.setAttribute('aria-label', 'Search flights');
  submit.innerHTML = '<span class="icon icon-search"></span>';
  bar.append(submit);

  block.replaceChildren(bar);
  decorateIcons(bar);
}
