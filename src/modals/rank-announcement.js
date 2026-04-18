// ============================================================================
// src/modals/rank-announcement.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'rank_announcement'
//
// The dispatch in renderModal() now calls renderRankAnnouncementModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderRankAnnouncementModal(m) {
  let content = '';

    const member = state.members.find(x => x.id === m.memberId);
    const payload = m.payload || {};
    const toRank = payload.toRank;
    const fromRank = payload.fromRank;
    const ri = getRankInfo(toRank);
    const prev = getRankInfo(fromRank);
    // v9.8: detect floor change across this rank transition
    const floorBefore = shadowFloorForRank(fromRank);
    const floorAfter = shadowFloorForRank(toRank);
    const floorChanged = floorBefore !== floorAfter;
    const floorRose = floorAfter > floorBefore;
    const floorFell = floorAfter < floorBefore;
    let floorNote = '';
    if (floorChanged) {
      const teachings = {
        '0_1':  { tone: 'rising',  text: t('rank_announcement.floor_teaching_0_1') },
        '1_2':  { tone: 'rising',  text: 'Sīla is establishing. The floor rises to 40. The first real friction with Māra\'s pull begins now.' },
        '2_3':  { tone: 'rising',  text: t('rank_announcement.floor_teaching_2_3') },
        '3_4':  { tone: 'rising',  text: t('rank_announcement.floor_teaching_3_4') },
        '4_5':  { tone: 'peak',    text: t('rank_announcement.floor_teaching_4_5') },
        '5_6':  { tone: 'falling', text: t('rank_announcement.floor_teaching_5_6') },
        '6_7':  { tone: 'falling', text: t('rank_announcement.floor_teaching_6_7') },
        '7_8':  { tone: 'falling', text: t('rank_announcement.floor_teaching_7_8') },
        '8_9':  { tone: 'falling', text: 'The game\'s endpoint. The floor falls to 5. Māra still visits but cannot find purchase. The arahant has destroyed the cause of his power. The remaining 5 is not your defilement; it is Māra\'s continued attention, futile but persistent.' }
      };
      const key = `${fromRank}_${toRank}`;
      const teaching = teachings[key];
      if (teaching) {
        const bgClass = teaching.tone === 'rising' ? 'border-amber-700/50 bg-amber-950/30'
          : teaching.tone === 'peak' ? 'border-red-700/50 bg-red-950/20'
          : 'border-emerald-700/50 bg-emerald-950/20';
        const iconChar = teaching.tone === 'rising' ? '⬆️' : teaching.tone === 'peak' ? '⛰️' : '⬇️';
        const labelText = teaching.tone === 'rising' ? `Shadow floor rises: ${floorBefore} → ${floorAfter}`
          : teaching.tone === 'peak' ? `Shadow floor at peak: ${floorAfter}`
          : `Shadow floor falls: ${floorBefore} → ${floorAfter}`;
        floorNote = `
          <div class="parchment rounded-xl p-3 mb-3 text-left border-2 ${bgClass}">
            <div class="flex items-baseline gap-2 mb-2">
              <div class="text-base">${iconChar}</div>
              <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${labelText}</div>
            </div>
            <p class="text-[11px] text-amber-100/90 leading-relaxed serif italic">${teaching.text}</p>
          </div>
        `;
      }
    }
    content = `
      <div class="fade-in text-center">
        <div class="text-5xl mb-2">🪷</div>
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('rank_announcement.eyebrow')}</div>
        <h2 class="text-2xl font-bold gold-text mt-1">${ri.pali}</h2>
        <p class="text-xs text-amber-200/80 italic mb-4">${ri.english} · ${ri.suttaRef}</p>

        <div class="parchment rounded-xl p-4 mb-3 text-left">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('rank_announcement.member_advance_eyebrow', {name: member ? member.name : 'You'})}</div>
          <div class="text-xs text-amber-100/60 mb-2">${t('rank_announcement.transition', {fromPali: prev.pali, toPali: ri.pali})}</div>
          <p class="text-sm text-amber-100/90 leading-relaxed serif">${ri.description}</p>
          ${ri.note ? `<p class="text-[11px] text-amber-300/80 italic mt-2">${ri.note}</p>` : ''}
        </div>

        ${floorNote}

        <div class="text-[11px] text-amber-100/55 italic leading-relaxed mb-3">
          ${t('rank_announcement.closing_note')}
        </div>

        <button class="btn btn-gold" onclick="acknowledgeRankAnnouncement()">${t('rank_announcement.continue_button')}</button>
      </div>
    `;

  return content;
}
