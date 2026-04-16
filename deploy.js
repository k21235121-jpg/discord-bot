const { REST, Routes } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1493204958571532399";
const GUILD_ID = "1386584494529708133";

const commands = [
    { name: "today", description: "今日の担当" },
    { name: "point", description: "自分のポイント" },
    {
        name: "admin",
        description: "管理者用",
        options: [
            { name: "view", type: 1, description: "全員ポイント" },
            { name: "reset", type: 1, description: "リセット" },
            {
                name: "set",
                type: 1,
                description: "ポイント変更",
                options: [
                    { name: "name", type: 3, required: true, description: "名前" },
                    { name: "point", type: 4, required: true, description: "ポイント" }
                ]
            },
            { name: "history", type: 1, description: "履歴表示" }
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