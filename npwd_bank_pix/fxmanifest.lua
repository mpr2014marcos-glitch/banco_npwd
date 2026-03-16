fx_version 'cerulean'
game 'gta5'

description 'NPWD PIX app for bank transfers using qbx_core'
author 'Marcos Rufato'
version '1.0.0'

shared_scripts {
    '@ox_lib/init.lua',
    '@qbx_core/modules/lib.lua'
}

client_scripts {
    'client/client.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/server.lua'
}

files {
    'web/dist/*',
    'web/dist/locales/*.json'
}

lua54 'yes'
use_experimental_fxv2_oal 'yes'

--https://discord.gg/E9wDTDBUQQ
