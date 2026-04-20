const { REST, Routes } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1493204958571532399";
const GUILD_ID = "1386584494529708133";

const commands = [
    {
        name: "today",
        description: "今日の担当を表示"
    },
    {
        name: "point",
        description: "自分のポイント確認"
    },
    {
        name: "admin",
        description: "管理者コマンド",
        options: [
            {
                name: "view",
                description: "ポイント一覧",
                type: 1
            },
            {
                name: "history",
                description: "履歴表示",
                type: 1
            },
            {
                name: "reset",
                description: "ポイントリセット",
                type: 1
            }
        ]
    }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
    console.log("コマンド登録完了");
})();