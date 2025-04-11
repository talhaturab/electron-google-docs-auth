require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Configuration - REPLACE WITH YOUR VALUES
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost'; // Match Google Console setting
const DOC_SCOPES = [
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
].join(' ');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools for debugging (optional)
  // mainWindow.webContents.openDevTools();
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle Google OAuth flow and document fetching
ipcMain.handle('get-data', async (event, source, docType = 'documents') => {
  if (source === 'gdoc') {
    try {
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        },
        parent: mainWindow,
        modal: true
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(DOC_SCOPES)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      return new Promise((resolve, reject) => {
        authWindow.loadURL(authUrl);
        console.log("Auth window opened with URL:", authUrl);

        // Handle redirect after authentication
        // authWindow.webContents.on('will-redirect', async (event, url) => {
        //   console.log("Redirect detected:", url);
          
        //   if (url.startsWith(REDIRECT_URI)) {
        //     const urlObj = new URL(url);
        //     const code = urlObj.searchParams.get('code');
        //     const error = urlObj.searchParams.get('error');
            
        //     if (error) {
        //       authWindow.close();
        //       reject(`Authentication error: ${error}`);
        //       return;
        //     }
            
        //     if (!code) {
        //       authWindow.close();
        //       reject('No authorization code found');
        //       return;
        //     }

        //     try {
        //       console.log("Got authorization code, exchanging for tokens...");
              
        //       // Exchange code for tokens
        //       const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        //         body: new URLSearchParams({
        //           code,
        //           client_id: CLIENT_ID,
        //           client_secret: CLIENT_SECRET,
        //           redirect_uri: REDIRECT_URI,
        //           grant_type: 'authorization_code'
        //         })
        //       });

        //       const tokens = await tokenResponse.json();
        //       if (tokens.error) {
        //         authWindow.close();
        //         reject(`Token error: ${tokens.error}`);
        //         return;
        //       }
              
        //       console.log("Got access token, going to next step...");
        //       authWindow.close();
        //       resolve({
        //         status: 'success',
        //         message: 'Authentication successful',
        //         access_token: tokens.access_token,
        //         refresh_token: tokens.refresh_token,
        //         expires_in: tokens.expires_in
        //       });
              
        //     } catch (error) {
        //       console.error("Token exchange error:", error);
        //       authWindow.close();
        //       reject(error.message);
        //     }
        //   }
        // });

        authWindow.webContents.on('will-redirect', async (event, url) => {
            if (url.startsWith(REDIRECT_URI)) {
              event.preventDefault(); // prevent loading the URL
          
              const urlObj = new URL(url);
              const code = urlObj.searchParams.get('code');
              const error = urlObj.searchParams.get('error');
          
              if (error) {
                authWindow.close();
                reject(`Authentication error: ${error}`);
                return;
              }
          
              if (!code) {
                authWindow.close();
                reject('No authorization code found');
                return;
              }
          
              try {
                console.log("Got authorization code, exchanging for tokens...");
          
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
                    code,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    redirect_uri: REDIRECT_URI,
                    grant_type: 'authorization_code'
                  })
                });
          
                const tokens = await tokenResponse.json();
                if (tokens.error) {
                  authWindow.close();
                  reject(`Token error: ${tokens.error}`);
                  return;
                }
          
                console.log("Got access token, closing auth window...");
                authWindow.close();
                resolve({
                  status: 'success',
                  message: 'Authentication successful',
                  access_token: tokens.access_token,
                  refresh_token: tokens.refresh_token,
                  expires_in: tokens.expires_in
                });
          
              } catch (error) {
                console.error("Token exchange error:", error);
                authWindow.close();
                reject(error.message);
              }
            }
          });
          

        // Handle loading failures
        authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
          console.error("Failed to load:", errorDescription);
          reject(`Page load failed: ${errorDescription}`);
          authWindow.close();
        });

        // Cleanup if auth window is closed
        authWindow.on('closed', () => {
          reject('Authentication window was closed');
        });
      });
    } catch (error) {
      console.error("Authentication process error:", error);
      return { error: error.message };
    }
  } else {
    return { error: 'Unknown source' };
  }
});

// Handle fetching document data with an access token and document ID
ipcMain.handle('fetch-document', async (event, accessToken, documentId) => {
  try {
    console.log("Fetching document:", documentId);
    
    // First try to get file metadata from Drive API
    const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}?fields=id,name,modifiedTime`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json();
      return { error: errorData.error?.message || 'Failed to fetch document metadata' };
    }
    
    const metadata = await metadataResponse.json();
    
    // Then get the document content from Docs API
    const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!docResponse.ok) {
      const errorData = await docResponse.json();
      return { error: errorData.error?.message || 'Failed to fetch document content' };
    }
    
    const docContent = await docResponse.json();
    
    // Combine metadata and content
    return {
      id: documentId,
      title: docContent.title || metadata.name,
      lastModified: metadata.modifiedTime,
      content: docContent
    };
  } catch (error) {
    console.error("Document fetch error:", error);
    return { error: error.message };
  }
});

// Handle listing documents with an access token
ipcMain.handle('list-documents', async (event, accessToken) => {
  try {
    console.log("Fetching document list");
    
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.document%27', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error?.message || 'Failed to fetch documents' };
    }
    
    return await response.json();
  } catch (error) {
    console.error("Document list fetch error:", error);
    return { error: error.message };
  }
});