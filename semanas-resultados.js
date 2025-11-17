import { collection, doc, getDoc, setDoc, getDocs } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

// 🔹 Cargar semanas de resultados desde Firebase
export async function cargarSemanasResultados() {
    const db = window.db;
    console.log("🔍 Verificando db en cargarSemanasResultados:", db);
    if (!db) {
        console.log("⏳ Base de datos no lista, reintentando...");
        setTimeout(cargarSemanasResultados, 1000);
        return;
    }

    const contenedor = document.getElementById('semanasResultados');
    if (!contenedor) return;

    try {
        console.log("📋 Intentando cargar semanas desde Firebase...");
        const docRef = doc(collection(db, "tablasTorneo"), 'semanas-resultados');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && Array.isArray(docSnap.data().semanas)) {
            const semanas = docSnap.data().semanas;
            mostrarSemanas(semanas);
            console.log(`✅ ${semanas.length} semanas de resultados cargadas`);
        } else {
            // Crear semana por defecto
            const semanaDefault = [{
                id: 1,
                titulo: 'Semana 1',
                resultados: []
            }];
            await guardarSemanas(semanaDefault);
            mostrarSemanas(semanaDefault);
            console.log('✅ Semana inicial creada');
        }
    } catch (error) {
        console.error("❌ Error cargando semanas:", error);
    }
}

// 🔹 Mostrar semanas en el DOM
function mostrarSemanas(semanas) {
    const contenedor = document.getElementById('semanasResultados');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    semanas.forEach((semana, index) => {
        const semanaDiv = document.createElement('div');
        semanaDiv.className = 'semana-container';
        semanaDiv.innerHTML = `
            <button class="semana-btn" onclick="toggleSemana(${index})">
                <span class="semana-titulo">${semana.titulo}</span>
                <span class="semana-toggle">▼</span>
            </button>
            <div class="semana-content" id="semana-${index}" style="display: none;">
                <table class="tabla-resultados-semana">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Partido 1</th>
                            <th>Resultado</th>
                            <th>Partido 2</th>
                            <th>Resultado</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-semana-${index}">
                        ${generarFilasResultados(semana.resultados)}
                    </tbody>
                </table>
            </div>
        `;
        contenedor.appendChild(semanaDiv);
    });
}

// 🔹 Generar filas de resultados
function generarFilasResultados(resultados) {
    if (!resultados || resultados.length === 0) {
        return '<tr><td colspan="5" style="text-align:center; color:#999;">No hay resultados registrados</td></tr>';
    }

    return resultados.map(res => `
        <tr>
            <td>${res.fecha || ''}</td>
            <td>${res.partido1 || ''}</td>
            <td>${res.resultado1 || ''}</td>
            <td>${res.partido2 || ''}</td>
            <td>${res.resultado2 || ''}</td>
        </tr>
    `).join('');
}

// 🔹 Toggle de semana (expandir/colapsar)
window.toggleSemana = function(index) {
    const content = document.getElementById(`semana-${index}`);
    const btn = content.previousElementSibling;
    const toggle = btn.querySelector('.semana-toggle');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
    }
};

// 🔹 Guardar semanas en Firebase
async function guardarSemanas(semanas) {
    const db = window.db;
    if (!db) {
        console.error("❌ Base de datos no disponible");
        return;
    }
    
    try {
        const docRef = doc(collection(db, "tablasTorneo"), 'semanas-resultados');
        await setDoc(docRef, { semanas });
        console.log('✅ Semanas guardadas en Firebase');
    } catch (error) {
        console.error("❌ Error guardando semanas:", error);
    }
}

// 🔹 Modo edición de semanas
export function activarEdicionSemanas() {
    const btnEditar = document.querySelector('.btn-editar-semanas');
    if (!btnEditar) return;

    btnEditar.addEventListener('click', async () => {
        const db = window.db;
        if (!db) {
            alert("❌ Base de datos no disponible");
            return;
        }
        
        const contenedor = document.getElementById('semanasResultados');
        if (!contenedor) return;

        try {
            // Cargar semanas actuales
            const docRef = doc(collection(db, "tablasTorneo"), 'semanas-resultados');
            const docSnap = await getDoc(docRef);
            let semanas = docSnap.exists() ? docSnap.data().semanas : [];

            // Mostrar modo edición
            mostrarModoEdicionSemanas(semanas);
        } catch (error) {
            console.error("❌ Error al cargar semanas para edición:", error);
            alert("Error al cargar las semanas. Por favor intenta de nuevo.");
        }
    });
}

// 🔹 Mostrar modo edición
function mostrarModoEdicionSemanas(semanas) {
    const contenedor = document.getElementById('semanasResultados');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="controles-semanas">';
    
    semanas.forEach((semana, index) => {
        const semanaDiv = document.createElement('div');
        semanaDiv.className = 'edicion-semana';
        semanaDiv.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                <input type="text" value="${semana.titulo}" 
                       id="titulo-semana-${index}" 
                       class="input-titulo-semana"
                       placeholder="Título de la semana">
                <button onclick="editarSemana(${index})" class="btn-editar-semana-individual">
                    ✏️ Editar Resultados
                </button>
                <button onclick="eliminarSemana(${index})" class="btn-eliminar-semana">
                    🗑️
                </button>
            </div>
            <div id="editor-semana-${index}" style="display: none;">
                <table class="tabla-edicion-resultados">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Partido 1</th>
                            <th>Resultado</th>
                            <th>Partido 2</th>
                            <th>Resultado</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="tbody-edicion-${index}">
                        ${generarFilasEdicion(semana.resultados, index)}
                    </tbody>
                </table>
                <button onclick="agregarResultado(${index})" class="btn-agregar-resultado">
                    ➕ Agregar Resultado
                </button>
            </div>
        `;
        contenedor.appendChild(semanaDiv);
    });

    // Botones de control
    const controles = document.createElement('div');
    controles.className = 'controles-inferiores';
    controles.innerHTML = `
        <button onclick="agregarNuevaSemana()" class="btn-control btn-agregar-fila">
            ➕ Agregar Nueva Semana
        </button>
        <button onclick="guardarTodasSemanas()" class="btn-control btn-guardar">
            💾 Guardar Todo
        </button>
        <button onclick="cancelarEdicionSemanas()" class="btn-control btn-cancelar">
            ❌ Cancelar
        </button>
    `;
    contenedor.appendChild(controles);

    // Guardar semanas actuales en memoria temporal
    window.semanasTemporales = JSON.parse(JSON.stringify(semanas));
}

// 🔹 Generar filas editables
function generarFilasEdicion(resultados, semanaIndex) {
    if (!resultados || resultados.length === 0) {
        return '';
    }

    return resultados.map((res, resIndex) => `
        <tr>
            <td><input type="text" value="${res.fecha || ''}" data-semana="${semanaIndex}" data-fila="${resIndex}" data-campo="fecha"></td>
            <td><input type="text" value="${res.partido1 || ''}" data-semana="${semanaIndex}" data-fila="${resIndex}" data-campo="partido1"></td>
            <td><input type="text" value="${res.resultado1 || ''}" data-semana="${semanaIndex}" data-fila="${resIndex}" data-campo="resultado1"></td>
            <td><input type="text" value="${res.partido2 || ''}" data-semana="${semanaIndex}" data-fila="${resIndex}" data-campo="partido2"></td>
            <td><input type="text" value="${res.resultado2 || ''}" data-semana="${semanaIndex}" data-fila="${resIndex}" data-campo="resultado2"></td>
            <td><button onclick="eliminarResultado(${semanaIndex}, ${resIndex})" class="btn-eliminar-fila">🗑️</button></td>
        </tr>
    `).join('');
}

// 🔹 Editar semana individual (expandir/colapsar)
window.editarSemana = function(index) {
    const editor = document.getElementById(`editor-semana-${index}`);
    if (editor.style.display === 'none') {
        editor.style.display = 'block';
    } else {
        editor.style.display = 'none';
    }
};

// 🔹 Agregar resultado a una semana
window.agregarResultado = function(semanaIndex) {
    if (!window.semanasTemporales) return;
    
    if (!window.semanasTemporales[semanaIndex].resultados) {
        window.semanasTemporales[semanaIndex].resultados = [];
    }
    
    window.semanasTemporales[semanaIndex].resultados.push({
        fecha: '',
        partido1: '',
        resultado1: '',
        partido2: '',
        resultado2: ''
    });
    
    const tbody = document.getElementById(`tbody-edicion-${semanaIndex}`);
    const resultados = window.semanasTemporales[semanaIndex].resultados;
    tbody.innerHTML = generarFilasEdicion(resultados, semanaIndex);
};

// 🔹 Eliminar resultado
window.eliminarResultado = function(semanaIndex, resIndex) {
    if (!window.semanasTemporales) return;
    
    if (confirm('¿Eliminar este resultado?')) {
        window.semanasTemporales[semanaIndex].resultados.splice(resIndex, 1);
        const tbody = document.getElementById(`tbody-edicion-${semanaIndex}`);
        const resultados = window.semanasTemporales[semanaIndex].resultados;
        tbody.innerHTML = generarFilasEdicion(resultados, semanaIndex);
    }
};

// 🔹 Agregar nueva semana
window.agregarNuevaSemana = function() {
    if (!window.semanasTemporales) window.semanasTemporales = [];
    
    const nuevaSemana = {
        id: window.semanasTemporales.length + 1,
        titulo: `Semana ${window.semanasTemporales.length + 1}`,
        resultados: []
    };
    
    window.semanasTemporales.push(nuevaSemana);
    mostrarModoEdicionSemanas(window.semanasTemporales);
};

// 🔹 Eliminar semana
window.eliminarSemana = function(index) {
    if (!window.semanasTemporales) return;
    
    if (confirm('¿Eliminar esta semana completa?')) {
        window.semanasTemporales.splice(index, 1);
        mostrarModoEdicionSemanas(window.semanasTemporales);
    }
};

// 🔹 Guardar todas las semanas
window.guardarTodasSemanas = async function() {
    if (!window.semanasTemporales) return;
    
    // Actualizar títulos
    window.semanasTemporales.forEach((semana, index) => {
        const inputTitulo = document.getElementById(`titulo-semana-${index}`);
        if (inputTitulo) {
            semana.titulo = inputTitulo.value;
        }
        
        // Actualizar resultados desde inputs
        const inputs = document.querySelectorAll(`input[data-semana="${index}"]`);
        inputs.forEach(input => {
            const fila = parseInt(input.dataset.fila);
            const campo = input.dataset.campo;
            if (semana.resultados[fila]) {
                semana.resultados[fila][campo] = input.value;
            }
        });
    });
    
    await guardarSemanas(window.semanasTemporales);
    alert('✅ Semanas guardadas correctamente');
    cargarSemanasResultados();
};

// 🔹 Cancelar edición
window.cancelarEdicionSemanas = function() {
    cargarSemanasResultados();
};

// 🔹 Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    cargarSemanasResultados();
    activarEdicionSemanas();
});
