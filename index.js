
const { Pool } = require('pg');

const Cursor = require("pg-cursor");

const argumentos = process.argv.slice(2);

let condicion = argumentos[0];
let cuenta = argumentos[1];
let monto = argumentos[2];
let descripcion = argumentos[3];
let fecha = argumentos[4];
let cuenta2 = argumentos[5];


const config = {
    user: "postgres",
    host: "localhost",
    password: "postgresql",
    database: "banco",
    port: 5432,
    max: 20,
    min: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 2000
};


const pool = new Pool(config);


const banco = async (condicion, cuenta, monto, descripcion, fecha, cuenta2) => {
    pool.connect(async (error_conexion, client, release) => {
        if (error_conexion)
            return console.error('Código del error: ', error_conexion.code);
        try {
            switch (condicion) {
                case "nuevo":
                    await agregar(cuenta, monto, descripcion, fecha, cuenta2, client)
                    break;
                case "depositar":
                    await depositar(cuenta, monto, descripcion, fecha, client)
                    break;
                case "retirar":
                    await retirar(cuenta, monto, descripcion, fecha, client)
                    break;
                case "consulta":
                    await consulta(cuenta, client)
                    break;
                case "id":
                    await cursor(cuenta, client)
                    break;
                default:
                    console.log("Ingresar un comando válido porfavor (nuevo, depositar, retirar, consulta o id)")
                    break;
            }
        } catch (e) {
            console.log('Error externo de try catch: ', e.message);
            console.log('Error código: ', e.code);
            console.log('Detalle del error: ', e.detail);
            console.log('Tabla originaria del error: ', e.table);
            console.log('Restricción violada en el campo: ', e.constraint);
        }

        release();
        pool.end();
    });
}

banco(condicion, cuenta, monto, descripcion, fecha, cuenta2);



const agregar = async (cuenta, monto, descripcion, fecha, cuenta2, client) => {
    const sumar = `UPDATE cuentas SET saldo = saldo + ${monto} WHERE id = ${cuenta2} RETURNING *`;
    const restar = `UPDATE cuentas SET saldo = saldo - ${monto} WHERE id = ${cuenta} RETURNING *`;
    const insert = `INSERT INTO transacciones (cuenta, monto, descripcion, fecha) VALUES (${cuenta}, ${monto}, '${descripcion}', '${fecha}')  RETURNING *;`;
    try {
        await client.query("BEGIN");
        await client.query(sumar);
        await client.query(restar);
        const res = await client.query(insert);
        console.log(`Transferencia de $${monto} desde cuenta N°${cuenta} a cuenta N°${cuenta2} realizada con éxito!!`, res.rows[0]);
        await client.query("COMMIT");
    }
    catch (e) {
        await client.query("ROLLBACK");
        console.log('Mensaje error en insert: ', e.message);
        console.log('error.code: ', e.code);
        console.log('error.detail: ', e.detail);
        console.log("Tabla originaria del error: " + e.table);
        console.log("Restricción violada en el campo: " + e.constraint);
    }
}


const depositar = async (cuenta, monto, descripcion, fecha, client) => {
    try {
        const sumar = `UPDATE cuentas SET saldo = saldo + ${monto} WHERE id = ${cuenta} RETURNING *`;
        const insert = `INSERT INTO transacciones (cuenta, monto, descripcion, fecha) VALUES (${cuenta}, ${monto}, '${descripcion}', '${fecha}')  RETURNING *;`;
        await client.query("BEGIN");
        await client.query(sumar);
        const res = await client.query(insert);
        console.log("Depósito realizado con éxito: ", res.rows[0]);
        console.log(`Depósito de $${monto} a cuenta N°${cuenta} realizado con éxito!!`);
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.log('e.depositar: ', e.message);
        console.log('Error código: ', e.code);
        console.log('Detalle del error: ', e.detail);
        console.log('Tabla originaria del error: ', e.table);
        console.log('Restricción violada en el campo: ', e.constraint);
    }
}


const retirar = async (cuenta, monto, descripcion, fecha, client) => {
    try {
        const restar = `UPDATE cuentas SET saldo = saldo - ${monto} WHERE id = ${cuenta} RETURNING *`;
        const insert = `INSERT INTO transacciones (cuenta, monto, descripcion, fecha) VALUES (${cuenta}, ${monto}, '${descripcion}', '${fecha}')  RETURNING *;`;
        await client.query("BEGIN");
        await client.query(restar);
        const res = await client.query(insert);
        console.log("Retiro realizado con éxito: ", res.rows[0]);
        console.log(`Retiro de $${monto} de cuenta N°${cuenta} realizado con éxito!!`);
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.log('e.message: ', e.message);
        console.log('Error código: ', e.code);
        console.log('Detalle del error: ', e.detail);
        console.log('Tabla originaria del error: ', e.table);
        console.log('Restricción violada en el campo: ', e.constraint);
    }
}


const consulta = async (cuenta, client) => {
    const select = new Cursor(`SELECT * FROM transacciones WHERE cuenta = ${cuenta}`);
    const cursor = await client.query(select);

    let rows;
    rows = await cursor.read(10);
    console.log(`Consulta de transacciones a cuenta N°${cuenta} realizado con éxito!!`, rows);
    await cursor.close();
}


const cursor = async (cuenta, client) => {
    const select = new Cursor(`SELECT saldo, id FROM cuentas where id = ${cuenta}`);
    const cursor = client.query(select);

    let rows;
    rows = await cursor.read(1);
    console.log(`Consulta de saldo a cuenta N°${cuenta} realizado con éxito!!`, rows);
    await cursor.close();
}