# bitwarden ssh-agent helper
> Helper to register ssh keys saved in bitwarden to ssh-agent

## Command
```
node bws.js [shouldSync:true] [session]
```

## How to use
### Setup bitwarden cli
1. Install bitwarden cli: https://github.com/bitwarden/clients

### Setup vault
1. Open bitwarden and create a folder called `ssh-agent`
2. Create items with the following info:
```
  - name: `{text}`
    NOTE: If the first character is `#`, ignore this key. Also, if the first character is `+`, the file will be saved in `~/.ssh/${prtivate field value}`.
    custom fields:
      - name: `private_key`
        value: `<private key>`
      - name: `public_key`
        value: `<public key>`
        NOTE: not used yet
      - name: `private`
        value: `<private key name>`
```

### Setup ssh-agent
1. Run `ssh-agent`
2. Run `node bws.js`