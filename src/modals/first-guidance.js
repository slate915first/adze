// ============================================================================
// src/modals/first-guidance.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'first_guidance'.
// The dispatch now calls renderFirstGuidanceModal(m). All strings resolve via t().
// ============================================================================

function renderFirstGuidanceModal(m) {
  let content = '';

    const member = state.members.find(x => x.id === m.memberId);
    const onboarding = getOnboardingDiagnostic(m.memberId);
    const experience = onboarding?.answers?.experience;
    const rx = getPrescription(m.memberId);
    const showTutorial = (experience === 'none' || experience === 'some');
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🪔</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('first_guidance.eyebrow')}</div>
          <h2 class="text-xl font-bold gold-text mt-1">${t('first_guidance.heading', {name: member?.name || 'you'})}</h2>
        </div>
        ${rx ? `
        <div class="parchment rounded-xl p-5 mb-4 border-amber-700/50">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-1">${rx.suttaRef}</div>
          <h3 class="text-lg font-bold text-amber-100 mb-2">${rx.title}</h3>
          <div class="text-sm text-amber-100/90 leading-relaxed whitespace-pre-line">${rx.teaching}</div>
        </div>
        ` : `
        <div class="parchment rounded-xl p-5 mb-4 border-amber-700/50">
          <p class="text-sm text-amber-100/90 leading-relaxed">
            ${t('first_guidance.empty_body')}
          </p>
        </div>
        `}
        ${showTutorial ? `
        <div class="parchment rounded-xl p-4 mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-1">${t('first_guidance.suggested_eyebrow')}</div>
          <p class="text-sm text-amber-100/90 mb-3">${t('first_guidance.body')}</p>
          <button class="btn btn-ghost text-xs" onclick="openTutorialFromFirstGuidance()">${t('first_guidance.tutorial_button')}</button>
        </div>
        ` : ''}
        <div class="flex justify-end">
          <button class="btn btn-gold" onclick="closeFirstGuidance()">${t('first_guidance.hold_button')}</button>
        </div>
      </div>
    `;

  return content;
}
