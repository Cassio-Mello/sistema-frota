const app = document.getElementById('app');
const API_BASE = 'http://localhost:3001/api';
let currentUser = null;
let authToken = null;

// API helper functions
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Auth functions
async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  authToken = data.token;
  currentUser = data.user;
  localStorage.setItem('authToken', authToken);
  return data;
}

async function register(email, password, name) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name })
  });
  return data;
}

async function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  renderLogin();
}

async function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (!token) return false;

  try {
    authToken = token;
    const data = await apiRequest('/auth/profile');
    currentUser = data.user;
    return true;
  } catch (error) {
    localStorage.removeItem('authToken');
    return false;
  }
}

// Trip functions
async function getTrips() {
  return await apiRequest('/trips');
}

async function createTrip(tripData) {
  return await apiRequest('/trips', {
    method: 'POST',
    body: JSON.stringify(tripData)
  });
}

async function updateTrip(id, tripData) {
  return await apiRequest(`/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(tripData)
  });
}

async function deleteTrip(id) {
  return await apiRequest(`/trips/${id}`, {
    method: 'DELETE'
  });
}

// Expense functions
async function getExpenses(tripId) {
  return await apiRequest(`/expenses?trip_id=${tripId}`);
}

async function createFuelExpense(tripId, expenseData) {
  return await apiRequest(`/expenses/${tripId}/fuel`, {
    method: 'POST',
    body: JSON.stringify(expenseData)
  });
}

async function createOtherExpense(tripId, expenseData) {
  return await apiRequest(`/expenses/${tripId}/other`, {
    method: 'POST',
    body: JSON.stringify(expenseData)
  });
}

async function updateExpense(id, expenseData) {
  // Not yet implemented on backend; keep stub for later
  throw new Error('Update expense not supported yet');
}

async function deleteExpense(id) {
  return await apiRequest(`/expenses/${id}`, {
    method: 'DELETE'
  });
}

// Report functions
async function getReports(filters = {}) {
  const params = new URLSearchParams(filters);
  return await apiRequest(`/reports?${params}`);
}

async function exportCSV(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/reports/export/csv?${params}`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio_frota.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Subscription functions
async function getSubscriptionPlans() {
  return await apiRequest('/subscription/plans');
}

async function getCurrentSubscription() {
  return await apiRequest('/subscription/current');
}

async function createCheckoutSession(planId) {
  return await apiRequest('/subscription/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ planId })
  });
}

function render() {
  if (!currentUser) return renderLogin();
  renderDashboard();
}
function renderLogin() {
  app.innerHTML = `
  <section class="card" style="max-width:450px;margin:45px auto;">
    <div class="header"><h2>Entrar no Sistema</h2></div>
    <label>Email</label><input id="login-email" type="email" placeholder="seu@email.com" />
    <label>Senha</label><input id="login-password" type="password" placeholder="senha" />
    <div class="flex"><button class="btn btn-primary" id="login-btn">Entrar</button><button class="btn btn-secondary" id="show-register">Cadastrar</button></div>
    <p id="login-message" class="small"></p>
  </section>`;

  document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const message = document.getElementById('login-message');

    if (!email || !password) {
      message.innerText = 'Preencha todos os campos.';
      return;
    }

    try {
      message.innerText = 'Entrando...';
      await login(email, password);
      render();
    } catch (error) {
      message.innerText = error.message;
    }
  };

  document.getElementById('show-register').onclick = renderRegister;
}
function renderRegister(){
  app.innerHTML = `
  <section class="card" style="max-width:450px;margin:45px auto;">
    <div class="header"><h2>Cadastro</h2></div>
    <label>Nome</label><input id="reg-name" type="text" placeholder="nome completo" />
    <label>Email</label><input id="reg-email" type="email" placeholder="seu@email.com" />
    <label>Senha</label><input id="reg-password" type="password" placeholder="senha" />
    <label>Confirmar Senha</label><input id="reg-password2" type="password" placeholder="confirmar senha" />
    <div class="flex"><button class="btn btn-primary" id="reg-btn">Registrar</button><button class="btn btn-secondary" id="back-login">Voltar</button></div>
    <p id="reg-message" class="small"></p>
  </section>`;

  document.getElementById('back-login').onclick = renderLogin;

  document.getElementById('reg-btn').onclick = async ()=>{
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const msg = document.getElementById('reg-message');

    if (!name || !email || !password) {
      msg.innerText = 'Preencha todos os campos.';
      return;
    }

    if (password !== password2) {
      msg.innerText = 'As senhas não coincidem.';
      return;
    }

    try {
      msg.innerText = 'Registrando...';
      await register(email, password, name);
      msg.innerText = 'Cadastro realizado. Faça login.';
      setTimeout(renderLogin, 800);
    } catch (error) {
      msg.innerText = error.message;
    }
  };
}

function formatCurrency(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

async function renderDashboard(){
  try {
    const tripsData = await getTrips();
    const trips = tripsData.trips || [];
    const openTrips = trips.filter(t => t.status === 'aberto');
    const stats = calculateStats(trips);

    app.innerHTML = `
      <section class="card">
        <div class="header"><div class="logo">Frota-Manager</div><button class="btn btn-danger" id="logout">Sair</button></div>
        <p class="small">Bem-vindo, ${currentUser.name}. Gerencie suas viagens de forma segura e organizada.</p>
      </section>
      <section class="card report-box">
        <div class="report-item"><h4>Viagens</h4><p>${trips.length}</p><span class="helper">Registros totais</span></div>
        <div class="report-item"><h4>Frete</h4><p>${formatCurrency(stats.totalFreight)}</p><span class="helper">Valor total contratado</span></div>
        <div class="report-item"><h4>Despesas</h4><p>${formatCurrency(stats.totalExpenses)}</p><span class="helper">Combustível + outros</span></div>
        <div class="report-item"><h4>Receita Líquida</h4><p>${formatCurrency(stats.totalFreight - stats.totalExpenses)}</p><span class="helper">Frete - despesas</span></div>
        <div class="report-item"><h4>Combustível (L)</h4><p>${stats.totalFuelQty.toFixed(2)}</p><span class="helper">Litros consumidos</span></div>
      </section>

      <section class="card">
        <h3>Relatório Avançado</h3>
        <div class="section-group">
          <div>
            <label>Período início</label><input id="report-start" type="date" />
          </div>
          <div>
            <label>Período fim</label><input id="report-end" type="date" />
          </div>
          <div>
            <label>Mês</label><input id="report-month" type="month" />
          </div>
          <div>
            <label>Status</label><select id="report-status"><option value="">Todos</option><option value="aberto">Aberto</option><option value="fechado">Fechado</option></select>
          </div>
        </div>
        <div class="flex" style="margin-top: 10px;margin-bottom: 10px;"><button class="btn btn-primary" id="generate-report">Atualizar relatório</button><button class="btn btn-secondary" id="export-csv">Exportar CSV</button><button class="btn btn-secondary" id="export-pdf">Imprimir PDF</button></div>
        <div id="report-results" class="table-wrap"></div>
      </section>

      <section class="card">
        <h3>Iniciar Nova Viagem</h3>
        <div class="section-group">
          <div>
            <label>Placa do Caminhão</label><input id="from-plate" placeholder="ABC1D23" />
            <label>Motorista</label><input id="from-driver" placeholder="Nome completo" />
            <label>Data de Partida</label><input id="from-date" type="date" />
            <label>KM Hodômetro inicial</label><input id="from-km" type="number" min="0" />
          </div>
          <div>
            <label>Origem</label><input id="from-origin" placeholder="Cidade / Estado" />
            <label>Destino</label><input id="from-destination" placeholder="Cidade / Estado" />
            <label>Valor do Frete (R$)</label><input id="from-freight" type="number" min="0" step="0.01" />
            <button class="btn btn-primary" id="start-trip">Iniciar Viagem</button>
            <p id="start-msg" class="small"></p>
          </div>
        </div>
      </section>

      <section class="card">
        <h3>Viagens Abertas</h3>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Placa</th><th>Motorista</th><th>Rota</th><th>KM Início</th><th>Frete</th><th>Partida</th><th>Ações</th></tr></thead><tbody>${openTrips.map(t=>`<tr><td>${t.id}</td><td>${t.plate}</td><td>${t.driver}</td><td>${t.origin} → ${t.destination}</td><td>${t.km_start}</td><td>${formatCurrency(t.freight_value)}</td><td>${t.date_start}</td><td><button class="btn btn-secondary" data-action="select" data-id="${t.id}">Detalhar</button></td></tr>`).join('')}</tbody></table></div>
      </section>

      <section class="card" id="trip-detail" class="hidden">
        <h3>Detalhes da Viagem Selecionada</h3>
        <div id="trip-info" class="small"></div>
        <div class="section-group">
          <div>
            <h4>Despesa de Combustível</h4>
            <label>Posto / Local</label><input id="fuel-place" placeholder="Nome do posto" />
            <label>KM Hodômetro</label><input id="fuel-km" type="number" min="0" />
            <label>Quantidade (litros)</label><input id="fuel-qty" type="number" min="0" step="0.01" />
            <label>Valor (R$)</label><input id="fuel-value" type="number" min="0" step="0.01" />
            <button class="btn btn-primary" id="add-fuel">Adicionar Combustível</button>
          </div>
          <div>
            <h4>Outras Despesas</h4>
            <label>Tipo</label><select id="exp-type"><option value="pedagio">Pedágio</option><option value="manutencao">Manutenção</option><option value="outro">Outro</option></select>
            <label>Descrição</label><input id="exp-desc" placeholder="Ex: troca de óleo" />
            <label>Valor (R$)</label><input id="exp-value" type="number" min="0" step="0.01" />
            <button class="btn btn-primary" id="add-exp">Adicionar Despesa</button>
          </div>
        </div>
        <div class="section-group full">
          <div>
            <h4>Encerrar Viagem</h4>
            <label>Data de encerramento</label><input id="end-date" type="date" />
            <label>KM Hodômetro final</label><input id="end-km" type="number" min="0" />
            <button class="btn btn-danger" id="close-trip">Encerrar Viagem</button>
            <p id="close-msg" class="small"></p>
          </div>
        </div>
      </section>

      <section class="card">
        <h3>Histórico de Viagens</h3>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Status</th><th>Placa</th><th>Motorista</th><th>Partida</th><th>Chegada</th><th>Frete</th><th>Despesa</th><th>Receita</th></tr></thead><tbody>${trips.map(t=>{
          const expense = t.total_fuel + t.total_other_expenses;
          const net = Number(t.freight_value) - expense;
          return `<tr><td>${t.id}</td><td>${t.status}</td><td>${t.plate}</td><td>${t.driver}</td><td>${t.date_start}</td><td>${t.date_end || '-'}</td><td>${formatCurrency(t.freight_value)}</td><td>${formatCurrency(expense)}</td><td>${formatCurrency(net)}</td></tr>`;
        }).join('')}</tbody></table></div>
      </section>
    `;

    setupDashboardEventListeners(tripsData.trips || []);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    app.innerHTML = `<div class="card"><p>Erro ao carregar dados. <button onclick="render()">Tentar novamente</button></p></div>`;
  }
}

function setupDashboardEventListeners(trips) {
  document.getElementById('logout').onclick = logout;
  document.getElementById('start-trip').onclick = () => startTrip();
  const reportBtn = document.getElementById('generate-report');
  if (reportBtn) reportBtn.onclick = () => generateReport();
  const exportBtn = document.getElementById('export-csv');
  if (exportBtn) exportBtn.onclick = () => exportReportsCsv();
  const exportPdfBtn = document.getElementById('export-pdf');
  if (exportPdfBtn) exportPdfBtn.onclick = exportReportsPdf;
  document.querySelectorAll('[data-action="select"]').forEach(btn =>
    btn.onclick = () => selectTrip(Number(btn.dataset.id), trips)
  );
  const selectedId = Number(sessionStorage.getItem('selectedTripId') || '0');
  if (selectedId) {
    selectTrip(selectedId, trips);
  } else {
    document.getElementById('trip-detail').classList.add('hidden');
  }
}
async function startTrip() {
  const plate = document.getElementById('from-plate').value.trim();
  const driver = document.getElementById('from-driver').value.trim();
  const dateStart = document.getElementById('from-date').value;
  const kmStart = Number(document.getElementById('from-km').value);
  const origin = document.getElementById('from-origin').value.trim();
  const destination = document.getElementById('from-destination').value.trim();
  const freight = Number(document.getElementById('from-freight').value);
  const msg = document.getElementById('start-msg');

  if (!plate || !driver || !dateStart || !origin || !destination || !kmStart || !freight) {
    msg.innerText = 'Preencha todos os campos corretamente.';
    return;
  }

  try {
    await createTrip({
      plate,
      driver,
      date_start: dateStart,
      km_start: kmStart,
      origin,
      destination,
      freight_value: freight
    });
    msg.innerText = 'Viagem iniciada!';
    setTimeout(() => renderDashboard(), 300);
  } catch (error) {
    msg.innerText = error.message;
  }
}
async function selectTrip(id, trips) {
  const trip = trips.find(x => x.id === id);
  if (!trip) return;

  sessionStorage.setItem('selectedTripId', id);
  const panel = document.getElementById('trip-detail');
  panel.classList.remove('hidden');

  try {
    const expenses = await getExpenses(id);
    const fuelExpenses = expenses.filter(e => e.type === 'fuel');
    const otherExpenses = expenses.filter(e => e.type !== 'fuel');

    const totalFuelLiters = fuelExpenses.reduce((sum, item) => sum + (item.liters || 0), 0);
    const totalFuelValue = fuelExpenses.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalOtherValue = otherExpenses.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalExpenses = totalFuelValue + totalOtherValue;

    const info = `<p><strong>ID:</strong> ${trip.id} | Status: ${trip.status}</p><p>${trip.plate} - ${trip.driver}</p><p>${trip.origin} → ${trip.destination}</p><p><strong>Km início:</strong> ${trip.km_start} | <strong>Frete:</strong> ${formatCurrency(trip.freight_value)}</p><p><strong>Combustível gasto:</strong> ${totalFuelLiters.toFixed(2)} L | <strong>Total despesas:</strong> ${formatCurrency(totalExpenses)}</p>`;
    document.getElementById('trip-info').innerHTML = info;

    const expensesTable = `
      <div class="table-wrap"><h4>Despesas de Combustível</h4><table><thead><tr><th>Data</th><th>Posto</th><th>KM</th><th>Litros</th><th>Valor</th></tr></thead><tbody>${fuelExpenses.map(e => `<tr><td>${e.date}</td><td>${e.place}</td><td>${e.km}</td><td>${Number(e.liters).toFixed(2)}</td><td>${formatCurrency(e.value)}</td></tr>`).join('')}</tbody></table></div>
      <div class="table-wrap"><h4>Outras Despesas</h4><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${otherExpenses.map(e => `<tr><td>${e.date}</td><td>${e.type}</td><td>${e.description || '-'}</td><td>${formatCurrency(e.value)}</td></tr>`).join('')}</tbody></table></div>
    `;
    document.getElementById('trip-info').innerHTML += expensesTable;

    document.getElementById('add-fuel').onclick = () => addFuel(trip);
    document.getElementById('add-exp').onclick = () => addExpense(trip);
    document.getElementById('close-trip').onclick = () => closeTrip(trip);
  } catch (error) {
    console.error('Error loading trip details:', error);
    document.getElementById('trip-info').innerHTML = '<p>Erro ao carregar detalhes da viagem.</p>';
  }
}
async function addFuel(trip) {
  if (trip.status !== 'aberto') return alert('Somente viagens abertas podem receber despesas.');

  const place = document.getElementById('fuel-place').value.trim();
  const km = Number(document.getElementById('fuel-km').value);
  const qty = Number(document.getElementById('fuel-qty').value);
  const value = Number(document.getElementById('fuel-value').value);

  if (!place || !km || !qty || !value) {
    return alert('Preencha combustível corretamente.');
  }

  try {
    await createFuelExpense(trip.id, {
      place,
      km,
      liters: qty,
      value,
      date: new Date().toISOString().split('T')[0]
    });
    renderDashboard();
  } catch (error) {
    alert('Erro ao adicionar combustível: ' + error.message);
  }
}

async function addExpense(trip) {
  if (trip.status !== 'aberto') return alert('Somente viagens abertas podem receber despesas.');

  const type = document.getElementById('exp-type').value;
  const desc = document.getElementById('exp-desc').value.trim();
  const value = Number(document.getElementById('exp-value').value);

  const isPedagio = type === 'pedagio';
  if ((!isPedagio && !desc) || !value) {
    return alert('Preencha despesa corretamente.');
  }

  try {
    await createOtherExpense(trip.id, {
      type,
      description: desc,
      value,
      date: new Date().toISOString().split('T')[0]
    });
    renderDashboard();
  } catch (error) {
    alert('Erro ao adicionar despesa: ' + error.message);
  }
}

async function closeTrip(trip) {
  if (trip.status !== 'aberto') return;

  const dateEnd = document.getElementById('end-date').value;
  const kmEnd = Number(document.getElementById('end-km').value);
  const msg = document.getElementById('close-msg');

  if (!dateEnd || !kmEnd || kmEnd < trip.km_start) {
    msg.innerText = 'Data/km inválidos.';
    return;
  }

  try {
    await updateTrip(trip.id, {
      date_end: dateEnd,
      km_end: kmEnd,
      status: 'fechado'
    });
    msg.innerText = 'Viagem encerrada com sucesso.';
    setTimeout(() => renderDashboard(), 300);
  } catch (error) {
    msg.innerText = 'Erro ao encerrar viagem: ' + error.message;
  }
}
function calcTripExpense(trip){
  const sumFuel = trip.fuel.reduce((a,x)=>a+x.value,0);
  const sumExp = trip.expenses.reduce((a,x)=>a+x.value,0);
  return sumFuel + sumExp;
}
function calculateStats(trips) {
  const totalFreight = trips.reduce((a, t) => a + t.freight_value, 0);
  const totalFuelQty = trips.reduce((a, t) => a + t.total_liters, 0);
  const totalExpenses = trips.reduce((a, t) => a + t.total_fuel + t.total_other_expenses, 0);
  return { totalFreight, totalFuelQty, totalExpenses };
}

async function generateReport() {
  const from = document.getElementById('report-start').value;
  const to = document.getElementById('report-end').value;
  const month = document.getElementById('report-month').value;
  const status = document.getElementById('report-status').value;

  const filters = {};
  if (from) filters.start_date = from;
  if (to) filters.end_date = to;
  if (month) filters.month = month;
  if (status) filters.status = status;

  try {
    const reportData = await getReports(filters);
    const filtered = reportData.trips;
    const summary = reportData.summary;

    const reportHtml = `
      <div class="report-box" style="margin-bottom:12px;">
        <div class="report-item"><h4>Total Viagens</h4><p>${summary.total_trips}</p></div>
        <div class="report-item"><h4>KM Total</h4><p>${summary.total_km}</p></div>
        <div class="report-item"><h4>Frete (R$)</h4><p>${formatCurrency(summary.total_freight)}</p></div>
        <div class="report-item"><h4>Despesa (R$)</h4><p>${formatCurrency(summary.total_expenses)}</p></div>
        <div class="report-item"><h4>Receita (R$)</h4><p>${formatCurrency(summary.net_revenue)}</p></div>
        <div class="report-item"><h4>Litros</h4><p>${summary.total_liters.toFixed(2)}</p></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>ID</th><th>Status</th><th>Placa</th><th>Motorista</th><th>KM In</th><th>KM Out</th><th>Frete</th><th>Despesa</th><th>Receita</th></tr></thead><tbody>${filtered.map(t => {
        const expense = t.total_fuel + t.total_other_expenses;
        const net = t.freight_value - expense;
        const kmOut = t.km_end || '-';
        return `<tr><td>${t.id}</td><td>${t.status}</td><td>${t.plate}</td><td>${t.driver}</td><td>${t.km_start}</td><td>${kmOut}</td><td>${formatCurrency(t.freight_value)}</td><td>${formatCurrency(expense)}</td><td>${formatCurrency(net)}</td></tr>`;
      }).join('')}</tbody></table></div>
    `;
    document.getElementById('report-results').innerHTML = reportHtml;
  } catch (error) {
    console.error('Error generating report:', error);
    document.getElementById('report-results').innerHTML = '<p>Erro ao gerar relatório.</p>';
  }
}

async function exportReportsCsv() {
  const from = document.getElementById('report-start').value;
  const to = document.getElementById('report-end').value;
  const month = document.getElementById('report-month').value;
  const status = document.getElementById('report-status').value;

  const filters = {};
  if (from) filters.start_date = from;
  if (to) filters.end_date = to;
  if (month) filters.month = month;
  if (status) filters.status = status;

  try {
    await exportCSV(filters);
  } catch (error) {
    alert('Erro ao exportar CSV: ' + error.message);
  }
}

function exportReportsPdf(){
  const reportDiv = document.getElementById('report-results');
  if(!reportDiv || !reportDiv.innerHTML.trim()){
    return alert('Gere o relatório antes de exportar.');
  }

  // Criar uma nova janela para impressão
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Frota - PDF</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 20px;
          color: #333;
          line-height: 1.4;
        }
        h1 {
          color: #1a365d;
          border-bottom: 2px solid #1a365d;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .report-box {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        .report-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .report-item h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .report-item p {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          color: #1a365d;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          background-color: #1a365d;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .date-info {
          margin-bottom: 20px;
          color: #64748b;
          font-size: 14px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Relatório de Frota</h1>
      <div class="date-info">
        <strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </div>
      ${reportDiv.innerHTML}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Initialize app
async function init() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    renderLogin();
  } else {
    render();
  }
}

init();