// ============================================================================
// src/systems/modal-openers.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 13 function(s): openPrivacyDetail, openArmyFromToday, dismissSustainedAdvance, openTeachingDetail, openShadowExplainer, openTisikkhaExplainer, openRulesCard, suttaCentralUrl, openSutta, openSuttaSubcategory, readSutta, openWeeklySummary, closeWeeklySummary
// ============================================================================

function openPrivacyDetail() {
  view.modal = { type: 'privacy_detail' };
  renderModal();
}

function openImpressum() {
  view.modal = { type: 'impressum' };
  renderModal();
}

function openDatenschutz() {
  view.modal = { type: 'datenschutz' };
  renderModal();
}

function openArmyFromToday(armyId) {
  if (view.currentMember) openPathView(view.currentMember);
}

function dismissSustainedAdvance() {
  const mid = view.currentMember;
  if (!mid || !state.path?.[mid]) return;
  state.path[mid].pendingSustainedAdvance = null;
  saveState();
  render();
}

function openTeachingDetail(type, id) {
  view.modal = { type: 'teaching_detail', detailType: type, detailId: id };
  renderModal();
}

function openShadowExplainer() {
  view.modal = { type: 'shadow_explainer' };
  renderModal();
}

function openTisikkhaExplainer() {
  view.modal = { type: 'tisikkha_explainer' };
  renderModal();
}

function openRulesCard() {
  view.modal = { type: 'rules_card' };
  renderModal();
}

function suttaCentralUrl(internalId, lang) {
  // Convert internal id to SuttaCentral id.
  // AN/SN use dots between collection number and sutta number.
  // MN, DN use no separator.
  // Sn (Sutta Nipāta) — internal ids use 'snp' prefix to disambiguate from
  // SN (Saṃyutta Nikāya). SuttaCentral also uses 'snp' for Sutta Nipāta.
  let scId = internalId;
  const underscoreIdx = scId.indexOf('_');
  if (underscoreIdx > 0) {
    const prefix3 = scId.slice(0, 3);
    const prefix2 = scId.slice(0, 2);
    if (prefix3 === 'snp') {
      scId = scId.replace('_', '.');  // snp1_8 → snp1.8
    } else if (prefix2 === 'an' || prefix2 === 'sn') {
      scId = scId.replace('_', '.');
    } else {
      // Unexpected; replace underscore with nothing as a safe fallback
      scId = scId.replace('_', '');
    }
  }
  if (lang === 'pli' || lang === 'pali') {
    return `https://suttacentral.net/${scId}/pli/ms`;
  }
  // English: Bodhi where available, else let SuttaCentral pick
  const useBodhi = SUTTA_CENTRAL_BODHI_AVAILABLE[internalId];
  if (useBodhi) {
    return `https://suttacentral.net/${scId}/en/bodhi`;
  }
  // Fall back to a general English landing (SuttaCentral will default to a
  // translation). Sujato's translations cover the main nikāyas so this is
  // almost never a dead end.
  return `https://suttacentral.net/${scId}/en/sujato`;
}

function openSutta(suttaId) {
  // v15.18 — preserve setup context. Earlier, when a tester clicked a
  // recommended-sutta link on the final setup screen, the sutta_view modal
  // replaced the setup modal; on close, closeModal had no returnTo hint, so
  // setup was dropped and ~1.5h of input with it. Carrying returnTo='setup'
  // forward lets closeModal route back to the unfinished setup modal
  // (view.setupData / view.setupStep live outside modal scope and survive).
  const cur = view.modal;
  const fromSetup = cur && (cur.type === 'setup' || cur.returnTo === 'setup');
  view.modal = fromSetup
    ? { type: 'sutta_view', suttaId, returnTo: 'setup' }
    : { type: 'sutta_view', suttaId };
  renderModal();
}

function openSuttaSubcategory(subId) {
  view.modal = { type: 'sutta_subcategory', subId };
  renderModal();
}

function readSutta(suttaId) {
  const mid = view.currentMember;
  if (!mid) { closeModal(); return; }
  const sutta = SUTTA_LIBRARY.find(s => s.id === suttaId);
  if (!sutta) { closeModal(); return; }
  const rk = computeMemberRank(mid);
  const ready = rk >= sutta.minRank;
  ensureSuttasReadRecord(mid);
  state.suttasRead[mid][suttaId] = new Date().toISOString();
  if (ready) {
    earnTisikkha(mid, 'sutta_read');
  } else {
    // Overreach: try to spend paññā. If the player has enough, deduct.
    // If not, allow the read anyway — the dhamma teaches without
    // gatekeeping — but the kāmacchanda tick still applies.
    spendPanna(mid, SUTTA_OVERREACH_PANNA_COST);
    tickKamacchanda(mid, SUTTA_OVERREACH_KAMACCHANDA_TICK);
  }
  saveState();
  // Re-render the modal to show the read state
  view.modal = { type: 'sutta_view', suttaId, justRead: true, wasOverreach: !ready };
  renderModal();
  render();
}

function openWeeklySummary() {
  state.lastWeeklySummaryViewed = todayKey();
  saveState();
  view.modal = { type: 'weekly_summary' };
  renderModal();
}

function closeWeeklySummary() {
  view.modal = null;
  renderModal();
}
