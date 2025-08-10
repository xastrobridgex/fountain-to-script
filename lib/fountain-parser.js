// Professional Fountain parser with improved formatting
function parse(script) {
  const lines = script.split(/\r?\n/);
  let html = '';
  let title_page_html = '';
  let in_dialogue = false;
  let is_title_page = true;
  let scene_number = 0;
  let in_action = false;
  let current_action = [];

  // --- Regex patterns ---
  const scene_heading_regex = /^(INT|EXT|EST|I\/E|INT\.\/EXT|INT\/EXT)[\.\s]/i;
  const forced_scene_heading_regex = /^\.\s*(.+)/;
  const transition_regex = /^(.+)(TO:|IN:|OUT\.|BLACK\.)$/;
  const forced_transition_regex = /^>\s*(.+)/;
  const character_regex = /^[A-Z][A-Z0-9\s\-\.]+(\s*\([^\)]*\))?$/;
  const parenthetical_regex = /^\s*\([^\)]+\)\s*$/;
  const centered_regex = /^>\s*(.*?)\s*<$/;
  const page_break_regex = /^={3,}$/;
  const section_regex = /^#{1,6}\s+(.+)/;
  const synopsis_regex = /^=\s+(.+)/;
  const note_regex = /\[\[([^\]]+)\]\]/g;
  const boneyard_regex = /\/\*[\s\S]*?\*\//g;

  function applyEmphasis(text) {
    // Handle notes first
    text = text.replace(note_regex, '<!-- Note: $1 -->');
    
    // Remove boneyard content
    text = text.replace(boneyard_regex, '');
    
    // Apply text emphasis
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/_(.*?)_/g, '<u>$1</u>')
      .replace(/\\(.)/g, '$1'); // Handle escaped characters
  }

  function flushAction() {
    if (current_action.length > 0) {
      html += `<div class="action">${applyEmphasis(current_action.join(' '))}</div>`;
      current_action = [];
      in_action = false;
    }
  }

  // Process title page
  let i = 0;
  while (i < lines.length && is_title_page) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed === '' && i === 0) {
      i++;
      continue;
    }
    
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      const titlePageKeys = ['title', 'credit', 'author', 'authors', 'source', 
                            'draft date', 'date', 'contact', 'copyright', 'notes'];
      
      if (titlePageKeys.includes(key)) {
        // Handle multi-line values
        let fullValue = value;
        let j = i + 1;
        while (j < lines.length && lines[j].match(/^\s+/) && !lines[j].includes(':')) {
          fullValue += ' ' + lines[j].trim();
          j++;
        }
        
        switch(key) {
          case 'title':
            title_page_html += `<h1 class="title">${fullValue}</h1>`;
            break;
          case 'credit':
            title_page_html += `<p class="credit">${fullValue}</p>`;
            break;
          case 'author':
          case 'authors':
            title_page_html += `<p class="authors">${fullValue}</p>`;
            break;
          case 'source':
            title_page_html += `<p class="source">${fullValue}</p>`;
            break;
          case 'draft date':
          case 'date':
            title_page_html += `<p class="date">${fullValue}</p>`;
            break;
          case 'contact':
            title_page_html += `<p class="contact">${fullValue}</p>`;
            break;
          case 'copyright':
            title_page_html += `<p class="copyright">${fullValue}</p>`;
            break;
          case 'notes':
            title_page_html += `<p class="notes">${fullValue}</p>`;
            break;
        }
        i = j - 1;
      } else {
        is_title_page = false;
        i--;
      }
    } else if (trimmed.length > 0) {
      is_title_page = false;
      i--;
    }
    i++;
  }

  // Process script content
  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const nextTrimmed = nextLine.trim();

    // Handle blank lines
    if (trimmed === '') {
      flushAction();
      in_dialogue = false;
      continue;
    }

    // Page break
    if (page_break_regex.test(trimmed)) {
      flushAction();
      html += '<hr>';
      in_dialogue = false;
      continue;
    }

    // Section headers
    const sectionMatch = trimmed.match(section_regex);
    if (sectionMatch) {
      flushAction();
      html += `<div class="section">${applyEmphasis(sectionMatch[1])}</div>`;
      in_dialogue = false;
      continue;
    }

    // Synopsis
    const synopsisMatch = trimmed.match(synopsis_regex);
    if (synopsisMatch) {
      flushAction();
      html += `<div class="synopsis">${applyEmphasis(synopsisMatch[1])}</div>`;
      in_dialogue = false;
      continue;
    }

    // Centered text
    const centeredMatch = trimmed.match(centered_regex);
    if (centeredMatch) {
      flushAction();
      html += `<div class="centered">${applyEmphasis(centeredMatch[1])}</div>`;
      in_dialogue = false;
      continue;
    }

    // Scene headings
    const forcedSceneMatch = trimmed.match(forced_scene_heading_regex);
    if (forcedSceneMatch || scene_heading_regex.test(trimmed)) {
      flushAction();
      scene_number++;
      const headingText = forcedSceneMatch ? forcedSceneMatch[1] : trimmed;
      
      // Check for scene number in heading
      const sceneNumMatch = headingText.match(/#(\d+)#?$/);
      if (sceneNumMatch) {
        const cleanHeading = headingText.replace(/#\d+#?$/, '').trim();
        html += `<div class="scene-heading">` +
                `<span class="scene-number-left">${sceneNumMatch[1]}</span>` +
                `${cleanHeading}` +
                `<span class="scene-number-right">${sceneNumMatch[1]}</span>` +
                `</div>`;
      } else {
        html += `<div class="scene-heading">` +
                `<span class="scene-number-left">${scene_number}</span>` +
                `${headingText}` +
                `<span class="scene-number-right">${scene_number}</span>` +
                `</div>`;
      }
      in_dialogue = false;
      continue;
    }

    // Transitions
    const forcedTransMatch = trimmed.match(forced_transition_regex);
    if (forcedTransMatch || transition_regex.test(trimmed)) {
      flushAction();
      const transText = forcedTransMatch ? forcedTransMatch[1] : trimmed;
      html += `<div class="transition">${transText}</div>`;
      in_dialogue = false;
      continue;
    }

    // Character and dialogue
    if (!in_dialogue && 
        character_regex.test(trimmed) && 
        trimmed === trimmed.toUpperCase() &&
        nextTrimmed.length > 0 &&
        !scene_heading_regex.test(nextTrimmed)) {
      flushAction();
      
      // Check for dual dialogue marker
      const isDual = trimmed.endsWith('^');
      const charName = isDual ? trimmed.slice(0, -1).trim() : trimmed;
      
      html += `<div class="character">${charName}</div>`;
      in_dialogue = true;
      continue;
    }

    // Dialogue content
    if (in_dialogue) {
      if (parenthetical_regex.test(trimmed)) {
        html += `<div class="parenthetical">${trimmed}</div>`;
      } else {
        html += `<div class="dialogue">${applyEmphasis(trimmed)}</div>`;
      }
      continue;
    }

    // Action (default)
    // Check if line starts with "!" to force action
    if (line.startsWith('!')) {
      flushAction();
      html += `<div class="action">${applyEmphasis(line.substring(1).trim())}</div>`;
    } else {
      // Accumulate action lines
      if (in_action) {
        current_action.push(trimmed);
      } else {
        in_action = true;
        current_action = [trimmed];
      }
    }
  }

  // Flush any remaining action
  flushAction();

  return {
    title: '',
    html: {
      title_page: title_page_html,
      script: html
    }
  };
}

module.exports = { parse };