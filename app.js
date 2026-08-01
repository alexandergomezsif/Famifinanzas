/**
 * =========================================================
 * APLICACIÓN DE GESTIÓN DE FINANZAS FAMILIARES (Vanilla JS)
 * 100% Offline con Persistencia en LocalStorage y Respaldo JSON
 * =========================================================
 */

class FinanceApp {
  constructor() {
    this.STORAGE_KEY = 'family_finance_data_v1';
    this.THEME_KEY = 'family_finance_theme';
    
    // Estado inicial de la aplicación
    this.state = {
      settings: {
        householdName: 'Familia Gómez',
        currency: '$',
      },
      people: [],
      obligations: [],
      payments: {}, // Mapa por mes: { 'YYYY-MM': [ { id, obligationId, status, date, time, paidBy, amount, notes, attachment } ] }
      currentMonth: this.getCurrentMonthString(),
      currentTab: 'dashboard',
    };

    this.chartInstances = {};
    this.tempAttachment = null;

    this.init();
  }

  // Inicialización de la aplicación
  init() {
    this.loadTheme();
    this.loadState();
    this.setupEventListeners();
    this.ensurePaymentsForCurrentMonth();
    this.renderCurrentMonthDisplay();
    this.render();
  }

  getCurrentMonthString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  formatMonthDisplay(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  // Carga y almacenamiento en LocalStorage
  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.state = JSON.parse(raw);
        if (!this.state.currentMonth) this.state.currentMonth = this.getCurrentMonthString();
        if (!this.state.currentTab) this.state.currentTab = 'dashboard';
      } else {
        this.loadDemoData();
      }
    } catch (e) {
      console.error('Error al cargar datos desde LocalStorage:', e);
      this.loadDemoData();
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error al guardar datos en LocalStorage:', e);
      alert('Aviso: El almacenamiento local está lleno. Se recomienda exportar un respaldo JSON.');
    }
  }

  loadDemoData() {
    this.state.settings = {
      householdName: 'Familia Gómez',
      currency: '$',
    };
    
    this.state.people = [
      { id: 'p1', name: 'Carlos Gómez', income: 3200, color: '#4F46E5' },
      { id: 'p2', name: 'Ana Gómez', income: 2400, color: '#10B981' },
    ];

    this.state.obligations = [
      { id: 'ob1', name: 'Alquiler de Vivienda', category: 'Vivienda', type: 'expense', amount: 1200, responsible: 'shared' },
      { id: 'ob2', name: 'Supermercado y Alimentos', category: 'Alimentación y Mercado', type: 'expense', amount: 800, responsible: 'shared' },
      { id: 'ob3', name: 'Servicios de Luz, Agua e Internet', category: 'Servicios Públicos', type: 'expense', amount: 280, responsible: 'shared' },
      { id: 'ob4', name: 'Crédito Vehículo', category: 'Pago de Deuda', type: 'debt', amount: 450, responsible: 'p1' },
      { id: 'ob5', name: 'Fondo de Emergencia Familiar', category: 'Ahorro e Inversión', type: 'savings', amount: 500, responsible: 'shared' },
    ];

    this.state.payments = {};
    this.state.currentMonth = this.getCurrentMonthString();
    this.saveState();
  }

  // Gestión de temas (Claro / Oscuro)
  loadTheme() {
    const savedTheme = localStorage.getItem(this.THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcons(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(this.THEME_KEY, newTheme);
    this.updateThemeIcons(newTheme);
    this.renderCharts();
  }

  updateThemeIcons(theme) {
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    if (!sun || !moon) return;
    if (theme === 'dark') {
      sun.classList.remove('hidden');
      moon.classList.add('hidden');
    } else {
      sun.classList.add('hidden');
      moon.classList.remove('hidden');
    }
  }

  // Configuración de eventos UI
  setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());

    // Navegación Sidebar y Bottom Nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Month Selector in Payments
    const monthPicker = document.getElementById('payments-month-input');
    if (monthPicker) {
      monthPicker.value = this.state.currentMonth;
      monthPicker.addEventListener('change', (e) => {
        if (e.target.value) {
          this.state.currentMonth = e.target.value;
          this.ensurePaymentsForCurrentMonth();
          this.renderCurrentMonthDisplay();
          this.render();
        }
      });
    }

    // Filtros de Obligaciones
    document.getElementById('ob-filter-category')?.addEventListener('change', () => this.renderObligations());
    document.getElementById('ob-filter-responsible')?.addEventListener('change', () => this.renderObligations());

    // Filtros de Pagos
    document.getElementById('pay-filter-status')?.addEventListener('change', () => this.renderPayments());

    // Color picker sync
    const colorInput = document.getElementById('person-color');
    const colorVal = document.getElementById('person-color-val');
    if (colorInput && colorVal) {
      colorInput.addEventListener('input', (e) => {
        colorVal.textContent = e.target.value;
      });
    }
  }

  switchTab(tabId) {
    this.state.currentTab = tabId;

    // Actualizar botones de navegación
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Actualizar vistas
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.remove('active');
    });
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.add('active');

    this.render();
  }

  handleFabClick() {
    switch (this.state.currentTab) {
      case 'people':
        this.openPersonModal();
        break;
      case 'obligations':
        this.openObligationModal();
        break;
      default:
        this.openObligationModal();
        break;
    }
  }

  changeMonth(direction) {
    const [year, month] = this.state.currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    this.state.currentMonth = `${newY}-${newM}`;

    const monthPicker = document.getElementById('payments-month-input');
    if (monthPicker) monthPicker.value = this.state.currentMonth;

    this.ensurePaymentsForCurrentMonth();
    this.renderCurrentMonthDisplay();
    this.render();
  }

  renderCurrentMonthDisplay() {
    const formatted = this.formatMonthDisplay(this.state.currentMonth);
    const el = document.getElementById('current-month-display');
    if (el) el.textContent = formatted;
  }

  // Cálculos Financieros
  getTotalIncome() {
    return this.state.people.reduce((acc, p) => acc + (parseFloat(p.income) || 0), 0);
  }

  getPersonSharePercentage(personId) {
    const total = this.getTotalIncome();
    if (total === 0) return 0;
    const person = this.state.people.find(p => p.id === personId);
    if (!person) return 0;
    return (parseFloat(person.income) || 0) / total;
  }

  getCalculations() {
    const totalIncome = this.getTotalIncome();
    let totalExpenses = 0;
    let totalSavings = 0;
    let totalDebts = 0;

    this.state.obligations.forEach(ob => {
      const amount = parseFloat(ob.amount) || 0;
      if (ob.type === 'savings') {
        totalSavings += amount;
      } else if (ob.type === 'debt') {
        totalDebts += amount;
      } else {
        totalExpenses += amount;
      }
    });

    const totalOutflow = totalExpenses + totalSavings + totalDebts;
    const remaining = totalIncome - totalOutflow;

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalDebts,
      totalOutflow,
      remaining,
    };
  }

  // Asegurar la lista de pagos del mes activo
  ensurePaymentsForCurrentMonth() {
    const month = this.state.currentMonth;
    if (!this.state.payments[month]) {
      this.state.payments[month] = [];
    }

    const currentMonthPayments = this.state.payments[month];

    // Para cada obligación, verificar si existe un registro de pago
    this.state.obligations.forEach(ob => {
      const exists = currentMonthPayments.some(p => p.obligationId === ob.id);
      if (!exists) {
        currentMonthPayments.push({
          id: 'pay_' + Math.random().toString(36).substr(2, 9),
          obligationId: ob.id,
          status: 'pending',
          date: '',
          time: '',
          paidBy: ob.responsible === 'shared' ? '' : ob.responsible,
          amount: ob.amount,
          notes: '',
          attachment: null,
        });
      }
    });

    this.saveState();
  }

  // Renderizado Principal
  render() {
    this.renderDashboard();
    this.renderPeople();
    this.renderObligations();
    this.renderPayments();
    this.renderSettings();
    this.renderCharts();
  }

  // Render Dashboard
  renderDashboard() {
    const calcs = this.getCalculations();
    const curr = this.state.settings.currency;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${curr}${val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    setVal('dash-income', calcs.totalIncome);
    setVal('dash-expenses', calcs.totalExpenses);
    setVal('dash-remaining', calcs.remaining);
    setVal('dash-savings', calcs.totalSavings);
    setVal('dash-debts', calcs.totalDebts);

    // Estado Financiero
    const pill = document.getElementById('dash-status-pill');
    const desc = document.getElementById('dash-status-desc');
    if (pill && desc) {
      pill.className = 'status-pill';
      if (calcs.totalIncome === 0) {
        pill.textContent = 'Sin Ingresos';
        pill.classList.add('warning');
        desc.textContent = 'Agregue integrantes con ingresos para calcular el balance.';
      } else if (calcs.remaining < 0) {
        pill.textContent = 'Déficit Financiero';
        pill.classList.add('danger');
        desc.textContent = 'Los gastos superan los ingresos mensuales totales.';
      } else if (calcs.remaining >= calcs.totalIncome * 0.2) {
        pill.textContent = 'Excelente Salud Financiera';
        pill.classList.add('good');
        desc.textContent = 'Margen de ahorro superior al 20% de los ingresos totales.';
      } else {
        pill.textContent = 'Finanzas Ajustadas';
        pill.classList.add('warning');
        desc.textContent = 'Presupuesto dentro del límite sin margen amplio de holgura.';
      }
    }

    // Lista de Participación de Personas
    const peopleList = document.getElementById('dash-people-list');
    if (peopleList) {
      if (this.state.people.length === 0) {
        peopleList.innerHTML = '<p class="muted-text">No hay personas registradas.</p>';
      } else {
        const total = calcs.totalIncome;
        peopleList.innerHTML = this.state.people.map(p => {
          const share = total > 0 ? ((p.income / total) * 100).toFixed(1) : 0;
          return `
            <div class="person-income-row">
              <div class="person-avatar-wrap">
                <div class="person-avatar" style="background-color: ${p.color}">${p.name.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>${p.name}</strong>
                  <div class="person-share">Aporte: ${share}% del total</div>
                </div>
              </div>
              <strong style="color: var(--primary);">${curr}${p.income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
            </div>
          `;
        }).join('');
      }
    }

    // Lista rápida de pendientes en Dashboard
    const pendingList = document.getElementById('dash-pending-list');
    if (pendingList) {
      const monthPayments = this.state.payments[this.state.currentMonth] || [];
      const pendings = monthPayments.filter(p => p.status === 'pending');

      if (pendings.length === 0) {
        pendingList.innerHTML = '<p class="muted-text">¡Excelente! No hay obligaciones pendientes para este mes.</p>';
      } else {
        pendingList.innerHTML = pendings.slice(0, 4).map(pay => {
          const ob = this.state.obligations.find(o => o.id === pay.obligationId);
          if (!ob) return '';
          return `
            <div class="item-card">
              <div class="item-card-header">
                <div>
                  <span class="item-badge badge-pending">Pendiente</span>
                  <div class="item-title">${ob.name}</div>
                  <div class="item-cat">${ob.category}</div>
                </div>
                <div class="item-amount">${curr}${parseFloat(pay.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
              </div>
              <div class="item-footer-actions">
                <span class="muted-text">Mes: ${this.formatMonthDisplay(this.state.currentMonth)}</span>
                <button class="btn btn-primary btn-sm" onclick="app.openPaymentModal('${pay.id}')">Pagar</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // Render Personas
  renderPeople() {
    const grid = document.getElementById('people-cards-grid');
    if (!grid) return;

    if (this.state.people.length === 0) {
      grid.innerHTML = '<p class="muted-text">No hay personas registradas. Haga clic en "Agregar Persona" para comenzar.</p>';
      return;
    }

    const totalIncome = this.getTotalIncome();
    const curr = this.state.settings.currency;

    grid.innerHTML = this.state.people.map(p => {
      const share = totalIncome > 0 ? ((p.income / totalIncome) * 100).toFixed(1) : 0;
      return `
        <div class="person-card">
          <div class="person-card-stripe" style="background-color: ${p.color}"></div>
          <div class="person-card-top">
            <div class="person-avatar-wrap">
              <div class="person-avatar" style="background-color: ${p.color}">
                ${p.name.charAt(0).toUpperCase()}
              </div>
              <div class="person-meta">
                <h4>${p.name}</h4>
                <span class="person-share">Participación: ${share}%</span>
              </div>
            </div>
          </div>
          <div class="person-income-row">
            <span class="muted-text">Ingreso Mensual</span>
            <strong>${curr}${parseFloat(p.income).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div class="person-actions">
            <button class="btn btn-secondary btn-sm" onclick="app.openPersonModal('${p.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="app.deletePerson('${p.id}')">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    // Actualizar selects de responsables en filtros y modales
    this.updatePersonSelectOptions();
  }

  updatePersonSelectOptions() {
    const selects = [
      document.getElementById('ob-filter-responsible'),
      document.getElementById('ob-responsible'),
      document.getElementById('pay-paid-by')
    ];

    selects.forEach(select => {
      if (!select) return;
      const isFilter = select.id === 'ob-filter-responsible';
      const isObligation = select.id === 'ob-responsible';
      const isPayment = select.id === 'pay-paid-by';

      const currentVal = select.value;
      let html = '';

      if (isFilter) {
        html += '<option value="all">Todos</option><option value="shared">Compartido</option>';
      } else if (isObligation) {
        html += '<option value="shared">Compartido (Dividido por % de ingresos)</option>';
      } else if (isPayment) {
        html += '<option value="">-- Seleccionar Persona --</option>';
      }

      this.state.people.forEach(p => {
        html += `<option value="${p.id}">${p.name}</option>`;
      });

      select.innerHTML = html;
      if (currentVal) select.value = currentVal;
    });
  }

  // Render Obligaciones
  renderObligations() {
    const grid = document.getElementById('obligations-cards-grid');
    if (!grid) return;

    const catFilter = document.getElementById('ob-filter-category')?.value || 'all';
    const respFilter = document.getElementById('ob-filter-responsible')?.value || 'all';
    const curr = this.state.settings.currency;

    let filtered = this.state.obligations.filter(ob => {
      if (catFilter !== 'all' && ob.category !== catFilter) return false;
      if (respFilter !== 'all' && ob.responsible !== respFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="muted-text">No se encontraron obligaciones que coincidan con los filtros.</p>';
      return;
    }

    grid.innerHTML = filtered.map(ob => {
      let respName = 'Compartido (% proporcional)';
      let respBreakdown = '';
      if (ob.responsible !== 'shared') {
        const p = this.state.people.find(x => x.id === ob.responsible);
        respName = p ? p.name : 'No Asignado';
      } else {
        const total = this.getTotalIncome();
        if (total > 0) {
          respBreakdown = this.state.people.map(p => {
            const part = (p.income / total) * ob.amount;
            return `<div>• ${p.name}: ${curr}${part.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
          }).join('');
        }
      }

      const typeBadge = ob.type === 'savings' ? 'badge-savings' : (ob.type === 'debt' ? 'badge-debt' : 'badge-expense');
      const typeLabel = ob.type === 'savings' ? 'Ahorro' : (ob.type === 'debt' ? 'Deuda' : 'Gasto');

      return `
        <div class="item-card">
          <div>
            <div class="item-card-header">
              <div>
                <span class="item-badge ${typeBadge}">${typeLabel}</span>
                <div class="item-title">${ob.name}</div>
                <div class="item-cat">${ob.category}</div>
              </div>
              <div class="item-amount">${curr}${parseFloat(ob.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="item-details-row" style="margin-top: 0.75rem;">
              <div><strong>Responsable:</strong> ${respName}</div>
              ${respBreakdown ? `<div class="muted-text" style="font-size: 0.8rem; margin-top: 0.25rem;">${respBreakdown}</div>` : ''}
            </div>
          </div>
          <div class="item-footer-actions">
            <button class="btn btn-secondary btn-sm" onclick="app.openObligationModal('${ob.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="app.deleteObligation('${ob.id}')">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Pagos
  renderPayments() {
    const grid = document.getElementById('payments-cards-grid');
    if (!grid) return;

    const monthPayments = this.state.payments[this.state.currentMonth] || [];
    const statusFilter = document.getElementById('pay-filter-status')?.value || 'all';
    const curr = this.state.settings.currency;

    let filtered = monthPayments.filter(pay => {
      if (statusFilter !== 'all' && pay.status !== statusFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="muted-text">No hay registros de pago para este criterio en el mes seleccionado.</p>';
      return;
    }

    grid.innerHTML = filtered.map(pay => {
      const ob = this.state.obligations.find(o => o.id === pay.obligationId);
      if (!ob) return '';

      const isPaid = pay.status === 'paid';
      const statusBadge = isPaid ? 'badge-paid' : 'badge-pending';
      const statusLabel = isPaid ? 'Pagado' : 'Pendiente';

      let paidByName = 'No especificado';
      if (pay.paidBy) {
        const p = this.state.people.find(x => x.id === pay.paidBy);
        paidByName = p ? p.name : pay.paidBy;
      }

      return `
        <div class="item-card">
          <div>
            <div class="item-card-header">
              <div>
                <span class="item-badge ${statusBadge}">${statusLabel}</span>
                <div class="item-title">${ob.name}</div>
                <div class="item-cat">${ob.category}</div>
              </div>
              <div class="item-amount">${curr}${parseFloat(pay.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            </div>

            <div class="item-details-row" style="margin-top: 0.75rem;">
              <div><strong>Estado:</strong> ${statusLabel}</div>
              ${isPaid && pay.date ? `<div><strong>Fecha de Pago:</strong> ${pay.date} ${pay.time || ''}</div>` : ''}
              ${isPaid && pay.paidBy ? `<div><strong>Pagado Por:</strong> ${paidByName}</div>` : ''}
              ${pay.notes ? `<div><strong>Notas:</strong> ${pay.notes}</div>` : ''}
              ${pay.attachment ? `
                <div style="margin-top: 0.25rem;">
                  <button class="btn btn-secondary btn-sm" onclick="app.viewReceipt('${pay.id}')">
                    📎 Ver Comprobante Adjunto
                  </button>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="item-footer-actions">
            <button class="btn btn-primary btn-sm" onclick="app.openPaymentModal('${pay.id}')">
              ${isPaid ? 'Modificar Registro' : 'Registrar Pago'}
            </button>
            ${isPaid ? `
              <button class="btn btn-secondary btn-sm" onclick="app.markAsPending('${pay.id}')">
                Marcar Pendiente
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Configuración
  renderSettings() {
    const nameInput = document.getElementById('setting-household-name');
    const currInput = document.getElementById('setting-currency');
    const titleDisp = document.getElementById('app-title-display');

    if (nameInput) nameInput.value = this.state.settings.householdName || '';
    if (currInput) currInput.value = this.state.settings.currency || '$';
    if (titleDisp) titleDisp.textContent = this.state.settings.householdName || 'Finanzas Familiares';

    document.querySelectorAll('.curr-sym').forEach(el => {
      el.textContent = this.state.settings.currency || '$';
    });
  }

  // Gestión de Personas (CRUD)
  openPersonModal(id = null) {
    const modal = document.getElementById('modal-person');
    const title = document.getElementById('modal-person-title');
    const idInput = document.getElementById('person-id');
    const nameInput = document.getElementById('person-name');
    const incomeInput = document.getElementById('person-income');
    const colorInput = document.getElementById('person-color');
    const colorVal = document.getElementById('person-color-val');

    if (id) {
      const p = this.state.people.find(x => x.id === id);
      if (!p) return;
      title.textContent = 'Editar Persona';
      idInput.value = p.id;
      nameInput.value = p.name;
      incomeInput.value = p.income;
      colorInput.value = p.color || '#4F46E5';
      colorVal.textContent = p.color || '#4F46E5';
    } else {
      title.textContent = 'Agregar Persona';
      idInput.value = '';
      nameInput.value = '';
      incomeInput.value = '';
      colorInput.value = '#4F46E5';
      colorVal.textContent = '#4F46E5';
    }

    modal.classList.add('active');
  }

  savePerson(e) {
    e.preventDefault();
    const id = document.getElementById('person-id').value;
    const name = document.getElementById('person-name').value.trim();
    const income = parseFloat(document.getElementById('person-income').value) || 0;
    const color = document.getElementById('person-color').value;

    if (!name) return;

    if (id) {
      const idx = this.state.people.findIndex(p => p.id === id);
      if (idx !== -1) {
        this.state.people[idx] = { id, name, income, color };
      }
    } else {
      const newId = 'p_' + Math.random().toString(36).substr(2, 9);
      this.state.people.push({ id: newId, name, income, color });
    }

    this.saveState();
    this.closeModal('modal-person');
    this.render();
  }

  deletePerson(id) {
    if (!confirm('¿Está seguro de eliminar a esta persona? Se actualizarán los cálculos de participación.')) return;
    this.state.people = this.state.people.filter(p => p.id !== id);
    this.saveState();
    this.render();
  }

  // Gestión de Obligaciones (CRUD)
  openObligationModal(id = null) {
    const modal = document.getElementById('modal-obligation');
    const title = document.getElementById('modal-obligation-title');
    const idInput = document.getElementById('ob-id');
    const nameInput = document.getElementById('ob-name');
    const catInput = document.getElementById('ob-category');
    const typeInput = document.getElementById('ob-type');
    const amountInput = document.getElementById('ob-amount');
    const respInput = document.getElementById('ob-responsible');

    this.updatePersonSelectOptions();

    if (id) {
      const ob = this.state.obligations.find(x => x.id === id);
      if (!ob) return;
      title.textContent = 'Editar Obligación';
      idInput.value = ob.id;
      nameInput.value = ob.name;
      catInput.value = ob.category;
      typeInput.value = ob.type || 'expense';
      amountInput.value = ob.amount;
      respInput.value = ob.responsible;
    } else {
      title.textContent = 'Agregar Obligación';
      idInput.value = '';
      nameInput.value = '';
      catInput.value = 'Vivienda';
      typeInput.value = 'expense';
      amountInput.value = '';
      respInput.value = 'shared';
    }

    modal.classList.add('active');
  }

  saveObligation(e) {
    e.preventDefault();
    const id = document.getElementById('ob-id').value;
    const name = document.getElementById('ob-name').value.trim();
    const category = document.getElementById('ob-category').value;
    const type = document.getElementById('ob-type').value;
    const amount = parseFloat(document.getElementById('ob-amount').value) || 0;
    const responsible = document.getElementById('ob-responsible').value;

    if (!name || amount <= 0) return;

    if (id) {
      const idx = this.state.obligations.findIndex(o => o.id === id);
      if (idx !== -1) {
        this.state.obligations[idx] = { id, name, category, type, amount, responsible };
      }
    } else {
      const newId = 'ob_' + Math.random().toString(36).substr(2, 9);
      this.state.obligations.push({ id: newId, name, category, type, amount, responsible });
    }

    this.ensurePaymentsForCurrentMonth();
    this.saveState();
    this.closeModal('modal-obligation');
    this.render();
  }

  deleteObligation(id) {
    if (!confirm('¿Está seguro de eliminar esta obligación?')) return;
    this.state.obligations = this.state.obligations.filter(o => o.id !== id);
    // Eliminar pagos asociados en el mes actual
    const month = this.state.currentMonth;
    if (this.state.payments[month]) {
      this.state.payments[month] = this.state.payments[month].filter(p => p.obligationId !== id);
    }
    this.saveState();
    this.render();
  }

  // Gestión de Pagos
  openPaymentModal(paymentId) {
    const monthPayments = this.state.payments[this.state.currentMonth] || [];
    const pay = monthPayments.find(p => p.id === paymentId);
    if (!pay) return;

    const ob = this.state.obligations.find(o => o.id === pay.obligationId);
    if (!ob) return;

    this.updatePersonSelectOptions();

    document.getElementById('pay-id').value = pay.id;
    document.getElementById('pay-ob-name-display').textContent = `${ob.name} (${ob.category})`;
    document.getElementById('pay-status').value = pay.status || 'paid';
    
    // Fecha y hora
    const today = new Date();
    const defaultDate = today.toISOString().split('T')[0];
    const defaultTime = today.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('pay-date').value = pay.date || defaultDate;
    document.getElementById('pay-time').value = pay.time || defaultTime;
    document.getElementById('pay-paid-by').value = pay.paidBy || '';
    document.getElementById('pay-amount').value = pay.amount || ob.amount;
    document.getElementById('pay-notes').value = pay.notes || '';

    this.tempAttachment = pay.attachment || null;
    this.renderAttachmentPreview();

    document.getElementById('modal-payment').classList.add('active');
  }

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('El archivo excede el tamaño máximo permitido de 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      this.tempAttachment = {
        name: file.name,
        type: file.type,
        data: loadEvt.target.result
      };
      this.renderAttachmentPreview();
    };
    reader.readAsDataURL(file);
  }

  renderAttachmentPreview() {
    const container = document.getElementById('attachment-preview');
    if (!container) return;

    if (this.tempAttachment) {
      container.innerHTML = `
        <div class="attachment-preview-item">
          <span>📎 <strong>${this.tempAttachment.name}</strong></span>
          <button type="button" class="btn btn-danger btn-sm" onclick="app.removeAttachment()">Quitar</button>
        </div>
      `;
    } else {
      container.innerHTML = '<span class="muted-text">Sin comprobante adjunto</span>';
    }
  }

  removeAttachment() {
    this.tempAttachment = null;
    const input = document.getElementById('pay-attachment-input');
    if (input) input.value = '';
    this.renderAttachmentPreview();
  }

  savePayment(e) {
    e.preventDefault();
    const payId = document.getElementById('pay-id').value;
    const month = this.state.currentMonth;
    const monthPayments = this.state.payments[month] || [];
    const pay = monthPayments.find(p => p.id === payId);
    if (!pay) return;

    pay.status = document.getElementById('pay-status').value;
    pay.date = document.getElementById('pay-date').value;
    pay.time = document.getElementById('pay-time').value;
    pay.paidBy = document.getElementById('pay-paid-by').value;
    pay.amount = parseFloat(document.getElementById('pay-amount').value) || 0;
    pay.notes = document.getElementById('pay-notes').value.trim();
    pay.attachment = this.tempAttachment;

    this.saveState();
    this.closeModal('modal-payment');
    this.render();
  }

  markAsPending(paymentId) {
    const month = this.state.currentMonth;
    const monthPayments = this.state.payments[month] || [];
    const pay = monthPayments.find(p => p.id === paymentId);
    if (pay) {
      pay.status = 'pending';
      pay.date = '';
      pay.time = '';
      this.saveState();
      this.render();
    }
  }

  viewReceipt(paymentId) {
    const month = this.state.currentMonth;
    const monthPayments = this.state.payments[month] || [];
    const pay = monthPayments.find(p => p.id === paymentId);
    if (!pay || !pay.attachment) return;

    const viewer = document.getElementById('receipt-viewer-content');
    const downloadBtn = document.getElementById('receipt-download-btn');
    const title = document.getElementById('receipt-modal-title');

    title.textContent = `Comprobante: ${pay.attachment.name}`;
    downloadBtn.href = pay.attachment.data;
    downloadBtn.download = pay.attachment.name;

    if (pay.attachment.type.startsWith('image/')) {
      viewer.innerHTML = `<img src="${pay.attachment.data}" alt="Comprobante de Pago">`;
    } else if (pay.attachment.type === 'application/pdf') {
      viewer.innerHTML = `<iframe src="${pay.attachment.data}"></iframe>`;
    } else {
      viewer.innerHTML = `<p style="color: white;">Vista previa no disponible para este tipo de archivo. Use el botón de descarga.</p>`;
    }

    document.getElementById('modal-receipt-view').classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  }

  // Configuración General
  saveGeneralSettings(e) {
    e.preventDefault();
    const name = document.getElementById('setting-household-name').value.trim();
    const curr = document.getElementById('setting-currency').value.trim();

    if (name) this.state.settings.householdName = name;
    if (curr) this.state.settings.currency = curr;

    this.saveState();
    this.render();
    alert('Configuración guardada exitosamente.');
  }

  // Respaldo y Restauración JSON
  exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_finanzas_familiares_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && imported.people && imported.obligations) {
          this.state = imported;
          this.saveState();
          this.ensurePaymentsForCurrentMonth();
          this.renderCurrentMonthDisplay();
          this.render();
          alert('¡Copia de seguridad restaurada con éxito!');
        } else {
          alert('El archivo no contiene un formato de respaldo válido de Finanzas Familiares.');
        }
      } catch (err) {
        alert('Error al leer o procesar el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  resetAllData() {
    if (confirm('¿Está COMPLETAMENTE SEGURO de reiniciar todos los datos? Se borrará todo el historial y comprobantes guardados.')) {
      localStorage.removeItem(this.STORAGE_KEY);
      this.loadDemoData();
      this.ensurePaymentsForCurrentMonth();
      this.render();
      alert('Los datos han sido restablecidos correctamente.');
    }
  }

  // Gráficos Interactivos con Chart.js
  renderCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no está disponible offline u online.');
      return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#0f172a';
    const gridColor = isDark ? '#374151' : '#e2e8f0';

    const calcs = this.getCalculations();

    // 1. Dashboard Doughnut Chart
    this.createOrUpdateChart('dash-chart', {
      type: 'doughnut',
      data: {
        labels: ['Gastos', 'Ahorros', 'Deudas', 'Restante'],
        datasets: [{
          data: [calcs.totalExpenses, calcs.totalSavings, calcs.totalDebts, Math.max(0, calcs.remaining)],
          backgroundColor: ['#ef4444', '#0ea5e9', '#f59e0b', '#10b981'],
          borderWidth: 2,
          borderColor: isDark ? '#1f2937' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter' } } }
        }
      }
    });

    // 2. Statistics: Income vs Expenses
    this.createOrUpdateChart('chart-income-vs-expenses', {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Gastos Totales', 'Restante'],
        datasets: [{
          label: 'Monto (' + this.state.settings.currency + ')',
          data: [calcs.totalIncome, calcs.totalOutflow, calcs.remaining],
          backgroundColor: ['#4f46e5', '#ef4444', '#10b981'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });

    // 3. Statistics: Expenses by Category
    const categoriesMap = {};
    this.state.obligations.forEach(ob => {
      const amt = parseFloat(ob.amount) || 0;
      categoriesMap[ob.category] = (categoriesMap[ob.category] || 0) + amt;
    });

    const catLabels = Object.keys(categoriesMap);
    const catData = Object.values(categoriesMap);
    const palette = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6', '#f97316'];

    this.createOrUpdateChart('chart-expenses-by-category', {
      type: 'pie',
      data: {
        labels: catLabels.length ? catLabels : ['Sin Gastos'],
        datasets: [{
          data: catData.length ? catData : [1],
          backgroundColor: palette.slice(0, Math.max(1, catLabels.length)),
          borderWidth: 2,
          borderColor: isDark ? '#1f2937' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter' } } }
        }
      }
    });

    // 4. Statistics: Savings vs Debts
    this.createOrUpdateChart('chart-savings-debts', {
      type: 'doughnut',
      data: {
        labels: ['Metas de Ahorro', 'Pago de Deudas'],
        datasets: [{
          data: [calcs.totalSavings, calcs.totalDebts],
          backgroundColor: ['#0ea5e9', '#f59e0b'],
          borderWidth: 2,
          borderColor: isDark ? '#1f2937' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter' } } }
        }
      }
    });

    // 5. Statistics: Monthly Evolution (Mock last 6 months based on current values)
    const months = ['Hace 5 Meses', 'Hace 4 Meses', 'Hace 3 Meses', 'Hace 2 Meses', 'Mes Anterior', 'Mes Actual'];
    const incEvolution = [calcs.totalIncome, calcs.totalIncome, calcs.totalIncome, calcs.totalIncome, calcs.totalIncome, calcs.totalIncome];
    const expEvolution = [
      calcs.totalOutflow * 0.95,
      calcs.totalOutflow * 1.02,
      calcs.totalOutflow * 0.98,
      calcs.totalOutflow * 1.05,
      calcs.totalOutflow * 0.97,
      calcs.totalOutflow
    ];

    this.createOrUpdateChart('chart-monthly-evolution', {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Ingresos',
            data: incEvolution,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Gastos',
            data: expEvolution,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Inter' } } }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  createOrUpdateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.chartInstances[canvasId]) {
      this.chartInstances[canvasId].destroy();
    }

    try {
      this.chartInstances[canvasId] = new Chart(canvas, config);
    } catch (e) {
      console.error(`Error al instanciar gráfico ${canvasId}:`, e);
    }
  }
}

// Instancia global accesible desde eventos inline HTML
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new FinanceApp();
});
