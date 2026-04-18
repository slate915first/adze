// ============================================================================
// render/welcome.js
// ----------------------------------------------------------------------------
// The pre-onboarding splash — shown when there's no state yet (first run,
// after reset, or cleared cache). Intentionally minimal: one screenful, no
// scrolling, a single primary action, a secondary path for returning users.
//
// The long-form intro (diagnostic / scaffolding / tradition) and the full
// privacy note live behind the "Read the full privacy note" link, which opens
// the privacy_detail modal.
// ============================================================================

function renderWelcome() {
  document.getElementById('app').innerHTML = `
    <div class="fade-in min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center max-w-md mx-auto">

      <div class="flex-1 flex flex-col items-center justify-center w-full">
        <div class="text-6xl md:text-7xl mb-4 breath">☸️</div>
        <h1 class="text-4xl md:text-5xl font-bold gold-text mb-1">${APP_NAME}</h1>
        <p class="text-base md:text-lg serif italic text-amber-200/80 mb-5">${APP_TAGLINE}</p>
        <p class="text-sm text-amber-100/80 serif leading-relaxed mb-8 max-w-xs">
          ${t('welcome.one_line')}
        </p>

        <button class="btn btn-gold text-lg px-10 py-3 w-full max-w-xs" onclick="startSetup()">${t('welcome.begin_button')}</button>

        <button class="mt-5 text-sm text-amber-200/80 hover:text-amber-100 underline" onclick="openAuth('signin')">
          ${t('welcome.sign_in_link')}
        </button>
      </div>

      <div class="w-full pt-6 mt-6 border-t border-amber-800/30 text-[11px] text-amber-100/55 leading-relaxed">
        <span>🔒 ${t('welcome.footer_privacy')}</span>
        <button onclick="openPrivacyDetail()" class="text-amber-300/80 hover:text-amber-200 underline ml-1">
          ${t('welcome.privacy_link')}
        </button>
      </div>

    </div>
  `;
  renderModal();
}
