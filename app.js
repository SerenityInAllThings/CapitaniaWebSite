const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const querystring = require('querystring');
const Promise = require("bluebird");
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const minimist = require("minimist");
const argv = minimist(process.argv.slice(2));
const prompt = require('prompt-sync')({sigint: false});

const data = require('./scriptsBack/Data.js');
const pontuacao = require('./scriptsBack/Pontuacao.js');
const condicao = require('./scriptsBack/Condicao.js');
const log = require('./scriptsBack/log.js');
const autenticacao = require('./scriptsBack/autenticacao.js');

var logPathInicial = null;
var steamAPIKEY = 'DB8E56AE45FECFBD006BEC665F3D2C7A';
var ipAdminTools = '192.168.0.4';
var port = argv.p || 80;

var postagens = [];
var postagens_CHAVE = true;

//PARAMETRO DE AJUDA:
if (argv.h) {
    if (argv.h == 'secret') {
        console.log('O arquivo secret é o arquivo que conterá a chave utilizada para criptografar as sessões.');
        console.log('Esse arquivo deverá ter o nome: \"cookies.secret\"');
        console.log(`E deverá conter uma estrutura semelhante a:\n${JSON.stringify({secret: "seu_secret"}, null, 2)}`);
        console.log("onde 'seu_secret' é a sua chave escolhida");
        process.exit(1);
    } else {
        console.log(argv.h)
        console.log('-h [secret] \t Mostra essa mensagem ou mensagem sobre a opção especificada.');
        console.log('-p \t \t Especifica a porta');
        process.exit(1);
    }
}

//PARA PODER ACESSAR BODY DE POSTS:
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
//PARA PODER USAR COOKIES E SESSOES:
app.use(cookieParser());
//RECUPERANDO SECRET PARA SER USADO NO SESSION PARSER:
try {
    fs.accessSync(path.join(__dirname, 'cookie.secret'), fs.constants.F_OK)
    var secret = JSON.parse(fs.readFileSync(path.join(__dirname, 'cookie.secret'), 'utf8')).secret;
} catch (err) {
    console.log(chalk.red('Arquivo .secret não encontrado.'));
    console.log(chalk.red("Crie um arquivo com nome 'cookie.secret' na mesma pasta que app.js"));
    console.log(chalk.red(`O arquivo deverá ter a estrutura semelhante a:\n${JSON.stringify({secret: 'seu_secret'}, null, 2)}`));
    process.exit(2);
}
app.use(session({
    secret: secret,
    name: 'loginCapitania',
    cookie: {
        maxAge: 60 * 60 * 1000,
        httpOnly: false
    },
    resave: false,
    saveUninitialized: false
}));

//GERENTE DE REQUESTS GET:
app.get('/*', (req, res) => {
    //IMPRIME NO CONSOLE TODOS REQUESTS
    var registroRequest = `${req.ip}\t${req.path}\t${data.RetornaData()}`;
    console.log(registroRequest);
    if (req.path.indexOf('admin') == -1) {
        //PÁGINA NÃO CONTROLADA:
        enviaPagina();
    } else {
        //PÁGINA CONTROLADA:
        if (req.session.username) {
            //USUÁRIO AUTENTICADO.
            enviaPagina();
        } else {
            envia404(2);
        }
    }

    function enviaPagina() {
        //CHECA SE PASTA/ARQUIVO EXISTE.
        fs.access(`${__dirname}\\public${req.path}`, fs.constants.F_OK, (erro404) => {
            if (erro404) {
                envia404(0);
            } else {
                //ARQUIVO EXISTE
                if (req.path.charAt(req.path.length - 1) == '/') {
                    fs.access(path.join(__dirname, 'public', path.normalize(req.path), 'index.html'), fs.constants.F_OK, (erro_pastaSemIndex) => {
                        if (erro_pastaSemIndex) {
                            envia404(1);
                        } else {
                            res.redirect(path.join('index.html'));
                        }
                    });
                } else {
                    res.sendFile(path.join(__dirname, 'public', path.normalize(req.path)));
                }
            }
        });
    }


    function envia404(numero_erro) {
        //PARAMETRO: 0-404 NORMAL   1-404 ACESSO A PASTA SEM INDEX  2- ACESSO A ARQUIVO RESTRITO
        res.send(`ERRO 404 - PÁGINA NÃO ENCONTRADA <br/>
                  ${req.path} ${data.RetornaData()} <br/>
                  INFORME O ERRO A UM ADMINISTRADOR.`);
        switch (numero_erro) {
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

    function trata404() {
        var registro = `${data.RetornaData()},${req.ip},${req.path}\n`;
        var arquivoRegistro = `logSite/404/${data.RetornaDataCurta()}.csv`;
        fs.appendFile(arquivoRegistro, registro, () => {
            console.log(chalk.red(`404 de ${req.path} logado`));
        });
    }

    function trata404_pastaSemIndex() {
        var registro = `${data.RetornaData()},${req.ip},${req.path}\n`;
        var arquivoRegistro = `logSite/404_pastaSemIndex/${data.RetornaDataCurta()}.csv`;
        fs.appendFile(arquivoRegistro, registro, () => {
            console.log(chalk.red(`404 - Pasta em index de ${req.path} logado`));
        });
    }

    function trata404_arquivoRestrito() {
        var registro = `${data.RetornaData()},${req.ip},${req.path}\n`;
        var arquivoRegistro = `logSite/404_arquivoRestrito/${data.RetornaDataCurta()}.csv`;
        fs.appendFile(arquivoRegistro, registro, () => {
            console.log(chalk.red(`404 - Acesso restrito ${req.path} logado`));
        });
    }
});

//GERENTE DE REQUESTS POST:
app.post('/*', (req, res) => {
    var registroRequest = `${req.ip}\t${req.path}\t${data.RetornaData()}`;
    console.log(chalk.blue(registroRequest));

    if (req.path == '/requisicaoDePostagens') {
        res.send(postagens.slice(req.body.index, req.body.index + 5));
    } 
    else if (req.path == '/checarAutenticacao') {
        if (req.session.username) {
            res.send(JSON.stringify({
                login: true
            }));
        } else {
            res.send(JSON.stringify({
                login: false
            }));
        }
    } 
    else if (req.path == '/autenticacao') {
        autenticacao.tentarAutenticacao(req.body.username, req.body.passwd).then(
            //AUTENTICADO
            () => {
                if (req.session.username) {
                    console.log('usuário já estava autenticado!!');
                }
                console.log('USUÁRIO AUTENTICADO');
                req.session.username = req.body.username;
                res.redirect('/admin/index.html');

            },
            //NÃO AUTENTICADO
            () => {
                var erro = {
                    autenticacao: 'erro'
                };
                res.redirect(`/login/index.html?${querystring.stringify(erro)}`);
                console.log(chalk.red(`USUÁRIO ${req.body.username} NÃO AUTENTICADO`));
            }
        )
    } 
    else if (req.path == '/deslogar') {
        req.session.destroy();
    } 
    else if (req.path == '/postar') {
        if (req.session.username) {
            esperarChave();

            function esperarChave() {
                if (!postagens_CHAVE) {
                    setTimeout(esperarChave, 1000);
                } else {
                    fs.readFile(path.join(__dirname, 'public', 'postagens.json'), 'utf8', atualizarJSON);

                    function atualizarJSON(err, data) {
                        if (err) {
                            //ERRO AO LER INDEX.HTML
                            console.log(chalk.red('!!! ERRO AO LER INDEX.HTML !!!'));
                            console.log(chalk.red(`Erro: ${err}`));
                            res.send(JSON.stringify({
                                postagem: 'erro'
                            }))
                        } else {
                            postagens_CHAVE = false;

                            let postsTMP = JSON.parse(data);
                            postsTMP.push({
                                data: new Date().getTime(),
                                conteudo: req.body.postagem
                            });
                            fs.writeFile(path.join(__dirname, 'public', 'postagens.json'), JSON.stringify(postsTMP, null, 2), (err) => {
                                postagens_CHAVE = true;
                                if (err) {
                                    console.log(chalk.red('!!! ERRO AO GRAVAR POSTAGEM.'));
                                    console.log(chalk.red(`Erro: ${err}`));
                                    res.send(JSON.stringify({
                                        postagem: 'erro'
                                    }))
                                } else {
                                    console.log(chalk.green(`Postagem feita por ${req.session.username}`));
                                    atualizarVariavelPostagens()
                                        .then(
                                            () => {
                                                //VARIAVEL DE POSTAGENS ATUALIZADAS.
                                                res.send(JSON.stringify({
                                                    postagem: 'ok'
                                                }))
                                            },
                                            () => {
                                                //ERRO AO ATUALIZAR VARIAVEL DE POSTAGENS.
                                                res.send(JSON.stringify({
                                                    postagem: 'erro'
                                                }))
                                            });
                                }
                            });
                        }
                    }
                }
            }
        } else {
            console.log(chalk.red('!!!TENTATIVA DE POSTAGEM SEM ESTAR LOGADO!!!'));
            console.log(chalk.red('HTML NÃO FOI ALTERADO!'));
            console.log(chalk.red(`postagem: ${req.body.postagem}`));
            console.log(chalk.red(`IP: ${req.ip}`));
        }
    } 
    else if (req.path == '/manipulacaoPosts') {
        if (req.session.username) {
            if (req.body.tipoRequisicao == 'RequisicaoDeConteudo') {
                postagemRequisitada = postagens.find((postTMP) => {
                    if (postTMP.data == req.body.idPostagem) {
                        return true
                    }
                });
                if (!postagemRequisitada) {
                    console.log(chalk.red('ERRO AO TENTAR ACHAR POSTAGEM REQUISITADA'));
                    res.send({
                        status: 'Erro interno de requisição de conteudo 0'
                    });
                } else {
                    res.send({
                        status: 'ok',
                        postagem: postagemRequisitada.conteudo
                    });
                }
            } else if (req.body.tipoRequisicao == 'SalvarEdicao') {
                esperarChave();

                function esperarChave() {
                    if (!postagens_CHAVE) {
                        setTimeout(esperarChave, 1000);
                    } else {
                        postagens_CHAVE = false;
                        fs.readFile(path.join(__dirname, 'public', 'postagens.json'), 'utf8', editarjson);

                        function editarjson(err, data) {
                            if (err) {
                                console.log(chalk.red('ERRO AO LER ARQUIVO POSTAGENS.JSON PARA EDIÇÃO DE POST' + err));
                                res.send({
                                    status: 'Erro interno de edição 0'
                                });
                            } else {
                                postsTMP = JSON.parse(data);
                                postsTMP.find((post) => {
                                    if (post.data == req.body.idPostagem) {
                                        return true
                                    }
                                }).conteudo = req.body.novoTexto;

                                fs.writeFile(path.join(__dirname, 'public', 'postagens.json'), JSON.stringify(postsTMP, null, 2), mandarResposta);

                                function mandarResposta(err) {
                                    postagens_CHAVE = true;
                                    if (err) {
                                        console.log(chalk.red('ERRO AO SALVAR ARQUIVO POSTAGENS.JSON PARA EDIÇÃO DE POST' + err));
                                        res.send({
                                            status: 'Erro interno de edição 1'
                                        });
                                    } else {
                                        atualizarVariavelPostagens().then(
                                            () => {
                                                console.log(chalk.blue(`Edição de post ${req.body.idPostagem} feita com sucesso por ${req.session.username}`));
                                                res.send({
                                                    status: 'ok'
                                                });
                                            },
                                            () => {
                                                res.send({
                                                    status: 'Erro interno de edição 2'
                                                });
                                            }
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (req.body.tipoRequisicao == 'delecao') {
                esperarChave();

                function esperarChave() {
                    if (!postagens_CHAVE) {
                        setTimeout(esperarChave, 1000);
                    } else {
                        postagens_CHAVE = false;

                        fs.readFile(path.join(__dirname, 'public', 'postagens.json'), 'utf8', editarjson);

                        function editarjson(err, data) {
                            if (err) {
                                console.log(chalk.red('ERRO AO LER ARQUIVO POSTAGENS.JSON PARA DELEÇÃO DE POST' + err));
                                res.send({
                                    status: 'Erro interno de deleção 0'
                                });
                            } else {
                                postsTMP = JSON.parse(data);
                                postsTMP = postsTMP.filter((post) => {
                                    return post.data != req.body.id
                                });

                                fs.writeFile(path.join(__dirname, 'public', 'postagens.json'), JSON.stringify(postsTMP, null, 2), mandarResposta);

                                function mandarResposta(err) {
                                    postagens_CHAVE = true;
                                    if (err) {
                                        console.log(chalk.red('ERRO AO SALVAR ARQUIVO POSTAGENS.JSON PARA EDIÇÃO DE POST' + err));
                                        res.send({
                                            status: 'Erro interno de edição 1'
                                        });
                                    } else {
                                        atualizarVariavelPostagens().then(
                                            () => {
                                                console.log(chalk.blue(`Edição de post ${req.body.idPostagem} feita com sucesso por ${req.session.username}`));
                                                res.send({
                                                    status: 'ok'
                                                });
                                            },
                                            () => {
                                                res.send({
                                                    status: 'Erro interno de edição 2'
                                                });
                                            }
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            console.log(chalk.red('!!!TENTATIVA DE DELEÇÂO SEM ESTAR LOGADO!!!'));
            console.log(chalk.red('HTML NÃO FOI ALTERADO!'));
            console.log(chalk.red(`deleção do post: ${req.body.id}`));
            console.log(chalk.red(`IP: ${req.ip}`));
        }
    }
});

//FUNÇÃO PARA ATUALIZAÇÃO DA VARIÁVEL DE POSTAGENS.
function atualizarVariavelPostagens() {
    return new Promise((resolve, reject) => {
        esperarChave();

        function esperarChave() {
            if (!postagens_CHAVE) {
                setTimeout(esperarChave, 1000);
            } else {
                fs.readFile(path.join(__dirname, 'public', 'postagens.json'), 'utf8', organizarPosts);

                function organizarPosts(err, data) {
                    if (err) {
                        console.log(chalk.red('ERRO AO LER POSTAGENS.JSON PARA ATUALIZAÇÃO DE POSTAGENS.'));
                        console.log(chalk.red(err));
                        reject(err);
                    } else {
                        let posts = JSON.parse(data);
                        posts = posts.sort((post1, post2) => {
                            if (post1.data > post2.data) {
                                return -1;
                            } else {
                                return 1
                            }
                            return 0;
                        });
                        postagens = posts;
                        console.log(chalk.green('Postagens atualizadas'));
                        resolve();
                    }
                }
            }
        }
    });
}

//QUALQUER PROCEDIMENTO NOVO A SER EXECUTADO NO INICIO DO SERVIDOR DEVE SER POSTO DENTRO DO CALLBACK DO APP.LISTEN :
var servidor = app.listen(port, () => {
    console.log(`Servidor rodando na porta: ${port}\n`);
    condicao.atualizarJSONCondicao();
    pontuacao.atualizarPontuacao(ipAdminTools, steamAPIKEY);
    log.recuperarPathInicial();
    log.atualizarLog();
    atualizarVariavelPostagens();
});

//CONFIGURAÇÃO DE Temporizadores:
function retornaIntervaloJSONConfiguracao(objeto_json) {
    var ultimaConfiguracao = JSON.parse(fs.readFileSync('ultimaConfiguracao.cfg', 'utf8'));
    console.log(`Sobre o intervalo entre atualizações do(a) ${objeto_json}.
Aperte enter para usar a ultima configuracão.`);
    do {
        var temporizador = parseInt(prompt(`Insira intervalo: (minutos) (${ultimaConfiguracao[objeto_json].temporizador})`, ultimaConfiguracao[objeto_json].temporizador));
    }
    while (isNaN(temporizador));
    console.log('\n');
    ultimaConfiguracao[objeto_json].temporizador = temporizador;
    fs.writeFileSync('ultimaConfiguracao.cfg', JSON.stringify(ultimaConfiguracao), 'utf8');
    return temporizador * 60 * 1000;
}

//temporizadores
var loopCondicao = setInterval(condicao.atualizarJSONCondicao, retornaIntervaloJSONConfiguracao('condicao'));
var loopPontuacao = setInterval(() => {pontuacao.atualizarPontuacao(ipAdminTools, steamAPIKEY)}, retornaIntervaloJSONConfiguracao('pontuacao'));
var loopLog = setInterval(()=>{log.atualizarLog()}, retornaIntervaloJSONConfiguracao('log'));