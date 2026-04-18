// ============================================================================
// src/systems/liberation.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 5 function(s): maybeTriggerLiberationOffer, acceptLiberation, declineLiberation, buildFinalTeachingSummary, downloadFinalTeachingSummary
// ============================================================================

function maybeTriggerLiberationOffer() {
  if (view.modal) return;
  if (!view.currentMember) return;
  const p = state.path?.[view.currentMember];
  if (!p) return;
  if (p.liberated || p.liberationDeclined) return;
  if (!p.liberationOffered) return;
  // Don't open if the player is in the middle of another flow
  view.modal = { type: 'liberation_offer', memberId: view.currentMember };
  renderModal();
}

function acceptLiberation() {
  if (!view.modal || view.modal.type !== 'liberation_offer') return;
  const mid = view.modal.memberId;
  if (!mid) return;
  const p = ensurePathRecord(mid);
  p.liberated = new Date().toISOString();
  saveState();
  // Auto-download the final teaching summary
  downloadFinalTeachingSummary(mid);
  // Replace the offer modal with the final teaching modal
  view.modal = { type: 'liberation_complete', memberId: mid };
  renderModal();
  render();
}

function declineLiberation() {
  if (!view.modal || view.modal.type !== 'liberation_offer') return;
  const mid = view.modal.memberId;
  if (!mid) return;
  const p = ensurePathRecord(mid);
  p.liberationDeclined = new Date().toISOString();
  saveState();
  view.modal = null;
  renderModal();
  render();
}

function buildFinalTeachingSummary(memberId) {
  const member = state.members.find(m => m.id === memberId);
  if (!member) return '# No such member\n';
  const ob = getOnboardingDiagnostic(memberId);
  const summary = getPathSummary(memberId);
  const p = ensurePathRecord(memberId);
  const sitsTotal = (state.sitRecords || []).filter(r => r.memberId === memberId).length;
  const startDate = ob?.completedAt ? new Date(ob.completedAt).toISOString().slice(0, 10) : 'unknown';
  const liberationDate = p.liberated ? new Date(p.liberated).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const factorRows = getAllFactorScores(memberId);

  let md = '';
  md += `# The Path — Final Teaching Summary\n\n`;
  md += `**Practitioner:** ${member.name}\n`;
  md += `**Started:** ${startDate}\n`;
  md += `**Liberated (from the game):** ${liberationDate}\n`;
  md += `**Total sits logged:** ${sitsTotal}\n\n`;
  md += `---\n\n`;

  md += `## Important — what this document is and is not\n\n`;
  md += `This document marks the end of your journey through Habit Quest. You reached rank 9 in the game — the arahant rank — by doing the full teaching arc the tool can provide. **This is not a certificate of real attainment.** The game's ranks are teaching scaffolding. Real awakening is marked by specific fetters actually falling away, and no self-report tool can verify that. What you have is a complete map of the path, a record of your practice during the game's window, and the instructions to continue without the scaffolding.\n\n`;
  md += `The canonical tradition is unambiguous: the four noble persons — sotāpanna, sakadāgāmī, anāgāmī, arahant — are recognized only by a qualified teacher in the living tradition, and even then with great care. This document is for you and for that teacher.\n\n`;
  md += `---\n\n`;

  md += `## What you learned — the three layers\n\n`;
  md += `### Layer 1 — The Five Hindrances (Pañca nīvaraṇāni)\n\n`;
  md += `You worked with sensual desire, ill will, sloth-and-torpor, restlessness-worry, and doubt. You learned to recognize them as weather passing through the sky of mind — not as self. The Ajahn Chah cloud simile: the sky is not damaged when clouds pass through it; your mind is not damaged when these pass through it; the damage comes from believing you are the clouds.\n\n`;
  md += `**The practice that worked:** naming the hindrance as it arose, without fighting it. Not "I am anxious" but "restlessness is present." This single reframing is the foundation of everything else.\n\n`;

  md += `### Layer 2 — Māra's Ten Armies (Sn 3.2)\n\n`;
  md += `You engaged with the deeper defilements the Buddha faced under the Bodhi tree. You learned that these cannot be defeated in three days or three weeks — they weaken through sustained practice over long timeframes. You worked with one at a time.\n\n`;
  md += `**What the game tracked:** your engagement history across Kāmā, Arati, Khuppipāsā, Taṇhā, Thīna-middha, Bhīrū, Vicikicchā, Makkha-thambha, Lābha-siloka, and Att-ukkaṃsana.\n\n`;
  const armyLines = [];
  for (const a of MARA_ARMIES) {
    const entry = p.armies[a.id];
    if (entry && entry.consecutiveDays > 0) {
      armyLines.push(`- **${a.name}** (${a.english}) — ${entry.status}, ${entry.consecutiveDays} consecutive days sustained`);
    }
  }
  if (armyLines.length > 0) {
    md += armyLines.join('\n') + '\n\n';
  }

  md += `### Layer 3 — The Ten Fetters (Saṃyojana)\n\n`;
  md += `You learned the canonical map: self-identity view, doubt, clinging to rites, sensual desire, ill will, desire for fine-material existence, desire for immaterial existence, conceit, subtle restlessness, and ignorance. You learned that the four noble persons are marked by specific fetters falling away, and that the game could not verify this, only point toward it.\n\n`;
  md += `This is the most important thing the game could not teach you: real awakening. For that you need the cushion, a teacher, and time. The game is now out of your way.\n\n`;
  md += `---\n\n`;

  md += `## What you cultivated — the Seven Awakening Factors\n\n`;
  md += `You worked on sati, dhamma-vicaya, viriya, pīti, passaddhi, samādhi, and upekkhā. The game measured the first four from your practice data; the last three emerged in your sits and were always beyond what a tracker could measure well.\n\n`;
  md += `Final factor state at liberation:\n\n`;
  for (const row of factorRows) {
    const f = row.factor;
    if (row.measurable) {
      md += `- **${f.pali}** (${f.english}) — ${row.score === null ? 'no data' : row.score.toFixed(1) + ' / 10'}\n`;
    } else {
      md += `- **${f.pali}** (${f.english}) — ${row.emerged ? 'arose in practice' : 'did not visibly emerge in the game window'}\n`;
    }
  }
  md += `\n---\n\n`;

  md += `## What you bring into real practice\n\n`;
  md += `1. **A daily sit that does not depend on a tracker.** You did hundreds of sits inside this game. You no longer need the game to know how to sit. If you open your eyes tomorrow and the game is gone, the sit remains.\n\n`;
  md += `2. **The ability to name hindrances as they arise.** This is the single most portable skill the game taught. Keep doing it. Name them precisely, in Pali if you can, without fighting them. "Kāmā is present." "Vicikicchā is moving." Naming loosens the grip.\n\n`;
  md += `3. **Familiarity with the canonical map.** You now know the five hindrances, the ten armies, the ten fetters, the four noble persons, the seven awakening factors, the four noble truths, and the eightfold path — not as abstract lists but as structures you have worked within. This is rare and valuable. Guard it by keeping contact with the suttas.\n\n`;
  md += `4. **The middle way on effort.** You learned that gate passes are about reliable suppression, not uprooting — and that trying to uproot too early is counterproductive. This is the Buddha's own instruction. Carry it.\n\n`;
  md += `5. **The cloud simile.** When a difficult state arises, remember: you are not the cloud. The sky is already clear. This one teaching is worth more than most of the tool.\n\n`;
  md += `---\n\n`;

  md += `## Guidance for continuing without the game\n\n`;
  md += `**Keep sitting.** The same duration and frequency you built during the game. Do not increase it dramatically. Do not decrease it to zero.\n\n`;
  md += `**Find a teacher in the living tradition.** A self-report tool is a placeholder for a teacher; it is not a teacher. If you do not have one already, begin looking. Theravāda vihāras, Insight Meditation Society centers, Goenka Vipassana courses, and Dhamma Sukha are all places to start. A single retreat with a good teacher will do more than another year with any tracker.\n\n`;
  md += `**Keep a journal.** Plain paper is fine. The naming practice — "Kāmā is present today" — is now yours to do without any app counting it.\n\n`;
  md += `**Return to the suttas.** Especially MN 10 (Satipaṭṭhāna), MN 118 (Ānāpānasati), SN 46 (the Bojjhaṅga Saṃyutta), and AN 5.51 (the hindrances). These were the canonical ground underneath everything the game did.\n\n`;
  md += `**Do not try to verify your own awakening.** The canonical advice is clear: let a qualified teacher tell you, and be suspicious of your own certainty. The subtle fetters — conceit, residual restlessness, residual desire — have a way of hiding under the appearance of progress.\n\n`;
  md += `---\n\n`;

  md += `## A closing word\n\n`;
  md += `The Buddha's last words were *vayadhammā saṅkhārā, appamādena sampādetha* — "conditioned things are of a nature to decay; strive on with diligence." This game is a conditioned thing. It served its purpose. Now it decays, as it should, and you continue with diligence.\n\n`;
  md += `Go sit. There is nothing more the tool has to say.\n\n`;
  md += `---\n\n`;
  md += `*Final teaching summary generated ${liberationDate} from Habit Quest.*\n`;

  return md;
}

function downloadFinalTeachingSummary(memberId) {
  const member = state.members.find(m => m.id === memberId);
  const md = buildFinalTeachingSummary(memberId);
  try {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `final-teaching-summary-${(member?.name || 'member').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    alert('Download failed: ' + e.message);
  }
}
