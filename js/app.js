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
function claveMes(f) { const d = new Date(f); if (isNaN(d)) return "sin-fecha"; return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function etiquetaMes(clave) {
    if (clave === "todos") return "Todos los meses";
    if (clave === "sin-fecha") return "Sin fecha";
    const [y, m] = clave.split("-");
    const t = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    return t.charAt(0).toUpperCase() + t.slice(1);
}
let filtroEstado = "Todos"; // Todos | Pendiente | Pagado
let filtroMes = claveMes(new Date()); // por defecto: el mes actual

function escHtml(t) { return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function historialPorMes() { return historialAgrupado.filter(r => filtroMes === "todos" || r.mes === filtroMes); }

function historialFiltrado() {
    return historialPorMes().filter(r => filtroEstado === "Todos" || (filtroEstado === "Pendiente" ? r.estadoPago === "Pendiente" : r.estadoPago !== "Pendiente"));
}

function asegurarFiltrosHistorial() {
    if (document.getElementById("filtrosHistorial")) return;
    const lista = document.getElementById("listaHistorial");
    if (!lista) return;
    const barra = document.createElement("div");
    barra.id = "filtrosHistorial";
    barra.style.cssText = "display:flex; gap:8px; margin:0 0 10px 0;";
    [["Todos", "Todos"], ["Pendiente", "Pendientes"], ["Pagado", "Pagados"]].forEach(([valor, texto]) => {
        const b = document.createElement("button");
        b.type = "button"; b.dataset.filtro = valor; b.dataset.texto = texto;
        b.onclick = () => { filtroEstado = valor; renderHistorial(); };
        barra.appendChild(b);
    });
    const aviso = document.createElement("p");
    aviso.id = "avisoFiltro";
    aviso.style.cssText = "font-size:12px; color:#64748b; margin:0 0 12px 0; display:none;";
    const sel = document.createElement("select");
    sel.id = "filtroMes";
    sel.style.cssText = "width:100%; padding:10px; margin:0 0 10px 0; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; background:white; color:#1e293b;";
    sel.onchange = () => { filtroMes = sel.value; renderHistorial(); };
    lista.parentNode.insertBefore(sel, lista);
    lista.parentNode.insertBefore(barra, lista);
    lista.parentNode.insertBefore(aviso, lista);
}

function renderHistorial() {
    asegurarFiltrosHistorial();
    const contenedor = document.getElementById("listaHistorial");
    const spanTotal = document.getElementById("totalDia");
    if (!contenedor) return;

    const sel = document.getElementById("filtroMes");
    if (sel) {
        const hoy = claveMes(new Date());
        const meses = [...new Set([hoy, ...historialAgrupado.map(x => x.mes)])].filter(m => m !== "sin-fecha").sort().reverse();
        sel.innerHTML = meses.map(m => `<option value="${m}">${etiquetaMes(m)}${m === hoy ? " (este mes)" : ""}</option>`).join("") + `<option value="todos">Todos los meses</option>`;
        sel.value = filtroMes;
    }
    const delMes = historialPorMes();
    const cuenta = { Todos: delMes.length, Pendiente: delMes.filter(x => x.estadoPago === "Pendiente").length };
    cuenta.Pagado = cuenta.Todos - cuenta.Pendiente;
    document.querySelectorAll("#filtrosHistorial button").forEach(b => {
        const activo = b.dataset.filtro === filtroEstado;
        b.textContent = b.dataset.texto + " (" + cuenta[b.dataset.filtro] + ")";
        b.style.cssText = "flex:1; width:auto; padding:9px 4px; border-radius:6px; font-size:13px; font-weight:bold; cursor:pointer; border:1px solid " + (activo ? "#2563eb" : "#cbd5e1") + "; background:" + (activo ? "#2563eb" : "white") + "; color:" + (activo ? "white" : "#475569") + ";";
    });
    const aviso = document.getElementById("avisoFiltro");
    if (aviso) {
        const otros = filtroMes === "todos" ? [] : historialAgrupado.filter(x => x.mes !== filtroMes && x.estadoPago === "Pendiente");
        const partes = [];
        if (filtroEstado === "Pendiente") partes.push("Toca la etiqueta «Pendiente» de una remisión para marcarla como pagada.");
        if (otros.length) partes.push("⚠ Hay " + otros.length + " remisión(es) pendiente(s) en otros meses ($" + formatoMoneda(otros.reduce((t, x) => t + x.totalRemision, 0)) + "). Elige «Todos los meses» para verlas.");
        aviso.textContent = partes.join(" ");
        aviso.style.display = partes.length ? "block" : "none";
    }

    const lista = historialFiltrado();
    if (!lista.length) {
        contenedor.innerHTML = "<p style='text-align:center; color:#666;'>No hay remisiones " + (filtroEstado === "Pendiente" ? "pendientes" : filtroEstado === "Pagado" ? "pagadas" : "en el historial") + (filtroMes === "todos" ? "" : " (" + etiquetaMes(filtroMes) + ")") + ".</p>";
        if (spanTotal) spanTotal.innerText = "0";
        return;
    }

    let total = 0, html = "";
    lista.forEach(rem => {
        total += rem.totalRemision;
        const pendiente = rem.estadoPago === "Pendiente";
        const filas = rem.items.map(i => `
            <tr>
                <td style="padding: 4px 0;">${escHtml(i.producto)}</td>
                <td style="padding: 4px 0;">${i.cantidad}</td>
                <td style="padding: 4px 0; text-align: right;">$${formatoMoneda(i.subtotal)}</td>
            </tr>`).join("");
        const puedeCobrar = !rem.porSync && pendiente && /^([A-Z]+-)?\d+$/.test(String(rem.numRemision));
        const etiqueta = puedeCobrar
            ? `<button type="button" onclick="confirmarPago('${rem.numRemision}')" title="Marcar como pagada" style="width:auto; background:#e67e22; color:white; padding:6px 12px; border:none; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">Pendiente</button>`
            : `<span style="background:${pendiente ? "#e67e22" : "#27ae60"}; color:white; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:bold;">${escHtml(rem.estadoPago)}</span>`;
        html += `
            <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                    <strong style="color: #2563eb; font-size: 16px;">Remisión #${escHtml(rem.numRemision)}</strong>${rem.porSync ? `<span style="background:${rem.errorSync ? "#dc2626" : "#2563eb"}; color:white; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold; margin-left:6px;">${rem.errorSync ? "No aceptada" : "⏳ Por enviar"}</span>` : ""}
                    <span style="font-size: 12px; color: #666;">${escHtml(rem.fecha)}</span>
                </div>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Cliente:</strong> ${escHtml(rem.cliente)}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Empleado:</strong> ${escHtml(rem.empleado)}</p>
                <div style="margin: 10px 0; background: #f8fafc; padding: 8px; border-radius: 6px;">
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; color: #475569;">
                                <th style="padding-bottom: 4px;">Producto</th>
                                <th style="padding-bottom: 4px;">Cant</th>
                                <th style="padding-bottom: 4px; text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    ${etiqueta}
                    <strong style="font-size: 15px; color: #1e293b;">Total: $${formatoMoneda(rem.totalRemision)}</strong>
                </div>
                ${rem.errorSync ? `<p style="margin:8px 0 0 0; font-size:12px; color:#dc2626;">⚠ ${escHtml(rem.errorSync)}</p>` : ""}
                ${(rem.revisar && (getSesion() || {}).rol === "jefe") ? `<p style="margin:8px 0 0 0; font-size:12px; color:#b45309; background:#fef3c7; padding:6px 8px; border-radius:4px;">⚠ Revisar: ${escHtml(rem.revisar)}</p>` : ""}
                ${(!pendiente && rem.fechaPago) ? `<p style="margin:8px 0 0 0; font-size:12px; color:#16a34a;">✔ Pagado el ${escHtml(rem.fechaPago)}${rem.cobradoPor ? " · registrado por " + escHtml(rem.cobradoPor) : ""}</p>` : ""}
            </div>`;
    });
    contenedor.innerHTML = html;
    if (spanTotal) spanTotal.innerText = formatoMoneda(total);
}

async function confirmarPago(num) {
    if (!navigator.onLine) { alert("Necesitas internet para marcar una remisión como pagada."); return; }
    const rem = historialAgrupado.find(r => String(r.numRemision) === String(num));
    if (!rem || rem.estadoPago !== "Pendiente") return;
    const ok = confirm("¿Confirmas que la remisión #" + String(num).padStart(4, "0") + " de " + rem.cliente + " por $" + formatoMoneda(rem.totalRemision) + " ya fue pagada?\n\nPasará a estado Pagado.");
    if (!ok) return;
    try {
        const j = await api("marcarpagado", { numRemision: String(num) }, true);
        if (!j.success) { alert(j.message || "No se pudo actualizar el estado."); return; }
        rem.estadoPago = "Pagado";
        rem.fechaPago = new Date().toLocaleString();
        rem.cobradoPor = (getSesion() || {}).empleado || "";
        renderHistorial();
    } catch (e) { alert("Error: " + e.message); }
}

function agruparHistorial(lista) {
    const grupos = {};
    lista.forEach(item => {
        const n = item.numRemision;
        const key = (n !== undefined && n !== null && String(n).trim() !== "") ? String(n) : "S/N";
        if (!grupos[key]) {
            grupos[key] = {
                numRemision: key,
                fecha: item.fecha ? new Date(item.fecha).toLocaleString() : "Fecha no disponible",
                empleado: item.empleado || "Desconocido",
                cliente: item.cliente || "Mostrador / Genérico",
                estadoPago: item.estadoPago || "Pendiente",
                mes: claveMes(item.fecha),
                ts: new Date(item.fecha).getTime() || 0,
                fechaPago: item.fechaPago ? new Date(item.fechaPago).toLocaleString() : "",
                cobradoPor: item.cobradoPor || "",
                revisar: "",
                items: [], totalRemision: 0
            };
        }
        if (item.revisar) grupos[key].revisar = String(item.revisar);
        grupos[key].items.push({ producto: item.producto || "Producto", cantidad: Number(item.cantidad) || 0, subtotal: Number(item.subtotal) || 0 });
        grupos[key].totalRemision += Number(item.subtotal) || 0;
    });
    return Object.values(grupos);
}

async function colaComoGrupos(yaEnServidor) {
    const cola = ((await idbLeer("cola")) || []).filter(esMia);
    return cola.filter(r => !yaEnServidor.has(String(r.numRemision))).map(r => ({
        numRemision: String(r.numRemision), uuid: r.uuid,
        fecha: new Date(r.fecha).toLocaleString(), empleado: r.empleado || "", cliente: r.cliente || "Mostrador / Genérico",
        estadoPago: r.estadoPago || "Pagado", mes: claveMes(r.fecha), ts: new Date(r.fecha).getTime() || 0,
        fechaPago: "", cobradoPor: "", revisar: "", porSync: true, errorSync: r.error || "",
        items: (r.items || []).map(i => ({ producto: i.nombre, cantidad: Number(i.cantidad) || 0, subtotal: (Number(i.cantidad) || 0) * (Number(i.precio) || 0) })),
        totalRemision: (r.items || []).reduce((t, i) => t + (Number(i.cantidad) || 0) * (Number(i.precio) || 0), 0)
    }));
}

async function armarHistorial(lista) {
    const base = agruparHistorial(lista);
    const ya = new Set(base.map(x => x.numRemision));
    const locales = await colaComoGrupos(ya);
    historialAgrupado = [...locales, ...base];
    renderHistorial();
}

function verHistorial() {
    if (!obtenerUrlAPI()) { alert("No se encontró la URL de la API."); return; }
    asegurarFiltrosHistorial();
    const clave = "historial:" + String((getSesion() || {}).empleado || "").trim().toLowerCase();
    const usarCopia = async () => {
        const c = await idbLeer(clave);
        await armarHistorial((c && c.lista) || []); usandoCopiaLocal = true;
        actualizarBanner();
    };
    if (!navigator.onLine) { usarCopia(); return; }
    api("obtenerhistorial")
        .then(data => {
            const lista = data.success && data.historial ? data.historial : [];
            idbGuardar(clave, { lista, ts: Date.now() });
            usandoCopiaLocal = false; actualizarBanner();
            return armarHistorial(lista);
        })
        .catch(err => { console.error("Error al cargar el historial:", err); if (!String(err.message).includes("expir")) usarCopia(); });
}
/* ==========================================
   GENERADOR PDF Y COMPARTIR
   ================================---------- */
function prepararDocumentoPDF() {
    const valor = id => (document.getElementById(id)?.value || "").trim();
    const cliente = valor("clienteNombre") || "Cliente";
    const telefono = valor("clienteTelefono");
    const direccion = valor("clienteDireccion");
    const pagado = (valor("selectEstadoPago") || "Pagado") !== "Pendiente";
    const atendio = (getSesion() || {}).empleado || "";
    const numeroFormateado = numeroRemisionTexto;
    const nombreArchivo = `Remision_${cliente}_${numeroFormateado}.pdf`;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210, H = 297, M = 14, LIMITE = H - 20;
    const azul = [41, 128, 185], gris = [100, 116, 139], oscuro = [30, 41, 59];

    /* --- Encabezado --- */
    doc.setFillColor(...azul); doc.rect(0, 0, W, 36, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("FORTIZ", M, 17);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("NIT: 12345678-9", M, 23); doc.text("Tel: 301 7005 428  |  Bogotá D.C.", M, 28);
    doc.setFillColor(255, 255, 255); doc.roundedRect(W - M - 52, 8, 52, 21, 2, 2, "F");
    doc.setTextColor(...gris); doc.setFontSize(8); doc.text("REMISIÓN DE ENTREGA", W - M - 26, 14, { align: "center" });
    doc.setTextColor(...azul); doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("No. " + numeroFormateado, W - M - 26, 21.5, { align: "center" });
    doc.setTextColor(...gris); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(new Date().toLocaleDateString("es-CO"), W - M - 26, 26.5, { align: "center" });

    /* --- Datos del cliente --- */
    doc.setFillColor(241, 245, 249); doc.roundedRect(M, 43, W - 2 * M, 28, 2, 2, "F");
    const fila = (etiqueta, texto, y) => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...gris); doc.text(etiqueta, M + 4, y);
        doc.setFont("helvetica", "normal"); doc.setTextColor(...oscuro); doc.text(doc.splitTextToSize(texto || "-", 95)[0], M + 28, y);
    };
    fila("Cliente:", cliente, 51); fila("Teléfono:", telefono, 58); fila("Dirección:", direccion, 65);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...gris); doc.text("ESTADO DE PAGO", W - M - 4, 50, { align: "right" });
    doc.setFillColor(...(pagado ? [39, 174, 96] : [230, 126, 34])); doc.roundedRect(W - M - 34, 53, 30, 8, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text(pagado ? "PAGADO" : "PENDIENTE", W - M - 19, 58.5, { align: "center" });
    if (atendio) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...gris); doc.text("Atendió: " + atendio, W - M - 4, 68, { align: "right" }); }

    /* --- Tabla de productos --- */
    let y = 80;
    const cabecera = () => {
        doc.setFillColor(...azul); doc.roundedRect(M, y, W - 2 * M, 9, 1.5, 1.5, "F");
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text("Descripción", M + 4, y + 6); doc.text("Cant", 128, y + 6, { align: "right" });
        doc.text("Precio", 160, y + 6, { align: "right" }); doc.text("Subtotal", W - M - 4, y + 6, { align: "right" });
        y += 9;
    };
    cabecera();
    factura.forEach((item, i) => {
        if (y + 9 > LIMITE) { doc.addPage(); y = 20; cabecera(); }
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(M, y, W - 2 * M, 9, "F"); }
        doc.setTextColor(...oscuro); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.text(doc.splitTextToSize(String(item.nombre), 80)[0], M + 4, y + 6);
        doc.text(String(item.cantidad), 128, y + 6, { align: "right" });
        doc.text("$" + formatoMoneda(item.precio), 160, y + 6, { align: "right" });
        doc.text("$" + formatoMoneda(item.subtotal), W - M - 4, y + 6, { align: "right" });
        doc.setDrawColor(226, 232, 240); doc.line(M, y + 9, W - M, y + 9);
        y += 9;
    });

    /* --- Total --- */
    if (y + 60 > LIMITE) { doc.addPage(); y = 20; }
    y += 6;
    doc.setFillColor(...azul); doc.roundedRect(W - M - 70, y, 70, 13, 2, 2, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("TOTAL", W - M - 66, y + 8.2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("$" + formatoMoneda(total), W - M - 4, y + 9, { align: "right" });

    /* --- Firmas --- */
    y += 40;
    const lineaY = y + 22;
    doc.setDrawColor(...gris); doc.line(M, lineaY, 95, lineaY); doc.line(115, lineaY, W - M, lineaY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...oscuro);
    doc.text("Entregó", M, lineaY + 5); doc.text("Recibió", 115, lineaY + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...gris);
    if (atendio) doc.text(atendio, M, lineaY + 10);
    doc.text(cliente, 115, lineaY + 10);

    if (firmaVendedorGlobalEnMemoria) {
        try { doc.addImage(firmaVendedorGlobalEnMemoria, 'PNG', M + 2, lineaY - 20, 50, 19); } catch (e) { console.warn("Firma de entrega no válida", e); }
    }
    const canvasFirma = document.getElementById("firmaCanvas");
    if (canvasFirma) {
        const firmaClienteData = canvasFirma.toDataURL("image/png");
        if (firmaClienteData.length > 1500) {
            try { doc.addImage(firmaClienteData, 'PNG', 117, lineaY - 20, 50, 19); } catch (e) { console.warn("Firma del cliente no válida", e); }
        }
    }

    /* --- Pie de página --- */
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240); doc.line(M, H - 14, W - M, H - 14);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text("Gracias por su compra", M, H - 9);
        doc.text("Remisión " + numeroFormateado + (n > 1 ? "  |  Página " + p + " de " + n : ""), W - M, H - 9, { align: "right" });
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

let historialAgrupado = [];

function descargarHistorialPDF() {
    const base = historialFiltrado();
    if (!base.length) { alert("No hay remisiones para exportar con este filtro."); return; }
    const etiquetaFiltro = filtroEstado === "Pendiente" ? "Pendientes" : filtroEstado === "Pagado" ? "Pagadas" : "";
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 14, LIMITE = H - 18;
    const azul = [41, 128, 185], gris = [100, 116, 139], oscuro = [30, 41, 59];
    const ses = getSesion() || {};
    const pad = n => String(n).padStart(4, "0");
    const lista = [...base].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const totalGeneral = lista.reduce((t, r) => t + r.totalRemision, 0);
    const totalPend = lista.filter(r => r.estadoPago !== "Pagado").reduce((t, r) => t + r.totalRemision, 0);

    // Encabezado
    doc.setFillColor(...azul); doc.rect(0, 0, W, 30, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("FORTIZ", M, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.text("Historial de ventas - " + etiquetaMes(filtroMes) + (etiquetaFiltro ? " - " + etiquetaFiltro : ""), M, 22);
    doc.setFontSize(9);
    doc.text("Generado: " + new Date().toLocaleString("es-CO"), W - M, 14, { align: "right" });
    doc.text(ses.rol === "jefe" ? "Todas las ventas" : "Ventas de " + (ses.empleado || ""), W - M, 22, { align: "right" });

    // Resumen
    const cajas = filtroEstado === "Todos"
        ? [["Remisiones", String(lista.length)], ["Total vendido", "$" + formatoMoneda(totalGeneral)], ["Pendiente por cobrar", "$" + formatoMoneda(totalPend)]]
        : [["Remisiones " + etiquetaFiltro.toLowerCase(), String(lista.length)], [filtroEstado === "Pendiente" ? "Total por cobrar" : "Total cobrado", "$" + formatoMoneda(totalGeneral)]];
    const bw = (W - 2 * M - 4 * (cajas.length - 1)) / cajas.length;
    cajas.forEach((c, i) => {
        const x = M + i * (bw + 4);
        doc.setFillColor(241, 245, 249); doc.roundedRect(x, 37, bw, 18, 2, 2, "F");
        doc.setTextColor(...gris); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(c[0], x + 4, 44);
        doc.setTextColor(...oscuro); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(c[1], x + 4, 51.5);
    });

    let y = 64;
    const cabeceraTabla = () => {
        doc.setTextColor(...gris); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
        doc.text("Producto", M + 3, y); doc.text("Cant", 140, y, { align: "right" }); doc.text("Subtotal", W - M - 3, y, { align: "right" });
        doc.setDrawColor(203, 213, 225); doc.line(M, y + 2, W - M, y + 2);
        y += 7;
    };

    lista.forEach(r => {
        if (y + 40 > LIMITE) { doc.addPage(); y = 20; }
        doc.setFillColor(241, 245, 249); doc.roundedRect(M, y, W - 2 * M, 10, 1.5, 1.5, "F");
        doc.setTextColor(37, 99, 235); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Remisión #" + pad(r.numRemision), M + 3, y + 6.5);
        doc.setTextColor(...gris); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(String(r.fecha), W - M - 3, y + 6.5, { align: "right" });
        y += 15;
        doc.setTextColor(...oscuro); doc.setFontSize(9);
        doc.text("Cliente: " + String(r.cliente).slice(0, 40), M + 3, y);
        doc.text("Empleado: " + String(r.empleado).slice(0, 30), 115, y);
        y += 7;
        cabeceraTabla();
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...oscuro);
        r.items.forEach(it => {
            if (y + 20 > LIMITE) { doc.addPage(); y = 20; doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...gris); doc.text("Remisión #" + pad(r.numRemision) + " (continuación)", M + 3, y); y += 7; cabeceraTabla(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...oscuro); }
            doc.text(String(it.producto).slice(0, 60), M + 3, y);
            doc.text(String(it.cantidad), 140, y, { align: "right" });
            doc.text("$" + formatoMoneda(it.subtotal), W - M - 3, y, { align: "right" });
            doc.setDrawColor(235, 238, 243); doc.line(M, y + 2, W - M, y + 2);
            y += 7;
        });
        const pagado = r.estadoPago === "Pagado";
        doc.setFillColor(...(pagado ? [39, 174, 96] : [230, 126, 34])); doc.roundedRect(M + 3, y, 24, 6.5, 1.2, 1.2, "F");
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(String(r.estadoPago), M + 15, y + 4.5, { align: "center" });
        doc.setTextColor(...oscuro); doc.setFontSize(10); doc.text("Total: $" + formatoMoneda(r.totalRemision), W - M - 3, y + 4.8, { align: "right" });
        if (pagado && r.fechaPago) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...gris); doc.text("Cobrado el " + r.fechaPago + (r.cobradoPor ? " - registrado por " + r.cobradoPor : ""), M + 3, y + 11.5); }
        y += 16;
    });

    // Pie de página
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
        doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text("Página " + i + " de " + n, W / 2, H - 8, { align: "center" });
    }

    const nombre = "Historial_Ventas_" + (filtroMes !== "todos" ? filtroMes + "_" : "") + (etiquetaFiltro ? etiquetaFiltro + "_" : "") + new Date().toISOString().slice(0, 10) + ".pdf";
    const file = new File([doc.output("blob")], nombre, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ title: "Historial de ventas", files: [file] }).catch(e => { if (e.name !== "AbortError") doc.save(nombre); });
    } else { doc.save(nombre); }
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
let ultimaSyncTs = 0;
async function api(accion, datos = {}, post = false) {
  const url = obtenerUrlAPI();
  if (!url) throw new Error("Sistema no activado");
  const s = getSesion();
  const { _silencioso, ...resto } = datos;
  const p = { accion, token: s ? s.token : "", ...resto };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), post ? 60000 : 15000); // con señal mala no se queda colgada
  try {
    const r = post
      ? await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(p), redirect: "follow", signal: ctrl.signal })
      : await fetch(url + "?" + new URLSearchParams(p), { redirect: "follow", signal: ctrl.signal });
    const j = await r.json();
    if (j.expirada) { if (!_silencioso) cerrarSesion(true); throw new Error("Tu sesión expiró, inicia de nuevo."); }
    ultimaSyncTs = Date.now(); idbGuardar("ultimaSync", ultimaSyncTs);
    return j;
  } finally { clearTimeout(t); }
}

window.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("cache_productos");
  configurarBuscador();
  if (!obtenerUrlAPI()) { mostrarVista("activacionVista"); return; }
  if (!getSesion()) { mostrarVista("loginVista"); verificarSiRequiereFirmaLogin(); return; }
  iniciarEntornoTrabajo();
});

window.activar = async function () {
  if (!navigator.onLine) { alert("Necesitas conexión a internet para activar el sistema."); return; }
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
  if (!navigator.onLine) { alert("Necesitas conexión a internet para iniciar sesión."); return; }
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
    if (!j.success) {
      if (j.requiereFirma && sec) { sec.style.display = "block"; if (!window._canvasLoginListo) { inicializarCanvasLogin(); window._canvasLoginListo = true; } }
      alert(j.message || "PIN incorrecto."); return;
    }
    localStorage.setItem("sesion", JSON.stringify({ token: j.token, rol: j.rol, empleado: j.empleado, serie: j.serie || "" }));
    if (j.serie && j.ultimoNumero) {
      const loc = (await idbLeer("contador:" + j.serie)) || 0;
      if (j.ultimoNumero > loc) await idbGuardar("contador:" + j.serie, j.ultimoNumero);
    }
    document.getElementById("pin").value = "";
    iniciarEntornoTrabajo();
  } catch (e) { alert("Error: " + e.message); }
}

function cerrarSesion(forzado) {
  if (!forzado && pendientesCola > 0 && !confirm("Tienes " + pendientesCola + " remisión(es) sin enviar. No se pierden, pero no se enviarán hasta que vuelvas a iniciar sesión con internet.\n\n¿Cerrar sesión de todos modos?")) return;
  idbBorrar("historial:" + String((getSesion() || {}).empleado || "").trim().toLowerCase()); // la copia del historial es de ese usuario
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
  asegurarSerie(); contarCola(); sincronizar();
}

async function cargarInventarioDesdeNube() {
  try {
    if (!navigator.onLine) throw new Error("sin red");
    const j = await api("obtenerinventario");
    if (j.success) {
      productos = await aplicarColaAlStock(j.productos); usandoCopiaLocal = false;
      idbGuardar("catalogo", { productos, ts: Date.now() });
      mostrarCatalogo(); actualizarBanner(); return;
    }
  } catch (e) {
    if (String(e.message).includes("expir")) return; // api() ya llevó al login
    console.warn("Sin conexión, se usa la copia local", e);
  }
  const copia = await idbLeer("catalogo");
  if (copia && copia.productos) { productos = copia.productos; usandoCopiaLocal = true; mostrarCatalogo(); }
  actualizarBanner();
}

async function actualizarNumeroRemisionDesdeNube() { // local: serie del celular + contador, funciona sin internet
  await asegurarSerie();
  const serie = (getSesion() || {}).serie;
  const el = document.getElementById("numeroRemision");
  if (!serie) { numeroRemisionTexto = ""; if (el) el.innerText = "Sin serie (conéctate)"; return; }
  numeroRemision = ((await idbLeer("contador:" + serie)) || 0) + 1;
  numeroRemisionTexto = serie + "-" + String(numeroRemision).padStart(4, "0");
  if (el) el.innerText = numeroRemisionTexto;
}

async function asegurarSerie() {
  const s = getSesion();
  if (!s || s.serie || !navigator.onLine) return;
  try {
    // la serie llega en el login; si falta, hay que volver a iniciar sesión con internet
  } catch (e) { console.warn(e); }
}

function verificarSiRequiereFirmaLogin() {
  const sec = document.getElementById("seccionFirmaUnica");
  if (sec) sec.style.display = "none"; // se muestra solo si el servidor dice que este usuario aún no tiene firma
}

async function obtenerFirmaDesdeNube() {
  const clave = "firma:" + String((getSesion() || {}).empleado || "").trim().toLowerCase();
  try {
    if (!navigator.onLine) throw new Error("sin red");
    const j = await api("obtenerfirmacorporativa", { t: Date.now() });
    const f = (j.urlFirma || "").trim();
    if (f) { const completa = f.startsWith("data:image") ? f : "data:image/png;base64," + f; idbGuardar(clave, completa); return completa; }
  } catch (e) { console.warn(e); }
  return (await idbLeer(clave)) || "";
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

/* ===== ENVIAR REMISIÓN: se comparte el PDF y la remisión queda en una cola local que se sube sola a la hoja ===== */
let enviando = false, sincronizando = false, pendientesCola = 0, ultimoErrorSync = "";
let numeroRemisionTexto = "";
let colaPromesa = Promise.resolve();
function colaOp(fn) { colaPromesa = colaPromesa.then(fn, fn); return colaPromesa; }
function nuevoUuid() { return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2); }

async function contarCola() { pendientesCola = ((await idbLeer("cola")) || []).length; actualizarBanner(); }

async function respaldarCola() {
  const cola = (await idbLeer("cola")) || [];
  if (!cola.length) { alert("No hay remisiones por enviar."); return; }
  const blob = new Blob([JSON.stringify({ version: 1, creado: new Date().toISOString(), remisiones: cola })], { type: "application/json" });
  const nombre = "respaldo-remisiones-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
  try {
    const f = new File([blob], nombre, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Respaldo de remisiones" }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function encolarRemision(rem, n, serie) {
  await colaOp(async () => {
    const c = (await idbLeer("cola")) || [];
    c.push(rem);
    await idbGuardar("cola", c, true);
    await idbGuardar("contador:" + serie, n, true);
  });
  await contarCola();
}

async function aplicarColaAlStock(lista) {
  const cola = (await idbLeer("cola")) || [];
  cola.forEach(r => r.items.forEach(it => {
    const p = lista.find(x => x.codigo_interno === it.codigo_interno);
    if (p) p.cantidad_actual = Math.max(0, (Number(p.cantidad_actual) || 0) - it.cantidad);
  }));
  return lista;
}

function descontarStockLocal(items) {
  items.forEach(it => {
    const p = productos.find(x => x.codigo_interno === it.codigo_interno);
    if (p) p.cantidad_actual = Math.max(0, (Number(p.cantidad_actual) || 0) - it.cantidad);
  });
  idbGuardar("catalogo", { productos, ts: Date.now() });
  mostrarCatalogo();
}

function esMia(r) {
  const s = getSesion() || {};
  return s.rol === "jefe" || String(r.empleado).trim().toLowerCase() === String(s.empleado || "").trim().toLowerCase();
}

async function sincronizar() {
  if (sincronizando || !navigator.onLine || !getSesion()) return;
  sincronizando = true; ultimoErrorSync = ""; actualizarBanner();
  let enviadas = 0;
  try {
    for (let vuelta = 0; vuelta < 50; vuelta++) {
      const mias = ((await idbLeer("cola")) || []).filter(r => esMia(r) && !r.error);
      if (!mias.length) break;
      const j = await api("sincronizar", { remisiones: mias.slice(0, 5), _silencioso: true }, true);
      if (!j.success) { ultimoErrorSync = j.message || "error del servidor"; break; }
      const ok = new Set(), fallos = {};
      (j.aceptadas || []).forEach(u => ok.add(u));
      // solo se borra de la cola lo que el servidor confirmó (guardada o ya existente)
      await colaOp(async () => {
        const c = (await idbLeer("cola")) || [];
        await idbGuardar("cola", c.filter(r => !ok.has(r.uuid)).map(r => fallos[r.uuid] ? { ...r, error: fallos[r.uuid] } : r), true);
      });
      enviadas += ok.size;
      if (!ok.size) { ultimoErrorSync = "el servidor no aceptó las remisiones"; break; }
    }
  } catch (e) {
    ultimoErrorSync = String(e.message).includes("expir") ? "sesión vencida: inicia sesión con internet para enviarlas" : "señal inestable, se reintentará";
  } finally {
    sincronizando = false;
    await contarCola();
  }
  if (enviadas) {
    cargarInventarioDesdeNube();
    const hv = document.getElementById("historialVista");
    if (hv && hv.style.display === "block") verHistorial();
  }
}

async function compartirPDF() {
  if (enviando) return;
  if (!factura.length) { alert("No hay productos en la remisión."); return; }
  const ses = getSesion() || {};
  if (!ses.serie || !numeroRemisionTexto) {
    alert("Este celular aún no tiene su serie de remisiones. Cierra sesión y vuelve a entrar con internet una vez.");
    asegurarSerie().then(actualizarNumeroRemisionDesdeNube);
    return;
  }
  const cv = document.getElementById("firmaCanvas");
  if (!cv || cv.toDataURL("image/png").length < 1500) { alert("Falta la firma del cliente."); return; }
  const v = id => (document.getElementById(id)?.value || "").trim();
  const rem = {
    uuid: nuevoUuid(), numRemision: numeroRemisionTexto, fecha: new Date().toISOString(), empleado: ses.empleado,
    cliente: v("clienteNombre") || "Mostrador / Genérico", estadoPago: v("selectEstadoPago") || "Pagado",
    firma: cv.toDataURL("image/png"),
    items: factura.map(i => ({ codigo_interno: i.codigo_interno, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio }))
  };
  const n = numeroRemision;
  enviando = true;
  try {
    // El PDF se comparte de inmediato (dentro del toque del usuario), con o sin internet.
    const { doc, nombreArchivo, numeroFormateado } = prepararDocumentoPDF();
    const file = new File([doc.output("blob")], nombreArchivo, { type: "application/pdf" });
    let enviado = false;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Remisión", text: `Remisión No. ${numeroFormateado}`, files: [file] });
        enviado = true;
      } else {
        doc.save(nombreArchivo);
        enviado = confirm("Se descargó el PDF. ¿Ya lo enviaste al cliente?\nAceptar = guardar la remisión.");
      }
    } catch (e) {
      if (e.name !== "AbortError") alert("No se pudo compartir el PDF: " + e.message);
    }
    if (!enviado) { alert("Envío cancelado: la remisión NO se guardó y el inventario no cambió."); return; }

    try { await encolarRemision(rem, n, ses.serie); }
    catch (e) { alert("⚠ El PDF se envió, pero la remisión NO se pudo guardar en este celular (" + e.message + "). Anótala: No. " + rem.numero); return; }

    descontarStockLocal(rem.items);
    factura = []; actualizarFactura();
    ["clienteNombre", "clienteTelefono", "clienteDireccion"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    limpiarFirma();
    await actualizarNumeroRemisionDesdeNube();
    mostrarVista("historialVista");
    sincronizar();
  } finally { enviando = false; }
}

/* ===== MODO SIN CONEXIÓN (etapa 1): copias locales en IndexedDB + indicador ===== */
const IDB_NOMBRE = "remisiones_local", IDB_STORE = "kv";
let usandoCopiaLocal = false;

function idbAbrir() {
  return new Promise((ok, err) => {
    const r = indexedDB.open(IDB_NOMBRE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => err(r.error);
  });
}
async function idbGuardar(clave, valor, estricto = false) {
  try {
    const db = await idbAbrir();
    await new Promise((ok, err) => { const t = db.transaction(IDB_STORE, "readwrite"); t.objectStore(IDB_STORE).put(valor, clave); t.oncomplete = ok; t.onerror = () => err(t.error); });
  } catch (e) { if (estricto) throw e; console.warn("IndexedDB no disponible", e); }
}
async function idbLeer(clave) {
  try {
    const db = await idbAbrir();
    return await new Promise((ok, err) => { const q = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(clave); q.onsuccess = () => ok(q.result); q.onerror = () => err(q.error); });
  } catch (e) { return undefined; }
}
async function idbBorrar(clave) {
  try {
    const db = await idbAbrir();
    await new Promise((ok, err) => { const t = db.transaction(IDB_STORE, "readwrite"); t.objectStore(IDB_STORE).delete(clave); t.oncomplete = ok; t.onerror = () => err(t.error); });
  } catch (e) { /* nada */ }
}

function haceCuanto(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return "hace " + m + " min";
  const h = Math.round(m / 60);
  if (h < 48) return "hace " + h + " h";
  return "hace " + Math.round(h / 24) + " días";
}

function actualizarBanner() {
  let b = document.getElementById("estadoConexion");
  if (!b) {
    b = document.createElement("div");
    b.id = "estadoConexion";
    b.style.cssText = "position:fixed; top:0; left:0; right:0; z-index:9999; padding:6px 10px; font-size:12px; font-weight:bold; text-align:center; color:white; display:none; cursor:pointer;";
    b.onclick = () => sincronizar();
    document.body.appendChild(b);
  }
  const sinRed = !navigator.onLine || usandoCopiaLocal;
  const mostrar = sinRed || pendientesCola > 0;
  b.style.display = mostrar ? "block" : "none";
  b.style.background = sinRed ? "#e67e22" : "#2563eb";
  document.body.style.paddingTop = mostrar ? "28px" : "";
  const br = document.getElementById("btnRespaldo"); if (br) br.style.display = pendientesCola > 0 ? "block" : "none";
  const partes = [];
  if (sinRed) partes.push("Sin conexión" + (ultimaSyncTs ? " · última conexión " + haceCuanto(ultimaSyncTs) : ""));
  if (pendientesCola > 0) partes.push(pendientesCola + " remisión(es) por enviar" + (sincronizando ? " · enviando…" : sinRed ? "" : " · toca para enviar") + (ultimoErrorSync ? " (" + ultimoErrorSync + ")" : ""));
  else if (sinRed) partes.push("mostrando datos guardados");
  b.textContent = partes.join(" · ");
}

window.addEventListener("online", () => { usandoCopiaLocal = false; actualizarBanner(); if (getSesion()) { cargarInventarioDesdeNube(); setTimeout(sincronizar, Math.random() * 3000); } });
window.addEventListener("offline", actualizarBanner);
window.addEventListener("DOMContentLoaded", async () => {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); // pide que el celular no borre estos datos
  ultimaSyncTs = (await idbLeer("ultimaSync")) || 0;
  await contarCola();
  setInterval(() => { if (pendientesCola > 0) sincronizar(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && pendientesCola > 0) sincronizar(); });
});



