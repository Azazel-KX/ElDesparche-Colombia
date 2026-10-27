const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { publicUrl } = require("../config/env");
const { ErrorHttp } = require("./errores");

// Las imágenes de eventos y logos llegan de la web como "data URL" (JPEG reducido en base64, de cientos de KB).
// La base de datos solo guarda una URL corta (columna de 255 caracteres), así que la imagen se guarda como archivo en
// backend/uploads y la base guarda la ruta "/uploads/eventos/EVT-2026-0006-ab12cd34ef.jpg".

const CARPETA_UPLOADS = path.join(__dirname, "..", "..", "uploads");
const MAXIMO_BYTES = 2 * 1024 * 1024; // 2 MB ya decodificada
const RE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

// Los primeros bytes de un archivo dicen qué es de verdad (el "image/jpeg" de la cabecera lo escribe cualquiera)
function tipoReal(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length > 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

// Devuelve lo que se guarda en la columna:
// - vacío -> null
// - una URL http(s) o una ruta de imagen de la propia web ("img/27459.png") -> tal cual (máximo 255)
// - una data URL -> se guarda el archivo y se devuelve su ruta "/uploads/<subcarpeta>/<nombre>-<hash>.<ext>"
function guardarImagen(valor, subcarpeta, nombre, campo = "imagen") {
  let v = typeof valor === "string" ? valor.trim() : "";
  if (!v) return null;
  // Al editar, la web reenvía la URL completa de la imagen que ya tenía: se guarda de nuevo la ruta relativa
  if (v.startsWith(`${publicUrl}/uploads/`)) v = v.slice(publicUrl.length);

  if (!v.startsWith("data:")) {
    const valida = /^https?:\/\//i.test(v) || /^img\/[\w./-]+$/.test(v) || /^\/uploads\/[\w./-]+$/.test(v);
    if (!valida || v.length > 255) {
      throw new ErrorHttp(400, `La ${campo} no es válida.`, { [campo]: "Sube una imagen o escribe una URL que empiece por http:// o https://." });
    }
    return v;
  }

  const m = RE_DATA_URL.exec(v);
  if (!m) throw new ErrorHttp(400, `La ${campo} no es válida.`, { [campo]: "La imagen debe ser JPG, PNG o WEBP." });
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length > MAXIMO_BYTES) {
    throw new ErrorHttp(413, `La ${campo} es demasiado grande.`, { [campo]: "La imagen no puede superar los 2 MB." });
  }
  const ext = tipoReal(buffer);
  if (!ext) throw new ErrorHttp(400, `La ${campo} no es válida.`, { [campo]: "El archivo no es una imagen." });

  const seguro = String(nombre).replace(/[^\w-]/g, "");
  const archivo = `${seguro}-${crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10)}.${ext}`;
  const carpeta = path.join(CARPETA_UPLOADS, subcarpeta);
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, archivo), buffer);
  return `/uploads/${subcarpeta}/${archivo}`;
}

// Lo que ve la web: una ruta guardada ("/uploads/...") se completa con la dirección pública del API
const urlPublica = (ruta) => (ruta && ruta.startsWith("/uploads/") ? publicUrl + ruta : ruta || "");

// Borra el archivo de una ruta guardada ("/uploads/eventos/evento-ab12cd34ef.jpg"). Solo acepta la forma exacta que
// produce guardarImagen (una subcarpeta y un archivo .jpg, .png o .webp), así nunca sale de la carpeta uploads/.
// Devuelve true si la ruta era de uploads/ (exista o no el archivo). Quién decide si la imagen ya no se usa: el modelo.
const RE_RUTA_SUBIDA = /^\/uploads\/([\w-]+)\/([\w-]+\.(?:jpg|png|webp))$/;
function borrarArchivoSubido(ruta) {
  const m = RE_RUTA_SUBIDA.exec(ruta || "");
  if (!m) return false;
  fs.rmSync(path.join(CARPETA_UPLOADS, m[1], m[2]), { force: true });
  return true;
}

module.exports = { guardarImagen, urlPublica, borrarArchivoSubido, CARPETA_UPLOADS };
