const FtpSrv        = require('ftp-srv');
const schedule      = require('node-schedule');
const fs            = require('fs');
const walk          = require('walk');
const request       = require('request');
const path          = require('path')

//const UPLOAD_URL    = 'http://localhost:3000/api/v1/hoboupload';
const UPLOAD_URL    = 'https://heladas.utalca.cl/api/v1/hoboupload';


const ftpServer     = new FtpSrv('ftp://0.0.0.0:2121', {
  greeting    : "Conexión establecida con el servidor FTP.",
  file_format : 'ls',
  pasv_range : '8000-9000'
});

let users = [
  {
    username :'romeral',
    password :'romeral'
  },
  {
    username :'colbun',
    password :'colbun'
  },
  {
    username :'station',
    password :'password'
  }
]

if(!fs.existsSync('files')){
  fs.mkdirSync('files');
}

ftpServer.on('login', (data, resolve, reject) => {
  let auth = authenticate(data.username, data.password);
  let userFolder = 'files/'+data.username;
  if(!fs.existsSync(userFolder)){
    fs.mkdirSync(userFolder);
  }
  if(auth){
    resolve({
      root: userFolder
    });
  }else{
    reject({
      message: "El usuario y contraseña utilizados no son válidos."
    });
  }
});

ftpServer.on('client-error', (error) => {
  console.log(error.context);
  console.log(error.error);
});

authenticate = (user, pass) => {
  let inArray = false;
  users.forEach((item) => {
    if(item.username == user && item.password == pass){
      inArray = true;
    }
  })
  if(inArray){
    return true;
  }else{
    return false;
  }
}

checkFiles = ()  => {
  console.log("Revisando archivos recibidos...");
  const walker  = walk.walk('./files', { followLinks: false });
  let files      = [];
  let validFiles = [];
  walker.on('file', function(root, stat, next) {
    let _rootSplit = root.split('/');
    let station    = _rootSplit[_rootSplit.length-1];
    let extension  = path.extname(stat.name);
    files.push(root + '/' + stat.name);

    console.log("Reading file: " + stat.name);
    console.log("  From station: " + station);
    console.log("  With extension: " + path.extname(stat.name));
    if(['.csv', '.CSV'].includes(extension)){
      console.log("  File is valid to be uploaded.");
      validFiles.push({
        file     : root + '/' + stat.name,
        station  : station
      });
    }
    next();
  });

  walker.on('end', function() {
    console.log("All read files:");
    console.log(files);
    console.log("Valid files:");
    console.log(validFiles);
    validFiles.forEach((item) => {
      let req = request.post(UPLOAD_URL, function (err, resp, body) {
        if(err){
          console.log('Ocurrió un error al subir el archivo.');
          console.log(err);
        }else{
          console.log('Resultado: ' + body);
          if(JSON.parse(body).message=='Archivo subido exitosamente.'){
            // Eliminar archivo original
            fs.unlink(item.file, (error) => {
              if(error){
                console.log("Ocurrió un error al eliminar el archivo: " + item.file);
                console.log(error)
              }else{
                console.log("Se eliminó exitosamente el archivo: " + item.file);
              }
            })
          }
        }
      });
      var form = req.form();
      form.append('station', item.station);
      form.append('file', fs.createReadStream(item.file));
    })
  });
}

const notificationJob = schedule.scheduleJob('*/1 * * * *', checkFiles);

ftpServer.listen()
.then(() => {

});
