/* ==========================================
   ESTADO GLOBAL Y CONFIGURACIÓN
   ================================---------- */
let productos = []; 
let factura = [];
let total = 0;
let numeroRemision = 1; 

const urlMaster = "https://script.google.com/macros/s/AKfycby9sTsRxIVXscPY-fOs4ynBNXGyLDis0pbFAZE3r9doFrjqeefTnEVvew5jzIvf-02t/exec";

function obtenerUrlAPI() {
    return localStorage.getItem("urlClienteAPI");
}

function formatoMoneda(valor) {
    return Number(valor).toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/* ==========================================
   INICIALIZACIÓN ÚNICA Y OPTIMIZADA
   ================================---------- */
window.addEventListener("DOMContentLoaded", async () => {
  const urlCliente = localStorage.getItem("urlClienteAPI");
  const sesionActiva = localStorage.getItem("sesionActiva");
  const nombreEmpleado = localStorage.getItem("empleado");

  // 1. Verificación de activación
  if (!urlCliente) {
    mostrarVista("activacionVista");
    return;
  }

  // 2. Verificación de sesión
  if (!sesionActiva) {
    mostrarVista("loginVista");
    verificarSiRequiereFirmaLogin();
    return;
  }

  // 3. Entorno de trabajo activo
  mostrarVista("catalogoVista");
  
  const elNombreEmpresa = document.getElementById("empresaNombre");
  if (elNombreEmpresa) {
    elNombreEmpresa.innerText = `Empresa de ${nombreEmpleado || "Trabajador"}`;
  }

  // 🚀 CARGA INSTANTÁNEA DESDE CACHÉ
  const productosCache = localStorage.getItem("cache_productos");
  if (productosCache) {
    try {
      productos = JSON.parse(productosCache);
      mostrarCatalogo(); 
    } catch (e) {
      console.error("Error al leer caché local", e);
    }
  }

  // Sincronización silenciosa con la nube de fondo
  await cargarInventarioDesdeNube();

  // --- CONFIGURACIÓN DE EVENTOS DEL DOM (Buscador y Botones) ---
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
                          <p>Stock: ${p.cantidad_actual} | $${formatoMoneda(p.precio)}</p>
                      </div>
                      <div class="accionesProducto">
                          <input type="number" class="cantidadProducto" value="1" min="1" max="${p.cantidad_actual}">
                          <button class="btnAgregar">Agregar</button>
                      </div>
                  `;

                  const cantidadInput = div.querySelector(".cantidadProducto");
                  div.querySelector(".btnAgregar").onclick = () => {
                      agregarProductoFactura(p, cantidadInput.value);
                      inputBusq.value = "";
                      resultados.innerHTML = "";
                  };

                  resultados.appendChild(div);
              }
          });
      });
  }

  const btnGuardarProd = document.getElementById("guardarProducto");
  if (btnGuardarProd) {
    btnGuardarProd.addEventListener("click", () => {
      alert("Para mantener el inventario sincronizado, agrega o edita los productos directamente en tu Google Sheet.");
    });
  }
});

/* ==========================================
   MÓDULO DE ACTIVACIÓN Y LOGIN
   ================================---------- */
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
    const respuesta = await fetch(`${urlMaster}?accion=activar&codigo=${codigo}&empleado=${encodeURIComponent(nombreEmpleado)}`, {
      redirect: 'follow'
    });
    
    const resultado = await respuesta.json();

    if (resultado.success) {
      localStorage.setItem("activado", "true");
      localStorage.setItem("urlClienteAPI", resultado.urlCliente); 
      localStorage.setItem("pinJefe", resultado.pinJefe);     
      localStorage.setItem("pinEmpleado", resultado.pinEmpleado); 
      
      alert("¡Activado correctamente!");
      mostrarVista("loginVista");
      verificarSiRequiereFirmaLogin();
    } else {
      alert("Error: " + resultado.message);
    }
  } catch (error) {
    console.error(error);
    alert("Error de conexión. Verifica tu internet o la URL Master.");
  }
}

async function login() {
  const pinIngresado = document.getElementById("pin").value.trim();
  const nombreInput = document.getElementById("nombreLogin")?.value.trim();

  const pinJefe = localStorage.getItem("pinJefe") || "9999";
  const pinEmpleado = localStorage.getItem("pinEmpleado") || "1234";
  
  const firmaGuardadaLocal = localStorage.getItem("firmaVendedorGuardada");
  let firmaBase64 = "";

  // Validamos si el sistema requiere la firma (primera vez)
  const contenedorSeccionFirma = document.getElementById("seccionFirmaUnica");
  const esVisibleFirma = contenedorSeccionFirma && contenedorSeccionFirma.style.display !== "none";

  if (esVisibleFirma && !firmaGuardadaLocal) {
    const canvasLoginElem = document.getElementById("canvasFirmaLogin");
    if (!canvasLoginElem) {
      alert("Error: No se encontró el cuadro de firma.");
      return;
    }
    
    firmaBase64 = canvasLoginElem.toDataURL("image/png");
    
    if (firmaBase64.length < 1500) {
      alert("Debes dibujar la firma del administrador/vendedor para continuar.");
      return;
    }
    
    procesarFirmaLoginExitoso(firmaBase64, firmaGuardadaLocal);
  } else {
    firmaBase64 = localStorage.getItem("firmaVendedorBase64") || "";
  }

  // Validar PINs
  if (pinIngresado === pinJefe) {
    localStorage.setItem("sesionActiva", "true");
    localStorage.setItem("rol", "jefe");
    localStorage.setItem("empleado", "Administrador");
    iniciarEntornoTrabajo();
  } else if (pinIngresado === pinEmpleado) {
    if (!nombreInput) {
      alert("Por favor ingresa tu nombre de empleado para continuar.");
      return;
    }
    localStorage.setItem("sesionActiva", "true");
    localStorage.setItem("rol", "empleado");
    localStorage.setItem("empleado", nombreInput);
    iniciarEntornoTrabajo();
  } else {
    alert("PIN incorrecto.");
  }
}

function procesarFirmaLoginExitoso(firmaBase64, firmaGuardadaLocal) {
  if (!firmaGuardadaLocal && firmaBase64) {
    localStorage.setItem("firmaVendedorGuardada", "true");
    localStorage.setItem("firmaVendedorBase64", firmaBase64); 
    
    const urlAPI = obtenerUrlAPI();
    const payload = {
      accion: "guardarFirmaCorporativa",
      firmaCorporativa: firmaBase64
    };

    fetch(urlAPI, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).catch(err => console.log("Sincronización de firma en segundo plano", err));
  }
}

function iniciarEntornoTrabajo() {
  mostrarVista("catalogoVista");
  cargarInventarioDesdeNube();
}

function cerrarSesion() {
  localStorage.removeItem("sesionActiva");
  mostrarVista("loginVista");
  verificarSiRequiereFirmaLogin(); 
}

/* ==========================================
   GESTIÓN DE VISTAS
   ================================---------- */
function mostrarVista(vistaId) {
    // Ocultar todas las vistas
    document.querySelectorAll('.vista').forEach(el => el.style.display = 'none');
    
    // Mostrar la vista seleccionada
    const vistaSeleccionada = document.getElementById(vistaId);
    if (vistaSeleccionada) {
        vistaSeleccionada.style.display = 'block';
    }

    // SI ABREN EL HISTORIAL, CARGAR LOS DATOS AUTOMÁTICAMENTE
    if (vistaId === 'historialVista') {
        verHistorial();
    }
}

/* ==========================================
   INVENTARIO Y NUBE (CON CACHÉ)
   ================================---------- */
async function cargarInventarioDesdeNube() {
    try {
        const urlAPI = obtenerUrlAPI();
        if (!urlAPI) return;

        const respuesta = await fetch(`${urlAPI}?accion=obtenerInventario`, { redirect: 'follow' });
        const resultado = await respuesta.json();
        
        if (resultado.success) {
            productos = resultado.productos;
            localStorage.setItem("cache_productos", JSON.stringify(productos));
            mostrarCatalogo();
        }
    } catch (e) {
        console.error("Error al cargar inventario de la nube", e);
    }
}

async function actualizarNumeroRemisionDesdeNube() {
    try {
        const urlAPI = obtenerUrlAPI();
        if (!urlAPI) return;
        const respuesta = await fetch(`${urlAPI}?accion=obtenerSiguienteRemision`, { redirect: 'follow' });
        const resultado = await respuesta.json();
        if (resultado.success) {
            numeroRemision = resultado.siguiente; 
            const elNum = document.getElementById("numeroRemision");
            if (elNum) elNum.innerText = resultado.siguienteFormateado; 
        }
    } catch (e) {
        console.error("Error al obtener el número de remisión", e);
    }
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
      <p>Stock: ${p.cantidad_actual}</p>
      <p class="precio">$${formatoMoneda(p.precio)}</p>
    `;
    contenedor.appendChild(div);
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

    const imgEntrego = document.getElementById("imgFirmaVendedor");
    if (imgEntrego) {
        const firmaNube = await obtenerFirmaDesdeNube(); 
        
        if (firmaNube && firmaNube.length > 50) {
            imgEntrego.src = firmaNube;
            imgEntrego.style.display = "block"; // Muestra la firma corporativa cargada desde J2
            console.log("Firma corporativa aplicada correctamente en pantalla.");
        } else {
            console.warn("La firma de la nube llegó vacía o incompleta.");
            imgEntrego.style.display = "none"; 
        }
    }
}

/* ==========================================
   HISTORIAL DE VENTAS (CORREGIDO Y UNIFICADO)
   ================================---------- */
function verHistorial() {
    mostrarVista('historialVista');
    
    const urlAPI = obtenerUrlAPI();
    if (!urlAPI) {
        alert("No se encontró la URL de la API.");
        return;
    }
    
    fetch(urlAPI + "?accion=obtenerHistorial")
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.historial) return;
            
            let historial = data.historial;
            let contenedor = document.getElementById("listaHistorial");
            let spanTotalDia = document.getElementById("totalDia");
            
            if (!contenedor) return;

            let remisionesAgrupadas = {};
            let totalGeneralDia = 0;

            historial.forEach(item => {
                // Validación para evitar que filas sin número rompan el historial
                let numRem = item.numRemisionStr || item.numRemision;
                let key = (numRem !== undefined && numRem !== null && String(numRem).trim() !== "") ? String(numRem) : "S/N";
                
                if (!remisionesAgrupadas[key]) {
                    remisionesAgrupadas[key] = {
                        numRemisionStr: key,
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

                html += `
                    <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                            <strong style="color: #2563eb; font-size: 16px;">Remisión #${rem.numRemisionStr}</strong>
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
                                    ${rem.items.map(i => `
                                        <tr>
                                            <td style="padding: 4px 0;">${i.producto}</td>
                                            <td style="padding: 4px 0;">${i.cantidad}</td>
                                            <td style="padding: 4px 0; text-align: right;">$${formatoMoneda(i.subtotal)}</td>
                                        </tr>
                                    `).join("")}
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

    // 1. Colocar automáticamente la firma del vendedor/propietario (Login) en "Entregó"
    const firmaVendedorBase64 = localStorage.getItem("firmaVendedorBase64"); 
    if (firmaVendedorBase64) {
        doc.addImage(firmaVendedorBase64, 'PNG', 18, startY - 22, 50, 20);
    }

    // 2. Colocar la firma del cliente en "Recibió" (si se desea)
    const canvasFirma = document.getElementById("firmaCanvas");
    if (canvasFirma) {
        const firmaClienteData = canvasFirma.toDataURL("image/png");
        if (firmaClienteData.length > 1500) {
            doc.addImage(firmaClienteData, 'PNG', 114, startY - 22, 50, 20);
        }
    }

    return { doc, nombreArchivo, numeroFormateado };
}

function generarPDF() {
    if (factura.length === 0) {
        alert("No hay productos en la remisión.");
        return;
    }
    const { doc, nombreArchivo } = prepararDocumentoPDF();
    doc.save(nombreArchivo);
    guardarVentaEnNube();
}

async function compartirPDF() {
    if (factura.length === 0) {
        alert("No hay productos en la remisión.");
        return;
    }
    const { doc, nombreArchivo, numeroFormateado } = prepararDocumentoPDF();
    const pdfBlob = doc.output("blob");
    const file = new File([pdfBlob], nombreArchivo, { type: "application/pdf" });

    try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: "Remisión",
                text: `Remisión No. ${numeroFormateado}`,
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

function guardarVentaEnNube() {
  if (factura.length === 0) {
    alert("La factura está vacía.");
    return;
  }

  const empleadoActual = localStorage.getItem("empleado") || "Empleado";
  const urlAPI = obtenerUrlAPI();
  if (!urlAPI) return;

  const itemsMinimos = factura.map(item => ({
    codigo_interno: item.codigo_interno || item.nombre,
    cantidad: item.cantidad
  }));

  const nombreCliente = document.getElementById("clienteNombre") ? document.getElementById("clienteNombre").value.trim() : "";
  const telCliente = document.getElementById("clienteTelefono") ? document.getElementById("clienteTelefono").value.trim() : "";
  const dirCliente = document.getElementById("clienteDireccion") ? document.getElementById("clienteDireccion").value.trim() : "";
  const estadoPagoSeleccionado = document.getElementById("selectEstadoPago") ? document.getElementById("selectEstadoPago").value : "Pagado";

  let firmaBase64 = "";
  const canvasFirma = document.getElementById("firmaCanvas");
  if (canvasFirma) {
    firmaBase64 = canvasFirma.toDataURL("image/png");
  }

  const payload = {
    accion: "registrarRemisionMasiva",
    items: itemsMinimos,
    empleado: empleadoActual,
    numRemision: numeroRemision,
    cliente: nombreCliente || "Mostrador / Genérico",
    telefono: telCliente,
    direccion: dirCliente,
    estadoPago: estadoPagoSeleccionado,
    firma: firmaBase64 
  };

  factura = [];
  actualizarFactura();
  
  if (document.getElementById("clienteNombre")) document.getElementById("clienteNombre").value = "";
  if (document.getElementById("clienteTelefono")) document.getElementById("clienteTelefono").value = "";
  if (document.getElementById("clienteDireccion")) document.getElementById("clienteDireccion").value = "";
  
  limpiarFirma();
  
  numeroRemision++;
  const formatoNum = String(numeroRemision).padStart(4, '0');
  if (document.getElementById("numRemisionTexto")) document.getElementById("numRemisionTexto").innerText = formatoNum;
  if (document.getElementById("numeroRemision")) document.getElementById("numeroRemision").innerText = formatoNum;

  fetch(urlAPI, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.log("Sincronización en segundo plano con la nube", err);
  });

  setTimeout(() => {
    cargarInventarioDesdeNube();
  }, 1500);
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

function verificarSiRequiereFirmaLogin() {
  const firmaGuardada = localStorage.getItem("firmaVendedorGuardada");
  const contenedorSeccionFirma = document.getElementById("seccionFirmaUnica");

  if (!firmaGuardada) {
    if (contenedorSeccionFirma) contenedorSeccionFirma.style.display = "block";
    inicializarCanvasLogin();
  } else {
    if (contenedorSeccionFirma) contenedorSeccionFirma.style.display = "none";
  }
}

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

async function obtenerFirmaDesdeNube() {
  const urlAPI = obtenerUrlAPI();
  if (!urlAPI) {
    console.warn("No hay URL de API configurada.");
    return "";
  }
  
  try {
    // Añadimos un parámetro de tiempo para evitar que el navegador guarde en caché un resultado viejo
    const respuesta = await fetch(`${urlAPI}?accion=obtenerFirmaCorporativa&t=${Date.now()}`, { 
      method: 'GET',
      redirect: 'follow' 
    });
    
    const resultado = await respuesta.json();
    console.log("Datos recibidos de Apps Script:", resultado); // MIRA ESTO EN LA CONSOLA SI PUEDES

    // Verificamos si vino en 'urlFirma' o directamente en alguna otra propiedad
    let base64Firma = resultado.urlFirma || resultado.firma || "";

    if (base64Firma) {
      base64Firma = base64Firma.trim();
      // Si la celda ya tiene el formato data:image, lo retornamos directo
      if (base64Firma.startsWith("data:image")) {
        return base64Firma;
      } else {
        // Si por alguna razón solo se guardó el código plano sin el prefijo, se lo agregamos
        return "data:image/png;base64," + base64Firma;
      }
    }
  } catch (e) {
    console.error("Error al intentar obtener la firma corporativa:", e);
  }
  return "";
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

    // Actualizar el total con el ID correcto de tu HTML (<span id="total">)
    const totalEl = document.getElementById("total");
    if (totalEl) {
        totalEl.innerText = formatoMoneda(total);
    }
}

function eliminarItemFactura(index) {
    factura.splice(index, 1);
    actualizarFactura();
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

    // Generar el PDF y manejarlo para móviles o escritorio
    html2pdf().from(elemento).set(opciones).outputPdf('blob').then(async (pdfBlob) => {
        const file = new File([pdfBlob], "Historial_Ventas.pdf", { type: "application/pdf" });

        // Si estamos en un celular compatible con compartir archivos, usamos el menú nativo
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

        // Si es PC o no abrió el menú de compartir, disparamos la descarga tradicional
        html2pdf().from(elemento).set(opciones).save();
    }).catch(err => {
        console.error("Error al generar el PDF del historial:", err);
        alert("No se pudo generar el archivo PDF. Inténtalo de nuevo.");
    });
}


