// ============================================================================
// render/diagnostic.js
// ----------------------------------------------------------------------------
// The 3-phase diagnostic — a self-assessment across the five hindrances,
// ethical ground (sīla), concentration, sense of purpose, and mettā.
//
// The framing is Theravāda canonical: the hindrances (pañca nīvaraṇāni)
// are weather, not weather reports about the self. The diagnostic asks
// where each is on a 1..10 scale, with endpoint labels that avoid
// judging the practitioner (Depleted/Vital, not Bad/Good).
//
// The diagnostic runs in two contexts:
//
//   1. Setup flow (render/setup.js step 2, pre-vow) — optional. Feeds
//      into the recommendation card (minutes, primary focus, first
//      sutta).
//
//   2. Post-setup member_diagnostic modal — lets added members or
//      returning players refresh their baseline.
//
// Three phases:
//
//   A  | Energy + 5 hindrances (7 sliders)
//   B  | Sīla + concentration + sense-of-purpose + mettā (4 sliders)
//      | plus experience + retreat history + interest tags
//   C  | Posture preference + sit-duration comfort
//
// Shared helper:
//
//   renderDiagnosticSlider(q, initial, elId) — the 1..10 slider UI with
//     endpoint labels and a live current-value readout.
//
// The engine logic (scoring, dimension mapping, recommendation derivation)
// lives in engine/diagnostic.js — this file is view-only.
//
// Dependencies (all read from global scope):
//   State:     state (diagnostics, members)
//              view (setupData, setupStep, modal)
//   Engine:    t() from engine/i18n.js
//              DIMENSIONS, buildRecommendation (from engine/diagnostic.js)
//   Helpers:   setDiagSlider, setDiagRadio, setDiagCheckbox,
//              submitOnboardingDiagnosticForMember,
//              submitSetupDiagnostic, skipSetupDiagnostic,
//              recordDiagnosticEvent
//   Data:      RETREAT_HISTORY_OPTIONS, INTEREST_OPTIONS
// ============================================================================

function renderDiagnosticPhaseA() {
  const diag = view.setupData.diagnostic;
  const hopesSelected = diag.hopes || [];
  const wellbeingAck = diag.wellbeingAck;
  return `
    <div data-component="setup.assessment.phase_a" class="fade-in">
      <div class="text-center mb-2">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.assessment.eyebrow')} <span class="opacity-60">· ${t('setup.assessment.phase_of_3', {n: 1})}</span></div>
        <h2 class="text-2xl font-bold gold-text">${t('setup.assessment.phase_a.heading')}</h2>
      </div>
      <p class="text-sm text-amber-100/70 italic mb-4 text-center">${t('setup.assessment.phase_a.intro')}</p>
      <div class="w-full bg-amber-900/30 rounded-full h-1 mb-6 overflow-hidden">
        <div class="h-full bg-amber-400/70 transition-all" style="width:33%"></div>
      </div>

      <!-- v13.6 — Wellbeing acknowledgment. Not a clinical screener; a single
           honest checkbox that prompts the practitioner to consider whether
           this is the right tool for them right now. If they acknowledge being
           in crisis or acute distress, we offer resources and a "come back
           later" option. Dirk feedback: don't over-promise healing; be honest
           about limits; give them a dignified way to pause. -->
      <div data-component="setup.assessment.phase_a.wellbeing_check" class="parchment rounded-xl p-4 mb-4 border border-emerald-700/40 bg-emerald-950/10">
        <div class="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-2">${t('setup.assessment.wellbeing.eyebrow')}</div>
        <p class="text-sm text-amber-100/85 leading-relaxed mb-3 serif">
          ${t('setup.assessment.wellbeing.intro')}
        </p>
        <div class="space-y-2">
          <button onclick="setDiagnosticA('wellbeingAck', 'ok')" class="parchment rounded-lg p-3 text-left w-full ${wellbeingAck === 'ok' ? 'parchment-active' : 'hover:parchment-active'}">
            <div class="flex items-start gap-2">
              <div class="text-base mt-0.5">${wellbeingAck === 'ok' ? '☑' : '☐'}</div>
              <div class="flex-1">
                <div class="text-sm text-amber-100 font-bold">${t('setup.assessment.wellbeing.ok_title')}</div>
                <div class="text-[11px] text-amber-100/65 italic">${t('setup.assessment.wellbeing.ok_desc')}</div>
              </div>
            </div>
          </button>
          <button onclick="setDiagnosticA('wellbeingAck', 'struggling')" class="parchment rounded-lg p-3 text-left w-full ${wellbeingAck === 'struggling' ? 'parchment-active' : 'hover:parchment-active'}">
            <div class="flex items-start gap-2">
              <div class="text-base mt-0.5">${wellbeingAck === 'struggling' ? '☑' : '☐'}</div>
              <div class="flex-1">
                <div class="text-sm text-amber-100 font-bold">${t('setup.assessment.wellbeing.struggling_title')}</div>
                <div class="text-[11px] text-amber-100/65 italic">${t('setup.assessment.wellbeing.struggling_desc')}</div>
              </div>
            </div>
          </button>
          <button onclick="setDiagnosticA('wellbeingAck', 'crisis')" class="parchment rounded-lg p-3 text-left w-full ${wellbeingAck === 'crisis' ? 'parchment-active' : 'hover:parchment-active'}">
            <div class="flex items-start gap-2">
              <div class="text-base mt-0.5">${wellbeingAck === 'crisis' ? '☑' : '☐'}</div>
              <div class="flex-1">
                <div class="text-sm text-amber-100 font-bold">${t('setup.assessment.wellbeing.crisis_title')}</div>
                <div class="text-[11px] text-amber-100/65 italic">${t('setup.assessment.wellbeing.crisis_desc')}</div>
              </div>
            </div>
          </button>
        </div>
        ${wellbeingAck === 'crisis' ? `
          <div class="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-800/40">
            <p class="text-sm text-amber-100 leading-relaxed mb-2 serif">
              ${t('setup.assessment.crisis.lead')}
            </p>
            <ul class="text-xs text-amber-100/85 space-y-1 leading-relaxed mb-2">
              <li>${t('setup.assessment.crisis.resource_iasp')}</li>
              <li>${t('setup.assessment.crisis.resource_de')}</li>
              <li>${t('setup.assessment.crisis.resource_us')}</li>
              <li>${t('setup.assessment.crisis.resource_my')}</li>
              <li>${t('setup.assessment.crisis.resource_person')}</li>
            </ul>
            <p class="text-xs text-amber-100/70 italic mb-3">${t('setup.assessment.crisis.immediate_danger')}</p>
            <p class="text-xs text-amber-100/75 serif leading-relaxed">
              ${t('setup.assessment.crisis.dhamma_note')}
            </p>
          </div>
        ` : ''}
      </div>

      ${wellbeingAck !== 'crisis' ? `
      <!-- Q1: Energy -->
      <div class="parchment rounded-xl p-4 mb-3">
        <div class="text-sm font-bold text-amber-100 mb-1">${SETUP_DIAGNOSTIC_A[0].question}</div>
        <div class="text-xs text-amber-100/55 italic mb-3">${SETUP_DIAGNOSTIC_A[0].hint}</div>
        <input type="range" min="1" max="10" value="${diag.energy}" class="w-full" oninput="setDiagnosticA('energy', this.value)" onchange="setDiagnosticA('energy', this.value)">
        <div class="flex justify-between text-[10px] text-amber-200/60 mt-1">
          <span>${SETUP_DIAGNOSTIC_A[0].labels[0]}</span>
          <span class="text-amber-300 font-bold" id="energy-val">${diag.energy}${t('setup.assessment.value_of_ten')}</span>
          <span>${SETUP_DIAGNOSTIC_A[0].labels[1]}</span>
        </div>
      </div>
      ` : ''}

      ${wellbeingAck !== 'crisis' ? `
      <!-- Q2: Experience -->
      <div class="parchment rounded-xl p-4 mb-3">
        <div class="text-sm font-bold text-amber-100 mb-1">${SETUP_DIAGNOSTIC_A[1].question}</div>
        <div class="text-xs text-amber-100/55 italic mb-3">${SETUP_DIAGNOSTIC_A[1].hint}</div>
        <div class="grid grid-cols-2 gap-2">
          ${SETUP_DIAGNOSTIC_A[1].options.map(o => `
            <button onclick="setDiagnosticA('experience', '${o.key}')" class="parchment rounded-lg p-2 text-left ${diag.experience === o.key ? 'parchment-active lotus-glow' : 'hover:parchment-active'}">
              <div class="flex items-start gap-2">
                <div class="text-xl">${o.icon}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-amber-100">${o.label}</div>
                  <div class="text-[10px] text-amber-100/60 leading-tight">${o.desc}</div>
                </div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Q3: Hopes (multi-select up to 2) -->
      <div class="parchment rounded-xl p-4 mb-3">
        <div class="text-sm font-bold text-amber-100 mb-1">${SETUP_DIAGNOSTIC_A[2].question}</div>
        <div class="text-xs text-amber-100/55 italic mb-3">${SETUP_DIAGNOSTIC_A[2].hint}</div>
        <div class="grid grid-cols-2 gap-2">
          ${SETUP_DIAGNOSTIC_A[2].options.map(o => {
            const sel = hopesSelected.includes(o.key);
            return `
              <button onclick="toggleDiagnosticHope('${o.key}')" class="parchment rounded-lg p-2 text-left ${sel ? 'parchment-active' : 'hover:parchment-active'} ${!sel && hopesSelected.length >= 2 ? 'opacity-40' : ''}">
                <div class="flex items-start gap-2">
                  <div class="text-xl">${o.icon}</div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-amber-100">${o.label}${sel ? ' ✓' : ''}</div>
                    <div class="text-[10px] text-amber-100/60 leading-tight">${o.desc}</div>
                  </div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Q4: Dominant hindrance -->
      <div class="parchment rounded-xl p-4 mb-4">
        <div class="text-sm font-bold text-amber-100 mb-1">${SETUP_DIAGNOSTIC_A[3].question}</div>
        <div class="text-xs text-amber-100/55 italic mb-3">${SETUP_DIAGNOSTIC_A[3].hint}</div>
        <div class="space-y-1.5">
          ${SETUP_DIAGNOSTIC_A[3].options.map(o => `
            <button onclick="setDiagnosticA('dominantHindrance', '${o.key}')" class="parchment rounded-lg p-2 text-left w-full ${diag.dominantHindrance === o.key ? 'parchment-active lotus-glow' : 'hover:parchment-active'}">
              <div class="flex items-start gap-2">
                <div class="text-xl">${o.icon}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-amber-100">${o.label}${diag.dominantHindrance === o.key ? ' ✓' : ''}</div>
                  <div class="text-[10px] text-amber-100/60 leading-tight">${o.desc}</div>
                </div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="flex justify-between">
        <button class="btn btn-ghost text-sm" onclick="setupBack()">${t('common.back')}</button>
        ${wellbeingAck === 'crisis' ? `
          <button class="btn btn-ghost text-sm" onclick="pauseSetupForCare()">${t('setup.assessment.phase_a.pause_button')}</button>
        ` : `
          <button class="btn btn-gold text-sm ${(!wellbeingAck || !diag.experience || !diag.dominantHindrance) ? 'opacity-50 pointer-events-none' : ''}" onclick="setupNext()">${t('common.continue')}</button>
        `}
      </div>
    </div>
  `;
}

function renderDiagnosticPhaseB() {
  const diag = view.setupData.diagnostic;
  const isBeginner = diag.experience === 'none' || diag.experience === 'some';
  const items = isBeginner ? SETUP_DIAGNOSTIC_B_BEGINNER : SETUP_DIAGNOSTIC_B_EXPERIENCED;
  // Use static t() keys per branch so verify_strings.js can detect both.
  const header = isBeginner
    ? t('setup.assessment.phase_b.heading_beginner')
    : t('setup.assessment.phase_b.heading_experienced');
  const sub = isBeginner
    ? t('setup.assessment.phase_b.sub_beginner')
    : t('setup.assessment.phase_b.sub_experienced');
  return `
    <div class="fade-in">
      <div class="text-center mb-2">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.assessment.eyebrow')} <span class="opacity-60">· ${t('setup.assessment.phase_of_3', {n: 2})}</span></div>
        <h2 class="text-2xl font-bold gold-text">${header}</h2>
      </div>
      <p class="text-sm text-amber-100/70 italic mb-4 text-center">${sub}</p>
      <div class="w-full bg-amber-900/30 rounded-full h-1 mb-6 overflow-hidden">
        <div class="h-full bg-amber-400/70 transition-all" style="width:66%"></div>
      </div>

      ${items.map(q => {
        if (q.type === 'slider') {
          const val = diag[q.id] != null ? diag[q.id] : q.min;
          return `
            <div class="parchment rounded-xl p-4 mb-3">
              <div class="text-sm font-bold text-amber-100 mb-1">${q.question}</div>
              <div class="text-xs text-amber-100/55 italic mb-3">${q.hint || ''}</div>
              <input type="range" min="${q.min}" max="${q.max}" step="${q.step || 1}" value="${val}" class="w-full" oninput="setDiagnosticB('${q.id}', this.value)" onchange="setDiagnosticB('${q.id}', this.value)">
              <div class="flex justify-between text-[10px] text-amber-200/60 mt-1">
                <span>${q.labels[0]}</span>
                <span class="text-amber-300 font-bold" id="diagB-val-${q.id}">${val}${q.id === 'realisticMinutes' || q.id === 'currentSitLength' ? t('setup.assessment.minutes_suffix') : ''}</span>
                <span>${q.labels[1]}</span>
              </div>
            </div>
          `;
        }
        if (q.type === 'select') {
          return `
            <div class="parchment rounded-xl p-4 mb-3">
              <div class="text-sm font-bold text-amber-100 mb-1">${q.question}</div>
              <div class="text-xs text-amber-100/55 italic mb-3">${q.hint || ''}</div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${q.options.map(o => `
                  <button onclick="setDiagnosticB('${q.id}', '${o.key}')" class="parchment rounded-lg p-2 text-left ${diag[q.id] === o.key ? 'parchment-active lotus-glow' : 'hover:parchment-active'}">
                    <div class="flex items-start gap-2">
                      <div class="text-xl">${o.icon || ''}</div>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold text-amber-100">${o.label}${diag[q.id] === o.key ? ' ✓' : ''}</div>
                        <div class="text-[10px] text-amber-100/60 leading-tight">${o.desc || ''}</div>
                      </div>
                    </div>
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        }
        if (q.type === 'multi') {
          // v11.1 — multi-select for knowledge-check questions. No scoring
          // shown to user; all options styled identically whether correct
          // or distractor. The engine scores internally.
          // v13.6 — Dirk feedback: correct answers always appeared first
          // (positions 1-4 for 4NT, 1-8 for 8FP), which is a dead giveaway.
          // Options are now shuffled per-session via getShuffledOptionsFor.
          const current = diag[q.id] || [];
          const shuffled = getShuffledOptionsFor(q.id, q.options);
          return `
            <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40">
              <div class="text-sm font-bold text-amber-100 mb-1">${q.question}</div>
              <div class="text-xs text-amber-100/55 italic mb-3">${q.hint || ''}</div>
              <div class="space-y-1.5">
                ${shuffled.map(o => {
                  const sel = current.includes(o.key);
                  return `
                    <button onclick="toggleDiagnosticBMulti('${q.id}', '${o.key}')" class="parchment rounded-lg p-2 text-left w-full ${sel ? 'parchment-active' : 'hover:parchment-active'}">
                      <div class="flex items-start gap-2">
                        <div class="text-sm mt-0.5">${sel ? '☑' : '☐'}</div>
                        <div class="flex-1 min-w-0">
                          <div class="text-xs text-amber-100 leading-snug">${o.label}</div>
                        </div>
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
              <div class="text-[10px] text-amber-100/45 italic mt-2">${t('setup.assessment.phase_b.multi_footer', {count: current.length})}</div>
            </div>
          `;
        }
        if (q.type === 'textarea') {
          return `
            <div class="parchment rounded-xl p-4 mb-3">
              <div class="text-sm font-bold text-amber-100 mb-1">${q.question}</div>
              <div class="text-xs text-amber-100/55 italic mb-2">${q.hint || ''}</div>
              <textarea rows="2" placeholder="${q.placeholder || ''}" class="w-full bg-amber-950/30 border border-amber-900/40 rounded p-2 text-sm text-amber-100" oninput="setDiagnosticB('${q.id}', this.value)" onchange="setDiagnosticB('${q.id}', this.value)">${diag[q.id] || ''}</textarea>
            </div>
          `;
        }
        if (q.type === 'chips') {
          // Multi-select chip grid. Selections stored as array in diag[q.id];
          // optional free-text "other" stored separately in diag[q.id + 'Other'].
          // Chip taxonomy + diagnostic interpretation lives in:
          //   src/systems/chip-interpretation.js
          //   docs/CHIP-INTERPRETATION.md
          const selected = Array.isArray(diag[q.id]) ? diag[q.id] : [];
          const otherVal = diag[q.id + 'Other'] || '';
          const showOther = !!q.hasOther && (selected.length > 0 || otherVal.length > 0);
          return `
            <div class="parchment rounded-xl p-4 mb-3">
              <div class="text-sm font-bold text-amber-100 mb-1">${q.question}</div>
              <div class="text-xs text-amber-100/55 italic mb-3">${q.hint || ''}</div>
              <div class="flex flex-wrap gap-2">
                ${q.chips.map(c => {
                  const sel = selected.includes(c.key);
                  return `
                    <button type="button"
                      onclick="toggleDiagnosticBChip('${q.id}', '${c.key}')"
                      class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${sel ? 'bg-amber-400/20 border-amber-400/70 text-amber-100' : 'bg-amber-950/20 border-amber-800/40 text-amber-100/75 hover:border-amber-700/60'}">
                      ${sel ? '✓ ' : ''}${c.label}
                    </button>
                  `;
                }).join('')}
              </div>
              ${q.hasOther ? `
                <div class="mt-3 ${showOther ? '' : 'opacity-60'}">
                  <label class="text-[11px] uppercase tracking-wider text-amber-300/70 block mb-1">Other (optional, stored only — not interpreted)</label>
                  <input type="text" placeholder="${q.otherPlaceholder || ''}"
                    class="w-full bg-amber-950/30 border border-amber-900/40 rounded p-2 text-sm text-amber-100"
                    value="${(otherVal || '').replace(/"/g, '&quot;')}"
                    oninput="setDiagnosticB('${q.id}Other', this.value)"/>
                </div>
              ` : ''}
            </div>
          `;
        }
        return '';
      }).join('')}

      <div class="flex justify-between mt-4">
        <button class="btn btn-ghost text-sm" onclick="setupBack()">${t('common.back')}</button>
        <button class="btn btn-gold text-sm" onclick="setupNext()">${t('common.continue')}</button>
      </div>
    </div>
  `;
}

// v11.1 — toggle a multi-select option inside Phase B (knowledge checks)
function toggleDiagnosticBMulti(key, optionKey) {
  const diag = view.setupData.diagnostic;
  if (!Array.isArray(diag[key])) diag[key] = [];
  const idx = diag[key].indexOf(optionKey);
  if (idx >= 0) diag[key].splice(idx, 1);
  else diag[key].push(optionKey);
  renderModal();
}

// v15.0 — toggle a chip (setup Phase B: stoppedBefore / physicalConcerns /
// concerns). Updates state + repaints just the clicked chip's styling in
// place, so the "Other" free-text input keeps its value and caret position.
function toggleDiagnosticBChip(key, chipKey) {
  const diag = view.setupData.diagnostic;
  if (!Array.isArray(diag[key])) diag[key] = [];
  const idx = diag[key].indexOf(chipKey);
  const willSelect = idx < 0;
  if (willSelect) diag[key].push(chipKey);
  else            diag[key].splice(idx, 1);
  // Find the clicked chip button and flip its classes + leading "✓".
  const btn = document.querySelector(`button[onclick="toggleDiagnosticBChip('${key}', '${chipKey}')"]`);
  if (btn) {
    const sel = willSelect;
    btn.className = `px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${sel ? 'bg-amber-400/20 border-amber-400/70 text-amber-100' : 'bg-amber-950/20 border-amber-800/40 text-amber-100/75 hover:border-amber-700/60'}`;
    const label = btn.textContent.replace(/^✓\s*/, '');
    btn.textContent = sel ? '✓ ' + label : label;
  }
}

function renderDiagnosticPhaseC() {
  const diag = view.setupData.diagnostic;
  return `
    <div class="fade-in">
      <div class="text-center mb-2">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.assessment.eyebrow')} <span class="opacity-60">· ${t('setup.assessment.phase_of_3', {n: 3})}</span></div>
        <h2 class="text-2xl font-bold gold-text">${t('setup.assessment.phase_c.heading')}</h2>
      </div>
      <p class="text-sm text-amber-100/70 italic mb-4 text-center">${t('setup.assessment.phase_c.intro')}</p>
      <div class="w-full bg-amber-900/30 rounded-full h-1 mb-6 overflow-hidden">
        <div class="h-full bg-amber-400/70 transition-all" style="width:100%"></div>
      </div>

      ${SETUP_DIAGNOSTIC_C.map(q => {
        const val = diag[q.id] != null ? diag[q.id] : 5;
        return `
          <div class="parchment rounded-xl p-4 mb-3">
            <div class="text-sm font-bold text-amber-100 mb-1">${q.question}</div>
            ${q.example ? `<div class="text-[11px] text-amber-100/60 italic mb-3 leading-relaxed">${q.example}</div>` : '<div class="mb-2"></div>'}
            <input type="range" min="0" max="10" value="${val}" class="w-full" oninput="setDiagnosticC('${q.id}', this.value)" onchange="setDiagnosticC('${q.id}', this.value)">
            <div class="flex justify-between text-[10px] text-amber-200/60 mt-1">
              <span>${q.labels[0]}</span>
              <span class="text-amber-300 font-bold"><span id="diagC-val-${q.id}">${val}</span>${t('setup.assessment.value_of_ten')}</span>
              <span>${q.labels[1]}</span>
            </div>
          </div>
        `;
      }).join('')}

      <div class="flex justify-between mt-4">
        <button class="btn btn-ghost text-sm" onclick="setupBack()">${t('common.back')}</button>
        <button class="btn btn-gold text-sm" onclick="computeAndShowRecommendation()">${t('setup.assessment.phase_c.see_recommendation')}</button>
      </div>
    </div>
  `;
}

function renderDiagnosticSlider(q, initial, elId) {
  const min = q.min != null ? q.min : 0;
  const max = q.max != null ? q.max : 10;
  const val = initial != null ? initial : Math.round((min + max) / 2);
  const labels = q.labels || ['Low','High'];
  return `
    <div class="mb-4">
      <div class="text-sm text-amber-100 mb-1">${q.question}</div>
      <input type="range" id="${elId}" min="${min}" max="${max}" value="${val}"
        class="w-full accent-amber-400"
        oninput="document.getElementById('${elId}-val').textContent=this.value">
      <div class="flex justify-between text-[10px] text-amber-300/60 mt-0.5">
        <span>${labels[0]}</span>
        <span id="${elId}-val" class="text-amber-200 font-bold">${val}</span>
        <span>${labels[1]}</span>
      </div>
    </div>
  `;
}


