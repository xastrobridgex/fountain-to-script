// A professional-grade, self-contained Fountain parser.
// Logic inspired by the robust regular expressions found in the fountain-vscode extension.
// This version correctly handles a wide range of Fountain syntax and edge cases.

function parse(script) {
  const lines = script.split(/\r?\n/);
  let html = '';
  let title_page_html = '';
  let in_dialogue = false;
  let is_title_page = true;

  // --- Regex patterns inspired by fountain-vscode ---
  const scene_heading_regex = /^\s*(INT|EXT|EST|I\/E|INT\.\/EXT|INT\/EXT)\.?.*/i;
  const forced_scene_heading_regex = /^\./;
  const transition_regex = /(TO:|FADE TO BLACK\.|FADE OUT\.|CUT TO BLACK\.|FADE IN:)$/;
  const forced_transition_regex = /^>/;
  const character_regex = /^\s*[A-Z0-9\s_]+(\s*\(.*\))?$/;
  const centered_regex = /^\s*>\s*(.*?)\s*<$/;

  // --- Helper function for emphasis (bold, italics, etc.) ---
  function applyEmphasis(line) {
    return line
      .replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/_(.*?)_/g, '<u>$1</u>');
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed_line = line.trim();

    // --- Title Page Logic ---
    if (is_title_page) {
      if (trimmed_line.includes(':')) {
        const [key, ...valueParts] = trimmed_line.split(':');
        const value = valueParts.join(':').trim();
        const key_lower = key.toLowerCase();

        if (key_lower === 'title') {
          title_page_html += `<h1>${value}</h1>`;
        } else if (key_lower === 'credit') {
          title_page_html += `<p class="credit">${value}</p>`;
        } else if (key_lower === 'author' || key_lower === 'authors') {
          title_page_html += `<p class="authors">${value}</p>`;
        } else if (key_lower === 'draft date' || key_lower === 'date') {
            title_page_html += `<p class="date">${value}</p>`;
        } else if (key_lower === 'contact') {
            title_page_html += `<p class="contact">${value}</p>`;
        } else if (key_lower === 'notes') {
            title_page_html += `<p class="notes">${value}</p>`;
        }
      } else if (trimmed_line.length > 0) {
        is_title_page = false;
      }
    }
    
    // --- Script Body Logic ---
    if (!is_title_page) {
      if (trimmed_line.length === 0) {
        if (in_dialogue) {
          in_dialogue = false;
        }
        continue;
      }

      // Page Break
      if (trimmed_line.match(/^===+$/)) {
        html += '<hr>';
        in_dialogue = false;
        continue;
      }

      // Centered Text
      const centered_match = trimmed_line.match(centered_regex);
      if (centered_match) {
        html += `<div class="centered">${applyEmphasis(centered_match[1])}</div>`;
        in_dialogue = false;
        continue;
      }
      
      // Scene Headings
      if (scene_heading_regex.test(trimmed_line) || forced_scene_heading_regex.test(trimmed_line)) {
        html += `<div class="scene-heading">${applyEmphasis(trimmed_line.replace(/^\./, ''))}</div>`;
        in_dialogue = false;
      }
      // Transitions
      else if (transition_regex.test(trimmed_line) || forced_transition_regex.test(trimmed_line)) {
        html += `<div class="transition">${applyEmphasis(trimmed_line.replace(/^>/, ''))}</div>`;
        in_dialogue = false;
      }
      // Character Name
      else if (
        !in_dialogue &&
        character_regex.test(trimmed_line) &&
        i + 1 < lines.length &&
        lines[i + 1].trim().length > 0 &&
        !scene_heading_regex.test(lines[i + 1])
      ) {
        // Dual Dialogue Check
        if (trimmed_line.endsWith('^')) {
            html += `<div class="dual-dialogue-character">${trimmed_line.slice(0,-1).trim()}</div>`;
        } else {
            html += `<div class="character">${trimmed_line}</div>`;
        }
        in_dialogue = true;
      }
      // Dialogue (follows a character)
      else if (in_dialogue) {
        // Parenthetical
        if (trimmed_line.startsWith('(') && trimmed_line.endsWith(')')) {
          html += `<div class="parenthetical">${trimmed_line}</div>`;
        } else {
          // Dual Dialogue Check
          if (lines[i-1] && lines[i-1].trim().endsWith('^')) {
              html += `<div class="dual-dialogue">${applyEmphasis(trimmed_line)}</div>`;
          } else {
              html += `<div class="dialogue">${applyEmphasis(trimmed_line)}</div>`;
          }
        }
      }
      // Action
      else {
        html += `<div class="action">${applyEmphasis(line.trim())}</div>`;
      }
    }
  }

  return {
    title: '', // Placeholder
    html: {
      title_page: title_page_html,
      script: html
    }
  };
}

module.exports = { parse };
