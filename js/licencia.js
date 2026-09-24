function obtenerDeviceId() {
  let id = localStorage.getItem("deviceId");

  if (!id) {
    id = Date.now().toString() + Math.random().toString(16);
    localStorage.setItem("deviceId", id);
  }

  return id;
}

async function activar() {
  const codigoInput = document.getElementById("codigo");
  const mensaje = document.getElementById("mensaje");
  const codigo = codigoInput ? codigoInput.value.trim() : "";

  if (!codigo) {
    mensaje.innerText = "Ingrese un código";
    return;
  }

  mensaje.innerText = "Verificando licencia...";
  const deviceId = obtenerDeviceId();

  // ⚠️ REEMPLAZA ESTA URL CON TU URL DE IMPLEMENTACIÓN DE APPS SCRIPT DE LICENCIAS
  const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycby9sTsRxIVXscPY-fOs4ynBNXGyLDis0pbFAZE3r9doFrjqeefTnEVvew5jzIvf-02t/exec";

  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify({
        accion: "activar",
        codigo: codigo,
        dispositivoId: deviceId,
        empleado: "Administrador / Dispositivo Principal"
      })
    });

    const resultado = await response.json();

    if (resultado.success) {
      mensaje.innerText = "Activado correctamente";

      // Guardamos los datos clave devueltos por tu base central
      localStorage.setItem("licenciaActiva", "true");
      localStorage.setItem("codigoLicencia", codigo);
      localStorage.setItem("urlCliente", resultado.urlCliente || "");
      localStorage.setItem("pinJefe", resultado.pinJefe || "9999");
      localStorage.setItem("pinEmpleado", resultado.pinEmpleado || "1234");

      setTimeout(() => {
        window.location.href = "app.html"; // O tu pantalla de inicio de sesión
      }, 1000);
    } else {
      mensaje.innerText = resultado.message || "Código inválido o bloqueado";
    }

  } catch (error) {
    console.error("Error de red:", error);
    mensaje.innerText = "Error al conectar con la base de datos.";
  }
}

// Esto se queda tal cual lo tienes para evitar errores
document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("btnActivar");

  if (btn) {
    btn.addEventListener("click", activar);
  }
});
