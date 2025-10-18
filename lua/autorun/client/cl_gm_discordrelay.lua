-- say_relay.lua (client)
-- Положить в garrysmod/lua/autorun/client/say_relay.lua

net.Receive("say_relay", function()
    local isCompressed = net.ReadBool()
    local username = net.ReadString()
    local message

    if isCompressed then
        local length = net.ReadUInt(16)
        local data = net.ReadData(length)
        -- util.Decompress возвращает строку или ошибку -> pcall для безопасности
        local ok, dec = pcall(util.Decompress, data)
        if ok then
            message = dec or ""
        else
            message = "[decompress error]"
        end
    else
        message = net.ReadString()
    end

    if not username or username == "" then username = "DiscordUser" end
    if not message or message == "" then return end

    -- Выводим в чат — имя как строку
    chat.AddText(
        Color(0,30,255), "[Discord] ",
        Color(255,255,255), tostring(username) .. ": ",
        Color(255,255,255), message
    )
end)
