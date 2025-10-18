-- say_relay.lua (server)
-- Рабочая серверная часть relay (base64 + chunking)
-- Положить в garrysmod/lua/autorun/server/say_relay.lua

util.AddNetworkString("say_relay")

local messageChunks = {}

concommand.Add("say_relay", function(ply, cmd, args, argStr)
    -- Команду должен вызывать только RCON/консоль
    if IsValid(ply) then return end
    if not istable(args) then return end

    -- Поддержка chunked сообщений
    if #args > 2 then
        if args[1] == "0" then
            -- Начало серии чанков: args = { "0", requestsAmount, messageHash, usernameB64 }
            local requestsAmount = tonumber(args[2])
            local messageHash = args[3]
            local username = args[4] or ""

            messageChunks[messageHash] = {
                chunks = {},
                username = username,
                requestsAmount = requestsAmount
            }
            print("[say_relay] chunk init: hash=" .. tostring(messageHash) .. " parts=" .. tostring(requestsAmount))
            return
        else
            -- Чанк: args = { partIndex, messageHash, chunkB64 }
            local requestID = tonumber(args[1])
            local messageHash = args[2]
            local chunk = args[3]

            if not messageChunks[messageHash] then
                print("[say_relay] warning: received chunk for unknown hash: " .. tostring(messageHash))
                return
            end

            messageChunks[messageHash].chunks[requestID] = chunk

            -- Проверяем, собраны ли все чанки
            local got = 0
            for k, _ in pairs(messageChunks[messageHash].chunks) do got = got + 1 end
            if got >= (messageChunks[messageHash].requestsAmount or 0) then
                -- Собираем содержимое в args
                args[1] = messageChunks[messageHash].username
                args[2] = ""
                for i = 1, (messageChunks[messageHash].requestsAmount or 0) do
                    args[2] = args[2] .. (messageChunks[messageHash].chunks[i] or "")
                end
                messageChunks[messageHash] = nil
                print("[say_relay] all chunks received, assembling message")
            else
                -- Ждём остальные чанки
                return
            end
        end
    end

    -- Пришёл полный запрос / или одиночный
    local usernameB64 = args[1] or ""
    local messageB64  = args[2] or ""

    local okUsername, username = pcall(util.Base64Decode, usernameB64)
    local okMessage, message     = pcall(util.Base64Decode, messageB64)

    if not okUsername then username = "DiscordUser" end
    if not okMessage then message = "" end

    if not username or username == "" then username = "DiscordUser" end
    if not message or message == "" then
        print("[say_relay] empty message received, skipping")
        return
    end

    -- Debug лог на сервере (покажет, что команда дошла)
    print(string.format("[say_relay] recv: username=%s message_len=%d", tostring(username), string.len(message)))

    -- Если слишком длинное — сжать и отправить compressed
    if string.len(message) > 1000 then
        local compressed_message = util.Compress(message)
        net.Start("say_relay")
            net.WriteBool(true)
            net.WriteString(username)
            net.WriteUInt(#compressed_message, 16)
            net.WriteData(compressed_message, #compressed_message)
        net.Broadcast()
        return
    end

    -- Обычный путь: отправляем username+message клиентам
    net.Start("say_relay")
        net.WriteBool(false)
        net.WriteString(username)
        net.WriteString(message)
    net.Broadcast()
end)

-- Утилита для отправки кастомных сообщений из Lua (сохраняет поведение repo)
function SendRelayMessage(displayname, message)
    if not displayname or string.len(displayname) == 0 then displayname = "NoUsername" end
    if not message or string.len(message) == 0 then message = "NoMessage" end

    local usernameb64 = util.Base64Encode(displayname)
    local messageb64  = util.Base64Encode(message)

    ServerLog("<CustomRelayMessage><" .. usernameb64 .. "><" .. messageb64 .. "> ")
end
