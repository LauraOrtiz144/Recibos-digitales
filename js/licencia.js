function obtenerDeviceId() {
  let id = localStorage.getItem("deviceId");

  if (!id) {
    id = Date.now().toString() + Math.random().toString(16);
    localStorage.setItem("deviceId", id);
  }

  return id;
}

function activar() {
  const codigo = document.getElementById("codigo").value;
  const mensaje = document.getElementById("mensaje");

  if (!codigo) {
    mensaje.innerText = "Ingrese un código";
    return;
  }

  let licencia = JSON.parse(localStorage.getItem("licencia"));

  if (!licencia) {
    licencia = {
      codigo: codigo,
      maxDispositivos: 3,
      dispositivos: []
    };
  }

  const deviceId = obtenerDeviceId();

  if (!licencia.dispositivos.includes(deviceId)) {

    if (licencia.dispositivos.length >= licencia.maxDispositivos) {
      mensaje.innerText = "Límite de dispositivos alcanzado";
      return;
    }

    licencia.dispositivos.push(deviceId);
  }

  localStorage.setItem("licencia", JSON.stringify(licencia));

  mensaje.innerText = "Activado correctamente";

  setTimeout(() => {
    window.location.href = "app.html";
  }, 1000);
}

// 🔥 ESTO ES LA CLAVE (evita el error)
document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("btnActivar");

  if (btn) {
    btn.addEventListener("click", activar);
  }
});