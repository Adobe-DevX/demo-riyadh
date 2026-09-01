import { decorateIcons } from '../../scripts/aem.js';

export default function decorate(block) {
  const bar = document.createElement('div');
  bar.className = 'search-bar';

  [...block.children].forEach((field, i) => {
    const [labelText, value] = field.children;
    const fieldId = `search-field-${i}`;

    const label = document.createElement('label');
    label.className = 'search-field-label';
    label.setAttribute('for', fieldId);
    label.textContent = labelText.textContent.trim();
    labelText.replaceWith(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = fieldId;
    input.className = 'search-field-value';
    input.autocomplete = 'off';
    input.value = value.textContent.trim();
    input.size = Math.max(input.value.length, label.textContent.length, 3) + 1;
    value.replaceWith(input);

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
