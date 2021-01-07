
const VIDEO_STATE = {
    PLAY: "PLAY",
    PAUSE: "PAUSE"
};

const GUIDE_STATE = {
    ON: "ON",
    OFF: "OFF"
};

var parentGuideClass = null;
var video_state = VIDEO_STATE.STOP;
var guide_state = GUIDE_STATE.ON;
var edit_table = false;
var edit_file = false;
var edit_control = false;
var UI_UPDATE = false;

const ACTIONS = {
    BLUR: '-webkit-filter: blur(10px);',
    BLACK: '-webkit-filter: opacity(0%);',
    SKIP: 'SKIP'
};

function ACTION_from_string(str){
    if(str == "Blur")
      return ACTIONS.BLUR;
    if(str == "Black")
      return ACTIONS.BLACK;
    return ACTIONS.SKIP;
}

function ACTION_apply(video, action, record){
    if(action === ACTIONS.SKIP){
        video.currentTime = record.endTime() + 0.01;
        return false;
    }
    else
        video.style = action;
    return true;
}

document.addEventListener('DOMContentLoaded', function (event) {
    init();
    var video = document.getElementById("video");
    var play = document.getElementById("btn_play");
    var stop = document.getElementById("btn_stop");
    var guide = document.getElementById("btn_guide");
    var lbl = document.getElementById("lbl_time");
    var edit = document.getElementById("btn_edit");
    var btn_document = document.getElementById("btn_document");
    var control = document.getElementById("btn_control");
    var div_tb = document.getElementById("div_tb");
    var div_document = document.getElementById("div_document");
    var div_control = document.getElementById("div_control");
    var lbl_video = document.getElementById("lbl_video");
    function video_reset() {
        video.style = '';
        lbl_video.innerText = "";
        video.volume = 1.0;
    }
    setInterval(function () {

        var violence = ACTION_from_string(document.getElementById("sel_Violence").value);
        var nudity = ACTION_from_string(document.getElementById("sel_Nudity").value);
        var gore = ACTION_from_string(document.getElementById("sel_Gore").value);

        if (parentGuideClass && guide_state === GUIDE_STATE.ON) {
            var records = parentGuideClass.getRecordsAtTime(video.currentTime);
            if (records.length > 0) {
                lbl_video.innerText = "";
                video.style = '';
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var update = true;
                    if (record.Type == SceneType.Violence)
                        update = ACTION_apply(video, violence, record);
                    else if (record.Type == SceneType.Nudity)
                        update = ACTION_apply(video, nudity, record);
                    else if (record.Type == SceneType.Gore)
                        update = ACTION_apply(video, gore, record);
                    else if (record.Type == SceneType.Profanity)
                        video.volume = 0.0;
                    if (!lbl_video.innerText.includes(record.Type) && update)
                        lbl_video.innerText += record.Type + "\n";
                }
            }
            else {
                video_reset();
            }
        }
        var mm1 = Math.floor(video.duration / 60);
        var ss1 = Math.floor(video.duration % 60);
        var mm2 = Math.floor(video.currentTime / 60);
        var ss2 = Math.floor(video.currentTime % 60);
        var innerText = "";
        if (mm1 < 10) innerText += "0";
        innerText += mm1;
        innerText += ":";
        if (ss1 < 10) innerText += "0";
        innerText += ss1;

        innerText += " / ";

        if (mm2 < 10) innerText += "0";
        innerText += mm2;
        innerText += ":";
        if (ss2 < 10) innerText += "0";
        innerText += ss2;
        lbl.innerText = innerText;
    }, 100);
    video.addEventListener("pause", function () {
        video_state = VIDEO_STATE.PAUSE;
        play.src = "play.png";
    });
    video.addEventListener("ended", function () {
        video_state = VIDEO_STATE.PAUSE;
        play.src = "play.png";
        video.currentTime = 0;
    });
    video.addEventListener("play", function () {
        video_state = VIDEO_STATE.PLAY;
        play.src = "pause.png";
    });
    play.addEventListener("click", function () {
        if (video_state == VIDEO_STATE.PLAY)
            video.pause();
        else
            video.play();
    });
    stop.addEventListener("click", function () {
        video.pause();
        video.currentTime = 0;
    });
    guide.addEventListener("click", function () {
        video_reset();
        if (guide_state == GUIDE_STATE.ON) {
            guide_state = GUIDE_STATE.OFF;
            guide.style.opacity = "50%";
        }
        else {
            guide_state = GUIDE_STATE.ON;
            guide.style.opacity = "100%";
        }
    });
    edit.addEventListener("click", function () {
        if (edit_table === true) {
            edit.style.opacity = "50%";
            div_tb.style.display = "none";
        }
        else {
            edit.style.opacity = "100%";
            div_tb.style.display = "inherit";
        }
        edit_table = !edit_table;
    });
    btn_document.addEventListener("click", function () {
        if (edit_file === true) {
            btn_document.style.opacity = "50%";
            div_document.style.display = "none";
        }
        else {
            btn_document.style.opacity = "100%";
            div_document.style.display = "inherit";
        }
        edit_file = !edit_file;
    });
    control.addEventListener("click", function () {
        if (edit_control === true) {
            control.style.opacity = "50%";
            div_control.style.display = "none";
        }
        else {
            control.style.opacity = "100%";
            div_control.style.display = "inherit";
        }
        edit_control = !edit_control;
    });
});

function init() {
    UI_UPDATE = true;
    var contentFile = document.getElementById("contentID");
    var tb_body = document.getElementById("tb_body");
    parentGuideClass = new SceneGuideClass();
    parentGuideClass.fromString(contentFile.value);
    var td = "<tr>" +
        "<th>From (HH : MM : SS)</th>" +
        "<th>To (HH : MM : SS)</th>" +
        "<th>Type</th>" +
        "<th>Age</th>" +
        "</tr>";
    tb_body.innerHTML = td + parentGuideClass.toHTML();
    document.querySelectorAll("input").forEach(function (a) {
        a.onchange = update;
    });
    document.querySelectorAll("select:not(.action)").forEach(function (a) {
        a.onchange = update;
    });
    UI_UPDATE = false;
}

function save() {
    var contentFile = document.getElementById("contentID");
    var tb_body = document.getElementById("tb_body");
    parentGuideClass = new SceneGuideClass();
    parentGuideClass.fromHTML(tb_body);
    contentFile.value = parentGuideClass.toString();
}

function add() {
    UI_UPDATE = true;
    var contentFile = document.getElementById("contentID");
    var tb_body = document.getElementById("tb_body");
    parentGuideClass = new SceneGuideClass();
    parentGuideClass.fromHTML(tb_body);
    parentGuideClass.Records.push(new SceneGuideRecord());
    var td = "<tr>" +
        "<th>From (HH : MM : SS)</th>" +
        "<th>To (HH : MM : SS)</th>" +
        "<th>Type</th>" +
        "<th>Age</th>" +
        "</tr>";
    tb_body.innerHTML = td + parentGuideClass.toHTML();
    document.querySelectorAll("input").forEach(function (a) {
        a.onchange = update;
    });
    document.querySelectorAll("select:not(.action)").forEach(function (a) {
        a.onchange = update;
    });
    UI_UPDATE = false;
}

function remove() {
    UI_UPDATE = true;
    var contentFile = document.getElementById("contentID");
    var tb_body = document.getElementById("tb_body");
    parentGuideClass = new SceneGuideClass();
    parentGuideClass.fromHTML(tb_body);
    parentGuideClass.Records.pop();
    var td = "<tr>" +
        "<th>From (HH : MM : SS)</th>" +
        "<th>To (HH : MM : SS)</th>" +
        "<th>Type</th>" +
        "<th>Age</th>" +
        "</tr>";
    tb_body.innerHTML = td + parentGuideClass.toHTML();
    document.querySelectorAll("input").forEach(function (a) {
        a.onchange = update;
    });
    document.querySelectorAll("select:not(.action)").forEach(function (a) {
        a.onchange = update;
    });
    UI_UPDATE = false;
}

function update() {
    if (UI_UPDATE) return;
    parentGuideClass = new SceneGuideClass();
    parentGuideClass.fromHTML(tb_body);
}