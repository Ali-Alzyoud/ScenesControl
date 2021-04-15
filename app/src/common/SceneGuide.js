const SceneIntensity = {
    High: "High",
    Low: "Low"
}

const SceneType = {
    Violence: "Violence",
    Nudity: "Nudity",
    Profanity: "Profanity",
    Gore: "Gore"
}

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
    switch (value) {
        case SceneType.Violence:
            return SceneType.Violence;
        case SceneType.Nudity:
            return SceneType.Nudity;
        case SceneType.Profanity:
            return SceneType.Profanity;
        case SceneType.Gore:
            return SceneType.Gore;
        default:
            return SceneType.Violence;
    }
}

SceneType.ToString = function (value) {
    switch (value) {
        case SceneType.Violence:
            return SceneType.Violence;
        case SceneType.Nudity:
            return SceneType.Nudity;
        case SceneType.Profanity:
            return SceneType.Profanity;
        default:
            return SceneType.Violence;
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
    type = type || SceneType.Violence;

    this.From = from;
    this.To = to;
    this.Type = type;
    this.Intensity = intensity;
    this.id = id++;
}
SceneGuideRecord.FromString = function (content) {
    var v = new SceneGuideRecord("00:00:00.000", "00:00:00.000", SceneIntensity.Low, SceneType.Violence);
    v.fromString(content);
    return v;
}
SceneGuideRecord.prototype.toString = function () {
    var str = "";
    str += this.From + '\n' + this.To + '\n' + this.Type + '\n' + this.Intensity + '\n';
    return str;
}
SceneGuideRecord.prototype.fromString = function (lines) {
    for (var i = 0; i < Math.min(lines.length, 4); i++) {
        if (i == 0)
            this.From = lines[i];
        else if (i == 1)
            this.To = lines[i];
        else if (i == 2) {
            this.Type = SceneType.FromString(lines[i]);
        }
        else if (i == 3) {
            this.Intensity = SceneIntensity.FromString(lines[i]);
        }
    }
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

SceneGuideRecord.prototype.endTime = function () {
    var toArray = this.To.split(":");
    var toTime = Number(toArray[0]) * 60 * 60 + Number(toArray[1]) * 60 + Number(toArray[2]);
    return toTime;
}

/**************************************************************
 ******************* SceneGuideClass Class *******************
 **************************************************************/
var SceneGuideClass = function(str)
{
    this.Records = [];
    if (str){
        this.fromString(str);
    }
}

SceneGuideClass.prototype.fromString = function (content) {
    var lines = content.split('\n');
    for (var i = 0; i < lines.length; i += 5) {
        var array = lines.slice(i, i + 4);
        if (array.length < 4) return;
        this.Records.push(SceneGuideRecord.FromString(lines.slice(i, i + 4)));
    }
}

SceneGuideClass.prototype.toString = function (parentGuideClass) {
    var str = "";
    for (var i = 0; i < this.Records.length; i++) {
        var record = this.Records[i];
        str += record.toString() + "\n";
    }
    return str;
}

SceneGuideClass.prototype.getRecordsAtTime = function (time) {
    //FIXME save data in order, then binary search
    var ret = [];
    for (var i = 0; i < this.Records.length; i++) {
        var record = this.Records[i];
        if (record.containTime(time))
            ret.push(record);
    }
    return ret;
}

export { SceneGuideClass, SceneGuideRecord, SceneIntensity, SceneType };