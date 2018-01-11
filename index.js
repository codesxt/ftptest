const FtpSrv = require('ftp-srv');
const fs = require('fs');
const ftpServer = new FtpSrv('ftp://0.0.0.0:2121', {
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
    username :'password',
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

ftpServer.listen()
.then(() => {

});
