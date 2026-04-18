// ============================================================================
// src/modals/sutta-view.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'sutta_view'
//
// The dispatch in renderModal() now calls renderSuttaViewModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderSuttaViewModal(m) {
  let content = '';

    const sutta = SUTTA_LIBRARY.find(s => s.id === m.suttaId);
    const mid = view.currentMember;
    if (!sutta) {
      content = `<div class="text-center"><p class="text-amber-100/70 mb-3">${t('sutta_view.not_found')}</p><button class="btn btn-gold" onclick="closeModal()">${t('technique_teaching.close_button')}</button></div>`;
    } else {
      const rk = mid ? computeMemberRank(mid) : 0;
      const minRi = getRankInfo(sutta.minRank);
      const ready = rk >= sutta.minRank;
      const alreadyRead = mid ? hasReadSutta(mid, sutta.id) : false;
      const playerPanna = mid ? getTisikkha(mid).panna : 0;
      const canAfford = playerPanna >= SUTTA_OVERREACH_PANNA_COST;
      const tagBadges = sutta.teaches.map(t => `<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-200/70 border border-amber-900/40">${t}</span>`).join(' ');
      // v13.1 — practical subcategory badges, clickable to browse related suttas
      const subBadges = subcategoriesForSutta(sutta.id).map(sub => `
        <button onclick="openSuttaSubcategory('${sub.id}')" class="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-100 border border-amber-600/40 hover:bg-amber-900/60 transition">${sub.icon} ${sub.label}</button>
      `).join(' ');

      let actionBlock = '';
      if (m.justRead) {
        actionBlock = `
          <div class="parchment rounded-xl p-3 mb-3 ${m.wasOverreach ? 'bg-amber-950/40 border border-amber-700/50' : 'bg-emerald-950/30 border border-emerald-700/40'}">
            <div class="text-[10px] uppercase tracking-wider ${m.wasOverreach ? 'text-amber-300/80' : 'text-emerald-300/80'} mb-1">${t('sutta_view.marked_read_eyebrow')}</div>
            ${m.wasOverreach ? `
              <p class="text-[11px] text-amber-100/85 leading-relaxed serif italic">${t('sutta_view.marked_read_overreach', {cost: SUTTA_OVERREACH_PANNA_COST, tick: SUTTA_OVERREACH_KAMACCHANDA_TICK})}</p>
            ` : `
              <p class="text-[11px] text-amber-100/85 leading-relaxed serif italic">${t('sutta_view.marked_read_normal')}</p>
            `}
          </div>
        `;
      } else if (alreadyRead) {
        actionBlock = `
          <div class="parchment rounded-xl p-3 mb-3 bg-amber-950/30 border border-amber-700/30">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('sutta_view.already_read_eyebrow')}</div>
            <p class="text-[11px] text-amber-100/75 italic">${t('sutta_view.already_read_body')}</p>
          </div>
        `;
      } else if (ready) {
        actionBlock = `
          <div class="parchment rounded-xl p-3 mb-3 bg-emerald-950/20 border border-emerald-700/40">
            <div class="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-1">${t('sutta_view.ready_eyebrow')}</div>
            <p class="text-[11px] text-amber-100/80 mb-2">${t('sutta_view.ready_body', {rank: rk, minRank: sutta.minRank})}</p>
            <button class="btn btn-gold w-full text-sm" onclick="readSutta('${sutta.id}')">${t('sutta_view.ready_button')}</button>
          </div>
        `;
      } else {
        actionBlock = `
          <div class="parchment rounded-xl p-3 mb-3 bg-amber-950/40 border border-amber-700/50">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('sutta_view.above_rank_eyebrow')}</div>
            <p class="text-[11px] text-amber-100/85 leading-relaxed serif mb-2">${t('sutta_view.above_rank_body', {pali: minRi.pali, minRank: sutta.minRank, rank: rk})}</p>
            <p class="text-[11px] text-amber-100/70 italic mb-3">Reading above your rank costs <b class="text-amber-200">${SUTTA_OVERREACH_PANNA_COST} paññā</b> and ticks today's sensual-desire diagnostic by +${SUTTA_OVERREACH_KAMACCHANDA_TICK}. You currently have <b class="text-emerald-200">${playerPanna} paññā</b>${!canAfford ? ' — not enough, but the read is allowed anyway because the dhamma is not gatekept' : ''}.</p>
            <button class="btn btn-ghost w-full text-sm border border-amber-700/50" onclick="readSutta('${sutta.id}')">${t('sutta_view.above_rank_button')}</button>
          </div>
        `;
      }

      content = `
        <div class="fade-in">
          <div class="text-center mb-3">
            <div class="text-3xl mb-1">📜</div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${sutta.ref}</div>
            <h2 class="text-lg font-bold gold-text">${sutta.name}</h2>
            <div class="text-[11px] text-amber-200/80 italic">${sutta.english}</div>
            <div class="mt-2 flex justify-center flex-wrap gap-1">${tagBadges}</div>
            ${subBadges ? `<div class="mt-1.5 flex justify-center flex-wrap gap-1">${subBadges}</div><div class="text-[9px] text-amber-100/40 italic mt-0.5">${t('sutta_view.topic_link_note')}</div>` : ''}
          </div>

          <div class="parchment rounded-xl p-4 mb-3">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('sutta_view.summary_eyebrow')}</div>
            <p class="text-sm text-amber-100/90 leading-relaxed serif">${sutta.summary}</p>
            <p class="text-[10px] text-amber-100/55 italic mt-3 leading-relaxed">${t('sutta_view.summary_note')}</p>
          </div>

          <!-- v12.5: correctly label the translator. Earlier versions said
               "English (Bodhi)" regardless, which was wrong when Bodhi had
               not translated that sutta (e.g. most of DN). Now we read the
               same availability map the URL builder uses and label honestly. -->
          <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/40">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('sutta_view.sc.eyebrow')}</div>
            <div class="grid grid-cols-2 gap-2">
              <a href="${suttaCentralUrl(sutta.id, 'en')}" target="_blank" rel="noopener" class="btn btn-gold text-xs text-center">${t('sutta_view.sc.english_button', {translator: SUTTA_CENTRAL_BODHI_AVAILABLE[sutta.id] ? t('sutta_view.sc.translator_bodhi') : t('sutta_view.sc.translator_sujato')})}</a>
              <a href="${suttaCentralUrl(sutta.id, 'pli')}" target="_blank" rel="noopener" class="btn btn-ghost text-xs text-center border border-amber-700/40">${t('sutta_view.sc.pali_button')}</a>
            </div>
            <p class="text-[10px] text-amber-100/50 italic mt-2 leading-relaxed">${t('sutta_view.sc.footer')}</p>
          </div>

          ${SUTTA_QUESTIONS[sutta.id] ? (() => {
            const mid = view.currentMember;
            const started = mid ? srsHasStarted(mid, sutta.id) : false;
            const info = mid ? srsCardsForSutta(mid, sutta.id) : { total: 0, started: 0, due: 0, mastered: 0 };
            const totalQ = (SUTTA_QUESTIONS[sutta.id] || []).length;
            if (!started) {
              return `
                <div class="parchment rounded-xl p-3 mb-3 border border-emerald-700/40 bg-emerald-950/10">
                  <div class="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-1">${t('sutta_view.study.intro_eyebrow')}</div>
                  <p class="text-[11px] text-amber-100/85 leading-relaxed mb-2">${t('sutta_view.study.intro_body', {total: totalQ})}</p>
                  <button class="btn btn-gold w-full text-xs" onclick="openSuttaStudy('${sutta.id}')">${t('sutta_view.study.begin_button', {total: totalQ})}</button>
                </div>
              `;
            }
            return `
              <div class="parchment rounded-xl p-3 mb-3 border border-emerald-700/40 bg-emerald-950/10">
                <div class="flex items-baseline justify-between mb-1">
                  <div class="text-[10px] uppercase tracking-wider text-emerald-300/80">${t('sutta_view.study.active_eyebrow')}</div>
                  <div class="text-[10px] text-amber-100/55">${info.mastered}/${info.total} mastered${info.due ? ' · <b class="text-amber-300">' + info.due + ' due now</b>' : ''}</div>
                </div>
                <div class="w-full bg-amber-950/40 rounded-full h-1.5 overflow-hidden mb-2">
                  <div class="h-full bg-emerald-500/70" style="width:${Math.round((info.mastered / Math.max(info.total, 1)) * 100)}%"></div>
                </div>
                ${info.due > 0
                  ? `<button class="btn btn-gold w-full text-xs" onclick="openSuttaStudy('${sutta.id}')">Review ${info.due} card${info.due === 1 ? '' : 's'} now →</button>`
                  : `<p class="text-[10px] text-amber-100/55 italic text-center">${t('sutta_view.study.all_scheduled')}</p>`
                }
              </div>
            `;
          })() : ''}

          ${actionBlock}

          <div class="flex justify-end">
            <button class="btn btn-gold" onclick="closeModal()">${t('technique_teaching.close_button')}</button>
          </div>
        </div>
      `;
    }

  return content;
}
