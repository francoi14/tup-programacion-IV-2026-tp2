# Ejercicio 3 - Calificaciones de Alumnos

## Fundamentacion del modelo de datos

**Tablas y relacion foranea:** Se implemento una tabla independiente `materias` (id, nombre) y una tabla `calificaciones` (id, alumno, materia_id, nota1, nota2, nota3, created_at). La columna `materia_id` es una clave foranea que referencia a `materias(id)` con regla `ON DELETE CASCADE` para asegurar la integridad referencial.
**Escala de notas:** Se adopto una escala numerica de 1 a 10 con precision decimal (DECIMAL(4,2)), correspondiente al estandar universitario nacional.
**Regla de unicidad:** Se prohibe que un mismo alumno posea mas de un registro de calificaciones para una misma materia. El backend valida de forma case-insensitive y normalizando espacios (LOWER y TRIM) tanto al registrar (POST) como al actualizar (PUT).
**Validaciones (express-validator):**
  * `alumno`: obligatorio, tipo texto y minimo 3 caracteres.
  * `materia_id`: entero positivo obligatorio, validando ademas su existencia en la tabla `materias`.
  * `nota1`, `nota2`, `nota3`: obligatorias, numericas y acotadas estrictamente a la escala de 1 a 10.
  * Parametros de ruta y consulta: `:id` validado como entero positivo, y filtros por `materia_id` y `alumno`.