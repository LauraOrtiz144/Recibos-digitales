/* ==========================================
   ESTADO GLOBAL Y CONFIGURACIÓN
   ================================---------- */
let productos = []; 
let factura = [];
let total = 0;
let numeroRemision = 1; 
let firmaVendedorGlobalEnMemoria = "";

const urlMaster = "https://script.google.com/macros/s/AKfycby9sTsRxIVXscPY-fOs4ynBNXGyLDis0pbFAZE3r9doFrjqeefTnEVvew5jzIvf-02t/exec";



function formatoMoneda(valor) {
    return Number(valor).toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/* ==========================================
   INICIALIZACIÓN ÚNICA Y OPTIMIZADA
   ================================---------- */


/* ==========================================
   MÓDULO DE ACTIVACIÓN Y LOGIN
   ================================---------- */





/* ==========================================
   GESTIÓN DE VISTAS
   ================================---------- */
function mostrarVista(vistaId) {
    document.querySelectorAll('.vista').forEach(el => el.style.display = 'none');
    
    const vistaSeleccionada = document.getElementById(vistaId);
    if (vistaSeleccionada) {
        vistaSeleccionada.style.display = 'block';
    }

    if (vistaId === 'historialVista') {
        verHistorial();
    }
}

/* ==========================================
   INVENTARIO Y NUBE (CON CACHÉ)
   ================================---------- */




function mostrarCatalogo() {
  const contenedor = document.getElementById("catalogo");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  productos.forEach(p => {
    const card = document.createElement("div");
    card.className = "producto-card"; // Usa directamente tu clase del CSS

    // Variables de control de stock
    const stock = Number(p.cantidad_actual) || 0;
    const limite = Number(p.limite_alerta) || 0;
    
    let estadoStockHTML = "";
    let bordeEstado = "";

    // Lógica de colores, alertas de stock bajo y bloqueo por agotado
    if (stock <= 0) {
      bordeEstado = "border-left: 5px solid #dc2626; opacity: 0.6;"; // Rojo (Agotado)
      estadoStockHTML = "<span style='color: #dc2626; font-weight: bold; font-size: 12px;'>⚠️ ¡Agotado!</span>";
    } else if (stock <= limite) {
      bordeEstado = "border-left: 5px solid #ca8a04;"; // Amarillo/Dorado (Stock bajo)
      estadoStockHTML = "<span style='color: #ca8a04; font-weight: bold; font-size: 12px;'>⚠️ Stock bajo: " + stock + "</span>";
    } else {
      bordeEstado = "border-left: 5px solid #16a34a;"; // Verde (Disponible)
      estadoStockHTML = "<span style='color: #16a34a; font-size: 12px;'>Disponible: " + stock + "</span>";
    }

    // Aplicar el borde lateral indicador de stock manteniendo tu diseño base
    card.style.cssText = `text-align: left; position: relative; ${bordeEstado} display: flex; flex-direction: column; justify-content: space-between;`;

    card.innerHTML = `
      <div>
        <h3>${p.nombre}</h3>
        <p style="font-size: 12px; color: #64748b; margin: 2px 0 6px 0;">Cód: ${p.codigo_interno}</p>
      </div>
      <div>
        <div class="precio">$${formatoMoneda(p.precio)}</div>
        <div style="margin-top: 4px;">${estadoStockHTML}</div>
      </div>
    `;

    // Comportamiento al hacer clic según el stock
    if (stock <= 0) {
      card.onclick = function() {
        alert(`El producto "${p.nombre}" está agotado y no se puede agregar a la remisión.`);
      };
      card.style.cursor = "not-allowed";
    } else {
      card.style.cursor = "pointer";
      card.title = "Haz clic para agregar a la remisión";
      card.onclick = function() {
        agregarProductoFactura(p, 1);
        alert(`¡${p.nombre} agregado a la remisión!`);
      };
    }

    contenedor.appendChild(card);
  });
}

/* ==========================================
   CARRITO Y FACTURACIÓN
   ================================---------- */
function agregarProductoFactura(producto, cantidad = 1) {
    const cant = parseInt(cantidad) || 1;
    const stockDisponible = Number(producto.cantidad_actual) || 0;

    if (stockDisponible <= 0) {
      alert(`❌ El producto "${producto.nombre}" está AGOTADO (Stock: 0). No se puede agregar.`);
      return;
    }

    if (cant > stockDisponible) {
      alert(`⚠️ Stock insuficiente. Solo quedan ${stockDisponible} unidades disponibles.`);
      return;
    }

    const precioNum = Number(producto.precio);
    const subtotal = precioNum * cant;
    const index = factura.findIndex(item => item.codigo_interno === producto.codigo_interno);

    if (index !== -1) {
        if ((factura[index].cantidad + cant) > stockDisponible) {
          alert(`⚠️ No puedes agregar más de las unidades disponibles. Stock máximo: ${stockDisponible}`);
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

async function irAFacturacion() {
    mostrarVista("facturacionVista");
    await actualizarNumeroRemisionDesdeNube();
    
    const fechaEl = document.getElementById("fechaActual");
    if (fechaEl) fechaEl.innerText = new Date().toLocaleDateString("es-CO");

    // Descargamos la firma de la celda J2 y la guardamos en memoria y en la imagen visual
    firmaVendedorGlobalEnMemoria = await obtenerFirmaDesdeNube();
    
    const imgEntrego = document.getElementById("imgFirmaVendedor");
    if (imgEntrego) {
        if (firmaVendedorGlobalEnMemoria && firmaVendedorGlobalEnMemoria.length > 50) {
            imgEntrego.src = firmaVendedorGlobalEnMemoria;
            imgEntrego.style.display = "block";
        } else {
            imgEntrego.style.display = "none"; 
        }
    }
}


/* ==========================================
   HISTORIAL DE VENTAS (ACTUALIZADO)
   ========================================== */
function verHistorial() {
    
    const urlAPI = obtenerUrlAPI();
    if (!urlAPI) {
        alert("No se encontró la URL de la API.");
        return;
    }

    // Obtenemos los datos directamente de las variables globales en memoria de la sesión actual
    // (Asegúrate de que window.usuarioLogueado y window.rolLogueado se asignen al hacer el login exitoso)
    const empleadoActual = window.usuarioLogueado || "";
    const rolActual = window.rolLogueado || "";
    const esJefe = (rolActual.toLowerCase() === "jefe" || empleadoActual.toLowerCase() === "administrador");
    
    // Construimos la URL enviando los parámetros GET al Apps Script para que filtre en la base de datos
    

    api("obtenerhistorial")
        .then(data => {
            if (!data.success || !data.historial) {
                console.warn("No se encontró historial o la respuesta no fue exitosa.");
                let contenedor = document.getElementById("listaHistorial");
                if (contenedor) contenedor.innerHTML = "<p style='text-align: center; color: #666;'>No hay registros en el historial.</p>";
                return;
            }
            
            let historial = data.historial;
            let contenedor = document.getElementById("listaHistorial");
            let spanTotalDia = document.getElementById("totalDia");
            
            if (!contenedor) return;

            let remisionesAgrupadas = {};
            let totalGeneralDia = 0;

            historial.forEach(item => {
                let numRem = item.numRemision;
                let key = (numRem !== undefined && numRem !== null && String(numRem).trim() !== "") ? String(numRem) : "S/N";
                
                if (!remisionesAgrupadas[key]) {
                    remisionesAgrupadas[key] = {
                        numRemision: key,
                        fecha: item.fecha ? new Date(item.fecha).toLocaleString() : "Fecha no disponible",
                        empleado: item.empleado || "Desconocido",
                        cliente: item.cliente || "Mostrador / Genérico",
                        estadoPago: item.estadoPago || "Pendiente",
                        items: [],
                        totalRemision: 0
                    };
                }
                
                remisionesAgrupadas[key].items.push({
                    producto: item.producto || "Producto",
                    cantidad: Number(item.cantidad) || 0,
                    subtotal: Number(item.subtotal) || 0
                });
                remisionesAgrupadas[key].totalRemision += Number(item.subtotal) || 0;
            });

            let html = "";
            for (let key in remisionesAgrupadas) {
                let rem = remisionesAgrupadas[key];
                totalGeneralDia += rem.totalRemision;

                let badgeColor = rem.estadoPago === "Pagado" ? "#27ae60" : "#e67e22";

                let filasItems = "";
                rem.items.forEach(i => {
                    filasItems += `
                        <tr>
                            <td style="padding: 4px 0;">${i.producto}</td>
                            <td style="padding: 4px 0;">${i.cantidad}</td>
                            <td style="padding: 4px 0; text-align: right;">$${formatoMoneda(i.subtotal)}</td>
                        </tr>
                    `;
                });

                html += `
                    <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                            <strong style="color: #2563eb; font-size: 16px;">Remisión #${rem.numRemision}</strong>
                            <span style="font-size: 12px; color: #666;">${rem.fecha}</span>
                        </div>
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Cliente:</strong> ${rem.cliente}</p>
                        <p style="margin: 4px 0; font-size: 14px;"><strong>Empleado:</strong> ${rem.empleado}</p>
                        
                        <div style="margin: 10px 0; background: #f8fafc; padding: 8px; border-radius: 6px;">
                            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; color: #475569;">
                                        <th style="padding-bottom: 4px;">Producto</th>
                                        <th style="padding-bottom: 4px;">Cant</th>
                                        <th style="padding-bottom: 4px; text-align: right;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filasItems}
                                </tbody>
                            </table>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <span style="background: ${badgeColor}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">${rem.estadoPago}</span>
                            <strong style="font-size: 15px; color: #1e293b;">Total: $${formatoMoneda(rem.totalRemision)}</strong>
                        </div>
                    </div>
                `;
            }

            contenedor.innerHTML = html;
            if (spanTotalDia) {
                spanTotalDia.innerText = formatoMoneda(totalGeneralDia);
            }
        })
        .catch(err => console.error("Error al cargar el historial:", err));
}
/* ==========================================
   GENERADOR PDF Y COMPARTIR
   ================================---------- */
function prepararDocumentoPDF() {
    const cliente = document.getElementById("clienteNombre")?.value || "Cliente";
    const telefono = document.getElementById("clienteTelefono")?.value || "";
    const direccion = document.getElementById("clienteDireccion")?.value || "";
    const numeroFormateado = String(numeroRemision).padStart(4, '0');
    const nombreArchivo = `Remision_${cliente}_${numeroFormateado}.pdf`;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("FORTIZ", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("NIT: 12345678-9", 14, 25);
    doc.text("Tel: 301 7005 428", 14, 30);
    doc.text("Bogotá D.C.", 14, 35);

    doc.rect(145, 14, 50, 18);
    doc.setFont("helvetica", "bold");
    doc.text(`No. ${numeroFormateado}`, 148, 21);
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

    const firmaVendedorBase64 = firmaVendedorGlobalEnMemoria;
    if (firmaVendedorBase64) {
        doc.addImage(firmaVendedorBase64, 'PNG', 18, startY - 22, 50, 20);
    }

    const canvasFirma = document.getElementById("firmaCanvas");
    if (canvasFirma) {
        const firmaClienteData = canvasFirma.toDataURL("image/png");
        if (firmaClienteData.length > 1500) {
            doc.addImage(firmaClienteData, 'PNG', 114, startY - 22, 50, 20);
        }
    }

    return { doc, nombreArchivo, numeroFormateado };
}







/* ==========================================
   CONFIGURACIÓN DE FIRMA TÁCTIL / RATÓN (CLIENTE - REMISIÓN)
   ================================---------- */
const canvas = document.getElementById("firmaCanvas");
let ctx = canvas ? canvas.getContext("2d") : null;
let dibujando = false;

if (canvas && ctx) {
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

/* ==========================================
   CONFIGURACIÓN DE FIRMA TÁCTIL / RATÓN (LOGIN - VENDEDOR / PROPIETARIO)
   ================================---------- */
let canvasLogin = null;
let ctxLogin = null;
let dibujandoLogin = false;



function inicializarCanvasLogin() {
  canvasLogin = document.getElementById("canvasFirmaLogin");
  if (!canvasLogin) return;
  ctxLogin = canvasLogin.getContext("2d");
  ctxLogin.lineWidth = 3;

  canvasLogin.onmousedown = () => dibujandoLogin = true;
  canvasLogin.onmouseup = () => { dibujandoLogin = false; ctxLogin.beginPath(); };
  canvasLogin.onmousemove = (e) => {
    if (!dibujandoLogin) return;
    ctxLogin.lineCap = "round";
    ctxLogin.lineTo(e.offsetX, e.offsetY);
    ctxLogin.stroke();
    ctxLogin.beginPath();
    ctxLogin.moveTo(e.offsetX, e.offsetY);
  };

  canvasLogin.ontouchstart = (e) => { dibujandoLogin = true; e.preventDefault(); };
  canvasLogin.ontouchend = () => { dibujandoLogin = false; ctxLogin.beginPath(); };
  canvasLogin.ontouchmove = (e) => {
    if (!dibujandoLogin) return;
    const rect = canvasLogin.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    ctxLogin.lineCap = "round";
    ctxLogin.lineTo(x, y);
    ctxLogin.stroke();
    ctxLogin.beginPath();
    ctxLogin.moveTo(x, y);
    e.preventDefault();
  };
}

function limpiarCanvasLogin() {
  if (canvasLogin && ctxLogin) {
    ctxLogin.clearRect(0, 0, canvasLogin.width, canvasLogin.height);
  }
}

function descargarHistorialPDF() {
    const elemento = document.getElementById("historialPDF");
    if (!elemento) {
        alert("No se encontró el contenedor del historial.");
        return;
    }

    const opciones = {
        margin: 10,
        filename: 'Historial_Ventas.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(elemento).set(opciones).outputPdf('blob').then(async (pdfBlob) => {
        const file = new File([pdfBlob], "Historial_Ventas.pdf", { type: "application/pdf" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: "Historial de Ventas",
                    text: "Aquí tienes el reporte del historial de ventas.",
                    files: [file]
                });
                return;
            } catch (e) {
                console.log("Compartir cancelado o no disponible, intentando descarga directa.");
          }
        }

        html2pdf().from(elemento).set(opciones).save();
    }).catch(err => {
        console.error("Error al generar PDF del historial:", err);
    });
}

/* ==========================================
   CARRITO Y FACTURACIÓN (Actualizado para tu HTML)
   ================================---------- */
function actualizarFactura() {
    total = 0;
    const cuerpoTabla = document.getElementById("tablaFactura");
    
    if (!cuerpoTabla) return;

    let htmlTabla = "";
    
    factura.forEach((item, index) => {
        total += Number(item.subtotal) || 0;
        htmlTabla += `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${formatoMoneda(item.precio)}</td>
                <td>$${formatoMoneda(item.subtotal)}
                    <button type="button" onclick="eliminarItemFactura(${index})" style="background:#e74c3c; color:white; border:none; padding:2px 6px; border-radius:3px; cursor:pointer; margin-left: 8px;">X</button>
                </td>
            </tr>
        `;
    });

    cuerpoTabla.innerHTML = htmlTabla;

    const totalEl = document.getElementById("total");
    if (totalEl) {
        totalEl.innerText = formatoMoneda(total);
    }
}

function eliminarItemFactura(index) {
    factura.splice(index, 1);
    actualizarFactura();
}

 // <--- ¡FALTA ESTA LLAVE DE CIERRE AL FINAL DEL ARCHIVO!





/* ===== API / SESIÓN (datos siempre desde Google Sheets) ===== */
function obtenerUrlAPI() { return localStorage.getItem("urlClienteAPI") || ""; }
function getSesion() { try { return JSON.parse(localStorage.getItem("sesion") || "null"); } catch (e) { return null; } }
function obtenerDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2)); localStorage.setItem("deviceId", id); }
  return id;
}
async function api(accion, datos = {}, post = false) {
  const url = obtenerUrlAPI();
  if (!url) throw new Error("Sistema no activado");
  const s = getSesion();
  const p = { accion, token: s ? s.token : "", ...datos };
  const r = post
    ? await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(p), redirect: "follow" })
    : await fetch(url + "?" + new URLSearchParams(p), { redirect: "follow" });
  const j = await r.json();
  if (j.expirada) { cerrarSesion(); throw new Error("Tu sesión expiró, inicia de nuevo."); }
  return j;
}

window.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("cache_productos");
  configurarBuscador();
  if (!obtenerUrlAPI()) { mostrarVista("activacionVista"); return; }
  if (!getSesion()) { mostrarVista("loginVista"); verificarSiRequiereFirmaLogin(); return; }
  iniciarEntornoTrabajo();
});

window.activar = async function () {
  const codigo = (document.getElementById("codigo")?.value || "").trim();
  const cliente = (document.getElementById("empleado")?.value || "").trim();
  if (!codigo || !cliente) { alert("Ingresa el código y el nombre del cliente."); return; }
  try {
    const q = new URLSearchParams({ accion: "activar", codigo, cliente, dispositivoId: obtenerDeviceId() });
    const j = await (await fetch(urlMaster + "?" + q, { redirect: "follow" })).json();
    if (!j.success) { alert(j.message || "No se pudo activar."); return; }
    localStorage.setItem("urlClienteAPI", j.urlCliente);
    localStorage.setItem("codigoLicencia", codigo);
    mostrarVista("loginVista");
    verificarSiRequiereFirmaLogin();
  } catch (e) { alert("Error de conexión. Verifica tu internet."); }
};

async function login() {
  const pin = (document.getElementById("pin")?.value || "").trim();
  const nombre = (document.getElementById("nombreLogin")?.value || "").trim();
  if (!nombre || !pin) { alert("Ingresa tu nombre y tu PIN."); return; }
  let firma = "";
  const sec = document.getElementById("seccionFirmaUnica");
  if (sec && sec.style.display !== "none") {
    firma = document.getElementById("canvasFirmaLogin").toDataURL("image/png");
    if (firma.length < 1500) { alert("Dibuja tu firma para continuar."); return; }
  }
  try {
    const j = await api("login", { codigo: localStorage.getItem("codigoLicencia"), dispositivoId: obtenerDeviceId(), pin, empleado: nombre, firmaCorporativa: firma }, true);
    if (!j.success) { alert(j.message || "PIN incorrecto."); return; }
    localStorage.setItem("sesion", JSON.stringify({ token: j.token, rol: j.rol, empleado: j.empleado }));
    document.getElementById("pin").value = "";
    iniciarEntornoTrabajo();
  } catch (e) { alert("Error: " + e.message); }
}

function cerrarSesion() {
  localStorage.removeItem("sesion");
  productos = []; factura = []; firmaVendedorGlobalEnMemoria = "";
  mostrarVista("loginVista");
  verificarSiRequiereFirmaLogin();
}

function iniciarEntornoTrabajo() {
  const s = getSesion();
  window.usuarioLogueado = s ? s.empleado : "";
  window.rolLogueado = s ? s.rol : "";
  mostrarVista("catalogoVista");
  cargarInventarioDesdeNube();
}

async function cargarInventarioDesdeNube() {
  try {
    const j = await api("obtenerinventario");
    if (j.success) { productos = j.productos; mostrarCatalogo(); }
  } catch (e) { console.error(e); }
}

async function actualizarNumeroRemisionDesdeNube() {
  try {
    const j = await api("obtenersiguienteremision");
    if (j.success) { numeroRemision = j.siguiente; document.getElementById("numeroRemision").innerText = j.siguienteFormateado; }
  } catch (e) { console.error(e); }
}

async function verificarSiRequiereFirmaLogin() {
  const sec = document.getElementById("seccionFirmaUnica");
  try {
    const j = await api("obtenerfirmacorporativa");
    if (j.existe) { if (sec) sec.style.display = "none"; }
    else { if (sec) sec.style.display = "block"; inicializarCanvasLogin(); }
  } catch (e) { console.error(e); }
}

async function obtenerFirmaDesdeNube() {
  try {
    const j = await api("obtenerfirmacorporativa", { t: Date.now() });
    const f = (j.urlFirma || "").trim();
    if (f) return f.startsWith("data:image") ? f : "data:image/png;base64," + f;
  } catch (e) { console.error(e); }
  return "";
}

function configurarBuscador() {
  const inp = document.getElementById("buscarProducto"), res = document.getElementById("resultados");
  if (!inp || !res) return;
  inp.addEventListener("input", () => {
    const t = inp.value.toLowerCase().trim();
    res.innerHTML = "";
    if (!t) return;
    productos.filter(p => String(p.nombre).toLowerCase().includes(t)).forEach(p => {
      const div = document.createElement("div");
      div.className = "resultadoProducto";
      div.innerHTML = `<div class="resultadoInfo"><h4></h4><p>Stock: ${p.cantidad_actual} | $${formatoMoneda(p.precio)}</p></div><div class="accionesProducto"><input type="number" class="cantidadProducto" value="1" min="1" max="${p.cantidad_actual}"><button class="btnAgregar">Agregar</button></div>`;
      div.querySelector("h4").textContent = p.nombre;
      div.querySelector(".btnAgregar").onclick = () => { agregarProductoFactura(p, div.querySelector(".cantidadProducto").value); inp.value = ""; res.innerHTML = ""; };
      res.appendChild(div);
    });
  });
}

/* ===== ENVIAR REMISIÓN: guarda primero (el servidor asigna número y valida stock), luego comparte el PDF ===== */
let enviando = false;
async function compartirPDF() {
  if (enviando) return;
  if (!factura.length) { alert("No hay productos en la remisión."); return; }
  const cv = document.getElementById("firmaCanvas");
  if (!cv || cv.toDataURL("image/png").length < 1500) { alert("Falta la firma del cliente."); return; }
  const v = id => (document.getElementById(id)?.value || "").trim();
  enviando = true;
  try {
    const j = await api("registrarremisionmasiva", {
      items: factura.map(i => ({ codigo_interno: i.codigo_interno, cantidad: i.cantidad })),
      cliente: v("clienteNombre"), estadoPago: v("selectEstadoPago") || "Pagado", firma: cv.toDataURL("image/png")
    }, true);
    if (!j.success) { alert(j.message || "No se pudo guardar la remisión."); cargarInventarioDesdeNube(); return; }
    numeroRemision = j.numRemision;
    const { doc, nombreArchivo, numeroFormateado } = prepararDocumentoPDF();
    const file = new File([doc.output("blob")], nombreArchivo, { type: "application/pdf" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ title: "Remisión", text: `Remisión No. ${numeroFormateado}`, files: [file] });
      else doc.save(nombreArchivo);
    } catch (e) { /* compartir cancelado: la remisión ya quedó guardada */ }
    factura = []; actualizarFactura();
    ["clienteNombre", "clienteTelefono", "clienteDireccion"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    limpiarFirma();
    cargarInventarioDesdeNube();
    mostrarVista("historialVista");
  } catch (e) { alert("Error: " + e.message); }
  finally { enviando = false; }
}





