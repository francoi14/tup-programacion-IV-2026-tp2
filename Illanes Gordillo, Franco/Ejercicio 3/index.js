const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const PORT = 3003;

app.use(express.json());

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// Validacion para registrar calificaciones
const crearCalificacionValidation = [
    body('alumno')
        .exists({ checkFalsy: true }).withMessage('El nombre del alumno es obligatorio')
        .isString().withMessage('El nombre del alumno debe ser texto')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre del alumno debe tener al menos 3 caracteres'),
    body('materia_id')
        .exists().withMessage('El campo materia_id es obligatorio')
        .isInt({ gt: 0 }).withMessage('materia_id debe ser un entero positivo')
        .toInt(),
    body('nota1')
        .exists().withMessage('La nota 1 es obligatoria')
        .isFloat({ min: 1, max: 10 }).withMessage('La nota 1 debe ser un numero entre 1 y 10')
        .toFloat(),
    body('nota2')
        .exists().withMessage('La nota 2 es obligatoria')
        .isFloat({ min: 1, max: 10 }).withMessage('La nota 2 debe ser un numero entre 1 y 10')
        .toFloat(),
    body('nota3')
        .exists().withMessage('La nota 3 es obligatoria')
        .isFloat({ min: 1, max: 10 }).withMessage('La nota 3 debe ser un numero entre 1 y 10')
        .toFloat(),
    handleValidationErrors
];

// Validacion para actualizar calificacion
const actualizarCalificacionValidation = [
    param('id')
        .isInt({ gt: 0 }).withMessage('El parametro id debe ser un entero positivo')
        .toInt(),
    body('alumno')
        .optional()
        .isString().withMessage('El nombre del alumno debe ser texto')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre del alumno debe tener al menos 3 caracteres'),
    body('materia_id')
        .optional()
        .isInt({ gt: 0 }).withMessage('materia_id debe ser un entero positivo')
        .toInt(),
    body('nota1')
        .optional()
        .isFloat({ min: 1, max: 10 }).withMessage('La nota 1 debe ser un numero entre 1 y 10')
        .toFloat(),
    body('nota2')
        .optional()
        .isFloat({ min: 1, max: 10 }).withMessage('La nota 2 debe ser un numero entre 1 y 10')
        .toFloat(),
    body('nota3')
        .optional()
        .isFloat({ min: 1, max: 10 }).withMessage('La nota 3 debe ser un numero entre 1 y 10')
        .toFloat(),
    handleValidationErrors
];

const idValidation = [
    param('id')
        .isInt({ gt: 0 }).withMessage('El parametro id debe ser un entero positivo')
        .toInt(),
    handleValidationErrors
];

const filtroValidation = [
    query('materia_id')
        .optional()
        .isInt({ gt: 0 }).withMessage('El filtro materia_id debe ser un entero positivo')
        .toInt(),
    query('alumno')
        .optional()
        .isString().withMessage('El filtro alumno debe ser texto')
        .trim(),
    handleValidationErrors
];

// 1. Listar materias disponibles
app.get('/api/materias', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM materias ORDER BY id ASC');
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ error: 'Error al consultar materias', detalle: error.message });
    }
});

// 2. Listar todas las calificaciones con JOIN a materias y filtros opcionales
app.get('/api/calificaciones', filtroValidation, async (req, res) => {
    const { materia_id, alumno } = req.query;
    try {
        let sql = `
            SELECT c.id, c.alumno, c.materia_id, m.nombre AS materia,
                   c.nota1, c.nota2, c.nota3, c.created_at
            FROM calificaciones c
            JOIN materias m ON c.materia_id = m.id
        `;
        const params = [];
        const conditions = [];

        if (materia_id !== undefined) {
            conditions.push('c.materia_id = ?');
            params.push(materia_id);
        }

        if (alumno !== undefined) {
            conditions.push('LOWER(c.alumno) LIKE LOWER(?)');
            params.push(`%${alumno.trim()}%`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY c.id ASC';

        const [rows] = await db.query(sql, params);
        return res.status(200).json(rows);
    } catch (error) {
        return res.status(500).json({ error: 'Error al consultar calificaciones', detalle: error.message });
    }
});

// 3. Obtener calificacion por ID
app.get('/api/calificaciones/:id', idValidation, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT c.id, c.alumno, c.materia_id, m.nombre AS materia,
                   c.nota1, c.nota2, c.nota3, c.created_at
            FROM calificaciones c
            JOIN materias m ON c.materia_id = m.id
            WHERE c.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Registro de calificacion no encontrado' });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
    }
});

// 4. Crear calificacion (verifica que la materia exista y regla de unicidad alumno-materia)
app.post('/api/calificaciones', crearCalificacionValidation, async (req, res) => {
    const { alumno, materia_id, nota1, nota2, nota3 } = req.body;
    const alumnoNormalizado = alumno.trim();

    try {
        // Verificar que la materia exista
        const [materiaRows] = await db.query('SELECT id, nombre FROM materias WHERE id = ?', [materia_id]);
        if (materiaRows.length === 0) {
            return res.status(400).json({
                errores: [{ msg: `La materia con id ${materia_id} no existe en la base de datos` }]
            });
        }

        // Verificar regla de unicidad: mismo alumno y misma materia
        const [duplicados] = await db.query(
            'SELECT id FROM calificaciones WHERE LOWER(TRIM(alumno)) = LOWER(?) AND materia_id = ?',
            [alumnoNormalizado, materia_id]
        );

        if (duplicados.length > 0) {
            return res.status(400).json({
                errores: [{ msg: `Ya existe un registro de calificaciones para el alumno '${alumnoNormalizado}' en esta materia` }]
            });
        }

        const [result] = await db.query(
            'INSERT INTO calificaciones (alumno, materia_id, nota1, nota2, nota3) VALUES (?, ?, ?, ?, ?)',
            [alumnoNormalizado, materia_id, nota1, nota2, nota3]
        );

        return res.status(201).json({
            mensaje: 'Calificacion registrada exitosamente',
            calificacion: {
                id: result.insertId,
                alumno: alumnoNormalizado,
                materia_id,
                materia: materiaRows[0].nombre,
                nota1,
                nota2,
                nota3
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al registrar calificacion', detalle: error.message });
    }
});

// 5. Actualizar calificacion (controla unicidad si cambia alumno o materia, y existencia de materia)
app.put('/api/calificaciones/:id', actualizarCalificacionValidation, async (req, res) => {
    const { id } = req.params;
    const { alumno, materia_id, nota1, nota2, nota3 } = req.body;

    try {
        const [registro] = await db.query('SELECT * FROM calificaciones WHERE id = ?', [id]);
        if (registro.length === 0) {
            return res.status(404).json({ error: 'Registro de calificacion no encontrado para actualizar' });
        }

        const alumnoFinal = alumno !== undefined ? alumno.trim() : registro[0].alumno;
        const materiaIdFinal = materia_id !== undefined ? materia_id : registro[0].materia_id;
        const nota1Final = nota1 !== undefined ? nota1 : registro[0].nota1;
        const nota2Final = nota2 !== undefined ? nota2 : registro[0].nota2;
        const nota3Final = nota3 !== undefined ? nota3 : registro[0].nota3;

        // Si actualiza materia, verificar que exista
        if (materia_id !== undefined) {
            const [materiaExiste] = await db.query('SELECT id FROM materias WHERE id = ?', [materia_id]);
            if (materiaExiste.length === 0) {
                return res.status(400).json({
                    errores: [{ msg: `La materia con id ${materia_id} no existe` }]
                });
            }
        }

        // Verificar unicidad en otro registro
        const [duplicados] = await db.query(
            'SELECT id FROM calificaciones WHERE LOWER(TRIM(alumno)) = LOWER(?) AND materia_id = ? AND id != ?',
            [alumnoFinal, materiaIdFinal, id]
        );

        if (duplicados.length > 0) {
            return res.status(400).json({
                errores: [{ msg: `Ya existe otro registro para el alumno '${alumnoFinal}' en la materia seleccionada` }]
            });
        }

        await db.query(
            'UPDATE calificaciones SET alumno = ?, materia_id = ?, nota1 = ?, nota2 = ?, nota3 = ? WHERE id = ?',
            [alumnoFinal, materiaIdFinal, nota1Final, nota2Final, nota3Final, id]
        );

        return res.status(200).json({
            mensaje: 'Calificacion actualizada exitosamente',
            calificacion: {
                id,
                alumno: alumnoFinal,
                materia_id: materiaIdFinal,
                nota1: nota1Final,
                nota2: nota2Final,
                nota3: nota3Final
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al actualizar calificacion', detalle: error.message });
    }
});

// 6. Eliminar calificacion
app.delete('/api/calificaciones/:id', idValidation, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM calificaciones WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Registro no encontrado para eliminar' });
        }
        return res.status(200).json({ mensaje: 'Calificacion eliminada exitosamente' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al eliminar calificacion', detalle: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de Calificaciones corriendo en http://localhost:${PORT}`);
});