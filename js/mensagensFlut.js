//Cria os tolltips configurados com o atributo data-bs-toggle="tooltip"
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));

//Adaptação do tooltip para perder o foco após clicar no botão.
/*const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => {
    const tooltip = new bootstrap.Tooltip(tooltipTriggerEl);

    // Adiciona um evento de clique para remover o foco
    tooltipTriggerEl.addEventListener('click', function () {
        this.blur();
    });

    return tooltip;
});*/
