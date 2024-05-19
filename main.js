const path = require ('path');
const os = require ('os');
const fs = require ('fs');
const {app, BrowserWindow, Menu, ipcMain, shell } = require ('electron');
const isMac = process.platform === 'darwin';
const isDev= process.env.NODE_ENV !== 'production';
const resizeImg = require ('resize-img');

let mainWindow;
//Create the main window
function createMainWindow () {
    mainWindow = new BrowserWindow ({
        title: ' Image Resizer',
        width: isDev ? 1000 : 500,
        height: 1000,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration:true,
            preload: path.join(__dirname,'preload.js')
        }
    });

    //Open dev tools if in dev environment
     if (isDev){
         mainWindow.webContents.openDevTools();
     }
    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

//Create  about window
function createAboutWindow () {
    const aboutWindow = new BrowserWindow ({
        title: ' AboutImage Resizer',
        width: 300,
        height: 300
    });

    //Open dev tools if in dev environment

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}


//App is ready
app.whenReady().then( ()=>{
    createMainWindow();

    //Implement menu
    const  mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    //Remove mainWindow from memory on close
    mainWindow.on('closed',()=> (mainWindow = null));

    app.on('activate',()=>{
        if (BrowserWindow.getAllWindows().length===0){
            createMainWindow();
        }
    });
});

//Menu template
const  menu = [
    ...(isMac? [{
        label: app.name,
        submenu: [
            {
                label: 'About',
                click: createAboutWindow,
            },
        ],
    },
    ]
        :[]),
    {
        role: 'fileMenu'
    },

    ...(! isMac ? [{
         label: 'Help',
         submenu: [{
             label: 'About',
             click: createAboutWindow,
         }],
    },
    ]
        : []),
];

//Respond to ipcRenderer resize
 ipcMain.on('image:resize', (e, options)=>{
     options.dest= path.join(os.homedir(), 'imageresizer');
     resizeImage (options);

 });

 //Resize the  image
async function  resizeImage ({imgPath, width, height, dest}) {
    try {
        const newPath = await resizeImg( fs.readFileSync(imgPath), {
            width:+width,
            height: +height
        });

        //Create filename
        const  filename = path.basename(imgPath);

        //Create destination folder if not exists
        if (! fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }

        //Write file to destination
        fs.writeFileSync(path.join(dest, filename),newPath);

        //Send success to renderer
        mainWindow.webContents.send('image:done')


        //Open destination folder
        shell.openPath(dest);

    }catch (error) {
        console.log(error);
        
    }

}

app.on('window-all-closed', ()=>{
    if (!isMac){
        app.quit();
    }
} );