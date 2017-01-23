var express     = require('express');
var app         = express();
var path        = require('path');
var fs          = require('fs');
var prompt      = require('prompt-sync')({sigint: false});
var port        = 80;
var steamAPIKEY = 'DB8E56AE45FECFBD006BEC665F3D2C7A';
var ipAdminTools= '192.168.0.4';
var data        = require('./scriptsBack/Data.js');
var pontuacao   = require('./scriptsBack/Pontuacao.js');
var condicao    = require('./scriptsBack/Condicao.js');
var log         = require('./scriptsBack/log.js');
var logPathInicial = null;

//GERENTE DE REQUESTS:
app.get('/*', (req, res) => {
    //IMPRIME NO CONSOLE TODOS REQUESTS
    var registroRequest = `${req.ip}\t${req.path}\t${data.RetornaData()}`;
    console.log(registroRequest);
    console.log(`${__dirname}\\public${req.path}`);

    //CHECA SE PASTA/ARQUIVO EXISTE.
    fs.access(`${__dirname}\\public${req.path}`, fs.constants.F_OK, (erro404)=>{
        if(erro404){
            envia404(0);
        }
        else{
            //ARQUIVO EXISTE
            if(req.path.charAt(req.path.length-1)=='/'){
                fs.access(`${__dirname}\\public${req.path}index.html`, fs.constants.F_OK, (erro_pastaSemIndex)=>{
                    if(erro_pastaSemIndex){
                        envia404(1);
                    }
                    else{
                        res.sendFile(`${__dirname}\\public${req.path}index.html`);
                    }
                });
            }
            else{
                res.sendFile(`${__dirname}\\public${req.path}`);
            }
        }
    });

    function envia404(numero_erro){
        //PARAMETRO: 0-404 NORMAL   1-404 ACESSO A PASTA SEM INDEX    2-404 ACESSO A ARQUIVO RESTRITO
        res.send(`ERRO 404 - PÁGINA NÃO ENCONTRADA <br/>
                  ${req.path} ${data.RetornaData()} <br/>
                  INFORME O ERRO A UM ADMINISTRADOR.`);
        switch(numero_erro){
            case 0: 
                trata404();
                break;
            case 1:
                trata404_pastaSemIndex();
                break;
        }
    }

    function trata404(){
        var registro = `${data.RetornaData()},${req.ip},${req.path}\n`;
        var arquivoRegistro = `logSite/404/${data.RetornaDataCurta()}.csv`;
        fs.appendFile(arquivoRegistro, registro, () => {
            console.log(`404 de ${req.path} logado`)
        });
    }

    function trata404_pastaSemIndex(){
        var registro = `${data.RetornaData()},${req.ip},${req.path}\n`;
        var arquivoRegistro = `logSite/404_pastaSemIndex/${data.RetornaDataCurta()}.csv`;
        fs.appendFile(arquivoRegistro, registro, () => {
            console.log(`404 - Pasta em index de ${req.path} logado`)
        });
    }
});

//QUALQUER PROCEDIMENTO NOVO A SER EXECUTADO NO INICIO DO SERVIDOR DEVE SER POSTO DENTRO DO CALLBACK DO APP.LISTEN :
var servidor = app.listen(port, () => {   
    console.log(`Servidor rodando na porta: ${port}`);
    condicao.atualizarJSONCondicao();
    pontuacao.atualizarPontuacao(ipAdminTools, steamAPIKEY);
    log.recuperarPathInicial();
    log.atualizarLog();
});

//CONFIGURAÇÃO DE Temporizadores:
function retornaIntervaloJSONConfiguracao(objeto_json){
    var ultimaConfiguracao = JSON.parse(fs.readFileSync('ultimaConfiguracao.cfg', 'utf8'));
    console.log(`Sobre o intervalo entre atualizações do(a) ${objeto_json}r.
Aperte enter para usar a ultima configuracão.`);
    do{
        var temporizador = parseInt(prompt(`Insira intervalo: (minutos) (${ultimaConfiguracao[objeto_json].temporizador})`, ultimaConfiguracao[objeto_json].temporizador));
    }
    while(isNaN(temporizador));
    ultimaConfiguracao[objeto_json].temporizador = temporizador;
    fs.writeFileSync('ultimaConfiguracao.cfg', JSON.stringify(ultimaConfiguracao), 'utf8');    
    return temporizador * 60 * 1000;
}

//temporizadores
var loopCondicao = setInterval(condicao.atualizarJSONCondicao, retornaIntervaloJSONConfiguracao('condicao'));
var loopPontuacao = setInterval(()=>{pontuacao.atualizarPontuacao(ipAdminTools, steamAPIKEY)}, retornaIntervaloJSONConfiguracao('pontuacao'));
var loopLog = setInterval(()=>{log.atualizarLog()}, retornaIntervaloJSONConfiguracao('log'));