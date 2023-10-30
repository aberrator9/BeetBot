const fs = require('fs');
const colors = require('colors');

const logDir = './logs';
const maxSessionLogs = 1;

class Logger {
    constructor(logFilePath, sessionLogFilePath, debug = false) {
        this.logFilePath = logFilePath;
        this.sessionLogFilePath = sessionLogFilePath;
        this.debug = debug;

        this.createLogFile(this.logFilePath);
        this.createLogFile(this.sessionLogFilePath);

        this.limitSessionLogs();
    }

    limitSessionLogs() {
        fs.readdir(logDir, (err, files) => {
            if (err) {
                console.log('Error reading log directory:', err)
                return;
            }
            for (let i = 0; i < files.length - maxSessionLogs - 1; i++) {
                fs.unlinkSync(`./logs/${files[i]}`);
            }
        });
    }

    createLogFile(path) {
        if (!fs.existsSync(path)) fs.writeFileSync(path, '');
    }

    log(level, msg) {
        fs.appendFileSync(this.logFilePath, msg + '\n');
        fs.appendFileSync(this.sessionLogFilePath, msg + '\n');

        if (level === 'err') console.log(msg.red);
        else if (level === 'warn') console.log(msg.yellow);
        else if (this.debug) {
            if (level === 'success') console.log(msg.green);
            else console.log(msg);
        }
    }
}

module.exports = Logger;
