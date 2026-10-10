let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximoActual = null;
let temporizadorMensaje;


const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const precioMaximoInput = document.querySelector("#precioMaximo");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const mensaje = document.querySelector("#mensaje");
const btnVaciar = document.querySelector("#btnVaciar");
const panelConfirmacionVaciar = document.querySelector("#panelConfirmacionVaciar");
const btnConfirmarVaciar = document.querySelector("#btnConfirmarVaciar");
const btnCancelarVaciar = document.querySelector("#btnCancelarVaciar");


function mostrarMensaje(texto, tipo = "error") {
  clearTimeout(temporizadorMensaje);
  mensaje.textContent = texto;
  mensaje.className = tipo;
  mensaje.hidden = false;
  temporizadorMensaje = setTimeout(() => {
    mensaje.hidden = true;
  }, 10000);
}


async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    estado.textContent = `${experiencias.length} experiencias disponibles`;
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}


function obtenerResultados() {
  let resultados = [...experiencias];

  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }

  if (textoBusqueda !== "") {
    resultados = resultados.filter(e =>
      e.nombre.toLowerCase().includes(textoBusqueda)
    );
  }

  if (precioMaximoActual !== null) {
    resultados = resultados.filter(e => e.precio <= precioMaximoActual);
  }

  if (ordenActual === "ascendente") {
    resultados.sort((a, b) => a.precio - b.precio);
  }

  if (ordenActual === "descendente") {
    resultados.sort((a, b) => b.precio - a.precio);
  }

  return resultados;
}


function actualizarCatalogo() {
  const resultados = obtenerResultados();

  if (resultados.length === 0) {
    catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias</p>`;
    estado.textContent = "0 resultados";
    return;
  }

  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen" aria-hidden="true">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>`).join("");

  estado.textContent = `${resultados.length} resultados`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
  });
}


function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const cantidad = Number(document.querySelector(`#cantidad-${id}`).value);

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > experiencia.cupo) {
    mostrarMensaje(`Cantidad no válida. Elige entre 1 y ${experiencia.cupo} personas.`);
    return;
  }

  const existente = reservas.find(r => r.experienciaId === id);

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarMensaje(`La cantidad supera el cupo disponible de ${experiencia.nombre} (${experiencia.cupo}).`);
      return;
    }
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad,
      subtotal: experiencia.precio * cantidad
    });
  }

  mostrarMensaje(`Se agregó ${experiencia.nombre} a tu reservación.`, "exito");
  mostrarReservas();
}

function cambiarCantidad(id, cambio) {
  const reserva = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);
  if (!reserva || !experiencia) return;

  const nuevaCantidad = reserva.cantidad + cambio;

  if (nuevaCantidad < 1) {
    mostrarMensaje("La cantidad mínima es 1. Usa Eliminar para quitar la experiencia.");
    return;
  }

  if (nuevaCantidad > experiencia.cupo) {
    mostrarMensaje(`El cupo máximo de ${experiencia.nombre} es ${experiencia.cupo} personas.`);
    return;
  }

  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;
  mostrarReservas();
}

function eliminarReserva(id) {
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarReservas();
}

function calcularTotalPersonas() {
  return reservas.reduce((suma, r) => suma + r.cantidad, 0);
}

function calcularTotalImporte() {
  return reservas.reduce((suma, r) => suma + r.subtotal, 0);
}

function mostrarReservas() {
  btnVaciar.disabled = reservas.length === 0;
  totalPersonas.textContent = calcularTotalPersonas();
  total.textContent = `$${calcularTotalImporte()} MXN`;

  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    panelConfirmacionVaciar.hidden = true;
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>${r.cantidad} persona(s) × $${r.precio}</p>
        <div class="cantidad-control">
          <button class="btn-cantidad" data-accion="restar" data-id="${r.experienciaId}"
            aria-label="Restar una persona en ${r.nombre}">−</button>
          <span class="cantidad-valor">${r.cantidad}</span>
          <button class="btn-cantidad" data-accion="sumar" data-id="${r.experienciaId}"
            aria-label="Agregar una persona en ${r.nombre}">+</button>
        </div>
      </div>
      <div>
        <strong>$${r.subtotal} MXN</strong>
        <button class="btn-eliminar" data-accion="eliminar" data-id="${r.experienciaId}"
          aria-label="Eliminar ${r.nombre} de la reservación">Eliminar</button>
      </div>
    </article>`).join("");
}


function pedirConfirmacionVaciar() {
  if (reservas.length === 0) return;
  panelConfirmacionVaciar.hidden = false;
  btnConfirmarVaciar.focus();
}

function cancelarVaciar() {
  panelConfirmacionVaciar.hidden = true;
  btnVaciar.focus();
}

function vaciarReservacion() {
  reservas = [];
  panelConfirmacionVaciar.hidden = true;
  mostrarReservas();
  mostrarMensaje("Tu reservación quedó vacía.", "exito");
}


buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});

precioMaximoInput.addEventListener("input", () => {
  const valor = precioMaximoInput.value.trim();
  if (valor !== "" && Number(valor) < 0) {
    mostrarMensaje("El precio máximo no puede ser negativo.");
    return;
  }
  precioMaximoActual = valor === "" ? null : Number(valor);
  actualizarCatalogo();
});


listaReservas.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const id = Number(boton.dataset.id);
  const accion = boton.dataset.accion;

  if (accion === "sumar") cambiarCantidad(id, 1);
  if (accion === "restar") cambiarCantidad(id, -1);
  if (accion === "eliminar") eliminarReserva(id);
});

btnVaciar.addEventListener("click", pedirConfirmacionVaciar);
btnCancelarVaciar.addEventListener("click", cancelarVaciar);
btnConfirmarVaciar.addEventListener("click", vaciarReservacion);


cargarExperiencias();