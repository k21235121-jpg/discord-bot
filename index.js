const { Client, GatewayIntentBits } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");

// ===== Express =====
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => console.log("Webサーバー起動"));

// ===== 環境変数 =====
const TOKEN = process.env.TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("環境変数不足");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ===== 管理者 =====
const ADMIN_ID = "1012884813650329710";

// ===== メンバー =====
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

// ===== 制約 =====
const cannotImage = ["りつき","せいちー","ゆうや"];

const heavySubjects = ["確率統計","応用物理","ディジタル信号処理"];
const normalSubjects = ["画像情報処理","電子回路","制御工学","ソフトウェア工学","英語購読"];

// ===== 時間割 =====
const timetable = {
    1: ["英語購読","確率統計"],
    2: ["情報通信","ディジタル信号処理","画像情報処理"],
    3: ["応用物理","ソフトウェア工学"],
    4: ["電子回路"],
    5: ["制御工学"]
};

// ===== 日付 =====
function getJSTDate(){
    return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Tokyo"}));
}

function getTodayStr(){
    return getJSTDate().toISOString().slice(0,10);
}

function getTodaySubjects(){
    const d = getJSTDate().getDay();
    if(d===0||d===6) return [];
    return timetable[d] || [];
}

// ===== DB =====
async function getPoints(){
    const { data } = await supabase.from("points").select("*");
    let p = {};
    memberNames.forEach(n=>p[n]=0);
    data.forEach(r=>p[r.name]=r.point);
    return p;
}

async function savePoints(points){
    const updates = Object.entries(points).map(([name,point])=>({name,point}));
    await supabase.from("points").upsert(updates,{onConflict:"name"});
}

// ===== 履歴保存 =====
async function saveHistory(date, result){
    const rows = [];

    for(let sub in result){
        const people = Array.isArray(result[sub]) ? result[sub] : [result[sub]];
        people.forEach(p=>{
            rows.push({date, subject: sub, name: p});
        });
    }

    await supabase.from("history").insert(rows);
}

// ===== 履歴復元 =====
function buildResultFromHistory(data){
    const result = {};
    data.forEach(r=>{
        if(!result[r.subject]) result[r.subject]=[];
        result[r.subject].push(r.name);
    });
    return result;
}

// ===== ソート =====
function sortMembers(points){
    return Object.entries(points)
        .sort((a,b)=>{
            if(a[1]===b[1]) return Math.random()-0.5;
            return a[1]-b[1];
        })
        .map(e=>e[0]);
}

// ===== 担当決定 =====
async function assignToday(){
    const points = await getPoints();
    const used = [];
    const result = {};

    for(let sub of heavySubjects){
        let c = sortMembers(points).filter(n=>!used.includes(n));
        let p1=c[0], p2=c[1];
        result[sub]=[p1,p2];
        points[p1]+=2;
        points[p2]+=2;
        used.push(p1,p2);
    }

    for(let sub of normalSubjects){
        let c = sortMembers(points).filter(n=>!used.includes(n));
        if(sub==="画像情報処理"){
            c = c.filter(n=>!cannotImage.includes(n));
        }
        let p=c[0];
        result[sub]=p;
        points[p]+=1;
        used.push(p);
    }

    if(getTodaySubjects().includes("情報通信")){
        result["情報通信"]=["そうすけ"];
    }

    return {result,points};
}

// ===== 1日1回 =====
async function confirmTodayOnce(){
    const today = getTodayStr();

    const { data } = await supabase
        .from("history")
        .select("*")
        .eq("date", today);

    if(data && data.length>0){
        return buildResultFromHistory(data);
    }

    const {result,points} = await assignToday();

    await savePoints(points);
    await saveHistory(today,result);

    return result;
}

// ===== 起動 =====
client.once("clientReady",()=>console.log("Bot起動！"));

// ===== コマンド =====
client.on("interactionCreate",async interaction=>{
    if(!interaction.isChatInputCommand()) return;

    // today
    if(interaction.commandName==="today"){
        const subjects = getTodaySubjects();
        if(subjects.length===0){
            return interaction.reply("今日は授業なし！");
        }

        await interaction.deferReply();
        const data = await confirmTodayOnce();

        let msg="📚 今日の担当\n\n";
        for(let sub of subjects){
            if(!data[sub]) continue;
            const names = Array.isArray(data[sub]) ? data[sub] : [data[sub]];
            msg += `${sub}：${names.map(n=>`<@${members[n]}>`).join("・")}\n`;
        }

        interaction.editReply(msg);
    }

    // point
    if(interaction.commandName==="point"){
        await interaction.deferReply({ephemeral:true});
        const points = await getPoints();

        const name = Object.keys(members).find(n=>members[n]===interaction.user.id);
        if(!name) return interaction.editReply("未登録");
        if(name==="そうすけ") return interaction.editReply("対象外");

        interaction.editReply(`あなたのポイント：${points[name]}pt`);
    }

    // admin
    if(interaction.commandName==="admin"){
        if(interaction.user.id!==ADMIN_ID){
            return interaction.reply({content:"管理者のみ",ephemeral:true});
        }

        const sub = interaction.options.getSubcommand();

        // view
        if(sub==="view"){
            await interaction.deferReply({ephemeral:true});
            const points = await getPoints();

            let msg="📊 ポイント一覧\n\n";
            Object.entries(points)
                .sort((a,b)=>a[1]-b[1])
                .forEach(([n,p])=>{
                    msg += `${n}：${p}pt\n`;
                });

            interaction.editReply(msg);
        }

        // history
        if(sub==="history"){
            await interaction.deferReply({ephemeral:true});
            const { data } = await supabase
                .from("history")
                .select("*")
                .order("date",{ascending:false})
                .limit(20);

            let msg="📜 履歴\n\n";
            data.forEach(r=>{
                msg += `${r.date} ${r.subject}：${r.name}\n`;
            });

            interaction.editReply(msg);
        }

        // reset（追加）
        if(sub==="reset"){
            const reset = memberNames.map(n=>({name:n,point:0}));

            await supabase
                .from("points")
                .upsert(reset,{onConflict:"name"});

            interaction.reply({
                content:"全員のポイントをリセットしました",
                ephemeral:true
            });
        }
    }
});

client.login(TOKEN);