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
//
// v15.20.1 — Variant C fork. Classic rendering unchanged. On Calm
// (data-theme="calm" on <html>), decorative elements are hidden via
// [data-classic-only]; Calm-only elements (hairline SVG wheel, quiet
// subtitle, italic beta line, monastic-style footer) render only when
// calmActive is true. Theme chips move to Settings on Calm but a small
// "back to classic" revert remains on Welcome so a pre-auth user who
// landed on Calm can get back without signing in first.
// ============================================================================

function renderWelcome() {
  const publicSignup = typeof ADZE_PUBLIC_SIGNUP_ENABLED === 'boolean' ? ADZE_PUBLIC_SIGNUP_ENABLED : false;
  // Read the theme from the DOM attribute (set by preferences.js IIFE
  // at script-parse time). No state access — welcome runs pre-auth.
  const calmActive = document.documentElement.getAttribute('data-theme') === 'calm';
  const classicCls = !calmActive
    ? 'text-amber-200 font-bold'
    : 'text-amber-300/70 hover:text-amber-200';
  const calmCls = calmActive
    ? 'text-amber-200 font-bold'
    : 'text-amber-300/70 hover:text-amber-200';
  document.getElementById('app').innerHTML = `
    <div class="fade-in min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center max-w-md mx-auto">

      <div class="flex-1 flex flex-col items-center justify-center w-full">

        <!-- Icon: Classic emoji wheel (gilded tile, breathing animation).
             Hidden on Calm; the hairline SVG below replaces it. -->
        <div class="text-6xl md:text-7xl mb-4 breath" data-classic-only>☸️</div>
        ${calmActive ? `
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
               stroke="currentColor" stroke-width="1"
               style="color: rgba(var(--ink-rgb), 0.40); display: block; margin: 0 auto 48px;">
            <circle cx="11" cy="11" r="9"/>
            <circle cx="11" cy="11" r="1.5"/>
            <line x1="11" y1="2" x2="11" y2="20"/>
            <line x1="2" y1="11" x2="20" y2="11"/>
            <line x1="4.6" y1="4.6" x2="17.4" y2="17.4"/>
            <line x1="17.4" y1="4.6" x2="4.6" y2="17.4"/>
          </svg>
        ` : ''}

        <!-- Wordmark: visible on both themes. The Calm CSS override strips
             the gold-text gradient to solid strong ink. -->
        <h1 class="text-4xl md:text-5xl font-bold gold-text mb-1">${APP_NAME}</h1>

        <!-- Tagline: Classic only. Italic amber would pull focus from the
             wordmark on Calm. -->
        <p class="text-base md:text-lg serif italic text-amber-200/80 mb-5" data-classic-only>${APP_TAGLINE}</p>

        <!-- Body sentence: Classic renders the full welcome.one_line.
             Calm renders a shorter quiet subtitle with generous margin. -->
        <p class="text-sm text-amber-100/80 serif leading-relaxed mb-6 max-w-xs" data-classic-only>
          ${t('welcome.one_line')}
        </p>
        ${calmActive ? `
          <p style="font-size: 15px; color: rgba(var(--ink-rgb), 0.40); margin-bottom: 56px; max-width: 340px; line-height: 1.6;">
            ${t('welcome.calm_subtitle')}
          </p>
        ` : ''}

        <!-- Closed-beta pill: Classic only. -->
        ${publicSignup ? '' : `
          <div class="mb-6 px-3 py-1.5 rounded-full text-[11px] tracking-wider uppercase text-amber-300/85 border border-amber-700/40 bg-amber-900/20" data-classic-only>
            Closed beta · by invitation
          </div>
        `}

        <!-- Primary CTA: visible on both. Calm CSS override flattens
             .btn-gold to a hairline-underlined link. -->
        ${publicSignup
          ? `
            <button class="btn btn-gold text-lg px-10 py-3 w-full max-w-xs" onclick="startSetup()">${t('welcome.begin_button')}</button>
            <button class="mt-4 btn btn-ghost text-base px-8 py-2 w-full max-w-xs" onclick="openAuth('magic-request')">
              Sign in with email
            </button>
          `
          : `
            <button class="btn btn-gold text-lg px-10 py-3 w-full max-w-xs" onclick="openAuth('magic-request')">
              ✉️  Sign in with email
            </button>
            <p class="mt-3 text-[11px] text-amber-100/55 italic leading-relaxed max-w-xs" data-classic-only>
              ${t('welcome.signin_hint')}
            </p>
          `
        }

        <!-- Beta explainer: Classic renders the full explanatory paragraph
             with email link. Calm renders a single italic line. -->
        ${publicSignup ? '' : `
          <p class="mt-4 text-[11px] text-amber-100/55 italic leading-relaxed max-w-xs" data-classic-only>
            Closed beta — invite-only. To request access, email
            <a href="mailto:hello@adze.life" class="text-amber-300 underline">hello@adze.life</a>.
          </p>
          ${calmActive ? `
            <p style="font-size: 13px; font-style: italic; color: rgba(var(--ink-rgb), 0.40); margin-top: 16px; max-width: 340px;">
              ${t('welcome.calm_beta_line')}
            </p>
          ` : ''}
        `}
      </div>

      <!-- Classic footer: privacy note + Datenschutz/Impressum + theme chips. -->
      <div class="w-full pt-6 mt-6 border-t border-amber-800/30 text-[11px] text-amber-100/55 leading-relaxed" data-classic-only>
        <div>
          <span>🔒 ${t('welcome.footer_privacy')}</span>
          <button onclick="openPrivacyDetail()" class="text-amber-300/80 hover:text-amber-200 underline ml-1">
            ${t('welcome.privacy_link')}
          </button>
        </div>
        <div class="mt-2 flex justify-center gap-3">
          <button onclick="openDatenschutz()" class="text-amber-300/80 hover:text-amber-200 underline">
            ${t('welcome.privacy_policy_link')}
          </button>
          <span class="text-amber-100/30">·</span>
          <button onclick="openImpressum()" class="text-amber-300/80 hover:text-amber-200 underline">
            ${t('welcome.imprint_link')}
          </button>
        </div>
        <div class="mt-2 flex justify-center items-center gap-2 text-[10px] text-amber-100/45"
             data-component="welcome.theme_chips">
          <span>${t('welcome.theme_label')}</span>
          <button onclick="setThemeBeforeAuth('classic')" class="${classicCls} underline">
            ${t('welcome.theme_classic')}
          </button>
          <span class="text-amber-100/30">·</span>
          <button onclick="setThemeBeforeAuth('calm')" class="${calmCls} underline">
            ${t('welcome.theme_calm')}
          </button>
        </div>
      </div>

      <!-- Calm footer: single quiet line, sans-serif, all-caps letter-
           spaced. Three links — privacy, and a revert-to-classic chip
           for a user who reached Calm pre-auth and wants out. -->
      ${calmActive ? `
        <div style="margin-top: 48px; font-family: var(--font-sans); font-size: 10px; letter-spacing: 0.12em;
                    text-align: center; color: rgba(var(--ink-rgb), 0.40);">
          ${t('welcome.calm_footer')}
          <span style="margin: 0 6px;">·</span>
          <button onclick="openPrivacyDetail()"
                  style="background: none; border: none; color: inherit; font: inherit; letter-spacing: inherit;
                         text-decoration: underline; text-decoration-color: rgba(var(--ink-rgb), 0.18);
                         padding: 0; cursor: pointer;">${t('welcome.calm_footer_link')}</button>
          <span style="margin: 0 6px;">·</span>
          <button onclick="setThemeBeforeAuth('classic')"
                  style="background: none; border: none; color: inherit; font: inherit; letter-spacing: inherit;
                         text-decoration: underline; text-decoration-color: rgba(var(--ink-rgb), 0.18);
                         padding: 0; cursor: pointer;">${t('welcome.calm_revert')}</button>
        </div>
      ` : ''}

    </div>
  `;
  renderModal();
}
