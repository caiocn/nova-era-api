const managerApi = '/manager-api';

const elements = {
  apiKey: document.querySelector('#api-key'),
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
  refreshButton: document.querySelector('#refresh-button'),
  settingsDialog: document.querySelector('#settings-dialog'),
  settingsError: document.querySelector('#settings-error'),
  settingsForm: document.querySelector('#settings-form'),
  settingsInstanceName: document.querySelector('#settings-instance-name'),
  settingsSubmit: document.querySelector('#settings-submit'),
  toggleKey: document.querySelector('#toggle-key'),
};

let csrfToken = '';

async function request(path, options = {}) {
  const response = await fetch(`${managerApi}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.response?.message?.[0] || payload?.error || 'Manager request failed');
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
