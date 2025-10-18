# Homigrad.com-Bot
Bot frrom HOMIGRAD.COM Server in garrys mod created by me
## What this bot can do?
+ Can make status of server
+ Can send messages to the server that were written in the channel
+ Can use ULX Commands and Server commands

**This bot making on russian language if you need on english you can change words in `index.js`**

![Preview](https://cdn.discordapp.com/attachments/1419710406276022404/1429186164958560386/Discord_4QWIUxQsSx.png?ex=68f538d6&is=68f3e756&hm=db3e90e28865c8aa02afebadcc82577ceb615ced339967700257fdb98c5f8d92&)
![Preview](https://cdn.discordapp.com/attachments/1419203577804619950/1429185820882898964/Medal_XBuwTIPGwS.png?ex=68f53884&is=68f3e704&hm=fdbb7c93a3d7afee787f591619662f63a81529b0e3bcb851e8059f0c43e44789&)
### How install this bot?
First you need Node.Js service on your computer or server and

1.Download all repository files and put everywhere where you can put

2.Open your `cmd` or `terminal (if you use linux)`

3.In cmd type this command to install module and other files
  * `npm init -y`
  * `npm install discord.js rcon-client`
  
4. Configure `config.cjs` File and put **Discord bot token** and **Server and port**

```node.js
// config.cjs
module.exports = {
  discordToken:
    "youtoken",
  discordChannelId: "discord channel to relay messages", // iscord channel to relay messages
  discordStatusChannelId: "channel status of server", // channel status of server
  rcon: {
    host: "188.127.241.201", //ip of server
    port: 28118, // port
    password: "463719", // rcon password check in server.cfg
  },
  // options:
  prefix: "{Discord}", // dont touch
  relayBots: false, // dont touch
  ignoreCommandsStartingWith: "!", // dont touch
};

```
 




