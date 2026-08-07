const { readTickets, writeTickets, readUsers } = require('./db');

const FIRST_RESPONSE_SLA_HOURS = 2; // 2 horas para primeira resposta
const UPDATE_SLA_HOURS = 20;        // 20 horas para atualizações

const VALID_EQUIPMENT = ['Notebook', 'Mouse', 'Cabo', 'Rede', 'Drivers'];
const VALID_TICKET_TYPES = ['Help Desk', 'ADM Serviço', 'Backup', 'Outros'];

function calculateSLAStatus(ticket) {
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);

  const responses = ticket.responses || [];
  const hasResponse = responses.length > 0;

  // Calculo de SLA de Primeira Resposta (2 horas)
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
  const firstResponseOverdue = !hasResponse && hoursSinceCreation > FIRST_RESPONSE_SLA_HOURS;

  // Calculo de SLA de Atualização (20 horas)
  const lastUpdate = hasResponse 
    ? new Date(responses[responses.length - 1].createdAt) 
    : createdAt;
  const hoursSinceLastUpdate = (now - lastUpdate) / (1000 * 60 * 60);
  
  const isOpen = ticket.status === 'Aberto' || ticket.status === 'Em Andamento';
  const updateOverdue = isOpen && hoursSinceLastUpdate > UPDATE_SLA_HOURS;

  const isOverdue = firstResponseOverdue || updateOverdue;

  return {
    ...ticket,
    firstResponseOverdue,
    updateOverdue,
    isOverdue,
    hoursSinceCreation: Math.round(hoursSinceCreation * 10) / 10,
    hoursSinceLastUpdate: Math.round(hoursSinceLastUpdate * 10) / 10
  };
}

function sanitizeTicketForUser(ticket, role) {
  const processed = calculateSLAStatus(ticket);
  if (role !== 'admin') {
    // Esconder administrador responsável para usuários comuns
    delete processed.assignedAdminId;
    delete processed.assignedAdminName;
  }
  return processed;
}

function getTickets(user) {
  const tickets = readTickets();
  let userTickets = tickets;

  if (user.role !== 'admin') {
    userTickets = tickets.filter(t => t.userId === user.id);
  }

  return userTickets.map(t => sanitizeTicketForUser(t, user.role));
}

function getTicketById(id, user) {
  const tickets = readTickets();
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return null;

  if (user.role !== 'admin' && ticket.userId !== user.id) {
    return null; // Acesso negado
  }

  return sanitizeTicketForUser(ticket, user.role);
}

function createTicket(user, data) {
  const { title, description, equipmentType, machineNumber } = data;

  if (!title || !description || !equipmentType || !machineNumber) {
    throw new Error('Todos os campos obrigatórios devem ser preenchidos.');
  }

  if (!VALID_EQUIPMENT.includes(equipmentType)) {
    throw new Error('Tipo de equipamento inválido.');
  }

  const tickets = readTickets();
  const now = new Date().toISOString();

  const newTicket = {
    id: 'tkt_' + Date.now(),
    userId: user.id,
    userName: user.name,
    title: title.trim(),
    description: description.trim(),
    equipmentType,
    machineNumber: machineNumber.trim(),
    ticketType: 'Help Desk', // Padrão inicial
    assignedAdminId: null,
    assignedAdminName: null,
    status: 'Aberto',
    createdAt: now,
    updatedAt: now,
    responses: []
  };

  tickets.unshift(newTicket);
  writeTickets(tickets);

  return sanitizeTicketForUser(newTicket, user.role);
}

function classifyTicket(ticketId, ticketType, adminUser) {
  if (adminUser.role !== 'admin') {
    throw new Error('Apenas administradores podem classificar o tipo do chamado.');
  }

  if (!VALID_TICKET_TYPES.includes(ticketType)) {
    throw new Error('Tipo de chamado inválido.');
  }

  const tickets = readTickets();
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);
  if (ticketIndex === -1) {
    throw new Error('Chamado não encontrado.');
  }

  tickets[ticketIndex].ticketType = ticketType;
  tickets[ticketIndex].updatedAt = new Date().toISOString();

  writeTickets(tickets);
  return sanitizeTicketForUser(tickets[ticketIndex], adminUser.role);
}

function assignTicket(ticketId, assignedAdminId, adminUser) {
  if (adminUser.role !== 'admin') {
    throw new Error('Apenas administradores podem atribuir responsáveis.');
  }

  const users = readUsers();
  const targetAdmin = users.find(u => u.id === assignedAdminId && u.role === 'admin');

  const tickets = readTickets();
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);
  if (ticketIndex === -1) {
    throw new Error('Chamado não encontrado.');
  }

  tickets[ticketIndex].assignedAdminId = targetAdmin ? targetAdmin.id : null;
  tickets[ticketIndex].assignedAdminName = targetAdmin ? targetAdmin.name : null;
  tickets[ticketIndex].updatedAt = new Date().toISOString();

  writeTickets(tickets);
  return sanitizeTicketForUser(tickets[ticketIndex], adminUser.role);
}

function addResponse(ticketId, message, newStatus, adminUser) {
  if (adminUser.role !== 'admin') {
    throw new Error('Apenas administradores podem responder aos chamados.');
  }

  if (!message || !message.trim()) {
    throw new Error('A resposta não pode ser vazia.');
  }

  const tickets = readTickets();
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);
  if (ticketIndex === -1) {
    throw new Error('Chamado não encontrado.');
  }

  const ticket = tickets[ticketIndex];
  const now = new Date().toISOString();

  const responseObj = {
    id: 'rsp_' + Date.now(),
    authorId: adminUser.id,
    authorName: adminUser.name,
    message: message.trim(),
    createdAt: now
  };

  ticket.responses.push(responseObj);
  ticket.updatedAt = now;

  // Se o chamado ainda não tinha admin atribuído, atribui a quem respondeu
  if (!ticket.assignedAdminId) {
    ticket.assignedAdminId = adminUser.id;
    ticket.assignedAdminName = adminUser.name;
  }

  if (newStatus && ['Aberto', 'Em Andamento', 'Resolvido', 'Fechado'].includes(newStatus)) {
    ticket.status = newStatus;
  } else if (ticket.status === 'Aberto') {
    ticket.status = 'Em Andamento';
  }

  writeTickets(tickets);
  return sanitizeTicketForUser(ticket, adminUser.role);
}

function getAdminPageData(adminUser) {
  if (adminUser.role !== 'admin') {
    throw new Error('Acesso restrito a administradores.');
  }

  const users = readUsers();
  const tickets = readTickets().map(t => calculateSLAStatus(t));

  const admins = users.filter(u => u.role === 'admin');

  // Quantidade de chamados sob responsabilidade de cada admin
  const adminWorkload = admins.map(admin => {
    const assignedTickets = tickets.filter(t => t.assignedAdminId === admin.id && (t.status === 'Aberto' || t.status === 'Em Andamento'));
    const totalAssignedAll = tickets.filter(t => t.assignedAdminId === admin.id);
    return {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      activeTicketCount: assignedTickets.length,
      totalTicketCount: totalAssignedAll.length
    };
  });

  // Agrupamento de chamados abertos por dia para o gráfico
  const dailyCounts = {};
  
  // Pegar últimos 7 dias para garantir ordenação e continuidade
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyCounts[dateStr] = 0;
  }

  tickets.forEach(t => {
    const dateStr = t.createdAt.split('T')[0];
    if (dailyCounts[dateStr] !== undefined) {
      dailyCounts[dateStr]++;
    } else {
      dailyCounts[dateStr] = 1;
    }
  });

  const chartData = Object.keys(dailyCounts)
    .sort()
    .map(date => ({
      date,
      displayDate: date.split('-').reverse().slice(0, 2).join('/'), // DD/MM
      count: dailyCounts[date]
    }));

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'Aberto' || t.status === 'Em Andamento').length;
  const overdueTickets = tickets.filter(t => t.isOverdue).length;

  return {
    admins: adminWorkload,
    chartData,
    summary: {
      totalTickets,
      openTickets,
      overdueTickets
    }
  };
}

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  classifyTicket,
  assignTicket,
  addResponse,
  getAdminPageData,
  VALID_EQUIPMENT,
  VALID_TICKET_TYPES
};
