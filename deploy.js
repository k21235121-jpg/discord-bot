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
        description: "ポイント確認"
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