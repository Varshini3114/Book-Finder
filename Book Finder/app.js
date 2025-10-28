const $ = (sel) => document.querySelector(sel);
const resultsEl = $('#results');
const favoritesEl = $('#favorites');
const formEl = $('#searchForm');
const titleEl = $('#title');
const authorEl = $('#author');
const subjectEl = $('#subject');
const fulltextEl = $('#fulltext');
const sortEl = $('#sort');
const chips = document.querySelectorAll('.chip');
const countEl = $('#count');
const loadMoreBtn = $('#loadMore');
const recentEl = $('#recent');
const tabButtons = document.querySelectorAll('.tab');

// API helpers
const SEARCH_URL = (params) => {
  const u = new URL('https://openlibrary.org/search.json');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  });
  return u.toString();
};
const COVER_URL = (coverId, size = 'M') => `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
const WORK_URL = (key) => `https://openlibrary.org${key}`;

// State
let currentQuery = { title: '', author: '', subject: '', page: 1, limit: 24, has_fulltext: undefined };
let currentDocs = [];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]'); // array of minimal doc info
let recent = JSON.parse(localStorage.getItem('recent') || '[]');

function setBusy(busy) {
  const resultsSection = document.querySelector('.results');
  resultsSection.setAttribute('aria-busy', busy ? 'true' : 'false');
}
function clearResults() { resultsEl.innerHTML = ''; currentDocs = []; }
function updateCount(text) { countEl.textContent = text; }
function saveFavorites() { localStorage.setItem('favorites', JSON.stringify(favorites)); }
function saveRecent() { localStorage.setItem('recent', JSON.stringify(recent.slice(0, 8))); }

function renderRecent() {
  recentEl.innerHTML = '';
  recent.slice(0,8).forEach((r) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = [r.title, r.author, r.subject].filter(Boolean).join(' • ');
    b.addEventListener('click', () => {
      titleEl.value = r.title || '';
      authorEl.value = r.author || '';
      subjectEl.value = r.subject || '';
      fulltextEl.checked = !!r.fulltext;
      sortEl.value = r.sort || 'relevance';
      currentQuery.page = 1;
      performSearch();
    });
    recentEl.appendChild(b);
  });
}

function renderPlaceholder(message) {
  resultsEl.innerHTML = `<div class="book-card"><div class="no-cover" data-title="${message}"></div></div>`;
}

function docToKey(doc) { return doc.key || doc.cover_edition_key || doc.edition_key?.[0] || doc.title; }
function isFav(doc) { return favorites.some((f) => f.key === docToKey(doc)); }
function toggleFav(doc) {
  const key = docToKey(doc);
  const idx = favorites.findIndex((f) => f.key === key);
  if (idx >= 0) favorites.splice(idx, 1);
  else favorites.push({ key, title: doc.title, author: (doc.author_name && doc.author_name[0]) || 'Unknown', cover_i: doc.cover_i, work_key: doc.key });
  saveFavorites();
  renderFavorites();
}

function makeBookCard(doc) {
  const title = doc.title || 'Untitled';
  const author = (doc.author_name && doc.author_name[0]) || 'Unknown';
  const year = doc.first_publish_year || '';
  const key = doc.key || '';
  const coverId = doc.cover_i;

  const card = document.createElement('article');
  card.className = 'book-card';
  card.setAttribute('role', 'listitem');

  // Cover
  if (coverId) {
    const img = document.createElement('img');
    img.className = 'cover';
    img.alt = `${title} cover`;
    img.loading = 'lazy';
    img.src = COVER_URL(coverId, 'L');
    card.appendChild(img);
  } else {
    const div = document.createElement('div');
    div.className = 'cover no-cover';
    div.setAttribute('data-title', title);
    card.appendChild(div);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'book-body';

  const h = document.createElement('h3');
  h.className = 'book-title';
  h.textContent = title;
  body.appendChild(h);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${author}${year ? ' • ' + year : ''}`;
  body.appendChild(meta);

  card.appendChild(body);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'actions';

  const link = document.createElement('a');
  link.className = 'link';
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.href = key ? WORK_URL(key) : 'https://openlibrary.org/';
  link.textContent = 'View details';

  const favBtn = document.createElement('button');
  favBtn.className = 'fav' + (isFav(doc) ? ' active' : '');
  favBtn.textContent = isFav(doc) ? '★ Saved' : '☆ Save';
  favBtn.addEventListener('click', () => {
    toggleFav(doc);
    favBtn.classList.toggle('active');
    favBtn.textContent = favBtn.classList.contains('active') ? '★ Saved' : '☆ Save';
  });

  actions.appendChild(favBtn);
  actions.appendChild(link);
  card.appendChild(actions);

  return card;
}

function applySort(docs) {
  const s = sortEl.value;
  if (s === 'year_desc') return docs.slice().sort((a,b) => (b.first_publish_year||0)-(a.first_publish_year||0));
  if (s === 'year_asc') return docs.slice().sort((a,b) => (a.first_publish_year||0)-(b.first_publish_year||0));
  if (s === 'title_asc') return docs.slice().sort((a,b)=> String(a.title||'').localeCompare(String(b.title||'')));
  return docs; // relevance (API default)
}

async function fetchPage(params) {
  const url = SEARCH_URL(params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const docs = Array.isArray(data.docs) ? data.docs : [];
  return { docs, numFound: data.numFound || docs.length };
}

async function performSearch(loadMore = false) {
  setBusy(true);
  try {
    if (!loadMore) {
      clearResults();
      loadMoreBtn.hidden = true;
    }

    // Build params from UI
    const params = {
      title: titleEl.value.trim(),
      author: authorEl.value.trim(),
      subject: subjectEl.value.trim(),
      has_fulltext: fulltextEl.checked ? 'true' : undefined,
      page: loadMore ? currentQuery.page + 1 : 1,
      limit: currentQuery.limit,
    };

    const { docs, numFound } = await fetchPage(params);
    currentQuery = params; // save
    currentQuery.page = params.page; // ensure

    // Append and sort
    currentDocs = loadMore ? currentDocs.concat(docs) : docs;
    const sorted = applySort(currentDocs);

    // Render
    const frag = document.createDocumentFragment();
    sorted.forEach((doc) => frag.appendChild(makeBookCard(doc)));
    resultsEl.innerHTML = '';
    resultsEl.appendChild(frag);

    updateCount(`${numFound.toLocaleString()} results • Page ${currentQuery.page}`);
    loadMoreBtn.hidden = currentDocs.length >= numFound;

    // Save recent
    if (!loadMore) {
      const entry = { title: params.title, author: params.author, subject: params.subject, fulltext: fulltextEl.checked, sort: sortEl.value };
      const existsIdx = recent.findIndex((r) => r.title === entry.title && r.author === entry.author && r.subject === entry.subject && r.fulltext === entry.fulltext && r.sort === entry.sort);
      if (existsIdx >= 0) recent.splice(existsIdx,1);
      recent.unshift(entry);
      saveRecent();
      renderRecent();
    }
  } catch (err) {
    console.error(err);
    renderPlaceholder('Something went wrong. Try again.');
  } finally {
    setBusy(false);
  }
}

function renderFavorites() {
  favoritesEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  favorites.forEach((doc) => {
    const fakeDoc = { title: doc.title, author_name: [doc.author], cover_i: doc.cover_i, key: doc.work_key, first_publish_year: '' };
    frag.appendChild(makeBookCard(fakeDoc));
  });
  favoritesEl.appendChild(frag);
}

function switchTab(name) {
  const isFav = name === 'favorites';
  document.querySelectorAll('.tab').forEach((t)=> t.classList.toggle('active', t.dataset.tab === name));
  favoritesEl.hidden = !isFav;
  resultsEl.hidden = isFav;
  if (isFav) updateCount(`${favorites.length} saved`);
}

function wireUI() {
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    currentQuery.page = 1;
    performSearch();
  });
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      titleEl.value = chip.dataset.qTitle || '';
      authorEl.value = chip.dataset.qAuthor || '';
      subjectEl.value = chip.dataset.qSubject || '';
      currentQuery.page = 1;
      performSearch();
    });
  });
  sortEl.addEventListener('change', () => {
    // Re-render sorted currentDocs
    const sorted = applySort(currentDocs);
    const frag = document.createDocumentFragment();
    sorted.forEach((doc)=> frag.appendChild(makeBookCard(doc)));
    resultsEl.innerHTML = '';
    resultsEl.appendChild(frag);
  });
  loadMoreBtn.addEventListener('click', () => performSearch(true));
  tabButtons.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Init recent & favorites
  renderRecent();
  renderFavorites();

  // Default demo search
  titleEl.value = 'Harry Potter';
  subjectEl.value = 'fantasy';
  performSearch();
}

window.addEventListener('DOMContentLoaded', wireUI);