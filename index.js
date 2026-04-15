const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// =====================
// Express（Render起動維持用）
// =====================
const app = express();

app.get("/", (req, res) => {
    res.send("Bot is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Webサーバー起動");
});

// =====================
// TOKENチェック
// =====================
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error("TOKEN が設定されていません");
    process.exit(1);
}

// =====================
// Discord Client
// =====================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// =====================
// メンバー
// =====================
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

const memberNames = Object.keys(members).filter(n => n !== "そうすけ");

// =====================
// 制約
// =====================
const cannotImage = ["りつき", "せいちー", "ゆうや"];

const heavySubjects = ["確率統計", "応用物理", "ディジタル信号処理"];
const normalSubjects = ["画像情報処理", "電子回路", "制御工学"];

// =====================
// 時間割（JS曜日基準）
// =====================
const timetable = {
    1: ["確率統計"],
    2: ["情報通信", "ディジタル信号処理", "画像情報処理"],
    3: ["応用物理"],
    4: ["電子回路"],
    5: ["制御工学"]
};

// =====================
// JST日付
// =====================
function getJSTDate() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

// =====================
// 日数差分
// =====================
const startDate = new Date("2026-04-15T00:00:00+09:00");

function getDiffDays() {
    const now = getJSTDate();
    now.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

// =====================
// ポイント初期化
// =====================
function initPoints() {
    let p = {};
    memberNames.forEach(n => (p[n] = 0));
    return p;
}

// =====================
// 1日シミュレーション
// =====================
function simulateDay(points, returnAssign = false) {
    let used = [];
    let result = {};

    // 🔥 各教科の選出前に毎回最新ポイントでソート
    const getSorted = () =>
        Object.entries(points)
            .sort((a, b) => a[1] - b[1])
            .map(e => e[0]);

    // 重い科目（2人担当）
    for (let sub of heavySubjects) {
        let candidates = getSorted().filter(n => !used.includes(n));

        if (candidates.length < 2) continue;

        let p1 = candidates[0];
        let p2 = candidates[1];

        points[p1] += 2;
        points[p2] += 2;

        used.push(p1, p2);

        if (returnAssign) result[sub] = [p1, p2];
    }

    // 軽い科目（1人担当）
    for (let sub of normalSubjects) {
        let candidates = getSorted().filter(n => !used.includes(n));

        if (sub === "画像情報処理") {
            candidates = candidates.filter(n => !cannotImage.includes(n));
        }

        if (candidates.length === 0) continue;

        let p = candidates[0];

        points[p] += 1;
        used.push(p);

        if (returnAssign) result[sub] = p;
    }

    // 固定担当
    if (returnAssign) {
        result["情報通信"] = ["そうすけ"];
    }

    return returnAssign ? result : null;
}

// =====================
// シミュレーション（指定日数分）
// =====================
function simulateUntil(days) {
    let points = initPoints();

    for (let i = 0; i < days; i++) {
        simulateDay(points);
    }

    return points;
}

// =====================
// 今日担当
// =====================
function assignToday() {
    const days = getDiffDays();
    let points = initPoints();

    for (let i = 0; i < days; i++) {
        simulateDay(points);
    }

    return simulateDay(points, true);
}

// =====================
// 今日の教科
// =====================
function getTodaySubjects() {
    const day = getJSTDate().getDay();
    if (day === 0 || day === 6) return [];
    return timetable[day] || [];
}

// =====================
// メンション
// =====================
function mention(name) {
    return `<@${members[name]}>`;
}

// =====================
// 起動
// =====================
client.once("ready", () => {
    console.log("Bot起動！");
    console.log("VERSION: stable-2026-04-15");
});

// =====================
// コマンド
// =====================
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // /today
    if (interaction.commandName === "today") {
        const subjects = getTodaySubjects();

        if (subjects.length === 0) {
            return interaction.reply("今日は授業なし！");
        }

        const data = assignToday();

        let msg = "📚 今日のノート担当\n\n";

        for (let sub of subjects) {
            if (!data[sub]) continue;

            if (Array.isArray(data[sub])) {
                msg += `${sub}：${data[sub].map(mention).join("・")}\n`;
            } else {
                msg += `${sub}：${mention(data[sub])}\n`;
            }
        }

        return interaction.reply(msg);
    }

    // /point
    if (interaction.commandName === "point") {
        const days = getDiffDays();

        // 🔥 今日分も含める（days + 1）
        const points = simulateUntil(days + 1);

        const userId = interaction.user.id;
        const myName = Object.keys(members).find(n => members[n] === userId);

        if (!myName) {
            return interaction.reply({
                content: "登録されていません",
                ephemeral: true
            });
        }

        if (myName === "そうすけ") {
            return interaction.reply({
                content: "あなたはポイント対象外です（固定担当）",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `あなたのポイント：${points[myName]}`,
            ephemeral: true
        });
    }
});

client.login(TOKEN);