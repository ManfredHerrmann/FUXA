/**
 *  Module to manage the project datastore in a database
 *  Table: 'general', 'views', 'devices', 'chart' 
 */

'use strict';

const fs = require('fs');
const path = require('path');
var sqlite3 = require('sqlite3').verbose();

var settings
var logger;
var db_prj;

/**
 * Init and bind the database resource
 * @param {*} _settings 
 * @param {*} _log 
 */
function init(_settings, _log) {
    settings = _settings;
    logger = _log;

    return _bind();
}

/**
 * Bind the database resource by create the table if not exist
 */
function _bind() {
    return new Promise(function (resolve, reject) {
        var dbfile = path.join(settings.workDir, 'project.fuxap.db');
        var dbfileExist = fs.existsSync(dbfile);
        db_prj = new sqlite3.Database(dbfile, function (err) {
            if (err) {
                logger.error('prjstorage.failed-to-bind: ' + err);
                reject();
            }
            logger.info('prjstorage.connected-to ' + dbfile + ' database.');
        });
        // prepare query
        var sql = "CREATE TABLE if not exists general (name TEXT PRIMARY KEY, value TEXT);";
        sql += "CREATE TABLE if not exists views (name TEXT PRIMARY KEY, value TEXT);";
        sql += "CREATE TABLE if not exists devices (name TEXT PRIMARY KEY, value TEXT, connection TEXT, cntid TEXT, cntpwd TEXT);";
        db_prj.exec(sql, function (err) {
            if (err) {
                logger.error('prjstorage.failed-to-bind: ' + err);
                reject();
            } else {
                resolve(dbfileExist);
            }
        });  
    });
} 

/**
 * Set default project value in database
 */
function setDefault() {
    return new Promise(function (resolve, reject) {
        var scs = [];
        scs.push({ table: TableType.GENERAL, name: 'version', value: '1.01' });
        scs.push({ table: TableType.DEVICES, name: 'server', value: { 'id': '0', 'name': 'Fuxa Server', 'type': 'FuxaServer', 'property': {} } });
        setSections(scs).then(() => {
            resolve();
        }).catch(function (err) {
            reject(err);
        });
    });
}

/**
 * Insert the list of values in database tables, if exist replace the value of name(key)
 * The section contains the name of table, name(key) and value
 * @param {*} sections 
 */
function setSections(sections) {
    return new Promise(function (resolve, reject) {
        // prepare query
        var sql = "";
        for(var i = 0; i < sections.length; i++) {
            sql += "INSERT OR REPLACE INTO " + sections[i].table + " (name, value) VALUES('" + sections[i].name + "','"+ JSON.stringify(sections[i].value) + "');";
        }
        db_prj.exec(sql, function (err) {
            if (err) {
                logger.error('prjstorage.failed-to-set: ' + err);
                reject();
            } else {
                resolve();
            }
        });          
    });
}

/**
 * Insert the values in database table, if exist replace the value of name(key)
 * The section contains the name of table, name(key) and value
 * @param {*} section
 */
function setSection(section) {
    return new Promise(function (resolve, reject) {
        var sql = "INSERT OR REPLACE INTO " + section.table + " (name, value) VALUES('" + section.name + "','"+ JSON.stringify(section.value) + "');";
        db_prj.exec(sql, function (err) {
            if (err) {
                logger.error('prjstorage.failed-to-set: ' + err);
                reject();
            } else {
                resolve();
            }
        });          
    });
}

/**
 * Return all values of table with this name
 * If name is null return all values in table
 * @param {*} table 
 * @param {*} name 
 */
function getSection(table, name) {
    return new Promise(function (resolve, reject) {
        var sql = "SELECT name, value FROM " + table;
        if (name) {
            sql += " WHERE name = '" + name + "'";
        }
        db_prj.all(sql, function (err, rows) {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Delete the values in database table
 * The section contains the name of table, name(key)
 * @param {*} section 
 */
function deleteSection(section) {
    return new Promise(function (resolve, reject) {
        var sql = "DELETE FROM " + section.table + " WHERE name = '" + section.name + "'";
        db_prj.run(sql, function (err, rows) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Close the database
 */
function close() {
    if (db_prj) {
        db_prj.close();
    }
}

function clearAll() {
    return new Promise(function (resolve, reject) {
        // prepare query
        var sql = "DELETE FROM general;";
        sql += "DELETE FROM views;";
        sql += "DELETE FROM devices;";
        db_prj.exec(sql, function (err) {
            if (err) {
                logger.error('prjstorage.failed-to-clear: ' + err);
                reject();
            } else {
                resolve(true);
            }
        });  
    });
}

// function _updateSection(section) {
//     return new Promise(function (resolve, reject) {
//         var sql = "UPDATE ? SET value = ? WHERE name = ?";
//         db_prj.run(sql, [section.table, section.value, section.name], function (err) {
//             if (err !== null) {
//                 reject(err);
//             } else {
//                 resolve();
//             }
//         });
//     });
// }

// export class ProjectData {
//     version: string = "1.00"
//     projectFile: string;
//     server: Device = new Device();
//     hmi: Hmi = new Hmi();
//     devices = {};
//     charts: Chart[] = [];
// }
// export class Hmi {
//     _id: string;
//     _version: string;
//     name: string = '';
//     layout: LayoutSettings = new LayoutSettings();
//     views: View[] = [];
//     // variables: Variable[] = [];
//     // alarmes: Alarm[] = [];
//     // devices = {};
// }

const TableType = {
    GENERAL: 'general',
    DEVICES: 'devices',
    VIEWS: 'views',
    CHARTS: 'charts'
}

module.exports = {
    init: init,
    close: close,
    clearAll: clearAll,
    getSection: getSection,
    setSections: setSections,
    setSection: setSection,
    deleteSection: deleteSection,
    setDefault: setDefault,
    TableType: TableType,
    // reset: reset,
    // addDaqNode: addDaqNode,
    // getNodeValues: getNodeValues
};