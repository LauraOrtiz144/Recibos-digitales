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

function agregarProductoFactura(p, cantidad) {

    cantidad = Number(cantidad);

    if (cantidad <= 0 || isNaN(cantidad)) {
        alert("Ingrese una cantidad válida.");
        return;
    }

    const subtotal = cantidad * p.precio;

    factura.push({
        nombre: p.nombre,
        precio: p.precio,
        cantidad,
        subtotal
    });

    actualizarFactura();
}

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

    const elemento = document.getElementById("facturaPDF");

    const cliente =
        document.getElementById("clienteNombre").value || "Cliente";

    const numero = numeroRemision;

    const nombreArchivo =
        `Remision_${cliente}_${numero}.pdf`;
    document.getElementById("pdfCliente").textContent =
        document.getElementById("clienteNombre").value;

    document.getElementById("pdfTelefono").textContent =
        document.getElementById("clienteTelefono").value;

    document.getElementById("pdfDireccion").textContent =
        document.getElementById("clienteDireccion").value;


    document.body.classList.add("pdf-export");

    const opt = {

        margin:0,

        filename:nombreArchivo,

        image:{
            type:'jpeg',
            quality:1
        },

        html2canvas:{

            scale:4,

            useCORS:true,

            backgroundColor:"#ffffff",

            scrollX:0,

            scrollY:0

        },

        jsPDF:{

            unit:'mm',

            format:'a4',

            orientation:'portrait'

        },

    

    };

    html2pdf()
    .set(opt)
    .from(elemento)
    .save()
    .then(()=>{

        document.body.classList.remove("pdf-export");

        guardarVenta();

    });

}

async function compartirPDF() {

    if (factura.length === 0) {
        alert("No hay productos en la remisión.");
        return;
    }

    const elemento = document.getElementById("facturaPDF");

    const cliente =
        document.getElementById("clienteNombre").value || "Cliente";

    const numero = numeroRemision;

    const nombreArchivo =
        `Remision_${cliente}_${numero}.pdf`;

    const opt = {

        margin:0,

        filename:nombreArchivo,

        image:{
            type:'jpeg',
            quality:1
        },

        html2canvas:{
            scale:4,
            useCORS:true,
            backgroundColor:"#ffffff",
            windowWidth:1200,
            windowHeight:1700,
            scrollX:0,
            scrollY:0
        },

        jsPDF:{
            unit:'mm',
            format:'a4',
            orientation:'portrait'
        }

    };

    const pdfBlob = await html2pdf()
        .set(opt)
        .from(elemento)
        .outputPdf("blob");

    const file = new File(
        [pdfBlob],
        nombreArchivo,
        { type:"application/pdf" }
    );

    try {

        if (navigator.share &&
            navigator.canShare &&
            navigator.canShare({ files:[file] })) {

            await navigator.share({

                title:"Remisión",

                text:`Remisión No. ${numero}`,

                files:[file]

            });

        } else {

            alert("Este dispositivo no permite compartir archivos.");

            return;

        }

        // Se guarda la venta
        guardarVenta();

        // Limpia la firma
        limpiarFirma();

        // Limpia cliente
        document.getElementById("clienteNombre").value = "";
        document.getElementById("clienteTelefono").value = "";
        document.getElementById("clienteDireccion").value = "";

        // Limpia buscador
        document.getElementById("buscarProducto").value = "";
        document.getElementById("resultados").innerHTML = "";

        // Actualiza el siguiente número
        actualizarNumeroRemision();

    } catch(e){

        console.log("Compartir cancelado.");

    }

}

function cerrarSesion() {
  localStorage.removeItem("sesionActiva");
  mostrarVista("loginVista");
}

const canvas = document.getElementById("firmaCanvas");
const ctx = canvas.getContext("2d");

let dibujando = false;

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

// 📱 CELULAR (LA CLAVE)
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

function limpiarFirma() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
