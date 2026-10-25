/* ==========================================================================
   controladores/admin/clientesControlador.js
   Gestión de clientes: ver, registrar, editar, bloquear y eliminar.
   ========================================================================== */

import { entrarComoAdmin } from "../adminControlador.js";
import { crearGestion } from "../gestionControlador.js";
import { cambiarCuentaCliente, conNombre, eliminarCliente, guardarCliente, obtenerClientes, validarCliente } from "../../modelos/personaModelo.js";
import { escapar } from "../../lib/formato.js";
import { camposCliente } from "../../vistas/camposVista.js";
import { documentoNormalizado } from "../../lib/validacion.js";
import { botonesCliente, pintarDetalleCliente, pintarResumenClientes, pintarTablaClientes } from "../../vistas/admin/clientesVista.js";
import { cargarEventosAdmin } from "../../modelos/eventoModelo.js";

export function paginaClientes() {
  if (!entrarComoAdmin()) return;

  var buscar = document.getElementById("buscar-cliente");
  var filtroCuenta = document.getElementById("filtro-cuenta");
  var orden = document.getElementById("orden-clientes");

  var gestion = crearGestion({
    ids: {
      cuerpo: "cuerpo-clientes", dialogo: "detalle-cliente", nuevo: "nuevo-cliente",
      formulario: "form-cliente", filtros: "filtros-clientes", tituloLista: "titulo-lista-clientes"
    },
    atributo: "data-documento",
    id: function (c) { return c.documento; },
    preparar: conNombre,
    textos: {
      nuevoTitulo: "Registrar cliente",
      nuevoSub: "Crea la cuenta de un cliente nuevo.",
      botonNuevo: "Registrar cliente",
      editarTitulo: function (c) { return "Editar a " + escapar(c.nombre); }
    },
    valoresNuevo: { tipoDoc: "CC", puntos: 0, publicidad: true },
    campos: camposCliente,
    valores: function (c) {
      return {
        tipoDoc: c.tipoDoc, documento: c.documento, nombres: c.nombres, apellidos: c.apellidos,
        correo: c.correo, telefono: c.telefono, nacimiento: c.nacimiento, direccion: c.direccion,
        ciudad: c.ciudad, alias: c.alias, puntos: c.puntos, publicidad: c.publicidad
      };
    },
    inmutables: ["tipoDoc", "documento"],
    validar: validarCliente,
    armar: function (v) {
      return {
        tipoDoc: v.tipoDoc, documento: documentoNormalizado(v.documento), nombres: v.nombres, apellidos: v.apellidos,
        correo: v.correo.toLowerCase(), telefono: v.telefono.replace(/\s/g, ""), nacimiento: v.nacimiento,
        direccion: v.direccion, ciudad: v.ciudad, alias: v.alias, puntos: Number(v.puntos), publicidad: v.publicidad
      };
    },
    guardar: guardarCliente,
    eliminar: eliminarCliente,
    eliminacion: function (c) {
      var cuantas = c.reservas.length;
      return {
        consecuencia: "Se borrarán su cuenta" +
          (cuantas ? " y sus " + cuantas + (cuantas === 1 ? " reserva" : " reservas") : "") + "."
      };
    },
    botones: botonesCliente,
    accion: function (accion, c, ayuda) {
      if (accion === "confirmar") {
        ayuda.confirmar("¿Bloquear la cuenta de " + escapar(c.nombre) + "?",
          "No podrá iniciar sesión ni hacer reservas hasta que la desbloquees.", "Sí, bloquear", "Bloqueada");
        return true;
      }
      /* Activa o Bloqueada: cambia el estado de la cuenta */
      ayuda.ejecutar(cambiarCuentaCliente(c.documento, accion), function () {
        c.cuenta = accion;
        return "La cuenta de " + c.nombre + (accion === "Bloqueada" ? " quedó bloqueada." : " quedó desbloqueada.");
      });
      return true;
    },
    pintarResumen: pintarResumenClientes,
    pintarTabla: pintarTablaClientes,
    pintarDetalle: pintarDetalleCliente
  });

  buscar.addEventListener("input", gestion.repintarTabla);
  filtroCuenta.onchange = gestion.repintarTabla;
  orden.onchange = gestion.repintarTabla;

  /* Los eventos reales se necesitan para el historial de cada cliente */
  gestion.iniciar(Promise.all([obtenerClientes(), cargarEventosAdmin()]).then(function (datos) { return datos[0]; }));
}
