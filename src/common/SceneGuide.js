const SceneIntensity = {
    High: "High",
    Low: "Low"
}

const SceneType = {
    Violence: "violence",
    Nudity: "nudity",
    Sex: "sex",
    Profanity: "profanity"
}

export const SCENETYPE_ARRAY = Object.values(SceneType);

SceneIntensity.FromString = function (value) {
    switch (value) {
        case SceneIntensity.High:
            return SceneIntensity.High;
        case SceneIntensity.Low:
            return SceneIntensity.Low;
        default:
            return SceneIntensity.Low;
    }
}

SceneIntensity.ToString = function (value) {
    switch (value) {
        case SceneIntensity.High:
            return SceneIntensity.High;
        case SceneIntensity.Low:
            return SceneIntensity.Low;
        default:
            return SceneIntensity.Low;
    }
}



SceneType.FromString = function (value) {
    switch (value.toLowerCase()) {
        case SceneType.Violence:
            return SceneType.Violence;
        case SceneType.Nudity:
            return SceneType.Nudity;
        case SceneType.Sex:
            return SceneType.Sex;
        case SceneType.Profanity:
            return SceneType.Profanity;
        default:
            return SceneType.Violence;
    }
}

SceneType.ToString = function (value) {
    switch (value.toLowerCase()) {
        case SceneType.Violence:
            return SceneType.Violence;
        case SceneType.Nudity:
            return SceneType.Nudity;
        case SceneType.Sex:
            return SceneType.Sex;
        case SceneType.Profanity:
            return SceneType.Profanity;
        default:
            return SceneType.Violence;
    }
}

class SceneGeometry{
    constructor(l,t,w,h){
        this.left = l || 0;
        this.top = t || 0;
        this.width = w || 0;
        this.height = h || 0;
    }
    static FromString(str){
        const values = str.split('/');
        const l = Number(values[0]);
        const t = Number(values[1]);
        const w = Number(values[2]);
        const h = Number(values[3]);
        return new SceneGeometry(l,t,w,h);

    }
    toString(){
        return this.left+'/'+this.top+'/'+this.width+'/'+this.height;
    }
}




/***************************************************************
 ******************* SceneGuideRecord Class *******************
 ***************************************************************/
var id = 1;
var SceneGuideRecord = function (from, to, intensity, type) {
    from = from || "00:00:00.000";
    to = to || "00:00:00.000";
    intensity = intensity || SceneIntensity.Low;
    type = type || SceneType.Nudity;

    this.From = from;
    this.To = to;
    this.Type = type;
    this.Intensity = intensity;
    this.id = id++;
    this.geometries = [];
    this._from = SceneGuideRecord.parseTime(from);
    this._to = SceneGuideRecord.parseTime(to);
}
SceneGuideRecord.FromString = function (content) {
    var v = new SceneGuideRecord("00:00:00.000", "00:00:00.000", SceneIntensity.Low, SceneType.Violence);
    v.fromString(content);
    return v;
}
SceneGuideRecord.prototype.toString = function () {
    var str = "";
    str += this.From + '\n' + this.To + '\n' + this.Type + '\n' + this.Intensity + '\n';
    for( let i = 0;i < this.geometries.length; i++){
        const g = this.geometries[i];
        str += g.toString() + '\n';
    }
    return str;
}
SceneGuideRecord.prototype.fromString = function (lines) {
    let i = 0;
    for (i = 0; i < Math.min(lines.length, 4); i++) {
        if (i === 0)
            this.From = lines[i];
        else if (i === 1)
            this.To = lines[i];
        else if (i === 2) {
            this.Type = SceneType.FromString(lines[i]);
        }
        else if (i === 3) {
            this.Intensity = SceneIntensity.FromString(lines[i]);
        }
    }
    while(lines[i]){
        this.geometries.push(SceneGeometry.FromString(lines[i]));
        i++;
    }
    this._from = SceneGuideRecord.parseTime(this.From);
    this._to = SceneGuideRecord.parseTime(this.To);
    return i;
}

SceneGuideRecord.parseTime = function (str) {
    const p = str.split(":");
    return Number(p[0]) * 3600 + Number(p[1]) * 60 + Number(p[2]);
}

SceneGuideRecord.ContainTime = function (record, time) {
    return record._from < record._to && time >= record._from && time <= record._to;
}

SceneGuideRecord.prototype.containTime = function (time) {
    return this._from < this._to && time >= this._from && time <= this._to;
}

SceneGuideRecord.prototype.setFromTime = function (time, records) {
    var hour = Math.floor(time / (60*60));
    var min = Math.floor((time / (60)) % 60);
    var sec = ((time) % 60).toFixed(2);

    this.From = `${hour}:${min}:${sec}`;
    this._from = time;
    this.id = id++;
    if (records) records._sorted = false;
}

SceneGuideRecord.prototype.setToTime = function (time, records) {
    var hour = Math.floor(time / (60*60));
    var min = Math.floor((time / (60)) % 60);
    var sec = ((time) % 60).toFixed(2);

    this.To = `${hour}:${min}:${sec}`;
    this._to = time;
    this.id = id++;
    if (records) records._sorted = false;
}

SceneGuideRecord.prototype.endTime = function () {
    return this._to;
}

/**************************************************************
 ******************* SceneGuideClass Class *******************
 **************************************************************/
class SceneGuideClass
{
    static async ReadFile(url) {
        const response = await fetch(url);
        const data = await response.text();
        return SceneGuideClass.FromString(data);
      }
    
    static FromString = function (content) {
        const records = [];
        content = content.replaceAll('\r','')
        var lines = content.split('\n');
        for (var i = 0; i < lines.length;) {
            let k = i+1;
            while(k < lines.length && lines[k] !== '') k++;
            var array = lines.slice(i, k);
            if (array.length < 4) break;
            records.push(SceneGuideRecord.FromString(array));
            i=k+1;
        }
        records.sort((a, b) => a._from - b._from);
        records._sorted = true;
        return records;
    }
    
    static ToString = function (records) {
        var str = "";
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            str += record.toString() + "\n";
        }
        return str;
    }
    
    static GetRecordsAtTime = function (records, time) {
        if (!records || records.length === 0) return [];

        // If records were modified by the editor, fall back to linear scan
        if (!records._sorted) {
            const ret = [];
            for (let j = 0; j < records.length; j++) {
                const r = records[j];
                if (r._from < r._to && time >= r._from && time <= r._to)
                    ret.push(r);
            }
            return ret;
        }

        // Binary search: find first index where _from > time
        let lo = 0, hi = records.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (records[mid]._from <= time) lo = mid + 1;
            else hi = mid;
        }
        // All records[0..lo-1] have _from <= time; scan backward for those that also cover time
        const ret = [];
        for (let i = lo - 1; i >= 0; i--) {
            const r = records[i];
            if (r._from < r._to && r._to >= time) ret.push(r);
        }
        return ret;
    }
}

export { SceneGuideClass, SceneGuideRecord, SceneGeometry, SceneIntensity, SceneType };