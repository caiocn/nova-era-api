const managerApi = '/manager-api';

const elements = {
  activeChatAvatar: document.querySelector('#active-chat-avatar'),
  activeChatJid: document.querySelector('#active-chat-jid'),
  activeChatName: document.querySelector('#active-chat-name'),
  apiKey: document.querySelector('#api-key'),
  backToInstancesBtn: document.querySelector('#back-to-instances-btn'),
  chatActiveView: document.querySelector('#chat-active-view'),
  chatComposerForm: document.querySelector('#chat-composer-form'),
  chatContactsFilter: document.querySelector('#chat-contacts-filter'),
  chatEmptyView: document.querySelector('#chat-empty-view'),
  chatGroupsFilter: document.querySelector('#chat-groups-filter'),
  chatList: document.querySelector('#chat-list'),
  chatMessageInput: document.querySelector('#chat-message-input'),
  chatMessages: document.querySelector('#chat-messages'),
  chatRefreshBtn: document.querySelector('#chat-refresh-btn'),
  chatSearchInput: document.querySelector('#chat-search-input'),
  chatSendBtn: document.querySelector('#chat-send-btn'),
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
  connectLoading: document.querySelector('#connect-loading'),
  connectPairingCode: document.querySelector('#connect-pairing-code'),
  connectQr: document.querySelector('#connect-qr'),
  connectRefreshBtn: document.querySelector('#connect-refresh-btn'),
  dashboardError: document.querySelector('#dashboard-error'),
  dashboardView: document.querySelector('#dashboard-view'),
  instanceGrid: document.querySelector('#instance-grid'),
  instanceHeroAvatar: document.querySelector('#instance-hero-avatar'),
  instanceHeroInfo: document.querySelector('#instance-hero-info'),
  instanceHeroIntegration: document.querySelector('#instance-hero-integration'),
  instanceHeroTitle: document.querySelector('#instance-hero-title'),
  instanceOpenState: document.querySelector('#instance-open-state'),
  instancesWorkspace: document.querySelector('#instances'),
  instanceSummary: document.querySelector('#instance-summary'),
  instanceWorkspace: document.querySelector('#instance-workspace'),
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
  proxyPassword: document.querySelector('#proxy-password'),
  proxySubmit: document.querySelector('#proxy-submit'),
  proxyUsername: document.querySelector('#proxy-username'),
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
let currentInstance = null;
let currentChats = [];
let activeChatJid = null;
let instancesCache = [];
let chatFilter = 'contacts';
let activeChatLoadId = 0;
let chatRefreshTimer = null;

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
  const stateLabel = state === 'open' ? 'Conectado' : state === 'connecting' ? 'Conectando' : 'Desconectado';
  const actions = [
    `<button class="button button-compact button-primary button-open" data-action="open" data-instance="${escapeAttribute(instance.name)}">Abrir instância</button>`,
    `<button class="button button-compact" data-action="connect" data-instance="${escapeAttribute(instance.name)}">Conectar / QR</button>`,
    `<button class="button button-compact" data-action="settings" data-instance="${escapeAttribute(instance.name)}">Configurações</button>`,
    `<button class="button button-compact" data-action="webhook" data-instance="${escapeAttribute(instance.name)}">Webhook</button>`,
    `<button class="button button-compact" data-action="proxy" data-instance="${escapeAttribute(instance.name)}">Proxy</button>`,
    `<button class="button button-compact" data-action="chatwoot" data-instance="${escapeAttribute(instance.name)}">Chatwoot</button>`,
    `<button class="button button-compact" data-action="restart" data-instance="${escapeAttribute(instance.name)}">Reiniciar</button>`,
    `<button class="button button-compact" data-action="logout" data-instance="${escapeAttribute(instance.name)}">Logout</button>`,
    `<button class="button button-compact button-danger" data-action="delete" data-instance="${escapeAttribute(instance.name)}">Excluir</button>`,
  ].join('');

  return `
    <article class="instance-card" data-state="${escapeAttribute(state)}">
      <div class="instance-card-top" data-action="open" data-instance="${escapeAttribute(instance.name)}" title="Clique para abrir a instância">
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

let connectPollTimer = null;
let activeConnectingInstance = null;

function parseQrResponse(connection) {
  const base64 = connection?.base64 || connection?.qrcode?.base64 || null;
  const pairingCode = connection?.pairingCode || connection?.qrcode?.pairingCode || null;
  const code = connection?.code || connection?.qrcode?.code || null;
  const state = connection?.instance?.state || connection?.connectionStatus || null;
  return { base64, pairingCode, code, state };
}

function updateConnectionModalView(instanceName, data) {
  const { base64, pairingCode, state } = parseQrResponse(data);

  if (state === 'open') {
    elements.connectCopy.textContent = `A instância "${instanceName}" já está conectada ao WhatsApp!`;
    elements.connectQr.hidden = true;
    elements.connectPairingCode.hidden = true;
    elements.connectLoading.hidden = true;
    if (connectPollTimer) {
      clearInterval(connectPollTimer);
      connectPollTimer = null;
    }
    loadInstances();
    if (currentInstance === instanceName) {
      openInstance(instanceName, false);
    }
    return;
  }

  if (base64) {
    elements.connectCopy.textContent = `Aponte a câmera do WhatsApp para escanear o QR Code de "${instanceName}".`;
    elements.connectQr.src = base64;
    elements.connectQr.hidden = false;
    elements.connectPairingCode.hidden = true;
    elements.connectLoading.hidden = true;
  } else if (pairingCode) {
    elements.connectCopy.textContent = `Insira este código de emparelhamento no WhatsApp para conectar "${instanceName}".`;
    elements.connectPairingCode.textContent = pairingCode;
    elements.connectPairingCode.hidden = false;
    elements.connectQr.hidden = true;
    elements.connectLoading.hidden = true;
  } else {
    elements.connectCopy.textContent = `Gerando QR Code para "${instanceName}"... Aguarde um instante.`;
    elements.connectQr.hidden = true;
    elements.connectPairingCode.hidden = true;
    elements.connectLoading.hidden = false;
  }
}

async function fetchQrCode(instanceName) {
  try {
    const result = await request(`/instances/${encodeURIComponent(instanceName)}/connect`, {
      headers: { 'X-Manager-CSRF': csrfToken },
      method: 'POST',
    });
    updateConnectionModalView(instanceName, result);
  } catch (error) {
    elements.connectCopy.textContent = `Erro ao obter QR Code: ${error.message}`;
    elements.connectLoading.hidden = true;
  }
}

function showConnectionDialog(instanceName, connection) {
  activeConnectingInstance = instanceName;
  if (connectPollTimer) {
    clearInterval(connectPollTimer);
    connectPollTimer = null;
  }

  elements.connectQr.hidden = true;
  elements.connectPairingCode.hidden = true;
  elements.connectQr.removeAttribute('src');
  elements.connectPairingCode.textContent = '';
  elements.connectLoading.hidden = false;

  updateConnectionModalView(instanceName, connection);

  const parsed = parseQrResponse(connection);
  if (!parsed.base64 && !parsed.pairingCode && parsed.state !== 'open') {
    fetchQrCode(instanceName);
  }

  connectPollTimer = setInterval(async () => {
    if (!elements.connectDialog.open) {
      clearInterval(connectPollTimer);
      connectPollTimer = null;
      return;
    }

    try {
      const stateResult = await request(`/instances/${encodeURIComponent(instanceName)}/state`);
      if (stateResult?.instance?.state === 'open') {
        updateConnectionModalView(instanceName, { state: 'open' });
        return;
      }

      await fetchQrCode(instanceName);
    } catch {
      // transient poll error
    }
  }, 2500);

  if (!elements.connectDialog.open) {
    elements.connectDialog.showModal();
  }
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
  for (const field of ['host', 'port', 'protocol', 'username', 'password']) {
    elements.proxyForm.elements[field].required = enabled;
  }
  elements.proxyForm.elements.username.required = false;
  elements.proxyForm.elements.password.required = false;
}

function populateProxyForm(instanceName, proxy = {}) {
  proxy = proxy || {};
  elements.proxyEnabled.checked = proxy.enabled === true;
  elements.proxyForm.elements.host.value = proxy.host || '';
  elements.proxyForm.elements.port.value = proxy.port || '';
  elements.proxyForm.elements.protocol.value = proxy.protocol || 'http';
  elements.proxyUsername.value = '';
  elements.proxyPassword.value = '';
  elements.proxyForm.dataset.instanceName = instanceName;
  elements.proxyInstanceName.textContent = `Proxy routing for ${instanceName}.`;
  elements.proxyCredentialsNote.hidden = !proxy.hasCredentials;
  elements.proxyCredentialsNote.textContent = proxy.hasCredentials
    ? 'Credenciais protegidas já configuradas. Preencha usuário e senha somente para substituí-las.'
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
    instancesCache = instances;
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

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = toMessageDate(timestamp);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function toMessageDate(timestamp) {
  if (!timestamp) return new Date(NaN);
  if (typeof timestamp === 'object') {
    const seconds = timestamp.low ?? timestamp.seconds ?? timestamp.timestamp ?? timestamp.value;
    return typeof seconds === 'number' ? new Date(seconds * 1000) : new Date(NaN);
  }
  const numericTimestamp = Number(timestamp);
  if (!isNaN(numericTimestamp)) {
    return new Date(numericTimestamp < 1e11 ? numericTimestamp * 1000 : numericTimestamp);
  }
  return new Date(timestamp);
}

function extractMessageText(msg) {
  if (!msg) return '';
  if (typeof msg === 'string') {
    try {
      return extractMessageText(JSON.parse(msg));
    } catch {
      return msg;
    }
  }
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.extendedTextMessage?.caption) return msg.extendedTextMessage.caption;
  if (msg.ephemeralMessage?.message) return extractMessageText(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage?.message) return extractMessageText(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2?.message) return extractMessageText(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension?.message) return extractMessageText(msg.viewOnceMessageV2Extension.message);
  if (msg.imageMessage) return msg.imageMessage.caption ? `📷 ${msg.imageMessage.caption}` : '📷 Imagem';
  if (msg.videoMessage) return msg.videoMessage.caption ? `🎥 ${msg.videoMessage.caption}` : '🎥 Vídeo';
  if (msg.audioMessage) return '🎵 Áudio';
  if (msg.documentMessage) return `📄 ${msg.documentMessage.fileName || 'Documento'}`;
  if (msg.stickerMessage) return '🏷️ Figurinha';
  if (msg.contactMessage) return '👤 Contato';
  if (msg.locationMessage) return '📍 Localização';
  if (msg.buttonsResponseMessage?.selectedDisplayText) return msg.buttonsResponseMessage.selectedDisplayText;
  if (msg.listResponseMessage?.title) return msg.listResponseMessage.title;
  return 'Mensagem';
}

function getChatDisplayName(chat) {
  if (chat.pushName && chat.pushName.trim()) return chat.pushName.trim();
  const jid = chat.remoteJid || '';
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid')) {
    const digits = jid.replace(/@.*$/, '');
    if (digits.length >= 12) {
      return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, -4)}-${digits.slice(-4)}`;
    }
    return `+${digits}`;
  }
  if (jid.endsWith('@g.us')) {
    return chat.name || `Grupo (${jid.slice(0, 15)}...)`;
  }
  return jid || 'Conversa';
}

function renderChatList(chats) {
  const query = (elements.chatSearchInput.value || '').toLowerCase().trim();
  const byKind = chats.filter((chat) => {
    if (chatFilter === 'groups') return chat.remoteJid?.endsWith('@g.us');
    return !chat.remoteJid?.endsWith('@g.us');
  });
  const filtered = query
    ? byKind.filter((c) => {
        const name = (c.pushName || '').toLowerCase();
        const jid = (c.remoteJid || '').toLowerCase();
        const snippet = extractMessageText(c.lastMessage?.message).toLowerCase();
        return name.includes(query) || jid.includes(query) || snippet.includes(query);
      })
    : byKind;

  if (!filtered.length) {
    elements.chatList.innerHTML = '<div class="chat-list-empty">Nenhuma conversa encontrada.</div>';
    return;
  }

  elements.chatList.innerHTML = filtered.map((chat) => {
    const name = getChatDisplayName(chat);
    const snippet = extractMessageText(chat.lastMessage?.message);
    const fromMe = chat.lastMessage?.key?.fromMe === true;
    const time = formatTime(chat.lastMessage?.messageTimestamp || chat.updatedAt);
    const isActive = chat.remoteJid === activeChatJid;
    const initials = (name || 'C').slice(0, 2).toUpperCase();
    const avatarHtml = chat.profilePicUrl
      ? `<img src="${escapeAttribute(chat.profilePicUrl)}" alt="${escapeAttribute(name)}" />`
      : escapeHtml(initials);

    return `
      <div class="chat-item ${isActive ? 'chat-item-active' : ''}" data-remote-jid="${escapeAttribute(chat.remoteJid)}">
        <div class="chat-item-avatar">${avatarHtml}</div>
        <div class="chat-item-body">
          <div class="chat-item-top">
            <h4 class="chat-item-name">${escapeHtml(name)}</h4>
            <span class="chat-item-time">${escapeHtml(time)}</span>
          </div>
          <div class="chat-item-preview">
            <p class="chat-item-msg">${fromMe ? '✓ ' : ''}${escapeHtml(snippet)}</p>
            ${Number(chat.unreadCount) > 0 ? `<span class="chat-item-badge">${chat.unreadCount}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

async function loadChats(instanceName) {
  if (!currentChats.length) {
    elements.chatList.innerHTML = '<div class="chat-list-empty">Carregando conversas…</div>';
  }
  try {
    const { chats } = await request(`/instances/${encodeURIComponent(instanceName)}/chats`);
    currentChats = (Array.isArray(chats) ? chats : []).sort((a, b) => {
      const aTimestamp = toMessageDate(a.lastMessage?.messageTimestamp || a.updatedAt).getTime();
      const bTimestamp = toMessageDate(b.lastMessage?.messageTimestamp || b.updatedAt).getTime();
      return bTimestamp - aTimestamp;
    });
    renderChatList(currentChats);
  } catch (error) {
    elements.chatList.innerHTML = `<div class="chat-list-empty" style="color:var(--danger)">Erro ao carregar conversas: ${escapeHtml(error.message)}</div>`;
  }
}

function renderMessages(messages) {
  if (!messages || !messages.length) {
    elements.chatMessages.innerHTML = '<div class="chat-list-empty">Nenhuma mensagem neste chat ainda.</div>';
    return;
  }

  const sorted = [...messages].sort((a, b) => {
    const ta = toMessageDate(a.messageTimestamp).getTime();
    const tb = toMessageDate(b.messageTimestamp).getTime();
    return ta - tb;
  });

  let lastDateKey = '';
  elements.chatMessages.innerHTML = sorted.map((msg) => {
    const fromMe = msg.key?.fromMe === true;
    const text = extractMessageText(msg.message);
    const time = formatTime(msg.messageTimestamp);
    const sender = fromMe ? 'Você' : (msg.pushName || elements.activeChatName.textContent);
    const date = toMessageDate(msg.messageTimestamp);
    const dateKey = !isNaN(date.getTime()) ? date.toDateString() : '';
    const dateSeparator = dateKey && dateKey !== lastDateKey
      ? `<div class="message-date-separator">${escapeHtml(date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))}</div>`
      : '';
    lastDateKey = dateKey;

    return `
      ${dateSeparator}
      <div class="message-bubble ${fromMe ? 'message-out' : 'message-in'}">
        <span class="message-sender">${escapeHtml(sender)}</span>
        <p class="message-text">${escapeHtml(text)}</p>
        <div class="message-footer">
          <span class="message-time">${escapeHtml(time)}</span>
        </div>
      </div>`;
  }).join('');

  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function openChat(remoteJid) {
  const loadId = ++activeChatLoadId;
  activeChatJid = remoteJid;
  const chat = currentChats.find((c) => c.remoteJid === remoteJid) || { remoteJid };
  const name = getChatDisplayName(chat);

  for (const item of elements.chatList.querySelectorAll('.chat-item')) {
    item.classList.toggle('chat-item-active', item.dataset.remoteJid === remoteJid);
  }

  elements.activeChatName.textContent = name;
  elements.activeChatJid.textContent = remoteJid;
  const initials = (name || 'C').slice(0, 2).toUpperCase();
  if (chat.profilePicUrl) {
    elements.activeChatAvatar.innerHTML = `<img src="${escapeAttribute(chat.profilePicUrl)}" alt="${escapeAttribute(name)}" />`;
  } else {
    elements.activeChatAvatar.textContent = initials;
  }

  elements.chatEmptyView.hidden = true;
  elements.chatActiveView.hidden = false;

  elements.chatMessages.innerHTML = '<div class="chat-list-empty">Carregando mensagens…</div>';
  try {
    const { messages } = await request(`/instances/${encodeURIComponent(currentInstance)}/messages?remoteJid=${encodeURIComponent(remoteJid)}`);
    if (loadId !== activeChatLoadId || remoteJid !== activeChatJid) return;
    renderMessages(messages || []);
  } catch (error) {
    if (loadId !== activeChatLoadId || remoteJid !== activeChatJid) return;
    elements.chatMessages.innerHTML = `<div class="chat-list-empty" style="color:var(--danger)">Erro ao carregar mensagens: ${escapeHtml(error.message)}</div>`;
  }

  elements.chatMessageInput.focus();
}

async function sendCurrentChatMessage() {
  const text = elements.chatMessageInput.value.trim();
  if (!text || !activeChatJid || !currentInstance) return;

  const recipient = activeChatJid;
  elements.chatSendBtn.disabled = true;
  elements.chatSendBtn.textContent = 'Enviando…';

  try {
    await request(`/instances/${encodeURIComponent(currentInstance)}/messages/send-text`, {
      body: JSON.stringify({ number: recipient, text }),
      headers: { 'X-Manager-CSRF': csrfToken },
      method: 'POST',
    });

    elements.chatMessageInput.value = '';

    const now = Math.floor(Date.now() / 1000);
    const newBubble = document.createElement('div');
    newBubble.className = 'message-bubble message-out';
    newBubble.innerHTML = `
      <span class="message-sender">Você</span>
      <p class="message-text">${escapeHtml(text)}</p>
      <div class="message-footer">
        <span class="message-time">${escapeHtml(formatTime(now))}</span>
      </div>`;
    elements.chatMessages.appendChild(newBubble);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    const chat = currentChats.find((c) => c.remoteJid === activeChatJid);
    if (chat) {
      chat.lastMessage = {
        key: { fromMe: true, remoteJid: activeChatJid },
        message: { conversation: text },
        messageTimestamp: now,
      };
      chat.updatedAt = new Date().toISOString();
      renderChatList(currentChats);
    }
  } catch (error) {
    alert(`Erro ao enviar mensagem: ${error.message}`);
  } finally {
    elements.chatSendBtn.disabled = false;
    elements.chatSendBtn.textContent = 'Enviar';
    elements.chatMessageInput.focus();
  }
}

async function openInstance(instanceName, updateHash = true) {
  if (!instanceName) return;
  currentInstance = instanceName;
  if (updateHash) {
    window.location.hash = `#instance/${encodeURIComponent(instanceName)}`;
  }

  elements.instancesWorkspace.hidden = true;
  elements.instanceWorkspace.hidden = false;

  let instance = instancesCache.find((i) => i.name === instanceName);
  if (!instance) {
    try {
      const { instances } = await request('/instances');
      instancesCache = instances;
      instance = instancesCache.find((i) => i.name === instanceName);
    } catch {
      // fallback
    }
  }

  const instData = instance || { connectionStatus: 'open', name: instanceName };
  const state = instData.connectionStatus || 'unknown';
  const stateLabel = state === 'open' ? 'Conectado' : state === 'connecting' ? 'Conectando' : 'Desconectado';

  elements.instanceOpenState.className = `state state-${state}`;
  elements.instanceOpenState.textContent = stateLabel;

  elements.instanceHeroIntegration.textContent = instData.integration || 'WHATSAPP-BAILEYS';
  elements.instanceHeroTitle.textContent = instData.name;

  const infoParts = [];
  if (instData.number) infoParts.push(`Telefone: ${instData.number}`);
  if (instData.ownerJid) infoParts.push(`JID: ${instData.ownerJid}`);
  elements.instanceHeroInfo.textContent =
    infoParts.join(' • ') || 'Gerenciamento operacional e mensagens em tempo real.';

  if (instData.profilePicUrl) {
    elements.instanceHeroAvatar.innerHTML = `<img src="${escapeAttribute(instData.profilePicUrl)}" alt="${escapeAttribute(instData.name)}" />`;
  } else {
    elements.instanceHeroAvatar.textContent = (instData.name || 'W').slice(0, 2).toUpperCase();
  }

  const heroButtons = elements.instanceWorkspace.querySelectorAll('.instance-hero-actions [data-action]');
  for (const btn of heroButtons) {
    btn.dataset.instance = instData.name;
  }

  activeChatJid = null;
  elements.chatActiveView.hidden = true;
  elements.chatEmptyView.hidden = false;
  elements.chatSearchInput.value = '';

  await loadChats(instanceName);
  if (chatRefreshTimer) clearInterval(chatRefreshTimer);
  chatRefreshTimer = setInterval(() => {
    if (currentInstance === instanceName && !document.hidden) {
      loadChats(instanceName);
    }
  }, 15000);
}

function showInstancesList(updateHash = true) {
  currentInstance = null;
  if (chatRefreshTimer) {
    clearInterval(chatRefreshTimer);
    chatRefreshTimer = null;
  }
  elements.instanceWorkspace.hidden = true;
  elements.instancesWorkspace.hidden = false;
  if (updateHash) {
    window.location.hash = '#instances';
  }
}

function handleRoute() {
  const hash = window.location.hash || '';
  const match = hash.match(/^#instance\/([^/?#]+)/);
  if (match) {
    const instanceName = decodeURIComponent(match[1]);
    openInstance(instanceName, false);
  } else {
    showInstancesList(false);
  }
}

async function initializeSession() {
  const session = await request('/session');
  csrfToken = session.csrfToken;
  showDashboard();
  await loadInstances();
  handleRoute();
}

async function handleInstanceAction(button) {
  const instanceName = button.dataset.instance;
  const action = button.dataset.action;
  const originalLabel = button.textContent;

  if (action === 'open') {
    await openInstance(instanceName);
    return;
  }

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
    if (currentInstance && action === 'delete' && instanceName === currentInstance) {
      showInstancesList();
    } else if (currentInstance && instanceName === currentInstance) {
      await openInstance(currentInstance, false);
    }
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
    password: String(formData.get('password') || '').trim(),
    port: String(formData.get('port') || '').trim(),
    protocol: String(formData.get('protocol') || '').trim(),
    username: String(formData.get('username') || '').trim(),
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
elements.instanceWorkspace.querySelector('.instance-hero-actions').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) handleInstanceAction(button);
});
elements.backToInstancesBtn.addEventListener('click', () => {
  showInstancesList();
});
elements.chatSearchInput.addEventListener('input', () => {
  renderChatList(currentChats);
});
function setChatFilter(filter) {
  chatFilter = filter;
  const isContacts = filter === 'contacts';
  elements.chatContactsFilter.classList.toggle('chat-filter-tab-active', isContacts);
  elements.chatContactsFilter.setAttribute('aria-selected', String(isContacts));
  elements.chatGroupsFilter.classList.toggle('chat-filter-tab-active', !isContacts);
  elements.chatGroupsFilter.setAttribute('aria-selected', String(!isContacts));
  renderChatList(currentChats);
}
elements.chatContactsFilter.addEventListener('click', () => setChatFilter('contacts'));
elements.chatGroupsFilter.addEventListener('click', () => setChatFilter('groups'));
elements.chatRefreshBtn.addEventListener('click', () => {
  if (currentInstance) {
    loadChats(currentInstance);
    if (activeChatJid) {
      openChat(activeChatJid);
    }
  }
});
elements.chatList.addEventListener('click', (event) => {
  const item = event.target.closest('.chat-item');
  if (item && item.dataset.remoteJid) {
    openChat(item.dataset.remoteJid);
  }
});
elements.chatComposerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendCurrentChatMessage();
});
elements.chatMessageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendCurrentChatMessage();
  }
});
elements.connectDialog.addEventListener('close', () => {
  if (connectPollTimer) {
    clearInterval(connectPollTimer);
    connectPollTimer = null;
  }
  activeConnectingInstance = null;
  elements.connectQr.removeAttribute('src');
  elements.connectQr.hidden = true;
  elements.connectPairingCode.hidden = true;
  elements.connectLoading.hidden = true;
});
elements.connectRefreshBtn.addEventListener('click', () => {
  if (activeConnectingInstance) {
    elements.connectLoading.hidden = false;
    fetchQrCode(activeConnectingInstance);
  }
});
window.addEventListener('hashchange', handleRoute);
elements.logoutButton.addEventListener('click', async () => {
  await request('/session', { method: 'DELETE' }).catch(() => undefined);
  showLogin();
});

initializeSession().catch(() => showLogin());
