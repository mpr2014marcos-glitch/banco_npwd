local function uiMessage(payload)
    if exports and exports.npwd and exports.npwd.sendUIMessage then
        exports.npwd:sendUIMessage(payload)
    else
        SendNUIMessage(payload)
    end
end
local function friendlyErr(code)
    local map = {
        PIX_CODE_INVALID = 'Informe um código PIX de 6 dígitos',
        PIX_AMOUNT_INVALID = 'Informe um valor maior que zero',
        PIX_TARGET_NOT_FOUND = 'Código PIX não encontrado',
        PIX_TARGET_OFFLINE = 'Destinatário está offline',
        INSUFFICIENT_FUNDS = 'Saldo insuficiente',
        PIX_SELF_TRANSFER_FORBIDDEN = 'Você não pode transferir para si mesmo',
        IDENTIFIER_NOT_FOUND = 'Não foi possível identificar sua conta',
        PIX_ALREADY_SET = 'Você já possui uma chave PIX cadastrada',
        GEN_FAIL = 'Falha ao gerar chave aleatória',
        PIX_NOT_SET = 'Você não possui uma chave PIX',
        TRANSFER_FAILED_ROLLBACK = 'Falha na transferência. Valor estornado.'
    }
    return map[tostring(code or '')] or 'Ocorreu um erro na operação'
end

RegisterNUICallback('npwd_pix:register', function(data, cb)
    local code = data and data.code
    TriggerServerEvent('npwd_pix:register', code)
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:transfer', function(data, cb)
    local code = data and data.code
    local amount = tonumber(data and data.amount)
    TriggerServerEvent('npwd_pix:transfer', code, amount)
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:getBalance', function(data, cb)
    TriggerServerEvent('npwd_pix:getBalance')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:getMyCode', function(data, cb)
    TriggerServerEvent('npwd_pix:getMyCode')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:randomCode', function(data, cb)
    TriggerServerEvent('npwd_pix:randomCode')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:getProfile', function(data, cb)
    TriggerServerEvent('npwd_pix:getProfile')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:getTransactions', function(data, cb)
    TriggerServerEvent('npwd_pix:getTransactions')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:getContacts', function(data, cb)
    TriggerServerEvent('npwd_pix:getContacts')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:addContact', function(data, cb)
    local name = data and data.name
    local code = data and data.code
    TriggerServerEvent('npwd_pix:addContact', name, code)
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:deleteContact', function(data, cb)
    local code = data and data.code
    TriggerServerEvent('npwd_pix:deleteContact', code)
    cb({ status = 'ok' })
end)
RegisterNUICallback('npwd_pix:getInitial', function(data, cb)
    local result = lib.callback.await('npwd_pix:server:getInitial', false)
    cb({ status = 'ok', data = result })
end)
RegisterNUICallback('npwd_pix:resolveByCode', function(data, cb)
    local code = tostring(data and data.code or ''):gsub('%s+', '')
    local name = lib.callback.await('npwd_pix:server:resolveByCode', false, code)
    cb({ status = 'ok', data = name })
end)
RegisterNUICallback('npwd_pix:getDailyTotals', function(data, cb)
    local totals = lib.callback.await('npwd_pix:server:getDailyTotals', false)
    cb({ status = 'ok', data = totals })
end)

RegisterNUICallback('npwd_pix:notify', function(data, cb)
    local msg = data and data.message or ''
    if lib and lib.notify then
        lib.notify({ title = 'Banco', description = msg, type = 'inform' })
    end
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:delete', function(data, cb)
    TriggerServerEvent('npwd_pix:delete')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:randomRegister', function(data, cb)
    TriggerServerEvent('npwd_pix:randomAndRegister')
    cb({ status = 'ok' })
end)

RegisterNUICallback('npwd_pix:closePhone', function(data, cb)
    if exports and exports.npwd and exports.npwd.setPhoneVisible then
        exports.npwd:setPhoneVisible(false)
    end
    cb({ status = 'ok' })
end)
local __pix_block_controls = false
RegisterNUICallback('npwd_pix:setActive', function(data, cb)
    __pix_block_controls = (data and data.active) == true
    cb({ status = 'ok' })
end)
CreateThread(function()
    while true do
        if __pix_block_controls then
            if not IsNuiFocused() then
                __pix_block_controls = false
                Wait(250)
            else
                local g = 0
                DisableControlAction(g, 30, true)  -- MoveLeftRight
                DisableControlAction(g, 31, true)  -- MoveUpDown
                DisableControlAction(g, 32, true)  -- MoveUp
                DisableControlAction(g, 33, true)  -- MoveDown
                DisableControlAction(g, 34, true)  -- MoveLeft
                DisableControlAction(g, 35, true)  -- MoveRight
                DisableControlAction(g, 21, true)  -- Sprint
                DisableControlAction(g, 36, true)  -- Duck
                DisableControlAction(g, 22, true)  -- Jump
                DisableControlAction(g, 24, true)  -- Attack
                DisableControlAction(g, 25, true)  -- Aim
                DisableControlAction(g, 37, true)  -- SelectWeapon
                DisableControlAction(g, 44, true)  -- Cover
                DisableControlAction(g, 141, true) -- MeleeAttack1
                DisableControlAction(g, 142, true) -- MeleeAttack2
                DisableControlAction(g, 143, true) -- MeleeAttack3
                DisableControlAction(g, 12, true)  -- WeaponWheel
                -- Vehicle controls
                DisableControlAction(g, 71, true)  -- Accelerate
                DisableControlAction(g, 72, true)  -- Brake
                DisableControlAction(g, 59, true)  -- Steering
                DisableControlAction(g, 75, true)  -- Exit vehicle
                Wait(0)
            end
        else
            Wait(250)
        end
    end
end)
RegisterNetEvent('npwd_pix:register:resp', function(success, payload)
    local msg = success and ('Chave cadastrada: '..tostring(payload)) or friendlyErr(payload)
    if lib and lib.notify then
        lib.notify({ title = 'Banco', description = msg, type = success and 'success' or 'error' })
    end
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'registerResp',
        success = success,
        data = success and payload or msg
    })
    if success then
        uiMessage({
            app = 'npwd_bank_pix',
            action = 'setMyCode',
            data = payload
        })
    end
end)

RegisterNetEvent('npwd_pix:randomRegister:resp', function(success, payload)
    local msg = success and ('Chave aleatória cadastrada: '..tostring(payload)) or friendlyErr(payload)
    if lib and lib.notify then
        lib.notify({ title = 'Banco', description = msg, type = success and 'success' or 'error' })
    end
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'registerResp',
        success = success,
        data = success and payload or msg
    })
    if success then
        uiMessage({
            app = 'npwd_bank_pix',
            action = 'setMyCode',
            data = payload
        })
    end
end)
RegisterNetEvent('npwd_pix:transfer:resp', function(success, payload)
    local msg
    if success then
        msg = ('Transferência enviada: '..tostring(payload and payload.amount or ''))
    else
        msg = friendlyErr(payload)
    end
    if lib and lib.notify then
        lib.notify({ title = 'Banco', description = msg, type = success and 'success' or 'error' })
    end
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'transferResp',
        success = success,
        data = success and payload or msg
    })
end)
RegisterNetEvent('npwd_pix:receivedNotify', function(payload)
    local from = payload and payload.from or 'Contato'
    local amount = payload and payload.amount or 0
    local msg = ('PIX recebido de '..tostring(from)..': '..tostring(amount))
    if lib and lib.notify then
        lib.notify({ title = 'Banco', description = msg, type = 'success' })
    end
end)

RegisterNetEvent('npwd_pix:delete:resp', function(success, payload)
    local msg = success and 'Chave apagada' or friendlyErr(payload)
    if lib and lib.notify then
        lib.notify({ title = 'Banco', description = msg, type = success and 'success' or 'error' })
    end
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'deleteResp',
        success = success,
        data = success and payload or msg
    })
    if success then
        uiMessage({
            app = 'npwd_bank_pix',
            action = 'setMyCode',
            data = ''
        })
    end
end)
RegisterNetEvent('npwd_pix:updateBalance', function(balance)
    local bal = balance
    if type(balance) == 'table' then
        bal = tonumber(balance.balance or balance.bank or 0)
    end
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'updateBalance',
        data = { balance = bal }
    })
end)

RegisterNetEvent('npwd_pix:setMyCode', function(code)
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'setMyCode',
        data = code
    })
end)

RegisterNetEvent('npwd_pix:setRandomCode', function(code)
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'setRandomCode',
        data = code
    })
end)

RegisterNetEvent('npwd_pix:setProfile', function(profile)
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'setProfile',
        data = profile
    })
end)

RegisterNetEvent('npwd_pix:setTransactions', function(rows)
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'setTransactions',
        data = rows or {}
    })
end)

RegisterNetEvent('npwd_pix:setContacts', function(rows)
    uiMessage({
        app = 'npwd_bank_pix',
        action = 'setContacts',
        data = rows or {}
    })
end)

RegisterNetEvent('npwd_pix:addContact:resp', function(success, payload)
    local msg = success and 'Contato salvo' or friendlyErr(payload)
    if lib and lib.notify then
        lib.notify({ title = 'Banco', description = msg, type = success and 'success' or 'error' })
    end
end)
