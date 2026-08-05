const COLORS = {
  musculacao: '#6E9BFF',
  corrida: '#FF9A52',
  funcional: '#6FD69A',
  dupla: '#F2C94C',
  livre: '#8D99AE',
  descanso: '#454C58',
};

const LABELS = {
  musculacao: 'Musculação',
  corrida: 'Corrida',
  funcional: 'Funcional + Corrida',
  dupla: 'Musculação + Corrida',
  livre: 'Livre / Descanso ativo',
  descanso: 'Descanso',
};

const state = {
  data: null,
  months: [],
  filters: {
    month: null,   // number or null
    tipos: new Set(),
    search: '',
    period: '',    // '', 'preManha', 'preTarde'
  },
  selectedDate: null,
};

const el = (sel) => document.querySelector(sel);

function fmtDatePt(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

async function init() {
  try {
    const res = await fetch('data.json');
    state.data = await res.json();
  } catch (e) {
    el('#day-list').innerHTML = `<p class="empty-state">Não consegui carregar data.json. Se você abriu este arquivo direto (file://), rode um servidor local (ex: <code>python3 -m http.server</code>) ou publique no GitHub Pages — navegadores bloqueiam fetch() de arquivos locais.</p>`;
    return;
  }

  const monthsSeen = [...new Set(state.data.dias.map(d => d.month))];
  state.months = monthsSeen;

  buildHeader();
  buildLegend();
  buildHeatmap();
  buildFilterMonth();
  buildFilterTipo();
  bindControls();
  render();
}

function buildHeader() {
  const { meta } = state.data;
  const today = new Date().toISOString().slice(0, 10);
  el('#stat-today').textContent = fmtDatePt(today);

  const total = daysBetween(meta.dataInicio, meta.dataFim);
  const elapsed = Math.min(Math.max(daysBetween(meta.dataInicio, today), 0), total);
  const pct = total > 0 ? (elapsed / total) * 100 : 0;

  el('#stat-dayof').textContent = `${elapsed} / ${total}`;

  const projected = meta.pesoInicial - ((meta.pesoInicial - meta.pesoMeta) * (elapsed / total));
  el('#stat-projected').textContent = `${projected.toFixed(1)} kg`;

  el('#progress-fill').style.width = `${pct}%`;
  el('#progress-marker').style.left = `${pct}%`;
}

function buildLegend() {
  const legend = el('#legend');
  legend.innerHTML = Object.keys(LABELS).map(tipo => `
    <div class="legend-item">
      <span class="legend-swatch" style="background:${COLORS[tipo]}"></span>
      ${LABELS[tipo]}
    </div>
  `).join('');
}

function buildHeatmap() {
  const wrap = el('#heatmap');
  const registros = state.data.registros || {};
  wrap.innerHTML = state.data.dias.map(d => {
    const logged = !!registros[d.date];
    return `
    <div class="hcell${logged ? ' logged' : ''}" data-date="${d.date}" data-tipo="${d.tipo}"
         style="background:${COLORS[d.tipo]}"
         title="${fmtDatePt(d.date)} · ${d.weekday} · ${d.treino}${logged ? ' · registrado ✓' : ''}"
         tabindex="0" role="button" aria-label="${fmtDatePt(d.date)}, ${d.treino}${logged ? ', dia registrado' : ''}">
    </div>
  `;
  }).join('');

  wrap.addEventListener('click', (e) => {
    const cell = e.target.closest('.hcell');
    if (!cell) return;
    openDrawer(cell.dataset.date);
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const cell = e.target.closest('.hcell');
    if (!cell) return;
    e.preventDefault();
    openDrawer(cell.dataset.date);
  });
}

function buildFilterMonth() {
  const wrap = el('#filter-month');
  const chips = state.months.map(m => {
    const name = state.data.dias.find(d => d.month === m).monthName;
    return `<button class="chip" data-month="${m}">${name}</button>`;
  }).join('');
  wrap.innerHTML = `<button class="chip active" data-month="">Todos</button>${chips}`;

  wrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    [...wrap.children].forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.filters.month = chip.dataset.month ? Number(chip.dataset.month) : null;
    render();
  });
}

function buildFilterTipo() {
  const wrap = el('#filter-tipo');
  wrap.innerHTML = Object.keys(LABELS).map(tipo => `
    <button class="chip" data-tipo="${tipo}">
      <span class="dot" style="background:${COLORS[tipo]}"></span>${LABELS[tipo]}
    </button>
  `).join('');

  wrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const tipo = chip.dataset.tipo;
    if (state.filters.tipos.has(tipo)) {
      state.filters.tipos.delete(tipo);
      chip.classList.remove('active');
    } else {
      state.filters.tipos.add(tipo);
      chip.classList.add('active');
    }
    render();
  });
}

function bindControls() {
  el('#search').addEventListener('input', (e) => {
    state.filters.search = e.target.value.trim().toLowerCase();
    render();
  });

  el('#period').addEventListener('change', (e) => {
    state.filters.period = e.target.value;
    render();
  });

  el('#clear-filters').addEventListener('click', () => {
    state.filters.month = null;
    state.filters.tipos.clear();
    state.filters.search = '';
    state.filters.period = '';
    el('#search').value = '';
    el('#period').value = '';
    document.querySelectorAll('#filter-month .chip').forEach(c => c.classList.remove('active'));
    el('#filter-month .chip[data-month=""]').classList.add('active');
    document.querySelectorAll('#filter-tipo .chip').forEach(c => c.classList.remove('active'));
    render();
  });

  el('#drawer-backdrop').addEventListener('click', closeDrawer);
  el('#drawer-close').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}

function matchesFilters(d) {
  const f = state.filters;
  if (f.month !== null && d.month !== f.month) return false;
  if (f.tipos.size > 0 && !f.tipos.has(d.tipo)) return false;
  if (f.period && d[f.period] === '—') return false;
  if (f.search) {
    const haystack = [d.foco, ...d.comer, ...d.evitar, d.treino, d.weekday]
      .join(' ').toLowerCase();
    if (!haystack.includes(f.search)) return false;
  }
  return true;
}

function render() {
  const filtered = state.data.dias.filter(matchesFilters);
  const matchedDates = new Set(filtered.map(d => d.date));

  // dim heatmap cells not matching current filters
  document.querySelectorAll('.hcell').forEach(cell => {
    cell.classList.toggle('dimmed', !matchedDates.has(cell.dataset.date));
  });

  el('#result-count').textContent = `${filtered.length} dia${filtered.length === 1 ? '' : 's'} encontrados`;

  const list = el('#day-list');
  const empty = el('#empty-state');

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = filtered.map(d => `
    <button class="day-card" style="--card-color:${COLORS[d.tipo]}" data-date="${d.date}">
      <div class="day-card-date">${fmtDatePt(d.date)}</div>
      <div class="day-card-weekday">${d.weekday}</div>
      <span class="day-card-badge">${d.treino}</span>
      <div class="day-card-foco">${d.foco}</div>
    </button>
  `).join('');

  list.querySelectorAll('.day-card').forEach(card => {
    card.addEventListener('click', () => openDrawer(card.dataset.date));
  });
}

function buildRegistroHtml(registro) {
  let html = `<div class="log-banner">✓ Dia registrado — dados reais abaixo</div>`;

  if (registro.peso) {
    const p = registro.peso;
    html += `
      <div class="drawer-block">
        <h4>Pesagem${p.condicao ? ' · ' + p.condicao : ''}</h4>
        <div class="stat-grid">
          <div class="stat-cell highlight"><span class="k">Peso</span><span class="v">${p.valor} kg</span></div>
          <div class="stat-cell"><span class="k">Meta</span><span class="v">${p.meta} kg</span></div>
          <div class="stat-cell"><span class="k">BMI</span><span class="v">${p.bmi}</span></div>
          <div class="stat-cell"><span class="k">Gordura</span><span class="v">${p.gordura_pct}% (${p.gordura_kg}kg)</span></div>
          <div class="stat-cell"><span class="k">Massa muscular</span><span class="v">${p.massa_muscular_kg}kg (${p.massa_muscular_pct}%)</span></div>
          <div class="stat-cell"><span class="k">Água</span><span class="v">${p.agua_pct}%</span></div>
          <div class="stat-cell"><span class="k">Metab. basal</span><span class="v">${p.bmr_kcal} kcal</span></div>
          <div class="stat-cell"><span class="k">Idade metabólica</span><span class="v">${p.idade_metabolica}</span></div>
        </div>
      </div>`;
  }

  if (registro.treino && registro.treino.exercicios) {
    html += `
      <div class="drawer-block">
        <h4>Treino real · ${registro.treino.tipo || ''}</h4>
        <table class="log-table">
          <thead><tr><th>Exercício</th><th>Sets</th><th>Reps</th><th>Carga</th></tr></thead>
          <tbody>
            ${registro.treino.exercicios.map(ex => `
              <tr>
                <td class="ex-name">${ex.nome}</td>
                <td>${ex.sets ?? '—'}</td>
                <td>${ex.reps ?? '—'}</td>
                <td>${ex.carga ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  if (registro.refeicoes && registro.refeicoes.length) {
    html += `
      <div class="drawer-block">
        <h4>Alimentação real</h4>
        ${registro.refeicoes.map(r => `
          <div class="meal-item">
            <div class="momento">${r.momento}</div>
            <div class="tag-list">${r.itens.map(i => `<span class="tag">${i}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>`;
  }

  if (registro.atividade_extra) {
    html += `
      <div class="drawer-block">
        <h4>Atividade extra · ${registro.atividade_extra.momento}</h4>
        <p>${registro.atividade_extra.descricao}</p>
      </div>`;
  }

  if (registro.notas) {
    html += `<p class="log-note">${registro.notas}</p>`;
  }

  return html;
}

function openDrawer(date) {
  const d = state.data.dias.find(x => x.date === date);
  if (!d) return;
  state.selectedDate = date;

  document.querySelectorAll('.hcell').forEach(c => c.classList.toggle('selected', c.dataset.date === date));

  const content = `
    <span class="drawer-badge" style="background:color-mix(in srgb, ${COLORS[d.tipo]} 22%, transparent); color:${COLORS[d.tipo]}">${d.treino}</span>
    <h3>${d.weekday}</h3>
    <div class="drawer-date">${fmtDatePt(d.date)}</div>

    <div class="drawer-block">
      <h4>Foco alimentar do dia</h4>
      <p>${d.foco}</p>
    </div>

    <div class="drawer-block">
      <h4>Comer</h4>
      <div class="tag-list">${d.comer.map(x => `<span class="tag good">${x}</span>`).join('')}</div>
    </div>

    <div class="drawer-block">
      <h4>Evitar</h4>
      <div class="tag-list">${d.evitar.map(x => `<span class="tag bad">${x}</span>`).join('')}</div>
    </div>

    ${d.preManha !== '—' ? `
    <div class="drawer-block">
      <h4>Se o treino for de manhã ou à tarde</h4>
      <div class="period-grid">
        <div class="period-card"><b>Manhã</b>${d.preManha}</div>
        <div class="period-card"><b>Tarde</b>${d.preTarde}</div>
      </div>
    </div>` : ''}
  `;

  const registro = (state.data.registros || {})[date];
  const logHtml = registro ? buildRegistroHtml(registro) : '';

  el('#drawer-content').innerHTML = logHtml + content;
  el('#drawer').classList.add('open');
  el('#drawer').setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  el('#drawer').classList.remove('open');
  el('#drawer').setAttribute('aria-hidden', 'true');
  if (state.selectedDate) {
    document.querySelectorAll('.hcell').forEach(c => c.classList.remove('selected'));
  }
}

init();