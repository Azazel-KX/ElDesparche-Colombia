/* ==========================================================================
   vistas/camposVista.js
   Definición de los campos de cada formulario de los paneles.
   ========================================================================== */

import { CATEGORIAS_EVENTO, HORARIOS, PLANES_EVENTO, TIPOS_DOCUMENTO } from "../modelos/catalogos.js";

export function camposAgente(nuevo, ciudades) {
  var campos = [
    { tipo: "titulo", etiqueta: "Empresa" },
    { id: "nit", etiqueta: "NIT", tipo: "text", max: 11, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Nueve números, guion y dígito de verificación: 900123456-7." : "El NIT no se puede cambiar." },
    { id: "razon", etiqueta: "Razón social", tipo: "text", max: 150, par: true },
    { id: "nombre", etiqueta: "Nombre comercial", tipo: "text", max: 150, par: true,
      ayuda: "Es el nombre que ve el público." },
    { id: "experiencia", etiqueta: "Años de experiencia", tipo: "number", min: 0, par: true },
    { id: "comision", etiqueta: "Comisión (%)", tipo: "text", decimal: true, max: 6, par: true,
      ayuda: "Lo que cobra El Desparche por cada venta, de 0 a 100. Ejemplo: 6,5." },
    { id: "estado", etiqueta: "Estado", tipo: "select", opciones: ["Activo", "Pendiente", "Suspendido"], par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "" : "Se cambia con los botones del detalle." },
    { id: "descripcion", etiqueta: "Descripción", tipo: "textarea", opcional: true },
    { tipo: "titulo", etiqueta: "Representante" },
    { id: "tipoDoc", etiqueta: "Tipo de documento", tipo: "select", opciones: TIPOS_DOCUMENTO, par: true, soloLectura: !nuevo },
    { id: "documento", etiqueta: "Número de documento", tipo: "text", max: 20, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Sin puntos ni espacios." : "El documento no se puede cambiar." },
    { id: "nombres", etiqueta: "Nombres", tipo: "text", max: 80, par: true },
    { id: "apellidos", etiqueta: "Apellidos", tipo: "text", max: 80, par: true },
    { id: "correo", etiqueta: "Correo", tipo: "email", max: 100, par: true },
    { id: "telefono", etiqueta: "Teléfono", tipo: "tel", max: 10, opcional: true, par: true,
      ayuda: "Celular de 10 números o fijo que empiece por 60." },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200, par: true },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true }
  ];
  if (nuevo) {
    campos.push({ id: "contrasena", etiqueta: "Contraseña inicial", tipo: "password",
      ayuda: "Mínimo 8 caracteres. El agente podrá cambiarla después." });
  }
  return campos;
}

export function camposEvento(nuevo, ciudades, agentes) {
  var campos = [
    { tipo: "titulo", etiqueta: "Evento" },
    { id: "titulo", etiqueta: "Nombre del evento", tipo: "text", max: 150 },
    { id: "descripcion", etiqueta: "Descripción", tipo: "textarea", ayuda: "Mínimo 30 caracteres." },
    { id: "categoria", etiqueta: "Categoría", tipo: "select", opciones: CATEGORIAS_EVENTO, par: true },
    { id: "parche", etiqueta: "Tipo de plan", tipo: "select", opciones: PLANES_EVENTO, par: true },
    { id: "nitAgente", etiqueta: "Agente que lo organiza", tipo: "select", opciones: agentes, par: true },
    { id: "estado", etiqueta: "Estado", tipo: "select", opciones: ["Programado", "En Boletería"], par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "" : "Se cambia abajo, en el detalle del evento." },
    { tipo: "titulo", etiqueta: "Fecha, teatro y ubicación" },
    { id: "inicio", etiqueta: "Empieza", tipo: "datetime-local", par: true },
    { id: "fin", etiqueta: "Termina", tipo: "datetime-local", par: true },
    { id: "teatro", etiqueta: "Teatro", tipo: "text", max: 150, par: true,
      ayuda: "Donde se hace el evento. Ejemplo: Teatro Municipal o Parque Simón Bolívar." },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200, ayuda: "Ejemplo: Calle 26 # 25-50." },
    { tipo: "html", html:
      '<fieldset class="agente-mapa-campo">' +
        '<legend>Ubicación en el mapa</legend>' +
        '<p class="agente-ayuda" id="ayuda-mapa-admin">Toca el mapa para marcar el punto exacto o arrastra el marcador. ' +
          'También puedes buscar la dirección o escribir las coordenadas.</p>' +
        '<div class="agente-mapa-barra">' +
          '<button type="button" class="admin-boton-sec" id="buscar-direccion-admin">Buscar la dirección en el mapa</button>' +
          '<p class="agente-ayuda" id="estado-mapa-admin" role="status"></p>' +
        '</div>' +
        '<div class="agente-mapa" id="mapa-evento-admin" role="region" aria-label="Mapa para marcar la ubicación del evento" ' +
          'aria-describedby="ayuda-mapa-admin"></div>' +
      '</fieldset>' },
    { id: "lat", etiqueta: "Latitud", tipo: "text", decimal: true, max: 12, par: true },
    { id: "lon", etiqueta: "Longitud", tipo: "text", decimal: true, max: 12, par: true },
    { tipo: "titulo", etiqueta: "Entradas" },
    { id: "capacidad", etiqueta: "Capacidad (personas)", tipo: "number", min: 1, par: true },
    { id: "precio", etiqueta: "Precio por entrada (pesos)", tipo: "number", min: 0, par: true, ayuda: "0 si es gratis." },
    { id: "edad", etiqueta: "Edad mínima", tipo: "number", min: 0, par: true, ayuda: "0 si es para todo público." },
    { id: "imagen", etiqueta: nuevo ? "Imagen" : "Cambiar la imagen", tipo: "file", opcional: true, par: true,
      ayuda: nuevo ? "Si no subes una, se usa una imagen genérica." : "Si no eliges otra, se queda la actual." },
    { id: "observaciones", etiqueta: "Observaciones", tipo: "textarea", opcional: true }
  ];
  return campos;
}

export function camposCliente(nuevo, ciudades) {
  var campos = [
    { id: "tipoDoc", etiqueta: "Tipo de documento", tipo: "select", opciones: TIPOS_DOCUMENTO, par: true, soloLectura: !nuevo },
    { id: "documento", etiqueta: "Número de documento", tipo: "text", max: 20, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Sin puntos ni espacios." : "El documento no se puede cambiar." },
    { id: "nombres", etiqueta: "Nombres", tipo: "text", max: 80, par: true },
    { id: "apellidos", etiqueta: "Apellidos", tipo: "text", max: 80, par: true },
    { id: "correo", etiqueta: "Correo", tipo: "email", max: 100 },
    { id: "telefono", etiqueta: "Teléfono", tipo: "tel", max: 10, opcional: true, par: true,
      ayuda: "Celular de 10 números o fijo que empiece por 60." },
    { id: "nacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", par: true },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200 },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true },
    { id: "alias", etiqueta: "Alias", tipo: "text", max: 40, opcional: true, par: true },
    { id: "puntos", etiqueta: "Puntos", tipo: "number", min: 0 },
    { id: "publicidad", etiqueta: "Quiere recibir publicidad", tipo: "checkbox" }
  ];
  if (nuevo) {
    campos.push({ id: "contrasena", etiqueta: "Contraseña inicial", tipo: "password",
      ayuda: "Mínimo 8 caracteres. El cliente podrá cambiarla después." });
  }
  return campos;
}

export function camposAdministrador(nuevo, ciudades) {
  var campos = [
    { tipo: "titulo", etiqueta: "Datos personales" },
    { id: "tipoDoc", etiqueta: "Tipo de documento", tipo: "select", opciones: TIPOS_DOCUMENTO, par: true, soloLectura: !nuevo },
    { id: "documento", etiqueta: "Número de documento", tipo: "text", max: 20, par: true, soloLectura: !nuevo,
      ayuda: nuevo ? "Sin puntos ni espacios." : "El documento no se puede cambiar." },
    { id: "nombres", etiqueta: "Nombres", tipo: "text", max: 80, par: true },
    { id: "apellidos", etiqueta: "Apellidos", tipo: "text", max: 80, par: true },
    { id: "correo", etiqueta: "Correo", tipo: "email", max: 100, par: true },
    { id: "telefono", etiqueta: "Teléfono", tipo: "tel", max: 10, opcional: true, par: true,
      ayuda: "Celular de 10 números o fijo que empiece por 60." },
    { id: "direccion", etiqueta: "Dirección", tipo: "text", max: 200, par: true },
    { id: "ciudad", etiqueta: "Ciudad", tipo: "select", opciones: ciudades, par: true },
    { tipo: "titulo", etiqueta: "Trabajo" },
    { id: "salario", etiqueta: "Salario mensual (pesos)", tipo: "number", min: 0, par: true,
      ayuda: "Sin puntos. Ejemplo: 3200000." },
    { id: "horario", etiqueta: "Horario", tipo: "select", opciones: HORARIOS, par: true }
  ];
  if (nuevo) {
    campos.push({ id: "contrasena", etiqueta: "Contraseña inicial", tipo: "password",
      ayuda: "Mínimo 8 caracteres. La persona podrá cambiarla después." });
  }
  return campos;
}

/* r = la reserva que se edita (null al registrar). Con la reserva ya aprobada, el valor
   pagado y el estado ya no se cambian desde aquí. */
export function camposReserva(r, clientes, eventos) {
  var conPago = !!(r && r.estado === "Confirmada" && r.valor > 0);
  var campos = [];
  if (!r) {
    campos.push(
      { id: "cliente", etiqueta: "Cliente", tipo: "select", opciones: clientes },
      { id: "evento", etiqueta: "Evento", tipo: "select", opciones: eventos }
    );
  }
  campos.push(
    { id: "entradas", etiqueta: "Número de entradas", tipo: "number", min: 1, max: 10, par: true, soloLectura: conPago,
      ayuda: conPago ? "Ya está aprobada por este valor: para cambiar las entradas, cancélala y registra otra."
        : "De 1 a 10 por reserva." },
    { id: "estado", etiqueta: "Estado", tipo: "select", opciones: ["Reservada", "Confirmada"], par: true, soloLectura: conPago,
      ayuda: conPago ? "Ya está aprobada." : "Reservada: espera la aprobación. Confirmada: ya está aprobada y pagada (por ejemplo, en taquilla) y la entrada sirve." },
    { tipo: "html", html: '<p class="reserva-total" id="reserva-total" aria-live="polite"></p>' },
    { id: "observaciones", etiqueta: "Observaciones", tipo: "textarea", opcional: true }
  );
  return campos;
}
