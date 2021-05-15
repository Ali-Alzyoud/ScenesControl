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
  constructor(lines, index) {
    let timeFields = lines[index].split("-->");
    this.from = SrtRecord.ConvertToTime(timeFields[0]);
    this.to = SrtRecord.ConvertToTime(timeFields[1]);
    this.content = [];
    while((lines.length > (index + 1 + this.content.length)) && lines[index + 1 + this.content.length].length !== 0){
      this.content.push(lines[index + 1 + this.content.length]);
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
