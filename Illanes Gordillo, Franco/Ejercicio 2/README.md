# Ejercicio 2 - Tareas

## Fundamentacion y diseno

**Criterio de unicidad:** No se admiten tareas con nombres repetidos. Se aplica un criterio consistente normalizando los espacios con TRIM y comparando todo en minusculas con LOWER en la base de datos para no dejar pasar duplicados por espacios o mayusculas.
**Filtrado por estado:** En GET /api/tareas se puede pasar el query param ?completada=true o ?completada=false para traer tareas segun su estado.
**Validaciones (express-validator):**
  * nombre: obligatorio, texto y minimo 3 caracteres.
  * completada: booleano valido (isBoolean).
  * Parametro de consulta completada: validado con isIn(['true', 'false', '1', '0']).
  * Parametro :id: validado como entero positivo.