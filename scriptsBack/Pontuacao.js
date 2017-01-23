var request     = require('request');
var Promise     = require("bluebird");
var async       = require('async');
var fs          = require('fs');

function requestJSONPontuacao(ipAdminTools){
    return new Promise((resolve, reject)=>{
        parametrosRequest = {
            url: `http://${ipAdminTools}:8888/getPlayersGlobalStats`,
            method: 'GET',
            timeout: 10 * 1000
        }

        request(parametrosRequest, (err, response, body)=>{
            if (err) reject(new Error('ERRO AO RECUPERAR JSON DE PLAYERSTATUS DO ADMINTOOLS: ' + err));
            else{
                resolve(JSON.parse(body));
            }
        });
    });
}

function formatarJSONPontuacao(jsonNaoFormatado){
    return new Promise((resolve, reject)=>{
        var jsonFormatado = jsonNaoFormatado.players.filter((jogador)=>{
            return jogador.PlayerKills.filter((morte)=>{return morte.sleeperKill==false}).length > 0;
        })
        .sort((jogador1, jogador2) =>{
            if(jogador1.PlayerKills.filter((morte)=>{return morte.sleeperKill==false}).length > jogador2.PlayerKills.filter((morte)=>{return morte.sleeperKill==false}).length)
                return -1;
            if(jogador1.PlayerKills.filter((morte)=>{return morte.sleeperKill==false}).length < jogador2.PlayerKills.filter((morte)=>{return morte.sleeperKill==false}).length)
                return 1;
            if(jogador1.PlayerDeathsPVP.length < jogador2.PlayerDeathsPVP.length)
                return -1;
            if(jogador1.PlayerDeathsPVP.length > jogador2.PlayerDeathsPVP.length)
                return 1;
            return 0;
        })
        async.map(jsonFormatado, (jogador, callback)=>{
            callback(null, {
                jogador_index: jsonFormatado.indexOf(jogador)+1,
                jogador_Id: jogador.PlayerID,
                jogador_nome: jogador.PlayerName,
                jogador_kills: jogador.PlayerKills.filter( (morte)=>{return morte.sleeperKill==false} ).length,
                jogador_deaths: jogador.PlayerDeathsPVP.length,
                jogador_foto: null});
        }, (err, results)=>{
            if(err) reject(new Error('ERRO AO FORMATAR O JSON DA PONTUACAO: ' + err));
            else resolve(results);
        });
    });
}

function requestFotosSteam(jogador, steamAPIKEY){
    return new Promise((resolve, reject)=>{
        var parametrosRequest = {
            url: 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key='+steamAPIKEY+"&steamids="+jogador.jogador_Id,
            method: 'GET',
            timeout: 30 * 1000
        }
        request(parametrosRequest, (error, response, body) =>{
            if(error) reject(new Error('ERRO AO ATUALIZAR A FOTO DE UM JOGADOR NA STEAM. STEAMID: '+jogador.jogador_Id+'\n'+error));
            else{
                jogador.jogador_foto = JSON.parse(body).response.players[0].avatarmedium;
                resolve(jogador);
            }
        });
    });
}
module.exports = {
    atualizarPontuacao: function(ipAdminTools, steamAPIKEY){
        requestJSONPontuacao(ipAdminTools)
        .then((jsonNaoFormatado)=>{
            var jsonFormatado;
            formatarJSONPontuacao(jsonNaoFormatado)
            .then((jsonFormatado)=>{
                arrayPromisesFotos=[];
                jsonFormatado.forEach((jogador, index)=>{
                    arrayPromisesFotos.push(requestFotosSteam(jogador, steamAPIKEY));
                });
                Promise.all(arrayPromisesFotos).then((values)=>{
                    fs.writeFile('public/pontuacao/pontuacao.json', JSON.stringify(values), () => {
                        console.log('A pontuacao foi atualizada.');
                    });
                });
            })
            .catch((err)=>{
                console.log(err);
            });
        })
        .catch((err)=>{
            console.log(err);
        });
    }
};