// config.cjs
module.exports = {
  discordToken:
    "yourtoken",
  discordChannelId: "id channel", // discord channel to relay messages
  discordStatusChannelId: "1419710406276022404", // сchannel status of server
  rcon: {
    host: "188.127.241.201", //ip of server
    port: 28118, // port
    password: "463719", // rcon password check in server.cfg
  },
  // опции:
  prefix: "{Discord}", // не трогать
  relayBots: false, // не трогать
  ignoreCommandsStartingWith: "!", // а это похуй
};

