function deslogar() {
    deletarCookies();
    document.location.replace('/index.html');
}

function deletarCookies() {
    //DELEÇÃO DOS COOKIES DO BROWSER:
    document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
    //DELEÇÃO DOS COOKIES DO SERVIDOR:
    $.post(window.location.origin + '/deslogar');
}