const managerApi = '/manager-api';

const elements = {
  apiKey: document.querySelector('#api-key'),
  chatwootAccountId: document.querySelector('#chatwoot-account-id'),
  chatwootDialog: document.querySelector('#chatwoot-dialog'),
  chatwootEnabled: document.querySelector('#chatwoot-enabled'),
  chatwootError: document.querySelector('#chatwoot-error'),
  chatwootFields: document.querySelector('#chatwoot-fields'),
  chatwootForm: document.querySelector('#chatwoot-form'),
  chatwootInstanceName: document.querySelector('#chatwoot-instance-name'),
  chatwootSubmit: document.querySelector('#chatwoot-submit'),
  chatwootToken: document.querySelector('#chatwoot-token'),
  chatwootTokenNote: document.querySelector('#chatwoot-token-note'),
  chatwootUrl: document.querySelector('#chatwoot-url'),
  connectCopy: document.querySelector('#connect-copy'),
  connectDialog: document.querySelector('#connect-dialog'),
  connectPairingCode: document.querySelector('#connect-pairing-code'),
  connectQr: document.querySelector('#connect-qr'),
  dashboardError: document.querySelector('#dashboard-error'),
  dashboardView: document.querySelector('#dashboard-view'),
  instanceGrid: document.querySelector('#instance-grid'),
  instanceSummary: document.querySelector('#instance-summary'),
  loginError: document.querySelector('#login-error'),
  loginForm: document.querySelector('#login-form'),
  loginSubmit: document.querySelector('#login-submit'),
  loginView: document.querySelector('#login-view'),
  logoutButton: document.querySelector('#logout-button'),
  newInstanceBusinessFields: document.querySelector('#new-instance-business-fields'),
  newInstanceBusinessId: document.querySelector('#new-instance-business-id'),
  newInstanceButton: document.querySelector('#new-instance-button'),
  newInstanceDialog: document.querySelector('#new-instance-dialog'),
  newInstanceError: document.querySelector('#new-instance-error'),
  newInstanceForm: document.querySelector('#new-instance-form'),
  newInstanceIntegration: document.querySelector('#new-instance-integration'),
  newInstanceName: document.querySelector('#new-instance-name'),
  newInstanceNumber: document.querySelector('#new-instance-number'),
  newInstanceSubmit: document.querySelector('#new-instance-submit'),
  proxyCredentialsNote: document.querySelector('#proxy-credentials-note'),
  proxyDialog: document.querySelector('#proxy-dialog'),
  proxyEnabled: document.querySelector('#proxy-enabled'),
  proxyError: document.querySelector('#proxy-error'),
  proxyFields: document.querySelector('#proxy-fields'),
  proxyForm: document.querySelector('#proxy-form'),
  proxyInstanceName: document.querySelector('#proxy-instance-name'),
  proxySubmit: document.querySelector('#proxy-submit'),
  refreshButton: document.querySelector('#refresh-button'),
  settingsDialog: document.querySelector('#settings-dialog'),
  settingsError: document.querySelector('#settings-error'),
  settingsForm: document.querySelector('#settings-form'),
  settingsInstanceName: document.querySelector('#settings-instance-name'),
  settingsSubmit: document.querySelector('#settings-submit'),
  toggleKey: document.querySelector('#toggle-key'),
  webhookDialog: document.querySelector('#webhook-dialog'),
  webhookEnabled: document.querySelector('#webhook-enabled'),
  webhookError: document.querySelector('#webhook-error'),
  webhookEvents: document.querySelector('#webhook-events'),
  webhookForm: document.querySelector('#webhook-form'),
  webhookHeadersNote: document.querySelector('#webhook-headers-note'),
  webhookInstanceName: document.querySelector('#webhook-instance-name'),
  webhookSubmit: document.querySelector('#webhook-submit'),
  webhookUrl: document.querySelector('#webhook-url'),
};

let csrfToken = '';

const webhookEventOptions = [
  'APPLICATION_STARTUP', 'QRCODE_UPDATED', 'MESSAGES_SET', 'MESSAGES_UPSERT', 'MESSAGES_EDITED', 'MESSAGES_UPDATE',
  'MESSAGES_DELETE', 'SEND_MESSAGE', 'SEND_MESSAGE_UPDATE', 'CONTACTS_SET', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE',
  'PRESENCE_UPDATE', 'CHATS_SET', 'CHATS_UPSERT', 'CHATS_UPDATE', 'CHATS_DELETE', 'GROUPS_UPSERT', 'GROUP_UPDATE',
  'GROUP_PARTICIPANTS_UPDATE', 'CONNECTION_UPDATE', 'LABELS_EDIT', 'LABELS_ASSOCIATION', 'CALL', 'TYPEBOT_START',
  'TYPEBOT_CHANGE_STATUS', 'REMOVE_INSTANCE', 'LOGOUT_INSTANCE', 'INSTANCE_CREATE', 'INSTANCE_DELETE', 'STATUS_INSTANCE',
];

async function request(path, options = {}) {
  const { headers, ...requestOptions } = options;
  const response = await fetch(`${managerApi}${path}`, {
    credentials: 'same-origin',
    ...requestOptions,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.response?.message || payload?.message || payload?.error;
    throw new Error(Array.isArray(message) ? message[0] : message || 'Manager request failed');
  }

  if (response.status === 204) return;
  return response.json();
}

function setLoginError(message = '') {
  elements.loginError.textContent = message;
  elements.loginError.hidden = !message;
}

function setDashboardError(message = '') {
  elements.dashboardError.textContent = message;
  elements.dashboardError.hidden = !message;
}

function showDashboard() {
  elements.loginView.hidden = true;
  elements.dashboardView.hidden = false;
}

function showLogin() {
  csrfToken = '';
  elements.dashboardView.hidden = true;
  elements.loginView.hidden = false;
  elements.apiKey.value = '';
  elements.apiKey.focus();
}

function formatCount(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

function instanceCard(instance) {
  const state = instance.connectionStatus || 'unknown';
  const stateLabel = state === 'open' ? 'Connected' : state === 'connecting' ? 'Connecting' : 'Disconnected';
  const actions = [
    `<button class="button button-compact" data-action="connect" data-instance="${escapeAttribute(instance.name)}">Connect / QR</button>`,
    `<button class="button button-compact" data-action="settings" data-instance="${escapeAttribute(instance.name)}">Settings</button>`,
    `<button class="button button-compact" data-action="webhook" data-instance="${escapeAttribute(instance.name)}">Webhook</button>`,
    `<button class="button button-compact" data-action="proxy" data-instance="${escapeAttribute(instance.name)}">Proxy</button>`,
    `<button class="button button-compact" data-action="chatwoot" data-instance="${escapeAttribute(instance.name)}">Chatwoot</button>`,
    `<button class="button button-compact" data-action="restart" data-instance="${escapeAttribute(instance.name)}">Restart</button>`,
    `<button class="button button-compact" data-action="logout" data-instance="${escapeAttribute(instance.name)}">Logout</button>`,
    `<button class="button button-compact button-danger" data-action="delete" data-instance="${escapeAttribute(instance.name)}">Delete</button>`,
  ].join('');

  return `
    <article class="instance-card" data-state="${escapeAttribute(state)}">
      <div class="instance-card-top">
        <div>
          <h2>${escapeHtml(instance.name)}</h2>
          <p class="integration">${escapeHtml(instance.integration || 'Unknown integration')}</p>
        </div>
        <span class="state state-${escapeAttribute(state)}">${stateLabel}</span>
      </div>
      <div class="instance-metrics" aria-label="Instance data counts">
        <div class="metric"><strong>${formatCount(instance.counts?.chats)}</strong><span>Chats</span></div>
        <div class="metric"><strong>${formatCount(instance.counts?.contacts)}</strong><span>Contacts</span></div>
        <div class="metric"><strong>${formatCount(instance.counts?.messages)}</strong><span>Messages</span></div>
      </div>
      <div class="instance-actions">${actions}</div>
    </article>`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showConnectionDialog(instanceName, connection) {
  elements.connectQr.hidden = true;
  elements.connectPairingCode.hidden = true;
  elements.connectQr.removeAttribute('src');
  elements.connectPairingCode.textContent = '';

  if (connection?.qrcode?.base64) {
    elements.connectCopy.textContent = `Scan this QR code in WhatsApp to connect ${instanceName}.`;
    elements.connectQr.src = connection.qrcode.base64;
    elements.connectQr.hidden = false;
  } else if (connection?.qrcode?.pairingCode) {
    elements.connectCopy.textContent = `Enter this pairing code in WhatsApp to connect ${instanceName}.`;
    elements.connectPairingCode.textContent = connection.qrcode.pairingCode;
    elements.connectPairingCode.hidden = false;
  } else {
    elements.connectCopy.textContent = `${instanceName} is connecting. Refresh the instance status in a moment.`;
  }

  elements.connectDialog.showModal();
}

function setNewInstanceError(message = '') {
  elements.newInstanceError.textContent = message;
  elements.newInstanceError.hidden = !message;
}

function updateNewInstanceProviderFields() {
  const isBusiness = elements.newInstanceIntegration.value === 'WHATSAPP-BUSINESS';
  elements.newInstanceBusinessFields.hidden = !isBusiness;
  elements.newInstanceBusinessId.required = isBusiness;
  elements.newInstanceNumber.required = isBusiness;
  document.querySelector('#new-instance-number-field small').textContent = isBusiness
    ? 'Required for the official WhatsApp Business API. Use international digits only.'
    : 'International format, digits only. Optional for WhatsApp Web.';
}

function openNewInstanceDialog() {
  setNewInstanceError();
  elements.newInstanceForm.reset();
  updateNewInstanceProviderFields();
  elements.newInstanceDialog.showModal();
  elements.newInstanceName.focus();
}

function closeDialog(dialogId) {
  document.querySelector(`#${dialogId}`)?.close();
}

function setSettingsError(message = '') {
  elements.settingsError.textContent = message;
  elements.settingsError.hidden = !message;
}

function setWebhookError(message = '') {
  elements.webhookError.textContent = message;
  elements.webhookError.hidden = !message;
}

function renderWebhookEvents(selectedEvents = []) {
  const selected = new Set(selectedEvents);
  elements.webhookEvents.innerHTML = webhookEventOptions.map((eventName) => `
    <label class="check-option" for="webhook-event-${eventName}">
      <input id="webhook-event-${eventName}" name="events" type="checkbox" value="${eventName}" ${selected.has(eventName) ? 'checked' : ''} />
      <span><strong>${eventName}</strong></span>
    </label>`).join('');
}

function populateWebhookForm(instanceName, webhook = {}) {
  elements.webhookEnabled.checked = webhook.enabled === true;
  elements.webhookForm.elements.byEvents.checked = webhook.byEvents === true;
  elements.webhookForm.elements.base64.checked = webhook.base64 === true;
  elements.webhookUrl.value = webhook.url || '';
  elements.webhookForm.dataset.instanceName = instanceName;
  elements.webhookInstanceName.textContent = `Webhook delivery for ${instanceName}.`;
  elements.webhookHeadersNote.hidden = !webhook.hasCustomHeaders;
  elements.webhookHeadersNote.textContent = webhook.hasCustomHeaders
    ? 'This webhook already has protected custom headers. They remain active but are not shown or edited here.'
    : '';
  renderWebhookEvents(webhook.events || []);
}

async function openWebhookDialog(instanceName) {
  setWebhookError();
  try {
    const { webhook } = await request(`/instances/${encodeURIComponent(instanceName)}/webhook`);
    populateWebhookForm(instanceName, webhook);
    elements.webhookDialog.showModal();
  } catch (error) {
    setDashboardError(error.message);
  }
}

function setProxyError(message = '') {
  elements.proxyError.textContent = message;
  elements.proxyError.hidden = !message;
}

function updateProxyFields() {
  const enabled = elements.proxyEnabled.checked;
  elements.proxyFields.hidden = !enabled;
  for (const field of ['host', 'port', 'protocol']) {
    elements.proxyForm.elements[field].required = enabled;
  }
}

function populateProxyForm(instanceName, proxy = {}) {
  elements.proxyEnabled.checked = proxy.enabled === true;
  elements.proxyForm.elements.host.value = proxy.host || '';
  elements.proxyForm.elements.port.value = proxy.port || '';
  elements.proxyForm.elements.protocol.value = proxy.protocol || 'http';
  elements.proxyForm.dataset.instanceName = instanceName;
  elements.proxyInstanceName.textContent = `Proxy routing for ${instanceName}.`;
  elements.proxyCredentialsNote.hidden = !proxy.hasCredentials;
  elements.proxyCredentialsNote.textContent = proxy.hasCredentials
    ? 'This proxy already has protected credentials. They remain active but are not shown or edited here.'
    : '';
  updateProxyFields();
}

async function openProxyDialog(instanceName) {
  setProxyError();
  try {
    const { proxy } = await request(`/instances/${encodeURIComponent(instanceName)}/proxy`);
    populateProxyForm(instanceName, proxy);
    elements.proxyDialog.showModal();
  } catch (error) {
    setDashboardError(error.message);
  }
}

function setChatwootError(message = '') {
  elements.chatwootError.textContent = message;
  elements.chatwootError.hidden = !message;
}

function updateChatwootFields() {
  const enabled = elements.chatwootEnabled.checked;
  elements.chatwootFields.hidden = !enabled;
  for (const field of ['url', 'accountId']) {
    elements.chatwootForm.elements[field].required = enabled;
  }
  elements.chatwootForm.elements.token.required = enabled && !elements.chatwootForm.dataset.hasToken;
}

function populateChatwootForm(instanceName, chatwoot = {}) {
  elements.chatwootEnabled.checked = chatwoot.enabled === true;
  elements.chatwootUrl.value = chatwoot.url || '';
  elements.chatwootAccountId.value = chatwoot.accountId || '';
  elements.chatwootToken.value = '';
  elements.chatwootForm.dataset.instanceName = instanceName;
  elements.chatwootForm.dataset.hasToken = chatwoot.hasToken ? 'true' : '';
  elements.chatwootInstanceName.textContent = `Chatwoot connection for ${instanceName}.`;
  elements.chatwootTokenNote.hidden = !chatwoot.hasToken;
  elements.chatwootTokenNote.textContent = chatwoot.hasToken
    ? 'A protected Chatwoot token is already configured. Submit a new token only if you want to replace it.'
    : '';
  updateChatwootFields();
}

async function openChatwootDialog(instanceName) {
  setChatwootError();
  try {
    const { chatwoot } = await request(`/instances/${encodeURIComponent(instanceName)}/chatwoot`);
    populateChatwootForm(instanceName, chatwoot);
    elements.chatwootDialog.showModal();
  } catch (error) {
    setDashboardError(error.message);
  }
}

function populateSettingsForm(instanceName, settings = {}) {
  const fields = ['alwaysOnline', 'groupsIgnore', 'readMessages', 'readStatus', 'rejectCall', 'syncFullHistory'];
  for (const field of fields) {
    elements.settingsForm.elements[field].checked = settings[field] === true;
  }
  elements.settingsForm.elements.msgCall.value = settings.msgCall || '';
  elements.settingsForm.dataset.instanceName = instanceName;
  elements.settingsInstanceName.textContent = `Settings for ${instanceName}. Protected WhatsApp credentials are not displayed here.`;
}

async function openSettingsDialog(instanceName) {
  setSettingsError();
  try {
    const { settings } = await request(`/instances/${encodeURIComponent(instanceName)}/settings`);
    populateSettingsForm(instanceName, settings);
    elements.settingsDialog.showModal();
  } catch (error) {
    setDashboardError(error.message);
  }
}

async function loadInstances() {
  setDashboardError();
  elements.refreshButton.disabled = true;
  elements.instanceGrid.setAttribute('aria-busy', 'true');
  elements.instanceGrid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';

  try {
    const { instances } = await request('/instances');
    const openInstances = instances.filter((instance) => instance.connectionStatus === 'open').length;
    elements.instanceSummary.textContent = `${openInstances} connected of ${instances.length} registered instance${instances.length === 1 ? '' : 's'}.`;
    elements.instanceGrid.innerHTML = instances.length
      ? instances.map(instanceCard).join('')
      : '<section class="empty-state"><h2>No instances found</h2><p>Create an instance through the API to begin operating it here.</p></section>';
  } catch (error) {
    setDashboardError(error.message);
    if (/Unauthorized/i.test(error.message)) showLogin();
  } finally {
    elements.refreshButton.disabled = false;
    elements.instanceGrid.setAttribute('aria-busy', 'false');
  }
}

async function initializeSession() {
  const session = await request('/session');
  csrfToken = session.csrfToken;
  showDashboard();
  await loadInstances();
}

async function handleInstanceAction(button) {
  const instanceName = button.dataset.instance;
  const action = button.dataset.action;
  const originalLabel = button.textContent;

  if (action === 'settings') {
    await openSettingsDialog(instanceName);
    return;
  }

  if (action === 'webhook') {
    await openWebhookDialog(instanceName);
    return;
  }

  if (action === 'proxy') {
    await openProxyDialog(instanceName);
    return;
  }

  if (action === 'chatwoot') {
    await openChatwootDialog(instanceName);
    return;
  }

  if (action === 'delete' && !window.confirm(`Delete the instance "${instanceName}"? This cannot be undone.`)) return;
  if (action === 'logout' && !window.confirm(`Log out "${instanceName}" from WhatsApp?`)) return;

  button.disabled = true;
  button.textContent = 'Working…';
  setDashboardError();

  try {
    const options = {
      headers: { 'X-Manager-CSRF': csrfToken },
      method: action === 'delete' ? 'DELETE' : 'POST',
    };
    const result = await request(`/instances/${encodeURIComponent(instanceName)}/${action}`, options);
    if (action === 'connect') showConnectionDialog(instanceName, result);
    await loadInstances();
  } catch (error) {
    setDashboardError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginError();
  elements.loginSubmit.disabled = true;
  elements.loginSubmit.textContent = 'Opening…';

  try {
    await request('/session', {
      body: JSON.stringify({ apiKey: elements.apiKey.value }),
      method: 'POST',
    });
    await initializeSession();
  } catch (error) {
    setLoginError('Could not authenticate. Check the global API key and try again.');
  } finally {
    elements.loginSubmit.disabled = false;
    elements.loginSubmit.textContent = 'Open Manager';
  }
});

elements.toggleKey.addEventListener('click', () => {
  const isPassword = elements.apiKey.type === 'password';
  elements.apiKey.type = isPassword ? 'text' : 'password';
  elements.toggleKey.textContent = isPassword ? 'Hide' : 'Show';
  elements.toggleKey.setAttribute('aria-label', isPassword ? 'Hide API key' : 'Show API key');
});

elements.refreshButton.addEventListener('click', loadInstances);
elements.newInstanceButton.addEventListener('click', openNewInstanceDialog);
elements.newInstanceIntegration.addEventListener('change', updateNewInstanceProviderFields);
elements.newInstanceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setNewInstanceError();

  const formData = new FormData(elements.newInstanceForm);
  const integration = formData.get('integration');
  const payload = {
    businessId: String(formData.get('businessId') || '').trim() || undefined,
    instanceName: String(formData.get('instanceName') || '').trim(),
    integration,
    number: String(formData.get('number') || '').replace(/\s+/g, '') || undefined,
  };

  elements.newInstanceSubmit.disabled = true;
  elements.newInstanceSubmit.textContent = 'Creating…';
  try {
    const result = await request('/instances', {
      body: JSON.stringify(payload),
      headers: { 'X-Manager-CSRF': csrfToken },
      method: 'POST',
    });
    elements.newInstanceDialog.close();
    await loadInstances();
    showConnectionDialog(result.instance.instanceName, result);
  } catch (error) {
    setNewInstanceError(error.message);
  } finally {
    elements.newInstanceSubmit.disabled = false;
    elements.newInstanceSubmit.textContent = 'Create instance';
  }
});
elements.settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setSettingsError();

  const instanceName = elements.settingsForm.dataset.instanceName;
  const formData = new FormData(elements.settingsForm);
  const payload = {
    alwaysOnline: formData.has('alwaysOnline'),
    groupsIgnore: formData.has('groupsIgnore'),
    msgCall: String(formData.get('msgCall') || ''),
    readMessages: formData.has('readMessages'),
    readStatus: formData.has('readStatus'),
    rejectCall: formData.has('rejectCall'),
    syncFullHistory: formData.has('syncFullHistory'),
  };

  elements.settingsSubmit.disabled = true;
  elements.settingsSubmit.textContent = 'Saving…';
  try {
    await request(`/instances/${encodeURIComponent(instanceName)}/settings`, {
      body: JSON.stringify(payload),
      headers: { 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    elements.settingsDialog.close();
  } catch (error) {
    setSettingsError(error.message);
  } finally {
    elements.settingsSubmit.disabled = false;
    elements.settingsSubmit.textContent = 'Save settings';
  }
});
elements.webhookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setWebhookError();

  const instanceName = elements.webhookForm.dataset.instanceName;
  const formData = new FormData(elements.webhookForm);
  const payload = {
    base64: formData.has('base64'),
    byEvents: formData.has('byEvents'),
    enabled: formData.has('enabled'),
    events: formData.getAll('events'),
    url: String(formData.get('url') || '').trim(),
  };

  elements.webhookSubmit.disabled = true;
  elements.webhookSubmit.textContent = 'Saving…';
  try {
    await request(`/instances/${encodeURIComponent(instanceName)}/webhook`, {
      body: JSON.stringify(payload),
      headers: { 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    elements.webhookDialog.close();
  } catch (error) {
    setWebhookError(error.message);
  } finally {
    elements.webhookSubmit.disabled = false;
    elements.webhookSubmit.textContent = 'Save webhook';
  }
});
elements.proxyEnabled.addEventListener('change', updateProxyFields);
elements.proxyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setProxyError();

  const instanceName = elements.proxyForm.dataset.instanceName;
  const formData = new FormData(elements.proxyForm);
  const payload = {
    enabled: formData.has('enabled'),
    host: String(formData.get('host') || '').trim(),
    port: String(formData.get('port') || '').trim(),
    protocol: String(formData.get('protocol') || '').trim(),
  };

  elements.proxySubmit.disabled = true;
  elements.proxySubmit.textContent = 'Saving…';
  try {
    await request(`/instances/${encodeURIComponent(instanceName)}/proxy`, {
      body: JSON.stringify(payload),
      headers: { 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    elements.proxyDialog.close();
  } catch (error) {
    setProxyError(error.message);
  } finally {
    elements.proxySubmit.disabled = false;
    elements.proxySubmit.textContent = 'Save proxy';
  }
});
elements.chatwootEnabled.addEventListener('change', updateChatwootFields);
elements.chatwootForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setChatwootError();

  const instanceName = elements.chatwootForm.dataset.instanceName;
  const formData = new FormData(elements.chatwootForm);
  const payload = {
    accountId: String(formData.get('accountId') || '').trim(),
    enabled: formData.has('enabled'),
    token: String(formData.get('token') || '').trim(),
    url: String(formData.get('url') || '').trim(),
  };

  elements.chatwootSubmit.disabled = true;
  elements.chatwootSubmit.textContent = 'Saving…';
  try {
    await request(`/instances/${encodeURIComponent(instanceName)}/chatwoot`, {
      body: JSON.stringify(payload),
      headers: { 'X-Manager-CSRF': csrfToken },
      method: 'PUT',
    });
    elements.chatwootDialog.close();
  } catch (error) {
    setChatwootError(error.message);
  } finally {
    elements.chatwootSubmit.disabled = false;
    elements.chatwootSubmit.textContent = 'Save Chatwoot';
  }
});
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-close-dialog]');
  if (button) closeDialog(button.dataset.closeDialog);
});
elements.instanceGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) handleInstanceAction(button);
});
elements.logoutButton.addEventListener('click', async () => {
  await request('/session', { method: 'DELETE' }).catch(() => undefined);
  showLogin();
});

initializeSession().catch(() => showLogin());
