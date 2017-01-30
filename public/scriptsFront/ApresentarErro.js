function apresentarErro(message) {
    if (!$('#divError').length) {
        $('body').append("<div id='divError' style='top: 100%'></div>");
        $('#divError').css({
            position: 'fixed',
            height: '15%',
            width: '70%',
            left: '15%',
            top: '100%',
            'background-color': 'red',
            overflow: 'auto'
        });
    }

    console.log('ERRO: ' + message);
    var top = parseFloat($('#divError')[0].style.top);

    if (top == 100) {
        document.getElementById("divError").innerHTML = message;
        mostrarErro();
    } else if (top > 85) {
        document.getElementById("divError").innerHTML += '<br>' + message;
        $('#divError').stop();
        mostrarErro();
    } else {
        document.getElementById("divError").innerHTML += '<br>' + message;
        $('#divError').stop().stop();
        mostrarErro();
    }

    function mostrarErro() {
        $('#divError').animate({
            top: "85%"
        }, parseInt((top - 85) * 60), () => {
            $('#divError').delay(2500).animate({
                top: "100%"
            }, 800);
        });
    }
}