// ============================================================================
// src/render/helpers.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 3 function(s): renderAdaptivePostureBody, renderSparkline, renderShadowCurveSVG
// ============================================================================

function renderAdaptivePostureBody(chosenPosture) {
  const chair = 'A chair — feet flat on the floor, back not touching the back of the chair (so the spine holds itself), hands resting on your thighs. This is the normal option for most people in the West. There is nothing lesser about it.';
  const cushion = 'A cushion on the floor — sit on the edge of a firm cushion (or a folded blanket) high enough that your knees are below your hips. Legs crossed loosely in front of you. This is only comfortable if your body already allows it; don\'t force it.';
  const bench = 'A meditation bench (seiza) — kneeling with a cushion or small bench between your heels. Works well for some people, hurts others. The bench takes the weight off the ankles.';
  const lying = 'Lying down — flat on your back with arms slightly out from the body, eyes slightly open if you can. Drowsiness is the main risk; if it wins, sit up. Fully honorable for bodies that need it.';
  const universal = 'In whatever posture you choose: let the spine be straight but not stiff, the way a growing plant is straight. Shoulders relaxed — let them drop. Hands resting, palms up or down, whatever\'s easy. Eyes gently closed, or half-open looking down at a spot a meter in front of you.\n\nIf something starts to hurt during the sit, you are allowed to adjust. Do it slowly, deliberately, and return to the breath.';

  if (chosenPosture === 'chair') {
    return `You chose to sit on a chair in your diagnostic — good. This is the posture you will use. Here is what to attend to.\n\n${chair}\n\n${universal}\n\nIf you want to try a different posture later, you can. The body knows. For now, the chair is your seat.`;
  }
  if (chosenPosture === 'cushion') {
    return `You chose to sit on a cushion on the floor — good. Here is what to attend to.\n\n${cushion}\n\n${universal}\n\nIf the knees hurt or the hips complain, move to a chair. No loss. The tradition cares about the attention, not the furniture.`;
  }
  if (chosenPosture === 'bench') {
    return `You chose a meditation bench — good. Here is what to attend to.\n\n${bench}\n\n${universal}\n\nThe bench is an excellent middle path for many bodies. If the ankles or shins complain, a folded blanket under them can help.`;
  }
  if (chosenPosture === 'lying') {
    return `You said you would lie down for now — honest. The body knows what it needs.\n\n${lying}\n\n${universal}\n\nWhen the body is ready, try sitting up. Meditation is available in every posture the body allows; the Buddha taught walking meditation too, and the reclining posture is one of the four postures of mindfulness. You are practicing.`;
  }
  // unsure or unset — even-handed presentation
  return `You have a few good options. Try one this week, then try another next week if it doesn\'t feel right. The body will tell you.\n\n${chair}\n\n${cushion}\n\n${bench}\n\n${universal}`;
}

function renderSparkline(data, opts) {
  opts = opts || {};
  if (!data || data.length === 0) {
    return `<div class="text-[10px] text-amber-100/40 italic py-2 text-center">no data yet</div>`;
  }
  const w = opts.width || 220;
  const h = opts.height || 36;
  const pad = 2;
  const values = data.map(d => typeof d === 'number' ? d : d.value);
  const min = opts.min != null ? opts.min : Math.min(...values, 0);
  const max = opts.max != null ? opts.max : Math.max(...values, 10);
  const range = (max - min) || 1;
  const stepX = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
  const yFor = v => h - pad - ((v - min) / range) * (h - 2 * pad);
  const xFor = i => pad + i * stepX;

  const linePts = values.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
  const color = opts.color || '#d4a857';
  const fillColor = opts.fillColor || 'rgba(212,168,87,0.15)';

  // Area fill polygon (line + bottom corners)
  const areaPts = `${xFor(0).toFixed(1)},${(h - pad).toFixed(1)} ` + linePts + ` ${xFor(values.length-1).toFixed(1)},${(h - pad).toFixed(1)}`;

  const dots = values.map((v, i) => `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(v).toFixed(1)}" r="1.6" fill="${color}"/>`).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block" preserveAspectRatio="none">
    <polygon points="${areaPts}" fill="${fillColor}" stroke="none"/>
    <polyline points="${linePts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

function renderShadowCurveSVG(currentRank, currentShadow) {
  const w = 360, h = 200, pad = 30;
  const xStep = (w - 2 * pad) / 9;
  const yMax = 100;
  // Build the path through all 10 floor points
  const points = SHADOW_FLOOR_BY_RANK.map((floor, rank) => {
    const x = pad + xStep * rank;
    const y = pad + (h - 2 * pad) * (1 - floor / yMax);
    return { x, y, floor, rank };
  });
  // Smooth path using monotone-ish curves
  const pathD = points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
  // Tier color split: amber for ranks 0-5, purple for 6-9
  const ariyaPath = points.slice(5).map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
  // Current rank position
  const cur = points[Math.max(0, Math.min(9, currentRank | 0))];
  // Current shadow position (shown as a separate dot above the floor)
  const curShadowY = pad + (h - 2 * pad) * (1 - Math.max(0, Math.min(100, currentShadow)) / yMax);
  // The "threshold" peak label at rank 5
  const peakX = points[5].x;
  const peakY = points[5].y;

  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="w-full">
      <!-- Y-axis grid lines at 25/50/75 -->
      ${[25, 50, 75].map(v => {
        const y = pad + (h - 2 * pad) * (1 - v / yMax);
        return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(120, 53, 15, 0.15)" stroke-width="1" stroke-dasharray="2 4"/>
                <text x="${pad - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="rgba(252, 211, 77, 0.45)">${v}</text>`;
      }).join('')}

      <!-- Floor curve, amber portion (ranks 0-5) -->
      <path d="${points.slice(0, 6).map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ')}"
            fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Floor curve, ariya portion (ranks 5-9), purple -->
      <path d="${ariyaPath}" fill="none" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>

      <!-- Floor area filled below for visual weight -->
      <path d="${pathD} L ${points[9].x} ${h - pad} L ${points[0].x} ${h - pad} Z"
            fill="rgba(180, 83, 9, 0.08)"/>

      <!-- Threshold marker at rank 5 -->
      <line x1="${peakX}" y1="${pad - 4}" x2="${peakX}" y2="${peakY}" stroke="rgba(168, 85, 247, 0.4)" stroke-width="1" stroke-dasharray="2 3"/>
      <text x="${peakX}" y="${pad - 8}" text-anchor="middle" font-size="9" fill="rgba(196, 181, 253, 0.7)" font-style="italic">the threshold</text>

      <!-- Stream marker between rank 5 and 6 -->
      <line x1="${points[5].x + xStep/2}" y1="${pad}" x2="${points[5].x + xStep/2}" y2="${h - pad}" stroke="rgba(168, 85, 247, 0.25)" stroke-width="1" stroke-dasharray="1 4"/>

      <!-- Rank dots along the curve -->
      ${points.map(p => {
        const isCurrent = p.rank === currentRank;
        const isAriya = p.rank >= 6;
        const fill = isCurrent ? (isAriya ? '#a855f7' : '#fbbf24') : (isAriya ? 'rgba(168, 85, 247, 0.4)' : 'rgba(180, 83, 9, 0.5)');
        const r = isCurrent ? 5 : 3;
        return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${isCurrent ? '#fef3c7' : 'transparent'}" stroke-width="${isCurrent ? 2 : 0}"/>`;
      }).join('')}

      <!-- Current shadow level as a separate marker above floor -->
      ${currentShadow > cur.floor ? `
        <line x1="${cur.x}" y1="${cur.y}" x2="${cur.x}" y2="${curShadowY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 2" opacity="0.7"/>
        <circle cx="${cur.x}" cy="${curShadowY}" r="4" fill="#ef4444" stroke="#fee2e2" stroke-width="1.5" opacity="0.85"/>
        <text x="${cur.x + 8}" y="${curShadowY + 3}" font-size="9" fill="#fca5a5">${currentShadow}</text>
      ` : ''}

      <!-- X-axis: rank labels -->
      ${points.map(p => `
        <text x="${p.x}" y="${h - pad + 10}" text-anchor="middle" font-size="8" fill="${p.rank === currentRank ? '#fef3c7' : 'rgba(252, 211, 77, 0.55)'}" font-weight="${p.rank === currentRank ? 'bold' : 'normal'}">${p.rank}</text>
      `).join('')}
      <text x="${pad}" y="${h - 6}" text-anchor="start" font-size="9" fill="rgba(252, 211, 77, 0.5)" font-style="italic">begin</text>
      <text x="${w - pad}" y="${h - 6}" text-anchor="end" font-size="9" fill="rgba(196, 181, 253, 0.55)" font-style="italic">arahant</text>

      <!-- Y-axis label -->
      <text x="6" y="${pad - 6}" font-size="9" fill="rgba(252, 211, 77, 0.55)" font-style="italic">Māra's pressure (floor)</text>
    </svg>
  `;
}
