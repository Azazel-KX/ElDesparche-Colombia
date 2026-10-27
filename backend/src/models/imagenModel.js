const db = require("../config/db");
const { borrarArchivoSubido } = require("../utils/imagenes");

// Modelo de las IMÁGENES SUBIDAS (fotos de eventos y logos de agentes, en backend/uploads).
// La base solo guarda la ruta ("/uploads/eventos/evento-ab12cd34ef.jpg"); el archivo vive en disco. Cuando una
// escritura reemplaza, quita o borra una imagen, el archivo anterior se borra para que no se acumulen archivos sin uso.

// Borra el archivo de una imagen subida que ya ningún evento ni logo usa.
// Las imágenes se nombran por su contenido, así que dos eventos con la misma foto comparten archivo: por eso se revisa
// antes de borrar. Un fallo al borrar el archivo no tumba la petición (los datos ya quedaron bien guardados).
async function borrarImagenSinUso(ruta) {
  if (!ruta || !ruta.startsWith("/uploads/")) return;
  try {
    const { rows } = await db.query(
      `SELECT EXISTS (SELECT 1 FROM EVENTO WHERE url_imagen = $1) OR EXISTS (SELECT 1 FROM AGENTE WHERE logo_url = $1) AS en_uso`,
      [ruta]
    );
    if (!rows[0].en_uso) borrarArchivoSubido(ruta);
  } catch (err) {
    console.warn(`No se pudo borrar la imagen ${ruta}:`, err.message);
  }
}

// Corre una escritura que puede dejar una imagen sin uso y, ya confirmada (o deshecha), la borra.
//   imagenNueva: lo que devolvió guardarImagen (puede ser un archivo recién escrito en uploads/).
//   trabajo: la transacción; devuelve false si el registro no existe, o un objeto con "sobra" = la imagen que dejó de
//   usarse (null si ninguna).
// Si la transacción falla o no encuentra el registro, la imagen nueva sobra; si salió bien, sobra la que reemplazó.
// Se borra después del COMMIT: si la transacción se deshace, la imagen anterior sigue haciendo falta.
async function escribirConImagenes(imagenNueva, trabajo) {
  let resultado;
  try {
    resultado = await db.conTransaccion(trabajo);
  } catch (err) {
    await borrarImagenSinUso(imagenNueva);
    throw err;
  }
  await borrarImagenSinUso(resultado ? resultado.sobra : imagenNueva);
  return resultado;
}

module.exports = { borrarImagenSinUso, escribirConImagenes };
