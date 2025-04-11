const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Request Google authentication
  requestGDoc: () => ipcRenderer.invoke('get-data', 'gdoc'),
  
  // Fetch a specific document with the given ID using the access token
  fetchDocument: (accessToken, documentId) => ipcRenderer.invoke('fetch-document', accessToken, documentId),
  
  // List all documents the user has access to
  listDocuments: (accessToken) => ipcRenderer.invoke('list-documents', accessToken)
});