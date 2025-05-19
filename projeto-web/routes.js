const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Inicializa o roteador Express
const router = express.Router();
// Caminho para o arquivo de banco de dados
const dbPath = path.join(__dirname, '/database.json');

// Função para ler o banco de dados
async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler DB:', error);
    return { users: [], financialData: [], savings: [], reports: [], definitions: [], queries: [] };
  }
}

// Função para escrever no banco de dados
async function writeDB(data) {
  try {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
    console.log('DB atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao escrever DB:', error);
    throw error;
  }
}

// Rota para obter informações do administrador
router.get('/admin/:userId', async (req, res) => {
  const db = await readDB();
  const user = db.users.find(u => u.id === req.params.userId && u.isAdmin);
  if (!user) {
    return res.status(404).json({ error: 'Administrador não encontrado' });
  }
  res.json({ username: user.username });
});

// Rota de login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.log('Tentativa de login sem email ou senha');
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  const db = await readDB();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    console.log(`Tentativa de login falhou: email=${email}`);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  console.log(`Login bem-sucedido: userId=${user.id}, username=${user.username}`);
  res.json({ message: 'Login bem-sucedido', userId: user.id, username: user.username, isAdmin: user.isAdmin });
});

// Rota de registro
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    console.log('Tentativa de registro sem campos obrigatórios');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  const db = await readDB();
  if (db.users.find(u => u.email === email)) {
    console.log(`Tentativa de registro com email existente: ${email}`);
    return res.status(400).json({ error: 'Email já registrado' });
  }
  const user = {
    id: uuidv4(),
    username,
    email,
    password,
    isAdmin: false
  };
  db.users.push(user);
  await writeDB(db);
  console.log(`Usuário registrado: userId=${user.id}, username=${user.username}, email=${user.email}`);
  res.json({ message: 'Usuário registrado', userId: user.id, username: user.username, isAdmin: user.isAdmin });
});

// Adiciona um novo administrador
router.post('/admin', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  const db = await readDB();
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email já registrado' });
  }
  const user = {
    id: uuidv4(),
    username,
    email,
    password,
    isAdmin: true
  };
  db.users.push(user);
  await writeDB(db);
  res.json({ message: 'Administrador adicionado', userId: user.id, username: user.username });
});

// Edita um administrador
router.put('/admin/:id', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }
  const db = await readDB();
  const user = db.users.find(u => u.id === req.params.id && u.isAdmin);
  if (!user) {
    return res.status(404).json({ error: 'Administrador não encontrado' });
  }
  if (db.users.find(u => u.email === email && u.id !== req.params.id)) {
    return res.status(400).json({ error: 'Email já registrado' });
  }
  user.username = username;
  user.email = email;
  if (password) user.password = password;
  await writeDB(db);
  res.json({ message: 'Administrador atualizado' });
});

// Exclui um administrador
router.delete('/admin/:id', async (req, res) => {
  const db = await readDB();
  const initialLength = db.users.length;
  db.users = db.users.filter(u => u.id !== req.params.id || !u.isAdmin);
  if (db.users.length === initialLength) {
    return res.status(404).json({ error: 'Administrador não encontrado' });
  }
  await writeDB(db);
  res.json({ message: 'Administrador excluído' });
});

// Lista todos os usuários
router.get('/users', async (req, res) => {
  const db = await readDB();
  res.json(db.users.map(u => ({ id: u.id, username: u.username, email: u.email, isAdmin: u.isAdmin })));
});

// Alterna status de admin
router.put('/users/:id/toggle-admin', async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (user) {
      user.isAdmin = !user.isAdmin;
      await writeDB(db);
      res.status(200).json({ message: 'Status de admin alterado', isAdmin: user.isAdmin });
    } else {
      res.status(404).json({ error: 'Usuário não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
});

// Exclui usuário
router.delete('/users/:id', async (req, res) => {
  try {
    const db = await readDB();
    db.users = db.users.filter(u => u.id !== req.params.id);
    await writeDB(db);
    res.status(200).json({ message: 'Usuário excluído' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Salva dados financeiros
router.post('/financial-data', async (req, res) => {
  try {
    const db = await readDB();
    const userId = req.body.userId;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });
    const data = {
      userId,
      income: {
        salary: parseFloat(req.body.income.salary) || 0,
        otherSources: parseFloat(req.body.income.otherSources) || 0,
        otherSourceType: req.body.income.otherSourceType || 'Nenhuma'
      },
      fixedExpenses: {
        housing: parseFloat(req.body.fixedExpenses.housing) || 0,
        food: parseFloat(req.body.fixedExpenses.food) || 0,
        transport: parseFloat(req.body.fixedExpenses.transport) || 0,
        education: parseFloat(req.body.fixedExpenses.education) || 0,
        health: parseFloat(req.body.fixedExpenses.health) || 0
      },
      variableExpenses: {
        leisure: parseFloat(req.body.variableExpenses.leisure) || 0,
        nonEssential: parseFloat(req.body.variableExpenses.nonEssential) || 0,
        subscriptions: parseFloat(req.body.variableExpenses.subscriptions) || 0,
        emergencies: parseFloat(req.body.variableExpenses.emergencies) || 0
      }
    };
    db.financialData = db.financialData || [];
    const existing = db.financialData.find(f => f.userId === userId);
    if (existing) {
      Object.assign(existing, data);
    } else {
      db.financialData.push(data);
    }
    await writeDB(db);
    res.status(200).json({ message: 'Dados financeiros salvos', data });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// Obtém dados financeiros de um usuário
router.get('/financial-data/:userId', async (req, res) => {
  const db = await readDB();
  const data = db.financialData.find(f => f.userId === req.params.userId);
  res.json(data || {});
});

// Atualiza dados financeiros
router.put('/financial-data/:userId', async (req, res) => {
  try {
    const db = await readDB();
    const userId = req.params.userId;
    const data = db.financialData.find(f => f.userId === userId);
    if (!data) return res.status(404).json({ error: 'Dados não encontrados' });
    const updatedData = {
      userId,
      income: {
        salary: parseFloat(req.body.income.salary) || 0,
        otherSources: parseFloat(req.body.income.otherSources) || 0,
        otherSourceType: req.body.income.otherSourceType || 'Nenhuma'
      },
      fixedExpenses: {
        housing: parseFloat(req.body.fixedExpenses.housing) || 0,
        food: parseFloat(req.body.fixedExpenses.food) || 0,
        transport: parseFloat(req.body.fixedExpenses.transport) || 0,
        education: parseFloat(req.body.fixedExpenses.education) || 0,
        health: parseFloat(req.body.fixedExpenses.health) || 0
      },
      variableExpenses: {
        leisure: parseFloat(req.body.variableExpenses.leisure) || 0,
        nonEssential: parseFloat(req.body.variableExpenses.nonEssential) || 0,
        subscriptions: parseFloat(req.body.variableExpenses.subscriptions) || 0,
        emergencies: parseFloat(req.body.variableExpenses.emergencies) || 0
      }
    };
    Object.assign(data, updatedData);
    await writeDB(db);
    res.status(200).json({ message: 'Dados financeiros atualizados', data: updatedData });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar dados' });
  }
});

// Exclui dados financeiros
router.delete('/financial-data/:userId', async (req, res) => {
  try {
    const db = await readDB();
    db.financialData = db.financialData.filter(f => f.userId !== req.params.userId);
    await writeDB(db);
    res.status(200).json({ message: 'Dados financeiros excluídos' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir dados' });
  }
});

// Lista todos os dados financeiros
router.get('/all-financial-data', async (req, res) => {
  const db = await readDB();
  res.json(db.financialData || []);
});

// Obtém poupanças de um usuário
router.get('/savings/:userId', async (req, res) => {
  const db = await readDB();
  const data = db.savings.filter(s => s.userId === req.params.userId);
  res.json(data || []);
});

// Salva uma nova poupança
router.post('/savings', async (req, res) => {
  try {
    const db = await readDB();
    const userId = req.body.userId;
    const amount = parseFloat(req.body.amount);
    const months = parseInt(req.body.months);
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });
    if (isNaN(amount) || isNaN(months) || amount < 0 || months <= 0) {
      return res.status(400).json({ error: 'Valores de poupança inválidos' });
    }
    const data = {
      id: uuidv4(),
      userId,
      amount,
      months,
      total: amount * months
    };
    db.savings = db.savings || [];
    db.savings.push(data);
    await writeDB(db);
    res.status(200).json({ message: 'Poupança salva', data });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar poupança' });
  }
});

// Atualiza uma poupança existente
router.put('/savings/:id', async (req, res) => {
  try {
    const db = await readDB();
    const saving = db.savings.find(s => s.id === req.params.id);
    if (!saving) return res.status(404).json({ error: 'Poupança não encontrada' });
    const amount = parseFloat(req.body.amount);
    const months = parseInt(req.body.months);
    if (isNaN(amount) || isNaN(months) || amount < 0 || months <= 0) {
      return res.status(400).json({ error: 'Valores de poupança inválidos' });
    }
    saving.amount = amount;
    saving.months = months;
    saving.total = amount * months;
    await writeDB(db);
    res.status(200).json({ message: 'Poupança atualizada', data: saving });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar poupança' });
  }
});

// Exclui uma poupança
router.delete('/savings/:id', async (req, res) => {
  try {
    const db = await readDB();
    const initialLength = db.savings.length;
    db.savings = db.savings.filter(s => s.id !== req.params.id);
    if (db.savings.length === initialLength) {
      return res.status(404).json({ error: 'Poupança não encontrada' });
    }
    await writeDB(db);
    res.status(200).json({ message: 'Poupança excluída' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir poupança' });
  }
});

// Obtém relatórios de um usuário
router.get('/reports/:userId', async (req, res) => {
  const db = await readDB();
  const reports = db.reports.filter(r => r.userId === req.params.userId);
  res.json(reports || []);
});

// Lista todos os relatórios
router.get('/all-reports', async (req, res) => {
  const db = await readDB();
  res.json(db.reports || []);
});

// Salva um novo relatório
router.post('/reports', async (req, res) => {
  try {
    const db = await readDB();
    const userId = req.body.userId;
    const goal = req.body.goal?.trim();
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });
    if (!goal) return res.status(400).json({ error: 'Objetivo inválido' });
    const data = {
      id: uuidv4(),
      userId,
      goal,
      createdAt: new Date().toISOString()
    };
    db.reports = db.reports || [];
    db.reports.push(data);
    await writeDB(db);
    res.status(200).json({ message: 'Objetivo salvo', data });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar objetivo' });
  }
});

// Salva uma nova dúvida
router.post('/queries', async (req, res) => {
  try {
    const db = await readDB();
    const query = req.body.query?.trim();
    if (!query) return res.status(400).json({ error: 'Dúvida inválida' });
    const data = {
      id: uuidv4(),
      userId: req.body.userId || 'anonymous',
      query,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    db.queries = db.queries || [];
    db.queries.push(data);
    await writeDB(db);
    res.status(200).json({ message: 'Dúvida enviada', data });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar dúvida' });
  }
});

// Lista todas as dúvidas
router.get('/queries', async (req, res) => {
  const db = await readDB();
  res.json(db.queries || []);
});

// Atualiza uma dúvida
router.put('/queries/:id', async (req, res) => {
  try {
    const db = await readDB();
    const query = db.queries.find(q => q.id === req.params.id);
    if (!query) return res.status(404).json({ error: 'Dúvida não encontrada' });
    query.status = req.body.status || query.status;
    query.response = req.body.response?.trim() || query.response;
    await writeDB(db);
    res.status(200).json({ message: 'Dúvida atualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar dúvida' });
  }
});

// Lista todas as definições financeiras
router.get('/definitions', async (req, res) => {
  const db = await readDB();
  res.json(db.definitions || []);
});

// Salva uma nova definição financeira
router.post('/definitions', async (req, res) => {
  try {
    const db = await readDB();
    const term = req.body.term?.trim();
    const definition = req.body.definition?.trim();
    if (!term || !definition) return res.status(400).json({ error: 'Termo ou definição inválidos' });
    const data = {
      id: uuidv4(),
      term,
      definition
    };
    db.definitions = db.definitions || [];
    db.definitions.push(data);
    await writeDB(db);
    res.status(200).json({ message: 'Definição adicionada', data });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar definição' });
  }
});

// Atualiza uma definição financeira
router.put('/definitions/:id', async (req, res) => {
  try {
    const db = await readDB();
    const definition = db.definitions.find(d => d.id === req.params.id);
    if (!definition) return res.status(404).json({ error: 'Definição não encontrada' });
    const term = req.body.term?.trim();
    const newDefinition = req.body.definition?.trim();
    if (!term || !newDefinition) return res.status(400).json({ error: 'Termo ou definição inválidos' });
    definition.term = term;
    definition.definition = newDefinition;
    await writeDB(db);
    res.status(200).json({ message: 'Definição atualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar definição' });
  }
});

// Exclui uma definição financeira
router.delete('/definitions/:id', async (req, res) => {
  try {
    const db = await readDB();
    db.definitions = db.definitions.filter(d => d.id !== req.params.id);
    await writeDB(db);
    res.status(200).json({ message: 'Definição excluída' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir definição' });
  }
});

module.exports = router;