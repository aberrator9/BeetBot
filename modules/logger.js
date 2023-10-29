const fs = require('fs');

const maxSessionLogs = 3;
const logDir = './logs';

class Logger {
    constructor(logFilePath, sessionLogFilePath) {
        this.logFilePath = logFilePath;
        this.sessionLogFilePath = sessionLogFilePath;

        this.createLogFile(this.logFilePath);
        this.createLogFile(this.sessionLogFilePath );

        this.limitSessionLogs();
    }

    limitSessionLogs() {
        fs.readdir(logDir, (err, files) => {
            if(err) { 
                console.log('Error reading log directory:', err)
                return;
            }
            for(let i = 0; i < files.length - maxSessionLogs-1; i++){
                fs.unlinkSync(`./logs/${files[i]}`);
            }
        });
    }

    createLogFile(path) {
        if (!fs.existsSync(path)) fs.writeFileSync(path, '');
    }

    log(msg) {
        fs.appendFileSync(this.logFilePath, msg + '\n');
        fs.appendFileSync(this.sessionLogFilePath, msg + '\n');
    }
}

module.exports = Logger;
