# Electron Google Docs OAuth App

This is a lightweight Electron application that enables users to authenticate with their Google account and view a list of accessible Google Docs. The app is designed as a starting point for integrating RAG (Retrieval-Augmented Generation) workflows on Google Drive documents.

## ✨ Features

- ✅ Google OAuth2 login using Electron
- ✅ List all Google Docs from the user's Google Drive
- ✅ View document metadata (title, last modified)
- ✅ Prepares docs for further NLP / RAG processing

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/electron-google-docs-auth.git
cd electron-google-docs-auth
npm install
npm start
```

### 💡 Usage

1. Click **"Connect Google Doc"** in the app UI
2. Authenticate with your Google account
3. Select a document from the list
4. View the document metadata (you can extend this to view content, summarize, or run NLP tasks)

## 🧩 Project Structure

```
.
├── index.html        # Front-end UI
├── main.js           # Main process (OAuth logic)
├── preload.js        # Secure IPC bridge
├── renderer.js       # Renderer process logic
├── package.json
└── README.md
```

## 📜 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions, issues and feature requests are welcome!  
Feel free to open a [pull request](https://github.com/YOUR_USERNAME/electron-google-docs-auth/pulls).

---