let productos = []; // Ahora vendrá directamente de Google Sheets
let factura = [];
let total = 0;
let numeroRemision = parseInt(localStorage.getItem("numeroRemision")) || 1;

// ⚠️ URL DE TU API DE GOOGLE APPS SCRIPT
const urlAPI = "https://script.google.com/macros/s/AKfycbzrgBvyI84vWnFILrinONVjCQzpLKXwfOWtDCoQYd3VSv84xIwD1knmdOrqg_C5c0rkKQ/exec";

function formatoMoneda(valor) {
    return Number(valor).toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

window.onload = async function () {
  const activado = localStorage.getItem("activado");
  const sesion = localStorage.getItem("sesionActiva");

  if (activado !== "true") {
    mostrarVista("activacionVista");
    return;
  }

  if (sesion === "true") {
    mostrarVista("catalogoVista");
    await cargarInventarioDesdeNube();
    mostrarCatalogo();
  } else {
    mostrarVista("loginVista");
  }
};

// ================= ACTIVACIÓN CON LICENCIA =================
async function activar() {
  const codigoInput = document.getElementById("codigo");
  const empleadoInput = document.getElementById("nombreEmpleado");
  
  const codigo = codigoInput ? codigoInput.value.trim() : "";
  const nombreEmpleado = empleadoInput ? empleadoInput.value.trim() : "Empleado";

  if (!codigo || !nombreEmpleado) {
    alert("Por favor ingresa el código de activación y tu nombre.");
    return;
  }

  try {
    const respuesta = await fetch(`${urlAPI}?accion=activar&codigo=${codigo}&empleado=${encodeURIComponent(nombreEmpleado)}`, {
      redirect: 'follow'
    });
    
    const resultado = await respuesta.json();

    if (resultado.success) {
      localStorage.setItem("activado", "true");
      localStorage.setItem("empleado", nombreEmpleado); // 👈 Guarda el nombre real del empleado
      alert("¡Activado correctamente!");
      mostrarVista("loginVista");
    } else {
      alert("Error: " + resultado.message);
    }
  } catch (error) {
    console.error(error);
    alert("Error de conexión. Verifica tu internet o la URL.");
  }
}

async function verHistorial() {
    mostrarVista("historialVista");
    const lista = document.getElementById("listaHistorial");
    if (!lista) return;

    lista.innerHTML = "<p>Cargando historial de la nube...</p>";

    try {
        const respuesta = await fetch(`${urlAPI}?accion=obtenerHistorial`, { redirect: 'follow' });
        const resultado = await respuesta.json();

        if (resultado.success) {
            lista.innerHTML = "";

            if (resultado.historial.length === 0) {
                lista.innerHTML = "<p>No hay ventas registradas todavía.</p>";
                return;
            }

            resultado.historial.forEach(item => {
                const div = document.createElement("div");
                div.className = "historial-item";
                div.style.cssText = "background: #f9f9f9; margin-bottom: 8px; padding: 10px; border-radius: 5px; border-left: 4px solid #2980b9;";
                
                div.innerHTML = `
                    <p><b>Fecha:</b> ${new Date(item.fecha).toLocaleString("es-CO")}</p>
                    <p><b>Empleado:</b> ${item.empleado}</p>
                    <p><b>Producto:</b> ${item.producto} | <b>Cant:</b> ${item.cantidad}</p>
                `;
                lista.appendChild(div);
            });
        } else {
            lista.innerHTML = "<p>No se pudo cargar el historial.</p>";
        }
    } catch (error) {
        console.error(error);
        lista.innerHTML = "<p>Error de conexión al obtener el historial.</p>";
    }
}

function login() {
  const pin = document.getElementById("pin").value;

  if (pin === "1234") {
    localStorage.setItem("sesionActiva", "true");
    mostrarVista("catalogoVista");
    cargarInventarioDesdeNube().then(() => mostrarCatalogo());
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
    if (botones) {
      if (vista === "facturacionVista") {
          botones.style.display = "block";
      } else {
          botones.style.display = "none";
      }
    }
}

// ================= CARGAR INVENTARIO DESDE GOOGLE SHEETS =================
async function cargarInventarioDesdeNube() {
  try {
    const respuesta = await fetch(`${urlAPI}?accion=obtenerInventario`, { redirect: 'follow' });
    const resultado = await respuesta.json();

    if (resultado.success) {
      // Mapeamos los campos de Google Sheets a tu app
      productos = resultado.productos.map(p => ({
        codigo_interno: p.codigo_interno,
        nombre: p.nombre,
        precio: p.precio || 0, // Si no tienes precio en sheets, por defecto 0
        cantidad: p.cantidad_actual,
        limite_alerta: p.limite_alerta
      }));
    }
  } catch (error) {
    console.error("No se pudo cargar el inventario de la nube", error);
  }
}

// ================= CREAR PRODUCTO (EN NUBE) =================
const btnGuardarProd = document.getElementById("guardarProducto");
if (btnGuardarProd) {
  btnGuardarProd.addEventListener("click", async function () {
    const nombre = document.getElementById("nombreProducto").value;
    const precio = document.getElementById("precioProducto").value;

    if (!nombre || !precio) {
      alert("Completa los datos");
      return;
    }

    // Aquí puedes enlazar la acción en tu Apps Script para guardar nuevo producto si lo deseas
    alert("Para mantener el inventario sincronizado, agrega o edita los productos directamente en tu Google Sheet.");
  });
}

function mostrarCatalogo() {
  const contenedor = document.getElementById("catalogo");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  productos.forEach(p => {
    const div = document.createElement("div");
    div.className = "producto-card";

    div.innerHTML = `
      <h3>${p.nombre}</h3>
      <p>Stock: ${p.cantidad}</p>
      <p class="precio">$${formatoMoneda(p.precio)}</p>
      <button onclick='agregarProductoFactura(${JSON.stringify(p)})'>Agregar</button>
    `;

    contenedor.appendChild(div);
  });
}

// ================= AGREGAR PRODUCTO A LA FACTURA =================
function agregarProductoFactura(producto, cantidad = 1) {
    const cant = parseInt(cantidad) || 1;

    if (cant > producto.cantidad) {
      alert(`Stock insuficiente. Solo quedan ${producto.cantidad} unidades disponibles.`);
      return;
    }

    const precioNum = Number(producto.precio);
    const subtotal = precioNum * cant;

    const index = factura.findIndex(item => item.nombre === producto.nombre);

    if (index !== -1) {
        if ((factura[index].cantidad + cant) > producto.cantidad) {
          alert("No puedes agregar más de las unidades disponibles en inventario.");
          return;
        }
        factura[index].cantidad += cant;
        factura[index].subtotal = factura[index].cantidad * factura[index].precio;
    } else {
        factura.push({
            codigo_interno: producto.codigo_interno,
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
    document.getElementById("fechaActual").innerText = new Date().toLocaleDateString("es-CO");
}

// ================= BUSCADOR INTELIGENTE EN TIEMPO REAL =================
const inputBusq = document.getElementById("buscarProducto");
if (inputBusq) {
  inputBusq.addEventListener("input", function () {
      const texto = this.value.toLowerCase().trim();
      const resultados = document.getElementById("resultados");
      if (!resultados) return;

      resultados.innerHTML = "";

      if (texto === "") return;

      productos.forEach(p => {
          if (p.nombre.toLowerCase().includes(texto)) {
              const div = document.createElement("div");
              div.className = "resultadoProducto";

              div.innerHTML = `
                  <div class="resultadoInfo">
                      <h4>${p.nombre}</h4>
                      <p>Stock: ${p.cantidad} | $${formatoMoneda(p.precio)}</p>
                  </div>
                  <div class="accionesProducto">
                      <input type="number" class="cantidadProducto" value="1" min="1" max="${p.cantidad}">
                      <button class="btnAgregar">Agregar</button>
                  </div>
              `;

              const cantidadInput = div.querySelector(".cantidadProducto");

              div.querySelector(".btnAgregar").onclick = () => {
                  agregarProductoFactura(p, cantidadInput.value);
                  document.getElementById("buscarProducto").value = "";
                  resultados.innerHTML = "";
              };

              resultados.appendChild(div);
          }
      });
  });
}

function actualizarFactura() {
    const tabla = document.getElementById("tablaFactura");
    if (!tabla) return;
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

    const elTotal = document.getElementById("total");
    if (elTotal) elTotal.innerText = formatoMoneda(total);
}

// ================= GENERAR PDF Y DESCONTAR EN NUBE =================
function generarPDF() {
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

    // Encabezado
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
    doc.text(`TOTAL: $${formatoMoneda(total)}`, 145, startY, { align: "left" });

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

    doc.save(nombreArchivo);
    guardarVentaEnNube();
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

    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], nombreArchivo, { type: "application/pdf" });

    try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: "Remisión",
                text: `Remisión No. ${numero}`,
                files: [file]
            });
            guardarVentaEnNube();
        } else {
            alert("Este dispositivo no permite compartir archivos directamente.");
        }
    } catch (e) {
        console.log("Compartir cancelado o fallido.", e);
    }
}

// ================= SINCRONIZAR REMISIÓN CON GOOGLE SHEETS =================
async function guardarVentaEnNube() {
  const empleadoActual = localStorage.getItem("empleado") || "Empleado";

  // Recorremos cada producto de la factura para descontarlo en la nube y registrar la remisión
  for (let item of factura) {
    try {
      const url = `${urlAPI}?accion=registrarRemision&codigo_interno=${item.codigo_interno}&cantidad=${item.cantidad}&empleado=${encodeURIComponent(empleadoActual)}`;
      
      const respuesta = await fetch(url, { redirect: 'follow' });
      const resultado = await respuesta.json();

      if (resultado.success && resultado.alerta) {
        alert(`⚠️ ¡ATENCIÓN! El producto "${resultado.producto}" ha llegado a un nivel crítico de stock. Quedan: ${resultado.stockRestante}`);
      }
    } catch (err) {
      console.error("Error al descontar stock de:", item.nombre, err);
    }
  }

  // Limpieza local tras guardar con éxito
  numeroRemision++;
  localStorage.setItem("numeroRemision", numeroRemision);
  factura = [];
  actualizarFactura();
  limpiarFirma();
  
  if (typeof limpiarFirma === "function") limpiarFirma();
  document.getElementById("clienteNombre").value = "";
  document.getElementById("clienteTelefono").value = "";
  document.getElementById("clienteDireccion").value = "";
  
  alert("Remisión guardada y stock descontado en la nube ✔");
  await cargarInventarioDesdeNube(); // Refrescar stock local
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

    canvas.addEventListener("mousedown", () => dibujando = true);
    canvas.addEventListener("mouseup", () => { dibujando = false; ctx.beginPath(); });
    canvas.addEventListener("mousemove", (e) => {
        if (!dibujando) return;
        ctx.lineCap = "round";
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    });

    canvas.addEventListener("touchstart", (e) => { dibujando = true; e.preventDefault(); });
    canvas.addEventListener("touchend", () => { dibujando = false; ctx.beginPath(); });
    canvas.addEventListener("touchmove", (e) => {
        if (!dibujando) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
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

function actualizarNumeroRemision() {
  const elNum = document.getElementById("numeroRemision");
  if (elNum) elNum.innerText = numeroRemision;
}

