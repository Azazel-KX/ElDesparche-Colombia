/* ==========================================================================
   controladores/admin/agentesControlador.js
   Gestión de agentes: ver, registrar, editar, suspender y eliminar.
   ========================================================================== */

import { entrarComoAdmin } from "../adminControlador.js";
import { crearGestion } from "../gestionControlador.js";
import { escapar } from "../../lib/formato.js";
import { camposAgente } from "../../vistas/camposVista.js";
import { cambiarEstadoAgente, eliminarAgente, guardarAgente, obtenerAgentes, validarAgente } from "../../modelos/personaModelo.js";
import { documentoNormalizado } from "../../lib/validacion.js";
import { cargarEventosAdmin, eventosDeAgente } from "../../modelos/eventoModelo.js";
import { botonesAgente, llenarFiltroCiudades, pintarDetalleAgente, pintarResumenAgentes, pintarTablaAgentes } from "../../vistas/admin/agentesVista.js";
import { restablecerContrasena } from "../../modelos/personaModelo.js";

export function paginaAgentes() {
  if (!entrarComoAdmin()) return;

  var buscar = document.getElementById("buscar-agente");
  var filtroEstado = document.getElementById("filtro-estado");
  var filtroCiudad = document.getElementById("filtro-ciudad");
  var orden = document.getElementById("orden-agentes");

  var gestion = crearGestion({
    ids: {
      cuerpo: "cuerpo-agentes", dialogo: "detalle-agente", nuevo: "nuevo-agente",
      formulario: "form-agente", filtros: "filtros-agentes", tituloLista: "titulo-lista-agentes"
    },
    atributo: "data-nit",
    id: function (a) { return a.nit; },
    textos: {
      nuevoTitulo: "Registrar agente",
      nuevoSub: "Crea la cuenta de una empresa que organiza eventos.",
      botonNuevo: "Registrar agente",
      editarTitulo: function (a) { return "Editar " + escapar(a.nombre); }
    },
    valoresNuevo: { tipoDoc: "CC", estado: "Activo", experiencia: 0, comision: 7 },
    campos: camposAgente,
    valores: function (a) {
      var v = {};
      ["nit", "razon", "nombre", "experiencia", "comision", "estado", "descripcion", "tipoDoc", "documento",
        "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad"].forEach(function (k) { v[k] = a[k]; });
      v.comision = String(a.comision).replace(".", ",");
      return v;
    },
    inmutables: ["nit", "tipoDoc", "documento", "estado"],
    validar: validarAgente,
    armar: function (v, nuevo) {
      var datos = {
        nit: v.nit, razon: v.razon, nombre: v.nombre, experiencia: Number(v.experiencia),
        comision: Number(String(v.comision).replace(",", ".")), descripcion: v.descripcion,
        tipoDoc: v.tipoDoc, documento: documentoNormalizado(v.documento), nombres: v.nombres, apellidos: v.apellidos,
        correo: v.correo.toLowerCase(), telefono: v.telefono.replace(/\s/g, ""), direccion: v.direccion, ciudad: v.ciudad
      };
      if (nuevo) datos.estado = v.estado;
      return datos;
    },
    guardar: guardarAgente,
    restablecer: function (nit, clave) { return restablecerContrasena("agentes", nit, clave); },
    eliminar: eliminarAgente,
    eliminacion: function (a) {
      var suyos = eventosDeAgente(a).length;
      /* EVENTO.numero_identificacion (el agente) es RESTRICT: un agente con eventos no se puede borrar */
      if (suyos) {
        return {
          bloqueo: "Tiene " + suyos + (suyos === 1 ? " evento registrado" : " eventos registrados") +
            ". Primero elimina sus eventos en Gestión de eventos, o suspéndelo para que no publique más."
        };
      }
      return { consecuencia: "Se borrará la cuenta de la empresa y de su representante." };
    },
    botones: botonesAgente,
    accion: function (accion, a, ayuda) {
      if (accion === "confirmar") {
        ayuda.confirmar("¿Suspender a " + escapar(a.nombre) + "?",
          "Sus eventos dejarán de mostrarse y no podrá publicar nuevos hasta que lo reactives.", "Sí, suspender", "Suspendido");
        return true;
      }
      /* Activo o Suspendido: cambia el estado de la cuenta */
      var verbo = accion === "Suspendido" ? "suspendido" : (a.estado === "Pendiente" ? "aprobado" : "reactivado");
      ayuda.ejecutar(cambiarEstadoAgente(a.nit, accion), function () {
        a.estado = accion;
        return a.nombre + " quedó " + verbo + ".";
      });
      return true;
    },
    pintarResumen: pintarResumenAgentes,
    pintarTabla: pintarTablaAgentes,
    pintarDetalle: pintarDetalleAgente,
    alCargar: llenarFiltroCiudades
  });

  buscar.addEventListener("input", gestion.repintarTabla);
  filtroEstado.onchange = gestion.repintarTabla;
  filtroCiudad.onchange = gestion.repintarTabla;
  orden.onchange = gestion.repintarTabla;

  /* Los eventos reales se necesitan para mostrar los de cada agente */
  gestion.iniciar(Promise.all([obtenerAgentes(), cargarEventosAdmin()]).then(function (datos) { return datos[0]; }));
}
