let productos = JSON.parse(localStorage.getItem("productos")) || [];
let factura = [];
let total = 0;
let numeroRemision = parseInt(localStorage.getItem("numeroRemision")) || 1;

const LIMITE_REMISION = 100;

function formatoMoneda(valor) {
    return Number(valor).toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

window.onload = function () {

  const activado = localStorage.getItem("activado");
  const sesion = localStorage.getItem("sesionActiva");

  if (activado !== "true") {
    mostrarVista("activacionVista");
    return;
  }

  if (sesion === "true") {
    mostrarVista("catalogoVista");
    mostrarCatalogo();
  } else {
    mostrarVista("loginVista");
  }
};

function activar() {
  const codigo = document.getElementById("codigo")?.value;

  if (codigo === "1234") {
    localStorage.setItem("activado", "true");
    alert("Activado correctamente");
    mostrarVista("loginVista");
  } else {
    alert("Código incorrecto");
  }
}

function login() {
  const pin = document.getElementById("pin").value;

  if (pin === "1234") {
    localStorage.setItem("sesionActiva", "true");
    mostrarVista("catalogoVista");
    mostrarCatalogo();
  } else {
    alert("PIN incorrecto");
  }
}

function mostrarVista(vista) {

    document.querySelectorAll(".vista").forEach(v => {
        v.style.display = "none";
    });

    document.getElementById(vista).style.display = "block";

    const botones = document.getElementById("botonesAccion");

    if (vista === "facturacionVista") {
        botones.style.display = "block";
    } else {
        botones.style.display = "none";
    }
}

document.getElementById("guardarProducto").addEventListener("click", function () {

  const nombre = document.getElementById("nombreProducto").value;
  const precio = document.getElementById("precioProducto").value;

  if (!nombre || !precio) {
    alert("Completa los datos");
    return;
  }

  productos.push({ nombre, precio });
  localStorage.setItem("productos", JSON.stringify(productos));

  mostrarCatalogo();
});

function mostrarCatalogo() {
  const contenedor = document.getElementById("catalogo");
  contenedor.innerHTML = "";

  productos.forEach(p => {
    const div = document.createElement("div");
    div.className = "producto-card";

    div.innerHTML = `
      <h3>${p.nombre}</h3>
      <p class="precio">$${formatoMoneda(p.precio)}</p>
      <button onclick='agregarProductoFactura(${JSON.stringify(p)})'>Agregar</button>
    `;

    contenedor.appendChild(div);
  });
}

// ================= AGREGAR PRODUCTO A LA FACTURA =================
function agregarProductoFactura(producto, cantidad = 1) {
    const cant = parseInt(cantidad) || 1;
    const precioNum = Number(producto.precio);
    const subtotal = precioNum * cant;

    // Verificar si el producto ya está en la factura para sumar cantidades
    const index = factura.findIndex(item => item.nombre === producto.nombre);

    if (index !== -1) {
        factura[index].cantidad += cant;
        factura[index].subtotal = factura[index].cantidad * factura[index].precio;
    } else {
        factura.push({
            nombre: producto.nombre,
            precio: precioNum,
            cantidad: cant,
            subtotal: subtotal
        });
    }

    actualizarFactura();
}

  function irAFacturacion() {

      mostrarVista("facturacionVista");

      actualizarNumeroRemision();

      document.getElementById("fechaActual").innerText =
          new Date().toLocaleDateString("es-CO");
  }
document.getElementById("buscarProducto").addEventListener("input", function () {

    const texto = this.value.toLowerCase().trim();
    const resultados = document.getElementById("resultados");

    resultados.innerHTML = "";

    if (texto === "") return;

    productos.forEach(p => {

        if (p.nombre.toLowerCase().includes(texto)) {

            const div = document.createElement("div");

            div.className = "resultadoProducto";

            div.innerHTML = `
                <div class="resultadoInfo">
                    <h4>${p.nombre}</h4>
                    <p>$${formatoMoneda(p.precio)}</p>
                </div>

                <div class="accionesProducto">

                    <input
                        type="number"
                        class="cantidadProducto"
                        value="1"
                        min="1">

                    <button class="btnAgregar">
                        Agregar
                    </button>

                </div>
            `;

            const cantidad = div.querySelector(".cantidadProducto");

            div.querySelector(".btnAgregar").onclick = () => {
                agregarProductoFactura(p, cantidad.value);

                // Limpiar buscador después de agregar
                document.getElementById("buscarProducto").value = "";
                resultados.innerHTML = "";
            };

            resultados.appendChild(div);
        }
    });
});

 
function actualizarFactura() {

    const tabla = document.getElementById("tablaFactura");
    tabla.innerHTML = "";

    total = 0;

    factura.forEach(item => {

        total += Number(item.subtotal);

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${item.nombre}</td>
            <td>${item.cantidad}</td>
            <td>$${formatoMoneda(item.precio)}</td>
            <td>$${formatoMoneda(item.subtotal)}</td>
        `;

        tabla.appendChild(fila);

    });

    document.getElementById("total").innerText = formatoMoneda(total);

}


function generarPDF() {
    const cliente = document.getElementById("clienteNombre").value || "Cliente";
    const telefono = document.getElementById("clienteTelefono").value || "";
    const direccion = document.getElementById("clienteDireccion").value || "";
    const numero = numeroRemision;
    const nombreArchivo = `Remision_${cliente}_${numero}.pdf`;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // --- ENCABEZADO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SOLMET", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("NIT: 900.000.000-0", 14, 25);
    doc.text("Tel: 302 423 8890", 14, 30);
    doc.text("Bogotá D.C.", 14, 35);

    // Cuadro superior derecho (No. y Fecha)
    doc.rect(145, 14, 50, 18);
    doc.setFont("helvetica", "bold");
    doc.text(`No. ${numero}`, 148, 21);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 148, 28);

    // --- DATOS DEL CLIENTE ---
    doc.rect(14, 42, 181, 24);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", 18, 49);
    doc.text("Teléfono:", 18, 55);
    doc.text("Dirección:", 18, 61);

    doc.setFont("helvetica", "normal");
    doc.text(cliente, 45, 49);
    doc.text(telefono, 45, 55);
    doc.text(direccion, 45, 61);

    // --- TABLA DE PRODUCTOS ---
    let startY = 75;
    doc.setFillColor(41, 128, 185); // Azul institucional
    doc.rect(14, startY, 181, 8, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Descripción", 18, startY + 5.5);
    doc.text("Cant", 120, startY + 5.5);
    doc.text("Precio", 145, startY + 5.5);
    doc.text("Subtotal", 170, startY + 5.5);

    // Filas de productos
    startY += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    factura.forEach(item => {
        doc.text(String(item.nombre), 18, startY + 6);
        doc.text(String(item.cantidad), 120, startY + 6);
        doc.text(`$${formatoMoneda(item.precio)}`, 145, startY + 6);
        doc.text(`$${formatoMoneda(item.subtotal)}`, 170, startY + 6);
        
        doc.line(14, startY + 9, 195, startY + 9); // Línea divisoria de fila
        startY += 9;
    });

    // --- TOTALES ---
    startY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${formatoMoneda(total)}`, 145, startY, { align: "left" });

    // --- ZONA DE FIRMAS ---
    startY += 30;
    doc.line(14, startY, 95, startY); // Línea Entregó
    doc.line(114, startY, 195, startY); // Línea Recibió

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Entregó", 14, startY + 4);
    doc.text("Recibió", 114, startY + 4);

    // Incrustar la firma dibujada en el canvas si existe
    const canvasFirma = document.getElementById("firmaCanvas");
    if (canvasFirma) {
        const firmaImgData = canvasFirma.toDataURL("image/png");
        // Colocamos la imagen de la firma justo encima de la línea de "Recibió"
        doc.addImage(firmaImgData, 'PNG', 120, startY - 22, 50, 20);
    }

    // Guardar archivo localmente
    doc.save(nombreArchivo);
    guardarVenta();
}

async function compartirPDF() {
    if (factura.length === 0) {
        alert("No hay productos en la remisión.");
        return;
    }

    const cliente = document.getElementById("clienteNombre").value || "Cliente";
    const telefono = document.getElementById("clienteTelefono").value || "";
    const direccion = document.getElementById("clienteDireccion").value || "";
    const numero = numeroRemision;
    const nombreArchivo = `Remision_${cliente}_${numero}.pdf`;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // --- REPETIMOS LA ESTRUCTURA VECTORIAL PARA EL BLOB ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("SOLMET", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("NIT: 900.000.000-0", 14, 25);
    doc.text("Tel: 302 423 8890", 14, 30);
    doc.text("Bogotá D.C.", 14, 35);

    doc.rect(145, 14, 50, 18);
    doc.setFont("helvetica", "bold");
    doc.text(`No. ${numero}`, 148, 21);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 148, 28);

    doc.rect(14, 42, 181, 24);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", 18, 49);
    doc.text("Teléfono:", 18, 55);
    doc.text("Dirección:", 18, 61);

    doc.setFont("helvetica", "normal");
    doc.text(cliente, 45, 49);
    doc.text(telefono, 45, 55);
    doc.text(direccion, 45, 61);

    let startY = 75;
    doc.setFillColor(41, 128, 185);
    doc.rect(14, startY, 181, 8, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Descripción", 18, startY + 5.5);
    doc.text("Cant", 120, startY + 5.5);
    doc.text("Precio", 145, startY + 5.5);
    doc.text("Subtotal", 170, startY + 5.5);

    startY += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    factura.forEach(item => {
        doc.text(String(item.nombre), 18, startY + 6);
        doc.text(String(item.cantidad), 120, startY + 6);
        doc.text(`$${formatoMoneda(item.precio)}`, 145, startY + 6);
        doc.text(`$${formatoMoneda(item.subtotal)}`, 170, startY + 6);
        doc.line(14, startY + 9, 195, startY + 9);
        startY += 9;
    });

    startY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${formatoMoneda(total)}`, 145, startY);

    startY += 30;
    doc.line(14, startY, 95, startY);
    doc.line(114, startY, 195, startY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Entregó", 14, startY + 4);
    doc.text("Recibió", 114, startY + 4);

    const canvasFirma = document.getElementById("firmaCanvas");
    if (canvasFirma) {
        const firmaImgData = canvasFirma.toDataURL("image/png");
        doc.addImage(firmaImgData, 'PNG', 120, startY - 22, 50, 20);
    }

    // Convertir a Blob y empaquetar para compartir en WhatsApp
    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], nombreArchivo, { type: "application/pdf" });

    try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: "Remisión",
                text: `Remisión No. ${numero}`,
                files: [file]
            });
        } else {
            alert("Este dispositivo no permite compartir archivos directamente.");
            return;
        }

        // Limpieza posterior al compartir con éxito
        guardarVenta();
        limpiarFirma();
        document.getElementById("clienteNombre").value = "";
        document.getElementById("clienteTelefono").value = "";
        document.getElementById("clienteDireccion").value = "";
        document.getElementById("buscarProducto").value = "";
        document.getElementById("resultados").innerHTML = "";
        actualizarNumeroRemision();

    } catch (e) {
        console.log("Compartir cancelado o fallido.", e);
    }
}

function cerrarSesion() {
  localStorage.removeItem("sesionActiva");
  mostrarVista("loginVista");
}

// ================= CONFIGURACIÓN DE FIRMA =================
const canvas = document.getElementById("firmaCanvas");
let ctx = null;
let dibujando = false;

if (canvas) {
    ctx = canvas.getContext("2d");
    ctx.lineWidth = 3;

    // 🖱️ PC
    canvas.addEventListener("mousedown", () => dibujando = true);

    canvas.addEventListener("mouseup", () => {
        dibujando = false;
        ctx.beginPath();
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!dibujando) return;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    });

    // 📱 CELULAR
    canvas.addEventListener("touchstart", (e) => {
        dibujando = true;
        e.preventDefault();
    });

    canvas.addEventListener("touchend", () => {
        dibujando = false;
        ctx.beginPath();
    });

    canvas.addEventListener("touchmove", (e) => {
        if (!dibujando) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        e.preventDefault();
    });
}

function limpiarFirma() {
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

ctx.lineWidth = 3;

function actualizarNumeroRemision() {
  document.getElementById("numeroRemision").innerText = numeroRemision;
}

// ================= HISTORIAL =================

let ventas = JSON.parse(localStorage.getItem("ventas")) || [];

// Guardar venta automáticamente
function guardarVenta() {

  if (factura.length === 0) {
    alert("No hay productos en la factura");
    return false;
  }

  const cliente = document.getElementById("clienteNombre").value || "Cliente";

  const venta = {
    numero: numeroRemision,
    cliente: cliente,
    total: total,
    fecha: new Date().toLocaleDateString(),
    productos: factura
  };

  ventas.push(venta);
  localStorage.setItem("ventas", JSON.stringify(ventas));

  numeroRemision++;
  localStorage.setItem("numeroRemision", numeroRemision);

  factura = [];
  actualizarFactura();

  alert("Venta guardada ✔");

  return true;
}

// ================= VER HISTORIAL =================

function verHistorial() {
  mostrarVista("historialVista");

  const contenedor = document.getElementById("listaHistorial");
  contenedor.innerHTML = "";

  let totalDia = 0;
  const hoy = new Date().toLocaleDateString();

  ventas.forEach(v => {
    if (v.fecha === hoy) {

      totalDia += v.total;

      const div = document.createElement("div");
      div.style.background = "white";
      div.style.padding = "10px";
      div.style.margin = "5px 0";
      div.style.borderRadius = "10px";

      div.innerHTML = `
        <strong>Remisión #${v.numero}</strong><br>
        Cliente: ${v.cliente}<br>
        Total: $${formatoMoneda(v.total)} 
      `;

      contenedor.appendChild(div);
    }
  });

  document.getElementById("totalDia").innerText = totalDia;
}

// ================= PDF DEL DÍA =================

function descargarReporteDia() {

  const hoy = new Date().toLocaleDateString();
  let contenido = `
    <h2>REPORTE DE VENTAS</h2>
    <p>Fecha: ${hoy}</p>
    <hr>
  `;

  let totalDia = 0;

  ventas.forEach(v => {
    if (v.fecha === hoy) {
      contenido += `
        <p>
          Remisión #${v.numero} - ${v.cliente}<br>
          Total: $${v.total}
        </p>
      `;
      totalDia += v.total;
    }
  });

  contenido += `
    <hr>
    <h3>Total del día: $${formatoMoneda(totalDia)}</h3>
  `;

  const opt = {
    margin: 5,
    filename: `Reporte_${hoy}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4' }
  };

  html2pdf().set(opt).from(contenido).save();
}