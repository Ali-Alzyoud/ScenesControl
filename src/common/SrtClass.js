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
  /**
   * Replace SRT tags like 'font color', 'b', 'i', 'u',
   * @param {String} content
   * @returns content with replaced tags
   */
  static ResolveTags(content){
    // FIXME handle b,i,u cases
    content = content.replace('<font color="', '<span style="color:');
    content = content.replace('</font>', '</span>');
    return content;
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
