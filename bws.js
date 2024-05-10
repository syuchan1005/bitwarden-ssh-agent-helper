/**
 * ```
 * node bws.js [shouldSync:true] [session]
 * ```
 */

const process = require('node:process');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { writeFileSync } = require('node:fs');

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
/** @type {{ name: string, fields: { name: string, value: string }[] }[]} */
const items = JSON.parse(itemsStdout);
const keyDataList = items
    .map((item) => {
        if (item.name.startsWith('#')) {
            return undefined;
        }
        const privateKeys = item.fields.filter((field) => field.name === 'private_key');
        if (privateKeys.length !== 1) {
            return undefined;
        }

        return {
            name: item.name,
            privateKeyFileName: item.fields.find((field) => field.name === 'private').value,
            privateKey: privateKeys[0]
                .value
                .replace(/ ([^ ]{30,})/g, '\n$1').replace(' -----END', '\n-----END')
                + '\n',
            dist: { '+': 'file', '#': 'ignore' }[item.name[0]] || 'agent',
        };
    })
    .filter((item) => item !== undefined);

const userHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
const maxKeyNameLength = keyDataList.reduce((max, keyData) => Math.max(max, keyData.name.length), 0);
for (const keyData of keyDataList) {
    switch (keyData.dist) {
        case 'agent':
            const sshAddStdout = spawnSync('ssh-add', ['-'], { input: `${keyData.privateKey}\n` })
                .stderr.toString();
            console.log(sshAddStdout.replace(('(stdin)').trim(), keyData.name.padEnd(maxKeyNameLength, ' ')));
            break;
        case 'file':
            writeFileSync(
                join(userHome, '.ssh', keyData.privateKeyFileName),
                keyData.privateKey,
                { mode: 0o600 },
            );
            console.log(`Identity saved: ~/.ssh/${keyData.privateKeyFileName}`);
            break;
        case 'ignore':
            console.log(`Identity ignored: ${keyData.name}`);
            break;
    }
}
