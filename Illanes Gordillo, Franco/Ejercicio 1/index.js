const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const PORT = 3001;

app.use(express.json());

// Middleware para capturar y devolver errores de express-validator
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// Validaciones para creacion y modificacion
const rectanguloValidation = [
    body('lado1')
        .exists({ checkFalsy: true }).withMessage('lado1 es obligatorio')
        .isFloat({ gt: 0 }).withMessage('lado1 debe ser un numero mayor a cero')
        .toFloat(),
    body('lado2')
        .exists({ checkFalsy: true }).withMessage('lado2 es obligatorio')
        .isFloat({ gt: 0 }).withMessage('lado2 debe ser un numero mayor a cero')
        .toFloat(),
    body('perimetro')
        .not().exists().withMessage('No esta permitido enviar perimetro; se calcula en el servidor'),
    body('superficie')
        .not().exists().withMessage('No esta permitido enviar superficie; se calcula en el servidor'),
    handleValidationErrors
];

// Validacion de identificadores de ruta
const idValidation = [
    param('id')
        .isInt({ gt: 0 }).withMessage('El parámetro id debe ser un numero entero positivo')
        .toInt(),
    handleValidationErrors
];

// 1. Obtener todos los rectangulos
app.get('/api/rectangulos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rectangulos');
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ error: 'Error al consultar la base de datos', detalle: error.message });
    }
});

// 2. Obtener un rectangulo por ID
app.get('/api/rectangulos/:id', idValidation, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM rectangulos WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Rectangulo no encontrado' });
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
    }
});

// 3. Crear rectangulo (cálculo de perimetro y superficie en el servidor)
app.post('/api/rectangulos', rectanguloValidation, async (req, res) => {
    const { lado1, lado2 } = req.body;
    const perimetro = 2 * (lado1 + lado2);
    const superficie = lado1 * lado2;

    try {
        const [result] = await db.query(
            'INSERT INTO rectangulos (lado1, lado2, perimetro, superficie) VALUES (?, ?, ?, ?)',
            [lado1, lado2, perimetro, superficie]
        );

        return res.status(201).json({
            mensaje: 'Rectangulo creado exitosamente',
            rectangulo: {
                id: result.insertId,
                lado1,
                lado2,
                perimetro,
                superficie
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al persistir el rectangulo', detalle: error.message });
    }
});

// 4. Modificar rectangulo
app.put('/api/rectangulos/:id', idValidation, rectanguloValidation, async (req, res) => {
    const { id } = req.params;
    const { lado1, lado2 } = req.body;
    const perimetro = 2 * (lado1 + lado2);
    const superficie = lado1 * lado2;

    try {
        const [result] = await db.query(
            'UPDATE rectangulos SET lado1 = ?, lado2 = ?, perimetro = ?, superficie = ? WHERE id = ?',
            [lado1, lado2, perimetro, superficie, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Rectangulo no encontrado para actualizar' });
        }

        return res.status(200).json({
            mensaje: 'Rectangulo actualizado exitosamente',
            rectangulo: {
                id,
                lado1,
                lado2,
                perimetro,
                superficie
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar el registro', detalle: error.message });
    }
});

// 5. Eliminar rectangulo
app.delete('/api/rectangulos/:id', idValidation, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM rectangulos WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Rectangulo no encontrado para eliminar' });
        }
        return res.status(200).json({ mensaje: 'Rectangulo eliminado exitosamente' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al eliminar el registro', detalle: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de Rectangulos corriendo en http://localhost:${PORT}`);
});