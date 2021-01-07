const SceneIntensity = {
    High : "High",
    Low : "Low"
}

SceneIntensity.FromString = function(value){
    switch(value)
    {
        case SceneIntensity.High:
            return SceneIntensity.High;
        case SceneIntensity.Low:
            return SceneIntensity.Low;
        default:
            return SceneIntensity.Low;
    }
}

SceneIntensity.ToString = function(value){
    switch(value)
    {
        case SceneIntensity.High:
            return SceneIntensity.High;
        case SceneIntensity.Low:
            return SceneIntensity.Low;
        default:
            return SceneIntensity.Low;
    }
}

const SceneType = {
    Violence    : "Violence",
    Nudity      : "Nudity",
    Profanity   : "Profanity",
    Gore        : "Gore"
}

SceneType.FromString = function(value){
    switch(value)
    {
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

SceneType.ToString = function(value){
    switch(value)
    {
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

var SceneGuideRecord = function(from, to, age, type){
    from = from || "00:00:00";
    to = to || "00:00:00";
    age = age || SceneIntensity.Low;
    type = type || SceneType.Violence;

    this.From = from;
    this.To = to;
    this.Type = type;
    this.Age = age;
}
SceneGuideRecord.FromString = function(content){
    var v = new SceneGuideRecord("00:00:00", "00:00:00", SceneIntensity.Low, SceneType.Violence);
    v.fromString(content);
    return v;
}
SceneGuideRecord.FromHTML = function(content){
    var v = new SceneGuideRecord("00:00:00", "00:00:00", SceneIntensity.Low, SceneType.Violence);
    v.fromHTML(content);
    return v;
}
SceneGuideRecord.prototype.toString = function(){
    var str = "";
    str+= this.From + '\n' + this.To + '\n' + this.Type + '\n' + this.Age + '\n';
    return str;
}
SceneGuideRecord.prototype.fromString = function(lines) {
    for (var i = 0 ; i < Math.min(lines.length , 4) ; i++)
    {
        if( i == 0)
        this.From = lines[i];
        else if( i == 1)
        this.To = lines[i];
        else if( i == 2)
        {
            this.Type = SceneType.FromString(lines[i]);
        }
        else if( i == 3)
        {
            this.Age = SceneIntensity.FromString(lines[i]);
        }
    }
}

SceneGuideRecord.prototype.fromHTML = function(tr) {

    for (var i = 0 ; i < Math.min(tr.children.length , 4) ; i++)
    {
        var td = tr.children[i];
        if( i == 0)
        this.From = td.children[0].value + ":" + td.children[1].value + ":" +td.children[2].value;
        else if( i == 1)
        this.To = td.children[0].value + ":" + td.children[1].value + ":" +td.children[2].value;
        else if( i == 2)
        {
            this.Type = SceneType.FromString(td.children[0].value);
        }
        else if( i == 3)
        {
            this.Age = SceneIntensity.FromString(td.children[0].value);
        }
    }
}

SceneGuideRecord.prototype.containTime = function(time){
    var fromArray = this.From.split(":");
    var toArray = this.To.split(":");

    var fromTime = Number(fromArray[0])*60*60 + Number(fromArray[1])*60 + Number(fromArray[2]);
    var toTime = Number(toArray[0])*60*60 + Number(toArray[1])*60 + Number(toArray[2]);

    if (fromTime >= toTime)
        return false;

    if (time >= fromTime && time <= toTime)
        return true;
    return false;
}

SceneGuideRecord.prototype.endTime = function(){
    var toArray = this.To.split(":");
    var toTime = Number(toArray[0])*60*60 + Number(toArray[1])*60 + Number(toArray[2]);
    return toTime;
}

SceneGuideRecord.prototype.toHTML = function(){
    var str = "";
    str += "<tr>";
    var fromDates = this.From.split(":");
    var toDates = this.To.split(":");
    str += "<td><input value=" + fromDates[0] + ">:<input value=" + fromDates[1] + "></input>:<input value=" + fromDates[2] + "></input></td>";
    str += "<td><input value=" + toDates[0] + ">:<input value=" + toDates[1] + "></input>:<input value=" + toDates[2] + "></input></td>";
    str += "<td>";
    str += "<select name='Type'>"
    for(var key in SceneType) {
        var value = SceneType[key];
        if(typeof(value) == "string"){
            str += "<option value='" + value +"'";
            if (value == this.Type)
            {
                str += " selected"
            }
            str += ">" + value + "</option>";
        }
    }
    str += "</select>";
    str += "</td>";
    str += "<td>";
    str += "<select name='Age'>";
    for(var key in SceneIntensity) {
        var value = SceneIntensity[key];
        if(typeof(value) == "string"){
            str += "<option value='" + value +"'";
            if (value == this.Age)
            {
                str += " selected"
            }
            str += ">" + value + "</option>";
        }
    }
    str += "</select>";
    str += "</td>";
    str += "</tr>";
    return str;
}









/**************************************************************
 ******************* SceneGuideClass Class *******************
 **************************************************************/

var SceneGuideClass = function()
{
    this.Records = [];
}

SceneGuideClass.prototype.fromString = function(content)
{
    var lines = content.split('\n');
    for (var i = 0 ; i < lines.length ; i+=5)
    {
        var array = lines.slice(i, i+4);
        if (array.length < 4) return;
        this.Records.push(SceneGuideRecord.FromString(lines.slice(i, i+4)));
    }
}

SceneGuideClass.prototype.toString = function(parentGuideClass)
{
    var str = "";
    for(var i = 0 ; i < this.Records.length; i++)
    {
        var record = this.Records[i];
        str += record.toString() + "\n";
    }
    return str;
}

SceneGuideClass.prototype.toHTML = function(parentGuideClass)
{
    var str = "";
    for(var i = 0 ; i < this.Records.length; i++)
    {
        var record = this.Records[i];
        str += record.toHTML();
    }
    return str;
}

SceneGuideClass.prototype.fromHTML = function(tb_body)
{
    var childrens = tb_body.children;
    for (var i = 1 ; i < childrens.length ; i+=1)
    {
        this.Records.push(SceneGuideRecord.FromHTML(childrens[i]));
    }
}

SceneGuideClass.prototype.getRecordAtTime = function(time){
    //FIXME save data in order, then binary search
    for(var i = 0 ; i < this.Records.length; i++)
    {
        var record = this.Records[i];
        if (record.containTime(time))
            return record;
    }
    return null;
}

SceneGuideClass.prototype.getRecordsAtTime = function(time){
    //FIXME save data in order, then binary search
    var ret=[];
    for(var i = 0 ; i < this.Records.length; i++)
    {
        var record = this.Records[i];
        if (record.containTime(time))
        ret.push(record);
    }
    return ret;
}