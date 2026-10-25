/* ==========================================================================
   vistas/mapaVista.js
   Mapa (Leaflet + OpenStreetMap) para marcar el punto de un evento.
   ========================================================================== */

/* ----- Mapa para marcar el punto del evento (Leaflet + OpenStreetMap) ----- */

/* Centro de cada ciudad de la lista, para empezar el mapa cerca */
var CENTRO_CIUDAD = {
  "Medellín": [6.2442, -75.5812],
  "Bogotá": [4.711, -74.0721],
  "Cali": [3.4516, -76.532],
  "Tuluá": [4.0847, -76.1954],
  "Guatavita": [4.9346, -73.8331],
  "Barranquilla": [10.9685, -74.7813],
  "Bucaramanga": [7.1254, -73.1198],
  "Ciudad de México": [19.4326, -99.1332],
  "Guadalajara": [20.6597, -103.3496],
  "Buenos Aires": [-34.6037, -58.3816]
};

var CENTRO_COLOMBIA = [4.5709, -74.2973];

/* Leaflet se descarga solo la primera vez que se abre el formulario */
export function crearMapaEvento(campos, partes) {
  var L = null;
  var mapa = null;
  var marcador = null;
  var cargando = null;

  function mostrarEstado(texto) {
    partes.estado.textContent = texto;
  }

  function ponerPunto(lat, lon, centrar) {
    if (!mapa || isNaN(lat) || isNaN(lon)) return;
    var punto = [lat, lon];

    if (!marcador) {
      marcador = L.marker(punto, {
        draggable: true,
        keyboard: true,
        title: "Ubicación del evento",
        alt: "Ubicación del evento",
        icon: L.divIcon({ className: "agente-pin", iconSize: [28, 34], iconAnchor: [14, 32] })
      }).addTo(mapa);

      marcador.on("dragend", function () {
        var p = marcador.getLatLng();
        escribirCoordenadas(p.lat, p.lng);
        mostrarEstado("Moviste el marcador.");
      });
    } else {
      marcador.setLatLng(punto);
    }

    escribirCoordenadas(lat, lon);
    if (centrar) mapa.setView(punto, Math.max(mapa.getZoom(), 15));
  }

  function escribirCoordenadas(lat, lon) {
    campos.lat.value = lat.toFixed(6);
    campos.lon.value = lon.toFixed(6);
    campos.lat.removeAttribute("aria-invalid");
    campos.lon.removeAttribute("aria-invalid");
  }

  function quitarPunto() {
    if (marcador) {
      marcador.remove();
      marcador = null;
    }
    campos.lat.value = "";
    campos.lon.value = "";
    mostrarEstado("");
  }

  function centrarEnCiudad(ciudad) {
    if (!mapa) return;
    var centro = CENTRO_CIUDAD[ciudad];
    mapa.setView(centro || CENTRO_COLOMBIA, centro ? 12 : 5);
  }

  function preparar() {
    if (cargando) {
      return cargando.then(function () { mapa.invalidateSize(); });
    }

    cargando = Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(function (modulos) {
      L = modulos[0].default || modulos[0];
      mapa = L.map(partes.caja, { scrollWheelZoom: false }).setView(CENTRO_COLOMBIA, 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapa);

      mapa.on("click", function (e) {
        ponerPunto(e.latlng.lat, e.latlng.lng, false);
        mostrarEstado("Marcaste el punto en el mapa.");
      });
    }).catch(function () {
      mostrarEstado("No se pudo cargar el mapa. Escribe la latitud y la longitud a mano.");
    });

    return cargando.then(function () { if (mapa) mapa.invalidateSize(); });
  }

  /* Coordenadas escritas a mano */
  function desdeCampos() {
    var lat = parseFloat(campos.lat.value);
    var lon = parseFloat(campos.lon.value);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      ponerPunto(lat, lon, true);
    }
  }
  campos.lat.addEventListener("change", desdeCampos);
  campos.lon.addEventListener("change", desdeCampos);

  campos.ciudad.addEventListener("change", function () {
    if (!marcador) centrarEnCiudad(campos.ciudad.value);
  });

  /* Busca la dirección escrita con Nominatim (el buscador de OpenStreetMap) */
  partes.buscar.addEventListener("click", function () {
    var direccion = campos.direccion.value.trim();
    var opcion = campos.ciudad.selectedOptions[0];
    if (!direccion || !campos.ciudad.value) {
      mostrarEstado("Escribe primero la ciudad y la dirección.");
      return;
    }

    var consulta = [direccion, campos.ciudad.value, opcion ? opcion.getAttribute("data-departamento") : ""]
      .filter(Boolean).join(", ");
    partes.buscar.disabled = true;
    mostrarEstado("Buscando la dirección…");

    preparar().then(function () {
      return fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=" +
        encodeURIComponent(consulta));
    }).then(function (respuesta) {
      return respuesta.json();
    }).then(function (resultados) {
      if (!resultados.length) {
        mostrarEstado("No encontramos esa dirección. Marca el punto tocando el mapa.");
        return;
      }
      ponerPunto(Number(resultados[0].lat), Number(resultados[0].lon), true);
      mostrarEstado("Encontramos la dirección. Revisa que el marcador quede en el sitio correcto.");
    }).catch(function () {
      mostrarEstado("No se pudo buscar la dirección. Marca el punto tocando el mapa.");
    }).then(function () {
      partes.buscar.disabled = false;
    });
  });

  return { preparar: preparar, ponerPunto: ponerPunto, quitarPunto: quitarPunto, centrarEnCiudad: centrarEnCiudad };
}
