const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');

const SALT = 'bluepoint_salt_2026';

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, 'sha512').toString('hex');
}

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '[]');
    } catch (e) {
      users = [];
    }
  }

  const validRootHash = hashPassword('eve');
  let rootUser = users.find(u => u.username === 'root');

  if (!rootUser) {
    rootUser = {
      id: 'usr_root',
      username: 'root',
      passwordHash: validRootHash,
      name: 'Administrador Root',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    users.unshift(rootUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } else if (rootUser.passwordHash !== validRootHash) {
    rootUser.passwordHash = validRootHash;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  }

  // Garantir existência do tickets.json
  if (!fs.existsSync(TICKETS_FILE)) {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readUsers() {
  ensureDataDirectory();
  try {
    const content = fs.readFileSync(USERS_FILE, 'utf8');
    const users = JSON.parse(content || '[]');

    const validRootHash = hashPassword('eve');
    const rootUser = users.find(u => u.username === 'root');
    if (rootUser && rootUser.passwordHash !== validRootHash) {
      rootUser.passwordHash = validRootHash;
      try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
      } catch (e) {}
    }

    return users;
  } catch (err) {
    console.error('Erro ao ler users.json:', err);
    return [];
  }
}

function writeUsers(users) {
  ensureDataDirectory();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function readTickets() {
  ensureDataDirectory();
  try {
    const content = fs.readFileSync(TICKETS_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Erro ao ler tickets.json:', err);
    return [];
  }
}

function writeTickets(tickets) {
  ensureDataDirectory();
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');
}

module.exports = {
  hashPassword,
  readUsers,
  writeUsers,
  readTickets,
  writeTickets,
  ensureDataDirectory
};
