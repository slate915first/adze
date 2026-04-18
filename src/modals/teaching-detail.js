// ============================================================================
// src/modals/teaching-detail.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'teaching_detail'
//
// The dispatch in renderModal() now calls renderTeachingDetailModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderTeachingDetailModal(m) {
  let content = '';

    const type = m.detailType;
    const id = m.detailId;
    let body = '';
    let title = '';
    let subtitle = '';
    let icon = '📜';

    if (type === 'hindrance') {
      const h = FIVE_HINDRANCES.find(x => x.id === id);
      if (h) {
        icon = h.icon;
        title = h.pali;
        subtitle = h.english + ' · one of the Five Hindrances · MN 10 · AN 5.51';
        // Reuse the hindrance description logic — use the id to find the onboarding hint
        const detailText = {
          sensual: 'The pull of pleasure — food, screens, attention, comfort. In the sit, it appears as a restless reaching toward anything other than the present object. The Buddha\'s counsel (MN 20, SN 46.51) is to notice the pull, see the danger in following it, and starve it by attending elsewhere. Not to fight it — just not to feed it.',
          illwill: t('teaching_detail.hindrance.illwill'),
          sloth: 'Heaviness, dullness, the mind closing rather than opening. Not ordinary tiredness — sloth has a quality of giving up. The Buddha\'s prescription in AN 7.58: brighten the mind with light, open the eyes, stand up and walk, splash water on the face, recollect the teaching. Do something, then return to the sit.',
          restless: 'Uddhacca-kukkucca — agitation and worry. The modern mind is industrially cultivated to be restless. The Buddha\'s direct method (MN 20 — Vitakkasaṇṭhāna) is a sequence: replace the restless thought with a calmer object; notice the danger in following it; not attend to it; examine its root; and as a last resort, use effort of will — this is the one hindrance where a little force is appropriate.',
          doubt: t('teaching_detail.hindrance.doubt')
        }[id] || h.english;
        body = `
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${detailText}</p>
          <div class="parchment rounded-xl p-3 border border-amber-700/30">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('teaching_detail.hindrance.practice_eyebrow')}</div>
            <p class="text-[11px] text-amber-100/80 italic leading-relaxed">${t('teaching_detail.hindrance.practice_note', {pali: h.pali, pali: h.pali})}</p>
          </div>
        `;
      }
    } else if (type === 'factor') {
      const f = SEVEN_FACTORS.find(x => x.id === id);
      if (f) {
        icon = f.icon;
        title = f.pali;
        subtitle = f.english + ' · one of the Seven Awakening Factors · ' + f.suttaRef;
        body = `
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${f.description}</p>
          <div class="parchment rounded-xl p-3 border border-emerald-700/30">
            <div class="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">${t('teaching_detail.factor.tracks_label')}</div>
            <p class="text-[11px] text-amber-100/80 italic leading-relaxed">${f.measurable ? 'Measured from ' + (f.derivation || t('teaching_detail.factor.derivation_fallback')) + '. Visible as a live score on the Path tab.' : 'Not directly measurable. Emerges in practice when ' + (f.emergentWhen || t('teaching_detail.factor.when_fallback')) + '. Marked on the Path tab only when the conditions are visible.'}</p>
          </div>
          <p class="text-[11px] text-amber-100/60 italic mt-2 leading-relaxed">${t('teaching_detail.factor.sequence_note')}</p>
        `;
      }
    } else if (type === 'army') {
      const a = MARA_ARMIES.find(x => x.id === id);
      if (a) {
        icon = a.icon;
        title = a.name;
        subtitle = a.english + ' · one of Māra\'s Ten Armies · ' + a.suttaRef;
        body = `
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${a.desc}</p>
          <div class="parchment rounded-xl p-3 border border-amber-700/30">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('teaching_detail.army.canonical_framing_label')}</div>
            <p class="text-[11px] text-amber-100/80 italic leading-relaxed">${t('teaching_detail.army.canonical_framing_body')}</p>
          </div>
        `;
      }
    } else if (type === 'rank') {
      const r = PATH_RANKS.find(x => x.id === id);
      if (r) {
        icon = r.tier === 'advanced' ? '☸️' : r.tier === 'approaching' ? '✦' : r.tier === 'training' ? '◆' : '⋯';
        title = r.pali;
        subtitle = r.english + ' · rank ' + r.id + ' · ' + r.suttaRef;
        body = `
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${r.description}</p>
          ${r.note ? `<div class="parchment rounded-xl p-3 border border-amber-700/30 mb-2">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('rank_checkpoint.important_label')}</div>
            <p class="text-[11px] text-amber-200/80 italic leading-relaxed">${r.note}</p>
          </div>` : ''}
        `;
      }
    } else if (type === 'layer') {
      const L = PATH_LAYERS.find(x => x.id === id);
      if (L) {
        icon = L.id === 1 ? '◯' : L.id === 2 ? '◉' : '☸';
        title = L.title;
        subtitle = L.pali + ' · ' + L.suttaRef;
        body = `
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${L.teaser}</p>
          <p class="text-[11px] text-amber-100/80 leading-relaxed italic mb-3">${L.gateDescription}</p>
          <div class="parchment rounded-xl p-3 border border-amber-700/30">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path_viewer.layer1.graduation_label')}</div>
            <p class="text-[11px] text-amber-100/80 italic leading-relaxed">${L.graduation}</p>
          </div>
        `;
      }
    } else if (type === 'ladder') {
      icon = '🪜';
      title = t('teaching_detail.ladder.title');
      subtitle = t('teaching_detail.ladder.subtitle');
      body = `
        <p class="text-[11px] text-amber-100/80 leading-relaxed italic mb-3">${t('teaching_detail.ladder.intro')}</p>
        <div class="space-y-1">
          ${PATH_RANKS.map(r => `
            <button onclick="openTeachingDetail('rank', ${r.id})" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition text-[11px]">
              <span class="text-amber-300/60">${r.id}</span>
              <b class="text-amber-200 ml-1">${r.pali}</b>
              <span class="text-amber-100/55">— ${r.english}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else if (type === 'foundation_satipatthana') {
      const map = {
        body: { title: t('teaching_detail.foundation.body.title'), sub: t('teaching_detail.foundation.body.sub'),
          body: 'Mindfulness of body is the most concrete of the four foundations — and usually the first the Buddha taught. It has several sub-practices: mindfulness of posture (sitting, standing, walking, lying down); mindfulness of breathing (ānāpānasati, MN 118 — the complete sixteen-step practice that can carry a practitioner all the way); mindfulness of the body\'s parts; and mindfulness of the four elements. The breath is the most common entry because it is always present and always neutral.\n\nIn MN 118 the Buddha gives the sixteen-step ānāpānasati as a complete path. The first four steps train the body: long breath, short breath, sensitivity to the whole body, calming the body. The next four train feeling, the next four train mind, the last four train wisdom. The whole path through the breath alone.' },
        feeling: { title: t('teaching_detail.foundation.feeling.title'), sub: t('teaching_detail.foundation.feeling.sub'),
          body: 'Feeling tone (vedanā) is the second foundation and often the most underdeveloped in modern practitioners. It means noticing whether each sensation, as it arises, is pleasant, unpleasant, or neutral — before the story about the sensation starts. This is not the same as mood or emotion; it is the raw hedonic tone that precedes them.\n\nThe practice is to watch, for a stretch of the sit, every arising experience with one question only: pleasant, unpleasant, or neutral? Do not name the content. Just the tone. This trains the mind to catch feeling tone before craving or aversion latches on.' },
        mind: { title: t('teaching_detail.foundation.mind.title'), sub: t('teaching_detail.foundation.mind.sub'),
          body: 'Mindfulness of mind is the third foundation. It means turning attention to the quality of mind itself — is it contracted or spacious? Agitated or settled? Clinging or releasing? Concentrated or scattered? Greedy or free? Angry or open? Deluded or clear? The mind becomes its own object.\n\nThis foundation is sometimes skipped because it feels abstract, but it is accessible: every time you catch yourself thinking "oh, the mind is distracted right now" or "the mind is bright right now," you are doing cittānupassanā.' },
        dhammas: { title: t('teaching_detail.foundation.dhammas.title'), sub: t('teaching_detail.foundation.dhammas.sub'),
          body: 'The fourth foundation, dhammānupassanā, is the most subtle. It means watching mental phenomena as they arise and pass — specifically: the five hindrances (are they present or absent?), the five aggregates, the six sense bases, the seven awakening factors (are they strong or weak?), and the four noble truths as they apply to actual experience.\n\nThis foundation is where the teaching of the path and the experience of the practice meet. Every time you notice "sensual desire is present" or "sati is arising," you are doing dhammānupassanā. It is also the foundation most directly connected to Layer 1 of the game\'s path — the gate requires you to be doing this work.' }
      };
      const entry = map[id];
      if (entry) {
        icon = '🧘';
        title = entry.title;
        subtitle = entry.sub;
        body = `
          <p class="text-sm text-amber-100/90 leading-relaxed serif whitespace-pre-wrap">${entry.body}</p>
        `;
      }
    }

    if (!body) {
      body = `<p class="text-sm text-amber-100/70 italic">${t('teaching_detail.no_detail')}</p>`;
      title = title || t('teaching_detail.title_fallback');
    }

    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">${icon}</div>
          <h2 class="text-xl font-bold gold-text">${title}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${subtitle}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-4">
          ${body}
        </div>
        <div class="flex justify-end">
          <button class="btn btn-gold" onclick="closeModal()">${t('technique_teaching.close_button')}</button>
        </div>
      </div>
    `;

  return content;
}
