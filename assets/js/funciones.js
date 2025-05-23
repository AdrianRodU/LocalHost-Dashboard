// ============================== //
// ⚙️  Configuración base global
// ============================== //

// Identifica en qué carpeta estás trabajando ("root" si estás en localhost directamente)
const pathPart = location.pathname.split("/")[1];
const basePath = pathPart || "root";
const baseURL = pathPart ? "/" + pathPart : "";

const claveFavoritos = `favorites-${basePath}`;
const claveOcultos = `ocultas-${basePath}`;
const claveModoOscuro = `modoOscuro-${basePath}`;
const claveURLs = `urlsPersonalizadas-${basePath}`;

let estadoValidoURL = true; // para saber si la URL está validada correctamente

// ============================== //
// 🚀 Eventos de inicio
// ============================== //

// Lógica que se ejecuta al cargar la página (muestra toasts, animaciones, modo oscuro, etc.)
document.addEventListener("DOMContentLoaded", () => {
    const carpetaCreada = localStorage.getItem("carpetaCreada");
    if (carpetaCreada) {
        showToast(
            `Carpeta "${carpetaCreada}" fue creada correctamente.`,
            "success",
            "custom-success"
        );
        // Esperar un momento a que se rendericen las tarjetas
        setTimeout(() => {
            const nuevaCard = document.querySelector(
                `[data-folder="${carpetaCreada}"]`
            );
            if (nuevaCard) {
                nuevaCard.classList.add("carpeta-nueva");
                setTimeout(() => {
                    nuevaCard.classList.remove("carpeta-nueva");
                }, 4000);
            }
        }, 300); // Pequeña espera para asegurar que la tarjeta esté lista
        localStorage.removeItem("carpetaCreada");
    }
    const eliminada = localStorage.getItem("carpetaEliminada");
    if (eliminada) {
        showToast(
            `Carpeta "${eliminada}" fue eliminada.`,
            "success",
            "custom-success"
        );
        localStorage.removeItem("carpetaEliminada");
    }
    const renombrada = localStorage.getItem("carpetaRenombrada");
    if (renombrada) {
        setTimeout(() => {
            const tarjeta = document.querySelector(`[data-folder="${renombrada}"]`);
            if (tarjeta) {
                tarjeta.classList.add("carpeta-renombrada");
                setTimeout(() => {
                    tarjeta.classList.remove("carpeta-renombrada");
                }, 4000);
            }
        }, 300);
        showToast(`Carpeta renombrada a "${renombrada}"`, "info", "custom-info");
        localStorage.removeItem("carpetaRenombrada");
    }
    actualizarTextoModo(); // Un solo llamado lo hace todo
    const folderGrid = document.getElementById("folderGrid");
    const ocultas = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
    const favoritas = JSON.parse(localStorage.getItem(claveFavoritos) || "[]");
    window.carpetasDisponibles.forEach((folder) => {
        if (!ocultas.includes(folder) && !favoritas.includes(folder)) {
            const item = document.createElement("div");
            item.className = "col-md-3 col-sm-6";
            item.innerHTML = `
        <div class='card shadow-sm p-3 cursor-pointer' data-folder="${folder}" onclick="abrirCarpeta(event, '${folder}')">
          <div class='d-flex align-items-center mb-2'>
            <i class='fas fa-folder text-warning me-2 fs-4'></i>
            <strong class='flex-grow-1'>${folder}</strong>
          </div>
          <div class='d-flex justify-content-between'>
            <i class='fas fa-pencil-alt ' data-bs-toggle='tooltip' data-bs-placement='bottom' onclick='event.stopPropagation(); renameFolder("${folder}")'></i>
            <i class='fas fa-trash ' data-bs-toggle='tooltip' data-bs-placement='bottom' onclick='deleteFolder("${folder}")'></i>
            <i class='fas fa-star ' data-bs-toggle='tooltip' data-bs-placement='bottom' onclick='toggleFavorite("${folder}", this)'></i>
            <i class='fas fa-eye-slash ' data-bs-toggle='tooltip' data-bs-placement='bottom' onclick='hideFolder("${folder}")'></i>
            <i class='fas fa-search' data-bs-toggle='tooltip' data-bs-placement='bottom' title='Vista previa' onclick='event.stopPropagation(); verContenidoCarpeta("${folder}")'></i>
          </div>
        </div>
      `;
            /*item.onclick = () => location.href = folder;*/
            folderGrid.appendChild(item);
        }
    });
    document.querySelectorAll(".card").forEach((card) => {
        const name = card.getAttribute("data-folder");
        if (ocultas.includes(name)) {
            const contenedor = card.closest('[class^="col-"]');
            if (contenedor) contenedor.style.display = "none";
        }
    });

    updateFavorites();
    renderCarpetas();

    const isDark = localStorage.getItem(claveModoOscuro) === "true";
    if (isDark) document.body.classList.add("dark");

    modoAutoPorHora(); // Aplica modo según hora si no hay preferencia guardada
    setInterval(modoAutoPorHora, 60 * 1000); // Revisa cada minuto

    actualizarTextoModo(); // Esto actualizará textos e íconos

    setInterval(() => {
        document.getElementById("time").textContent = new Date().toLocaleString();
    }, 1000);

    activarTooltips(); // activa todos los tooltips del DOM inicial

    // Limpieza automática de archivos temporales de eliminación
    fetch(`${baseURL}/app/limpiar-progreso.php`)
        .then(() => {
            // showToast("🧹 Archivos temporales limpiados", "info", "custom-info");
        });

    // OffCanvas Modos Claro - Oscuro
    const offBtn = document.getElementById("modoOffcanvasBtn");
    if (offBtn) {
        offBtn.addEventListener("click", () => {
            const isDark = document.body.classList.contains("dark");
            const hayPreferenciaManual = localStorage.getItem(claveModoOscuro) !== null;

            if (!hayPreferenciaManual) {
                activarModoOscuro(); // cambia a oscuro manual
            } else if (isDark) {
                activarModoClaro(); // cambia a claro manual
            } else {
                activarModoAutomatico(); // cambia a automático
            }
        });
    }

    // Refrescar carpetas automáticamente al volver al dashboard
    window.addEventListener("focus", refrescarCarpetasDesdeServidor);

});

function activarTooltips(contenedor = document) {
    const tooltipElements = contenedor.querySelectorAll('[data-bs-toggle="tooltip"]');

    tooltipElements.forEach(el => {
        const existing = bootstrap.Tooltip.getInstance(el);
        if (existing) existing.dispose(); // eliminar si ya existe
        const tip = new bootstrap.Tooltip(el);

        el.addEventListener("click", () => {
            tip.hide(); // evitar que se quede congelado
        });
    });
}


// ============================== //
// 🧰 Utilidades generales
// ============================== //

// Muestra una notificación visual (toast) en la esquina superior derecha
function showToast(message, icon = "info", customClass = "") {
    Swal.fire({
        toast: true,
        position: "top-end",
        icon: icon,
        title: message,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
            popup: customClass, // Aquí aplicas tu clase extra
        },
    });
}

// Retorna la clase de ícono apropiada según la extensión de archivo
function obtenerIconoPorExtension(extension) {
    const ext = extension.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
        return "fa-file-image text-danger";
    if (["pdf"].includes(ext)) return "fa-file-pdf text-danger";
    if (["doc", "docx"].includes(ext)) return "fa-file-word text-primary";
    if (["xls", "xlsx"].includes(ext)) return "fa-file-excel text-success";
    if (["ppt", "pptx"].includes(ext)) return "fa-file-powerpoint text-warning";
    if (["zip", "rar", "7z"].includes(ext)) return "fa-file-archive text-warning";
    if (["mp4", "avi", "mov", "mkv"].includes(ext))
        return "fa-file-video text-purple";
    if (["mp3", "wav"].includes(ext)) return "fa-file-audio text-info";
    if (["txt", "md"].includes(ext)) return "fa-file-lines text-muted";
    // Archivos de código / desarrollo
    if (["html", "htm"].includes(ext)) return "fa-code text-warning";
    if (["php"].includes(ext)) return "fa-code text-indigo";
    if (["js", "mjs"].includes(ext)) return "fa-file-code text-warning";
    if (["css", "scss"].includes(ext)) return "fa-brush text-info";
    if (["json", "xml", "yml", "yaml"].includes(ext)) return "fa-code text-muted";
    if (["sh", "bat", "cmd", "ps1"].includes(ext))
        return "fa-terminal text-light";
    if (["sql"].includes(ext)) return "fa-database text-success";
    // Otros genéricos
    return "fa-file text-secondary";
}

// Actualiza el saludo dinámico según la hora del día
function actualizarSaludo() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const saludoEl = document.getElementById("saludoInicial");

    const claveNombre = `nombreUsuario-${location.pathname}`;
    let nombre = localStorage.getItem(claveNombre);

    // Si es la primera vez, mostrar el modal y luego guardar
    if (!nombre) {
        Swal.fire({
            title: '¡Bienvenido!',
            text: '¿Cuál es tu nombre? 👋',
            input: 'text',
            inputPlaceholder: 'Tu nombre',
            confirmButtonText: 'Guardar',
            allowOutsideClick: false,
            allowEscapeKey: false,
            inputValidator: (value) => {
                if (!value.trim()) {
                    // Aplicar animación shake manual
                    const modal = Swal.getPopup();
                    if (modal) {
                        modal.classList.remove("shake-error");
                        void modal.offsetWidth;
                        modal.classList.add("shake-error");
                    }
                    return 'Por favor, escribe tu nombre';
                }
            }
        }).then((result) => {
            const valor = result.value?.trim();
            if (valor) {
                localStorage.setItem(claveNombre, valor);
                actualizarSaludo();
                showToast(`Nombre guardado como "${valor}"`, "success", "custom-success");
            }
        });

        return; // salimos hasta que el usuario complete
    }

    let saludo = `Hola, ${nombre} 👋`;
    if (hora >= 5 && hora < 12) {
        saludo = `Buenos días, ${nombre} ☀️`;
    } else if (hora >= 12 && hora < 19) {
        saludo = `Buenas tardes, ${nombre} 🌞`;
    } else {
        saludo = `Buenas noches, ${nombre} 🌙`;
    }

    if (saludoEl) saludoEl.textContent = saludo;
}

document.addEventListener("DOMContentLoaded", actualizarSaludo);
setInterval(actualizarSaludo, 60000); // cada 60 segundos

// Modifica el nombre del usuario para dar un saludo dinámico según la hora del día
function cambiarNombreUsuario() {
    const clave = `nombreUsuario-${location.pathname}`;
    const actual = localStorage.getItem(clave) || "";

    Swal.fire({
        title: 'Configurar nombre a mostrar',
        html: `
        <input id="nuevoNombreInput" class="swal2-input" placeholder="Tu nombre" value="${actual}">
        ${actual ? `
          <button id="borrarNombreBtn" class="swal2-styled swal2-cancel mt-2" style="background:#e74c3c;">
            <i class="fa-solid fa-trash-can"></i> Borrar nombre
          </button>
        ` : ""}
      `,
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: () => !Swal.isLoading(),

        didOpen: () => {

            const btnBorrar = document.getElementById("borrarNombreBtn");

            if (btnBorrar) {
                btnBorrar.addEventListener("click", () => {
                    Swal.fire({
                        title: "¿Estás seguro?",
                        text: "Se eliminará el nombre personalizado guardado.",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sí, borrar",
                        cancelButtonText: "Cancelar",
                        customClass: {
                            confirmButton: 'btn btn-danger',   // rojo de Bootstrap
                            cancelButton: 'btn btn-secondary'
                        },
                        reverseButtons: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            localStorage.removeItem(clave);
                            Swal.close();

                            showToast("Se eliminó el nombre personalizado", "error", "custom-error");

                            const saludoEl = document.getElementById("saludoInicial");
                            if (saludoEl) {
                                saludoEl.textContent = "¡Bienvenido! 👋";
                                saludoEl.classList.add("animacion-saludo");
                                setTimeout(() => saludoEl.classList.remove("animacion-saludo"), 600);
                            }

                            setTimeout(() => {
                                actualizarSaludo();
                            }, 4000);
                        } else if (result.dismiss === Swal.DismissReason.cancel) {
                            // showToast("No se borró el nombre", "info", "custom-info");
                            setTimeout(() => cambiarNombreUsuario(), 300);
                        }
                    });
                });
            }

            // Habilitar Enter
            const input = document.getElementById("nuevoNombreInput");
            if (input) {
                // Enfocar manualmente
                input.focus();

                // Mover el cursor al final
                const valor = input.value;
                input.value = "";
                input.value = valor;

                // Soporte para Enter
                input.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        Swal.clickConfirm();
                    }
                });
            }
        },

        preConfirm: () => {
            const inputEl = document.getElementById("nuevoNombreInput");
            const nuevo = inputEl.value.trim();
            const actual = localStorage.getItem(`nombreUsuario-${location.pathname}`) || "";

            const modal = Swal.getPopup();

            // Si el campo está vacío
            if (!nuevo) {
                Swal.showValidationMessage("Por favor, escribe tu nombre o usa 'Borrar nombre'");
                inputEl.style.border = "1px solid #dc3545";
                inputEl.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
                if (modal) {
                    modal.classList.remove("shake-error");
                    void modal.offsetWidth;
                    modal.classList.add("shake-error");
                }
                return false;
            }

            // Si el nuevo nombre es igual al actual
            if (nuevo === actual) {
                Swal.showValidationMessage("El nombre ingresado es el mismo que el actual");
                inputEl.style.border = "1px solid #dc3545";
                inputEl.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
                if (modal) {
                    modal.classList.remove("shake-error");
                    void modal.offsetWidth;
                    modal.classList.add("shake-error");
                }
                return false;
            }

            // Si es válido
            inputEl.style.border = "";
            inputEl.style.boxShadow = "";

            localStorage.setItem(`nombreUsuario-${location.pathname}`, nuevo);
            actualizarSaludo();
            showToast(`Nombre guardado como "${nuevo}"`, "success", "custom-success");
        }

    }).then((result) => {
        // Esto ocurre SIEMPRE al cerrar el modal (confirmar o cancelar)
        const modal = document.querySelector('.swal2-popup');
        if (modal) {
            modal.classList.remove("shake-error"); // quitar cualquier clase pendiente
            modal.style.animation = ''; // también quitar animación en línea por si existe
        }
    });
}



// ============================== //
// 🎨 Renderizado de interfaz
// ============================== //

// Abre la carpeta seleccionada navegando a su ruta relativa
function abrirCarpeta(event, folder) {
    const ignorar = event.target.closest(".dropdown, .dropdown-menu, .dropdown-toggle, button, i, .btn, .fa");
    if (!ignorar) {
        const urls = JSON.parse(localStorage.getItem(claveURLs) || "{}");
        const personalizada = urls[folder];
        window.open(personalizada || `${folder}/`, '_blank');
    }
}

// Renderiza todas las carpetas visibles (no ocultas ni favoritas) en el grid principal
// Refactor de renderCarpetas() sin innerHTML
//function renderCarpetas(folderAnimada = null) {
function renderCarpetas(foldersAnimadas = []) {

    if (!Array.isArray(foldersAnimadas)) {
        foldersAnimadas = foldersAnimadas ? [foldersAnimadas] : [];
    }

    const folderGrid = document.getElementById("folderGrid");
    folderGrid.innerHTML = "";
    const ocultas = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
    const favoritas = JSON.parse(localStorage.getItem(claveFavoritos) || "[]");

    window.carpetasDisponibles.forEach((folder) => {
        if (!ocultas.includes(folder) && !favoritas.includes(folder)) {
            const item = document.createElement("div");
            // const animClass = folder === folderAnimada ? "carpeta-nueva" : "";
            const animClass = foldersAnimadas.includes(folder) ? "carpeta-nueva" : "";

            item.className = "col-md-3 col-sm-6";

            const card = document.createElement("div");
            card.className = `card shadow-sm p-3 cursor-pointer ${animClass}`;
            card.dataset.folder = folder;
            card.onclick = (e) => abrirCarpeta(e, folder);

            const header = document.createElement("div");
            header.className = "d-flex align-items-center mb-2";

            const iconFolder = document.createElement("i");
            iconFolder.className = "fas fa-folder text-warning me-2 fs-4";

            const name = document.createElement("strong");
            name.className = "flex-grow-1";
            // name.textContent = folder;

            const urls = JSON.parse(localStorage.getItem(claveURLs) || "{}");
            const tieneURL = urls[folder];

            name.innerHTML = tieneURL
                ? `${folder} <i class="fas fa-link text-info ms-1" data-bs-toggle="tooltip" title="URL personalizada activa"></i>`
                : folder;


            header.appendChild(iconFolder);
            header.appendChild(name);

            const controls = document.createElement("div");
            controls.className = "d-flex justify-content-between align-items-center";

            // 🔹 Contenedor para los íconos de acción directa
            const leftIcons = document.createElement("div");
            leftIcons.className = "d-flex gap-2";

            // Íconos visibles directamente
            const accionesDirectas = [
                { icon: "fa-star", title: "Agregar a favoritos", action: (e) => toggleFavorite(folder, e.target) },
                { icon: "fa-search", title: "Vista previa", action: () => verContenidoCarpeta(folder) },
                { icon: "fab fa-wordpress text-primary", title: "Instalar WordPress", action: () => instalarWordPress(folder) }
            ];

            accionesDirectas.forEach(({ icon, title, action }) => {
                const i = document.createElement("i");
                i.className = `fas ${icon}`;
                i.dataset.bsToggle = "tooltip";
                i.dataset.bsPlacement = "bottom";
                i.title = title;
                i.onclick = (e) => {
                    e.stopPropagation();
                    const tip = bootstrap.Tooltip.getInstance(i);
                    if (tip) tip.hide();
                    action(e);
                };
                leftIcons.appendChild(i);
            });

            // Contenedor para el dropdown
            const dropdown = document.createElement("div");
            dropdown.className = "dropdown ms-auto"; // <-- esto lo alinea a la derecha

            const toggleBtn = document.createElement("button");
            toggleBtn.className = "btn btn-sm btn-primary dropdown-toggle";
            toggleBtn.setAttribute("data-bs-toggle", "dropdown");
            toggleBtn.setAttribute("aria-expanded", "false");
            toggleBtn.innerHTML = ` <i class="fas fa-ellipsis-v"></i> `;
            dropdown.appendChild(toggleBtn);

            toggleBtn.addEventListener("click", () => {
                // Elimina z-top de todas las tarjetas
                document.querySelectorAll(".card.z-top").forEach(c => c.classList.remove("z-top"));

                // Aplica z-top a esta tarjeta activa
                card.classList.add("z-top");
            });

            dropdown.addEventListener("hidden.bs.dropdown", () => {
                card.classList.remove("z-top");
            });

            // Menú interno del dropdown
            const menu = document.createElement("ul");
            menu.className = "dropdown-menu dropdown-menu-end dropdown-compact";

            // Elementos del menú
            // Ocultar Carpeta
            const liOcultarCar = document.createElement("li");
            const aHide = document.createElement("a");
            aHide.className = "dropdown-item d-flex justify-content-center";
            aHide.href = "#";

            const iconHide = document.createElement("i");
            iconHide.className = "fas fa-eye-slash text-primary fs-6";
            iconHide.setAttribute("title", "Ocultar carpeta");
            iconHide.setAttribute("data-bs-toggle", "tooltip");
            iconHide.setAttribute("data-bs-placement", "right");

            aHide.appendChild(iconHide);
            aHide.addEventListener("click", (e) => {
                e.preventDefault();
                hideFolder(folder);
            });
            liOcultarCar.appendChild(aHide);

            requestAnimationFrame(() => {
                new bootstrap.Tooltip(iconHide);
            });


            // Renombrar carpeta
            const liRename = document.createElement("li");
            const aRename = document.createElement("a");
            aRename.className = "dropdown-item d-flex justify-content-center";
            aRename.href = "#";

            const iconRename = document.createElement("i");
            iconRename.className = "fas fa-pencil-alt text-success fs-6";
            iconRename.setAttribute("title", "Renombrar");
            iconRename.setAttribute("data-bs-toggle", "tooltip");
            iconRename.setAttribute("data-bs-placement", "right");

            aRename.appendChild(iconRename);
            aRename.addEventListener("click", (e) => {
                e.preventDefault();
                renameFolder(folder);
            });
            liRename.appendChild(aRename);

            // Inicializar tooltip manualmente en el ícono
            requestAnimationFrame(() => {
                new bootstrap.Tooltip(iconRename);
            });

            // Eliminar Carpeta
            const liDelete = document.createElement("li");
            const aDelete = document.createElement("a");
            aDelete.className = "dropdown-item d-flex justify-content-center";
            aDelete.href = "#";

            const iconDelete = document.createElement("i");
            iconDelete.className = "fas fa-trash text-danger fs-6";
            iconDelete.setAttribute("title", "Eliminar");
            iconDelete.setAttribute("data-bs-toggle", "tooltip");
            iconDelete.setAttribute("data-bs-placement", "right");

            aDelete.appendChild(iconDelete);
            aDelete.addEventListener("click", (e) => {
                e.preventDefault();
                deleteFolder(folder);
            });
            liDelete.appendChild(aDelete);

            requestAnimationFrame(() => {
                new bootstrap.Tooltip(iconDelete);
            });

            // Abrir en Windows
            const liOpen = document.createElement("li");
            const aOpen = document.createElement("a");
            aOpen.className = "dropdown-item d-flex justify-content-center";
            aOpen.href = "#";

            const iconOpen = document.createElement("i");
            iconOpen.className = "fas fa-folder-open text-warning fs-6";
            iconOpen.setAttribute("title", "Abrir en Windows");
            iconOpen.setAttribute("data-bs-toggle", "tooltip");
            iconOpen.setAttribute("data-bs-placement", "right");

            aOpen.appendChild(iconOpen);
            aOpen.addEventListener("click", (e) => {
                e.preventDefault();
                abrirEnWindows(folder);
            });
            liOpen.appendChild(aOpen);

            requestAnimationFrame(() => {
                new bootstrap.Tooltip(iconOpen);
            });

            // Llamado al Dropdown
            menu.appendChild(liRename);
            menu.appendChild(liDelete);
            menu.appendChild(liOcultarCar);
            menu.appendChild(liOpen);

            dropdown.appendChild(menu);

            dropdown.addEventListener("shown.bs.dropdown", () => {
                activarTooltips(menu);
            });

            // Añadir a controles
            controls.appendChild(leftIcons);
            controls.appendChild(dropdown);
            activarTooltips(dropdown);

            card.appendChild(header);
            card.appendChild(controls);
            item.appendChild(card);
            folderGrid.appendChild(item);

            // animación visual si es nueva
            if (foldersAnimadas.includes(folder)) {
                requestAnimationFrame(() => {
                    card.classList.add("carpeta-nueva");
                    setTimeout(() => card.classList.remove("carpeta-nueva"), 4000);
                });
            }

            activarTooltips(card);

        }
    });

    const totalVisibles = window.carpetasDisponibles.filter((folder) => {
        return !ocultas.includes(folder) && !favoritas.includes(folder);
    }).length;

    const localCountSpan = document.getElementById("localCount");
    if (localCountSpan) {
        localCountSpan.textContent = totalVisibles;
    }

    const mensajeSinLocales = document.getElementById("mensajeSinLocales");
    if (mensajeSinLocales) {
        mensajeSinLocales.classList.toggle("d-none", totalVisibles > 0);
    }
}

// Refresque automáticamente las carpetas eliminadas manualmente desde el explorador
function refrescarCarpetasDesdeServidor() {
    fetch(`${baseURL}/preview/ver-archivos.php?ruta=&_=${Date.now()}`)
        .then(res => res.json())
        .then((items) => {
            const nuevasCarpetas = items
                .filter(i => i.endsWith("/"))
                .map(i => i.slice(0, -1))
                .filter(nombre =>
                    !carpetasOcultasSistema.includes(nombre) &&
                    !nombre.startsWith('.')
                );

            const anteriores = window.carpetasDisponibles || [];
            const carpetasEliminadas = anteriores.filter(c => !nuevasCarpetas.includes(c));
            const carpetasNuevas = nuevasCarpetas.filter(c => !anteriores.includes(c));

            const cambio = carpetasEliminadas.length > 0 || carpetasNuevas.length > 0;

            if (cambio) {
                window.carpetasDisponibles = nuevasCarpetas;
                renderCarpetas();
                updateFavorites();

                if (carpetasNuevas.length > 0) {
                    showToast(
                        `📁 Se agregó ${carpetasNuevas.length} carpeta(s) desde el explorador`,
                        "info",
                        "custom-info"
                    );
                }

                if (carpetasEliminadas.length > 0) {
                    showToast(
                        `🗑️ Se detectó la eliminación de ${carpetasEliminadas.length} carpeta(s) desde el explorador`,
                        "warning",
                        "custom-warning"
                    );
                }
            }
        })
        .catch(() => {
            console.warn("No se pudo refrescar carpetas desde el servidor.");
        });
}


// Simula grid con Skeleton loading
function mostrarSkeletons() {
    const grid = document.getElementById("folderGrid");
    grid.innerHTML = "";

    const mensajeSinLocales = document.getElementById("mensajeSinLocales");
    if (mensajeSinLocales) {
        mensajeSinLocales.classList.add("d-none"); // ocultar el mensaje temporalmente
    }

    for (let i = 0; i < 4; i++) {
        const col = document.createElement("div");
        col.className = "col-md-3 col-sm-6";

        const card = document.createElement("div");
        card.className = "skeleton-card skeleton";

        col.appendChild(card);
        grid.appendChild(col);
    }
}


// Dibuja las carpetas favoritas en el grid superior
function updateFavorites(folderAnimado = null) {
    const countSpan = document.getElementById("favoritesCount");
    const favs = JSON.parse(localStorage.getItem(claveFavoritos) || "[]");
    const favList = document.getElementById("favoritesList");
    const btnQuitar = document.getElementById("btnQuitarFavoritos");
    favList.innerHTML = "";
    countSpan.textContent = favs.length;
    renderCarpetas(folderAnimado);
    if (btnQuitar) btnQuitar.style.display = favs.length > 0 ? "inline-block" : "none";

    favs.forEach((folder) => {
        const item = document.createElement("div");
        item.className = "col-md-3 col-sm-6";

        const card = document.createElement("div");
        card.className = "card shadow-sm p-3 cursor-pointer";
        card.dataset.folder = folder;
        card.onclick = (e) => abrirCarpeta(e, folder);

        const header = document.createElement("div");
        header.className = "d-flex align-items-center mb-2";

        const iconFolder = document.createElement("i");
        iconFolder.className = "fas fa-folder text-warning me-2 fs-4";

        const name = document.createElement("strong");
        name.className = "flex-grow-1";
        // name.textContent = folder;

        const urls = JSON.parse(localStorage.getItem(claveURLs) || "{}");
        const tieneURL = urls[folder];

        name.innerHTML = tieneURL
            ? `${folder} <i class="fas fa-link text-info ms-1" data-bs-toggle="tooltip" title="URL personalizada activa"></i>`
            : folder;


        header.appendChild(iconFolder);
        header.appendChild(name);

        const controls = document.createElement("div");
        controls.className = "d-flex justify-content-between";

        const icons = [
            { icon: "fa-folder-open d-none d-md-inline", title: "Abrir carpeta en Windows", action: () => abrirEnWindows(folder) },
            { icon: "fa-search", title: "Vista previa", action: () => verContenidoCarpeta(folder) },
            { icon: "fab fa-wordpress", title: "Instalar WordPress", action: () => instalarWordPress(folder) },
            { icon: "fa-folder-minus text-danger", title: "Quitar de favoritos", action: (e) => removeFavorite(e, folder) },
        ];

        icons.forEach(({ icon, title, action }) => {
            const i = document.createElement("i");
            i.className = `fas ${icon}`;
            i.dataset.bsToggle = "tooltip";
            i.dataset.bsPlacement = "bottom";
            i.title = title;
            i.onclick = (e) => {
                e.stopPropagation();
                const tip = bootstrap.Tooltip.getInstance(i);
                if (tip) tip.hide();
                action(e);
            };
            controls.appendChild(i);
        });

        card.appendChild(header);
        card.appendChild(controls);
        item.appendChild(card);
        if (folder === folderAnimado) {
            requestAnimationFrame(() => item.classList.add("fade-in"));
        }
        favList.appendChild(item);
        activarTooltips(item);
    });

    const mensajeSinFavs = document.getElementById("mensajeSinFavoritos");
    if (mensajeSinFavs) {
        mensajeSinFavs.classList.toggle("d-none", favs.length > 0);
    }
}

// Sincroniza los textos de los botones con el estado del modo oscuro
function actualizarTextoModo() {
    const isDark = document.body.classList.contains("dark");
    const hayPreferenciaManual = localStorage.getItem(claveModoOscuro) !== null;

    // BOTÓN SUPERIOR (Dropdown de escritorio)
    const icono = document.getElementById("modoDropdownBtn");
    if (icono) {
        icono.textContent = hayPreferenciaManual
            ? (isDark ? "🌙" : "☀️")
            : "🌗";
        icono.classList.remove("btn-light", "btn-dark");
        icono.classList.add(isDark ? "btn-dark" : "btn-light");
        icono.classList.add("animar-icono");
        setTimeout(() => icono.classList.remove("animar-icono"), 400);
    }

    // BOTÓN EN OFFCANVAS
    const offBtn = document.getElementById("modoOffcanvasBtn");
    if (offBtn) {
        if (!hayPreferenciaManual) {
            offBtn.textContent = "🌗 Modo Automático";
        } else {
            offBtn.textContent = isDark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
        }

        // Cambiar color del botón para que combine
        offBtn.classList.remove("btn-light", "btn-dark");
        offBtn.classList.add(isDark ? "btn-dark" : "btn-light");

        // (Opcional) Animación
        offBtn.classList.add("animar-icono");
        setTimeout(() => offBtn.classList.remove("animar-icono"), 400);
    }

    // ACTIVAR OPCIÓN EN EL DROPDOWN
    const claro = document.getElementById("opcionModoClaro");
    const oscuro = document.getElementById("opcionModoOscuro");
    const auto = document.getElementById("opcionModoAuto");

    [claro, oscuro, auto].forEach(op => op?.classList.remove("active"));

    if (!hayPreferenciaManual) {
        auto?.classList.add("active");
    } else if (isDark) {
        oscuro?.classList.add("active");
    } else {
        claro?.classList.add("active");
    }
}


// Activar modos de pantalla
function activarModoClaro() {
    document.body.classList.remove("dark");
    localStorage.setItem(claveModoOscuro, "false");
    actualizarTextoModo();
    showToast("Modo claro activado ☀️", "info", "custom-info");
}

function activarModoOscuro() {
    document.body.classList.add("dark");
    localStorage.setItem(claveModoOscuro, "true");
    actualizarTextoModo();
    showToast("Modo oscuro activado 🌙", "info", "custom-info");
}

function activarModoAutomatico() {
    localStorage.removeItem(claveModoOscuro); // borra preferencia
    modoAutoPorHora();                        // aplica según hora actual
    actualizarTextoModo();                    // actualiza textos
    showToast("Modo automático activado 🌗", "info", "custom-info");
}

// Cambia entre modo claro y oscuro, actualiza íconos y textos
function toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark");

    // Guardar el nuevo estado con clave por carpeta
    localStorage.setItem(claveModoOscuro, isDark);

    // Actualizar todos los textos e íconos de modo
    actualizarTextoModo();
}

// Automáticamente cambia el modo claro y modo oscuro por horas
function modoAutoPorHora() {
    const hora = new Date().getHours();
    const esDeNoche = hora >= 19 || hora < 7;

    const forzadoUsuario = localStorage.getItem(claveModoOscuro); // "true" o "false" o null
    const yaTieneDark = document.body.classList.contains("dark");

    if (forzadoUsuario === null) {
        // Solo aplicar si el usuario no ha forzado manualmente
        if (esDeNoche && !yaTieneDark) {
            document.body.classList.add("dark");
        } else if (!esDeNoche && yaTieneDark) {
            document.body.classList.remove("dark");
        }
        actualizarTextoModo();
    }
}

// Cierra cualquier modal abierto y luego muestra el contenido de otra carpeta
function cerrarYVer(ruta) {
    // Quitar el foco antes de cerrar
    document.activeElement?.blur();
    // Cerrar todos los modales visibles con una promesa
    const cerrarModales = Array.from(
        document.querySelectorAll(".modal.show")
    ).map((modal) => {
        return new Promise((resolve) => {
            const instancia = bootstrap.Modal.getInstance(modal);
            if (instancia) {
                modal.addEventListener(
                    "hidden.bs.modal",
                    () => {
                        modal.remove();
                        resolve();
                    },
                    {
                        once: true,
                    }
                );
                instancia.hide();
            } else {
                modal.remove();
                resolve();
            }
        });
    });
    // Cuando todos se hayan cerrado, abrir el nuevo
    Promise.all(cerrarModales).then(() => {
        verContenidoCarpeta(ruta);
    });
}

// Solicita al servidor el contenido de una carpeta y muestra un modal con su vista previa
function verContenidoCarpeta(ruta = "") {
    fetch(`${baseURL}/preview/ver-archivos.php?ruta=${encodeURIComponent(ruta)}&_=${Date.now()}`)
        .then((res) => res.text())
        .then((text) => {
            let data;
            try {
                data = JSON.parse(text);
            } catch (error) {
                console.error("❌ No se pudo interpretar la respuesta:", text);
                Swal.fire({
                    icon: "error",
                    title: "Error al leer los archivos",
                    html: "La respuesta del servidor no se pudo interpretar correctamente.<br>Revisa el archivo <code>ver-archivos.php</code> o si el servidor está activo.",
                });
                return;
            }

            const modal = document.createElement("div");
            modal.className = "modal fade";
            modal.tabIndex = -1;

            const dialog = document.createElement("div");
            dialog.className = "modal-dialog modal-lg modal-dialog-scrollable";

            const content = document.createElement("div");
            content.className = "modal-content";

            const header = document.createElement("div");
            header.className = "modal-header";
            const title = document.createElement("h5");
            title.className = "modal-title";
            title.textContent = `Vista previa de: ${ruta || "📁 Raíz"}`;
            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.className = "btn-close";
            closeBtn.setAttribute("data-bs-dismiss", "modal");
            closeBtn.setAttribute("aria-label", "Cerrar");
            header.appendChild(title);
            header.appendChild(closeBtn);

            const body = document.createElement("div");
            body.className = "modal-body";

            const breadcrumb = document.createElement("nav");
            breadcrumb.setAttribute("aria-label", "breadcrumb");
            const ol = document.createElement("ol");
            ol.className = "breadcrumb mb-3";

            const liRaiz = document.createElement("li");
            liRaiz.className = "breadcrumb-item";
            const linkRaiz = document.createElement("a");
            linkRaiz.href = "#";
            linkRaiz.onclick = (e) => {
                e.preventDefault();
                cerrarYVer("");
            };
            linkRaiz.textContent = "📁 Localhost";
            liRaiz.appendChild(linkRaiz);
            ol.appendChild(liRaiz);

            let rutaAcumulada = "";
            const partes = ruta.split("/").filter(Boolean);
            partes.forEach((parte, i) => {
                rutaAcumulada += (rutaAcumulada ? "/" : "") + parte;
                const li = document.createElement("li");
                li.className = "breadcrumb-item";
                if (i === partes.length - 1) {
                    li.classList.add("active");
                    li.setAttribute("aria-current", "page");
                    li.innerHTML = `<i class='fas fa-folder-open me-1'></i>${parte}`;
                } else {
                    const a = document.createElement("a");
                    a.href = "#";
                    a.innerHTML = `<i class='fas fa-folder me-1'></i>${parte}`;
                    a.onclick = (e) => {
                        e.preventDefault();
                        cerrarYVer(rutaAcumulada);
                    };
                    li.appendChild(a);
                }
                ol.appendChild(li);
            });

            breadcrumb.appendChild(ol);
            body.appendChild(breadcrumb);

            const lista = document.createElement("ul");
            lista.className = "list-group";
            lista.id = "listaContenidoCarpeta";
            body.appendChild(lista);

            if (data.length === 0) {
                const li = document.createElement("li");
                li.className = "list-group-item";
                li.textContent = "📂 Esta carpeta está vacía";
                lista.appendChild(li);
            } else {
                const carpetas = data.filter((n) => n.endsWith("/"));
                const archivos = data.filter((n) => !n.endsWith("/"));
                [...carpetas, ...archivos].forEach((nombre) => {
                    const item = document.createElement("li");
                    item.className = "list-group-item d-flex justify-content-between align-items-center";
                    const esCarpeta = nombre.endsWith("/");

                    if (esCarpeta) {
                        const div = document.createElement("div");
                        div.innerHTML = `<i class='fas fa-folder text-warning me-2'></i><strong>${nombre.replace("/", "")}</strong>`;
                        const btn = document.createElement("button");
                        btn.className = "btn btn-sm btn-outline-primary";
                        btn.innerHTML = '<i class="fas fa-eye"></i> Ver carpeta';
                        btn.onclick = () => {
                            const nuevaRuta = (ruta ? ruta + "/" : "") + nombre.replace("/", "");
                            bootstrap.Modal.getInstance(modal).hide();
                            modal.remove();
                            verContenidoCarpeta(nuevaRuta);
                        };
                        item.appendChild(div);
                        item.appendChild(btn);
                    } else {
                        const urlArchivo = (ruta ? ruta + "/" : "") + nombre;
                        const extension = nombre.split(".").pop().toLowerCase();
                        const icono = obtenerIconoPorExtension(extension);

                        if (extension === "pdf") {
                            const div = document.createElement("div");
                            div.className = "d-flex align-items-center justify-content-between w-100";
                            div.innerHTML = `
                <div><i class="fas ${icono} me-2"></i>${nombre}</div>
                <button class="btn btn-sm btn-outline-danger" onclick="mostrarArchivoEnModal('${urlArchivo}', '${extension}')">
                  <i class="fas fa-eye"></i> Ver PDF
                </button>`;
                            item.appendChild(div);
                        } else {
                            const a = document.createElement("a");
                            a.href = urlArchivo;
                            a.target = "_blank";
                            a.className = "text-decoration-none text-reset w-100 d-flex align-items-center justify-content-between";
                            a.innerHTML = `
                <div><i class="fas ${icono} me-2"></i>${nombre}</div>
                <i class="fas fa-up-right-from-square text-muted"></i>`;
                            item.appendChild(a);
                        }
                    }

                    lista.appendChild(item);
                });
            }

            const footer = document.createElement("div");
            footer.className = "modal-footer";
            if (ruta) {
                const btnAtras = document.createElement("button");
                btnAtras.className = "btn btn-outline-secondary";
                btnAtras.textContent = "⬅️ Atrás";
                btnAtras.onclick = () => cerrarYVer(partes.slice(0, -1).join("/"));
                footer.appendChild(btnAtras);
            }
            const btnCerrar = document.createElement("button");
            btnCerrar.className = "btn btn-secondary";
            btnCerrar.textContent = "Cerrar";
            btnCerrar.setAttribute("data-bs-dismiss", "modal");
            footer.appendChild(btnCerrar);

            content.appendChild(header);
            content.appendChild(body);
            content.appendChild(footer);
            dialog.appendChild(content);
            modal.appendChild(dialog);
            document.body.appendChild(modal);

            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            modal.addEventListener("hidden.bs.modal", () => modal.remove());
        });
}


// Muestra el contenido de un archivo dentro de un modal (PDF, imagen, texto plano)
function mostrarArchivoEnModal(url, extension) {
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.tabIndex = -1;

    const dialog = document.createElement("div");
    dialog.className = "modal-dialog modal-lg modal-dialog-scrollable";

    const content = document.createElement("div");
    content.className = "modal-content";

    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h5");
    title.className = "modal-title";
    title.textContent = "Vista previa del archivo";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-close";
    closeBtn.setAttribute("data-bs-dismiss", "modal");
    closeBtn.setAttribute("aria-label", "Cerrar");

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "modal-body text-center";

    let contenido;
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
        const img = document.createElement("img");
        img.src = url;
        img.className = "img-fluid";
        img.alt = "Vista previa";
        contenido = img;
    } else if (extension === "pdf") {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.width = "100%";
        iframe.height = "500px";
        iframe.style.border = "none";
        contenido = iframe;
    } else {
        const mensaje = document.createElement("p");
        mensaje.textContent = `No se puede previsualizar este tipo de archivo.`;
        contenido = mensaje;
    }

    body.appendChild(contenido);

    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const cerrarBtn = document.createElement("button");
    cerrarBtn.type = "button";
    cerrarBtn.className = "btn btn-secondary";
    cerrarBtn.setAttribute("data-bs-dismiss", "modal");
    cerrarBtn.textContent = "Cerrar";

    footer.appendChild(cerrarBtn);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);

    dialog.appendChild(content);
    modal.appendChild(dialog);

    document.body.appendChild(modal);

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    modal.addEventListener("hidden.bs.modal", () => modal.remove());
}

// ============================== //
// 📁 Acciones sobre carpetas
// ============================== //

// Muestra un popup para crear una nueva carpeta y la envía como formulario
function crearCarpeta() {
    let resultadoSwal = null;

    Swal.fire({
        title: "Crear nueva carpeta",
        input: "text",
        inputLabel: "Nombre de la carpeta",
        inputPlaceholder: "Ej: proyecto-landing",
        showCancelButton: true,
        confirmButtonText: "Crear",
        cancelButtonText: "Cancelar",
        didOpen: () => {
            const input = Swal.getInput();
            if (input) {
                input.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        Swal.clickConfirm();
                    }
                });
            }
        },
        inputValidator: (value) => {
            const nombre = value.trim();
            const input = Swal.getInput();

            if (!nombre) {
                if (input) {
                    input.style.border = "1px solid #dc3545";
                    input.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
                }
                const modal = Swal.getPopup();
                if (modal) {
                    modal.classList.remove("shake-error");
                    void modal.offsetWidth;
                    modal.classList.add("shake-error");
                }
                return "Debes ingresar un nombre";
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(nombre))
                return "Solo letras, números, guiones o guiones bajos";

            if (window.carpetasDisponibles.includes(nombre))
                return `Ya existe una carpeta llamada "${nombre}"`;
        }
    })
        .then((result) => {
            resultadoSwal = result;
            if (!result.isConfirmed) return;

            const nombreCarpeta = result.value.trim();

            return fetch(window.location.pathname, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    action: "create",
                    folderName: nombreCarpeta,
                }),
            }).then(() => {
                return fetch(`${baseURL}/preview/ver-archivos.php?ruta=&_=${Date.now()}`)
                    .then((res) => res.json())
                    .then((items) => {
                        const carpetasFiltradas = items
                            .filter(item => item.endsWith("/"))
                            .map(c => c.slice(0, -1))
                            .filter(nombre =>
                                !carpetasOcultasSistema.includes(nombre) &&
                                !nombre.startsWith('.')
                            );

                        window.carpetasDisponibles = carpetasFiltradas;
                        renderCarpetas(nombreCarpeta);

                        const tarjeta = document.querySelector(`[data-folder="${nombreCarpeta}"]`);
                        if (tarjeta) {
                            tarjeta.classList.add("carpeta-nueva");
                            setTimeout(() => tarjeta.classList.remove("carpeta-nueva"), 4000);
                        }

                        showToast(`Carpeta "${nombreCarpeta}" creada`, "success", "custom-success");
                    }).catch(() => {
                        showToast("❌ No se pudo conectar al servidor. Verifica tu conexión a Internet.", "error", "custom-error");
                    });
            });
        })
        .finally(() => {
            if (!resultadoSwal?.isConfirmed) {
                const modal = Swal.getPopup();
                if (modal) {
                    modal.classList.remove("shake-error");
                    modal.style.animation = '';
                }
            }
        });
}

// Muestra un prompt para renombrar una carpeta y envía el formulario al servidor
//function renameFolder(folder) {
function renameFolder(folder, onCancel = null) {
    const claveURLs = `urlsPersonalizadas-${basePath}`;
    const urlsGuardadas = JSON.parse(localStorage.getItem(claveURLs) || "{}");
    const urlActual = urlsGuardadas[folder] || "";

    let resultadoSwal = null;

    Swal.fire({
        title: "Editar carpeta",
        html: `
                <div class="form-check text-start ms-1 mt-2">
                <input id="nuevoNombreInput" class="swal2-input" placeholder="Nombre de carpeta" value="${folder}">
                </div>
                <hr class="divider mt-3">
                <div class="form-check d-flex align-items-center justify-content-center mt-3 me-4">
                    <input type="checkbox" class="form-check-input me-2" id="activarURL" ${urlActual ? "checked" : ""}>
                    <label class="form-check-label" for="activarURL">Asignar URL personalizada</label>
                </div>
                <hr class="divider mt-3">
                <div class="form-check text-start ms-1 mt-2">
                <input id="inputURL" class="swal2-input mt-2" placeholder="https://tusitio.test" value="${urlActual}" style="display:${urlActual ? "block" : "none"};">
                </div>
            `,
        footer: `
            <div class="text-start text-center me-3">
              <div id="estadoURL" class="me-2" style="color: gray; display: ${urlActual ? 'block' : 'none'}">Validando URL...</div>
            </div>
          `,

        showCancelButton: true,
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: () => !Swal.isLoading(),

        didOpen: () => {

            const inputNombre = document.getElementById("nuevoNombreInput");
            const chk = document.getElementById("activarURL");
            const inputURL = document.getElementById("inputURL");
            const estadoURL = document.getElementById("estadoURL");

            // ENTER en ambos inputs
            ["nuevoNombreInput", "inputURL"].forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            Swal.clickConfirm();
                        }
                    });
                }
            });

            // Mostrar/ocultar campo de URL
            chk.addEventListener("change", () => {

                estadoValidoURL = !chk.checked; // si se desmarca, no requiere validar
                Swal.getConfirmButton().disabled = chk.checked;

                const visible = chk.checked;
                inputURL.style.display = visible ? "block" : "none";
                estadoURL.style.display = visible ? "block" : "none";

                if (visible) {
                    validarURL(inputURL.value);
                    inputURL.focus();
                }

            });

            // Validar mientras escribe
            // inputURL.addEventListener("input", () => {
            //     validarURL(inputURL.value);
            // });

            const validarURLConRetraso = debounce(() => validarURL(inputURL.value), 500);
            inputURL.addEventListener("input", validarURLConRetraso);


            // Validar inmediatamente si ya estaba activado al abrir
            if (chk.checked && inputURL.value.trim()) {
                inputURL.style.display = "block";
                estadoURL.style.display = "block";
                validarURL(inputURL.value);
            }

            // Foco inicial en input de nombre
            if (inputNombre) {
                inputNombre.focus();
                const val = inputNombre.value;
                inputNombre.value = "";
                inputNombre.value = val;
            }
        },


        preConfirm: () => {

            const inputEl = document.getElementById("nuevoNombreInput");
            const nuevo = inputEl.value.trim();
            const usarURL = document.getElementById("activarURL").checked;
            const url = document.getElementById("inputURL").value.trim();
            const modal = Swal.getPopup();

            if (!nuevo) {
                Swal.showValidationMessage("Debes ingresar un nuevo nombre");
                inputEl.style.border = "1px solid #dc3545";
                inputEl.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
                modal.classList.remove("shake-error");
                void modal.offsetWidth;
                modal.classList.add("shake-error");
                return false;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(nuevo)) {
                Swal.showValidationMessage("Solo letras, números, guiones o guiones bajos");
                inputEl.style.border = "1px solid #dc3545";
                inputEl.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
                modal.classList.remove("shake-error");
                void modal.offsetWidth;
                modal.classList.add("shake-error");
                return false;
            }

            // if (nuevo === folder && (!usarURL || url === urlActual)) {
            // if (nuevo === folder && url === urlActual) {
            if (nuevo === folder && url === urlActual && usarURL === Boolean(urlActual)) {
                Swal.showValidationMessage("No hiciste ningún cambio");

                inputEl.style.border = "1px solid #dc3545";
                inputEl.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";

                const inputURL = document.getElementById("inputURL");
                if (usarURL && inputURL) {
                    inputURL.style.border = "1px solid #dc3545";
                    inputURL.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
                }

                modal.classList.remove("shake-error");
                void modal.offsetWidth;
                modal.classList.add("shake-error");
                return false;
            }


            if (usarURL && !/^https?:\/\/[^ "]+$/.test(url)) {
                Swal.showValidationMessage("Ingresa una URL válida (https://sitio.test)");
                document.getElementById("inputURL").style.border = "1px solid #dc3545";
                modal.classList.remove("shake-error");
                void modal.offsetWidth;
                modal.classList.add("shake-error");
                return false;
            }

            if (usarURL && !estadoValidoURL) {
                Swal.showValidationMessage("No puedes guardar una URL inválida o inactiva");
                return false;
            }

            // Verificar si ya existe otra carpeta con ese nombre
            if (
                nuevo !== folder &&
                window.carpetasDisponibles.includes(nuevo)
            ) {
                Swal.showValidationMessage(`Ya existe una carpeta llamada "${nuevo}"`);
                inputEl.style.border = "1px solid #dc3545";
                inputEl.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
                modal.classList.remove("shake-error"); void modal.offsetWidth;
                modal.classList.add("shake-error");
                return false;
            }

            return { nuevo, usarURL, url };
        }
    }).then((result) => {
        resultadoSwal = result;
        if (!result.isConfirmed) return;

        const { nuevo, usarURL, url } = result.value;

        // Enviar cambio al backend
        fetch(window.location.pathname, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "rename",
                oldName: folder,
                newName: nuevo,
            }),
        }).then(() => {
            return fetch(`${baseURL}/preview/ver-archivos.php?ruta=&_=${Date.now()}`)
                .then(res => res.json())
                .then(items => {
                    const carpetasFiltradas = items
                        .filter(item => item.endsWith("/"))
                        .map(c => c.slice(0, -1))
                        .filter(nombre => !carpetasOcultasSistema.includes(nombre) && !nombre.startsWith('.'));

                    window.carpetasDisponibles = carpetasFiltradas;
                    renderCarpetas(nuevo);
                    updateFavorites(); // si también quieres que se actualicen íconos en favoritos
                    activarTooltips(); // para que los nuevos tooltips funcionen

                    // Guardar URL si se activó
                    // Si renombraste, transfiere la URL personalizada si existía
                    if (nuevo !== folder) {
                        if (urlsGuardadas[folder]) {
                            delete urlsGuardadas[folder]; // Elimina la antigua
                        }
                    }

                    // Guardar o quitar la URL con el nuevo nombre
                    if (usarURL) {
                        urlsGuardadas[nuevo] = url;
                    } else {
                        delete urlsGuardadas[nuevo];
                    }

                    localStorage.setItem(claveURLs, JSON.stringify(urlsGuardadas));

                    // Detectar qué cambió
                    const renombrado = nuevo !== folder;
                    const urlExistíaAntes = Boolean(urlActual);
                    const urlExistiráAhora = usarURL;
                    const urlCambio = url !== urlActual;

                    const urlAgregada = !urlExistíaAntes && urlExistiráAhora;
                    const urlEliminada = urlExistíaAntes && !urlExistiráAhora;
                    const urlModificada = urlExistíaAntes && urlExistiráAhora && urlCambio;


                    // Siempre volver a renderizar para reflejar íconos o cambios
                    renderCarpetas(nuevo);
                    updateFavorites();
                    activarTooltips();

                    // Activamos el efecto a la carpeta modificada
                    const tarjeta = document.querySelector(`[data-folder="${nuevo}"]`);

                    if (tarjeta) {
                        tarjeta.classList.add("carpeta-renombrada");
                        setTimeout(() => tarjeta.classList.remove("carpeta-renombrada"), 4000);
                    }

                    // Mensaje según el cambio real
                    if (renombrado && urlAgregada) {
                        showToast(`Carpeta renombrada y se asignó una URL personalizada`, "info", "custom-info");
                    } else if (renombrado && urlEliminada) {
                        showToast(`Carpeta renombrada y se eliminó su URL personalizada`, "info", "custom-info");
                    } else if (renombrado && urlModificada) {
                        showToast(`Carpeta renombrada y se actualizó su URL personalizada`, "info", "custom-info");
                    } else if (renombrado) {
                        showToast(`Carpeta renombrada a "${nuevo}"`, "info", "custom-info");
                    } else if (urlAgregada) {
                        showToast(`Se asignó una URL personalizada`, "success", "custom-success");
                    } else if (urlModificada) {
                        showToast(`Se actualizó la URL personalizada`, "success", "custom-success");
                    } else if (urlEliminada) {
                        showToast(`Se eliminó la URL personalizada`, "warning", "custom-warning");
                    }


                });
        }).catch((error) => {
            console.error("Error en renameFolder:", error);
            showToast("❌ Ocurrió un error inesperado al renombrar", "error", "custom-error");
        });
    }).finally(() => {
        const modal = Swal.getPopup();
        if (modal) {
            modal.classList.remove("shake-error");
            modal.style.animation = '';
        }
        if (!resultadoSwal?.isConfirmed && typeof onCancel === "function") {
            onCancel();
        }
    });
}

// Muestra confirmación para eliminar una carpeta y envía el formulario
function deleteFolder(folder) {
    Swal.fire({
        title: `¿Eliminar la carpeta "${folder}"?`,
        html: `
        <p class="mb-2">Esta acción no se puede deshacer.</p>
        <p class="text-muted mb-2">Escribe <strong>eliminar</strong> para confirmar.</p>
        <input type="text" id="confirmInput" class="swal2-input" placeholder="Escribe: eliminar">
      `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Eliminar carpeta",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        didOpen: () => {
            const input = document.getElementById("confirmInput");
            const confirmBtn = Swal.getConfirmButton();
            confirmBtn.disabled = true;

            if (input) {
                input.focus();
                input.addEventListener("input", () => {
                    confirmBtn.disabled = input.value.trim().toLowerCase() !== "eliminar";
                });

                input.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        if (input.value.trim().toLowerCase() === "eliminar") {
                            Swal.clickConfirm();
                        } else {
                            input.style.border = "1px solid #dc3545";
                            input.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,0.25)";
                            const modal = Swal.getPopup();
                            if (modal) {
                                modal.classList.remove("shake-error");
                                void modal.offsetWidth;
                                modal.classList.add("shake-error");
                            }
                        }
                    }
                });
            }
        }
    }).then((result) => {
        if (!result.isConfirmed) return;

        // Mostrar barra de progreso
        Swal.fire({
            title: "Eliminando carpeta...",
            html: `
            <p class="mb-2 mb-3">Esto puede tardar unos segundos si contiene muchos archivos. ⏳</p>
          <div class="progress" style="height: 25px;">
            <div id="barraProgreso" class="progress-bar bg-danger" role="progressbar" style="width: 0%">0%</div>
          </div>
        `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Iniciar eliminación en backend
        fetch(`${baseURL}/app/eliminar-carpeta-progresivo.php?carpeta=${encodeURIComponent(folder)}`);

        // Consultar progreso
        const barra = () => document.getElementById("barraProgreso");
        let intentosFallidos = 0;
        const maxIntentos = 20;

        const interval = setInterval(() => {
            fetch(`${baseURL}/app/progreso-carpeta.php?carpeta=${encodeURIComponent(folder)}`)
                .then(async (res) => {
                    const text = await res.text();
                    try {
                        return JSON.parse(text);
                    } catch (err) {
                        intentosFallidos++;
                        if (intentosFallidos >= maxIntentos) {
                            clearInterval(interval);
                            Swal.close();
                            showToast("❌ Error al obtener progreso", "error", "custom-error");
                        }
                        return null;
                    }
                })
                .then((data) => {
                    if (!data) return;

                    const { total, actual } = data;
                    const porcentaje = Math.round((actual / total) * 100);
                    const barra = document.getElementById("barraProgreso");

                    if (barra) {
                        barra.style.width = porcentaje + "%";
                        barra.textContent = porcentaje < 100 ? `${porcentaje}%` : "Eliminado";
                        if (porcentaje >= 100) barra.classList.replace("bg-danger", "bg-success");
                    }

                    if (porcentaje >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            Swal.close();
                            window.carpetasDisponibles = window.carpetasDisponibles.filter(f => f !== folder);
                            renderCarpetas();
                            mostrarSkeletons();
                            setTimeout(() => {
                                fetch(`${baseURL}/preview/ver-archivos.php?ruta=&_=${Date.now()}`)
                                    .then(res => res.json())
                                    .then((items) => {
                                        const carpetasFiltradas = items
                                            .filter(i => i.endsWith("/"))
                                            .map(i => i.slice(0, -1))
                                            .filter(nombre =>
                                                !carpetasOcultasSistema.includes(nombre) &&
                                                !nombre.startsWith('.')
                                            );
                                        window.carpetasDisponibles = carpetasFiltradas;
                                        renderCarpetas();
                                        showToast(`Carpeta "${folder}" eliminada correctamente`, "success", "custom-success");
                                    });
                            }, 1200);
                        }, 800);
                    }
                });
        }, 300);

    });
}

// Alterna el estado de favorito de una carpeta, actualiza el localStorage y la interfaz
function toggleFavorite(folder, btn) {
    let favs = JSON.parse(localStorage.getItem(claveFavoritos) || "[]");
    const esFavorito = favs.includes(folder);
    if (esFavorito) {
        favs = favs.filter((f) => f !== folder);
        localStorage.setItem(claveFavoritos, JSON.stringify(favs));
        document.cookie = `${claveFavoritos}=` + JSON.stringify(favs) + "; path=/";
        setTimeout(() => {
            updateFavorites(folder);
        }, 10); // Pequeño delay para asegurar relectura
        showToast(
            `Carpeta "${folder}" fue quitada de favoritos.`,
            "warning",
            "custom-warning"
        );
    } else {
        // Agregar a favoritos
        favs.push(folder);
        localStorage.setItem(claveFavoritos, JSON.stringify(favs));
        document.cookie = `${claveFavoritos}=` + JSON.stringify(favs) + "; path=/";
        updateFavorites(folder); // Se actualiza primero la lista
        renderCarpetas(); // Se actualiza el grid sin la carpeta
        showToast(
            `Carpeta "${folder}" fue agregada a favoritos.`,
            "success",
            "custom-success"
        );
    }
}

// Quita una carpeta de favoritos desde el botón de la tarjeta
function removeFavorite(event, folder) {
    event.stopPropagation();
    let favs = JSON.parse(localStorage.getItem(claveFavoritos) || "[]");
    favs = favs.filter((f) => f !== folder);
    localStorage.setItem(claveFavoritos, JSON.stringify(favs));
    // Agrega este pequeño delay para asegurar sincronización
    setTimeout(() => {
        updateFavorites(folder); // <- pasamos la carpeta correctamente
    }, 10);
    showToast(
        `Carpeta "${folder}" fue quitada de favoritos`,
        "warning",
        "custom-warning"
    );
}

// Oculta una carpeta visualmente y la guarda como oculta en localStorage y cookies
function hideFolder(folder) {
    let ocultas = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
    if (!ocultas.includes(folder)) {
        ocultas.push(folder);
        localStorage.setItem(claveOcultos, JSON.stringify(ocultas));
        document.cookie = `${claveOcultos}=` + JSON.stringify(ocultas) + "; path=/";
        const cards = document.querySelectorAll(`[data-folder="${folder}"]`);
        cards.forEach((card) => {
            const contenedor = card.closest('[class^="col-"]');
            if (contenedor) contenedor.style.display = "none";
        });
        renderCarpetas();
        showToast("Carpeta Ocultada", "warning", "custom-warning");
        actualizarTextoModo(); // Usamos la nueva función
    }
}

// Muestra un modal con la lista de carpetas ocultas y permite restaurarlas
function mostrarOcultas() {
    let ocultas = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
    if (ocultas.length === 0) {
        showToast("No hay carpetas ocultas.", "info", "custom-info");
        return;
    }
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.tabIndex = -1;

    const dialog = document.createElement("div");
    dialog.className = "modal-dialog modal-dialog-scrollable";

    const content = document.createElement("div");
    content.className = "modal-content";

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `
    <h5 class="modal-title">Carpetas Ocultas</h5>
    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>`;

    const body = document.createElement("div");
    body.className = "modal-body";

    const list = document.createElement("ul");
    list.id = "hiddenFoldersList";
    list.className = "list-group mb-3";

    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const mostrarTodasBtn = document.createElement("button");
    mostrarTodasBtn.id = "mostrarTodasBtn";
    mostrarTodasBtn.className = "btn btn-outline-success";
    mostrarTodasBtn.textContent = "Mostrar todas";

    const cerrarBtn = document.createElement("button");
    cerrarBtn.className = "btn btn-secondary";
    cerrarBtn.textContent = "Cerrar";
    cerrarBtn.setAttribute("data-bs-dismiss", "modal");

    ocultas.forEach((folder) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        const folderDiv = document.createElement("div");
        folderDiv.className = "d-flex align-items-center gap-2";

        const icon = document.createElement("i");
        icon.className = "fas fa-folder text-warning";

        const span = document.createElement("span");
        span.className = "fw-bold";
        span.textContent = folder;

        folderDiv.appendChild(icon);
        folderDiv.appendChild(span);

        const btnMostrar = document.createElement("button");
        btnMostrar.className = "btn btn-sm btn-outline-primary me-2";
        btnMostrar.innerHTML = '<i class="fas fa-eye"></i> Mostrar';

        const btnOcultar = document.createElement("button");
        btnOcultar.className = "btn btn-sm btn-outline-secondary d-none";
        btnOcultar.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar';

        btnMostrar.addEventListener("click", () => {
            let actuales = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
            const nuevas = actuales.filter((f) => f !== folder);
            localStorage.setItem(claveOcultos, JSON.stringify(nuevas));
            document.cookie = "ocultas=" + JSON.stringify(nuevas) + "; path=/";
            renderCarpetas();
            updateFavorites();
            const tarjeta = document.querySelector(`[data-folder="${folder}"]`);
            if (tarjeta) {
                tarjeta.classList.add("carpeta-nueva");
                setTimeout(() => tarjeta.classList.remove("carpeta-nueva"), 4000);
            }
            showToast(`Carpeta "${folder}" restaurada`, "info", "custom-info");
            btnMostrar.classList.add("d-none");
            btnOcultar.classList.remove("d-none");
            const restantes = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
            if (restantes.length === 0) mostrarTodasBtn.style.display = "none";
        });

        btnOcultar.addEventListener("click", () => {
            let actuales = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
            if (!actuales.includes(folder)) actuales.push(folder);
            localStorage.setItem(claveOcultos, JSON.stringify(actuales));
            document.cookie = "ocultas=" + JSON.stringify(actuales) + "; path=/";
            renderCarpetas();
            updateFavorites();
            showToast(`Carpeta "${folder}" fue ocultada nuevamente`, "warning", "custom-warning");
            btnOcultar.classList.add("d-none");
            btnMostrar.classList.remove("d-none");
            mostrarTodasBtn.style.display = "inline-block";
        });

        li.appendChild(folderDiv);
        li.appendChild(btnMostrar);
        li.appendChild(btnOcultar);
        list.appendChild(li);
    });

    mostrarTodasBtn.addEventListener("click", () => {
        localStorage.setItem(claveOcultos, JSON.stringify([]));
        document.cookie = "ocultas=[]; path=/";
        renderCarpetas();
        updateFavorites();
        ocultas.forEach((folder) => {
            const tarjeta = document.querySelector(`[data-folder="${folder}"]`);
            if (tarjeta) {
                tarjeta.classList.add("carpeta-nueva");
                setTimeout(() => tarjeta.classList.remove("carpeta-nueva"), 4000);
            }
        });
        showToast("Todas las carpetas fueron restauradas", "success", "custom-success");
        bootstrap.Modal.getInstance(modal).hide();
    });

    footer.appendChild(mostrarTodasBtn);
    footer.appendChild(cerrarBtn);
    body.appendChild(list);
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    dialog.appendChild(content);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    modal.addEventListener("hidden.bs.modal", () => modal.remove());
}


// Restaura todas las carpetas ocultas
function mostrarTodasOcultas() {
    const ocultas = JSON.parse(localStorage.getItem(claveOcultos) || "[]");
    localStorage.setItem(claveOcultos, JSON.stringify([]));
    document.cookie = "ocultas=[]; path=/";
    renderCarpetas();
    updateFavorites();
    // Aplicar efecto de resaltado a todas las carpetas restauradas
    setTimeout(() => {
        ocultas.forEach((folder) => {
            const restaurada = document.querySelector(`[data-folder="${folder}"]`);
            if (restaurada) {
                restaurada.classList.add("carpeta-nueva");
                setTimeout(() => {
                    restaurada.classList.remove("carpeta-nueva");
                }, 4000);
            }
        });
    }, 300); // Espera para asegurarse que ya están en el DOM
    document.querySelector(".modal.show .btn-close")?.click();
    showToast(
        "Todas las carpetas ocultas han sido restauradas.",
        "success",
        "custom-success"
    );
}

// Elimina todos los favoritos guardados
function quitarTodosFavoritos() {
    const carpetasQuitadas = JSON.parse(localStorage.getItem(claveFavoritos) || "[]");

    if (carpetasQuitadas.length === 0) {
        showToast("No hay carpetas en favoritos.", "info", "custom-info");
        return;
    }

    // Limpiar favoritos
    localStorage.setItem(claveFavoritos, JSON.stringify([]));
    document.cookie = "favorites=[]; path=/";

    updateFavorites(); // limpia favoritos
    renderCarpetas();  // no pasamos animaciones para evitar doble clase

    // Aplicamos .carpeta-nueva manualmente con delay controlado
    setTimeout(() => {
        carpetasQuitadas.forEach((folder) => {
            const tarjeta = document.querySelector(`[data-folder="${folder}"]`);
            if (tarjeta) {
                tarjeta.classList.add("carpeta-nueva");
                setTimeout(() => tarjeta.classList.remove("carpeta-nueva"), 4000);
            }
        });
    }, 100);

    showToast("Todos los favoritos han sido eliminados.", "error", "custom-error");
}

// ============================== //
// 💻 Integración con el sistema
// ============================== //

// Llama al backend para abrir una carpeta específica en el explorador de Windows
function abrirEnWindows(folder) {
    fetch(`${baseURL}/app/abrir-carpeta.php?carpeta=${encodeURIComponent(folder)}`).then(() => {
        showToast(
            `Se abrió la carpeta "${folder}" en el explorador de Windows.`,
            "info",
            "custom-info"
        );
    });
}

// Abre la carpeta raíz de localhost sin importar dónde estés ubicado
function abrirRaizLocalhost() {
    fetch(`${baseURL}/app/abrir-carpeta.php?carpeta=root`).then(() => {
        showToast("Se abrió la carpeta raíz de localhost.", "info", "custom-info");
    });
}

window.addEventListener("resize", () => {
    const offcanvasElement = document.querySelector(".offcanvas.show");
    if (offcanvasElement && window.innerWidth >= 992) { // puedes ajustar el 992 según tu breakpoint de escritorio
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
        bsOffcanvas?.hide();
    }
});

// Permite instalar la última versión de WordPress directo a la carpeta
function instalarWordPress(folder) {
    // ✅ Verificación anticipada: ¿el servidor tiene activado ZipArchive?
    fetch(`${baseURL}/app/instalar-wordpress.php?carpeta=${encodeURIComponent(folder)}&idioma=latest&version=latest&validar=solo`)
        .then(res => res.json())
        .then(data => {
            // Si falla, mostrar tu modal personalizado con los pasos
            if (!data.success) {
                mostrarErrorBackend(data.message, "Extensión de PHP faltante");
                return;
            }

            // Si todo bien, validar si ya hay WordPress instalado o conflictos
            fetch(`${baseURL}/app/validar-wordpress.php?carpeta=${encodeURIComponent(folder)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.wordpress) {
                        Swal.fire({
                            icon: "error",
                            title: "WordPress ya está instalado",
                            html: data.message,
                            showCancelButton: true,
                            confirmButtonText: "Abrir carpeta en Explorer",
                            cancelButtonText: "Cerrar",
                            reverseButtons: true
                        }).then(result => {
                            if (result.isConfirmed) abrirEnWindows(folder);
                        });
                        return;
                    }

                    if (data.carpetaLlena && Array.isArray(data.archivos)) {
                        mostrarOpcionesInstalacion(folder, data.archivos);
                        return;
                    }
                    // Mostrar el modal normal para seleccionar idioma / versión
                    // mostrarModalInstalacion(folder);

                    const nombreFinal = folder.split("/").pop().toLowerCase();
                    if (nombreFinal === "wordpress") {
                        // ⚠️ Mostrar advertencia primero
                        mostrarAdvertenciaWordpress(folder);
                    } else {
                        // ✅ Mostrar el modal normal con idioma/versión
                        mostrarModalInstalacion(folder);
                    }
                });
        }).catch(() => {
            mostrarErrorBackend(
                "⚠️ No se pudo contactar con el servidor o la respuesta fue inválida.<br>Esto puede deberse a un error en PHP, Apache detenido o una extensión faltante como <code>ZipArchive</code>.",
                "Error inesperado del servidor"
            );
        });
}

// Modal que permite elegir el Idioma y Versión del WordPress
function mostrarModalInstalacion(folder, forzar = false, idiomaPreseleccionado = "latest", versionPreseleccionada = "latest") {
    Swal.fire({
        title: `Instalar WordPress en "${folder}"`,
        html: `
        <div class="swal2-form-group text-start mb-3">
          <label class="form-label"><i class="fa-solid fa-globe"></i> Idioma / Región</label>
          <select id="idiomaWp" class="form-select">
            <option value="latest">🌐 Español (Internacional)</option>
            <option value="es_PE">🇵🇪 Español (Perú)</option>
            <option value="es_ES">🇪🇸 Español (España)</option>
            <option value="es_MX">🇲🇽 Español (México)</option>
            <option value="en_US">🇺🇸 Inglés (EEUU)</option>
          </select>
        </div>
        <div class="swal2-form-group text-start">
          <label class="form-label"><i class="fa-solid fa-code-branch"></i> Versión</label>
          <select id="versionesWp" class="form-select" disabled>
            <option value="">⏳ Cargando versiones...</option>
          </select>
        </div>
      `,
        showCancelButton: true,
        confirmButtonText: "📥 Instalar",
        cancelButtonText: "Cancelar",
        didOpen: () => {
            // Setear idioma preseleccionado
            const selectorIdioma = document.getElementById("idiomaWp");
            if (selectorIdioma) {
                selectorIdioma.value = idiomaPreseleccionado;
            }

            // Cargar versiones
            const selectorVersion = document.getElementById("versionesWp");
            fetch(`${baseURL}/app/obtener-versiones.php`)
                .then(res => res.text())
                .then(text => {
                    try {
                        return JSON.parse(text);
                    } catch (err) {
                        mostrarErrorBackend(
                            "⚠️ No se pudo cargar la lista de versiones.<br>Se usará <code>latest</code> por defecto.",
                            "Fallo al obtener versiones"
                        );
                        return ["latest"];
                    }
                })
                .then(data => {
                    selectorVersion.innerHTML = "";
                    selectorVersion.disabled = false;
                    const ultima = data[0];
                    selectorVersion.appendChild(new Option(`latest (Recomendada - ${ultima})`, "latest"));
                    data.forEach(ver => {
                        if (ver !== ultima) {
                            selectorVersion.appendChild(new Option(ver, ver));
                        }
                    });

                    // Aplicar versión preseleccionada si existe
                    selectorVersion.value = versionPreseleccionada;
                });
        },
        preConfirm: () => {
            return {
                idioma: document.getElementById("idiomaWp").value,
                version: document.getElementById("versionesWp").value || "latest"
            };
        }
    }).then((result) => {
        if (!result.isConfirmed) return;
        const { idioma, version } = result.value;

        Swal.fire({
            title: `Descargando WordPress...`,
            html: `
          <p class="mb-2">Esto puede tardar unos segundos ⏳</p>
          <div class="progress" style="height: 25px;">
            <div id="barraInstalacion" class="progress-bar bg-success" role="progressbar" style="width: 0%">0%</div>
          </div>
        `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
                let progreso = 0;
                const barra = document.getElementById("barraInstalacion");
                const avance = setInterval(() => {
                    progreso += Math.floor(Math.random() * 8) + 3;
                    if (progreso >= 100) progreso = 100;
                    if (barra) {
                        barra.style.width = progreso + "%";
                        barra.textContent = progreso + "%";
                    }
                    if (progreso === 100) clearInterval(avance);
                }, 300);
            }
        });

        fetch(`${baseURL}/app/instalar-wordpress.php?carpeta=${encodeURIComponent(folder)}&idioma=${idioma}&version=${version}${forzar ? "&forzar=1" : ""}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire("WordPress instalado correctamente", "", "success");
                } else if (data.message.includes("No puedes instalar WordPress")) {
                    mostrarAdvertenciaWordpress(folder, idioma, version, data);
                } else if (data.message.includes("ZipArchive")) {
                    mostrarErrorBackend(data.message, "Extensión de PHP faltante");
                } else {
                    mostrarErrorBackend(data.message);
                }
            })
            .catch(() => {
                mostrarErrorBackend(
                    "❌ No se pudo contactar al servidor.<br>🌐 Verifica tu conexión.",
                    "Error de red"
                );
            });
    });
}

// Muestra modal para crear la sub carpeta cuando intento instalar WordPress en una carpeta con archivos
function mostrarModalCrearSubcarpeta(folder) {
    Swal.fire({
        icon: "question",
        title: "📂 Crear subcarpeta para instalar",
        html: `
        <p class="mb-2">Ingresa un nombre para la subcarpeta donde se instalará WordPress.</p>
      `,
        input: "text",
        inputValue: "wp",
        inputPlaceholder: "Nombre de la subcarpeta",
        inputAttributes: {
            autocapitalize: "off",
            spellcheck: "false"
        },
        showCancelButton: true,
        confirmButtonText: "📥 Instalar en subcarpeta",
        cancelButtonText: "Cancelar",
        preConfirm: (sub) => {
            const modal = Swal.getPopup();
            const nombre = sub.trim();
            const invalidos = /[\\/:*?"<>| ]/;

            if (!nombre) {
                modal.classList.remove("shake-error"); void modal.offsetWidth;
                modal.classList.add("shake-error");
                Swal.showValidationMessage("Ingresa un nombre para la subcarpeta");
                return false;
            }

            if (invalidos.test(nombre)) {
                modal.classList.remove("shake-error"); void modal.offsetWidth;
                modal.classList.add("shake-error");
                Swal.showValidationMessage("El nombre contiene caracteres no permitidos o espacios");
                return false;
            }

            if (nombre.toLowerCase() === "wordpress") {
                modal.classList.remove("shake-error"); void modal.offsetWidth;
                modal.classList.add("shake-error");
                Swal.showValidationMessage("No puedes usar el nombre 'wordpress'");
                return false;
            }

            return fetch(`${baseURL}/app/verificar-contenido.php?carpeta=${encodeURIComponent(folder + '/' + nombre)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.yaExiste) {
                        modal.classList.remove("shake-error"); void modal.offsetWidth;
                        modal.classList.add("shake-error");
                        Swal.showValidationMessage("Esa subcarpeta ya existe con contenido");
                        return false;
                    }

                    return nombre;
                })
                .catch(() => {
                    modal.classList.remove("shake-error"); void modal.offsetWidth;
                    modal.classList.add("shake-error");
                    Swal.showValidationMessage("Error al validar la subcarpeta. Intenta de nuevo.");
                    return false;
                });
        }
    }).then((result) => {
        if (Swal.getPopup()) Swal.getPopup().classList.remove("shake-error");

        if (result.isConfirmed && result.value) {
            const rutaCompleta = `${folder}/${result.value}`;
            instalarWordPress(rutaCompleta);
        }
    });
}

// Muestra el modal con las opciones de instalación
function mostrarOpcionesInstalacion(folder, archivos) {
    const primeros = archivos.slice(0, 3);

    let lista = primeros.map(f => {
        const ext = f.split('.').pop();
        const icono = obtenerIconoPorExtension(ext);
        return `<li><i class="fa-solid ${icono} me-1"></i> ${f}</li>`;
    }).join("");

    if (archivos.length > 3) {
        lista += `<li>… y ${archivos.length - 3} más</li>`;
    }

    Swal.fire({
        icon: "warning",
        title: "⚠️ La carpeta contiene archivos",
        html: `
        <p>Se encontraron archivos no relacionados con <span class='badge bg-primary'>WordPress</span></p>
        <hr class='divider'>
        <ul class='mt-2 mb-1 list-unstyled' style='padding-left: 1.2rem; font-size: 0.9rem;'>${lista}</ul>
        <hr class='divider'>
        <p class='fw-bold'>¿Qué deseas hacer?</p>
      `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "📂 Crear subcarpeta",
        denyButtonText: "📥 Instalar de todas formas",
        cancelButtonText: "Cancelar"
    }).then(result => {
        if (result.isConfirmed) {
            mostrarModalCrearSubcarpeta(folder);
        } else if (result.isDenied) {
            const nombreFinal = folder.split("/").pop().toLowerCase();
            if (nombreFinal === "wordpress") {
                // Mostrar advertencia por nombre prohibido primero
                mostrarAdvertenciaWordpress(folder);
            } else {
                // Mostrar directamente el modal normal
                mostrarModalInstalacion(folder, true);
            }
        }
    });
}

// Mostrar Avertencia de WordPress de manera Forzada
function mostrarAdvertenciaWordpress(folder, idioma = "latest", version = "latest", data = {}) {
    if (data.message && data.message.includes("ZipArchive")) {
        mostrarErrorBackend(data.message, "Extensión de PHP faltante");
        return;
    }
    Swal.fire({
        icon: "warning",
        title: "⚠️ Carpeta no recomendada",
        html: `
          <p><b>Error:</b> No puedes instalar WordPress en una carpeta llamada
          <span class="badge bg-danger">wordpress</span></p>
          <p>Esto causaría una estructura duplicada como
          <code>wordpress/wordpress/</code> y una instalación corrupta.</p>
          <p>Por favor, usa un nombre distinto como
          <span class="badge bg-primary">mi-wordpress</span> o
          <span class="badge bg-secondary">sitio-wp</span>.</p>
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "📥 Instalar de todas formas",
        denyButtonText: "✏️ Cambiar nombre",
        cancelButtonText: "Cancelar",
        reverseButtons: false
    }).then(result => {
        if (result.isConfirmed) {
            // ✅ Ahora sí mostramos el modal de idioma y versión
            mostrarModalInstalacion(folder, true, idioma, version);
        } else if (result.isDenied) {
            renameFolder(folder, () => {
                mostrarAdvertenciaWordpress(folder, idioma, version);
            });
        }
    });
}

// Mostrar errores de los archivos php directamente
function mostrarErrorBackend(mensaje, titulo = "Error del servidor") {
    Swal.fire({
        icon: "error",
        title: titulo,
        html: mensaje,
        confirmButtonText: "Cerrar",
        customClass: {
            popup: "swal2-modal-carpetas"
        }
    });
}

// Valida la URL si existe y responde automáticamente abajo del input
function validarURL(url) {
    const estadoURL = document.getElementById("estadoURL");
    const input = document.getElementById("inputURL");
    const confirmBtn = Swal.getConfirmButton();
    if (!estadoURL || !input || !confirmBtn) return;

    const resultado = validarFormatoVisualURL(url);

    if (!resultado.valido) {
        estadoURL.textContent = resultado.mensaje;
        estadoValidoURL = false;
        confirmBtn.disabled = true;

        if (
            resultado.mensaje.includes("✏️") ||
            resultado.mensaje.includes("⏳") ||
            resultado.mensaje.includes("verificar")
        ) {
            // Mensaje neutro
            estadoURL.style.color = "gray";
            input.style.border = "";
            input.style.boxShadow = "";
        } else if (
            resultado.mensaje.includes("⚠️")
        ) {
            // Advertencia → amarillo
            estadoURL.style.color = "#e0a800";
            input.style.border = "1px solid #e0a800";
            input.style.boxShadow = "0 0 0 0.2rem rgba(220, 195, 53, 0.25)";
        } else {
            // Error real → rojo
            estadoURL.style.color = "#dc3545";
            input.style.border = "1px solid #dc3545";
            input.style.boxShadow = "0 0 0 0.2rem rgba(220,53,69,.25)";
        }

        return;
    }


    // 🕐 Verificando en backend
    estadoURL.textContent = "⏳ Verificando...";
    estadoURL.style.color = "gray";
    input.style.border = "";
    input.style.boxShadow = "";
    estadoValidoURL = false;
    confirmBtn.disabled = true;

    fetch(`${baseURL}/app/verificar-url.php?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
            estadoURL.textContent = data.message;

            if (data.success) {
                // Éxito
                estadoURL.style.color = "#28a745";
                input.style.border = "1px solid #28a745";
                input.style.boxShadow = "0 0 0 0.2rem rgba(74, 211, 56, 0.25)";
                estadoValidoURL = true;
                confirmBtn.disabled = false;

                confirmBtn.removeAttribute("title");
                confirmBtn.removeAttribute("data-bs-toggle");
                confirmBtn.removeAttribute("data-bs-placement");
                bootstrap.Tooltip.getInstance(confirmBtn)?.dispose();

            } else if (data.message.includes("HTTP 500")) {
                // Error interno, pero permitir guardar
                // estadoURL.innerHTML = data.message + " <span class='text-muted ms-2'>(Puedes guardar de todas formas)</span>";
                estadoURL.textContent += " Puedes guardar de todas formas.";
                estadoURL.style.color = "#e0a800";
                input.style.border = "1px solid #e0a800";
                input.style.boxShadow = "0 0 0 0.2rem rgba(220, 195, 53, 0.25)";
                estadoValidoURL = true;
                confirmBtn.disabled = false;

                // 🟡 Agregar tooltip al botón
                confirmBtn.setAttribute("title", "⚠️ Esta URL tiene errores PHP internos. Si deseas puedes guardar de todas formas.");
                confirmBtn.setAttribute("data-bs-toggle", "tooltip");
                confirmBtn.setAttribute("data-bs-placement", "top");
                new bootstrap.Tooltip(confirmBtn);


                // Activar tooltip de Bootstrap
                new bootstrap.Tooltip(confirmBtn);

            } else {
                // Otros errores → se bloquea
                estadoURL.style.color = "#e0a800";
                input.style.border = "1px solid #e0a800";
                input.style.boxShadow = "0 0 0 0.2rem rgba(220, 195, 53, 0.25)";
                estadoValidoURL = false;
                confirmBtn.disabled = true;
            }

        })
        .catch(() => {
            estadoURL.textContent = "⚠️ No se pudo contactar con el servidor.";
            estadoURL.style.color = "#e0a800";
            input.style.border = "1px solid #e0a800";
            input.style.boxShadow = "0 0 0 0.2rem rgba(220, 195, 53, 0.25)";
            estadoValidoURL = false;
            confirmBtn.disabled = true;
        });
}



function validarFormatoVisualURL(url) {
    if (!url.trim()) return { valido: false, mensaje: "✏️ Escribe una URL para verificar" };
    if (!url.startsWith("http://") && !url.startsWith("https://")) return { valido: false, mensaje: "⚠️ Incluye http:// o https:// al inicio" };
    if (url.endsWith(".")) return { valido: false, mensaje: "❌ La URL no debe terminar con un punto." };
    if (!/^https?:\/\/[^ "]+$/.test(url)) return { valido: false, mensaje: "❌ URL inválida" };
    return { valido: true };
}



// Espera a que el usuario deje de escribir antes de ejecutar la acción
function debounce(fn, delay = 500) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
