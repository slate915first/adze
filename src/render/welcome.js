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
  const publicSignup = typeof ADZE_PUBLIC_SIGNUP_ENABLED === 'boolean' ? ADZE_PUBLIC_SIGNUP_ENABLED : false;
  document.getElementById('app').innerHTML = `
    <div class="fade-in min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center max-w-md mx-auto">

      <div class="flex-1 flex flex-col items-center justify-center w-full">
        <div class="text-6xl md:text-7xl mb-4 breath">☸️</div>
        <h1 class="text-4xl md:text-5xl font-bold gold-text mb-1">${APP_NAME}</h1>
        <p class="text-base md:text-lg serif italic text-amber-200/80 mb-5">${APP_TAGLINE}</p>
        <p class="text-sm text-amber-100/80 serif leading-relaxed mb-6 max-w-xs">
          ${t('welcome.one_line')}
        </p>

        ${publicSignup ? '' : `
          <div class="mb-6 px-3 py-1.5 rounded-full text-[11px] tracking-wider uppercase text-amber-300/85 border border-amber-700/40 bg-amber-900/20">
            Closed beta · by invitation
          </div>
        `}

        ${publicSignup
          ? `
            <button class="btn btn-gold text-lg px-10 py-3 w-full max-w-xs" onclick="startSetup()">${t('welcome.begin_button')}</button>
            <button class="mt-4 btn btn-ghost text-base px-8 py-2 w-full max-w-xs" onclick="openAuth('magic-request')">
              Sign in with email
            </button>
          `
          : `
            <!-- v15.11 — closed beta: magic-link sign-in is the only entry.
                 Anonymous "Begin" reappears automatically when
                 ADZE_PUBLIC_SIGNUP_ENABLED flips to true. -->
            <button class="btn btn-gold text-lg px-10 py-3 w-full max-w-xs" onclick="openAuth('magic-request')">
              ✉️  Sign in with email
            </button>
          `
        }

        ${publicSignup ? '' : `
          <p class="mt-4 text-[11px] text-amber-100/55 italic leading-relaxed max-w-xs">
            Closed beta — invite-only. To request access, email
            <a href="mailto:hello@adze.life" class="text-amber-300 underline">hello@adze.life</a>.
          </p>
        `}
      </div>

      <div class="w-full pt-6 mt-6 border-t border-amber-800/30 text-[11px] text-amber-100/55 leading-relaxed">
        <div>
          <span>🔒 ${t('welcome.footer_privacy')}</span>
          <button onclick="openPrivacyDetail()" class="text-amber-300/80 hover:text-amber-200 underline ml-1">
            ${t('welcome.privacy_link')}
          </button>
        </div>
        <div class="mt-2">
          <button onclick="openImpressum()" class="text-amber-300/80 hover:text-amber-200 underline">
            ${t('welcome.imprint_link')}
          </button>
        </div>
      </div>

    </div>
  `;
  renderModal();
}
