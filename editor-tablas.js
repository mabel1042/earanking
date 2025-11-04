// editor-tablas.js - Versión corregida

// 🔹 Importar funciones de Firestore
import { collection, doc, setDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// 🔹 Variables globales para el editor
let esAdmin = false;
let db = null;

// 🔹 Inicializar editor cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log("🔧 Inicializando editor de tablas...");
    inicializarEditorTablas();
});

function inicializarEditorTablas() {
    // Esperar a que Firebase se inicialice en script.js
    let intentos = 0;
    const maxIntentos = 5;
    const backoff = () => Math.min(1000 * Math.pow(2, intentos), 10000);
    function intentarInit() {
        esAdmin = sessionStorage.getItem('admin') === 'true';
        if (window.db) {
            db = window.db;
            console.log("🔧 Usando instancia de Firestore desde script.js");
            console.log("🔧 Estado admin en editor:", esAdmin);
            actualizarBotonesEdicion();
            agregarEventListenersEdicion();
            cargarDatosTablas();
        } else if (intentos < maxIntentos) {
            intentos++;
            setTimeout(intentarInit, backoff());
        } else {
            console.error("❌ No se encontró la instancia de Firestore después de varios intentos.");
        }
    }
    intentarInit();
}

// 🔹 Agregar event listeners para botones editar
function agregarEventListenersEdicion() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-editar-tabla')) {
            const tablaId = e.target.dataset.tabla;
            console.log("🖱️ Click en editar tabla:", tablaId);
            activarEdicionTabla(tablaId);
        }
    });
}

/* FUNCIONES EDITOR EXCEL */
// 🔹 Mostrar/ocultar botones editar para admin
function actualizarBotonesEdicion() {
    const botonesEditar = document.querySelectorAll('.btn-editar-tabla');
    console.log(`🔧 Encontrados ${botonesEditar.length} botones de edición`);
    
    botonesEditar.forEach(btn => {
        const mostrar = esAdmin ? 'block' : 'none';
        btn.style.display = mostrar;
        console.log(`🔧 Botón ${btn.dataset.tabla}: ${mostrar}`);
    });
}

// 🔹 Activar modo edición
function activarEdicionTabla(tablaId) {
    if (!esAdmin) {
        alert("Solo los administradores pueden editar las tablas");
        return;
    }
    
    const tabla = document.getElementById(`tabla${tablaId.charAt(0).toUpperCase() + tablaId.slice(1)}`);
    if (!tabla) {
        console.error(`Tabla no encontrada: ${tablaId}`);
        return;
    }
    
    // Expandir el acordeón automáticamente
    const accordionContent = tabla.closest('.accordion-content');
    const accordionBtn = accordionContent?.previousElementSibling;
    if (accordionContent && accordionBtn) {
        accordionBtn.classList.add('active');
        accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        
        // Recalcular después de agregar controles
        setTimeout(() => {
            accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        }, 100);
    }
    
    // Quitar edición anterior si existe
    cancelarEdicion(tablaId);
    
    // Hacer solo las celdas del cuerpo editables (no los encabezados ni la columna de equipos)
    const celdasCuerpo = tabla.querySelectorAll('tbody td:not([data-no-editable])');
    celdasCuerpo.forEach(celda => {
        // Para goleadores y sancionados, agregar evento especial en columna de jugador
        if ((tablaId === 'goleadores' || tablaId === 'sancionados') && celda.cellIndex === 0) {
            celda.contentEditable = false; // No editable directamente
            celda.style.cursor = 'pointer';
            celda.addEventListener('click', () => mostrarModalSeleccionJugador(celda));
        } else {
            celda.contentEditable = true;
            celda.classList.add('editando');
        }
    });
    
    // Agregar botones de eliminar a cada fila si es tabla de horarios
    if (tablaId === 'horarios') {
        const filas = tabla.querySelectorAll('tbody tr');
        filas.forEach(fila => {
            // Solo agregar si no tiene ya el botón
            if (!fila.querySelector('.btn-eliminar-fila')) {
                const tdEliminar = document.createElement('td');
                tdEliminar.innerHTML = '<button onclick="eliminarFilaHorario(this)" class="btn-eliminar-fila" style="background:#dc3545;color:white;border:none;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;">🗑️</button>';
                tdEliminar.setAttribute('data-no-editable', 'true');
                fila.appendChild(tdEliminar);
            }
        });
    }
    
    // Agregar botones de eliminar para goleadores y sancionados
    if (tablaId === 'goleadores' || tablaId === 'sancionados') {
        const filas = tabla.querySelectorAll('tbody tr');
        filas.forEach(fila => {
            // Solo agregar si no tiene ya el botón
            if (!fila.querySelector('.btn-eliminar-fila')) {
                const tdEliminar = document.createElement('td');
                tdEliminar.innerHTML = '<button onclick="eliminarFilaGeneral(this)" class="btn-eliminar-fila" style="background:#dc3545;color:white;border:none;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;">🗑️</button>';
                tdEliminar.setAttribute('data-no-editable', 'true');
                fila.appendChild(tdEliminar);
            }
        });
    }
    
    // Agregar botones de control simplificados
    agregarControlesEdicion(tabla, tablaId);
    
    // Agregar event listeners para navegación tipo Excel
    agregarNavegacionExcel(tabla);
    
    console.log(`✅ Modo edición activado para: ${tablaId}`);
}

// 🔹 Agregar controles de edición SIMPLIFICADOS (solo guardar y cancelar)
function agregarControlesEdicion(tabla, tablaId) {
    const controles = document.createElement('div');
    controles.className = 'controles-edicion';
    
    controles.innerHTML = `
        <div class="controles-superiores">
            <p style="margin: 0; color: #666; font-style: italic;">
                Modo edición: Solo puedes modificar los datos numéricos de las celdas
            </p>
            ${tablaId === 'horarios' ? '<button type="button" onclick="agregarFilaHorario()" class="btn-control btn-agregar-fila">➕ Agregar Fila</button>' : ''}
            ${tablaId === 'goleadores' ? '<button type="button" onclick="agregarFilaGoleadores()" class="btn-control btn-agregar-fila">➕ Agregar Goleador</button>' : ''}
            ${tablaId === 'sancionados' ? '<button type="button" onclick="agregarFilaSancionados()" class="btn-control btn-agregar-fila">➕ Agregar Sancionado</button>' : ''}
        </div>
        <div class="controles-inferiores">
            <button type="button" onclick="guardarCambios('${tablaId}')" class="btn-control btn-guardar">
                💾 Guardar en Firebase
            </button>
            <button type="button" onclick="cancelarEdicion('${tablaId}')" class="btn-control btn-cancelar">
                ❌ Cancelar
            </button>
        </div>
    `;
    
    tabla.parentNode.insertBefore(controles, tabla);
}

// 🔹 FUNCIONES DE AGREGAR/ELIMINAR DESACTIVADAS (hacen nada)
function agregarFila(tablaId) {
    console.log(`ℹ️ Función desactivada: agregarFila para ${tablaId}`);
    // No hace nada - función desactivada
}

// 🔹 Función para agregar fila en tabla de horarios
function agregarFilaHorario() {
    const tabla = document.getElementById('tablaHorarios');
    if (!tabla) return;
    
    const tbody = tabla.querySelector('tbody');
    if (!tbody) return;
    
    const nuevaFila = document.createElement('tr');
    const numColumnas = tabla.querySelectorAll('thead th').length;
    
    for (let i = 0; i < numColumnas; i++) {
        const td = document.createElement('td');
        td.textContent = '';
        td.contentEditable = true;
        td.classList.add('editando');
        nuevaFila.appendChild(td);
    }
    
    // Agregar botón de eliminar fila
    const tdEliminar = document.createElement('td');
    tdEliminar.innerHTML = '<button onclick="eliminarFilaHorario(this)" class="btn-eliminar-fila" style="background:#dc3545;color:white;border:none;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;">🗑️</button>';
    tdEliminar.setAttribute('data-no-editable', 'true');
    nuevaFila.appendChild(tdEliminar);
    
    tbody.appendChild(nuevaFila);
    console.log('✅ Nueva fila agregada a horarios');
}

// 🔹 Función para eliminar fila en tabla de horarios
function eliminarFilaHorario(btn) {
    if (confirm('¿Estás seguro de eliminar esta fila?')) {
        const fila = btn.closest('tr');
        fila.remove();
        console.log('✅ Fila eliminada de horarios');
    }
}

// 🔹 Función para eliminar fila general (goleadores, sancionados)
function eliminarFilaGeneral(btn) {
    if (confirm('¿Estás seguro de eliminar esta fila?')) {
        const fila = btn.closest('tr');
        fila.remove();
        console.log('✅ Fila eliminada');
    }
}

// 🔹 Función para agregar fila en tabla de goleadores
function agregarFilaGoleadores() {
    const tabla = document.getElementById('tablaGoleadores');
    if (!tabla) return;
    
    const tbody = tabla.querySelector('tbody');
    if (!tbody) return;
    
    const nuevaFila = document.createElement('tr');
    
    // Columna Jugador (con selector)
    const tdJugador = document.createElement('td');
    tdJugador.textContent = 'Haz clic para seleccionar';
    tdJugador.style.cursor = 'pointer';
    tdJugador.style.color = '#999';
    tdJugador.addEventListener('click', () => mostrarModalSeleccionJugador(tdJugador));
    nuevaFila.appendChild(tdJugador);
    
    // Columna Equipo (se llenará automáticamente)
    const tdEquipo = document.createElement('td');
    tdEquipo.textContent = '';
    tdEquipo.contentEditable = false;
    nuevaFila.appendChild(tdEquipo);
    
    // Columna Goles (editable)
    const tdGoles = document.createElement('td');
    tdGoles.textContent = '0';
    tdGoles.contentEditable = true;
    tdGoles.classList.add('editando');
    nuevaFila.appendChild(tdGoles);
    
    // Botón eliminar
    const tdEliminar = document.createElement('td');
    tdEliminar.innerHTML = '<button onclick="eliminarFilaGeneral(this)" class="btn-eliminar-fila" style="background:#dc3545;color:white;border:none;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;">🗑️</button>';
    tdEliminar.setAttribute('data-no-editable', 'true');
    nuevaFila.appendChild(tdEliminar);
    
    tbody.appendChild(nuevaFila);
    console.log('✅ Nueva fila agregada a goleadores');
}

// 🔹 Función para agregar fila en tabla de sancionados
function agregarFilaSancionados() {
    const tabla = document.getElementById('tablaSancionados');
    if (!tabla) return;
    
    const tbody = tabla.querySelector('tbody');
    if (!tbody) return;
    
    const nuevaFila = document.createElement('tr');
    
    // Columna Jugador (con selector)
    const tdJugador = document.createElement('td');
    tdJugador.textContent = 'Haz clic para seleccionar';
    tdJugador.style.cursor = 'pointer';
    tdJugador.style.color = '#999';
    tdJugador.addEventListener('click', () => mostrarModalSeleccionJugador(tdJugador));
    nuevaFila.appendChild(tdJugador);
    
    // Columna Equipo (se llenará automáticamente)
    const tdEquipo = document.createElement('td');
    tdEquipo.textContent = '';
    tdEquipo.contentEditable = false;
    nuevaFila.appendChild(tdEquipo);
    
    // Columna Motivo (editable)
    const tdMotivo = document.createElement('td');
    tdMotivo.textContent = '';
    tdMotivo.contentEditable = true;
    tdMotivo.classList.add('editando');
    nuevaFila.appendChild(tdMotivo);
    
    // Botón eliminar
    const tdEliminar = document.createElement('td');
    tdEliminar.innerHTML = '<button onclick="eliminarFilaGeneral(this)" class="btn-eliminar-fila" style="background:#dc3545;color:white;border:none;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;">🗑️</button>';
    tdEliminar.setAttribute('data-no-editable', 'true');
    nuevaFila.appendChild(tdEliminar);
    
    tbody.appendChild(nuevaFila);
    console.log('✅ Nueva fila agregada a sancionados');
}

function agregarColumna(tablaId) {
    console.log(`ℹ️ Función desactivada: agregarColumna para ${tablaId}`);
    // No hace nada - función desactivada
}

function eliminarFila(tablaId) {
    console.log(`ℹ️ Función desactivada: eliminarFila para ${tablaId}`);
    // No hace nada - función desactivada
}

function eliminarColumna(tablaId) {
    console.log(`ℹ️ Función desactivada: eliminarColumna para ${tablaId}`);
    // No hace nada - función desactivada
}

// 🔹 GUARDAR EN FIREBASE - FUNCIÓN MEJORADA
async function guardarCambios(tablaId) {
    if (!db) {
        alert("Error: Base de datos no inicializada");
        return;
    }
    
    const tabla = document.getElementById(`tabla${tablaId.charAt(0).toUpperCase() + tablaId.slice(1)}`);
    const datos = obtenerDatosTabla(tabla);
    
    try {
        // Guardar en Firebase
        const docRef = doc(collection(db, "tablasTorneo"), tablaId);
        await setDoc(docRef, {
            tablaId: tablaId,
            encabezados: datos.encabezados,
            filas: datos.filas,
            ultimaActualizacion: new Date()
        });
        
        console.log(`💾 Datos guardados en Firebase para ${tablaId}:`, datos);
        alert(`✅ Cambios en ${tablaId} guardados correctamente en Firebase`);
        cancelarEdicion(tablaId);
        
        // Si se guardaron horarios, recargar tabla de resultados
        if (tablaId === 'horarios') {
            await cargarDatosTabla('resultados');
        }
        
    } catch (error) {
        console.error("❌ Error al guardar en Firebase:", error);
        alert("❌ Error al guardar los datos en Firebase");
    }
}

function obtenerDatosTabla(tabla) {
    const datos = {
        encabezados: [],
        filas: []
    };
    
    // Obtener encabezados
    const ths = tabla.querySelectorAll('thead th');
    datos.encabezados = Array.from(ths).map(th => th.textContent);
    
    // Obtener filas
    const filas = tabla.querySelectorAll('tbody tr');
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('td'); // CAMBIO: Obtener TODAS las celdas
        const filaObj = {};
        celdas.forEach((td, idx) => {
            const key = datos.encabezados[idx] || `col${idx+1}`;
            // Si la celda contiene una imagen (columna de equipos o jugador con foto)
            if (td.querySelector('img')) {
                const img = td.querySelector('img');
                const span = td.querySelector('span');
                const texto = span ? span.textContent : td.textContent.trim().replace(/\s+/g, ' ');
                
                // Guardar tanto el texto como la URL de la foto (convertir a ruta relativa)
                let rutaImagen = img.src;
                // Convertir URL absoluta a relativa
                if (rutaImagen.includes('CampeonatoElectronicaimg/')) {
                    rutaImagen = 'CampeonatoElectronicaimg/' + rutaImagen.split('CampeonatoElectronicaimg/')[1];
                }
                
                filaObj[key] = texto;
                filaObj[key + '_foto'] = rutaImagen;
            } else {
                filaObj[key] = td.textContent.trim();
            }
        });
        datos.filas.push(filaObj);
    });
    
    return datos;
}

// 🔹 CARGAR DATOS DESDE FIREBASE
async function cargarDatosTablas() {
    if (!db) {
        console.log("⏳ Base de datos no lista, reintentando...");
        setTimeout(cargarDatosTablas, 1000);
        return;
    }
    
    const tablas = ['posiciones', 'horarios', 'resultados', 'goleadores', 'sancionados'];
    
    for (const tablaId of tablas) {
        await cargarDatosTabla(tablaId);
    }
}

async function cargarDatosTabla(tablaId) {
    try {
        if (tablaId === 'posiciones') {
            // Para la tabla de posiciones, generar filas desde equipos
            await cargarTablaPosicionesDesdeEquipos();
        } else if (tablaId === 'resultados') {
            // Para la tabla de resultados, generar desde horarios
            await cargarTablaResultadosDesdeHorarios();
        } else {
            // Para otras tablas, cargar desde tablasTorneo
            const docRef = doc(collection(db, "tablasTorneo"), tablaId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const datos = docSnap.data();
                poblarTablaConDatos(tablaId, datos);
                console.log(`✅ Datos cargados para ${tablaId}`);
            } else {
                console.log(`ℹ️ No hay datos guardados para ${tablaId}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error cargando datos para ${tablaId}:`, error);
    }
}

async function poblarTablaConDatos(tablaId, datos) {
    const tabla = document.getElementById(`tabla${tablaId.charAt(0).toUpperCase() + tablaId.slice(1)}`);
    if (!tabla) return;
    const thead = tabla.querySelector('thead');
    const tbody = tabla.querySelector('tbody');
    // Poblar encabezados SOLO si existen en los datos
    if (thead && Array.isArray(datos.encabezados) && datos.encabezados.length > 0) {
        const filaEncabezado = thead.querySelector('tr');
        filaEncabezado.innerHTML = '';
        datos.encabezados.forEach(encabezado => {
            const th = document.createElement('th');
            th.textContent = encabezado;
            filaEncabezado.appendChild(th);
        });
    }
    // Poblar filas
    if (tbody && Array.isArray(datos.filas) && datos.filas.length > 0) {
        tbody.innerHTML = '';
        let logosEquipos = {};
        if (tablaId === 'posiciones' && window.db) {
            try {
                // Obtener logos reales de la colección 'equipos'
                const equiposSnap = await getDocs(collection(window.db, 'equipos'));
                equiposSnap.forEach(doc => {
                    const data = doc.data();
                    const keyNorm = normalizarNombreEquipo(data.nombre);
                    logosEquipos[keyNorm] = data.logo || 'CampeonatoElectronicaimg/feups2.png';
                });
            } catch (error) {
                console.error("❌ Error cargando logos:", error);
            }
        }
        let filasOrdenadas = datos.filas;
        if (tablaId === 'posiciones' && Array.isArray(datos.encabezados)) {
            // Ordenar por GP descendente
            const idxGP = datos.encabezados.findIndex(e => e.toLowerCase() === 'gp');
            if (idxGP !== -1) {
                filasOrdenadas = [...datos.filas].sort((a, b) => {
                    const gpA = Number(a['GP'] || a['gp'] || a[datos.encabezados[idxGP]] || 0);
                    const gpB = Number(b['GP'] || b['gp'] || b[datos.encabezados[idxGP]] || 0);
                    return gpB - gpA;
                });
            }
        }
        for (let i = 0; i < filasOrdenadas.length; i++) {
            const filaObj = filasOrdenadas[i];
            const fila = document.createElement('tr');
            (Array.isArray(datos.encabezados) && datos.encabezados.length > 0 ? datos.encabezados : Array.from(thead.querySelectorAll('th')).map(th => th.textContent)).forEach((key, idx) => {
                const td = document.createElement('td');
                // Si es la primera columna (numeración)
                if (tablaId === 'posiciones' && idx === 0) {
                    td.textContent = (i + 1).toString();
                } else if (tablaId === 'posiciones' && (key.toLowerCase() === 'equipo' || key.toLowerCase() === 'nombre')) {
                    // Buscar logo y nombre desde la colección 'equipos'
                    const nombreEquipo = filaObj[key] || '';
                    const keyNorm = normalizarNombreEquipo(nombreEquipo);
                    const logoUrl = logosEquipos[keyNorm] || 'CampeonatoElectronicaimg/feups2.png';
                    td.innerHTML = `<img src="${logoUrl}" alt="Logo" class="logo-tabla" style="width:30px; height:30px; object-fit:cover; margin-right:5px;"> <span>${nombreEquipo}</span>`;
                } else if ((tablaId === 'goleadores' || tablaId === 'sancionados') && key.toLowerCase() === 'jugador') {
                    // Mostrar jugador con foto si existe
                    const nombreJugador = filaObj[key] || '';
                    const fotoJugador = filaObj[key + '_foto'] || 'CampeonatoElectronicaimg/feups2.png';
                    td.innerHTML = `<img src="${fotoJugador}" alt="Foto" style="width:30px; height:30px; object-fit:cover; border-radius:50%; margin-right:5px; vertical-align:middle;"> <span style="color:white;">${nombreJugador}</span>`;
                } else {
                    td.textContent = filaObj[key] || '';
                }
                fila.appendChild(td);
            });
            tbody.appendChild(fila);
        }
    }
}

function cancelarEdicion(tablaId) {
    const tabla = document.getElementById(`tabla${tablaId.charAt(0).toUpperCase() + tablaId.slice(1)}`);
    if (!tabla) return;
    
    // Quitar edición
    const celdas = tabla.querySelectorAll('td, th');
    celdas.forEach(celda => {
        celda.contentEditable = false;
        celda.classList.remove('editando');
    });
    
    // Remover botones de eliminar si es tabla de horarios
    if (tablaId === 'horarios') {
        const botonesEliminar = tabla.querySelectorAll('.btn-eliminar-fila');
        botonesEliminar.forEach(btn => {
            const td = btn.closest('td');
            if (td) td.remove();
        });
        
        // Recargar tabla de resultados después de cancelar edición de horarios
        cargarDatosTabla('resultados');
    }
    
    // Remover botones de eliminar si es tabla de goleadores o sancionados
    if (tablaId === 'goleadores' || tablaId === 'sancionados') {
        const botonesEliminar = tabla.querySelectorAll('.btn-eliminar-fila');
        botonesEliminar.forEach(btn => {
            const td = btn.closest('td');
            if (td) td.remove();
        });
    }
    
    // Remover controles
    const controles = tabla.parentNode.querySelector('.controles-edicion');
    if (controles) controles.remove();
    
    // Remover event listeners
    tabla.removeEventListener('keydown', manejarTecladoExcel);
    
    console.log(`❌ Edición cancelada para: ${tablaId}`);
}

// 🔹 Navegación tipo Excel (mantener igual)
function agregarNavegacionExcel(tabla) {
    tabla.addEventListener('keydown', manejarTecladoExcel);
}

function manejarTecladoExcel(e) {
    const celda = e.target;
    if (!celda.matches('td, th') || !celda.classList.contains('editando')) return;
    
    const tabla = celda.closest('table');
    const filas = Array.from(tabla.querySelectorAll('tr'));
    const filaIndex = filas.indexOf(celda.parentElement);
    const celdasFila = Array.from(celda.parentElement.cells);
    const celdaIndex = celdasFila.indexOf(celda);
    
    let siguienteCelda = null;
    
    switch(e.key) {
        case 'Enter':
            e.preventDefault();
            siguienteCelda = obtenerCelda(filas, filaIndex + 1, celdaIndex);
            break;
        case 'Tab':
            if (!e.shiftKey) {
                e.preventDefault();
                siguienteCelda = obtenerCelda(filas, filaIndex, celdaIndex + 1);
            } else {
                e.preventDefault();
                siguienteCelda = obtenerCelda(filas, filaIndex, celdaIndex - 1);
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            siguienteCelda = obtenerCelda(filas, filaIndex + 1, celdaIndex);
            break;
        case 'ArrowUp':
            e.preventDefault();
            siguienteCelda = obtenerCelda(filas, filaIndex - 1, celdaIndex);
            break;
        case 'ArrowRight':
            e.preventDefault();
            siguienteCelda = obtenerCelda(filas, filaIndex, celdaIndex + 1);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            siguienteCelda = obtenerCelda(filas, filaIndex, celdaIndex - 1);
            break;
    }
    
    if (siguienteCelda) {
        siguienteCelda.focus();
        // Seleccionar todo el texto para fácil edición
        const rango = document.createRange();
        rango.selectNodeContents(siguienteCelda);
        const seleccion = window.getSelection();
        seleccion.removeAllRanges();
        seleccion.addRange(rango);
    }
}

function obtenerCelda(filas, filaIndex, celdaIndex) {
    if (filaIndex >= 0 && filaIndex < filas.length) {
        const celdas = filas[filaIndex].cells;
        if (celdaIndex >= 0 && celdaIndex < celdas.length) {
            return celdas[celdaIndex];
        }
    }
    return null;
}

// 🔹 Función para forzar actualización de botones
function forzarActualizacionBotones() {
    esAdmin = sessionStorage.getItem('admin') === 'true';
    console.log("🔄 Forzando actualización de botones, admin:", esAdmin);
    actualizarBotonesEdicion();
}

// 🔹 Normalizar nombre de equipo (quitar espacios, pasar a minúsculas)
function normalizarNombreEquipo(nombre) {
    return (nombre || '').toLowerCase().replace(/\s+/g, '');
}

// 🔹 Cargar tabla de posiciones desde equipos de Firebase
async function cargarTablaPosicionesDesdeEquipos() {
    const tabla = document.getElementById('tablaPosiciones');
    if (!tabla) return;
    
    const tbody = tabla.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    try {
        // Obtener equipos de Firebase
        const equiposSnap = await getDocs(collection(db, 'equipos'));
        let equipos = [];
        
        equiposSnap.forEach(doc => {
            const data = doc.data();
            equipos.push({
                nombre: data.nombre,
                logo: data.logo || 'CampeonatoElectronicaimg/feups2.png'
            });
        });
        
        // Intentar obtener datos guardados de posiciones
        const docRef = doc(collection(db, "tablasTorneo"), 'posiciones');
        const docSnap = await getDoc(docRef);
        let datosGuardados = {};
        
        if (docSnap.exists()) {
            const datos = docSnap.data();
            // Crear un mapa de equipos con sus datos
            if (Array.isArray(datos.filas)) {
                console.log('📊 Datos guardados de posiciones:', datos.filas);
                datos.filas.forEach(fila => {
                    const nombreEquipo = fila['Equipo'] || fila['equipo'] || '';
                    const keyNormalizada = normalizarNombreEquipo(nombreEquipo);
                    console.log(`🔑 Guardando datos para: "${nombreEquipo}" → clave: "${keyNormalizada}"`, fila);
                    datosGuardados[keyNormalizada] = fila;
                });
            }
        }
        
        console.log('📦 Mapa de datos guardados:', datosGuardados);
        
        // Ordenar equipos por PG (Partidos Ganados) si existe
        equipos.sort((a, b) => {
            const keyA = normalizarNombreEquipo(a.nombre);
            const keyB = normalizarNombreEquipo(b.nombre);
            const pgA = Number(datosGuardados[keyA]?.['PG'] || datosGuardados[keyA]?.['pg'] || 0);
            const pgB = Number(datosGuardados[keyB]?.['PG'] || datosGuardados[keyB]?.['pg'] || 0);
            return pgB - pgA;
        });
        
        // Generar filas para cada equipo
        equipos.forEach((equipo, i) => {
            const fila = document.createElement('tr');
            const keyNorm = normalizarNombreEquipo(equipo.nombre);
            const datosEquipo = datosGuardados[keyNorm] || {};
            
            console.log(`🏆 Cargando equipo: "${equipo.nombre}" → clave: "${keyNorm}"`, datosEquipo);
            
            // Columna # (no editable)
            const tdNum = document.createElement('td');
            tdNum.textContent = (i + 1).toString();
            tdNum.setAttribute('data-no-editable', 'true');
            fila.appendChild(tdNum);
            
            // Columna Equipo (no editable)
            const tdEquipo = document.createElement('td');
            tdEquipo.innerHTML = `<img src="${equipo.logo}" alt="Logo" class="logo-tabla" style="width:30px; height:30px; object-fit:cover; margin-right:5px;"> <span>${equipo.nombre}</span>`;
            tdEquipo.setAttribute('data-no-editable', 'true');
            fila.appendChild(tdEquipo);
            
            // Columnas editables: PJ, PG, PE, PP, GF, GC, Puntos, GD
            const columnas = ['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'Puntos', 'GD'];
            columnas.forEach(col => {
                const td = document.createElement('td');
                td.textContent = datosEquipo[col] || datosEquipo[col.toLowerCase()] || '0';
                fila.appendChild(td);
            });
            
            tbody.appendChild(fila);
        });
        
        console.log(`✅ Tabla de posiciones cargada con ${equipos.length} equipos`);
        
    } catch (error) {
        console.error("❌ Error cargando tabla de posiciones desde equipos:", error);
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red;">Error al cargar la tabla</td></tr>';
    }
}

// 🔹 Cargar tabla de resultados desde horarios
async function cargarTablaResultadosDesdeHorarios() {
    const tabla = document.getElementById('tablaResultados');
    if (!tabla) return;
    
    const tbody = tabla.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    try {
        // Obtener horarios guardados
        const docRefHorarios = doc(collection(db, "tablasTorneo"), 'horarios');
        const docSnapHorarios = await getDoc(docRefHorarios);
        
        if (!docSnapHorarios.exists() || !Array.isArray(docSnapHorarios.data().filas) || docSnapHorarios.data().filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">No hay partidos programados</td></tr>';
            return;
        }
        
        const horariosFilas = docSnapHorarios.data().filas;
        
        // Obtener resultados guardados si existen
        const docRefResultados = doc(collection(db, "tablasTorneo"), 'resultados');
        const docSnapResultados = await getDoc(docRefResultados);
        let resultadosGuardados = {};
        
        if (docSnapResultados.exists() && Array.isArray(docSnapResultados.data().filas)) {
            docSnapResultados.data().filas.forEach(fila => {
                const partido = fila['Partido'] || fila['partido'] || '';
                resultadosGuardados[partido] = fila['Resultado'] || fila['resultado'] || '';
            });
        }
        
        // Generar filas de resultados basados en horarios
        horariosFilas.forEach(horario => {
            const fila = document.createElement('tr');
            
            // Columna Partido (no editable) - tomar del horario
            const tdPartido = document.createElement('td');
            const nombrePartido = horario['Partido'] || horario['partido'] || '';
            tdPartido.textContent = nombrePartido;
            tdPartido.setAttribute('data-no-editable', 'true');
            fila.appendChild(tdPartido);
            
            // Columna Resultado (editable)
            const tdResultado = document.createElement('td');
            tdResultado.textContent = resultadosGuardados[nombrePartido] || '';
            fila.appendChild(tdResultado);
            
            tbody.appendChild(fila);
        });
        
        console.log(`✅ Tabla de resultados cargada con ${horariosFilas.length} partidos`);
        
    } catch (error) {
        console.error("❌ Error cargando tabla de resultados desde horarios:", error);
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:red;">Error al cargar la tabla</td></tr>';
    }
}

// 🔹 Exportar funciones globales
window.activarEdicionTabla = activarEdicionTabla;
window.agregarFila = agregarFila;
window.agregarFilaHorario = agregarFilaHorario;
window.agregarFilaGoleadores = agregarFilaGoleadores;
window.agregarFilaSancionados = agregarFilaSancionados;
window.eliminarFilaHorario = eliminarFilaHorario;
window.eliminarFilaGeneral = eliminarFilaGeneral;
window.agregarColumna = agregarColumna;
window.eliminarFila = eliminarFila;
window.eliminarColumna = eliminarColumna;
window.guardarCambios = guardarCambios;
window.cancelarEdicion = cancelarEdicion;
window.forzarActualizacionBotones = forzarActualizacionBotones;

// 🔹 Modal para seleccionar jugador
let celdaActual = null;

async function mostrarModalSeleccionJugador(celda) {
    celdaActual = celda;
    
    // Crear modal si no existe
    let modal = document.getElementById('modalSeleccionJugador');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalSeleccionJugador';
        modal.className = 'modal-bg';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h2 style="color: var(--primary-color); margin-bottom: 1rem;">Seleccionar Jugador</h2>
                <div id="listaJugadoresModal" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <p style="text-align: center; color: #666;">Cargando jugadores...</p>
                </div>
                <button onclick="cerrarModalJugador()" class="btn-close" style="margin-top: 1rem;">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModalJugador();
        });
    }
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Cargar jugadores
    await cargarJugadoresEnModal();
}

async function cargarJugadoresEnModal() {
    const listaContainer = document.getElementById('listaJugadoresModal');
    if (!listaContainer) return;
    
    listaContainer.innerHTML = '<p style="text-align: center; color: #666;">Cargando jugadores...</p>';
    
    try {
        // Obtener todos los equipos
        const equiposSnap = await getDocs(collection(db, 'equipos'));
        let equipos = {};
        equiposSnap.forEach(doc => {
            const data = doc.data();
            equipos[doc.id] = {
                nombre: data.nombre,
                logo: data.logo || 'CampeonatoElectronicaimg/feups2.png'
            };
        });
        
        // Obtener todos los jugadores
        const jugadoresSnap = await getDocs(collection(db, 'jugadores'));
        
        if (jugadoresSnap.empty) {
            listaContainer.innerHTML = '<p style="text-align: center; color: #666;">No hay jugadores registrados</p>';
            return;
        }
        
        listaContainer.innerHTML = '';
        
        jugadoresSnap.forEach(doc => {
            const jugador = doc.data();
            const equipo = equipos[jugador.equipoId] || { nombre: 'Sin equipo', logo: 'CampeonatoElectronicaimg/feups2.png' };
            
            const jugadorCard = document.createElement('div');
            jugadorCard.className = 'jugador-card-modal';
            jugadorCard.style.cssText = `
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
            `;
            
            jugadorCard.innerHTML = `
                <img src="${jugador.foto || 'CampeonatoElectronicaimg/feups2.png'}" alt="Foto" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333;">${jugador.nombre}</div>
                    <div style="font-size: 0.85rem; color: #666;">${equipo.nombre}</div>
                </div>
            `;
            
            // Hover effect
            jugadorCard.addEventListener('mouseenter', () => {
                jugadorCard.style.borderColor = '#007bff';
                jugadorCard.style.background = '#f0f8ff';
            });
            jugadorCard.addEventListener('mouseleave', () => {
                jugadorCard.style.borderColor = '#e0e0e0';
                jugadorCard.style.background = 'white';
            });
            
            // Seleccionar jugador
            jugadorCard.addEventListener('click', () => {
                seleccionarJugador(jugador.nombre, equipo.nombre, jugador.foto || 'CampeonatoElectronicaimg/feups2.png');
            });
            
            listaContainer.appendChild(jugadorCard);
        });
        
    } catch (error) {
        console.error("Error cargando jugadores:", error);
        listaContainer.innerHTML = '<p style="text-align: center; color: red;">Error al cargar jugadores</p>';
    }
}

function seleccionarJugador(nombreJugador, nombreEquipo, fotoJugador) {
    if (celdaActual) {
        // Guardar nombre del jugador con foto en la celda actual
        celdaActual.innerHTML = `<img src="${fotoJugador}" alt="Foto" style="width:30px; height:30px; object-fit:cover; border-radius:50%; margin-right:5px; vertical-align:middle;"> <span style="color:white;">${nombreJugador}</span>`;
        celdaActual.style.color = 'white';
        
        // Buscar la celda de equipo (siguiente columna)
        const fila = celdaActual.parentElement;
        const celdaEquipo = fila.cells[1]; // Segunda columna (Equipo)
        if (celdaEquipo) {
            celdaEquipo.textContent = nombreEquipo;
        }
    }
    
    cerrarModalJugador();
}

function cerrarModalJugador() {
    const modal = document.getElementById('modalSeleccionJugador');
    if (modal) {
        modal.style.display = 'none';
    }
    celdaActual = null;
}

window.mostrarModalSeleccionJugador = mostrarModalSeleccionJugador;
window.cerrarModalJugador = cerrarModalJugador;