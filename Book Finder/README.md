# Book Finder

A simple, book-like search app for Open Library built for Alex (a college student) who searches in many ways: by title, author, and subject, with options to show only ebooks, sort results, page through large results, save favorites, and quickly re-run recent searches.

## Features
- Advanced search: separate `Title`, `Author`, `Subject` inputs
- Ebooks filter: `has_fulltext=true` to show items with full text
- Sorting: relevance (default), year newest/oldest, title A–Z (client-side)
- Pagination: "Load more" fetches the next page
- Favorites: save books and view them in a Favorites tab (stored in `localStorage`)
- Recent searches: auto-remembered and shown as chips for quick reuse
- Book-like UI: spine, page edge, and shelf background

## Tech
- Open Library Search API: `https://openlibrary.org/search.json`
- Covers: `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`
- Static site: `index.html`, `styles.css`, `app.js`

## Local Run
- With Python installed, run from the project folder:
  ```
  python -m http.server 8000
  ```
- Open `http://localhost:8000/`.

## Deploy (No GitHub required)
### CodeSandbox
1. Go to `https://codesandbox.io/` and sign in.
2. Click "Create Sandbox" → choose "Static" or "Vanilla".
3. Drag-and-drop the whole `Book Finder` folder into the sandbox, or add the three files (`index.html`, `styles.css`, `app.js`) manually.
4. Wait for it to build, then click "Share" to copy the live URL.

### StackBlitz
1. Go to `https://stackblitz.com/` and sign in.
2. Click "Create New" → choose "HTML" or "Vanilla JS".
3. Add the files (`index.html`, `styles.css`, `app.js`) and paste content.
4. The app runs instantly; click "Share" to copy the live URL.

## Deploy via GitHub (optional, enables easy imports)
1. Create a new GitHub repo (public) named `book-finder`.
2. In this project folder, initialize and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Book Finder"
   git branch -M main
   git remote add origin https://github.com/<your-username>/book-finder.git
   git push -u origin main
   ```
3. Import to CodeSandbox: "Create Sandbox" → "Import from GitHub" → paste repo URL.
4. Import to StackBlitz: "Create New" → "Import from GitHub" → paste repo URL.

## Notes
- This app is static and doesn’t require a backend.
- Favorites and recent searches are stored in the browser and won’t sync across devices.