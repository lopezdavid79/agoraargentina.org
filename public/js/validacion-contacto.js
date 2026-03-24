// validacion de formulario
document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector(".main-form");
    if (!form) return;

    const liveRegion = document.getElementById("live-region");

    const reglas = {
        nombre: {
            validar: v => v.trim().length >= 3,
            msg: "El nombre debe tener al menos 3 caracteres"
        },
        email: {
            validar: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
            msg: "Ingrese un email válido"
        },
        telefono: {
            validar: v => /^[0-9]{10}$/.test(v),
            msg: "Ingrese 10 dígitos sin 0 ni 15"
        },
        asunto: {
            validar: v => v !== "",
            msg: "Seleccione una opción"
        },
        mensaje: {
            validar: v => v.trim().length >= 10,
            msg: "El mensaje debe tener al menos 10 caracteres"
        }
    };

    function mostrarError(input, mensaje) {
        const error = document.getElementById("error-" + input.id);
        if (!error) return;

        input.setAttribute("aria-invalid", "true");
        error.textContent = mensaje;
    }

    function limpiarError(input) {
        const error = document.getElementById("error-" + input.id);
        if (!error) return;

        input.removeAttribute("aria-invalid");
        error.textContent = "";
    }

    function validarCampo(input) {
        const regla = reglas[input.name];
        if (!regla) return true;

        if (!regla.validar(input.value)) {
            mostrarError(input, regla.msg);
            return false;
        } else {
            limpiarError(input);
            return true;
        }
    }

    // 🔥 VALIDACIÓN EN TIEMPO REAL
    const inputs = form.querySelectorAll("input, textarea, select");

    inputs.forEach(input => {
        input.addEventListener("input", () => validarCampo(input));
        input.addEventListener("blur", () => validarCampo(input));
    });

    // 🔥 VALIDACIÓN FINAL AL ENVIAR
    form.addEventListener("submit", (e) => {
        let valido = true;
        let primerError = null;

        inputs.forEach(input => {
            const esValido = validarCampo(input);

            if (!esValido && !primerError) {
                primerError = input;
                valido = false;
            }
        });

        if (!valido) {
            e.preventDefault();

            // 🎯 Foco accesible
            primerError.focus();

            // 🎧 Mensaje para lector de pantalla
            if (liveRegion) {
                liveRegion.textContent = "Error. Revise los campos del formulario.";
                liveRegion.focus();
            }
        }
    });

});


document.addEventListener("DOMContentLoaded", () => {

    const mensajeExito = document.getElementById("mensaje-exito");

    if (mensajeExito) {
        mensajeExito.focus();
    }

});


document.addEventListener("DOMContentLoaded", () => {

    const mensajeExito = document.getElementById("mensaje-exito");

    if (mensajeExito) {

        // 🎧 foco para lector de pantalla
        mensajeExito.focus();

        // ⏳ esperar 10 segundos y redirigir
        setTimeout(() => {
            window.location.href = "/";
        }, 10000);
    }

});