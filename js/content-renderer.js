/**
 * B2B LEARNING ENGINE - CONTENT BLOCK RENDERER
 * Renders JSON content blocks into semantic, accessible HTML.
 * Adheres strictly to Section 6, 7, 8, 12, 13 of PROJECT_RULES.md.
 *
 * Content is stored separately from presentation logic.
 */

import { showToast } from './components/toast.js';

/**
 * Render an array of content block objects into HTML string.
 * @param {Array} blocks - Content block array from lesson JSON
 * @returns {string} HTML string
 */
export function renderContentBlocks(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks.map(block => renderBlock(block)).join('');
}

function renderBlock(block) {
  switch (block.type) {
    case 'heading':           return renderHeading(block);
    case 'text':              return renderText(block);
    case 'callout':           return renderCallout(block);
    case 'image':             return renderImage(block);
    case 'diagram':           return renderDiagram(block);
    case 'scratch-block':     return renderScratchBlock(block);
    case 'code-stack':        return renderCodeStack(block);
    case 'copyable-prompt':   return renderCopyable(block);
    case 'ai-prompt':         return renderCopyable(block);
    case 'comparison-table':  return renderComparisonTable(block);
    case 'video-embed':       return renderVideoEmbed(block);
    case 'checklist-summary': return renderChecklistSummary(block);
    case 'interactive-quiz':  return renderQuiz(block);
    default:
      console.warn('ContentRenderer: Unknown block type:', block.type);
      return '';
  }
}

function renderHeading(block) {
  const level = block.level || 3;
  const tag = `h${level}`;
  return `<div class="content-block"><${tag} style="margin: 0 0 var(--space-2) 0;">${escapeHtml(block.value || block.text)}</${tag}></div>`;
}

function renderText(block) {
  const html = escapeHtml(block.value || block.text || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  return `<div class="content-block cb-text">${html}</div>`;
}

function renderCallout(block) {
  const variant = block.variant || 'info';
  const titleHtml = block.title ? `<div class="cb-callout-title">${escapeHtml(block.title)}</div>` : '';
  const textHtml = escapeHtml(block.text || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return `
    <div class="content-block cb-callout cb-callout-${variant}">
      ${titleHtml}
      <div class="cb-callout-text">${textHtml}</div>
    </div>`;
}

function renderDiagram(block) {
  if (block.diagramType === 'coordinate-grid') {
    return `
      <div class="content-block cb-diagram-box">
        <div class="cb-diagram-title">${escapeHtml(block.title || 'Diagram Sumbu Koordinat')}</div>
        <div class="diagram-grid-visual" aria-label="Visual sumbu X dan Y pada panggung Scratch">
          <div class="diagram-axis-x"></div>
          <div class="diagram-axis-y"></div>
          <span class="diagram-label diagram-label-center">(0, 0)</span>
          <span class="diagram-label diagram-label-right">+X (240) →</span>
          <span class="diagram-label diagram-label-left">← -X (-240)</span>
          <span class="diagram-label diagram-label-top">↑ +Y (180)</span>
          <span class="diagram-label diagram-label-bottom">↓ -Y (-180)</span>
        </div>
        ${block.caption ? `<div class="cb-diagram-caption">${escapeHtml(block.caption)}</div>` : ''}
      </div>`;
  }

  return `
    <div class="content-block cb-diagram-box">
      <div class="cb-diagram-title">${escapeHtml(block.title || 'Diagram')}</div>
      <div class="cb-diagram-caption">${escapeHtml(block.caption || '')}</div>
    </div>`;
}

function renderImage(block) {
  const caption = block.caption ? `<div class="cb-image-caption">${escapeHtml(block.caption)}</div>` : '';
  if (block.src) {
    return `
      <div class="content-block cb-image-box">
        <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || 'Gambar ilustrasi materi')}" loading="lazy">
        ${caption}
      </div>`;
  }

  // Structured accessible placeholder when local image file is not bundled
  return `
    <div class="content-block cb-image-box">
      <div class="cb-image-placeholder" role="img" aria-label="${escapeHtml(block.alt || 'Ilustrasi antarmuka Scratch')}">
        <span style="font-size: 1.75rem;">🖼️</span>
        <strong>${escapeHtml(block.alt || 'Ilustrasi Antarmuka')}</strong>
      </div>
      ${caption}
    </div>`;
}

function renderVideoEmbed(block) {
  return `
    <div class="content-block cb-video-box">
      <div class="cb-video-placeholder">
        <div class="video-play-icon" role="button" tabindex="0" aria-label="Putar video penjelasan">▶</div>
        <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${escapeHtml(block.title || 'Video Materi')}</div>
        ${block.duration ? `<small style="color: var(--color-text-muted);">Durasi: ${escapeHtml(block.duration)}</small>` : ''}
      </div>
      ${block.description ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: var(--space-2) 0 0 0;">${escapeHtml(block.description)}</p>` : ''}
    </div>`;
}

function renderScratchBlock(block) {
  const category = block.category || 'motion';
  const descHtml = escapeHtml(block.description || '');
  return `
    <div class="content-block cb-scratch-block">
      <span class="scratch-block-label" data-category="${category}">${escapeHtml(block.label)}</span>
      ${descHtml ? `<div class="scratch-block-desc">${descHtml}</div>` : ''}
    </div>`;
}

function renderCodeStack(block) {
  const blocksHtml = (block.blocks || []).map(b => {
    const cat = b.category || 'motion';
    const bgMap = {
      events: 'background-color: var(--color-scratch-events); color: var(--color-scratch-dark-text);',
      motion: 'background-color: var(--color-scratch-motion); color: var(--color-text-inverse);',
      looks: 'background-color: var(--color-scratch-looks); color: var(--color-text-inverse);',
      control: 'background-color: var(--color-scratch-control); color: var(--color-scratch-dark-text);',
      sensing: 'background-color: var(--color-scratch-sensing); color: var(--color-text-inverse);'
    };
    const style = bgMap[cat] || bgMap.motion;
    return `<div class="code-stack-block" style="${style}">${escapeHtml(b.text)}</div>`;
  }).join('');

  return `
    <div class="content-block cb-code-stack">
      <div class="code-stack-header">${escapeHtml(block.title || 'Code Stack')}</div>
      <div class="code-stack-body">${blocksHtml}</div>
    </div>`;
}

function renderCopyable(block) {
  const id = 'copy-' + Math.random().toString(36).substr(2, 8);
  return `
    <div class="content-block cb-copyable">
      <div class="cb-copyable-header">
        <span class="cb-copyable-label">${escapeHtml(block.label || block.title || 'Salin')}</span>
        <button type="button" class="btn-copy" data-copy-target="${id}" aria-label="Salin teks">
          <span class="copy-icon">📋</span> <span class="copy-text">Salin</span>
        </button>
      </div>
      <div class="cb-copyable-code" id="${id}">${escapeHtml(block.code)}</div>
    </div>`;
}

function renderComparisonTable(block) {
  const headersHtml = (block.headers || []).map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const rowsHtml = (block.rows || []).map(row => {
    const cells = row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div class="content-block">
      <table class="cb-comparison-table">
        <thead><tr>${headersHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function renderChecklistSummary(block) {
  const items = (block.items || []).map(item =>
    `<li>${escapeHtml(item)}</li>`
  ).join('');
  return `<ul class="content-block cb-checklist-summary">${items}</ul>`;
}

/**
 * Render interactive quiz from quiz/slide data.
 * @param {Object} quiz - Quiz block or slide object
 * @returns {string}
 */
export function renderQuiz(quiz) {
  const quizType = quiz.quizType || 'mcq';
  const typeLabels = {
    'mcq': 'Pilihan Ganda',
    'true-false': 'Benar atau Salah',
    'prediction': 'Pertanyaan Prediksi'
  };
  const typeLabel = typeLabels[quizType] || 'Kuis Pemahaman';

  const optionsHtml = (quiz.options || []).map((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    return `
      <div class="quiz-option" data-option-id="${opt.id}" data-correct="${opt.correct}"
           role="radio" aria-checked="false" tabindex="0">
        <span class="quiz-option-marker">${letter}</span>
        <div style="flex: 1;">
          <span>${escapeHtml(opt.text)}</span>
          <div class="quiz-explanation">${escapeHtml(opt.explanation || '')}</div>
        </div>
      </div>`;
  }).join('');

  const hintHtml = quiz.hint
    ? `<div class="quiz-hint" id="quiz-hint-${quiz.id}">💡 <strong>Petunjuk:</strong> ${escapeHtml(quiz.hint)}</div>`
    : '';

  return `
    <div class="quiz-container" data-quiz-id="${quiz.id}">
      <div class="quiz-type-badge">${typeLabel}</div>
      <div class="quiz-prompt">${escapeHtml(quiz.question || quiz.prompt)}</div>
      <div class="quiz-options" role="radiogroup">${optionsHtml}</div>
      ${hintHtml}
      <div class="quiz-actions">
        <button type="button" class="btn btn-primary btn-sm" data-quiz-check="${quiz.id}" disabled>
          Periksa Jawaban
        </button>
        ${quiz.hint ? `<button type="button" class="btn btn-ghost btn-sm" data-quiz-hint="${quiz.id}">💡 Tampilkan Petunjuk</button>` : ''}
      </div>
    </div>`;
}

/**
 * Attach interactive listeners to rendered content.
 * @param {HTMLElement} container
 * @param {Function} [onCheckpointChange] - Optional callback when checkpoint changes
 */
export function attachInteractions(container, onCheckpointChange) {
  if (!container) return;

  // 1. Copy Buttons (Section 8)
  container.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy-target');
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const text = targetEl.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        const textEl = btn.querySelector('.copy-text');
        const iconEl = btn.querySelector('.copy-icon');
        if (textEl) textEl.textContent = 'Tersalin!';
        if (iconEl) iconEl.textContent = '✓';
        showToast({ title: 'Teks Tersalin', message: 'Berhasil disalin ke clipboard.', type: 'success', duration: 2000 });
        setTimeout(() => {
          btn.classList.remove('copied');
          if (textEl) textEl.textContent = 'Salin';
          if (iconEl) iconEl.textContent = '📋';
        }, 2000);
      }).catch(() => {
        showToast({ title: 'Gagal Menyalin', message: 'Akses clipboard ditolak.', type: 'error' });
      });
    });
  });

  // 2. Interactive Quizzes (Section 7)
  container.querySelectorAll('.quiz-container').forEach(quiz => {
    const options = quiz.querySelectorAll('.quiz-option');
    const checkBtn = quiz.querySelector('[data-quiz-check]');
    let selectedOption = null;
    let answered = false;

    options.forEach(opt => {
      const selectHandler = () => {
        if (answered) return;
        options.forEach(o => {
          o.classList.remove('selected');
          o.setAttribute('aria-checked', 'false');
        });
        opt.classList.add('selected');
        opt.setAttribute('aria-checked', 'true');
        selectedOption = opt;
        if (checkBtn) checkBtn.disabled = false;
      };

      opt.addEventListener('click', selectHandler);
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectHandler();
        }
      });
    });

    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        if (!selectedOption || answered) return;
        answered = true;
        const isCorrect = selectedOption.getAttribute('data-correct') === 'true';

        options.forEach(o => {
          const correct = o.getAttribute('data-correct') === 'true';
          if (correct) o.classList.add('correct');
          if (o === selectedOption && !correct) o.classList.add('incorrect');
          o.style.cursor = 'default';
        });

        checkBtn.disabled = true;
        checkBtn.textContent = isCorrect ? '✓ Jawaban Benar!' : '✗ Jawaban Kurang Tepat';

        if (isCorrect) {
          showToast({ title: 'Hebat! Jawaban Benar 🎉', type: 'success', duration: 3000 });
        } else {
          showToast({ title: 'Belum Tepat', message: 'Perhatikan penjelasan di bawah pilihan jawaban.', type: 'warning', duration: 3500 });
        }
      });
    }

    const hintBtn = quiz.querySelector('[data-quiz-hint]');
    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        const quizId = hintBtn.getAttribute('data-quiz-hint');
        const hintEl = document.getElementById('quiz-hint-' + quizId);
        if (hintEl) hintEl.classList.toggle('visible');
      });
    }
  });

  // 3. Practice Checkpoints (Section 7)
  container.querySelectorAll('.checkpoint-check').forEach(check => {
    const handleToggle = () => {
      const checkpoint = check.closest('.checkpoint');
      if (!checkpoint) return;
      const isChecked = checkpoint.classList.toggle('checked');
      check.setAttribute('aria-checked', String(isChecked));
      check.innerHTML = isChecked ? '✓' : '';

      if (isChecked) {
        showToast({ title: 'Langkah Diselesaikan ✓', message: 'Checkpoint praktik berhasil ditandai.', type: 'success', duration: 2000 });
      }

      if (typeof onCheckpointChange === 'function') {
        const cpId = checkpoint.getAttribute('data-checkpoint-id');
        onCheckpointChange(cpId, isChecked);
      }
    };

    check.addEventListener('click', handleToggle);
    check.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    });
  });

  // 4. Video Placeholder click feedback
  container.querySelectorAll('.video-play-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      showToast({ title: 'Video Penjelasan', message: 'Memutar video demonstrasi konsep gerakan Scratch.', type: 'info', duration: 3000 });
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
