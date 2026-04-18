class SrtRecord {
  static ConvertToTime(str) {
    let time = 0;
    let strs;
    str = str.replace(",", ":");
    str = str.replace(".", ":");
    str = str.replace(" ", "");
    strs = str.split(":");
    time += Number(strs[0]) * 60 * 60 * 1000;
    time += Number(strs[1]) * 60 * 1000;
    time += Number(strs[2]) * 1000;
    time += Number(strs[3]);

    return time;
  }
  static ResolveTags(content) {
    // Standard SRT font tags
    content = content.replace(/<font color="([^"]+)">/gi, '<span style="color:$1">');
    content = content.replace(/<\/font>/gi, '</span>');
    // ASS/SSA override tag blocks like {\fs30\c&HFFFFFF&}
    if (content.includes('{')) {
      content = SrtRecord._resolveASSTags(content);
    }
    return content;
  }

  // Convert ASS BGR hex (BBGGRR) to CSS rgb()
  static _assColor(hex) {
    hex = hex.padStart(6, '0');
    const b = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const r = parseInt(hex.slice(4, 6), 16);
    return `rgb(${r},${g},${b})`;
  }

  // Parse one {...} block's tags into the shared styles object
  static _parseASSBlock(block, styles) {
    // Strip animation \t(...) — just remove, keep base styles
    block = block.replace(/\\t\([^)]*\)/g, '');
    // Strip position/clip/move/alignment — not renderable in inline CSS
    block = block.replace(/\\(?:pos|move|org|clip|iclip)\([^)]*\)/g, '');
    block = block.replace(/\\an?\d*/g, '');

    // Reset \r
    if (/\\r(?:[^a-z]|$)/.test(block)) {
      Object.keys(styles).forEach(k => delete styles[k]);
      return;
    }

    // \fs<size> — font size (treated as px)
    block = block.replace(/\\fs(\d+(?:\.\d+)?)/g, (_, v) => {
      styles.fontSize = `${Math.round(Number(v))}px`;
      return '';
    });

    // \1c or \c — primary text color (ASS BGR hex)
    block = block.replace(/\\(?:1c|c)&H([0-9A-Fa-f]{1,6})&?/g, (_, hex) => {
      styles.color = SrtRecord._assColor(hex);
      return '';
    });

    // \3c — outline color → CSS text-stroke
    block = block.replace(/\\3c&H([0-9A-Fa-f]{1,6})&?/g, (_, hex) => {
      styles['-webkit-text-stroke'] = `1px ${SrtRecord._assColor(hex)}`;
      return '';
    });

    // \alpha&HXX& — overall transparency (00=opaque, FF=transparent)
    block = block.replace(/\\alpha&H([0-9A-Fa-f]{2})&?/g, (_, hex) => {
      styles.opacity = (1 - parseInt(hex, 16) / 255).toFixed(2);
      return '';
    });

    // \b — bold (0/1 or weight value like 700)
    block = block.replace(/\\b(\d+)/g, (_, v) => {
      const w = parseInt(v);
      styles.fontWeight = w === 0 ? 'normal' : w === 1 ? 'bold' : String(w);
      return '';
    });

    // \i — italic
    block = block.replace(/\\i([01])/g, (_, v) => {
      styles.fontStyle = v === '1' ? 'italic' : 'normal';
      return '';
    });

    // \u — underline  \s — strikeout
    block = block.replace(/\\u([01])/g, (_, v) => {
      const td = styles.textDecoration || '';
      styles.textDecoration = v === '1'
        ? (td + ' underline').trim()
        : td.replace('underline', '').trim() || undefined;
      return '';
    });
    block = block.replace(/\\s([01])/g, (_, v) => {
      const td = styles.textDecoration || '';
      styles.textDecoration = v === '1'
        ? (td + ' line-through').trim()
        : td.replace('line-through', '').trim() || undefined;
      return '';
    });
  }

  static _resolveASSTags(text) {
    const parts = text.split(/(\{[^}]*\})/);
    const styles = {};
    let html = '';

    for (const part of parts) {
      if (part.startsWith('{') && part.endsWith('}')) {
        SrtRecord._parseASSBlock(part.slice(1, -1), styles);
      } else if (part) {
        const activeStyles = Object.entries(styles).filter(([, v]) => v != null);
        if (activeStyles.length > 0) {
          const css = activeStyles
            .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
            .join(';');
          html += `<span style="${css}">${part}</span>`;
        } else {
          html += part;
        }
      }
    }

    return html || text;
  }
  constructor(lines, index) {
    let timeFields = lines[index].split("-->");
    this.from = SrtRecord.ConvertToTime(timeFields[0]);
    this.to = SrtRecord.ConvertToTime(timeFields[1]);
    this.content = [];
    while((lines.length > (index + 1 + this.content.length)) && lines[index + 1 + this.content.length].length !== 0){
      const contentValue = lines[index + 1 + this.content.length];
      this.content.push(SrtRecord.ResolveTags(contentValue));
    }
  }
}
class SrtClass {
  /**
   *
   * @param {string} url path to srt file
   */
  static async ReadFile(url) {
    let recordsRaw = [];
    let records = [];

    const response = await fetch(url);
    const data = await response.text();

    var text = data;
    recordsRaw = text.split("\n");
    for (let i = 0; i < recordsRaw.length; i++) {
      recordsRaw[i] = recordsRaw[i].replace('\n','');
      recordsRaw[i] = recordsRaw[i].replace('\r','');
    }

    let i = 0;
    let recordIndex = 0;
    while (i < recordsRaw.length) {
        if(!recordsRaw[i].includes(' --> '))
        {
          i++;
          continue;
        }

        records[recordIndex] = new SrtRecord(recordsRaw, i);
        i += records[recordIndex].content.length + 1;
        recordIndex++;
    }

    return records;
  }

  static timeToString = (time, useComma = false) => {
    const hh = String(Math.floor(time / 60 / 60 / 1000)).padStart(2, 0);
    const mm = String(Math.floor(time / 60 / 1000)%60).padStart(2, 0);
    const ss = String(Math.floor(time / 1000)%60).padStart(2, 0);
    const ms = String(Math.floor(time % 1000)).padStart(3, 0);

    return hh + ":" + mm + ":" + ss + (useComma ? "," : ".") + ms;
  }

  static ToString = function (records) {
    var str = "";
    for (var i = 0; i < records.length; i++) {
      const record = records[i];
      str += i + 1;
      str += "\n"

      str += SrtClass.timeToString(record.from, true);
      str += " --> ";
      str += SrtClass.timeToString(record.to, true);
      str += "\n"
      for (let j = 0; j < record.content.length; j++) {
        str +=record.content[j];
        str += "\n"
      }
      str += "\n"
    }
    return str;
  }

  static GetContentAt(records, time) {
    time *= 1000;
    //ali.m FIXME, use binary search + sort records
    if (records) {
      for (let i = 0; i < records.length; i++) {
        var record = records[i];
        if (time >= record.from && time <= record.to) {
          return record.content;
        }
      }
    }

    return [];
  }
}

export default SrtClass;
