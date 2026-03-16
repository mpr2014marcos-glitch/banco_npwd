local qbx = exports.qbx_core
local function getCitizenId(source)
    local player = qbx:GetPlayer(source)
    return player and player.PlayerData and player.PlayerData.citizenid or nil
end

local function getLicense(source)
    local license2 = GetPlayerIdentifierByType(source, 'license2')
    local license = GetPlayerIdentifierByType(source, 'license')
    return license2 or license
end
local function __pix_resolve_name_by_license(license)
    if not license then return nil end
    local s = exports.qbx_core:GetSource(license)
    if s and s ~= 0 then
        local player = exports.qbx_core:GetPlayer(s)
        local pd = player and player.PlayerData
        local ci = pd and pd.charinfo
        local nm = ci and ((ci.firstname or '') .. ' ' .. (ci.lastname or '')) or GetPlayerName(s)
        return nm
    end
    local rows = MySQL.query.await('SELECT charinfo FROM players WHERE license = ? LIMIT 1', { license })
    local info = rows and rows[1] and rows[1].charinfo
    if info then
        local ok, obj = pcall(json.decode, info)
        if ok and obj then
            local nm = ((obj.firstname or '') .. ' ' .. (obj.lastname or ''))
            if nm:gsub('%s+', '') ~= '' then return nm end
        end
    end
    local rows2 = MySQL.query.await('SELECT charinfo FROM players WHERE license2 = ? LIMIT 1', { license })
    local info2 = rows2 and rows2[1] and rows2[1].charinfo
    if info2 then
        local ok2, obj2 = pcall(json.decode, info2)
        if ok2 and obj2 then
            local nm2 = ((obj2.firstname or '') .. ' ' .. (obj2.lastname or ''))
            if nm2:gsub('%s+', '') ~= '' then return nm2 end
        end
    end
    return nil
end
lib.callback.register('npwd_pix:server:resolveByCode', function(source, code)
    local cd = tostring(code or ''):gsub('%s+', '')
    if not cd:match('^%d%d%d%d%d%d$') then return nil end
    local rows = MySQL.query.await('SELECT license FROM npwd_pix_codes WHERE code = ? LIMIT 1', { cd })
    local lic = rows and rows[1] and rows[1].license
    if not lic then return nil end
    return __pix_resolve_name_by_license(lic)
end)
lib.callback.register('npwd_pix:server:getDailyTotals', function(source)
    local src = source
    local license = getLicense(src)
    if not license then
        return { sent = 0, received = 0, net = 0 }
    end
    local rows = MySQL.query.await([[
        SELECT
            COALESCE(SUM(CASE WHEN from_license = ? THEN amount ELSE 0 END), 0) AS sent,
            COALESCE(SUM(CASE WHEN to_license = ? THEN amount ELSE 0 END), 0) AS received
        FROM npwd_pix_transactions
        WHERE (from_license = ? OR to_license = ?)
          AND created_at >= CURDATE()
          AND created_at < (CURDATE() + INTERVAL 1 DAY)
    ]], { license, license, license, license })
    local sent = rows and rows[1] and tonumber(rows[1].sent or 0) or 0
    local received = rows and rows[1] and tonumber(rows[1].received or 0) or 0
    return { sent = sent, received = received, net = (received - sent) }
end)

RegisterNetEvent('npwd_pix:register', function(code)
    local src = source
    local codeStr = tostring(code or ''):gsub('%s+', '')
    if not codeStr:match('^%d%d%d%d%d%d$') then
        TriggerClientEvent('npwd_pix:register:resp', src, false, 'PIX_CODE_INVALID')
        return
    end
    local license = getLicense(src)
    if not license then
        TriggerClientEvent('npwd_pix:register:resp', src, false, 'IDENTIFIER_NOT_FOUND')
        return
    end
    MySQL.query('SELECT license FROM npwd_pix_codes WHERE code = ? LIMIT 1', { codeStr }, function(rows)
        if rows and rows[1] then
            TriggerClientEvent('npwd_pix:register:resp', src, false, 'PIX_CODE_TAKEN')
            return
        end
        MySQL.query('SELECT code FROM npwd_pix_codes WHERE license = ? LIMIT 1', { license }, function(rows2)
            if rows2 and rows2[1] then
                TriggerClientEvent('npwd_pix:register:resp', src, false, 'PIX_ALREADY_SET')
                return
            end
            MySQL.query('INSERT INTO npwd_pix_codes (license, code, created_at) VALUES (?, ?, NOW())', { license, codeStr }, function()
                TriggerClientEvent('npwd_pix:register:resp', src, true, codeStr)
                TriggerClientEvent('npwd_pix:setMyCode', src, codeStr)
            end)
        end)
    end)
end)

RegisterNetEvent('npwd_pix:transfer', function(targetCode, amount)
    local src = source
    local codeStr = tostring(targetCode or ''):gsub('%s+', '')
    local value = tonumber(amount)
    if not codeStr:match('^%d%d%d%d%d%d$') then
        TriggerClientEvent('npwd_pix:transfer:resp', src, false, 'PIX_CODE_INVALID')
        return
    end
    if not value or value <= 0 then
        TriggerClientEvent('npwd_pix:transfer:resp', src, false, 'PIX_AMOUNT_INVALID')
        return
    end
    MySQL.query('SELECT license FROM npwd_pix_codes WHERE code = ? LIMIT 1', { codeStr }, function(rows)
        if not rows or not rows[1] then
            TriggerClientEvent('npwd_pix:transfer:resp', src, false, 'PIX_TARGET_NOT_FOUND')
            return
        end
        local licenseTo = rows[1].license
        local toSrc = exports.qbx_core:GetSource(licenseTo)
        local licFrom = getLicense(src)
        if licFrom and licenseTo and licFrom == licenseTo then
            TriggerClientEvent('npwd_pix:transfer:resp', src, false, 'PIX_SELF_TRANSFER_FORBIDDEN')
            return
        end
        if not toSrc or toSrc == 0 then
            TriggerClientEvent('npwd_pix:transfer:resp', src, false, 'PIX_TARGET_OFFLINE')
            return
        end
        local senderBank = exports.qbx_core:GetMoney(src, 'bank')
        if not senderBank or senderBank < value then
            TriggerClientEvent('npwd_pix:transfer:resp', src, false, 'INSUFFICIENT_FUNDS')
            return
        end
        local receiverBankBefore = exports.qbx_core:GetMoney(toSrc, 'bank') or 0
        exports.qbx_core:RemoveMoney(src, 'bank', value, 'PIX')
        exports.qbx_core:AddMoney(toSrc, 'bank', value, 'PIX')
        local function getPlayerFullName(s)
            local player = exports.qbx_core:GetPlayer(s)
            local pd = player and player.PlayerData
            local ci = pd and pd.charinfo
            local nm = ci and ((ci.firstname or '') .. ' ' .. (ci.lastname or '')) or GetPlayerName(s)
            return nm
        end
        local fromName = getPlayerFullName(src)
        local toName = getPlayerFullName(toSrc)
        local senderNew = exports.qbx_core:GetMoney(src, 'bank') or 0
        local receiverNew = exports.qbx_core:GetMoney(toSrc, 'bank') or 0
        local okSender = (senderNew == (senderBank - value))
        local okReceiver = (receiverNew == (receiverBankBefore + value))
        if okSender and okReceiver then
            MySQL.query('INSERT INTO npwd_pix_transactions (from_license, to_license, amount, from_name, to_name, created_at) VALUES (?, ?, ?, ?, ?, NOW())', { getLicense(src), licenseTo, value, fromName, toName }, function() end)
            TriggerClientEvent('npwd_pix:updateBalance', src, { balance = senderNew })
            TriggerClientEvent('npwd_pix:updateBalance', toSrc, { balance = receiverNew })
            TriggerClientEvent('npwd_pix:receivedNotify', toSrc, { from = fromName, amount = value })
        else
            if not okReceiver then exports.qbx_core:RemoveMoney(toSrc, 'bank', value, 'PIX_ROLLBACK') end
            if not okSender then exports.qbx_core:AddMoney(src, 'bank', value, 'PIX_ROLLBACK') end
            senderNew = exports.qbx_core:GetMoney(src, 'bank') or senderBank
            receiverNew = exports.qbx_core:GetMoney(toSrc, 'bank') or receiverBankBefore
            TriggerClientEvent('npwd_pix:updateBalance', src, { balance = senderNew })
            TriggerClientEvent('npwd_pix:updateBalance', toSrc, { balance = receiverNew })
            TriggerClientEvent('npwd_pix:transfer:resp', src, false, 'TRANSFER_FAILED_ROLLBACK')
            return
        end
        local function pushTx(s)
            local lic = getLicense(s)
            if not lic then
                TriggerClientEvent('npwd_pix:setTransactions', s, {})
                return
            end
            MySQL.query([[
                SELECT t.from_license, t.to_license, t.amount, t.created_at,
                       t.from_name, t.to_name,
                       fc.code AS from_code, tc.code AS to_code
                FROM npwd_pix_transactions t
                LEFT JOIN npwd_pix_codes fc ON fc.license = t.from_license
                LEFT JOIN npwd_pix_codes tc ON tc.license = t.to_license
                WHERE t.from_license = ? OR t.to_license = ?
                ORDER BY t.created_at DESC
                LIMIT 20
            ]], { lic, lic }, function(rows2)
                local out = {}
                for i = 1, (rows2 and #rows2 or 0) do
                    local r = rows2[i]
                    local dir
                    if r.from_license == lic then dir = 'out'
                    elseif r.to_license == lic then dir = 'in'
                    else dir = 'unknown' end
                    out[#out+1] = { dir = dir, amount = r.amount, created_at = r.created_at, from_code = r.from_code, to_code = r.to_code, from_name = r.from_name, to_name = r.to_name }
                end
                TriggerClientEvent('npwd_pix:setTransactions', s, out)
            end)
        end
        pushTx(src)
        pushTx(toSrc)
        TriggerClientEvent('npwd_pix:transfer:resp', src, true, { to = toSrc, amount = value })
    end)
end)

RegisterNetEvent('npwd_pix:getBalance', function()
    local src = source
    local bal = exports.qbx_core:GetMoney(src, 'bank')
    if bal == nil then
        local cid = getCitizenId(src)
        if cid then
            MySQL.query('SELECT money FROM players WHERE citizenid = ? LIMIT 1', { cid }, function(rows)
                local money = rows and rows[1] and rows[1].money
                local obj = money and json.decode(money) or {}
                TriggerClientEvent('npwd_pix:updateBalance', src, { balance = tonumber(obj.bank or 0) })
            end)
            return
        end
    end
    TriggerClientEvent('npwd_pix:updateBalance', src, { balance = tonumber(bal or 0) })
end)

RegisterNetEvent('npwd_pix:getMyCode', function()
    local src = source
    local license = getLicense(src)
    if not license then
        TriggerClientEvent('npwd_pix:setMyCode', src, false)
        return
    end
    MySQL.query('SELECT code FROM npwd_pix_codes WHERE license = ? LIMIT 1', { license }, function(rows)
        local existing = rows and rows[1] and rows[1].code or false
        TriggerClientEvent('npwd_pix:setMyCode', src, existing or false)
    end)
end)

local function genCode()
    local n = math.random(0, 999999)
    local s = ('%06d'):format(n)
    return s
end

RegisterNetEvent('npwd_pix:randomCode', function()
    local src = source
    local tries = 0
    local code
    repeat
        code = genCode()
        tries = tries + 1
        local ok = false
        MySQL.query('SELECT license FROM npwd_pix_codes WHERE code = ? LIMIT 1', { code }, function(rows)
            ok = not (rows and rows[1])
        end)
        Wait(50)
    until ok or tries > 20
    TriggerClientEvent('npwd_pix:setRandomCode', src, code)
end)

RegisterNetEvent('npwd_pix:randomAndRegister', function()
  local src = source
  local license = getLicense(src)
  if not license then
    TriggerClientEvent('npwd_pix:randomRegister:resp', src, false, 'IDENTIFIER_NOT_FOUND')
    return
  end
  MySQL.query('SELECT code FROM npwd_pix_codes WHERE license = ? LIMIT 1', { license }, function(rows)
    local existing = rows and rows[1] and rows[1].code
    if existing then
      TriggerClientEvent('npwd_pix:randomRegister:resp', src, false, 'PIX_ALREADY_SET')
      return
    end
    local tries = 0
    local code
    local ok = false
    repeat
      code = genCode()
      tries = tries + 1
      MySQL.query('SELECT license FROM npwd_pix_codes WHERE code = ? LIMIT 1', { code }, function(rows2)
        ok = not (rows2 and rows2[1])
      end)
      Wait(50)
    until ok or tries > 20
    if not ok then
      TriggerClientEvent('npwd_pix:randomRegister:resp', src, false, 'GEN_FAIL')
      return
    end
    MySQL.query('INSERT INTO npwd_pix_codes (license, code, created_at) VALUES (?, ?, NOW())', { license, code }, function()
      TriggerClientEvent('npwd_pix:randomRegister:resp', src, true, code)
    end)
  end)
end)
RegisterNetEvent('npwd_pix:getProfile', function()
    local src = source
    local cid = getCitizenId(src)
    if not cid then
        local name = GetPlayerName(src)
        TriggerClientEvent('npwd_pix:setProfile', src, { name = name })
        return
    end
    MySQL.query('SELECT charinfo FROM players WHERE citizenid = ? LIMIT 1', { cid }, function(rows)
        local info = rows and rows[1] and rows[1].charinfo
        local obj = info and json.decode(info) or nil
        local name = obj and ((obj.firstname or '') .. ' ' .. (obj.lastname or '')) or GetPlayerName(src)
        TriggerClientEvent('npwd_pix:setProfile', src, { name = name })
    end)
end)

RegisterNetEvent('npwd_pix:getTransactions', function()
    local src = source
    local license = getLicense(src)
    if not license then
        TriggerClientEvent('npwd_pix:setTransactions', src, {})
        return
    end
    MySQL.query([[
        SELECT t.from_license, t.to_license, t.amount, t.created_at,
               t.from_name, t.to_name,
               fc.code AS from_code, tc.code AS to_code
        FROM npwd_pix_transactions t
        LEFT JOIN npwd_pix_codes fc ON fc.license = t.from_license
        LEFT JOIN npwd_pix_codes tc ON tc.license = t.to_license
        WHERE t.from_license = ? OR t.to_license = ?
        ORDER BY t.created_at DESC
        LIMIT 20
    ]], { license, license }, function(rows)
        local out = {}
        for i = 1, (rows and #rows or 0) do
            local r = rows[i]
            local dir
            if r.from_license == license then dir = 'out'
            elseif r.to_license == license then dir = 'in'
            else dir = 'unknown' end
            out[#out+1] = { dir = dir, amount = r.amount, created_at = r.created_at, from_code = r.from_code, to_code = r.to_code, from_name = r.from_name, to_name = r.to_name }
        end
        TriggerClientEvent('npwd_pix:setTransactions', src, out)
    end)
end)

RegisterNetEvent('npwd_pix:delete', function()
  local src = source
  local license = getLicense(src)
  if not license then
    TriggerClientEvent('npwd_pix:delete:resp', src, false, 'IDENTIFIER_NOT_FOUND')
    return
  end
  MySQL.query('SELECT code FROM npwd_pix_codes WHERE license = ? LIMIT 1', { license }, function(rows)
    local existing = rows and rows[1] and rows[1].code
    if not existing then
      TriggerClientEvent('npwd_pix:delete:resp', src, false, 'PIX_NOT_SET')
      return
    end
    MySQL.query('DELETE FROM npwd_pix_codes WHERE license = ? LIMIT 1', { license }, function()
      TriggerClientEvent('npwd_pix:delete:resp', src, true, existing)
    end)
  end)
end)

CreateThread(function()
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS npwd_pix_codes (
            license VARCHAR(64) PRIMARY KEY,
            code VARCHAR(6) UNIQUE NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ]], {})
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS npwd_pix_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            from_license VARCHAR(64) NOT NULL,
            to_license VARCHAR(64) NOT NULL,
            amount INT NOT NULL,
            from_name VARCHAR(100) NULL,
            to_name VARCHAR(100) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ]], {})
    MySQL.query('SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?', { 'npwd_pix_transactions', 'from_name' }, function(rows)
        local need = (rows and rows[1] and tonumber(rows[1].cnt or 0) or 0) == 0
        if need then
            MySQL.query('ALTER TABLE npwd_pix_transactions ADD COLUMN from_name VARCHAR(100) NULL', {}, function() end)
        end
    end)
    MySQL.query('SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?', { 'npwd_pix_transactions', 'to_name' }, function(rows)
        local need = (rows and rows[1] and tonumber(rows[1].cnt or 0) or 0) == 0
        if need then
            MySQL.query('ALTER TABLE npwd_pix_transactions ADD COLUMN to_name VARCHAR(100) NULL', {}, function() end)
        end
    end)
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS npwd_pix_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            license VARCHAR(64) NOT NULL,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(6) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_license_code (license, code),
            INDEX idx_license (license)
        )
    ]], {})
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS npwd_pix_meta (
            k VARCHAR(64) PRIMARY KEY,
            v VARCHAR(255) NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ]], {})
    local function weeklyCleanupIfNeeded()
        local info = MySQL.query.await("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS d, DAYOFWEEK(CURDATE()) AS w", {})
        local todayStr = info and info[1] and tostring(info[1].d or '') or ''
        local w = info and info[1] and tonumber(info[1].w or 0) or 0
        if todayStr == '' or w ~= 2 then return end
        local meta = MySQL.query.await("SELECT v FROM npwd_pix_meta WHERE k = 'weekly_cleanup_date' LIMIT 1", {})
        local last = meta and meta[1] and tostring(meta[1].v or '') or ''
        if last == todayStr then return end
        MySQL.query.await('DELETE FROM npwd_pix_transactions', {})
        MySQL.query.await("INSERT INTO npwd_pix_meta (k, v, updated_at) VALUES ('weekly_cleanup_date', ?, NOW()) ON DUPLICATE KEY UPDATE v = VALUES(v), updated_at = NOW()", { todayStr })
    end
    local function getFullNameFromPlayer(src)
        local player = exports.qbx_core:GetPlayer(src)
        local pd = player and player.PlayerData
        local ci = pd and pd.charinfo
        local nm = ci and ((ci.firstname or '') .. ' ' .. (ci.lastname or '')) or GetPlayerName(src)
        return nm
    end
    local function resolveNameByLicense(license)
        if not license then return nil end
        local s = exports.qbx_core:GetSource(license)
        if s and s ~= 0 then
            return getFullNameFromPlayer(s)
        end
        local rows = MySQL.query.await('SELECT charinfo FROM players WHERE license = ? LIMIT 1', { license })
        local info = rows and rows[1] and rows[1].charinfo
        if info then
            local ok, obj = pcall(json.decode, info)
            if ok and obj then
                local nm = ((obj.firstname or '') .. ' ' .. (obj.lastname or ''))
                if nm:gsub('%s+', '') ~= '' then return nm end
            end
        end
        local rows2 = MySQL.query.await('SELECT charinfo FROM players WHERE license2 = ? LIMIT 1', { license })
        local info2 = rows2 and rows2[1] and rows2[1].charinfo
        if info2 then
            local ok2, obj2 = pcall(json.decode, info2)
            if ok2 and obj2 then
                local nm2 = ((obj2.firstname or '') .. ' ' .. (obj2.lastname or ''))
                if nm2:gsub('%s+', '') ~= '' then return nm2 end
            end
        end
        return nil
    end
    local rows = MySQL.query.await([[
        SELECT id, from_license, to_license, from_name, to_name
        FROM npwd_pix_transactions
        WHERE (from_name IS NULL OR from_name = '') OR (to_name IS NULL OR to_name = '')
        LIMIT 300
    ]], {})
    for i = 1, (rows and #rows or 0) do
        local r = rows[i]
        local fn = (r.from_name and r.from_name ~= '') and r.from_name or resolveNameByLicense(r.from_license)
        local tn = (r.to_name and r.to_name ~= '') and r.to_name or resolveNameByLicense(r.to_license)
        if (fn and fn ~= '') or (tn and tn ~= '') then
            MySQL.query('UPDATE npwd_pix_transactions SET from_name = COALESCE(?, from_name), to_name = COALESCE(?, to_name) WHERE id = ?', { fn, tn, r.id }, function() end)
        end
    end
    weeklyCleanupIfNeeded()
end)

lib.callback.register('npwd_pix:server:getInitial', function(source)
    local src = source
    local cid = getCitizenId(src)
    local player = exports.qbx_core:GetPlayer(src)
    local pd = player and player.PlayerData
    local charinfo = pd and pd.charinfo
    local name = charinfo and ((charinfo.firstname or '') .. ' ' .. (charinfo.lastname or '')) or nil
    if not name and cid then
        local rows = MySQL.query.await('SELECT charinfo FROM players WHERE citizenid = ? LIMIT 1', { cid })
        local info = rows and rows[1] and rows[1].charinfo
        local obj = info and json.decode(info) or nil
        name = obj and ((obj.firstname or '') .. ' ' .. (obj.lastname or '')) or GetPlayerName(src)
    end
    local bank = exports.qbx_core:GetMoney(src, 'bank')
    local coin = exports.qbx_core:GetMoney(src, 'coin')
    if bank == nil and cid then
        local rows2 = MySQL.query.await('SELECT money FROM players WHERE citizenid = ? LIMIT 1', { cid })
        local money = rows2 and rows2[1] and rows2[1].money
        local obj2 = money and json.decode(money) or {}
        bank = tonumber(obj2.bank or 0)
        coin = tonumber(obj2.coin or 0)
    end
    local license = getLicense(src)
    local code
    if license then
        local rows3 = MySQL.query.await('SELECT code FROM npwd_pix_codes WHERE license = ? LIMIT 1', { license })
        code = rows3 and rows3[1] and rows3[1].code or nil
    end
    return { name = name or GetPlayerName(src), bank = tonumber(bank or 0), coin = tonumber(coin or 0), code = code }
end)

local function pushContacts(src)
    local license = getLicense(src)
    if not license then
        TriggerClientEvent('npwd_pix:setContacts', src, {})
        return
    end
    MySQL.query('SELECT name, code, created_at FROM npwd_pix_contacts WHERE license = ? ORDER BY created_at DESC LIMIT 50', { license }, function(rows)
        local out = {}
        for i = 1, (rows and #rows or 0) do
            local r = rows[i]
            out[#out+1] = { name = r.name, code = r.code, created_at = r.created_at }
        end
        TriggerClientEvent('npwd_pix:setContacts', src, out)
    end)
end

RegisterNetEvent('npwd_pix:getContacts', function()
    local src = source
    pushContacts(src)
end)

RegisterNetEvent('npwd_pix:addContact', function(name, code)
    local src = source
    local license = getLicense(src)
    if not license then
        TriggerClientEvent('npwd_pix:setContacts', src, {})
        return
    end
    local nm = tostring(name or ''):gsub('%s+$', '')
    local cd = tostring(code or ''):gsub('%s+', '')
    if nm == '' or not cd:match('^%d%d%d%d%d%d$') then
        TriggerClientEvent('npwd_pix:addContact:resp', src, false, 'PIX_CODE_INVALID')
        TriggerClientEvent('npwd_pix:setContacts', src, {})
        return
    end
    MySQL.query('SELECT 1 AS ok FROM npwd_pix_codes WHERE code = ? LIMIT 1', { cd }, function(rows)
        local exists = rows and rows[1] and rows[1].ok == 1
        if not exists then
            TriggerClientEvent('npwd_pix:addContact:resp', src, false, 'PIX_TARGET_NOT_FOUND')
            pushContacts(src)
            return
        end
        MySQL.query('INSERT IGNORE INTO npwd_pix_contacts (license, name, code) VALUES (?, ?, ?)', { license, nm, cd }, function()
            TriggerClientEvent('npwd_pix:addContact:resp', src, true, { name = nm, code = cd })
            pushContacts(src)
        end)
    end)
end)

RegisterNetEvent('npwd_pix:deleteContact', function(code)
    local src = source
    local license = getLicense(src)
    if not license then
        TriggerClientEvent('npwd_pix:setContacts', src, {})
        return
    end
    local cd = tostring(code or ''):gsub('%s+', '')
    MySQL.query('DELETE FROM npwd_pix_contacts WHERE license = ? AND code = ? LIMIT 1', { license, cd }, function()
        pushContacts(src)
    end)
end)

AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        print('^2[RuFaTo]^7 Resource carregado com sucesso!')
        print('^3[Discord]^7 Entre em nossa comunidade: ^5https://discord.gg/E9wDTDBUQQ^7')
    end
end)
