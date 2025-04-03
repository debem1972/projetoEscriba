//-------------------------------------------------------------------------------------------
//Função para o botão de ir ao topo aparecer somente após a rolagem do scroll
//Botão de retorno ao tôpo
window.onload = function () {
    // Exibe o botão quando a página é rolada para baixo
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 100) {
            document.querySelector('.back-to-top').style.display = 'block';
        } else {
            document.querySelector('.back-to-top').style.display = 'none';
        }
    });
}

function scrollToTop() {
    // Rola a página até o topo
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
//----------------------------------------------------------------------------