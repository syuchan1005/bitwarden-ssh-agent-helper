/**
 * ```
 * node bws.js [shouldSync:true] [session]
 * ```
 */

const process = require('node:process');
const { spawnSync } = require('node:child_process');

let shouldSync = true;
let session;
if (process.argv.length >= 3) {
    if (['true', 'false'].includes(process.argv[2])) {
        shouldSync = process.argv[2] === 'true';
        if (process.argv[3] !== undefined) {
            session = {
                code: 0,
                data: process.argv[3],
            };
        }
    } else {
        session = {
            code: 0,
            data: process.argv[2],
        };
    }
}

if (session === undefined) {
    const loginCheck = spawnSync('bw', ['login', '--check', '--quiet']);
    let op;
    if (loginCheck.status === 0) {
        op = 'unlock';
    } else {
        op = 'login';
    }

    sessionResult = spawnSync('bw', ['--raw', op], { shell: true, stdio: ['inherit', 'pipe', 'inherit'] });
    session = { code: sessionResult.status, data: sessionResult.stdout };
    if (session.code !== 0) {
        process.exit(1);
    }
    console.log(`Session: ${session.data}`);
}

if (shouldSync) {
    spawnSync('bw', ['sync', '--session', session.data]);
    console.log('Valut synced');
}

const foldersStdout = spawnSync('bw', ['list', 'folders', '--search', 'ssh-agent', '--session', session.data])
    .stdout;
const folderId = JSON.parse(foldersStdout)[0].id;
const itemsStdout = spawnSync('bw', ['list', 'items', '--folderid', folderId, '--session', session.data])
    .stdout;
/** @type {{ fields: { name: string, value: string }[] }[]} */
const items = JSON.parse(itemsStdout);
const privateKeys = items
    .flatMap((item) => item.fields)
    .filter((field) => field.name === "private_key")
    .map((field) => field.value.replace(/ ([^ ]{30,})/g, '\n$1').replace(' -----END', '\n-----END'));
for (const privateKey of privateKeys) {
    spawnSync('ssh-add', ['-'], { input: `${privateKey}\n`, stdio: ['pipe', 'inherit', 'inherit'] });
}
