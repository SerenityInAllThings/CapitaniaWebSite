var fs      = require('fs');
var path    = require('path');
var Promise = require('bluebird');

module.exports = {
    tentarAutenticacao: function(username, passwd){
        return new Promise((resolve, reject)=>{
            checarArquivoUsuarios().then(
                ()=>{
                    fs.readFile(path.join(__dirname, 'users.secret'), 'utf8', (err, data)=>{
                        if(err){
                            //ERRO AO LER ARQUIVO USERS.SECRET
                            console.log('!!!!!ERRO AO AUTENTICAR USUÁRIOS!!!!!!!');
                            console.log(`Erro: ${err}`);
                        }
                        else{
                            usuarios = JSON.parse(data);
                            if (usuarios[username] == passwd){
                                resolve();
                            }
                            else{
                                reject();
                            }
                        }
                    });
                },
                (err)=>{
                    console.log('!!!!!ERRO AO AUTENTICAR USUÁRIOS!!!!!!!');
                    console.log(`Erro: ${err}`);
                    reject();
                }
            );
        });
    }
}

function checarArquivoUsuarios(){
    return new Promise((resolve, reject)=>{
        fs.access(path.join(__dirname, 'users.secret'), (err)=>{
            if (err){
                //ARQUIVO USERS.SECRET NÃO ENCONTRADO.
                console.log('Arquivo Users.secret não encontrado.');
                var usuarioPadrao = {admin: "admin"};
                fs.writeFile(path.join(__dirname, 'users.secret'), JSON.stringify(usuarioPadrao), (err)=>{
                    if(err){
                        console.log('!!! ERRO AO TENTAR CRIAR ARQUIVO DE USUÁRIO PADRÃO!!!');
                        reject(err);
                    }
                    else{
                        console.log('FOI CRIADO UM ARQUIVO DE USUÁRIOS CONTENDO UM USUÁRIO PADRÃO, EDITAR QUANDO POSSÍVEL!');
                        resolve();
                    }
                });
            }
            else{
                //ARQUIVO USERS.SECRET ENCONTRADO!
                resolve();
            }
        });
    })
}