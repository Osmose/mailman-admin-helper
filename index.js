function matchParent(el, selector) {
  if (el.parentNode !== null) {
    if (el.parentNode.matches(selector)) {
      return el.parentNode;
    } else {
      return matchParent(el.parentNode, selector);
    }
  } else {
    return null;
  }
}

const oldForm = document.querySelector('form');

const recipientTables = oldForm.querySelectorAll(':scope > table > tbody > tr > td > table');
const recipients = Array.from(recipientTables).map(table => {
  const forwardToInput = table.querySelector('input[name^=senderforwardto]');
  const email = decodeURIComponent(forwardToInput.name.slice('senderforwardto-'.length));

  const messageTableBodies = Array.from(table.querySelectorAll('strong'))
    .filter(s => s.textContent === 'Subject:')
    .map(s => s.parentNode.parentNode.parentNode);
  const messages = messageTableBodies.map(tbody => {
    return {
      link: tbody.children[0].querySelector('a').href,
      id: tbody.querySelector('input').value,
      subject: tbody.children[0].querySelector('td:last-child').textContent,
      size: tbody.children[1].querySelector('td:last-child').textContent,
      reason: tbody.children[2].querySelector('td:last-child').textContent,
      received: tbody.children[3].querySelector('td:last-child').textContent,
    };
  })

  return {email, messages};
});

const newRecipientHtml = recipients.map(recipient => {
  const encodedEmail = encodeURIComponent(recipient.email);

  const messagesHtml = recipient.messages.map(message => `
    <li>
      <a href="${message.link}">${message.subject}</a>
      <input type="hidden" name="${encodedEmail}" value="${message.id}">
    </li>
  `).join('');

  return `
    <div class="recipient" data-email="${encodedEmail}">
      <h3><strong>From:</strong>${recipient.email}</h3>
      <div class="recipient-body">
        <div class="controls">
          <button class="accept">Accept</button>
          <button class="accept whitelist">Accept & Whitelist</button>
          <button class="discard">Discard</button>
          <button class="discard blacklist">Discard & Blacklist</button>
        </div>
        <div class="messages">
          <h4>Messages</h4>
          <ul>
            ${messagesHtml}
          </ul>
        </div>
      </div>
    </div>
  `;
}).join('');

const newForm = document.createElement('form');
newForm.className = 'helper-form';
newForm.action = oldForm.action;
newForm.method = oldForm.method;
newForm.innerHTML = `
  <div class="recipients">
    ${newRecipientHtml}
  </div>
`;

function addInput(name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name
  input.value = value;
  newForm.appendChild(input);
}

newForm.addEventListener('click', event => {
  const target = event.target;
  if (target.matches('.controls button')) {
    event.preventDefault();
    const email = matchParent(target, '.recipient').dataset.email;
    if (target.classList.contains('accept')) {
      addInput(`senderaction-${email}`, '1');
      if (target.classList.contains('whitelist')) {
        addInput(`senderfilterp-${email}`, '1');
        addInput(`senderfilter-${email}`, '6');
      }
      newForm.submit();
    } else if (target.classList.contains('discard')) {
      addInput(`senderaction-${email}`, '3');
      if (target.classList.contains('blacklist')) {
        addInput(`senderfilterp-${email}`, '1');
        addInput(`senderfilter-${email}`, '3');
      }
      newForm.submit();
    }
  }
});

oldForm.parentNode.insertBefore(newForm, oldForm);
oldForm.style.display = 'none';
