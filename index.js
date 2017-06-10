function el(tagName, attrs={}, children=[]) {
  const element = document.createElement(tagName);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  for (const child of children) {
    if (child instanceof HTMLElement) {
      element.appendChild(child);
    } else {
      element.appendChild(document.createTextNode(child));
    }
  }
  return element;
}
function makeShorthand(tagName) {
  return (...args) => el(tagName, ...args);
}

const div = makeShorthand('div');
const li = makeShorthand('li');
const a = makeShorthand('a');
const input = makeShorthand('input');
const h3 = makeShorthand('h3');
const strong = makeShorthand('strong');
const button = makeShorthand('button');
const h4 = makeShorthand('h4');
const ul = makeShorthand('ul');
const form = makeShorthand('form');

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

if (oldForm) {
  const moderationForm = oldForm.querySelector('input[name="submit"]');
  if (moderationForm) {
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

    const newForm = form({class: 'helper-form', action: oldForm.action, method: oldForm.method}, [
      div({class: 'recipients'}, recipients.map(recipient => {
        const encodedEmail = encodeURIComponent(recipient.email);

        return div({class: 'recipient', 'data-email': encodedEmail}, [
          h3({}, [
            strong({}, ['From:']),
            recipient.email,
          ]),
          div({class: 'recipient-body'}, [
            div({class: 'controls'}, [
              button({class: 'accept'}, ['Accept']),
              button({class: 'accept whitelist'}, ['Accept & Whitelist']),
              button({class: 'discard'}, ['Discard']),
              button({class: 'discard blacklist'}, ['Discard & Blacklist']),
            ]),
            div({class: 'messages'}, [
              h4({}, ['Messages:']),
              ul({}, recipient.messages.map(message => (
                li({}, [
                  a({href: message.link}, [message.subject]),
                  input({type: 'hidden', name: encodedEmail, value: message.id}),
                ])
              ))),
            ]),
          ]),
        ]);
      }).concat(h3(), [div({class: 'controls-all'}, [
          button({class: 'accept'}, ['Accept All']),
          button({class: 'accept whitelist'}, ['Accept & Whitelist All']),
          button({class: 'discard'}, ['Discard All']),
          button({class: 'discard blacklist'}, ['Discard & Blacklist All']),
        ]),
      ])),
    ]);

    function addInput(name, value) {
      newForm.appendChild(input({
        type: 'hidden',
        name: name,
        value: value,
      }));
    }

    function setAction(target, email) {
      if (target.classList.contains('accept')) {
        addInput(`senderaction-${email}`, '1');
        if (target.classList.contains('whitelist')) {
          addInput(`senderfilterp-${email}`, '1');
          addInput(`senderfilter-${email}`, '6');
        }
      } else if (target.classList.contains('discard')) {
        addInput(`senderaction-${email}`, '3');
        if (target.classList.contains('blacklist')) {
          addInput(`senderfilterp-${email}`, '1');
          addInput(`senderfilter-${email}`, '3');
        }
      }
    }

    newForm.addEventListener('click', event => {
      const target = event.target;
      if (target.matches('.controls button')) {
        event.preventDefault();
        const email = matchParent(target, '.recipient').dataset.email;
        setAction(target, email);
        newForm.submit();
      }
      if (target.matches('.controls-all button')) {
        event.preventDefault();
        for (let [index, recipient] of recipients.entries()) {
          setAction(target, encodeURIComponent(recipient.email));
        }
        newForm.submit();
      }
    });

    oldForm.parentNode.insertBefore(newForm, oldForm);
    oldForm.style.display = 'none';
  }
}
