**Calculos en servidor:** Solo se reciben `lado1` y `lado2`. El perimetro y la superficie se calculan en el backend antes de guardar en la base de datos.
**Restriccion:** Si mandan `perimetro` o `superficie` en el body, se rechaza la peticion con error 400.
**Validaciones (express-validator):**
  * Lados obligatorios y mayores a cero (`gt: 0`).
  * ID en parametros de ruta entero positivo (`gt: 0`).
  * Bloqueo de perimetro y superficie con `not().exists()`.

