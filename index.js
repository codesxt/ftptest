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
  console.log("\n\nRevisando archivos recibidos...");
  const walker  = walk.walk('./files', { followLinks: false });
  let files      = [];
  let validFiles = [];
  walker.on('file', function(root, stat, next) {
    let _rootSplit = root.split('/');
    let station    = _rootSplit[_rootSplit.length-1];
    let extension  = path.extname(stat.name);
    files.push(root + '/' + stat.name);

    console.log("Leyendo archivo: " + stat.name);
    console.log("  De la estación: " + station);
    console.log("  Con extensión: " + path.extname(stat.name));
    if(['.csv', '.CSV'].includes(extension)){
      console.log("  >> Archivo válido para ser subido.");
      validFiles.push({
        file     : root + '/' + stat.name,
        station  : station
      });
    }else{
      console.log("  >> Archivo no válido para ser subido.");
    }
    next();
  });

  walker.on('end', function() {
    console.log('\n\nArchivos verificados. Intentando subida...');
    console.log("Todos los archivos encontrados:");
    console.log(files);
    console.log("Archivos válidos:");
    console.log(validFiles);
    validFiles.forEach((item) => {
      let options = {
        method: 'POST',
        url: UPLOAD_URL,
        formData: {
          station: item.station,
          file: fs.createReadStream(item.file)
        }
      };
      var req = request(options, (err, httpResponse, body) => {
        if(err){
          console.log('Ocurrió un error al subir el archivo: ' + item.file);
          console.log(err);
        }else{
          let resp = null;
          try{
            resp = JSON.parse(body);
          }catch{
            console.log("Falló el parseo del request body...")
            console.log(body);
          }
          console.log('Resultado para el archivo: ' + item.file);
          if(resp){
            console.log('  Respuesta del servidor: ' + JSON.parse(body).message);
            console.log('  Registros insertados: ' + JSON.parse(body).nInserted)
          }
          console.log('  Código HTTP: ' + httpResponse.statusCode);
          if(httpResponse.statusCode==201 || httpResponse.statusCode == 200){
            // Eliminar archivo original
            console.log('  Limpiando archivo: ' + item.file);
            fs.unlink(item.file, (error) => {
              if(error){
                console.log("Ocurrió un error al eliminar el archivo: " + item.file);
                console.log(error)
              }else{
                console.log("Se eliminó exitosamente el archivo: " + item.file);
              }
            })
          }else{
            console.log('Ocurrió un error en el servidor:');
            console.log(body.error);
          }
        }
      });/*
      var form = req.form();
      form.append('station', item.station);
      form.append('file', fs.createReadStream(item.file));*/
    })
  });
}

const notificationJob = schedule.scheduleJob('*/1 * * * *', checkFiles);

ftpServer.listen()
.then(() => {

});
