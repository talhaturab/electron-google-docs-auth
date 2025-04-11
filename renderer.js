// Store tokens after successful authentication
let authTokens = null;

function connectGDoc() {
  window.electronAPI.requestGDoc()
    .then(result => {
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log('Authentication successful!');
      authTokens = {
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        expiresIn: result.expires_in
      };
      
      // Instead of showing dialog, fetch document list
      return window.electronAPI.listDocuments(authTokens.accessToken);
    })
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('Documents list:', data);
      
      // Display document list in the UI
      const resultContainer = document.getElementById('result-container');
      
      if (data.files && data.files.length > 0) {
        let html = '<h3>Now You can perform RAG on Your Google Documents</h3><ul class="doc-list">';
        
        data.files.forEach(file => {
          html += `<li class="doc-item" data-id="${file.id}">${file.name}</li>`;
        });
        
        html += '</ul>';
        resultContainer.innerHTML = html;
        
        // Add click event to document items
        document.querySelectorAll('.doc-item').forEach(item => {
          item.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            loadDocument(docId);
          });
        });
      } else {
        resultContainer.innerHTML = '<p>No documents found in your Google Drive.</p>';
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert(`Error: ${error.message || error}`);
    });
}

// Function to load a specific document when clicked
function loadDocument(documentId) {
  window.electronAPI.fetchDocument(authTokens.accessToken, documentId)
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('Document data:', data);
      
      // Display document content - Fixed to use correct properties from Google Docs API
      const resultContainer = document.getElementById('result-container');
      resultContainer.innerHTML = `
        <h2>${data.title || 'Document'}</h2>
        <p><strong>Last modified:</strong> ${data.lastModified ? new Date(data.lastModified).toLocaleString() : 'Not available'}</p>
        <button class="back-button" onclick="showDocumentsList()">
          <i class="fas fa-arrow-left"></i> Back to Documents List
        </button>
      `;
    })
    .catch(error => {
      console.error('Error:', error);
      alert(`Error: ${error.message || error}`);
    });
}

// Function to go back to documents list
function showDocumentsList() {
  window.electronAPI.listDocuments(authTokens.accessToken)
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
      
      const resultContainer = document.getElementById('result-container');
      
      if (data.files && data.files.length > 0) {
        let html = '<h2>Your Google Documents</h2><ul class="doc-list">';
        
        data.files.forEach(file => {
          html += `<li class="doc-item" data-id="${file.id}">${file.name}</li>`;
        });
        
        html += '</ul>';
        resultContainer.innerHTML = html;
        
        // Add click event to document items
        document.querySelectorAll('.doc-item').forEach(item => {
          item.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            loadDocument(docId);
          });
        });
      } else {
        resultContainer.innerHTML = '<p>No documents found in your Google Drive.</p>';
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert(`Error: ${error.message || error}`);
    });
}