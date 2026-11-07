// ui-sistema.js
// Ventana emergente y alerta del sistema para todas las pantallas
(function () {

    // ----- Ventana emergente de confirmación -----
    const modal = document.createElement('div');
    modal.id = 'modalConfirmacion';
    modal.className = 'modal-overlay d-none';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Confirmación del Sistema</h3>
            <p id="modalMensaje"></p>
            <div class="modal-actions">
                <button type="button" id="btnModalCancelar" class="btn btn-cancel">Cancelar</button>
                <button type="button" id="btnModalAceptar" class="btn btn-registrar">Aceptar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    const modalMensaje = modal.querySelector('#modalMensaje');
    const btnAceptar = modal.querySelector('#btnModalAceptar');
    const btnCancelar = modal.querySelector('#btnModalCancelar');

    // ----- Alerta dentro del formulario -----
    const alerta = document.createElement('div');
    alerta.id = 'alertSistema';
    alerta.className = 'alert-box d-none';
    alerta.innerHTML = `
        <span id="alertTexto"></span>
        <button type="button" class="btn-close-alert">&times;</button>`;

    const tarjeta = document.querySelector('.form-card');
    if (tarjeta) {
        // la alerta queda justo arriba del formulario
        tarjeta.insertBefore(alerta, tarjeta.querySelector('form'));
    }

    const alertTexto = alerta.querySelector('#alertTexto');

    function ocultarAlertaSistema() {
        alerta.classList.add('d-none');
    }

    function mostrarAlertaSistema(mensaje) {
        alertTexto.textContent = mensaje;
        alerta.classList.remove('d-none');
        // si la alerta quedó fuera de la pantalla, baja o sube hasta ella
        alerta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    alerta.querySelector('.btn-close-alert').addEventListener('click', ocultarAlertaSistema);

    // Si el usuario escribe o cambia algo, la alerta desaparece sola
    // (el "true" hace que se oculte antes de que otros eventos la vuelvan a mostrar)
    if (tarjeta) {
        tarjeta.addEventListener('input', ocultarAlertaSistema, true);
        tarjeta.addEventListener('change', ocultarAlertaSistema, true);
    }

    // ----- Confirmación -----
    // Regresa una promesa: true si da Aceptar, false si cancela
    function confirmarAccion(mensaje) {
        return new Promise(resolver => {
            modalMensaje.textContent = mensaje;
            modal.classList.remove('d-none');

            const cerrar = (respuesta) => {
                modal.classList.add('d-none');
                document.removeEventListener('keydown', alTeclear);
                resolver(respuesta);
            };

            // con la tecla Escape también se cancela
            const alTeclear = (e) => {
                if (e.key === 'Escape') cerrar(false);
            };

            btnAceptar.onclick = () => cerrar(true);
            btnCancelar.onclick = () => cerrar(false);
            document.addEventListener('keydown', alTeclear);
        });
    }

    // Misma forma que usa prestamo.js (mensaje + función si acepta)
    function solicitarConfirmacion(mensaje, callbackAceptar) {
        confirmarAccion(mensaje).then(acepto => {
            if (acepto) callbackAceptar();
        });
    }

    // ----- Funciones disponibles en todas las pantallas -----
    window.mostrarAlertaSistema = mostrarAlertaSistema;
    window.ocultarAlertaSistema = ocultarAlertaSistema;
    window.confirmarAccion = confirmarAccion;
    window.solicitarConfirmacion = solicitarConfirmacion;

    // Todos los alert() que existan por error usarán la alerta del sistema.
    // Si la pantalla no tiene formulario, se usa el alert normal.
    const alertNativo = window.alert.bind(window);
    window.alert = function (mensaje) {
        if (tarjeta) {
            mostrarAlertaSistema(String(mensaje));
        } else {
            alertNativo(mensaje);
        }
    };
})();