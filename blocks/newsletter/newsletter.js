/**
 * loads and decorates the newsletter signup block
 * @param {Element} block The newsletter block element
 */
export default function decorate(block) {
  const [headingRow, placeholderRow, consentRow, termsRow] = block.children;

  const heading = headingRow?.firstElementChild;
  const emailPlaceholder = placeholderRow?.textContent.trim() || 'Email address';
  const consent = consentRow?.firstElementChild;
  const terms = termsRow?.firstElementChild;

  block.textContent = '';

  if (heading) {
    heading.classList.add('newsletter-heading');
    block.append(heading);
  }

  const form = document.createElement('form');
  form.className = 'newsletter-form';

  const label = document.createElement('label');
  label.className = 'newsletter-label';
  label.setAttribute('for', 'newsletter-email');
  label.textContent = emailPlaceholder;

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'newsletter-input-wrapper';

  const input = document.createElement('input');
  input.type = 'email';
  input.id = 'newsletter-email';
  input.name = 'email';
  input.placeholder = emailPlaceholder;
  input.required = true;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'newsletter-submit';
  submit.setAttribute('aria-label', 'Subscribe');
  submit.innerHTML = '<span class="icon icon-arrow-right"><img data-icon-name="arrow-right" src="/icons/arrow-right.svg" alt="" loading="lazy"></span>';

  inputWrapper.append(input, submit);
  form.append(label, inputWrapper);

  if (consent) {
    const consentLabel = document.createElement('label');
    consentLabel.className = 'newsletter-consent';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'consent';
    checkbox.required = true;

    const consentText = document.createElement('span');
    consentText.append(...consent.childNodes);

    consentLabel.append(checkbox, consentText);
    form.append(consentLabel);
  }

  if (terms) {
    terms.classList.add('newsletter-terms');
    form.append(terms);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log('newsletter signup', new FormData(form).get('email'));
  });

  block.append(form);
}
