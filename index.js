const { Client, GatewayIntentBits } = require("discord.js");

const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Webサーバー起動");
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

// 名前とID
const members = {
    "りょう": "899578475176951881",
    "しょうご": "549564110631731200",
    "ゆうしろう": "615031045745803265",
    "かずま": "1151182638430814318",
    "ゆうき": "877389401234214943",
    "えいる": "1067602571696537710",
    "こうちゃん": "1293407972491530291",
    "そうすけ": "1094556647428476928",
    "しゅうや": "1151490838833147965",
    "ゆうや": "1286688023773188217",
    "とうどう": "778602372757848074",
    "しょうた": "1152034332945428531",
    "せいちー": "954221457947369523",
    "たつき": "939108176769482772",
    "りつき": "789720442691911720",
    "れん": "1211204123891077193",
    "じん": "1086999122013335662",
    "たきはら": "1126094789784379429",
    "はる": "1012884813650329710"
};

// 🔥 そうすけ除外
const memberNames = Object.keys(members).filter(name => name !== "そうすけ");

// 🔥 画像NG
const cannotImage = ["りつき","せいちー","ゆうや"];

// 🔥 情報通信は除外
const heavySubjects = ["確率統計","応用物理","ディジタル信号処理"];
const normalSubjects = ["画像情報処理","電子回路","制御工学"];

// 時間割
const timetable = {
    1: ["確率統計"],
    2: ["情報通信","ディジタル信号処理","画像情報処理"],
    3: ["応用物理"],
    4: ["電子回路"],
    5: ["制御工学"]
};

const startDate = new Date("2026-04-15T00:00:00+09:00");

// 日数
function getDiffDays(){
    const today = new Date();
    return Math.floor((today - startDate) / (1000*60*60*24));
}

// ポイント初期化
function initPoints(){
    let p = {};
    memberNames.forEach(name => p[name] = 0);
    return p;
}

// シミュレーション
function simulateUntil(days){
    let points = initPoints();

    for(let d=0; d<=days; d++){
        let used = [];

        let sorted = Object.entries(points)
            .sort((a,b)=>a[1]-b[1])
            .map(e=>e[0]);

        // 重い
        heavySubjects.forEach(sub => {
            let candidates = sorted.filter(n => !used.includes(n));
            let p1 = candidates[0];
            let p2 = candidates[1];

            points[p1] += 2;
            points[p2] += 2;

            used.push(p1,p2);
        });

        // 軽い
        normalSubjects.forEach(sub => {
            let candidates = sorted.filter(n => !used.includes(n));

            if(sub === "画像情報処理"){
                candidates = candidates.filter(n => !cannotImage.includes(n));
            }

            let p = candidates[0];

            points[p] += 1;
            used.push(p);
        });
    }

    return points;
}

// 今日担当
function assignToday(){
    const days = getDiffDays();

    let points = initPoints();

    for(let d=0; d<days; d++){
        simulateDay(points);
    }

    return simulateDay(points, true);
}

// 1日分
function simulateDay(points, returnAssign=false){
    let used = [];
    let result = {};

    let sorted = Object.entries(points)
        .sort((a,b)=>a[1]-b[1])
        .map(e=>e[0]);

    // 重い
    heavySubjects.forEach(sub => {
        let candidates = sorted.filter(n => !used.includes(n));
        let p1 = candidates[0];
        let p2 = candidates[1];

        if(returnAssign) result[sub] = [p1,p2];

        points[p1]+=2;
        points[p2]+=2;

        used.push(p1,p2);
    });

    // 軽い
    normalSubjects.forEach(sub => {
        let candidates = sorted.filter(n => !used.includes(n));

        if(sub==="画像情報処理"){
            candidates = candidates.filter(n=>!cannotImage.includes(n));
        }

        let p = candidates[0];

        if(returnAssign) result[sub]=p;

        points[p]+=1;
        used.push(p);
    });

    // 🔥 情報通信は固定（ポイントなし）
    if(returnAssign){
        result["情報通信"] = ["そうすけ"];
    }

    if(returnAssign) return result;
}

// 今日の教科
function getTodaySubjects(){
    const day = new Date().getDay();
    if(day===0||day===6) return [];
    return timetable[day];
}

// メンション
function mention(name){
    return `<@${members[name]}>`;
}

// 起動
client.once("ready", () => {
    console.log("Bot起動！");
    console.log("VERSION: 2026-04-15-v1");
});

// コマンド
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // 今日
    if (interaction.commandName === "today") {

        const subjects = getTodaySubjects();
        const data = assignToday();

        if(subjects.length===0){
            return interaction.reply("今日は授業なし！");
        }

        let msg = "📚 今日のノート担当\n\n";

        for(let sub of subjects){
            if(data[sub]){
                if(Array.isArray(data[sub])){
                    msg += `${sub}：${data[sub].map(mention).join("・")}\n`;
                }else{
                    msg += `${sub}：${mention(data[sub])}\n`;
                }
            }
        }

        interaction.reply(msg);
    }

    // ポイント
    if (interaction.commandName === "point") {

        const days = getDiffDays();
        const points = simulateUntil(days);

        const userId = interaction.user.id;
        let myName = Object.keys(members).find(name => members[name] === userId);

        if (!myName) {
            return interaction.reply({
                content: "登録されていません",
                ephemeral: true
            });
        }

        let msg = `あなたのポイント：${points[myName]}`;

        interaction.reply({
            content: msg,
            ephemeral: true
        });
    }
});

client.login(TOKEN);