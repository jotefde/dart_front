'use strict'
const fs = require('fs')
const path = require('path')
const SFTP = require('ssh2').Client
const dns = require('dns')

const action = process.argv[2] || false
const remoteHost = process.argv[3] || ''
const remoteRoot = process.argv[4] || ''

const config = {
  host: remoteHost,
  port: '22',
  username: 'www-data',
  password: 'www'
}
const Client = new SFTP()
const appName = 'FTPSynchronizer'
const usageText = 'node sync [action] [host] [root]'
const ignorePaths = [
  '/node_modules',
  '/src/scss/libs/foundation'
]
ignorePaths.push('/' + path.basename(__filename))
process.title = appName

const fontColor = {
  Black: '\x1b[30m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m',
  Reset: '\x1b[0m'
}

const bgColor = {
  Black: '\x1b[40m',
  Red: '\x1b[41m',
  Green: '\x1b[42m',
  Yellow: '\x1b[43m',
  Blue: '\x1b[44m',
  Magenta: '\x1b[45m',
  Cyan: '\x1b[46m',
  White: '\x1b[47m',
  Reset: '\x1b[0m'
}

function print (str, config) {
  let eol = config.eol ? '\n' : ''
  let cursorPos = config.tabs ? config.tabs * 2 : process.stdout.cursorPos
  let color = config.color || ''
  let background = config.bg || ''
  process.stdout.cursorTo(cursorPos)
  process.stdout.write(background)
  process.stdout.write(color)
  process.stdout.write(str + eol)
  process.stdout.write(fontColor.Reset)
  process.stdout.write(bgColor.Reset)
}

// Prepare local part
const localTree = []
const localFiles = []

function GetLocalTree (startPath) {
  return new Promise((resolve, reject) => {
    let absPath = path.join(__dirname, startPath)
    try {
      fs.readdirSync(absPath).forEach(dir => {
        let currentPath = absPath + '/' + dir
        let dirStat = fs.lstatSync(currentPath)
        let relPath = startPath + '/' + dir
        if (dirStat.isDirectory() && !ignorePaths.includes(relPath)) {
          let modAt = parseInt(dirStat.mtimeMs / 1000)
          localTree.push({ path: relPath, mtime: modAt })
          resolve(GetLocalTree(relPath))
        } else {
          resolve('<GetLocalTree>')
        }
      })
    } catch (err) {
      reject(err.message)
    }
  })
}

function GetLocalFiles () {
  return new Promise((resolve, reject) => {
    localTree.forEach((localObj) => {
      let absPath = path.join(__dirname, localObj.path)
      try {
        fs.readdirSync(absPath).forEach(file => {
          let filePath = absPath + '/' + file
          let fileStat = fs.lstatSync(filePath)
          let relPath = localObj.path + '/' + file
          if (fileStat.isFile() && !ignorePaths.includes(relPath)) {
            let modAt = parseInt(fileStat.mtimeMs / 1000)
            localFiles.push({ path: relPath, mtime: modAt })
          }
        })
      } catch (err) {
        reject(err.message)
      }
    })
    print('[done]', { eol: true, color: fontColor.Green })
    resolve('<GetLocalFiles>')
  })
}

// Prepare remote part
const remoteTree = []
const remoteFiles = []

function GetRemoteTree (startPath) {
  return new Promise(async (resolve, reject) => {
    let requestTree = ListRemoteDir(startPath)
      .catch(() => resolve())
    let result = await requestTree
    for (let tree of result) {
      remoteTree.push(tree)
      await GetRemoteTree(tree.path)
    }
    resolve()
  })
}

function ListRemoteDir (dirPath) {
  return new Promise((resolve, reject) => {
    Client.sftp((err, stream) => {
      if (err) {
        stream.end()
        return reject(err.message)
      }
      let absPath = remoteRoot + dirPath
      try {
        stream.readdir(absPath, (err, list) => {
          if (err) {
            stream.end()
            return reject(err.message)
          }
          let currentTree = list
            .filter(obj => obj.attrs.isDirectory() && !ignorePaths.includes(dirPath + '/' + obj.filename))
            .map(obj => {
              return { path: dirPath + '/' + obj.filename, mtime: obj.attrs.mtime }
            })
          stream.end()
          return resolve(currentTree)
        })
      } catch (err) {
        stream.end()
        return reject(err.message)
      }
    })
  })
}

function GetRemoteFiles () {
  return new Promise(async (resolve, reject) => {
    for (let dir of remoteTree) {
      let requestFiles = await ListRemoteFiles(dir)
        .catch((err) => console.error(err))
      remoteFiles.push.apply(remoteFiles, requestFiles)
    }
    print('[done]', { eol: true, color: fontColor.Green })
    resolve('<GetRemoteFiles>')
  })
}

function ListRemoteFiles (remoteObj) {
  return new Promise((resolve, reject) => {
    Client.sftp((err, stream) => {
      if (err) {
        stream.end()
        return reject(err.message)
      }
      let absPath = remoteRoot + remoteObj.path
      stream.readdir(absPath, (err, list) => {
        if (err) {
          stream.end()
          return reject(err.message)
        }
        let currentFiles = list
          .filter(obj => obj.attrs.isFile() && !ignorePaths.includes(remoteObj.path + '/' + obj.filename))
          .map(obj => {
            return { path: remoteObj.path + '/' + obj.filename, mtime: obj.attrs.mtime }
          })
        stream.end()
        return resolve(currentFiles)
      })
    })
  })
}

let startTime
function PrepareSync () {
  return new Promise((resolve, reject) => {
    print('Synchronization started for ' + fontColor.Blue + remoteRoot + fontColor.Green + ' on ' + fontColor.Blue + remoteHost + fontColor.Green + ':' + fontColor.Blue + config.port + fontColor.Green, { color: fontColor.Green, eol: true })
    print('Preparing for synchronization', { bg: bgColor.Blue, eol: true })
    resolve('<Client connected>')
  })
    .then(() => new Promise((resolve, reject) => {
      localTree.push({ path: '', mtime: Number.MAX_SAFE_INTEGER })
      print('Listing local tree...', { tabs: 1 })
      resolve('<Start local listing>')
    }))
    .then(() => GetLocalTree(''))
    .then(() => GetLocalFiles())
    .then(() => new Promise((resolve, reject) => {
      remoteTree.push({ path: '', mtime: Number.MAX_SAFE_INTEGER })
      print('Listing remote tree...', { tabs: 1 })
      resolve('<Start remote listing>')
    }))
    .then(() => GetRemoteTree(''))
    .then(() => GetRemoteFiles())
    .catch((err) => console.error(err))
}

const syncStatus = {
  files: {
    overwritten: [],
    omitted: [],
    created: [],
    deleted: []
  },
  directories: {
    omitted: [],
    created: [],
    deleted: []
  }
}

// Remote synchronization part
function DirRequestHandler (type, dirPath) {
  return new Promise((resolve, reject) => {
    Client.sftp((err, stream) => {
      if (err) {
        stream.end()
        return reject(err.message)
      }
      switch (type) {
        case 'create':
          stream.mkdir(dirPath, (err) => {
            if (err) {
              stream.end()
              return reject(err)
            }
            stream.end()
            resolve()
          })
          break

        case 'delete':
          stream.rmdir(dirPath, (err) => {
            if (err) {
              stream.end()
              return reject(err)
            }
            stream.end()
            resolve()
          })
          break
      }
    })
  })
}

function FileRequestHandler (type, file) {
  return new Promise((resolve, reject) => {
    Client.sftp((err, stream) => {
      if (err) {
        stream.end()
        return reject(err.message)
      }
      let localPath = './' + file.path
      let remotePath = remoteRoot + file.path
      switch (type) {
        case 'put':
          stream.fastPut(localPath, remotePath, (err) => {
            if (err) {
              stream.end()
              return reject(err)
            }
            stream.utimes(remotePath, file.mtime, file.mtime, (err) => {
              if (err) {
                stream.end()
                return reject(err)
              }
              stream.end()
              resolve()
            })
          })
          break

        case 'get':
          stream.fastGet(remotePath, localPath, (err) => {
            if (err) {
              stream.end()
              return reject(err)
            }
            stream.end()
            resolve()
          })
          break

        case 'delete':
          stream.unlink(remotePath, (err) => {
            if (err) {
              stream.end()
              return reject(err)
            }
            stream.end()
            resolve()
          })
          break
      }
    })
  })
}

function CreateRemoteDirs () {
  return new Promise(async (resolve, reject) => {
    let sortedTree = localTree.sort(
      (obj1, obj2) => obj1.path.split('/').length - obj2.path.split('/').length)
    for (let dir of sortedTree) {
      if (!remoteTree.find(obj => obj.path == dir.path)) {
        await DirRequestHandler('create', remoteRoot + dir.path)
          .then(() => {
            syncStatus.directories.created.push(dir.path)
          })
          .catch(err => reject(err))
      } else {
        syncStatus.directories.omitted.push(dir.path)
      }
    }
    resolve()
  })
}

function FlushRemoteDirs () {
  return new Promise(async (resolve, reject) => {
    let sortedTree = remoteTree.sort(
      (obj1, obj2) => obj2.path.split('/').length - obj1.path.split('/').length)

    for (let dir of sortedTree) {
      if (!localTree.find(obj => obj.path == dir.path)) {
        await DirRequestHandler('delete', remoteRoot + dir.path)
          .then(() => {
            syncStatus.directories.deleted.push(dir.path)
          })
          .catch(err => reject(err))
      }
    }
    resolve()
  })
}

function UploadFiles () {
  return new Promise(async (resolve, reject) => {
    for (let file of localFiles) {
      let foundRemoteFile = remoteFiles.find(obj => obj.path == file.path)
      if (!foundRemoteFile) {
        await FileRequestHandler('put', file)
          .then(() => {
            syncStatus.files.created.push(file.path)
          })
          .catch(err => reject(err))
      } else if (foundRemoteFile.mtime + 1 < file.mtime) {
        await FileRequestHandler('put', file)
          .then(() => {
            syncStatus.files.overwritten.push(file.path)
          })
          .catch(err => reject(err))
      } else {
        syncStatus.files.omitted.push(file)
      }
    }
    resolve()
  })
}

function FlushRemoteFiles () {
  return new Promise(async (resolve, reject) => {
    for (let file of remoteFiles) {
      if (!localFiles.find(obj => obj.path == file.path)) {
        await FileRequestHandler('delete', file)
          .then(() => {
            syncStatus.files.deleted.push(file.path)
          })
          .catch(err => reject(err))
      }
    }
    resolve()
  })
}

function StartRemoteSync () {
  return new Promise((resolve, reject) => {
    print('Fixing remote tree...', { tabs: 1 })
    CreateRemoteDirs()
      .then(() => FlushRemoteDirs()
        .then(() => {
          print('[done]', true)
          print('Replacing outdated files...', { tabs: 1 })
        })
        .catch(err => console.log(err))
      )
      .then(() => UploadFiles()
        .then(() => {
          print('[done]', true)
          print('Deleting redundant files...', { tabs: 1 })
        })
        .catch(err => reject(err))
      )
      .then(() => FlushRemoteFiles()
        .then(() => {
          print('[done]', { eol: true, color: fontColor.Green })
          resolve()
        })
        .catch(err => reject(err))
      )
      .catch(err => reject(err))
  })
}

// Local synchronization part
function CreateLocalDirs () {
  return new Promise(async (resolve, reject) => {
    let sortedTree = remoteTree.sort(
      (obj1, obj2) => obj1.path.split('/').length - obj2.path.split('/').length)
    for (let dir of sortedTree) {
      if (!localTree.find(obj => obj.path == dir.path)) {
        let absPath = path.join(__dirname, dir.path)
        try {
          fs.mkdirSync(absPath, { recursive: true })
          syncStatus.directories.created.push(dir.path)
        } catch (err) {
          reject(err)
        }
      } else {
        syncStatus.directories.omitted.push(dir.path)
      }
    }
    resolve()
  })
}

function FlushLocalDirs () {
  return new Promise(async (resolve, reject) => {
    let sortedTree = localTree.sort(
      (obj1, obj2) => obj2.path.split('/').length - obj1.path.split('/').length)

    for (let dir of sortedTree) {
      if (!remoteTree.find(obj => obj.path == dir.path)) {
        let absPath = path.join(__dirname, dir.path)
        try {
          fs.rmdirSync(absPath)
          syncStatus.directories.deleted.push(dir.path)
        } catch (err) {
          reject(err)
        }
      }
    }
    resolve()
  })
}

function DownloadFiles () {
  return new Promise(async (resolve, reject) => {
    for (let file of remoteFiles) {
      let foundLocalFile = localFiles.find(obj => obj.path == file.path)
      if (!foundLocalFile) {
        await FileRequestHandler('get', file.path)
          .then(() => {
            syncStatus.files.created.push(file.path)
          })
          .catch(err => reject(err))
      } else if (foundLocalFile.mtime + 1 < file.mtime) {
        await FileRequestHandler('get', file)
          .then(() => {
            syncStatus.files.overwritten.push(file.path)
          })
          .catch(err => reject(err))
      } else {
        syncStatus.files.omitted.push(file.path)
      }
    }
    resolve()
  })
}

function FlushLocalFiles () {
  return new Promise(async (resolve, reject) => {
    for (let file of localFiles) {
      if (!remoteFiles.find(obj => obj.path == file.path)) {
        let absPath = path.join(__dirname, file.path)
        try {
          fs.unlinkSync(absPath)
          syncStatus.files.deleted.push(file.path)
        } catch (err) {
          reject(err)
        }
      }
    }
    resolve()
  })
}

function StartLocalSync () {
  return new Promise((resolve, reject) => {
    print('Fixing local tree...', { tabs: 1 })
    CreateLocalDirs()
      .then(() => FlushLocalDirs()
        .then(() => {
          print('[done]', true)
          print('Replacing outdated files...', { tabs: 1 })
        })
        .catch(err => console.log(err))
      )
      .then(() => DownloadFiles()
        .then(() => {
          print('[done]', true)
          print('Deleting redundant files...', { tabs: 1 })
        })
        .catch(err => reject(err))
      )
      .then(() => FlushLocalFiles()
        .then(() => {
          print('[done]', { eol: true, color: fontColor.Green })
          resolve()
        })
        .catch(err => reject(err))
      )
      .catch(err => reject(err))
  })
}

// Initialization part
function InvokeSync () {
  return new Promise((resolve, reject) => {
    switch (action) {
      case 'remote':
        print('Synchronizing remote project', { bg: bgColor.Blue, eol: true })
        StartRemoteSync()
          .then(() => {
            resolve('Remote')
          })
          .catch(err => reject(err))
        break

      case 'local':
        print('Synchronizing local project', { bg: bgColor.Blue, eol: true })
        StartLocalSync()
          .then(() => {
            resolve('Local')
          })
          .catch(err => reject(err))
        break

      default:
        let errMsg = 'Invalid \'action\' argument (remote/local/help)'
        reject(errMsg)
    }
  })
}

function DisplayUsage (full) {
  console.group('Usage:')
  console.log(usageText)
  if (full) {
    console.group('[action]')
    console.log('remote - Remote files and remote directories will be synchronized with the local project. (overwriting of the remote project)')
    console.log('local - Local files and remote directories will be synchronized with the remote project. (overwriting of the local project)')
    console.log('help - Display description and usage help of the application.')
    console.groupEnd()

    console.group('[host]')
    console.log('- hostname or IP address of the remote server.')
    console.groupEnd()

    console.group('[root]')
    console.log('- absolute path of the project directory on the remote server. (eg. /var/www/sample_project)')
    console.groupEnd()
  }

  console.groupEnd()
}

function DisplayHelp () {
  console.group('Description:')
  console.log(appName + ' is an application that is used to synchronize local project files with those stored on the server.')
  console.groupEnd()

  print('Notice:', { color: fontColor.Red, eol: true })
  print('Files from the target project, older than those in the parent project will be overwritten', { color: fontColor.Red, eol: true, tabs: 1 })

  print('Notice:', { color: fontColor.Red, eol: true })
  print('Directories and files that do not exist in the parent project will be removed from the target project', { color: fontColor.Red, eol: true, tabs: 1 })

  DisplayUsage(true)
}

Client.once('ready', () => {
  startTime = new Date().getTime()
  PrepareSync()
    // .then(() => new Promise((resolve, reject) => {
    //   console.log('Remote dirs: ' + remoteTree.length)
    //   console.log('Remote files: ' + remoteFiles.length)
    //   let endTime = new Date().getTime() - startTime
    //   console.log('Prepare time: ' + (endTime / 1000) + 's')
    //   resolve()
    // }))
    .then(() => InvokeSync())
    .then((type) => {
      Client.end()
      let endTime = new Date().getTime() - startTime
      let overwrittenFiles = fontColor.Yellow + syncStatus.files.overwritten.length + fontColor.Reset
      let createdFiles = fontColor.Green + syncStatus.files.created.length + fontColor.Reset
      let createdDirs = fontColor.Green + syncStatus.directories.created.length + fontColor.Reset
      let deletedFiles = fontColor.Red + syncStatus.files.deleted.length + fontColor.Reset
      let deletedDirs = fontColor.Red + syncStatus.directories.deleted.length + fontColor.Reset
      let omittedFiles = fontColor.Cyan + syncStatus.files.omitted.length + fontColor.Reset
      let omittedDirs = fontColor.Cyan + (syncStatus.directories.omitted.length - 1) + fontColor.Reset
      let syncTime = fontColor.Magenta + (endTime / 1000) + fontColor.Reset

      print(type + ' project has been synchronized!', { color: fontColor.Green, eol: true })
      print('Total results:', { bg: bgColor.Green, eol: true })
      console.group()
      console.log('overwritten: ', overwrittenFiles, ' files')
      console.log('created: ', createdFiles, ' files, ', createdDirs, ' directiories')
      console.log('deleted: ', deletedFiles, ' files, ', deletedDirs, ' directiories')
      console.log('omitted: ', omittedFiles, ' files, ', omittedDirs, ' directiories')
      console.log('time: ', syncTime, 's')
      console.groupEnd()
    })
    .catch(err => {
      console.error(err)
      DisplayUsage()
    })
})

function PrepareConnection () {
  // Check the connection to the remoteHost
  // and convert to ipv4 address
  return new Promise((resolve, reject) => {
    dns.lookup(remoteHost, (err, address, family) => {
      let errMsg = 'The host \'' + remoteHost + '\' can not be found'
      if (err || !address) return reject(errMsg)
      else return resolve(address)
    })
  })
}

if (!remoteRoot) {
  console.warn('You have to define remote root path.')
  DisplayUsage()
  process.exit()
}

if (action == 'help') {
  DisplayHelp()
} else {
  PrepareConnection()
    .then((ipv4) => {
      config.host = ipv4
      Client.connect(config)
    })
    .catch((errMsg) => {
      console.error(errMsg)
      DisplayUsage()
    })
}
