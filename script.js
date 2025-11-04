
// 🔹 Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// 🔹 Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA_1wMkWbb0tsxBi8Z2HkeK7dzJ_2ionTw",
  authDomain: "mabel2-66b08.firebaseapp.com",
  projectId: "mabel2-66b08",
  storageBucket: "mabel2-66b08.firebasestorage.app",
  messagingSenderId: "689226318857",
  appId: "1:689226318857:web:3345c73a2a9f7eafeea4d8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.db = db;
const storage = getStorage(app);
const auth = getAuth(app);

// 🔹 Estado de login
let capitanLogueado = sessionStorage.getItem('capitanLogueado') === 'true';
let esAdmin = sessionStorage.getItem('admin') === 'true';
let equipoActualId = null;
let usuarioActual = null;


function inicializarApp() {
  // 🔹 Elementos del DOM
  const loginBtn = document.getElementById('loginBtn');
  const loginModal = document.getElementById('loginModal');
  const loginClose = document.getElementById('loginClose');
  const loginForm = document.getElementById('loginForm');

  const btnAgregarEquipo = document.getElementById('btnAgregarEquipo');
  const modalEquipo = document.getElementById('modalEquipo');
  const closeModalEquipo = document.getElementById('closeModalEquipo');
  const formEquipo = document.getElementById('formEquipo');
  const teamsGrid = document.getElementById('teamsGrid');

  const modalJugadores = document.getElementById('modalJugadores');
  const btnAgregarJugador = document.getElementById('btnAgregarJugador');
  const formJugador = document.getElementById('formJugador');
  const tablaJugadores = document.getElementById('tablaJugadores')?.querySelector('tbody');
  const closeModalJugadores = document.getElementById('closeModalJugadores');

  // 🔹 Actualizar UI según estado de login
  actualizarUI();

  // 🔹 Funcionalidad Acordeón para Torneo
  const accordionBtns = document.querySelectorAll('.accordion-btn');
  accordionBtns.forEach(btn => {
    // Evitar duplicar event listeners
    if (btn.dataset.listenerAdded) return;
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      this.classList.toggle('active');
      const content = this.nextElementSibling;
      
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
    
    btn.dataset.listenerAdded = 'true';
  });

  // 🔹 Login / Logout (evitar doble evento)
  if (loginBtn && !loginBtn.dataset.listenerAdded) {
    loginBtn.addEventListener('click', async () => {
      const capitanLogueado = sessionStorage.getItem('capitanLogueado') === 'true';
      const esAdmin = sessionStorage.getItem('admin') === 'true';

      if (capitanLogueado || esAdmin) {
        // Cerrar sesión con Firebase Auth
        try {
          await signOut(auth);
          sessionStorage.removeItem('capitanLogueado');
          sessionStorage.removeItem('admin');
          sessionStorage.removeItem('userId');
          sessionStorage.removeItem('userEmail');
          sessionStorage.removeItem('equipoId');
          actualizarUI();
          alert("Sesión cerrada correctamente");
        } catch (error) {
          console.error("Error al cerrar sesión:", error);
          alert("Error al cerrar sesión: " + error.message);
        }
      } else {
        // Abrir modal de login
        if (loginModal) loginModal.style.display = 'flex';
      }
    });

    // marcar que ya tiene listener
    loginBtn.dataset.listenerAdded = 'true';
  }


  // 🔹 Cerrar modal login
  if (loginClose) {
    loginClose.addEventListener('click', () => {
      if (loginModal) loginModal.style.display = 'none';
    });
  }

  // 🔹 Cerrar modales al hacer clic fuera
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) loginModal.style.display = 'none';
    });
  }

  if (modalEquipo) {
    modalEquipo.addEventListener('click', (e) => {
      if (e.target === modalEquipo) modalEquipo.style.display = 'none';
    });
  }

  if (modalJugadores) {
    modalJugadores.addEventListener('click', (e) => {
      if (e.target === modalJugadores) modalJugadores.style.display = 'none';
    });
  }

  // 🔹 Procesar formulario de login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value.trim();

      try {
        // Intentar login con Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        usuarioActual = userCredential.user;
        
        // Verificar rol en Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', usuarioActual.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const rol = (userData.rol || '').trim().toLowerCase();
          
          // 🔍 DEBUG: Ver qué datos está recibiendo
          console.log("UID del usuario:", usuarioActual.uid);
          console.log("Datos completos del usuario:", userData);
          console.log("Rol recibido:", rol);
          console.log("Tipo de dato del rol:", typeof rol);
          
          if (rol === 'admin') {
            alert("¡Bienvenido administrador!");
            capitanLogueado = true;
            esAdmin = true;
            sessionStorage.setItem('capitanLogueado', 'true');
            sessionStorage.setItem('admin', 'true');
            sessionStorage.setItem('userId', usuarioActual.uid);
            sessionStorage.setItem('userEmail', usuarioActual.email);
          } else if (rol === 'capitan') {
            alert(`¡Bienvenido capitán ${userData.nombre}!`);
            capitanLogueado = true;
            esAdmin = false;
            sessionStorage.setItem('capitanLogueado', 'true');
            sessionStorage.removeItem('admin');
            sessionStorage.setItem('userId', usuarioActual.uid);
            sessionStorage.setItem('userEmail', usuarioActual.email);
            sessionStorage.setItem('equipoId', userData.equipoId || '');
          } else {
            throw new Error(`Rol no autorizado: "${rol}"`);
          }
          
          if (loginModal) loginModal.style.display = 'none';
          actualizarUI();
          if (window.forzarActualizacionBotones) window.forzarActualizacionBotones();
          
        } else {
          throw new Error('Usuario no encontrado en la base de datos');
        }
        
      } catch (error) {
        console.error("Error de login:", error);
        if (error.code === 'auth/invalid-email') {
          alert("Correo electrónico inválido");
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          alert("Correo o contraseña incorrectos");
        } else if (error.code === 'auth/invalid-credential') {
          alert("Credenciales inválidas");
        } else {
          alert("Error al iniciar sesión: " + error.message);
        }
      }
    });
  }

  // 🔹 Modal agregar equipo
  if (btnAgregarEquipo) {
    btnAgregarEquipo.addEventListener('click', () => {
      if (capitanLogueado) {
        if (modalEquipo) modalEquipo.style.display = 'flex';
      } else {
        alert("Debes iniciar sesión como capitán para agregar equipos.");
      }
    });
  }

  if (closeModalEquipo) {
    closeModalEquipo.addEventListener('click', () => {
      if (modalEquipo) modalEquipo.style.display = 'none';
    });
  }

  // 🔹 Guardar equipo
  if (formEquipo) {
    formEquipo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('nombreEquipo').value;
      const abreviatura = document.getElementById('abreviaturaEquipo').value;
      const dirigente = document.getElementById('dirigenteEquipo').value;
      const file = document.getElementById('logoEquipo').files[0];

      if (!nombre || !abreviatura || !dirigente) {
        alert("Por favor completa todos los campos");
        return;
      }

      try {
        let urlLogo = "";
        if (file) {
          const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          urlLogo = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, "equipos"), {
          nombre, 
          abreviatura, 
          dirigente, 
          logo: urlLogo, 
          fecha: new Date()
        });

        alert("Equipo agregado correctamente");
        formEquipo.reset();
        if (modalEquipo) modalEquipo.style.display = 'none';
        if (teamsGrid) cargarEquipos();
      } catch (error) {
        console.error("Error al guardar equipo:", error);
        alert("Error al guardar el equipo");
      }
    });
  }

  // 🔹 Cargar equipos
  if (teamsGrid) {
    cargarEquipos();
  }

  // 🔹 Modal jugadores
  if (closeModalJugadores) {
    closeModalJugadores.addEventListener('click', () => {
      if (modalJugadores) modalJugadores.style.display = 'none';
      if (tablaJugadores) tablaJugadores.innerHTML = '';
    });
  }

  // 🔹 Mostrar formulario agregar jugador
  if (btnAgregarJugador) {
    btnAgregarJugador.addEventListener('click', () => {
      if (formJugador) formJugador.style.display = formJugador.style.display === 'none' ? 'block' : 'none';
    });
  }

  // 🔹 Guardar jugador
  if (formJugador) {
    formJugador.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('nombreJugador').value;
      const edad = document.getElementById('edadJugador').value;
      const numero = document.getElementById('numeroJugador').value;
      const file = document.getElementById('fotoJugador').files[0];

      if (!nombre || !edad || !numero) {
        alert("Por favor completa todos los campos");
        return;
      }

      try {
        let urlFoto = '';
        if (file) {
          const storageRef = ref(storage, `jugadores/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          urlFoto = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, "jugadores"), {
          equipoId: equipoActualId,
          nombre, 
          edad, 
          numero, 
          foto: urlFoto, 
          fecha: new Date()
        });

        alert("Jugador agregado correctamente");
        formJugador.reset();
        if (formJugador) formJugador.style.display = 'none';
        cargarJugadores(equipoActualId);
      } catch (error) {
        console.error("Error al guardar jugador:", error);
        alert("Error al guardar el jugador");
      }
    });
  }

  // 🔹 Cargar datos del torneo si estamos en esa página
  if (window.location.pathname.includes('torneo.html')) {
    cargarDatosTorneo();
  }
}

// 🔹 Función para actualizar UI
function actualizarUI() {
  const loginBtn = document.getElementById('loginBtn');
  const btnAgregarEquipo = document.getElementById('btnAgregarEquipo');
  const btnAgregarJugador = document.getElementById('btnAgregarJugador');

  if (loginBtn) {
    const loginImg = loginBtn.querySelector('img');
    if (loginImg) {
      if (esAdmin) {
        loginImg.src = "CampeonatoElectronicaimg/cerrar_sesion.png";
        loginImg.title = "Cerrar sesión (Admin)";
      } else if (capitanLogueado) {
        loginImg.src = "CampeonatoElectronicaimg/cerrar_sesion.png";
        loginImg.title = "Cerrar sesión (Capitán)";
      } else {
        loginImg.src = "CampeonatoElectronicaimg/iniciar_sesion.png";
        loginImg.title = "Iniciar sesión";
      }
    }
  }

  // Mostrar botones de equipos/jugadores si es capitán o admin
  if (btnAgregarEquipo) btnAgregarEquipo.style.display = capitanLogueado ? 'block' : 'none';
  if (btnAgregarJugador) btnAgregarJugador.style.display = capitanLogueado ? 'block' : 'none';

  
  actualizarBotonesEdicion();
  
}

// 🔹 Cargar equipos
async function cargarEquipos() {
  const teamsGrid = document.getElementById('teamsGrid');
  if (!teamsGrid) return;
  
  teamsGrid.innerHTML = "";
  
  try {
    const snapshot = await getDocs(collection(db, "equipos"));
    
    if (snapshot.empty) {
      teamsGrid.innerHTML = '<p style="color: white; text-align: center;">No hay equipos registrados</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'team-card';
      card.dataset.id = doc.id;

      card.innerHTML = `
        <div class="team-card-header">
          <span>${data.nombre}</span>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <img src="CampeonatoElectronicaimg/nomina.png" class="player-icon" title="Ver jugadores">
            ${esAdmin ? '<button class="btn-eliminar-equipo" title="Eliminar equipo" style="background:#dc3545;color:white;border:none;padding:0.3rem 0.5rem;border-radius:4px;cursor:pointer;font-size:0.9rem;">🗑️</button>' : ''}
          </div>
        </div>
        <div class="team-card-content">
          <img src="${data.logo || 'CampeonatoElectronicaimg/feups2.png'}" alt="Logo" class="logo">
          <div class="team-info">
            <span>Abreviatura: ${data.abreviatura}</span>
            <span>Dirigente: ${data.dirigente}</span>
          </div>
        </div>
      `;

      // Agregar evento del botón ver jugadores
      const playerIcon = card.querySelector('.player-icon');
      if (playerIcon) {
        playerIcon.addEventListener('click', () => {
          equipoActualId = doc.id;
          abrirModalJugadores(equipoActualId);
        });
      }
      
      // Agregar evento del botón eliminar equipo
      const btnEliminar = card.querySelector('.btn-eliminar-equipo');
      if (btnEliminar) {
        btnEliminar.addEventListener('click', async () => {
          if (confirm(`¿Estás seguro de eliminar el equipo "${data.nombre}"? Esto también eliminará todos sus jugadores.`)) {
            await eliminarEquipo(doc.id, data.nombre);
          }
        });
      }

      teamsGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Error cargando equipos:", error);
    teamsGrid.innerHTML = '<p style="color: white; text-align: center;">Error al cargar equipos</p>';
  }
}

// 🔹 Modal jugadores
function abrirModalJugadores(equipoId) {
  const modalJugadores = document.getElementById('modalJugadores');
  const btnAgregarJugador = document.getElementById('btnAgregarJugador');
  const formJugador = document.getElementById('formJugador');
  
  if (!modalJugadores) return;
  
  modalJugadores.style.display = 'flex';
  if (btnAgregarJugador) btnAgregarJugador.style.display = capitanLogueado ? 'block' : 'none';
  if (formJugador) formJugador.style.display = 'none';
  cargarJugadores(equipoId);
}

// 🔹 Cargar jugadores
async function cargarJugadores(equipoId) {
  const tablaJugadores = document.getElementById('tablaJugadores')?.querySelector('tbody');
  if (!tablaJugadores) return;
  
  // Agregar columna de acciones en el encabezado si es admin
  const thead = document.getElementById('tablaJugadores')?.querySelector('thead tr');
  if (thead && esAdmin && !thead.querySelector('.th-acciones')) {
    const thAcciones = document.createElement('th');
    thAcciones.className = 'th-acciones';
    thAcciones.textContent = 'Acciones';
    thead.appendChild(thAcciones);
  }
  
  tablaJugadores.innerHTML = "";
  
  try {
    const q = query(collection(db, "jugadores"), where("equipoId", "==", equipoId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      tablaJugadores.innerHTML = `<tr><td colspan="${esAdmin ? '5' : '4'}" style="text-align: center; color: black;">No hay jugadores registrados</td></tr>`;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><img src="${data.foto || 'CampeonatoElectronicaimg/feups2.png'}" alt="Foto" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
        <td>${data.nombre}</td>
        <td>${data.edad}</td>
        <td>${data.numero}</td>
        ${esAdmin ? '<td><button class="btn-eliminar-jugador" data-id="' + doc.id + '" data-nombre="' + data.nombre + '" style="background:#dc3545;color:white;border:none;padding:0.3rem 0.5rem;border-radius:4px;cursor:pointer;">🗑️</button></td>' : ''}
      `;
      tablaJugadores.appendChild(row);
    });
    
    // Agregar event listeners para botones de eliminar jugador
    if (esAdmin) {
      const botonesEliminar = tablaJugadores.querySelectorAll('.btn-eliminar-jugador');
      botonesEliminar.forEach(btn => {
        btn.addEventListener('click', async () => {
          const jugadorId = btn.dataset.id;
          const jugadorNombre = btn.dataset.nombre;
          if (confirm(`¿Estás seguro de eliminar al jugador "${jugadorNombre}"?`)) {
            await eliminarJugador(jugadorId, equipoId);
          }
        });
      });
    }
    
  } catch (error) {
    console.error("Error cargando jugadores:", error);
    tablaJugadores.innerHTML = '<tr><td colspan="4" style="text-align: center; color: black;">Error al cargar jugadores</td></tr>';
  }
}

// Agregar al final de la función cargarDatosTorneo() en script.js
async function cargarDatosTorneo() {
    try {
        // La tabla de posiciones se carga automáticamente desde editor-tablas.js
        // NO llamar a cargarTablaPosiciones() aquí para evitar duplicación
        
        // El resto de las tablas mantienen su funcionalidad actual
        const horariosSnapshot = await getDocs(collection(db, "horarios"));
        const tablaHorarios = document.getElementById('tablaHorarios')?.querySelector('tbody');
        if (tablaHorarios) {
            tablaHorarios.innerHTML = '';
            horariosSnapshot.forEach(doc => {
                const data = doc.data();
                const row = `<tr>
                    <td>${data.fecha}</td>
                    <td>${data.partido}</td>
                    <td>${data.hora}</td>
                </tr>`;
                tablaHorarios.innerHTML += row;
            });
            
            if (horariosSnapshot.empty) {
                tablaHorarios.innerHTML = `
                    <tr><td colspan="3" style="text-align: center; color: white;">No hay horarios programados</td></tr>
                `;
            }
        }

        // ... resto del código para otras tablas
    } catch (error) {
        console.error("Error cargando datos del torneo:", error);
    }
}
// ✅ Esperar a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script cargado correctamente");
  console.log("Script cargado?", typeof inicializarEditorTablas);

  const loginBtn = document.getElementById("loginBtn");
  const loginModal = document.getElementById("loginModal");
  const loginClose = document.getElementById("loginClose");

  // 🔹 Mostrar modal login
  if (loginBtn && loginModal) {
    loginBtn.addEventListener("click", () => {
      loginModal.style.display = "flex";
    });
  }

  // 🔹 Cerrar modal login
  if (loginClose && loginModal) {
    loginClose.addEventListener("click", () => {
      loginModal.style.display = "none";
    });
  }

  // 🔹 Cerrar modal al hacer clic fuera
  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.style.display = "none";
    }
  });

  // 🔹 Enlaces de navegación seguros
  const torneoLink = document.querySelector('a[href="torneo.html"]');
  if (torneoLink) {
    torneoLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "torneo.html";
    });
  }
});

// 🔹 Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function() {
  console.log("✅ DOM cargado - Inicializando aplicación");
  inicializarApp();
});


// 🔹 Función para actualizar botones de edición (si existe)
function actualizarBotonesEdicion() {
  const botonesEditar = document.querySelectorAll('.btn-editar-tabla');
  botonesEditar.forEach(btn => {
    btn.style.display = esAdmin ? 'block' : 'none';
  });
}

// 🔹 Función para eliminar equipo
async function eliminarEquipo(equipoId, nombreEquipo) {
  try {
    // Eliminar todos los jugadores del equipo
    const q = query(collection(db, "jugadores"), where("equipoId", "==", equipoId));
    const jugadoresSnap = await getDocs(q);
    
    const deletePromises = [];
    jugadoresSnap.forEach(jugadorDoc => {
      deletePromises.push(deleteDoc(doc(db, "jugadores", jugadorDoc.id)));
    });
    
    await Promise.all(deletePromises);
    
    // Eliminar el equipo
    await deleteDoc(doc(db, "equipos", equipoId));
    
    alert(`✅ Equipo "${nombreEquipo}" y sus jugadores eliminados correctamente`);
    cargarEquipos(); // Recargar la lista de equipos
    
  } catch (error) {
    console.error("Error eliminando equipo:", error);
    alert("❌ Error al eliminar el equipo");
  }
}

// 🔹 Función para eliminar jugador
async function eliminarJugador(jugadorId, equipoId) {
  try {
    await deleteDoc(doc(db, "jugadores", jugadorId));
    alert("✅ Jugador eliminado correctamente");
    cargarJugadores(equipoId); // Recargar la lista de jugadores
    
  } catch (error) {
    console.error("Error eliminando jugador:", error);
    alert("❌ Error al eliminar el jugador");
  }
}

// Esta función ya no es necesaria - la tabla de posiciones se carga desde editor-tablas.js
async function cargarTablaPosiciones() {
  console.log("ℹ️ Tabla de posiciones se carga automáticamente desde editor-tablas.js");
  // No hacer nada - evitar duplicación
}











