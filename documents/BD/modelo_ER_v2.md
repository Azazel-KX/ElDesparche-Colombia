# Modelo relacional — ElDesparche v2 (18 tablas)

Fuente de verdad: `Diagrama_v2.drawio`. Detalle y normalización: `Modelo_Relacional_3FN_Diagrama_v2.docx`.
Esquema SQL: `database/schema_ElDesparche.sql`. Datos de prueba: `database/seed.sql`.

```mermaid
erDiagram
    PAIS ||--o{ DEPARTAMENTO : contiene
    DEPARTAMENTO ||--o{ CIUDAD : pertenece
    CIUDAD ||--o{ UBICACION : pertenece
    CIUDAD ||--o{ USUARIO : "UbiPer"

    USUARIO ||--o{ TELEFONO_USUARIO : tiene
    USUARIO ||--o| ADMIN : "IS-A"
    USUARIO ||--o| CLIENTE : "IS-A"
    USUARIO ||--o| AGENTE : "IS-A"
    ADMIN ||--o{ SESION_ADMIN : inicia

    USUARIO ||--o{ VERIFICACION : comprueba
    VERIFICACION ||--o| VERIF_CONTACTO : detalla

    UBICACION ||--o{ EVENTO : "UbiEve"
    AGENTE ||--o{ EVENTO : registra
    CAUSA_CANCELACION |o--o{ EVENTO : "CausaEve"
    CAUSA_CANCELACION |o--o{ RESERVA : "CausaRes"

    CLIENTE ||--o{ RESERVA : inscribe
    EVENTO ||--o{ RESERVA : ofrece
    RESERVA ||--o{ PAGO : genera
    CLIENTE ||--o{ METODO_PAGO : registra
    METODO_PAGO ||--o{ PAGO : utiliza
    CLIENTE }o--o{ CLIENTE : "CONEXION_SOCIAL"

    PAIS {
        int id_pais PK
        string nombre UK
    }
    DEPARTAMENTO {
        int id_departamento PK
        string nombre
        int id_pais FK
    }
    CIUDAD {
        int id_ciudad PK
        string nombre
        int id_departamento FK
    }
    UBICACION {
        int id_ubicacion PK
        string direccion
        decimal latitud
        decimal longitud
        int id_ciudad FK
    }
    USUARIO {
        string numero_identificacion PK
        enum tipo_identificacion
        enum tipo_usuario
        string nombre
        string apellidos
        string correo UK
        string contrasena_hash
        string direccion
        timestamp fecha_registro
        int id_ciudad FK
    }
    TELEFONO_USUARIO {
        string numero_identificacion PK
        string telefono PK
    }
    ADMIN {
        string numero_identificacion PK
        enum tipo_usuario
        decimal salario
        enum horario
    }
    CLIENTE {
        string numero_identificacion PK
        enum tipo_usuario
        date fecha_nacimiento
        string foto_perfil
        string alias UK
        int puntos
        bool publicidad
    }
    AGENTE {
        string numero_identificacion PK
        enum tipo_usuario
        string nit UK
        string razon_social
        string nombre_comercial
        string descripcion
        string logo_url
        decimal comision
        int experiencia
    }
    SESION_ADMIN {
        string numero_identificacion PK
        int numero_sesion PK
        timestamp fecha_hora_conexion
        timestamp fecha_hora_desconexion
        inet direccion_ip
    }
    VERIFICACION {
        int id_verificacion PK
        enum tipo
        enum estado
        timestamp fecha_solicitud
        timestamp fecha_actualizacion
        string numero_identificacion FK
    }
    VERIF_CONTACTO {
        int id_verificacion PK
        enum tipo
        string codigo_hash
        timestamp fecha_expiracion
        int intentos
    }
    CAUSA_CANCELACION {
        int id_causa PK
        string nombre UK
        enum aplica_a
    }
    EVENTO {
        string codigo PK
        string nombre
        string descripcion
        string categoria
        string url_imagen
        timestamp fecha_hora_inicio
        timestamp fecha_hora_fin
        int capacidad_total
        int edad_minima
        string observaciones
        enum estado
        timestamp fecha_creacion
        decimal precio
        int id_ubicacion FK
        string id_agente FK
        int id_causa FK
    }
    RESERVA {
        int id_reserva PK
        uuid codigo_qr UK
        decimal valor_total
        timestamp fecha_hora
        enum estado
        int numero_entradas
        string observaciones
        string id_cliente FK
        string codigo_evento FK
        int id_causa FK
    }
    METODO_PAGO {
        int id_metodo PK
        enum tipo
        string proveedor
        string referencia_visible
        string token_pasarela
        bool activo
        timestamp fecha_registro
        string id_cliente FK
    }
    PAGO {
        int id_pago PK
        decimal monto
        timestamp fecha_hora
        string referencia_transaccion UK
        enum estado
        int id_reserva FK
        int id_metodo FK
    }
    CONEXION_SOCIAL {
        string id_solicitante PK
        string id_receptor PK
        timestamp fecha_solicitud
        enum estado
    }
```

## Decisiones del modelo

- **Herencia total y disjunta** USUARIO → ADMIN / CLIENTE / AGENTE: columna `tipo_usuario` y FK compuesta en cada subtipo; un trigger diferido exige que cada usuario tenga su fila de subtipo.
- **Verificación**: relación 1:1 `Detalla` entre VERIFICACION y VERIF_CONTACTO.
- **Cancelaciones**: `CAUSA_CANCELACION` es un catálogo; EVENTO y RESERVA guardan `id_causa` (nulo salvo cuando están cancelados).
- **Derivados no almacenados**: `edad` (de `fecha_nacimiento`) y `tiempo_en_pantalla` (de las dos fechas de la sesión).
