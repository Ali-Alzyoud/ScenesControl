class SrtRecord {
    static ConvertToTime(str) {
        let time = 0;
        let strs;
        str = str.replace(',', ':');
        str = str.replace('.', ':');
        str = str.replace(' ', '');
        strs = str.split(':');
        time += Number(strs[0]) * 60 * 60 * 1000;
        time += Number(strs[1]) * 60 * 1000;
        time += Number(strs[2]) * 1000;
        time += Number(strs[3]);

        return time;
    }
    constructor(text) {
        let fields = text.split('\n');
        let timeFields = fields[1].split('-->');
        this.from = SrtRecord.ConvertToTime(timeFields[0]);
        this.to = SrtRecord.ConvertToTime(timeFields[1]);
        this.content = fields.slice(2);
    }
}
class SrtObject {
    constructor(content, success) {

        fetch(content)
            .then(response => response.text())
            .then(data => {
                var text = data;
                this.recordsRaw = text.split('\n\r\n');
                let skip = 0;
                for (let i = 0; i < this.recordsRaw.length; i++) {
                    if (this.recordsRaw[i].length == 0) {
                        skip++;
                    }
                }
                this.records = [this.recordsRaw.length - skip];
                this.init();
            });
    }

    init() {
        for (let i = 0; i < this.recordsRaw.length; i++) {
            if (this.recordsRaw[i].length != 0) {
                this.records[i] = new SrtRecord(this.recordsRaw[i]);
            }
        }
    }

    getContentAt(time) {
        //FIXME, use binary search
        if (this.records) {
            for (let i = 0; i < this.records.length; i++) {
                var record = this.records[i];
                if (time >= record.from && time <= record.to) {
                    return record.content;
                }
            }
        }

        return [];
    }
}

export default SrtObject;