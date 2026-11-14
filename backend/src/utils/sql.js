// Fragmentos de SQL compartidos por los modelos que cuentan reservas, ventas e ingresos.
// Se usan con el alias r (RESERVA).

// ¿La entrada sirve para entrar y cuenta como ingreso? Misma regla de entradaValida() en la web:
// no está cancelada y es gratis o un administrador ya la confirmó (aprobó la reserva y el pago).
const ES_VALIDA = `(
  r.estado <> 'Cancelada'
  AND (r.valor_total = 0 OR r.estado IN ('Confirmada', 'Usada'))
)`;

module.exports = { ES_VALIDA };
