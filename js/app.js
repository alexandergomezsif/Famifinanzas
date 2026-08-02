/**
 * =========================================================================
 * FAMIFINANZAS - GESTIÓN FINANCIERA FAMILIAR & MOTOR MATEMÁTICO
 * Familia Gómez Rico - Desarrollado por Alex Gómez Avendaño
 * =========================================================================
 */

/**
 * MOTOR MATEMÁTICO FINANCIERO OFICIAL (Versión 1.0)
 * Implementación exacta de fórmulas de ingeniería financiera y amortización francesa.
 */
class FinancialEngine {
  /**
   * Convierte tasas a periódica mensual vencida (ip)
   * @param {number} rate - Tasa en porcentaje (ej: 18.5)
   * @param {string} type - 'EA' (Efectiva Anual), 'MV' (Mensual Vencida), 'NA' (Nominal Anual Mes Vencido)
   * @returns {number} Tasa mensual en decimal (ej: 0.0142)
   */
  static convertRateToMonthly(rate, type = 'EA') {
    const r = parseFloat(rate) || 0;
    if (r <= 0) return 0;

    switch (type) {
      case 'EA':
        // ip = (1 + EA)^(1/12) - 1
        return Math.pow(1 + (r / 100), 1 / 12) - 1;
      case 'MV':
        // ip = MV / 100
        return r / 100;
      case 'NA':
        // ip = (NA / 12) / 100
        return (r / 12) / 100;
      default:
        return Math.pow(1 + (r / 100), 1 / 12) - 1;
    }
  }

  /**
   * Cálculo de Cuota Fija por el Sistema Francés
   * PMT = P * [i * (1 + i)^n] / [(1 + i)^n - 1]
   */
  static calculateFrenchPMT(principal, monthlyRate, totalTerms) {
    const P = parseFloat(principal) || 0;
    const i = parseFloat(monthlyRate) || 0;
    const n = parseInt(totalTerms) || 1;

    if (P <= 0 || n <= 0) return 0;
    if (i <= 0) return P / n; // Sin interés

    const factor = Math.pow(1 + i, n);
    const pmt = P * (i * factor) / (factor - 1);
    return isNaN(pmt) ? 0 : pmt;
  }

  /**
   * Genera el cuadro de amortización completo mes a mes
   */
  static generateAmortizationSchedule(principal, monthlyRate, totalTerms, extraMonthlyPayment = 0) {
    const P = parseFloat(principal) || 0;
    const i = parseFloat(monthlyRate) || 0;
    const n = parseInt(totalTerms) || 1;
    const extra = parseFloat(extraMonthlyPayment) || 0;

    if (P <= 0 || n <= 0) {
      return { schedule: [], totalInterestPaid: 0, totalAmountPaid: 0, totalPeriods: 0, originalPMT: 0 };
    }

    const basePMT = this.calculateFrenchPMT(P, i, n);
    const schedule = [];
    let currentBalance = P;
    let totalInterest = 0;
    let totalPaid = 0;
    let period = 1;

    // Iteramos hasta liquidar la deuda o un límite de seguridad
    const maxPeriods = Math.max(n + 12, 360);

    while (currentBalance > 0.01 && period <= maxPeriods) {
      const interestPayment = currentBalance * i;
      let standardCapitalPayment = basePMT - interestPayment;
      if (standardCapitalPayment < 0) standardCapitalPayment = 0;

      let totalCapitalPayment = standardCapitalPayment + extra;

      // Si el capital excede el saldo restante, ajustamos el último pago
      if (totalCapitalPayment >= currentBalance) {
        totalCapitalPayment = currentBalance;
      }

      const totalMonthlyPayment = interestPayment + totalCapitalPayment;
      currentBalance = Math.max(0, currentBalance - totalCapitalPayment);

      totalInterest += interestPayment;
      totalPaid += totalMonthlyPayment;

      schedule.push({
        period,
        payment: totalMonthlyPayment,
        capital: totalCapitalPayment,
        interest: interestPayment,
        balance: currentBalance,
        isExtra: extra > 0
      });

      period++;
    }

    return {
      schedule,
      totalInterestPaid: totalInterest,
      totalAmountPaid: totalPaid,
      totalPeriods: schedule.length,
      originalPMT: basePMT
    };
  }

  /**
   * Simula la aceleración y calcula el ahorro neto en intereses y tiempo
   */
  static simulateDebtAcceleration(principal, monthlyRate, totalTerms, extraMonthlyPayment) {
    const baseResult = this.generateAmortizationSchedule(principal, monthlyRate, totalTerms, 0);
    const acceleratedResult = this.generateAmortizationSchedule(principal, monthlyRate, totalTerms, extraMonthlyPayment);

    const monthsSaved = Math.max(0, baseResult.totalPeriods - acceleratedResult.totalPeriods);
    const interestSaved = Math.max(0, baseResult.totalInterestPaid - acceleratedResult.totalInterestPaid);
    const totalSaved = Math.max(0, baseResult.totalAmountPaid - acceleratedResult.totalAmountPaid);

    return {
      base: baseResult,
      accelerated: acceleratedResult,
      monthsSaved,
      interestSaved,
      totalSaved,
      extraMonthlyPayment
    };
  }
}

/**
 * CLASE PRINCIPAL DE LA APLICACIÓN
 */
class FinanceApp {
  constructor() {
    this.STORAGE_KEY = 'family_finance_data_v1';
    this.state = this.loadInitialState();
    this.charts = {};
    this.tempAttachment = null;
    this.activeDebtSimulationId = null;
    this.activeDebtSimulatorValue = 20000;
    this.activeDebtScheduleView = 'accelerated';

    this.init();
  }

  loadInitialState() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.currentMonth) parsed.currentMonth = this.getSystemMonth();
        return parsed;
      } catch (e) {
        console.error('Error al recuperar datos locales:', e);
      }
    }

    const defaultMonth = this.getSystemMonth();
    return {
      settings: {
        householdName: 'Familia Gómez Rico',
        currency: '$',
        darkMode: false,
      },
      currentMonth: defaultMonth,
      currentTab: 'dashboard',
      people: [
        { id: 'p_1', name: 'Alex Gómez', income: 4500000, color: '#4F46E5' },
        { id: 'p_2', name: 'Esposa', income: 3200000, color: '#10B981' },
      ],
      obligations: [
        {
          id: 'ob_1',
          name: 'Alquiler de Vivienda',
          category: 'Vivienda',
          type: 'expense',
          amount: 1500000,
          responsible: 'shared',
        },
        {
          id: 'ob_2',
          name: 'Servicios Públicos (Luz, Agua, Gas, Internet)',
          category: 'Servicios Públicos',
          type: 'expense',
          amount: 450000,
          responsible: 'shared',
        },
        {
          id: 'ob_3',
          name: 'Mercado y Alimentación Familiar',
          category: 'Alimentación y Mercado',
          type: 'expense',
          amount: 1200000,
          responsible: 'shared',
        },
        {
          id: 'ob_4',
          name: 'Crédito Vehicular',
          category: 'Pago de Deuda',
          type: 'debt',
          amount: 680000,
          responsible: 'p_1',
          debtDetails: {
            purpose: 'Crédito Vehicular',
            principal: 25000000,
            rate: 18.5,
            rateType: 'EA',
            term: 48,
            paidTerms: 8
          }
        },
        {
          id: 'ob_5',
          name: 'Fondo de Emergencia Familiar',
          category: 'Ahorro e Inversión',
          type: 'savings',
          amount: 800000,
          responsible: 'shared',
        }
      ],
      payments: {
        [defaultMonth]: [
          {
            id: 'pay_1',
            obligationId: 'ob_1',
            status: 'paid',
            date: `${defaultMonth}-05`,
            time: '10:30',
            paidBy: 'p_1',
            amount: 1500000,
            notes: 'Transferencia realizada con éxito',
            attachment: null,
          },
          {
            id: 'pay_2',
            obligationId: 'ob_2',
            status: 'pending',
            date: '',
            time: '',
            paidBy: '',
            amount: 450000,
            notes: 'Vence el día 18',
            attachment: null,
          },
          {
            id: 'pay_3',
            obligationId: 'ob_3',
            status: 'paid',
            date: `${defaultMonth}-02`,
            time: '16:45',
            paidBy: 'p_2',
            amount: 1200000,
            notes: 'Compras supermercado quincenal',
            attachment: null,
          },
          {
            id: 'pay_4',
            obligationId: 'ob_4',
            status: 'pending',
            date: '',
            time: '',
            paidBy: 'p_1',
            amount: 680000,
            notes: 'Cuota mensual bancaria',
            attachment: null,
          },
          {
            id: 'pay_5',
            obligationId: 'ob_5',
            status: 'paid',
            date: `${defaultMonth}-01`,
            time: '09:00',
            paidBy: 'p_1',
            amount: 800000,
            notes: 'Ahorro programado',
            attachment: null,
          }
        ]
      }
    };
  }

  getSystemMonth() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error al guardar datos:', e);
      alert('Atención: El almacenamiento local está lleno. Libere espacio o descargue una copia de seguridad.');
    }
  }

  init() {
    this.applyTheme(this.state.settings.darkMode);
    this.setupEventListeners();
    this.ensurePaymentsForCurrentMonth();
    this.renderCurrentMonthDisplay();
    this.render();
  }

  applyTheme(isDark) {
    this.state.settings.darkMode = isDark;
    const body = document.body;
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (isDark) {
      body.classList.add('dark-mode');
      if (sunIcon) sunIcon.classList.remove('hidden');
      if (moonIcon) moonIcon.classList.add('hidden');
    } else {
      body.classList.remove('dark-mode');
      if (sunIcon) sunIcon.classList.add('hidden');
      if (moonIcon) moonIcon.classList.remove('hidden');
    }
    this.saveState();
  }

  setupEventListeners() {
    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.applyTheme(!this.state.settings.darkMode);
        this.renderCharts();
      });
    }

    // Navigation Items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
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

    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

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

  formatMoney(val) {
    const num = parseFloat(val) || 0;
    const curr = this.state.settings.currency || '$';
    if (num % 1 === 0) {
      return `${curr}${num.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`;
    }
    return `${curr}${num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Cálculos Financieros Generales
  getTotalIncome() {
    return this.state.people.reduce((acc, p) => acc + (parseFloat(p.income) || 0), 0);
  }

  getPersonSharePercentage(personId) {
    const total = this.getTotalIncome();
    if (total === 0) return 0;
    const person = this.state.people.find(p => p.id === personId);
    return person ? ((parseFloat(person.income) || 0) / total) * 100 : 0;
  }

  calculateFinancialHealth() {
    const totalIncome = this.getTotalIncome();
    const currentMonthPayments = this.state.payments[this.state.currentMonth] || [];

    let totalExpenses = 0;
    let totalSavings = 0;
    let totalDebts = 0;
    let needsExpenses = 0;
    let wantsExpenses = 0;

    let totalFinishedDebts = 0;
    let totalFinishedDebtAmount = 0;
    let monthlyCashflowLiberated = 0;
    const finishedDebtsList = [];

    this.state.obligations.forEach(ob => {
      const amount = parseFloat(ob.amount) || 0;
      
      if (ob.status === 'finished') {
        if (ob.type === 'debt') {
          totalFinishedDebts++;
          const principal = ob.debtDetails?.principal || 0;
          totalFinishedDebtAmount += (principal > 0 ? principal : amount);
          monthlyCashflowLiberated += amount;
          finishedDebtsList.push(ob);
        }
        return; // Skip from active budget calculations
      }

      if (ob.type === 'savings') {
        totalSavings += amount;
      } else if (ob.type === 'debt') {
        totalDebts += amount;
      } else {
        totalExpenses += amount;
        if (['Vivienda', 'Servicios Públicos', 'Alimentación y Mercado', 'Salud y Medicina', 'Transporte', 'Seguros'].includes(ob.category)) {
          needsExpenses += amount;
        } else {
          wantsExpenses += amount;
        }
      }
    });

    const totalOutflow = totalExpenses + totalDebts + totalSavings;
    const remaining = totalIncome - totalOutflow;

    const dtiRatio = totalIncome > 0 ? (totalDebts / totalIncome) * 100 : 0;
    const savingsRatio = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
    const needsRatio = totalIncome > 0 ? (needsExpenses / totalIncome) * 100 : 0;
    const wantsRatio = totalIncome > 0 ? (wantsExpenses / totalIncome) * 100 : 0;
    const savingsAndDebtsRatio = totalIncome > 0 ? ((totalSavings + totalDebts) / totalIncome) * 100 : 0;

    let statusText = 'Saludable';
    let statusClass = 'badge-paid';
    let statusDesc = 'Sus ingresos cubren cómodamente los gastos y metas de ahorro.';

    if (totalIncome === 0) {
      statusText = 'Sin Ingresos';
      statusClass = 'badge-pending';
      statusDesc = 'Registre los ingresos de los integrantes del hogar.';
    } else if (remaining < 0) {
      statusText = 'Déficit';
      statusClass = 'badge-expense';
      statusDesc = 'Los compromisos mensuales superan los ingresos totales.';
    } else if (dtiRatio > 35) {
      statusText = 'Alerta de Deuda';
      statusClass = 'badge-pending';
      statusDesc = 'El porcentaje de deudas supera el límite prudencial (30%).';
    } else if (savingsRatio < 10) {
      statusText = 'Ajustado';
      statusClass = 'badge-pending';
      statusDesc = 'El margen de ahorro es inferior al 10% recomendado.';
    }

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalDebts,
      totalOutflow,
      remaining,
      dtiRatio,
      savingsRatio,
      needsRatio,
      wantsRatio,
      savingsAndDebtsRatio,
      statusText,
      statusClass,
      statusDesc,
      totalFinishedDebts,
      totalFinishedDebtAmount,
      monthlyCashflowLiberated,
      finishedDebtsList
    };
  }

  generateFinancialDiagnosis(calcs) {
    let score = 100;
    const criticals = [];
    const strengths = [];
    const advice = [];
    const curr = this.state.settings.currency;

    if (calcs.totalIncome === 0) {
      return {
        score: 0,
        criticals: ['No se han registrado ingresos familiares.'],
        strengths: [],
        advice: [{ title: 'Registro Inicial', text: 'Ingrese los integrantes y sus sueldos mensuales para activar el análisis.' }]
      };
    }

    // 1. Evaluación de Flujo de Caja (Superávit / Déficit)
    if (calcs.remaining < 0) {
      score -= 35;
      criticals.push(`Déficit Presupuestal Mensual: Faltan ${this.formatMoney(Math.abs(calcs.remaining))} para cubrir los compromisos del mes.`);
      advice.push({
        title: 'Plan de Choque Inmediato',
        text: 'Ajuste los gastos de estilo de vida no esenciales (entretenimiento, compras discrecionales) hasta nivelar el flujo de caja positivo.'
      });
    } else if (calcs.remaining === 0) {
      score -= 15;
      criticals.push('Presupuesto al Límite: El hogar gasta exactamente el 100% de lo que ingresa sin colchón de imprevistos.');
      advice.push({
        title: 'Crear Colchón Operativo',
        text: 'Procure dejar un margen libre de al menos el 5% de los ingresos para imprevistos menores de liquidez diaria.'
      });
    } else {
      strengths.push(`Superávit Operativo Positivo: El hogar conserva un margen libre mensual de ${this.formatMoney(calcs.remaining)}.`);
    }

    // 2. Evaluación de Endeudamiento (DTI)
    if (calcs.dtiRatio > 35) {
      score -= 25;
      criticals.push(`Nivel de Endeudamiento Crítico (DTI: ${calcs.dtiRatio.toFixed(1)}%): Se encuentra por encima del umbral máximo de seguridad financiera (&le; 30%).`);
      advice.push({
        title: 'Estrategia de Desendeudamiento Acelerado',
        text: 'Utilice el simulador de amortización en el módulo de obligaciones para programar abonos extraordinarios a capital y reducir el plazo de sus créditos.'
      });
    } else if (calcs.dtiRatio > 30) {
      score -= 10;
      criticals.push(`Nivel de Deuda Elevado: El ${calcs.dtiRatio.toFixed(1)}% de los ingresos se destina a deudas. Mantener monitoreo estricto.`);
    } else if (calcs.dtiRatio > 0) {
      strengths.push(`Endeudamiento Saludable: Las deudas representan el ${calcs.dtiRatio.toFixed(1)}% de los ingresos, dentro del margen prudencial (&le; 30%).`);
    } else {
      strengths.push('Hogar Libre de Deudas Financieras: El 100% de los ingresos se destina al sustento, bienestar y capitalización.');
    }

    // Evaluación de Deudas Finalizadas (Elogio personalizado)
    if (calcs.totalFinishedDebts > 0) {
      score = Math.min(100, score + 10); // Bonus por desendeudamiento
      let praiseDetails = '';
      calcs.finishedDebtsList.forEach(ob => {
        let personPraise = 'la familia';
        if (ob.responsible !== 'shared') {
          const p = this.state.people.find(x => x.id === ob.responsible);
          if (p) personPraise = p.name;
        }
        praiseDetails += `<li>👏 <strong>${ob.name}:</strong> Felicidades a <strong>${personPraise}</strong> por cancelar esta deuda, liberando ${this.formatMoney(ob.amount)}/mes.</li>`;
      });
      
      strengths.push(`
        <strong>🏆 ¡Logro de Desendeudamiento!</strong> Han liquidado históricamente ${calcs.totalFinishedDebts} deudas por un valor estimado de ${this.formatMoney(calcs.totalFinishedDebtAmount)}, liberando un total de ${this.formatMoney(calcs.monthlyCashflowLiberated)} de flujo de caja mensual.
        <ul style="margin-top: 5px; list-style: none; padding-left: 0;">${praiseDetails}</ul>
      `);
    }

    // 3. Evaluación de Tasa de Ahorro e Inversión
    if (calcs.savingsRatio >= 20) {
      strengths.push(`Tasa de Ahorro Excelente: El hogar ahorra/invierte el ${calcs.savingsRatio.toFixed(1)}% de sus ingresos, cumpliendo la meta estándar de independencia financiera.`);
    } else if (calcs.savingsRatio >= 10) {
      strengths.push(`Hábito de Ahorro Positivo: El hogar destina el ${calcs.savingsRatio.toFixed(1)}% al ahorro.`);
      advice.push({
        title: 'Optimización de la Tasa de Ahorro',
        text: `Intente incrementar gradualmente su ahorro del ${calcs.savingsRatio.toFixed(1)}% al 20% destinando una porción de bonificaciones o reduciendo gastos hormiga.`
      });
    } else if (calcs.savingsRatio > 0) {
      score -= 10;
      criticals.push(`Ahorro Insuficiente: Solo se destina el ${calcs.savingsRatio.toFixed(1)}% al ahorro. Se recomienda como mínimo el 10% al 20%.`);
    } else {
      score -= 20;
      criticals.push('No hay asignación de ahorro o inversión mensual registrada.');
      advice.push({
        title: 'Regla "Páguese a Usted Primero"',
        text: `Reserve automáticamente al menos el 10% de los ingresos (${this.formatMoney(calcs.totalIncome * 0.1)}) al inicio de cada mes antes de ejecutar los demás gastos.`
      });
    }

    // 4. Diagnóstico Estructural Regla 50/30/20
    advice.push({
      title: 'Diagnóstico Estructural (Regla 50/30/20)',
      text: `Su distribución actual es: Necesidades Básicas ${calcs.needsRatio.toFixed(1)}% (meta: &le; 50%), Estilo de Vida ${calcs.wantsRatio.toFixed(1)}% (meta: &le; 30%), Ahorros/Deudas ${calcs.savingsAndDebtsRatio.toFixed(1)}% (meta: &ge; 20%).`
    });

    score = Math.max(10, Math.min(100, score));

    return {
      score,
      criticals,
      strengths,
      advice
    };
  }

  ensurePaymentsForCurrentMonth() {
    const month = this.state.currentMonth;
    if (!this.state.payments[month]) {
      this.state.payments[month] = [];
    }

    let currentMonthPayments = this.state.payments[month];

    // Remove pending payments for obligations that are now finished
    currentMonthPayments = currentMonthPayments.filter(p => {
      if (p.status !== 'pending') return true; // keep paid ones
      const ob = this.state.obligations.find(o => o.id === p.obligationId);
      if (ob && ob.status === 'finished') return false; // remove pending for finished
      return true;
    });

    this.state.obligations.forEach(ob => {
      if (ob.status === 'finished') return; // Do not create new payments for finished obligations

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

    this.state.payments[month] = currentMonthPayments;
    this.saveState();
  }

  // Renderizado Principal
  render() {
    this.renderDashboard();
    this.renderPeople();
    this.renderObligations();
    this.renderPayments();
    this.renderAdvisorAndStats();
    this.renderSettings();
  }

  renderDashboard() {
    const calcs = this.calculateFinancialHealth();

    const elIncome = document.getElementById('dash-income');
    const elExpenses = document.getElementById('dash-expenses');
    const elRemaining = document.getElementById('dash-remaining');
    const elSavings = document.getElementById('dash-savings');
    const elDebts = document.getElementById('dash-debts');
    const elPill = document.getElementById('dash-status-pill');
    const elDesc = document.getElementById('dash-status-desc');

    if (elIncome) elIncome.textContent = this.formatMoney(calcs.totalIncome);
    if (elExpenses) elExpenses.textContent = this.formatMoney(calcs.totalExpenses);
    if (elRemaining) {
      elRemaining.textContent = this.formatMoney(calcs.remaining);
      elRemaining.style.color = calcs.remaining >= 0 ? 'var(--text-primary)' : 'var(--danger)';
    }
    if (elSavings) elSavings.textContent = this.formatMoney(calcs.totalSavings);
    if (elDebts) elDebts.textContent = this.formatMoney(calcs.totalDebts);

    if (elPill) {
      elPill.textContent = calcs.statusText;
      elPill.className = `status-pill ${calcs.statusClass}`;
    }
    if (elDesc) elDesc.textContent = calcs.statusDesc;

    // Lista de Aportes Familiares
    const peopleList = document.getElementById('dash-people-list');
    if (peopleList) {
      if (this.state.people.length === 0) {
        peopleList.innerHTML = '<p class="muted-text">No hay integrantes registrados.</p>';
      } else {
        peopleList.innerHTML = this.state.people.map(p => {
          const share = this.getPersonSharePercentage(p.id);
          return `
            <div class="person-income-row">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${p.color};"></span>
                <strong>${p.name}</strong>
              </div>
              <div style="text-align: right;">
                <div>${this.formatMoney(p.income)}</div>
                <div class="person-share">${share.toFixed(1)}% del ingreso total</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Obligaciones Pendientes del Mes
    const pendingList = document.getElementById('dash-pending-list');
    if (pendingList) {
      const monthPayments = this.state.payments[this.state.currentMonth] || [];
      const pending = monthPayments.filter(p => p.status === 'pending');

      if (pending.length === 0) {
        pendingList.innerHTML = '<p class="muted-text">¡Excelente! Todas las obligaciones de este mes están pagadas.</p>';
      } else {
        pendingList.innerHTML = pending.map(pay => {
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
                <div class="item-amount">${this.formatMoney(pay.amount)}</div>
              </div>
              <div class="item-footer-actions">
                <button class="btn btn-primary btn-sm" onclick="app.openPaymentModal('${pay.id}')">Registrar Pago</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    this.renderCharts();
  }

  renderPeople() {
    const grid = document.getElementById('people-cards-grid');
    if (!grid) return;

    const curr = this.state.settings.currency;
    if (this.state.people.length === 0) {
      grid.innerHTML = '<p class="muted-text">No hay personas registradas. Haga clic en "Agregar Persona".</p>';
      return;
    }

    grid.innerHTML = this.state.people.map(p => {
      const share = this.getPersonSharePercentage(p.id);
      return `
        <div class="person-card">
          <div class="person-card-header">
            <div class="person-avatar" style="background-color: ${p.color};">
              ${p.name.charAt(0).toUpperCase()}
            </div>
            <div class="person-meta">
              <h4>${p.name}</h4>
              <span class="person-share">Participación en gastos compartidos: ${share.toFixed(1)}%</span>
            </div>
          </div>
          <div class="person-income-row">
            <span>Ingreso Mensual:</span>
            <strong>${curr}${parseFloat(p.income).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div class="person-actions">
            <button class="btn btn-secondary btn-sm" onclick="app.openPersonModal('${p.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="app.deletePerson('${p.id}')">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

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
        html += '<option value="all">Todos</option><option value="shared">Compartido (Proporcional)</option>';
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

  // Render Obligaciones (Con botón interactivo para Deudas)
  renderObligations() {
    const grid = document.getElementById('obligations-cards-grid');
    if (!grid) return;

    const catFilter = document.getElementById('ob-filter-category')?.value || 'all';
    const respFilter = document.getElementById('ob-filter-responsible')?.value || 'all';
    const statusFilter = document.getElementById('ob-filter-status')?.value || 'active';
    const curr = this.state.settings.currency;

    let filtered = this.state.obligations.filter(ob => {
      if (catFilter !== 'all' && ob.category !== catFilter) return false;
      if (respFilter !== 'all' && ob.responsible !== respFilter) return false;
      
      const currentStatus = ob.status || 'active';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;
      
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

      const isFinished = ob.status === 'finished';
      const typeBadge = isFinished ? 'badge-paid' : (ob.type === 'savings' ? 'badge-savings' : (ob.type === 'debt' ? 'badge-debt' : 'badge-expense'));
      const typeLabel = isFinished ? '✓ Finalizada' : (ob.type === 'savings' ? 'Ahorro' : (ob.type === 'debt' ? 'Deuda' : 'Gasto'));

      let debtInfoBadge = '';
      let debtActionBtn = '';

      if (ob.type === 'debt') {
        const dt = ob.debtDetails || {};
        const rateDisplay = dt.rate ? `${dt.rate}% ${dt.rateType || 'E.A.'}` : 'Tasa sin registrar';
        const termDisplay = dt.term ? `${dt.term} cuotas` : '';
        const purposeDisplay = dt.purpose || 'Crédito';

        debtInfoBadge = `
          <div class="debt-extra-badge-info">
            <span>🏷️ ${purposeDisplay} &bull; Tasa: ${rateDisplay} &bull; Plazo: ${termDisplay}</span>
          </div>
        `;

        debtActionBtn = `
          <button class="btn btn-warning btn-sm" onclick="app.openDebtAnalysisModal('${ob.id}')" title="Ver tabla de amortización y simulador de ahorro">
            📊 Amortización & Simulador
          </button>
        `;
      }

      let extraFinishedInfo = '';
      if (isFinished && ob.finishedDate) {
        extraFinishedInfo = `<div class="muted-text" style="font-size: 0.8rem; margin-top: 0.25rem;">Finalizada el: ${ob.finishedDate}</div>`;
      }

      return `
        <div class="item-card ${isFinished ? 'item-card-finished' : ''}">
          <div>
            <div class="item-card-header">
              <div>
                <span class="item-badge ${typeBadge}">${typeLabel}</span>
                <div class="item-title">${ob.name}</div>
                <div class="item-cat">${ob.category}</div>
              </div>
              <div class="item-amount" style="${isFinished ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${curr}${parseFloat(ob.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            </div>
            ${debtInfoBadge}
            <div class="item-details-row" style="margin-top: 0.75rem;">
              <div><strong>Responsable:</strong> ${respName}</div>
              ${respBreakdown ? `<div class="muted-text" style="font-size: 0.8rem; margin-top: 0.25rem;">${respBreakdown}</div>` : ''}
              ${extraFinishedInfo}
            </div>
          </div>
          <div class="item-footer-actions" style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-end;">
            ${debtActionBtn}
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
                <div style="margin-top: 0.5rem;">
                  <button class="btn btn-secondary btn-sm" onclick="app.viewReceipt('${pay.id}')">
                    📎 Ver Comprobante (${pay.attachment.name || 'Archivo'})
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="item-footer-actions">
            <button class="btn btn-primary btn-sm" onclick="app.openPaymentModal('${pay.id}')">
              ${isPaid ? 'Modificar Pago' : 'Registrar Pago'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Asesor y Estadísticas
  renderAdvisorAndStats() {
    const calcs = this.calculateFinancialHealth();
    const diagnosis = this.generateFinancialDiagnosis(calcs);
    const curr = this.state.settings.currency;

    const scoreVal = document.getElementById('advisor-score-val');
    if (scoreVal) scoreVal.textContent = `${diagnosis.score}/100`;

    const ruleVal = document.getElementById('metric-rule-val');
    if (ruleVal) ruleVal.textContent = `${calcs.needsRatio.toFixed(0)}% / ${calcs.wantsRatio.toFixed(0)}% / ${calcs.savingsAndDebtsRatio.toFixed(0)}%`;

    const dtiVal = document.getElementById('metric-dti-val');
    if (dtiVal) {
      dtiVal.textContent = `${calcs.dtiRatio.toFixed(1)}%`;
      dtiVal.style.color = calcs.dtiRatio <= 30 ? 'var(--success)' : 'var(--danger)';
    }

    const savingsVal = document.getElementById('metric-savings-val');
    if (savingsVal) {
      savingsVal.textContent = `${calcs.savingsRatio.toFixed(1)}%`;
      savingsVal.style.color = calcs.savingsRatio >= 15 ? 'var(--success)' : (calcs.savingsRatio > 0 ? 'var(--warning)' : 'var(--danger)');
    }

    const surplusVal = document.getElementById('metric-surplus-val');
    if (surplusVal) {
      surplusVal.textContent = `${curr}${calcs.remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
      surplusVal.style.color = calcs.remaining >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    // Listas de Puntos Críticos y Fortalezas
    const critList = document.getElementById('advisor-critical-list');
    if (critList) {
      if (diagnosis.criticals.length === 0) {
        critList.innerHTML = '<li>No se detectaron alertas críticas en este periodo. ¡Excelente administración!</li>';
      } else {
        critList.innerHTML = diagnosis.criticals.map(c => `<li>${c}</li>`).join('');
      }
    }

    const strList = document.getElementById('advisor-strength-list');
    if (strList) {
      if (diagnosis.strengths.length === 0) {
        strList.innerHTML = '<li>Monitoreando ingresos y distribución de gastos para determinar fortalezas.</li>';
      } else {
        strList.innerHTML = diagnosis.strengths.map(s => `<li>${s}</li>`).join('');
      }
    }

    // Consejos y Plan Estratégico
    const adviceList = document.getElementById('advisor-advice-list');
    if (adviceList) {
      adviceList.innerHTML = diagnosis.advice.map((adv, idx) => `
        <div class="advisor-tip-item">
          <div class="tip-number">${idx + 1}</div>
          <div class="tip-content">
            <strong>${adv.title}:</strong> ${adv.text}
          </div>
        </div>
      `).join('');
    }
  }

  // Render Configuración
  renderSettings() {
    const nameInput = document.getElementById('setting-household-name');
    const currInput = document.getElementById('setting-currency');
    const familyDisp = document.getElementById('app-family-name-display');

    if (nameInput) nameInput.value = this.state.settings.householdName || 'Familia Gómez Rico';
    if (currInput) currInput.value = this.state.settings.currency || '$';
    if (familyDisp) familyDisp.textContent = this.state.settings.householdName || 'Familia Gómez Rico';

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
      title.textContent = 'Editar Integrante';
      idInput.value = p.id;
      nameInput.value = p.name;
      incomeInput.value = p.income;
      colorInput.value = p.color || '#4F46E5';
      colorVal.textContent = p.color || '#4F46E5';
    } else {
      title.textContent = 'Agregar Integrante';
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
    if (!confirm('¿Está seguro de eliminar a este integrante? Se recalcularán automáticamente los aportes compartidos.')) return;
    this.state.people = this.state.people.filter(p => p.id !== id);
    this.saveState();
    this.render();
  }

  // =========================================================
  // GESTIÓN DE OBLIGACIONES & MOTOR CONDICIONAL DE DEUDA
  // =========================================================
  handleObligationTypeChange() {
    const type = document.getElementById('ob-type').value;
    const debtBox = document.getElementById('debt-specific-fields');
    const catSelect = document.getElementById('ob-category');

    if (type === 'debt') {
      debtBox.classList.remove('hidden');
      if (catSelect) catSelect.value = 'Pago de Deuda';
    } else {
      debtBox.classList.add('hidden');
    }
  }

  autoCalculateDebtQuota() {
    const principal = parseFloat(document.getElementById('ob-debt-principal').value) || 0;
    const rate = parseFloat(document.getElementById('ob-debt-rate').value) || 0;
    const rateType = document.getElementById('ob-debt-rate-type').value || 'EA';
    const term = parseInt(document.getElementById('ob-debt-term').value) || 0;
    const hint = document.getElementById('debt-calc-hint');
    const curr = this.state.settings.currency;

    if (principal <= 0 || term <= 0) {
      if (hint) hint.textContent = 'Ingrese monto de capital y plazo en meses para calcular.';
      return;
    }

    const monthlyRate = FinancialEngine.convertRateToMonthly(rate, rateType);
    const pmt = FinancialEngine.calculateFrenchPMT(principal, monthlyRate, term);

    document.getElementById('ob-amount').value = pmt.toFixed(2);
    if (hint) {
      hint.textContent = `Cuota fija calculada: ${curr}${pmt.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa mensual: ${(monthlyRate * 100).toFixed(2)}%)`;
      hint.style.color = 'var(--primary)';
    }
  }

  openObligationModal(id = null) {
    const modal = document.getElementById('modal-obligation');
    const title = document.getElementById('modal-obligation-title');
    const idInput = document.getElementById('ob-id');
    const nameInput = document.getElementById('ob-name');
    const catInput = document.getElementById('ob-category');
    const typeInput = document.getElementById('ob-type');
    const amountInput = document.getElementById('ob-amount');
    const respInput = document.getElementById('ob-responsible');
    const statusInput = document.getElementById('ob-status');
    const finishedDateInput = document.getElementById('ob-finished-date');
    const finishedNotesInput = document.getElementById('ob-finished-notes');

    // Campos de deuda
    const debtPurpose = document.getElementById('ob-debt-purpose');
    const debtPrincipal = document.getElementById('ob-debt-principal');
    const debtRate = document.getElementById('ob-debt-rate');
    const debtRateType = document.getElementById('ob-debt-rate-type');
    const debtTerm = document.getElementById('ob-debt-term');
    const debtPaidTerms = document.getElementById('ob-debt-paid-terms');
    const debtHint = document.getElementById('debt-calc-hint');

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
      
      if (statusInput) statusInput.value = ob.status || 'active';
      if (finishedDateInput) finishedDateInput.value = ob.finishedDate || '';
      if (finishedNotesInput) finishedNotesInput.value = ob.finishedNotes || '';

      const dt = ob.debtDetails || {};
      if (debtPurpose) debtPurpose.value = dt.purpose || 'Libre Inversión / Personal';
      if (debtPrincipal) debtPrincipal.value = dt.principal || ob.amount;
      if (debtRate) debtRate.value = dt.rate || '';
      if (debtRateType) debtRateType.value = dt.rateType || 'EA';
      if (debtTerm) debtTerm.value = dt.term || '';
      if (debtPaidTerms) debtPaidTerms.value = dt.paidTerms || 0;
      if (debtHint) debtHint.textContent = 'Parámetros cargados.';
    } else {
      title.textContent = 'Agregar Obligación';
      idInput.value = '';
      nameInput.value = '';
      catInput.value = 'Vivienda';
      typeInput.value = 'expense';
      amountInput.value = '';
      respInput.value = 'shared';
      
      if (statusInput) statusInput.value = 'active';
      if (finishedDateInput) finishedDateInput.value = '';
      if (finishedNotesInput) finishedNotesInput.value = '';

      if (debtPurpose) debtPurpose.value = 'Crédito Hipotecario / Vivienda';
      if (debtPrincipal) debtPrincipal.value = '';
      if (debtRate) debtRate.value = '';
      if (debtRateType) debtRateType.value = 'EA';
      if (debtTerm) debtTerm.value = '';
      if (debtPaidTerms) debtPaidTerms.value = 0;
      if (debtHint) debtHint.textContent = 'Ingrese capital, tasa y plazo para autocalcular.';
    }

    this.handleObligationTypeChange();
    this.handleObligationStatusChange();

    // Show/hide the quick toggle button in the modal footer
    const toggleBtn = document.getElementById('ob-modal-toggle-btn');
    if (toggleBtn) {
      if (id) {
        const ob = this.state.obligations.find(x => x.id === id);
        const isFinished = ob?.status === 'finished';
        toggleBtn.style.display = 'inline-flex';
        toggleBtn.textContent = isFinished ? '\u21ba Reactivar Deuda' : '\u2713 Marcar Finalizada';
        toggleBtn.className = isFinished ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-success';
        toggleBtn.dataset.obId = id;
      } else {
        toggleBtn.style.display = 'none';
      }
    }

    modal.classList.add('active');
  }

  handleObligationStatusChange() {
    const statusInput = document.getElementById('ob-status');
    const finishedFields = document.getElementById('finished-specific-fields');
    if (!statusInput || !finishedFields) return;

    if (statusInput.value === 'finished') {
      finishedFields.classList.remove('hidden');
    } else {
      finishedFields.classList.add('hidden');
    }
  }

  toggleStatusFromModal() {
    const toggleBtn = document.getElementById('ob-modal-toggle-btn');
    const id = toggleBtn?.dataset.obId;
    if (!id) return;

    const ob = this.state.obligations.find(o => o.id === id);
    if (!ob) return;

    const isCurrentlyFinished = ob.status === 'finished';
    const newStatus = isCurrentlyFinished ? 'active' : 'finished';
    const msg = isCurrentlyFinished
      ? `¿Reactivar "${ob.name}"? Volverá a contar en el presupuesto mensual.`
      : `¿Marcar "${ob.name}" como finalizada/pagada? Dejará de contar en el presupuesto pero quedará en el historial.`;

    if (confirm(msg)) {
      ob.status = newStatus;
      if (newStatus === 'finished' && !ob.finishedDate) {
        ob.finishedDate = new Date().toISOString().split('T')[0];
      }
      this.ensurePaymentsForCurrentMonth();
      this.saveState();
      this.closeModal('modal-obligation');
      this.render();
    }
  }

  saveObligation(e) {
    e.preventDefault();
    const id = document.getElementById('ob-id').value;
    const name = document.getElementById('ob-name').value.trim();
    const category = document.getElementById('ob-category').value;
    const type = document.getElementById('ob-type').value;
    const amount = parseFloat(document.getElementById('ob-amount').value) || 0;
    const responsible = document.getElementById('ob-responsible').value;
    
    const status = document.getElementById('ob-status')?.value || 'active';
    const finishedDate = document.getElementById('ob-finished-date')?.value || '';
    const finishedNotes = document.getElementById('ob-finished-notes')?.value || '';

    if (!name || amount <= 0) return;

    let debtDetails = null;
    if (type === 'debt') {
      const principal = parseFloat(document.getElementById('ob-debt-principal').value) || amount;
      const rate = parseFloat(document.getElementById('ob-debt-rate').value) || 0;
      const rateType = document.getElementById('ob-debt-rate-type').value || 'EA';
      const term = parseInt(document.getElementById('ob-debt-term').value) || 12;
      const paidTerms = parseInt(document.getElementById('ob-debt-paid-terms').value) || 0;
      const purpose = document.getElementById('ob-debt-purpose').value || 'Crédito';

      debtDetails = { purpose, principal, rate, rateType, term, paidTerms };
    }

    const obData = { id: id || ('ob_' + Math.random().toString(36).substr(2, 9)), name, category, type, amount, responsible, status, finishedDate, finishedNotes, debtDetails };

    if (id) {
      const idx = this.state.obligations.findIndex(o => o.id === id);
      if (idx !== -1) {
        this.state.obligations[idx] = obData;
      }
    } else {
      this.state.obligations.push(obData);
    }

    this.ensurePaymentsForCurrentMonth();
    this.saveState();
    this.closeModal('modal-obligation');
    this.render();
  }

  toggleObligationStatus(id) {
    const ob = this.state.obligations.find(o => o.id === id);
    if (!ob) return;

    const isCurrentlyFinished = ob.status === 'finished';
    const newStatus = isCurrentlyFinished ? 'active' : 'finished';
    const msg = isCurrentlyFinished 
      ? `¿Reactivar la obligación "${ob.name}"? Volverá a generar cobros mensuales.`
      : `¿Marcar "${ob.name}" como finalizada/pagada? Dejará de generar cobros mensuales pero se conservará en el historial.`;

    if (confirm(msg)) {
      ob.status = newStatus;
      if (newStatus === 'finished' && !ob.finishedDate) {
        ob.finishedDate = new Date().toISOString().split('T')[0];
      }
      this.ensurePaymentsForCurrentMonth();
      this.saveState();
      this.render();
    }
  }

  deleteObligation(id) {
    if (!confirm('¿Está seguro de eliminar esta obligación?')) return;
    this.state.obligations = this.state.obligations.filter(o => o.id !== id);
    const month = this.state.currentMonth;
    if (this.state.payments[month]) {
      this.state.payments[month] = this.state.payments[month].filter(p => p.obligationId !== id);
    }
    this.saveState();
    this.render();
  }

  // =========================================================
  // MODAL DE ANÁLISIS DE DEUDA, AMORTIZACIÓN Y SIMULADOR
  // =========================================================
  openDebtAnalysisModal(obligationId) {
    const ob = this.state.obligations.find(o => o.id === obligationId);
    if (!ob) return;

    this.activeDebtSimulationId = obligationId;
    this.activeDebtSimulatorValue = 20000;
    this.activeDebtScheduleView = 'accelerated';

    const modal = document.getElementById('modal-debt-analysis');
    const titleEl = document.getElementById('debt-analysis-title');
    const badgeEl = document.getElementById('debt-analysis-badge');
    const simInput = document.getElementById('sim-extra-payment-input');

    if (titleEl) titleEl.textContent = `${ob.name}`;
    if (badgeEl) badgeEl.textContent = ob.debtDetails?.purpose || 'Crédito Financiero';
    if (simInput) simInput.value = this.activeDebtSimulatorValue;

    this.renderDebtAnalysisDetails(ob);
    modal.classList.add('active');
  }

  renderDebtAnalysisDetails(ob) {
    const curr = this.state.settings.currency;
    const dt = ob.debtDetails || {
      purpose: ob.name,
      principal: ob.amount * 12,
      rate: 18.5,
      rateType: 'EA',
      term: 36,
      paidTerms: 0
    };

    const monthlyRate = FinancialEngine.convertRateToMonthly(dt.rate, dt.rateType);
    const sim = FinancialEngine.simulateDebtAcceleration(dt.principal, monthlyRate, dt.term, this.activeDebtSimulatorValue);

    // Actualizar KPIs superiores
    const kpiPrincipal = document.getElementById('debt-kpi-principal');
    const kpiPurpose = document.getElementById('debt-kpi-purpose');
    const kpiRate = document.getElementById('debt-kpi-rate');
    const kpiRateMonthly = document.getElementById('debt-kpi-rate-monthly');
    const kpiQuota = document.getElementById('debt-kpi-quota');
    const kpiTerms = document.getElementById('debt-kpi-terms');
    const kpiInterest = document.getElementById('debt-kpi-interest');
    const kpiTotalCost = document.getElementById('debt-kpi-total-cost');

    if (kpiPrincipal) kpiPrincipal.textContent = `${curr}${dt.principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    if (kpiPurpose) kpiPurpose.textContent = `Destino: ${dt.purpose || 'No especificado'}`;
    if (kpiRate) kpiRate.textContent = `${dt.rate}% ${dt.rateType || 'E.A.'}`;
    if (kpiRateMonthly) kpiRateMonthly.textContent = `Equivalente: ${(monthlyRate * 100).toFixed(2)}% M.V.`;
    if (kpiQuota) kpiQuota.textContent = `${curr}${sim.base.originalPMT.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    if (kpiTerms) kpiTerms.textContent = `${dt.paidTerms || 0} de ${dt.term} cuotas pagadas`;
    if (kpiInterest) kpiInterest.textContent = `${curr}${sim.base.totalInterestPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    if (kpiTotalCost) kpiTotalCost.textContent = `Costo total crédito: ${curr}${sim.base.totalAmountPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

    // Actualizar Banner de Resultados del Simulador
    const simMonthsText = document.getElementById('sim-months-saved-text');
    const simNewTermText = document.getElementById('sim-new-term-text');
    const simInterestSaved = document.getElementById('sim-interest-saved-val');
    const simRoiText = document.getElementById('sim-roi-text');

    if (simMonthsText) {
      if (sim.monthsSaved > 0) {
        simMonthsText.textContent = `¡Terminas ${sim.monthsSaved} meses antes!`;
      } else {
        simMonthsText.textContent = `Sin reducción de cuotas`;
      }
    }

    if (simNewTermText) {
      simNewTermText.textContent = `Pagas en ${sim.accelerated.totalPeriods} cuotas en lugar de ${sim.base.totalPeriods}`;
    }

    if (simInterestSaved) {
      simInterestSaved.textContent = `${curr}${sim.interestSaved.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    }

    if (simRoiText) {
      if (this.activeDebtSimulatorValue > 0 && sim.interestSaved > 0) {
        simRoiText.textContent = `Ahorro neto total no pagado al banco. ¡Excelente optimización!`;
      } else {
        simRoiText.textContent = `Aumente el abono extra para proyectar el ahorro.`;
      }
    }

    // Renderizar Gráfico de Amortización
    this.renderDebtAmortizationChart(sim);

    // Renderizar Tabla de Amortización
    this.renderDebtAmortizationTable(sim);
  }

  onDebtSimulatorInputChange(value) {
    this.activeDebtSimulatorValue = parseFloat(value) || 0;
    this.updatePresetActiveButton();
    const ob = this.state.obligations.find(o => o.id === this.activeDebtSimulationId);
    if (ob) this.renderDebtAnalysisDetails(ob);
  }

  setDebtSimulatorPreset(amount) {
    this.activeDebtSimulatorValue = amount;
    const input = document.getElementById('sim-extra-payment-input');
    if (input) input.value = amount;
    this.updatePresetActiveButton();
    const ob = this.state.obligations.find(o => o.id === this.activeDebtSimulationId);
    if (ob) this.renderDebtAnalysisDetails(ob);
  }

  updatePresetActiveButton() {
    document.querySelectorAll('.btn-preset').forEach(btn => {
      const match = btn.textContent.replace(/[^0-9]/g, '');
      if (parseInt(match) === this.activeDebtSimulatorValue) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  switchDebtScheduleView(viewType) {
    this.activeDebtScheduleView = viewType;
    const btnAcc = document.getElementById('tab-btn-accelerated');
    const btnNorm = document.getElementById('tab-btn-normal');

    if (viewType === 'accelerated') {
      btnAcc?.classList.add('active');
      btnNorm?.classList.remove('active');
    } else {
      btnNorm?.classList.add('active');
      btnAcc?.classList.remove('active');
    }

    const ob = this.state.obligations.find(o => o.id === this.activeDebtSimulationId);
    if (ob) this.renderDebtAnalysisDetails(ob);
  }

  renderDebtAmortizationTable(sim) {
    const tbody = document.getElementById('debt-amortization-tbody');
    if (!tbody) return;

    const curr = this.state.settings.currency;
    const activeSchedule = this.activeDebtScheduleView === 'accelerated' ? sim.accelerated.schedule : sim.base.schedule;

    if (!activeSchedule || activeSchedule.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted-text">No hay datos de amortización disponibles.</td></tr>';
      return;
    }

    tbody.innerHTML = activeSchedule.map(row => `
      <tr>
        <td><strong>Mes ${row.period}</strong></td>
        <td>${curr}${row.payment.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td><span style="color: var(--success); font-weight: 600;">+${curr}${row.capital.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
        <td><span style="color: var(--danger);">${curr}${row.interest.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
        <td><strong>${curr}${row.balance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
      </tr>
    `).join('');
  }

  renderDebtAmortizationChart(sim) {
    const canvas = document.getElementById('debt-amortization-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (this.charts['debtAmortization']) {
      this.charts['debtAmortization'].destroy();
    }

    const maxPeriods = Math.max(sim.base.schedule.length, sim.accelerated.schedule.length);
    const labels = Array.from({ length: maxPeriods }, (_, i) => `Mes ${i + 1}`);

    const baseData = labels.map((_, i) => {
      const row = sim.base.schedule[i];
      return row ? row.balance : 0;
    });

    const acceleratedData = labels.map((_, i) => {
      const row = sim.accelerated.schedule[i];
      return row ? row.balance : 0;
    });

    this.charts['debtAmortization'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Plan Normal (Saldo)',
            data: baseData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderDash: [5, 5],
            tension: 0.2,
            fill: false
          },
          {
            label: 'Plan Acelerado (Saldo con Abono Extra)',
            data: acceleratedData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            tension: 0.2,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 14 } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => `${this.state.settings.currency}${v.toLocaleString('es-ES')}`
            }
          }
        }
      }
    });
  }

  printCurrentDebtReport() {
    const ob = this.state.obligations.find(o => o.id === this.activeDebtSimulationId);
    if (!ob) return;

    const curr = this.state.settings.currency;
    const dt = ob.debtDetails || {
      purpose: ob.name,
      principal: ob.amount * 12,
      rate: 18.5,
      rateType: 'EA',
      term: 36,
      paidTerms: 0
    };

    const monthlyRate = FinancialEngine.convertRateToMonthly(dt.rate, dt.rateType);
    const sim = FinancialEngine.simulateDebtAcceleration(dt.principal, monthlyRate, dt.term, this.activeDebtSimulatorValue);

    document.getElementById('print-debt-date').innerHTML = `<strong>Fecha de Informe:</strong> ${new Date().toLocaleDateString('es-ES')}`;
    document.getElementById('print-debt-name-title').textContent = `1. Resumen: ${ob.name} (${dt.purpose || 'Deuda'})`;

    const summaryTbody = document.getElementById('print-debt-summary-tbody');
    if (summaryTbody) {
      summaryTbody.innerHTML = `
        <tr><td><strong>Capital Inicial:</strong></td><td>${curr}${dt.principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td><td><strong>Tasa de Interés:</strong></td><td>${dt.rate}% ${dt.rateType} (Tasa mes: ${(monthlyRate * 100).toFixed(2)}%)</td></tr>
        <tr><td><strong>Plazo Original:</strong></td><td>${dt.term} meses</td><td><strong>Cuota Normal Fija:</strong></td><td>${curr}${sim.base.originalPMT.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td></tr>
        <tr><td><strong>Intereses Normales Totales:</strong></td><td>${curr}${sim.base.totalInterestPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td><td><strong>Costo Total Crédito:</strong></td><td>${curr}${sim.base.totalAmountPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td></tr>
      `;
    }

    const stratBox = document.getElementById('print-debt-strategy-box');
    if (stratBox) {
      stratBox.innerHTML = `
        <h4>⚡ Plan de Pago Acelerado con Abono Extra de ${curr}${this.activeDebtSimulatorValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })} / mes:</h4>
        <ul>
          <li><strong>Tiempo de Pago Reducido:</strong> Termina en <strong>${sim.accelerated.totalPeriods} meses</strong> en lugar de ${sim.base.totalPeriods} meses (Ahorro de ${sim.monthsSaved} meses).</li>
          <li><strong>Ahorro Total en Intereses:</strong> <strong>${curr}${sim.interestSaved.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong> que no se le pagarán a la entidad financiera.</li>
          <li><strong>Nuevo Desembolso Total:</strong> ${curr}${sim.accelerated.totalAmountPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })} en lugar de ${curr}${sim.base.totalAmountPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })}.</li>
        </ul>
      `;
    }

    const schedTbody = document.getElementById('print-debt-schedule-tbody');
    if (schedTbody) {
      schedTbody.innerHTML = sim.accelerated.schedule.map(row => `
        <tr>
          <td>Mes ${row.period}</td>
          <td>${curr}${row.payment.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
          <td>${curr}${row.capital.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
          <td>${curr}${row.interest.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
          <td>${curr}${row.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');
    }

    const printElem = document.getElementById('printable-debt-report');
    if (printElem) {
      printElem.classList.add('print-active');
      window.print();
      setTimeout(() => printElem.classList.remove('print-active'), 800);
    }
  }

  // =========================================================
  // GESTIÓN DE PAGOS & COMPROBANTES
  // =========================================================
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

    if (!this.tempAttachment) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="attachment-preview-item">
        <span>📄 ${this.tempAttachment.name}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="app.removeAttachment()">Quitar</button>
      </div>
    `;
  }

  removeAttachment() {
    this.tempAttachment = null;
    this.renderAttachmentPreview();
    const fileInput = document.getElementById('pay-attachment-input');
    if (fileInput) fileInput.value = '';
  }

  savePayment(e) {
    e.preventDefault();
    const payId = document.getElementById('pay-id').value;
    const status = document.getElementById('pay-status').value;
    const date = document.getElementById('pay-date').value;
    const time = document.getElementById('pay-time').value;
    const paidBy = document.getElementById('pay-paid-by').value;
    const amount = parseFloat(document.getElementById('pay-amount').value) || 0;
    const notes = document.getElementById('pay-notes').value.trim();

    const monthPayments = this.state.payments[this.state.currentMonth] || [];
    const idx = monthPayments.findIndex(p => p.id === payId);

    if (idx !== -1) {
      monthPayments[idx] = {
        ...monthPayments[idx],
        status,
        date: status === 'paid' ? date : '',
        time: status === 'paid' ? time : '',
        paidBy: status === 'paid' ? paidBy : '',
        amount,
        notes,
        attachment: this.tempAttachment
      };
    }

    this.saveState();
    this.closeModal('modal-payment');
    this.render();
  }

  viewReceipt(paymentId) {
    const monthPayments = this.state.payments[this.state.currentMonth] || [];
    const pay = monthPayments.find(p => p.id === paymentId);
    if (!pay || !pay.attachment) return;

    const modal = document.getElementById('modal-receipt-view');
    const container = document.getElementById('receipt-viewer-content');
    const dlBtn = document.getElementById('receipt-download-btn');
    const att = pay.attachment;

    if (att.type.startsWith('image/')) {
      container.innerHTML = `<img src="${att.data}" alt="Comprobante de Pago">`;
    } else if (att.type === 'application/pdf') {
      container.innerHTML = `<iframe src="${att.data}"></iframe>`;
    } else {
      container.innerHTML = `<p style="color: white;">Vista previa no disponible para este formato.</p>`;
    }

    if (dlBtn) {
      dlBtn.href = att.data;
      dlBtn.download = att.name || 'comprobante';
    }

    modal.classList.add('active');
  }

  // =========================================================
  // GENERACIÓN DE INFORME IMPRIMIBLE GENERAL (PDF)
  // =========================================================
  generatePrintReport() {
    const calcs = this.calculateFinancialHealth();
    const diagnosis = this.generateFinancialDiagnosis(calcs);
    const curr = this.state.settings.currency;
    const monthPayments = this.state.payments[this.state.currentMonth] || [];

    // Metadatos
    document.getElementById('print-family-name').textContent = this.state.settings.householdName || 'Familia Gómez Rico';
    document.getElementById('print-report-month').textContent = this.formatMonthDisplay(this.state.currentMonth);
    document.getElementById('print-report-date').textContent = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    // Tabla 1: Resumen
    const summaryTbody = document.getElementById('print-summary-tbody');
    summaryTbody.innerHTML = `
      <tr>
        <td><strong>Ingresos Totales del Hogar</strong></td>
        <td><strong>${curr}${calcs.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></td>
        <td>100.0%</td>
        <td><span style="color: green;">Cobrado / Proyectado</span></td>
      </tr>
      <tr>
        <td>Gastos Habituales y Necesidades</td>
        <td>${curr}${calcs.totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
        <td>${calcs.totalIncome > 0 ? ((calcs.totalExpenses / calcs.totalIncome) * 100).toFixed(1) : 0}%</td>
        <td>Presupuestado</td>
      </tr>
      <tr>
        <td>Pago de Deudas y Créditos</td>
        <td>${curr}${calcs.totalDebts.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
        <td>${calcs.dtiRatio.toFixed(1)}%</td>
        <td>${calcs.dtiRatio > 30 ? 'Requiere Atención' : 'Adecuado'}</td>
      </tr>
      <tr>
        <td>Metas de Ahorro e Inversión</td>
        <td>${curr}${calcs.totalSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
        <td>${calcs.savingsRatio.toFixed(1)}%</td>
        <td>${calcs.savingsRatio >= 15 ? 'Excelente' : 'Por Mejorar'}</td>
      </tr>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td>Superávit / Margen Libre Restante</td>
        <td style="color: ${calcs.remaining >= 0 ? 'green' : 'red'};">${curr}${calcs.remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
        <td>${calcs.totalIncome > 0 ? ((calcs.remaining / calcs.totalIncome) * 100).toFixed(1) : 0}%</td>
        <td>${calcs.statusText}</td>
      </tr>
    `;

    // Tabla 2: Personas
    const peopleTbody = document.getElementById('print-people-tbody');
    peopleTbody.innerHTML = this.state.people.map(p => {
      const share = this.getPersonSharePercentage(p.id);
      return `
        <tr>
          <td>${p.name}</td>
          <td>${curr}${parseFloat(p.income).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
          <td>${share.toFixed(1)}%</td>
        </tr>
      `;
    }).join('');

    // Tabla 3: Obligaciones y Pagos
    const obTbody = document.getElementById('print-obligations-tbody');
    obTbody.innerHTML = this.state.obligations.map(ob => {
      const pay = monthPayments.find(p => p.obligationId === ob.id);
      const isPaid = pay && pay.status === 'paid';
      const typeLabel = ob.type === 'savings' ? 'Ahorro' : (ob.type === 'debt' ? 'Deuda' : 'Gasto');
      
      let respName = 'Compartido';
      if (ob.responsible !== 'shared') {
        const p = this.state.people.find(x => x.id === ob.responsible);
        respName = p ? p.name : ob.responsible;
      }

      return `
        <tr>
          <td>${ob.name}</td>
          <td>${ob.category}</td>
          <td>${typeLabel}</td>
          <td>${curr}${parseFloat(ob.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
          <td>${respName}</td>
          <td style="font-weight: bold; color: ${isPaid ? 'green' : '#d97706'};">
            ${isPaid ? `Pagado (${pay.date || 'Sin fecha'})` : 'Pendiente'}
          </td>
        </tr>
      `;
    }).join('');

    // Asesor Financiero en PDF
    const advContent = document.getElementById('print-advisor-content');
    advContent.innerHTML = `
      <p><strong>Puntuación de Salud Financiera:</strong> ${diagnosis.score}/100 &bull; <strong>Diagnóstico:</strong> ${calcs.statusDesc}</p>
      <br>
      <h4>Fortalezas Detectadas:</h4>
      <ul>
        ${diagnosis.strengths.map(s => `<li>${s}</li>`).join('')}
      </ul>
      <h4>Puntos Críticos y Alertas:</h4>
      <ul>
        ${diagnosis.criticals.map(c => `<li>${c}</li>`).join('')}
      </ul>
      <h4>Plan Estratégico y Consejos:</h4>
      <ul>
        ${diagnosis.advice.map(a => `<li><strong>${a.title}:</strong> ${a.text}</li>`).join('')}
      </ul>
    `;

    const printElem = document.getElementById('printable-report');
    if (printElem) {
      printElem.classList.add('print-active');
      window.print();
      setTimeout(() => printElem.classList.remove('print-active'), 800);
    }
  }

  // Guardar Configuración General
  saveGeneralSettings(e) {
    e.preventDefault();
    const name = document.getElementById('setting-household-name').value.trim();
    const curr = document.getElementById('setting-currency').value.trim();

    if (name) this.state.settings.householdName = name;
    if (curr) this.state.settings.currency = curr;

    this.saveState();
    alert('Configuración guardada exitosamente.');
    this.render();
  }

  // =========================================================
  // GESTIÓN DE RESPALDOS (JSON BACKUP, RESTORE & SHARE)
  // =========================================================
  openBackupModal() {
    const m = document.getElementById('modal-backup');
    if (m) m.classList.add('active');
  }

  triggerImportFileInput() {
    const input = document.getElementById('import-file-input');
    if (input) {
      input.value = ''; // Reset para permitir seleccionar el mismo archivo
      input.click();
    }
  }

  // Descargar Copia JSON (Compatible con PC y Móviles)
  exportBackup() {
    try {
      const dataStr = JSON.stringify(this.state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      const fileName = `backup_famifinanzas_${today}.json`;
      
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.href = url;
      dlAnchorElem.download = fileName;
      document.body.appendChild(dlAnchorElem);
      dlAnchorElem.click();
      document.body.removeChild(dlAnchorElem);
      
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error('Error al exportar JSON:', err);
      alert('Hubo un inconveniente al generar la descarga. Intente la opción de copiar texto.');
    }
  }

  // Compartir Respaldo vía Web Share API (WhatsApp, Drive, Email en Celular)
  async shareBackup() {
    const dataStr = JSON.stringify(this.state, null, 2);
    const today = new Date().toISOString().split('T')[0];
    const fileName = `backup_famifinanzas_${today}.json`;

    if (navigator.share) {
      try {
        const file = new File([dataStr], fileName, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Respaldo Famifinanzas',
            text: `Copia de seguridad Famifinanzas (${today})`,
            files: [file]
          });
          return;
        } else {
          await navigator.share({
            title: 'Respaldo Famifinanzas',
            text: dataStr
          });
          return;
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Compartir no disponible o cancelado:', err);
          this.exportBackup();
        }
        return;
      }
    }
    // Si no está disponible Web Share, descargar normal
    this.exportBackup();
  }

  // Copiar todo el JSON al portapapeles
  copyBackupToClipboard() {
    try {
      const dataStr = JSON.stringify(this.state, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dataStr).then(() => {
          alert('¡Copia de seguridad copiada al portapapeles! Puedes pegarla en WhatsApp, un correo o tu bloc de notas.');
        }).catch(() => {
          this.fallbackCopyText(dataStr);
        });
      } else {
        this.fallbackCopyText(dataStr);
      }
    } catch (err) {
      alert('No se pudo copiar automáticamente. Use la opción de descargar archivo JSON.');
    }
  }

  fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      alert('¡Copia de seguridad copiada al portapapeles!');
    } catch (err) {
      alert('No se pudo copiar automáticamente.');
    }
    document.body.removeChild(textArea);
  }

  // Restaurar Copia JSON desde Archivo Seleccionado
  importBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const imported = JSON.parse(content);
        this.applyImportedState(imported);
      } catch (err) {
        console.error('Error al leer JSON:', err);
        alert('Error al leer el archivo JSON. Verifique que sea un archivo de respaldo válido.');
      }
    };
    reader.onerror = () => {
      alert('Ocurrió un error al intentar abrir el archivo en su dispositivo.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  // Restaurar Copia JSON pegando el texto directamente (desde el modal)
  importBackupFromText() {
    const textarea = document.getElementById('backup-paste-text');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) {
      alert('Por favor pegue el texto del respaldo JSON en el cuadro antes de restaurar.');
      return;
    }

    try {
      const imported = JSON.parse(raw);
      this.applyImportedState(imported);
    } catch (err) {
      alert('El texto pegado no es un JSON válido. Asegúrese de copiar todo el contenido completo.');
    }
  }

  // Restaurar Copia JSON pegando el texto directamente (desde la vista de ajustes)
  importBackupFromSettingsText() {
    const textarea = document.getElementById('settings-backup-paste-text');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) {
      alert('Por favor pegue el texto del respaldo JSON en el cuadro antes de restaurar.');
      return;
    }

    try {
      const imported = JSON.parse(raw);
      this.applyImportedState(imported);
    } catch (err) {
      alert('El texto pegado no es un JSON válido. Asegúrese de copiar todo el contenido completo.');
    }
  }

  // Validación y Aplicación de Estado Restaurado
  applyImportedState(imported) {
    if (!imported || typeof imported !== 'object') {
      alert('El formato del archivo no es válido.');
      return;
    }

    if (!Array.isArray(imported.people) || !Array.isArray(imported.obligations)) {
      alert('El archivo no contiene la estructura requerida de Famifinanzas (integrantes y obligaciones).');
      return;
    }

    const peopleCount = imported.people.length;
    const obCount = imported.obligations.length;

    const confirmMsg = `¿Está seguro de restaurar este respaldo?\n\n` +
      `• Integrantes encontrados: ${peopleCount}\n` +
      `• Obligaciones encontradas: ${obCount}\n\n` +
      `Esta acción actualizará sus registros actuales.`;

    if (!confirm(confirmMsg)) return;

    // Asegurar estructura
    this.state = {
      people: imported.people || [],
      obligations: imported.obligations || [],
      payments: imported.payments || {},
      settings: Object.assign({
        householdName: 'Familia Gómez Rico',
        currency: '$',
        theme: 'light'
      }, imported.settings || {}),
      currentMonth: imported.currentMonth || this.getCurrentMonthString(),
      currentTab: 'dashboard'
    };

    this.saveState();
    alert(`¡Copia de seguridad restaurada exitosamente!\nSe cargaron ${peopleCount} personas y ${obCount} obligaciones.`);
    location.reload();
  }

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  }

  formatMonthDisplay(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  // Gráficos Chart.js
  renderCharts() {
    const isDark = this.state.settings.darkMode;
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? '#334155' : '#f1f5f9';

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    this.renderDashDistributionChart();
    this.renderIncomeVsExpensesChart();
    this.renderExpensesByCategoryChart();
    this.renderSavingsVsDebtsChart();
    this.renderMonthlyEvolutionChart();
  }

  renderDashDistributionChart() {
    const canvas = document.getElementById('dash-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.charts['dashDist']) this.charts['dashDist'].destroy();

    const calcs = this.calculateFinancialHealth();

    this.charts['dashDist'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Gastos Fijos', 'Deudas', 'Ahorro / Metas', 'Margen Libre'],
        datasets: [{
          data: [
            calcs.totalExpenses,
            calcs.totalDebts,
            calcs.totalSavings,
            Math.max(0, calcs.remaining)
          ],
          backgroundColor: ['#ef4444', '#f59e0b', '#4f46e5', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  renderIncomeVsExpensesChart() {
    const canvas = document.getElementById('chart-income-vs-expenses');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.charts['incVsExp']) this.charts['incVsExp'].destroy();

    const calcs = this.calculateFinancialHealth();

    this.charts['incVsExp'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ingresos Totales', 'Compromisos Totales', 'Superávit'],
        datasets: [{
          label: 'Monto ($)',
          data: [calcs.totalIncome, calcs.totalOutflow, Math.max(0, calcs.remaining)],
          backgroundColor: ['#10b981', '#ef4444', '#4f46e5'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  renderExpensesByCategoryChart() {
    const canvas = document.getElementById('chart-expenses-by-category');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.charts['expByCat']) this.charts['expByCat'].destroy();

    const categories = {};
    this.state.obligations.forEach(ob => {
      const amt = parseFloat(ob.amount) || 0;
      categories[ob.category] = (categories[ob.category] || 0) + amt;
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    this.charts['expByCat'] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
      }
    });
  }

  renderSavingsVsDebtsChart() {
    const canvas = document.getElementById('chart-savings-debts');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.charts['savDebts']) this.charts['savDebts'].destroy();

    const calcs = this.calculateFinancialHealth();

    this.charts['savDebts'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Metas de Ahorro e Inversión', 'Pago de Deudas'],
        datasets: [{
          data: [calcs.totalSavings, calcs.totalDebts],
          backgroundColor: ['#10b981', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  renderMonthlyEvolutionChart() {
    const canvas = document.getElementById('chart-monthly-evolution');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.charts['monEvol']) this.charts['monEvol'].destroy();

    const [curYear, curMonth] = this.state.currentMonth.split('-').map(Number);
    const months = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(curYear, curMonth - 1 - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(mStr);
    }

    const labels = months.map(m => this.formatMonthDisplay(m));
    const incomeTotal = this.getTotalIncome();
    const incomeData = months.map(() => incomeTotal);
    const expenseData = months.map(m => {
      const pays = this.state.payments[m] || [];
      return pays.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
    });

    this.charts['monEvol'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: incomeData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Compromisos / Salidas',
            data: expenseData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

// Instanciar la aplicación globalmente
const app = new FinanceApp();
window.app = app;
window.openBackupModal = () => app.openBackupModal();
window.closeModal = (id) => app.closeModal(id);
window.exportBackup = () => app.exportBackup();
window.shareBackup = () => app.shareBackup();
window.copyBackupToClipboard = () => app.copyBackupToClipboard();
window.importBackup = (e) => app.importBackup(e);
window.importBackupFromText = () => app.importBackupFromText();
window.importBackupFromSettingsText = () => app.importBackupFromSettingsText();

