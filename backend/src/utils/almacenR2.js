const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { r2 } = require("../config/env");

// Cliente mínimo de Cloudflare R2 (API compatible con S3). Solo sube y borra archivos; la lectura la hace el navegador
// directo desde la dirección pública del bucket (R2_PUBLIC_URL), sin pasar por este servidor.

const TIPOS = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

let cliente = null;
function s3() {
  if (!cliente) {
    cliente = new S3Client({
      region: "auto",
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
    });
  }
  return cliente;
}

// clave: "eventos/evento-ab12cd34ef.jpg" (el nombre lleva el hash del contenido, así que nunca cambia: caché larga)
async function subir(clave, buffer) {
  const ext = clave.split(".").pop();
  await s3().send(new PutObjectCommand({
    Bucket: r2.bucket,
    Key: clave,
    Body: buffer,
    ContentType: TIPOS[ext] || "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
  }));
}

async function borrar(clave) {
  await s3().send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: clave }));
}

module.exports = { subir, borrar };
