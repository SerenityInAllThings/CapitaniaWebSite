var request     = require('request');
var data        = require('./Data.js');
var fs          = require('fs');
var ApiKey      = 'b1uu1p3118hq6nq6mubcw1auwz51atz0xcj'

module.exports = {
    atualizarJSONCondicao: function(){
        request({
        //SE UM DIA O CONDICIONAMENTO DEIXAR DE FUNCIONAR CHECAR API KEY NO SITE DO RUST-SERVER
        url: `https://rust-servers.net/api/?object=servers&element=detail&key=${ApiKey}`,
        method: "GET",
        timeout: 10000
    }, (error, response, body) => {
        if(!error && response.statusCode == 200){
            body = JSON.parse(body);
            var arquivoAtualizado = {
                address: body.address,
                port: body.port,
                hostname: body.hostname,
                is_online: body.is_online,
                players: body.players,
                maxplayers: body.maxplayers
            };
            fs.writeFile('public/condicao/condicao.json', JSON.stringify(arquivoAtualizado), 'utf8', (err) => {
                if (err) console.log(`ERRO AO GRAVAR JSON DE CONDICAO DO SERVIDOR!!! ${err}`)
                console.log('Condicionamento atualizado:');
                console.log('online: ' + arquivoAtualizado.is_online);
                console.log(arquivoAtualizado.players + ' / ' + arquivoAtualizado.maxplayers);
                fs.appendFile('logSite/populacao/'+data.RetornaDataCurta()+'.csv', data.RetornaDataMinutos()+ ', '+arquivoAtualizado.players+'\n', () => {
                    console.log('O log de populacao foi atualizado.');
                });
            });
        }else
            console.log('Erro ao checar condição do servidor: ' + response.statusCode);
    });
    }
}