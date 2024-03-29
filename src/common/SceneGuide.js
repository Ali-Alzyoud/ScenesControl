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
    return i;
}

SceneGuideRecord.ContainTime = function (record, time) {
    var fromArray = record.From.split(":");
    var toArray = record.To.split(":");

    var fromTime = Number(fromArray[0]) * 60 * 60 + Number(fromArray[1]) * 60 + Number(fromArray[2]);
    var toTime = Number(toArray[0]) * 60 * 60 + Number(toArray[1]) * 60 + Number(toArray[2]);

    if (fromTime >= toTime)
        return false;

    if (time >= fromTime && time <= toTime)
        return true;
    return false;
}

SceneGuideRecord.prototype.containTime = function (time) {
    var fromArray = this.From.split(":");
    var toArray = this.To.split(":");

    var fromTime = Number(fromArray[0]) * 60 * 60 + Number(fromArray[1]) * 60 + Number(fromArray[2]);
    var toTime = Number(toArray[0]) * 60 * 60 + Number(toArray[1]) * 60 + Number(toArray[2]);

    if (fromTime >= toTime)
        return false;

    if (time >= fromTime && time <= toTime)
        return true;
    return false;
}

SceneGuideRecord.prototype.setFromTime = function (time) {
    var hour = Math.floor(time / (60*60));
    var min = Math.floor((time / (60)) % 60);
    var sec = ((time) % 60).toFixed(2);

    this.From = `${hour}:${min}:${sec}`;
    this.id = id++;
}

SceneGuideRecord.prototype.setToTime = function (time) {
    var hour = Math.floor(time / (60*60));
    var min = Math.floor((time / (60)) % 60);
    var sec = ((time) % 60).toFixed(2);

    this.To = `${hour}:${min}:${sec}`;
    this.id = id++;
}

SceneGuideRecord.prototype.endTime = function () {
    var toArray = this.To.split(":");
    var toTime = Number(toArray[0]) * 60 * 60 + Number(toArray[1]) * 60 + Number(toArray[2]);
    return toTime;
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
        //FIXME save data in order, then binary search
        var ret = [];
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            if (SceneGuideRecord.ContainTime(record, time))
                ret.push(record);
        }
        return ret;
    }
}

export { SceneGuideClass, SceneGuideRecord, SceneGeometry, SceneIntensity, SceneType };