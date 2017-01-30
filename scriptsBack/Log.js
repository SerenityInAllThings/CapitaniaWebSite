var fs              = require('fs');
var path            = require('path');
var exec            = require('child_process').exec;
var prompt          = require('prompt-sync')({sigint: false});
var chalk           = require('chalk');
var pathLogInicial  = null;

function checaPath(path){
    try{
        fs.accessSync(path , fs.constants.F_OK)
    }
    catch(err){
        console.log(chalk.red('path inválido. Arquivo não existe ou é inacessível.'));
        return true;
    }
    return false;
}

module.exports = {
    atualizarLog: function(){
        if (pathLogInicial==null) recuperarPathInicial();
        var pathLogSite = `${__dirname}`.split('').reverse().join('');
        pathLogSite = pathLogSite.substring(pathLogSite.search("\\\\"), pathLogSite.length).split('').reverse().join('');
        pathLogFinal = pathLogSite+'logTMP.log'
        exec(`copy /y ${pathLogInicial} ${pathLogFinal}`,(error, stdout, stderr) => {
            if (error){
                console.log(chalk.red('Erro ao recuperar o log completo do servidor:'));
                console.log(error);
                console.log(stderr);
            }
            else{
                fs.readFile(pathLogFinal, 'utf8', (err, data)=>{
                    if(err){
                        console.log(chalk.red('erro ao ler log.log'));
                        console.log(err);
                    }
                    else{
                        data = data.replace(/\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,'[IP PROTEGIDO]')
                        pathLogFinaltxt = pathLogSite+'public\\log\\log.txt'
                        fs.writeFile(pathLogFinaltxt, data, ()=>{
                            exec(`del ${pathLogFinal}`, (err, stdout, stderr)=>{
                                console.log(chalk.green('Log Atualizado.'));
                            });
                        });
                    }
                });
            }
        });
    },
    
    recuperarPathInicial: function(){
        var ultimaConfiguracao = JSON.parse(fs.readFileSync('ultimaConfiguracao.cfg', 'utf8'));
        console.log('Sobre o path do Log a ser exibido no site: ');
        do{
            var path = prompt(`Insira path: (${ultimaConfiguracao.log.path})`, ultimaConfiguracao.log.path);
        }
        while(checaPath(path));
        pathLogInicial = path;
        ultimaConfiguracao.log.path = path;
        fs.writeFileSync('ultimaConfiguracao.cfg', JSON.stringify(ultimaConfiguracao), 'utf8');
    }
};