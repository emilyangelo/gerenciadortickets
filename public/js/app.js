/**
 * BLUEPOINT — APLICATIVO FRONTEND (JavaScript Puro)
 */

let currentUser = null;
let currentTickets = [];
let activeTicketId = null;

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuthSession();
});

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('bluepoint_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && endpoint !== '/api/login') {
        handleLogout();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      throw new Error(data.error || 'Erro na requisição.');
    }

    return data;
  } catch (err) {
    throw err;
  }
}

async function checkAuthSession() {
  const token = localStorage.getItem('bluepoint_token');
  if (!token) {
    showLoginScreen();
    return;
  }

  try {
    const data = await apiFetch('/api/me');
    currentUser = data.user;
    showAppScreen();
  } catch (err) {
    showLoginScreen();
  }
}

// ==========================================================================
// AUTENTICAÇÃO E LOGIN
// ==========================================================================
function showLoginScreen() {
  document.getElementById('loginView').style.display = 'flex';
  document.getElementById('appView').style.display = 'none';
  hideAlert('loginAlert');
}

function showAppScreen() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('appView').style.display = 'flex';

  // Exibir dados do usuário no header
  document.getElementById('userNameDisplay').textContent = currentUser.name;
  
  const roleDisplay = document.getElementById('userRoleDisplay');
  if (currentUser.role === 'admin') {
    roleDisplay.textContent = 'Administrador';
    roleDisplay.className = 'user-role-badge role-admin';
    document.getElementById('navAdmin').style.display = 'inline-flex';
    document.getElementById('thAdminResponsavel').style.display = 'table-cell';
  } else {
    roleDisplay.textContent = 'Usuário Comum';
    roleDisplay.className = 'user-role-badge role-user';
    document.getElementById('navAdmin').style.display = 'none';
    document.getElementById('thAdminResponsavel').style.display = 'none';
  }

  switchPage('tickets');
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const loginBtn = document.getElementById('loginBtn');

  hideAlert('loginAlert');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Autenticando...';

  try {
    const data = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    localStorage.setItem('bluepoint_token', data.token);
    currentUser = data.user;
    showAppScreen();
  } catch (err) {
    showAlert('loginAlert', err.message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar no Sistema';
  }
}

function handleLogout() {
  localStorage.removeItem('bluepoint_token');
  currentUser = null;
  showLoginScreen();
}

// ==========================================================================
// NAVEGAÇÃO DE PÁGINAS (PÁGINA 1 vs PÁGINA 2)
// ==========================================================================
function switchPage(pageName) {
  const pageTickets = document.getElementById('pageTickets');
  const pageAdmin = document.getElementById('pageAdmin');
  const navTickets = document.getElementById('navTickets');
  const navAdmin = document.getElementById('navAdmin');

  if (pageName === 'admin') {
    if (currentUser.role !== 'admin') {
      alert('Acesso negado. Apenas administradores possuem acesso a esta página.');
      return;
    }
    pageTickets.classList.remove('active');
    pageAdmin.classList.add('active');
    navTickets.classList.remove('active');
    navAdmin.classList.add('active');

    loadAdminPageData();
  } else {
    pageAdmin.classList.remove('active');
    pageTickets.classList.add('active');
    navAdmin.classList.remove('active');
    navTickets.classList.add('active');

    loadTickets();
  }
}

// ==========================================================================
// PÁGINA 1 — PAINEL DE CHAMADOS
// ==========================================================================
async function loadTickets() {
  try {
    const data = await apiFetch('/api/tickets');
    currentTickets = data.tickets;
    renderTicketsTable(currentTickets);
  } catch (err) {
    console.error('Erro ao carregar chamados:', err);
  }
}

function renderTicketsTable(tickets) {
  const tbody = document.getElementById('ticketsTableBody');
  tbody.innerHTML = '';

  if (!tickets || tickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Nenhum chamado encontrado.</p>
        </td>
      </tr>
    `;
    return;
  }

  tickets.forEach(ticket => {
    const tr = document.createElement('tr');
    
    // Formatação de Data
    const formattedDate = formatDate(ticket.createdAt);

    // Status Class
    const statusClass = getStatusClass(ticket.status);

    // SLA Badge
    let slaBadgeHTML = `<span class="badge badge-sla sla-ok">✓ No Prazo</span>`;
    if (ticket.firstResponseOverdue) {
      slaBadgeHTML = `<span class="badge badge-sla sla-overdue">⚠️ Atraso 1ª Resposta (>2h)</span>`;
    } else if (ticket.updateOverdue) {
      slaBadgeHTML = `<span class="badge badge-sla sla-warning">⚠️ Atraso Atualização (>20h)</span>`;
    }

    // Coluna Admin Responsável (visível apenas se o usuário for admin)
    const adminColHTML = currentUser.role === 'admin'
      ? `<td>${ticket.assignedAdminName || '<em style="color: var(--text-muted);">Não atribuído</em>'}</td>`
      : '';

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 12px;">${formattedDate}</td>
      <td style="font-weight: 600;">${escapeHTML(ticket.userName)}</td>
      <td style="font-weight: 600; color: var(--blue-900);">${escapeHTML(ticket.title)}</td>
      <td><span class="badge badge-equipment">${escapeHTML(ticket.equipmentType)}</span></td>
      <td><code>${escapeHTML(ticket.machineNumber)}</code></td>
      <td><span class="badge badge-type">${escapeHTML(ticket.ticketType)}</span></td>
      ${adminColHTML}
      <td><span class="badge badge-status ${statusClass}">${escapeHTML(ticket.status)}</span></td>
      <td>${slaBadgeHTML}</td>
      <td style="text-align: right;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="openTicketDetailsModal('${ticket.id}')">
          Ver Detalhes
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function filterTicketsTable() {
  const searchTerm = document.getElementById('ticketSearch').value.toLowerCase().trim();
  const selectedStatus = document.getElementById('ticketStatusFilter').value;
  const selectedEquipment = document.getElementById('ticketEquipmentFilter').value;

  const filtered = currentTickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      ticket.title.toLowerCase().includes(searchTerm) || 
      ticket.machineNumber.toLowerCase().includes(searchTerm) ||
      ticket.userName.toLowerCase().includes(searchTerm);

    const matchesStatus = !selectedStatus || ticket.status === selectedStatus;
    const matchesEquipment = !selectedEquipment || ticket.equipmentType === selectedEquipment;

    return matchesSearch && matchesStatus && matchesEquipment;
  });

  renderTicketsTable(filtered);
}

// ==========================================================================
// MODAL: CRIAR NOVO CHAMADO
// ==========================================================================
function openNewTicketModal() {
  document.getElementById('newTicketForm').reset();
  hideAlert('newTicketAlert');
  openModal('modalNewTicket');
}

async function handleCreateTicket(event) {
  event.preventDefault();
  hideAlert('newTicketAlert');

  const title = document.getElementById('newTicketTitle').value;
  const equipmentType = document.getElementById('newTicketEquipment').value;
  const machineNumber = document.getElementById('newTicketMachineNumber').value;
  const description = document.getElementById('newTicketDescription').value;

  try {
    await apiFetch('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ title, equipmentType, machineNumber, description })
    });

    closeModal('modalNewTicket');
    loadTickets();
  } catch (err) {
    showAlert('newTicketAlert', err.message, 'error');
  }
}

// ==========================================================================
// MODAL: DETALHES E RESPOSTA DO CHAMADO
// ==========================================================================
async function openTicketDetailsModal(ticketId) {
  activeTicketId = ticketId;
  hideAlert('detailAlert');

  try {
    const data = await apiFetch(`/api/tickets/${ticketId}`);
    const ticket = data.ticket;

    document.getElementById('detailTicketIdTitle').textContent = `Chamado #${ticket.id.replace('tkt_', '')}`;
    document.getElementById('detailTicketCreatedAt').textContent = `Aberto em ${formatDate(ticket.createdAt)}`;
    document.getElementById('detailTitle').textContent = ticket.title;
    document.getElementById('detailDescription').textContent = ticket.description;
    document.getElementById('detailUserName').textContent = ticket.userName;
    document.getElementById('detailEquipment').textContent = ticket.equipmentType;
    document.getElementById('detailMachineNumber').textContent = ticket.machineNumber;
    document.getElementById('detailTicketType').textContent = ticket.ticketType;

    const adminContainer = document.getElementById('detailAdminContainer');
    if (currentUser.role === 'admin') {
      adminContainer.style.display = 'block';
      document.getElementById('detailAssignedAdmin').textContent = ticket.assignedAdminName || 'Nenhum';
    } else {
      adminContainer.style.display = 'none';
    }

    // Configurações do Painel de Admin no Modal
    const adminActionSection = document.getElementById('adminActionSection');
    const replyFormSection = document.getElementById('replyFormSection');

    if (currentUser.role === 'admin') {
      adminActionSection.style.display = 'block';
      replyFormSection.style.display = 'block';

      document.getElementById('detailTicketTypeSelect').value = ticket.ticketType;
      document.getElementById('detailStatusSelect').value = ticket.status;

      // Carregar lista de administradores para atribuição
      await loadAdminsSelect(ticket.assignedAdminId);
    } else {
      adminActionSection.style.display = 'none';
      replyFormSection.style.display = 'none';
    }

    // Renderizar histórico de respostas
    renderTimelineResponses(ticket.responses || []);

    openModal('modalTicketDetails');
  } catch (err) {
    alert(err.message);
  }
}

async function loadAdminsSelect(currentAssignedId) {
  const select = document.getElementById('detailAssignAdminSelect');
  select.innerHTML = '<option value="">Sem responsável atribuído</option>';

  try {
    const data = await apiFetch('/api/users');
    const admins = data.users.filter(u => u.role === 'admin');

    admins.forEach(admin => {
      const opt = document.createElement('option');
      opt.value = admin.id;
      opt.textContent = `${admin.name} (@${admin.username})`;
      if (admin.id === currentAssignedId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar admins:', err);
  }
}

function renderTimelineResponses(responses) {
  const container = document.getElementById('responsesTimelineList');
  container.innerHTML = '';

  if (!responses || responses.length === 0) {
    container.innerHTML = `<p style="font-size: 13px; color: var(--text-muted); font-style: italic;">Nenhuma resposta registrada até o momento.</p>`;
    return;
  }

  responses.forEach(resp => {
    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.innerHTML = `
      <div class="timeline-meta">
        <span class="timeline-author">${escapeHTML(resp.authorName)}</span>
        <span>${formatDate(resp.createdAt)}</span>
      </div>
      <div class="timeline-text">${escapeHTML(resp.message)}</div>
    `;
    container.appendChild(div);
  });
}

async function handleUpdateTicketType() {
  if (!activeTicketId) return;
  const ticketType = document.getElementById('detailTicketTypeSelect').value;

  try {
    await apiFetch(`/api/tickets/${activeTicketId}/classify`, {
      method: 'PUT',
      body: JSON.stringify({ ticketType })
    });
    document.getElementById('detailTicketType').textContent = ticketType;
    loadTickets();
  } catch (err) {
    showAlert('detailAlert', err.message, 'error');
  }
}

async function handleAssignAdmin() {
  if (!activeTicketId) return;
  const assignedAdminId = document.getElementById('detailAssignAdminSelect').value;

  try {
    const data = await apiFetch(`/api/tickets/${activeTicketId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assignedAdminId })
    });
    document.getElementById('detailAssignedAdmin').textContent = data.ticket.assignedAdminName || 'Nenhum';
    loadTickets();
  } catch (err) {
    showAlert('detailAlert', err.message, 'error');
  }
}

async function handleSendResponse() {
  if (!activeTicketId) return;
  const message = document.getElementById('replyMessageText').value;
  const status = document.getElementById('detailStatusSelect').value;

  if (!message.trim()) {
    showAlert('detailAlert', 'Por favor, escreva uma mensagem antes de enviar.', 'error');
    return;
  }

  try {
    const data = await apiFetch(`/api/tickets/${activeTicketId}/response`, {
      method: 'POST',
      body: JSON.stringify({ message, status })
    });

    document.getElementById('replyMessageText').value = '';
    renderTimelineResponses(data.ticket.responses);
    showAlert('detailAlert', 'Resposta adicionada com sucesso!', 'success');
    loadTickets();
  } catch (err) {
    showAlert('detailAlert', err.message, 'error');
  }
}

// ==========================================================================
// PÁGINA 2 — PAINEL DE ADMINISTRADORES
// ==========================================================================
async function loadAdminPageData() {
  try {
    const data = await apiFetch('/api/admin/dashboard');

    // Métricas
    document.getElementById('statTotalTickets').textContent = data.summary.totalTickets;
    document.getElementById('statOpenTickets').textContent = data.summary.openTickets;
    document.getElementById('statOverdueTickets').textContent = data.summary.overdueTickets;

    // Renderizar Tabela de Admins
    renderAdminWorkloadTable(data.admins);

    // Renderizar Gráfico SVG
    if (window.renderDailyTicketsChart) {
      window.renderDailyTicketsChart('dailyTicketsChart', data.chartData);
    }
  } catch (err) {
    console.error('Erro ao carregar painel admin:', err);
  }
}

function renderAdminWorkloadTable(admins) {
  const tbody = document.getElementById('adminWorkloadTableBody');
  tbody.innerHTML = '';

  if (!admins || admins.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">Nenhum administrador encontrado.</td></tr>`;
    return;
  }

  admins.forEach(admin => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--blue-900);">${escapeHTML(admin.name)}</td>
      <td><code>@${escapeHTML(admin.username)}</code></td>
      <td>
        <span class="badge" style="background-color: var(--blue-100); color: var(--blue-800); font-size: 13px;">
          ${admin.activeTicketCount} chamado(s) ativo(s)
        </span>
      </td>
      <td style="color: var(--text-muted);">${admin.totalTicketCount} atribuído(s) no total</td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleCreateUser(event) {
  event.preventDefault();
  hideAlert('createUserAlert');

  const username = document.getElementById('newUsername').value;
  const name = document.getElementById('newFullName').value;
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserRole').value;

  try {
    const data = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, name, password, role })
    });

    showAlert('createUserAlert', data.message, 'success');
    document.getElementById('createUserForm').reset();
    loadAdminPageData();
  } catch (err) {
    showAlert('createUserAlert', err.message, 'error');
  }
}

// ==========================================================================
// FUNÇÕES UTILITÁRIAS
// ==========================================================================
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showAlert(id, text, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  el.className = `alert-message ${type === 'success' ? 'alert-success' : 'alert-error'}`;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusClass(status) {
  switch (status) {
    case 'Aberto': return 'status-aberto';
    case 'Em Andamento': return 'status-andamento';
    case 'Resolvido': return 'status-resolvido';
    case 'Fechado': return 'status-fechado';
    default: return 'status-aberto';
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
