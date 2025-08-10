// A simple, self-contained Fountain parser.
// This eliminates the need for external, unreliable libraries.

function parse(script) {
  const lines = script.split(/\r?\n/);
  let html = '';
  let in_dialogue = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.length === 0) {
      if (in_dialogue) {
        in_dialogue = false;
      }
      continue;
    }

    // Scene Headings (INT., EXT., etc.) or forced (starts with .)
    if (line.startsWith('INT.') || line.startsWith('EXT.') || line.startsWith('EST.') || line.startsWith('I/E.') || line.startsWith('.')) {
      html += `<div class="scene-heading">${line.replace('.', '')}</div>`;
      in_dialogue = false;
    }
    // Transitions (ends with TO:) or forced (starts with >)
    else if (line.endsWith('TO:') || line.startsWith('>')) {
      html += `<div class="transition">${line.replace('>', '')}</div>`;
      in_dialogue = false;
    }
    // Character Name (all caps)
    else if (line === line.toUpperCase() && line.match(/^[A-Z\s()0-9]+$/) && lines[i + 1] && lines[i + 1].trim() !== '') {
      html += `<div class="character">${line}</div>`;
      in_dialogue = true;
    }
    // Dialogue (follows a character)
    else if (in_dialogue) {
      // Parenthetical
      if (line.startsWith('(') && line.endsWith(')')) {
        html += `<div class="parenthetical">${line}</div>`;
      } else {
        html += `<div class="dialogue">${line}</div>`;
      }
    }
    // Action
    else {
      html += `<div class="action">${line}</div>`;
    }
  }

  return {
    html: {
      script: html
    }
  };
}

module.exports = { parse };