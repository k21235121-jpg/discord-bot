const { REST, Routes } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1493204958571532399";
const GUILD_ID = "1386584494529708133";

if (!TOKEN) {
    console.error("TOKEN が設定されていません");
    process.exit(1);
}

const commands = [
    {
        name: "today",
        description: "今日の担当を表示"
    },
    {
        name: "point",
        description: "自分のポイントを確認"
    },
    {
        name: "admin",
        description: "管理者用コマンド",
        options: [
            {
                name: "view",
                description: "全員のポイント一覧を表示",
                type: 1 // SUB_COMMAND
            },
            {
                name: "set",
                description: "特定メンバーのポイントを変更",
                type: 1,
                options: [
                    {
                        name: "name",
                        description: "メンバー名（例：りょう）",
                        type: 3, // STRING
                        required: true
                    },
                    {
                        name: "point",
                        description: "設定するポイント数",
                        type: 4, // INTEGER
                        required: true
                    }
                ]
            },
            {
                name: "reset",
                description: "全員のポイントをリセット",
                type: 1
            }
        ]
    }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("コマンド登録中...");

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("コマンド登録完了！");
    } catch (error) {
        console.error(error);
    }
})();