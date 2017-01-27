var path        = require('path');
var fs          = require('fs');
var querystring = require('querystring');
var Promise     = require("bluebird");
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var cookieParser= require('cookie-parser');
var session     = require('express-session');
var minimist    = require("minimist");
var argv        = minimist(process.argv.slice(2));

var prompt      = require('prompt-sync')({sigint: false});
var data        = require('./scriptsBack/Data.js');
var pontuacao   = require('./scriptsBack/Pontuacao.js');
var condicao    = require('./scriptsBack/Condicao.js');
var log         = require('./scriptsBack/log.js');
var autenticacao= require('./scriptsBack/autenticacao.js');

var logPathInicial  = null;
var steamAPIKEY     = 'DB8E56AE45FECFBD006BEC665F3D2C7A';
var ipAdminTools    = '192.168.0.4';
var port            = argv.p || 80;

if(argv.h){
    if(argv.h == 'secret'){
        console.log('O arquivo secret é o arquivo que conterá a chave utilizada para criptografar as sessões.');
        console.log('Esse arquivo deverá ter o nome: \"cookies.secret\"');
        console.log(`E deverá conter uma estrutura semelhante a:\n${JSON.stringify({secret: "seu_secret"}, null, 2)}`);
        console.log("onde 'seu_secret' é a sua chave escolhida");
        process.exit(1);
    }
    else{
        console.log(argv.h)
        console.log('-h [secret] \t Mostra essa mensagem ou mensagem sobre a opção especificada.');
        console.log('-p \t \t Especifica a porta');
        process.exit(1);
    }
}

//PARA PODER ACESSAR BODY DE POSTS:
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//PARA PODER USAR COOKIES E SESSOES:
app.use(cookieParser());
//RECUPERANDO SECRET PARA SER USADO NO SESSION PARSER:
try{
    console.log(path.join(__dirname, 'cookie.secret'));
    fs.accessSync(path.join(__dirname, 'cookie.secret') , fs.constants.F_OK)
    var secret = JSON.parse(fs.readFileSync(path.join(__dirname, 'cookie.secret'), 'utf8')).secret;
}
catch(err){
    console.log('Arquivo .secret não encontrado.');
    console.log("Crie um arquivo com nome 'cookie.secret' na mesma pasta que app.js");
    console.log(`O arquivo deverá ter a estrutura semelhante a:\n${JSON.stringify({secret: 'seu_secret'}, null, 2)}`)
    process.exit(2);
}
app.use(session({
    secret: secret,
    name: 'loginCapitania',
    cookie: {maxAge: 60 * 60 * 1000}
}));

//GERENTE DE REQUESTS GET:
app.get('/*', (req, res) => {
    //IMPRIME NO CONSOLE TODOS REQUESTS
    var registroRequest = `${req.ip}\t${req.path}\t${data.RetornaData()}`;
    console.log(registroRequest);
    if(req.path.indexOf('admin')==-1){
        //PÁGINA NÃO CONTROLADA:
        enviaPagina();
    }
    else{
        //PÁGINA CONTROLADA:
        if(req.session.username){
            //USUÁRIO AUTENTICADO.
            enviaPagina();
        }
        else{
            envia404(2);
        }
    }

    function enviaPagina(){
        //CHECA SE PASTA/ARQUIVO EXISTE.
        fs.access(`${__dirname}\\public${req.path}`, fs.constants.F_OK, (erro404)=>{
            if(erro404){
                envia404(0);
            }
            else{
                //ARQUIVO EXISTE
                if(req.path.charAt(req.path.length-1)=='/'){
                    fs.access(path.join(__dirname, 'public', path.normalize(req.path), 'index.html'), fs.constants.F_OK, (erro_pastaSemIndex)=>{
                        if(erro_pastaSemIndex){
                            envia404(1);
                        }
                        else{
                            res.redirect(path.join('index.html'));
                        }
                    });
                }
                else{
                    res.sendFile(path.join(__dirname, 'public', path.normalize(req.path)));
                }
            }
        });
    }


    function envia404(numero_erro){
        //PARAMETRO: 0-404 NORMAL   1-404 ACESSO A PASTA SEM INDEX  2- ACESSO A ARQUIVO RESTRITO
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
            case 2:
                trata404_arquivoRestrito();
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

    function trata404_arquivoRestrito(){
        var registro = `${data.RetornaData()},${req.ip},${req.path}\n`;
        var arquivoRegistro = `logSite/404_arquivoRestrito/${data.RetornaDataCurta()}.csv`;
        fs.appendFile(arquivoRegistro, registro, () => {
            console.log(`404 - Acesso restrito ${req.path} logado`)
        });
    }
});

//GERENTE DE REQUESTS POST:
app.post('/autenticacao', (req, res)=>{
    var registroRequest = `${req.ip}\t${req.path}\t${data.RetornaData()}`;
    console.log(registroRequest);

    console.log(req.body);

    autenticacao.tentarAutenticacao(req.body.username, req.body.passwd).then(
        ()=>{
            if(req.session.username){
                console.log('usuário já estava autenticado!!');
            }
            console.log('USUÁRIO AUTENTICADO');
            req.session.username = req.body.username;
            res.redirect('/admin/index.html');
            
        },
        ()=>{
            console.log('USUÁRIO NÃO AUTENTICADO');
        }
    );
});

app.post('/deslogar', (req, res)=>{
    req.session.destroy();
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