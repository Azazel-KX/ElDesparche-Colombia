/* ==========================================================================
   controladores/admin/administradoresControlador.js
   Gestión de administradores: ver, registrar, editar y eliminar.
   ========================================================================== */

import { entrarComoAdmin } from "../adminControlador.js";
import { crearGestion } from "../gestionControlador.js";
import { conNombre, eliminarAdministrador, esMiCuenta, guardarAdministrador, obtenerAdministradores, validarAdministrador } from "../../modelos/personaModelo.js";
import { escapar } from "../../lib/formato.js";
import { camposAdministrador } from "../../vistas/camposVista.js";
import { documentoNormalizado } from "../../lib/validacion.js";
import { botonesAdministrador, pintarDetalleAdministrador, pintarResumenAdministradores, pintarTablaAdministradores } from "../../vistas/admin/administradoresVista.js";

export function paginaAdministradores() {
  if (!entrarComoAdmin()) return;

  var buscar = document.getElementById("buscar-administrador");
  var filtroHorario = document.getElementById("filtro-horario");
  var orden = document.getElementById("orden-administradores");

  var gestion = crearGestion({
    ids: {
      cuerpo: "cuerpo-administradores", dialogo: "detalle-administrador", nuevo: "nuevo-administrador",
      formulario: "form-administrador", filtros: "filtros-administradores", tituloLista: "titulo-lista-administradores"
    },
    atributo: "data-documento",
    id: function (a) { return a.documento; },
    preparar: conNombre,
    textos: {
      nuevoTitulo: "Registrar administrador",
      nuevoSub: "Crea la cuenta de una persona del equipo.",
      botonNuevo: "Registrar administrador",
      editarTitulo: function (a) { return "Editar a " + escapar(a.nombre); }
    },
    valoresNuevo: { tipoDoc: "CC", horario: "Completa" },
    campos: camposAdministrador,
    valores: function (a) {
      var v = {};
      ["tipoDoc", "documento", "nombres", "apellidos", "correo", "telefono", "direccion", "ciudad",
        "salario", "horario"].forEach(function (k) { v[k] = a[k]; });
      return v;
    },
    inmutables: ["tipoDoc", "documento"],
    validar: validarAdministrador,
    armar: function (v) {
      return {
        tipoDoc: v.tipoDoc, documento: documentoNormalizado(v.documento), nombres: v.nombres, apellidos: v.apellidos,
        correo: v.correo.toLowerCase(), telefono: v.telefono.replace(/\s/g, ""), direccion: v.direccion, ciudad: v.ciudad,
        salario: Number(v.salario), horario: v.horario
      };
    },
    guardar: guardarAdministrador,
    eliminar: eliminarAdministrador,
    eliminacion: function (a, administradores) {
      if (esMiCuenta(a)) {
        return { bloqueo: "No puedes eliminar tu propia cuenta mientras la estás usando. Pídele a otro administrador que lo haga." };
      }
      if (administradores.length === 1) {
        return { bloqueo: "Es el único administrador: sin él nadie podría entrar al panel." };
      }
      return { consecuencia: "Ya no podrá entrar al panel de administración." };
    },
    botones: botonesAdministrador,
    pintarResumen: pintarResumenAdministradores,
    pintarTabla: pintarTablaAdministradores,
    pintarDetalle: pintarDetalleAdministrador
  });

  buscar.addEventListener("input", gestion.repintarTabla);
  filtroHorario.onchange = gestion.repintarTabla;
  orden.onchange = gestion.repintarTabla;

  gestion.iniciar(obtenerAdministradores());
}
