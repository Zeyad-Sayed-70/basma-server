import initSqlJs from 'sql.js';
import * as fs from 'node:fs';

const SQL = await initSqlJs();

export default class Database {
  #db;

  constructor(pathName) {
    const buffer = fs.readFileSync(pathName);
    this.#db = new SQL.Database(buffer);
  }

  prepare(sql) {
    return new Statement(this.#db, sql);
  }

  close() {
    this.#db.close();
  }
}

class Statement {
  #db;
  #sql;
  constructor(db, sql) {
    this.#db = db;
    this.#sql = sql;
  }

  all(...params) {
    const stmt = this.#db.prepare(this.#sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
}
