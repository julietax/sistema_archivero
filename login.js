const loginForm = document.getElementById('loginForm');
const correoInput = document.getElementById('correo');
const contrasenaInput = document.getElementById('contrasena');
const togglePassword = document.getElementById('togglePassword');
const btnCancelarLogin = document.getElementById('btnCancelarLogin');
const loginAlert = document.getElementById('loginAlert');

// Mostrar/Ocultar contraseña
togglePassword.addEventListener('click', () => {
    const isPassword = contrasenaInput.getAttribute('type') === 'password';
    if (isPassword) {
        contrasenaInput.setAttribute('type', 'text');
        togglePassword.classList.remove('fa-eye-slash');
        togglePassword.classList.add('fa-eye');
    } else {
        contrasenaInput.setAttribute('type', 'password');
        togglePassword.classList.remove('fa-eye');
        togglePassword.classList.add('fa-eye-slash');
    }
});

// Manejo del envío del formulario de login
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    loginAlert.style.display = 'none';

    const correo = correoInput.value.trim();
    const contrasena = contrasenaInput.value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena })
        });

        const resultado = await response.json();

        if (!response.ok) {
            loginAlert.textContent = resultado.error || "Credenciales incorrectas.";
            loginAlert.style.display = 'block';
            return;
        }

        // Guardar sesión activa en el navegador (puedes almacenar el usuario o token)
        localStorage.setItem('sesionArchivero', JSON.stringify(resultado.usuario || { correo }));

        // Redirigir al panel principal (por ejemplo, la pantalla de usuarios o index)
        window.location.href = 'usuario.html';

    } catch (error) {
        console.error("Error en el inicio de sesión:", error);
        loginAlert.textContent = "No se pudo conectar con el servidor.";
        loginAlert.style.display = 'block';
    }
});

// Botón cancelar limpia los campos
btnCancelarLogin.addEventListener('click', () => {
    loginForm.reset();
    loginAlert.style.display = 'none';
});