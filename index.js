const { Client, GatewayIntentBits } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const cron = require("node-cron");

// =====================
// Express
// =====================
const app = express();

app.get("/", (req, res) => {
    res.send("Bot is running");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Webサーバー起動");
});

// =====================
// 環境変数
// =====================
const TOKEN = process.env.TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// 自動送信先チャンネル
const CHANNEL_ID = "1493407188058767360";

if (!TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("環境変数不足");
    process.exit(1);
}

// =====================
// Supabase
// =====================
const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// =====================
// Discord Client
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// =====================
// 管理者
// =====================
const ADMIN_ID = "1012884813650329710";

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
    "れん": "1211204123891077193",
    "じん": "1086999122013335662",
    "たきはら": "1126094789784379429",
    "はる": "1012884813650329710"
};

const memberNames = Object.keys(members).filter(
    n => n !== "そうすけ"
);

// =====================
// 制約
// =====================
const cannotImage = [
    "せいちー",
    "ゆうや"
];

// 2人担当
const heavySubjects = [
    "確率統計",
    "応用物理",
    "ディジタル信号処理",
    "電子回路",
    "制御工学"
];

// 1人担当
const normalSubjects = [
    "画像情報処理",
    "ソフトウェア工学"
];

// =====================
// 時間割
// =====================
const timetable = {
    1: [
        "確率統計"
    ],
    2: [
        "情報通信",
        "ディジタル信号処理",
        "画像情報処理"
    ],
    3: [
        "応用物理",
        "ソフトウェア工学"
    ],
    4: [
        "電子回路"
    ],
    5: [
        "制御工学"
    ]
};

// =====================
// 日付
// =====================
function getJSTDate() {
    return new Date(
        new Date().toLocaleString(
            "en-US",
            {
                timeZone: "Asia/Tokyo"
            }
        )
    );
}

function getTodayStr() {
    return getJSTDate()
        .toISOString()
        .slice(0, 10);
}

function getSubjects(day) {
    return timetable[day] || [];
}

function getTodaySubjects() {
    const day = getJSTDate().getDay();

    if (day === 0 || day === 6) {
        return [];
    }

    return getSubjects(day);
}
// =====================
// DB
// =====================
async function getPoints() {
    const { data, error } = await supabase
        .from("points")
        .select("*");

    if (error) throw error;

    const points = {};

    memberNames.forEach(name => {
        points[name] = 0;
    });

    if (data) {
        data.forEach(row => {
            if (row.name in points) {
                points[row.name] = row.point;
            }
        });
    }

    return points;
}

async function savePoints(points) {
    const updates = Object.entries(points).map(([name, point]) => ({
        name,
        point
    }));

    const { error } = await supabase
        .from("points")
        .upsert(updates, {
            onConflict: "name"
        });

    if (error) throw error;
}

// =====================
// 履歴保存
// =====================
async function saveHistory(date, result) {

    const rows = [];

    for (const subject in result) {

        const people = Array.isArray(result[subject])
            ? result[subject]
            : [result[subject]];

        people.forEach(name => {
            rows.push({
                date,
                subject,
                name
            });
        });
    }

    const { error } = await supabase
        .from("history")
        .insert(rows);

    if (error) throw error;
}

// =====================
// 履歴から復元
// =====================
function buildResultFromHistory(rows) {

    const result = {};

    rows.forEach(row => {

        if (!result[row.subject]) {
            result[row.subject] = [];
        }

        result[row.subject].push(row.name);

    });

    return result;
}

// =====================
// 並び替え
// =====================
function sortMembers(points) {

    return Object.entries(points)
        .sort((a, b) => {

            if (a[1] === b[1]) {
                return Math.random() - 0.5;
            }

            return a[1] - b[1];

        })
        .map(v => v[0]);
}

// =====================
// 担当決定
// 今日の教科だけポイント加算
// =====================
async function assignToday(dayOffset = 0) {

    const points = await getPoints();

    const used = [];

    const result = {};

    const date = getJSTDate();

    date.setDate(date.getDate() + dayOffset);

    const week = date.getDay();

    if (week === 0 || week === 6) {
        return {
            result: {},
            points
        };
    }

    const subjects = getSubjects(week);

    for (const subject of subjects) {

        if (subject === "情報通信") {
            result[subject] = ["そうすけ"];
            continue;
        }

        let candidates = sortMembers(points)
            .filter(name => !used.includes(name));

        if (subject === "画像情報処理") {
            candidates = candidates.filter(
                name => !cannotImage.includes(name)
            );
        }

        if (heavySubjects.includes(subject)) {

            const p1 = candidates[0];
            const p2 = candidates[1];

            result[subject] = [p1, p2];

            points[p1] += 2;
            points[p2] += 2;

            used.push(p1, p2);

        } else {

            const p = candidates[0];

            result[subject] = p;

            points[p] += 1;

            used.push(p);

        }

    }

    return {
        result,
        points
    };
}
// =====================
// 今日担当（1日1回）
// =====================
async function confirmTodayOnce() {

    const today = getTodayStr();

    const { data, error } = await supabase
        .from("history")
        .select("*")
        .eq("date", today);

    if (error) throw error;

    // 既に決定済みなら履歴から返す
    if (data && data.length > 0) {
        return buildResultFromHistory(data);
    }

    // 初回だけ抽選
    const { result, points } = await assignToday();

    await savePoints(points);
    await saveHistory(today, result);

    return result;
}

// =====================
// 明日の担当（ポイント保存なし）
// =====================
async function getTomorrowAssignment() {

    const { result } = await assignToday(1);

    return result;

}

// =====================
// メッセージ作成
// =====================
function buildMessage(subjects, data, title) {

    let msg = `${title}\n\n`;

    for (const subject of subjects) {

        if (!data[subject]) continue;

        const names = Array.isArray(data[subject])
            ? data[subject]
            : [data[subject]];

        msg += `${subject}：${names
            .map(name => `<@${members[name]}>`)
            .join("・")}\n`;

    }

    return msg;

}

// =====================
// 今日曜日取得
// =====================
function getTomorrowSubjects() {

    const date = getJSTDate();

    date.setDate(date.getDate() + 1);

    const day = date.getDay();

    if (day === 0 || day === 6) {
        return [];
    }

    return getSubjects(day);

}

// =====================
// 自動送信
// =====================
async function sendAssignment(title, subjects, data) {

    if (subjects.length === 0) return;

    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) return;

    await channel.send(
        buildMessage(subjects, data, title)
    );

}
// ===== 起動 =====
client.once("clientReady", () => {
    console.log("Bot起動！");

    // ==========================
    // 毎日22:00 翌日の担当を送信
    // ==========================
    cron.schedule("0 22 * * *", async () => {
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) return;

            const tomorrow = getTomorrowSubjects();

            if (tomorrow.length === 0) return;

            const result = await assignForSubjects(tomorrow);

            let msg = "🌙 明日のノート担当\n\n";

            for (const sub of tomorrow) {
                if (!result[sub]) continue;

                const people = Array.isArray(result[sub])
                    ? result[sub]
                    : [result[sub]];

                msg += `${sub}：${people.map(n => `<@${members[n]}>`).join("・")}\n`;
            }

            await channel.send(msg);

        } catch (err) {
            console.error("22時送信エラー", err);
        }
    }, {
        timezone: "Asia/Tokyo"
    });

    // ==========================
    // 毎日8:30 今日の担当を送信
    // ==========================
    cron.schedule("30 8 * * *", async () => {

        try {

            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) return;

            const subjects = getTodaySubjects();

            if (subjects.length === 0) return;

            const result = await confirmTodayOnce();

            let msg = "☀️ 今日のノート担当\n\n";

            for (const sub of subjects) {

                if (!result[sub]) continue;

                const people = Array.isArray(result[sub])
                    ? result[sub]
                    : [result[sub]];

                msg += `${sub}：${people.map(n => `<@${members[n]}>`).join("・")}\n`;
            }

            await channel.send(msg);

        } catch (err) {
            console.error("8:30送信エラー", err);
        }

    }, {
        timezone: "Asia/Tokyo"
    });

});
// ===== Discord起動 =====
client.once("clientReady", async () => {
    console.log("Bot起動！");

    // ===== 毎日22:00 明日の担当 =====
    cron.schedule("0 22 * * *", async () => {
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) return;

            const msg = await createTomorrowMessage();

            await channel.send({
                content: "🌙 明日のノート担当です！\n\n" + msg
            });

            console.log("22:00送信完了");
        } catch (err) {
            console.error("22:00送信失敗", err);
        }
    }, {
        timezone: "Asia/Tokyo"
    });

    // ===== 毎日8:30 今日の担当 =====
    cron.schedule("30 8 * * *", async () => {
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) return;

            const msg = await createTodayMessage();

            await channel.send({
                content: "☀️ 今日のノート担当です！\n\n" + msg
            });

            console.log("8:30送信完了");
        } catch (err) {
            console.error("8:30送信失敗", err);
        }
    }, {
        timezone: "Asia/Tokyo"
    });
});

// ===== スラッシュコマンド =====
client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // ===== /today =====
    if (interaction.commandName === "today") {

        await interaction.deferReply();

        try {

            const msg = await createTodayMessage();

            await interaction.editReply(msg);

        } catch (err) {

            console.error(err);

            await interaction.editReply("エラーが発生しました。");

        }

        return;
    }

    // ===== /point =====
    if (interaction.commandName === "point") {

        await interaction.deferReply({
            ephemeral: true
        });

        const points = await getPoints();

        const myName = Object.keys(members).find(
            n => members[n] === interaction.user.id
        );

        if (!myName) {
            return interaction.editReply("未登録です。");
        }

        if (myName === "そうすけ") {
            return interaction.editReply("ポイント対象外です。");
        }

        return interaction.editReply(
            `あなたのポイント：${points[myName]} pt`
        );
    }

    // ===== /admin =====
    if (interaction.commandName === "admin") {

        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({
                content: "管理者のみ使用できます。",
                ephemeral: true
            });
        }

        const sub = interaction.options.getSubcommand();

        // view
        if (sub === "view") {

            const points = await getPoints();

            let msg = "📊 ポイント一覧\n\n";

            Object.entries(points)
                .sort((a, b) => a[1] - b[1])
                .forEach(([n, p]) => {
                    msg += `${n}：${p}pt\n`;
                });

            return interaction.reply({
                content: msg,
                ephemeral: true
            });
        }

        // history
        if (sub === "history") {

            const { data } = await supabase
                .from("history")
                .select("*")
                .order("date", {
                    ascending: false
                })
                .limit(30);

            let msg = "📜 最新履歴\n\n";

            data.forEach(r => {
                msg += `${r.date} ${r.subject}：${r.name}\n`;
            });

            return interaction.reply({
                content: msg,
                ephemeral: true
            });
        }

        // reset
        if (sub === "reset") {

            const reset = memberNames.map(n => ({
                name: n,
                point: 0
            }));

            await supabase
                .from("points")
                .upsert(reset, {
                    onConflict: "name"
                });

            return interaction.reply({
                content: "ポイントを全員0にしました。",
                ephemeral: true
            });
        }
    }
});

// ===== ログイン =====
client.login(TOKEN);