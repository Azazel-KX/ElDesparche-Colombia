// Fragmentos de SQL compartidos por los modelos que cuentan reservas, ventas e ingresos.
// Se usan con los alias r (RESERVA) y p (el último PAGO de la reserva).

// El último pago de cada reserva (una reserva puede tener varios por reintentos)
const LATERAL_PAGO = `
  LEFT JOIN LATERAL (
    SELECT pg.id_pago, pg.estado, pg.monto, pg.referencia_transaccion, pg.id_metodo
      FROM PAGO pg WHERE pg.id_reserva = r.id_reserva ORDER BY pg.id_pago DESC LIMIT 1
  ) p ON TRUE`;

// ¿La entrada sirve para entrar y cuenta como ingreso? Misma regla de entradaValida() en frontend/js/admin.js:
// no cancelada y, si tiene pago, aprobado; si no tiene pago, gratis o confirmada por un administrador (taquilla).
const ES_VALIDA = `(
  r.estado <> 'Cancelada'
  AND CASE WHEN p.id_pago IS NOT NULL THEN p.estado = 'Aprobado'
           ELSE (r.valor_total = 0 OR r.estado IN ('Confirmada', 'Usada')) END
)`;

module.exports = { LATERAL_PAGO, ES_VALIDA };
