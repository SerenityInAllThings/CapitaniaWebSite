function criaData(){
        //INSTANCIA A DATA ATUAL;
        return new Date();
    }

module.exports = {
    RetornaData: function(){
        //RETORNARA A DATA COMPLETA, DE ANO A MILISEGUNDOS.
        var d = criaData();
        return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`;
    },
    RetornaDataMinutos: function(){
        //RETORNARA A DATA DE ANO A MINUTOS
        var d = criaData();;
        return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
    },
    RetornaDataCurta: function(){
        //RETORNARA A DATA COM ANO-MES-DIA
        var d = criaData();
        return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    }
};