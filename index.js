const { Client, GatewayIntentBits } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");
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
// 環境変数チェック
// =====================
const TOKEN = process.env.TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("環境変数が不足しています（TOKEN / SUPABASE_URL / SUPABASE_KEY）");
    process.exit(1);
}

// =====================
// Supabase
// =====================
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================
// Discord Client
// =====================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// =====================
// 管理者ID
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
// 時間割
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
// DB: ポイント取得（全員）
// =====================
async function getPointsFromDB() {
    const { data, error } = await supabase
        .from("points")
        .select("name, point");

    if (error) throw new Error(`ポイント取得失敗: ${error.message}`);

    const result = {};
    memberNames.forEach(n => (result[n] = 0));
    data.forEach(row => {
        if (result[row.name] !== undefined) {
            result[row.name] = row.point;
        }
    });

    return result;
}

// =====================
// DB: ポイント更新（1人）
// =====================
async function setPointInDB(name, point) {
    const { error } = await supabase
        .from("points")
        .upsert({ name, point }, { onConflict: "name" });

    if (error) throw new Error(`ポイント更新失敗: ${error.message}`);
}

// =====================
// DB: ポイント更新（複数）
// =====================
async function setPointsBatchInDB(updates) {
    const { error } = await supabase
        .from("points")
        .upsert(updates, { onConflict: "name" });

    if (error) throw new Error(`ポイント一括更新失敗: ${error.message}`);
}

// =====================
// DB: 全員リセット
// =====================
async function resetAllPointsInDB() {
    const resets = memberNames.map(n => ({ name: n, point: 0 }));
    const { error } = await supabase
        .from("points")
        .upsert(resets, { onConflict: "name" });

    if (error) throw new Error(`リセット失敗: ${error.message}`);
}

// =====================
// 今日の担当を決定（DBのポイントを使用）
// =====================
async function assignToday() {
    const points = await getPointsFromDB();
    const result = {};
    const used = [];

    const getSorted = () =>
        Object.entries(points)
            .sort((a, b) => a[1] - b[1])
            .map(e => e[0]);

    // 重い科目
    for (let sub of heavySubjects) {
        let candidates = getSorted().filter(n => !used.includes(n));
        if (candidates.length < 2) continue;

        let p1 = candidates[0];
        let p2 = candidates[1];

        result[sub] = [p1, p2];
        points[p1] += 2;
        points[p2] += 2;
        used.push(p1, p2);
    }

    // 軽い科目
    for (let sub of normalSubjects) {
        let candidates = getSorted().filter(n => !used.includes(n));
        if (sub === "画像情報処理") {
            candidates = candidates.filter(n => !cannotImage.includes(n));
        }
        if (candidates.length === 0) continue;

        let p = candidates[0];
        result[sub] = p;
        points[p] += 1;
        used.push(p);
    }

    // 固定担当
    result["情報通信"] = ["そうすけ"];

    return { result, points };
}

// =====================
// 担当確定してDBに反映
// =====================
async function confirmToday() {
    const { result, points } = await assignToday();

    const updates = Object.entries(points).map(([name, point]) => ({ name, point }));
    await setPointsBatchInDB(updates);

    return result;
}

// =====================
// 起動
// =====================
client.once("ready", () => {
    console.log("Bot起動！");
    console.log("VERSION: db-2026-04-15");
});

// =====================
// コマンド
// =====================
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // =====================
    // /today
    // =====================
    if (interaction.commandName === "today") {
        const subjects = getTodaySubjects();

        if (subjects.length === 0) {
            return interaction.reply("今日は授業なし！");
        }

        await interaction.deferReply();

        try {
            const data = await confirmToday();

            let msg = "📚 今日のノート担当\n\n";

            for (let sub of subjects) {
                if (!data[sub]) continue;

                if (Array.isArray(data[sub])) {
                    msg += `${sub}：${data[sub].map(mention).join("・")}\n`;
                } else {
                    msg += `${sub}：${mention(data[sub])}\n`;
                }
            }

            await interaction.editReply(msg);
        } catch (err) {
            console.error(err);
            await interaction.editReply("エラーが発生しました。");
        }
    }

    // =====================
    // /point
    // =====================
    if (interaction.commandName === "point") {
        await interaction.deferReply({ ephemeral: true });

        try {
            const points = await getPointsFromDB();
            const userId = interaction.user.id;
            const myName = Object.keys(members).find(n => members[n] === userId);

            if (!myName) {
                return interaction.editReply("登録されていません");
            }

            if (myName === "そうすけ") {
                return interaction.editReply("あなたはポイント対象外です（固定担当）");
            }

            await interaction.editReply(`あなたのポイント：${points[myName]}pt`);
        } catch (err) {
            console.error(err);
            await interaction.editReply("エラーが発生しました。");
        }
    }

    // =====================
    // /admin
    // =====================
    if (interaction.commandName === "admin") {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({
                content: "このコマンドは管理者のみ使用できます。",
                ephemeral: true
            });
        }

        const sub = interaction.options.getSubcommand();

        // /admin view
        if (sub === "view") {
            await interaction.deferReply({ ephemeral: true });

            try {
                const points = await getPointsFromDB();

                const sorted = Object.entries(points)
                    .sort((a, b) => a[1] - b[1]);

                let msg = "📊 全員のポイント一覧\n\n";
                sorted.forEach(([name, point]) => {
                    msg += `${name}：${point}pt\n`;
                });

                await interaction.editReply(msg);
            } catch (err) {
                console.error(err);
                await interaction.editReply("エラーが発生しました。");
            }
        }

        // /admin set
        if (sub === "set") {
            await interaction.deferReply({ ephemeral: true });

            try {
                const name = interaction.options.getString("name");
                const point = interaction.options.getInteger("point");

                if (!memberNames.includes(name)) {
                    return interaction.editReply(`「${name}」は登録されていません。`);
                }

                await setPointInDB(name, point);
                await interaction.editReply(`${name} のポイントを ${point}pt に変更しました。`);
            } catch (err) {
                console.error(err);
                await interaction.editReply("エラーが発生しました。");
            }
        }

        // /admin reset
        if (sub === "reset") {
            await interaction.deferReply({ ephemeral: true });

            try {
                await resetAllPointsInDB();
                await interaction.editReply("全員のポイントをリセットしました。");
            } catch (err) {
                console.error(err);
                await interaction.editReply("エラーが発生しました。");
            }
        }
    }
});

client.login(TOKEN);