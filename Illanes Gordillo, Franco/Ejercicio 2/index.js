const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const PORT = 3002;

app.use(express.json());

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

const crearTareaValidation = [
    body('nombre')
        .exists({ checkFalsy: true }).withMessage('El nombre es obligatorio')
        .isString().withMessage('El nombre debe ser texto')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
    body('completada')
        .optional()
        .isBoolean().withMessage('El estado completada debe ser booleano')
        .toBoolean(),
    handleValidationErrors
];

const actualizarTareaValidation = [
    param('id')
        .isInt({ gt: 0 }).withMessage('El parametro id debe ser un entero positivo')
        .toInt(),
    body('nombre')
        .optional()
        .isString().withMessage('El nombre debe ser texto')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
    body('completada')
        .optional()
        .isBoolean().withMessage('El estado completada debe ser booleano')
        .toBoolean(),
    body().custom((value, { req }) => {
        if (req.body.nombre === undefined && req.body.completada === undefined) {
            throw new Error('Debe enviar al menos nombre o completada para actualizar');
        }
        return true;
    }),
    handleValidationErrors
];

const idValidation = [
    param('id')
        .isInt({ gt: 0 }).withMessage('El parametro id debe ser un entero positivo')
        .toInt(),
    handleValidationErrors
];

const filtroValidation = [
    query('completada')
        .optional()
        .isIn(['true', 'false', '1', '0']).withMessage('El filtro completada solo admite: true, false, 1 o 0'),
    handleValidationErrors
];

// Listar tareas con filtro opcional
app.get('/api/tareas', filtroValidation, async (req, res) => {
    const { completada } = req.query;
    try {
        let sql = 'SELECT * FROM tareas';
        const params = [];

        if (completada !== undefined) {
            const estadoBool = (completada === 'true' || completada === '1');
            sql += ' WHERE completada = ?';
            params.push(estadoBool);
        }

        const [rows] = await db.query(sql, params);
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ error: 'Error al consultar tareas', detalle: error.message });
    }
});

// Obtener una tarea por ID
app.get('/api/tareas/:id', idValidation, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM tareas WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
    }
});

// Crear tarea con validacion de duplicados
app.post('/api/tareas', crearTareaValidation, async (req, res) => {
    const { nombre, completada = false } = req.body;
    const nombreNormalizado = nombre.trim();

    try {
        const [duplicados] = await db.query(
            'SELECT id FROM tareas WHERE LOWER(TRIM(nombre)) = LOWER(?)',
            [nombreNormalizado]
        );

        if (duplicados.length > 0) {
            return res.status(400).json({
                errores: [{ msg: 'Ya existe una tarea registrada con ese nombre' }]
            });
        }

        const [result] = await db.query(
            'INSERT INTO tareas (nombre, completada) VALUES (?, ?)',
            [nombreNormalizado, completada]
        );

        return res.status(201).json({
            mensaje: 'Tarea creada exitosamente',
            tarea: {
                id: result.insertId,
                nombre: nombreNormalizado,
                completada
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al guardar la tarea', detalle: error.message });
    }
});

// Actualizar tarea
app.put('/api/tareas/:id', actualizarTareaValidation, async (req, res) => {
    const { id } = req.params;
    const { nombre, completada } = req.body;

    try {
        const [tareaExiste] = await db.query('SELECT * FROM tareas WHERE id = ?', [id]);
        if (tareaExiste.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada para actualizar' });
        }

        if (nombre !== undefined) {
            const nombreNormalizado = nombre.trim();
            const [duplicados] = await db.query(
                'SELECT id FROM tareas WHERE LOWER(TRIM(nombre)) = LOWER(?) AND id != ?',
                [nombreNormalizado, id]
            );

            if (duplicados.length > 0) {
                return res.status(400).json({
                    errores: [{ msg: 'Ya existe otra tarea con ese nombre' }]
                });
            }
        }

        const nombreFinal = nombre !== undefined ? nombre.trim() : tareaExiste[0].nombre;
        const estadoFinal = completada !== undefined ? completada : tareaExiste[0].completada;

        await db.query(
            'UPDATE tareas SET nombre = ?, completada = ? WHERE id = ?',
            [nombreFinal, estadoFinal, id]
        );

        return res.status(200).json({
            mensaje: 'Tarea actualizada exitosamente',
            tarea: {
                id,
                nombre: nombreFinal,
                completada: Boolean(estadoFinal)
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar la tarea', detalle: error.message });
    }
});

// Eliminar tarea
app.delete('/api/tareas/:id', idValidation, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM tareas WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada para eliminar' });
        }
        return res.status(200).json({ mensaje: 'Tarea eliminada exitosamente' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al eliminar la tarea', detalle: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de Tareas corriendo en http://localhost:${PORT}`);
});