const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

const API_KEY = "AIzaSyAbhpNuzreYrqOsU0u4nj75_NO5WohpKNE";

let currentController = null;

const FALLBACK_IMAGE = "https://via.placeholder.com/128x190?text=No+Cover";
const FAVOURITES_KEY = "bookfinder_favourites";
const HISTORY_KEY = "bookfinder_history";

// Event listeners
searchBtn.addEventListener("click", searchBooks);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchBooks();
  }
});

// Initialise extras when page loads
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
  renderFavourites();
});

// -------------------------
// Search
// -------------------------
async function searchBooks() {
  const query = searchInput.value.trim();

  if (!query) {
    showMessage("Please enter a book title.");
    searchInput.focus();
    return;
  }

  if (!API_KEY || API_KEY === "HIDDEN KEY WILL ADD") {
    showMessage("Please add your Google Books API key first.");
    return;
  }

  if (currentController) {
    currentController.abort();
  }

  currentController = new AbortController();

  setLoading(true);
  showSpinner();

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&key=${API_KEY}`;

    const response = await fetch(url, {
      signal: currentController.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    saveSearchHistory(query);
    renderHistory();
    displayBooks(data.items || []);
  } catch (error) {
    if (error.name === "AbortError") return;

    console.error("Search failed:", error);
    showMessage("Error loading books. Please try again.");
  } finally {
    setLoading(false);
  }
}

// -------------------------
// Display books
// -------------------------
function displayBooks(books) {
  results.innerHTML = "";

  if (!books.length) {
    showMessage("No books found.");
    return;
  }

  books.forEach((book) => {
    const info = book.volumeInfo || {};
    const bookId = book.id || crypto.randomUUID();

    const title = info.title || "No title";
    const authors = Array.isArray(info.authors) ? info.authors.join(", ") : "Unknown author";
    const image = info.imageLinks?.thumbnail || FALLBACK_IMAGE;
    const description = info.description || "No description available.";
    const publishedDate = info.publishedDate || "Unknown";
    const publisher = info.publisher || "Unknown";
    const previewLink = info.previewLink || "#";

    const col = document.createElement("div");
    col.className = "col-md-3 mb-4";

    const card = document.createElement("div");
    card.className = "card book-card h-100 shadow-sm";

    const img = document.createElement("img");
    img.src = image;
    img.className = "card-img-top";
    img.alt = `Cover of ${title}`;
    img.loading = "lazy";
    img.onerror = function () {
      this.src = FALLBACK_IMAGE;
    };

    const cardBody = document.createElement("div");
    cardBody.className = "card-body d-flex flex-column";

    const titleEl = document.createElement("h6");
    titleEl.className = "card-title";
    titleEl.textContent = title;

    const authorEl = document.createElement("p");
    authorEl.className = "card-text";
    authorEl.textContent = authors;

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "mt-auto d-flex gap-2 flex-wrap";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "btn btn-sm btn-outline-primary";
    detailsBtn.textContent = "View Details";
    detailsBtn.addEventListener("click", () => {
      showBookDetails({
        id: bookId,
        title,
        authors,
        image,
        description,
        publishedDate,
        publisher,
        previewLink
      });
    });

    const favouriteBtn = document.createElement("button");
    favouriteBtn.className = "btn btn-sm btn-outline-danger";
    favouriteBtn.textContent = isFavourite(bookId) ? "♥ Saved" : "♡ Save";
    favouriteBtn.setAttribute("aria-label", `Save ${title} to favourites`);

    favouriteBtn.addEventListener("click", () => {
      toggleFavourite({
        id: bookId,
        title,
        authors,
        image,
        description,
        publishedDate,
        publisher,
        previewLink
      });

      favouriteBtn.textContent = isFavourite(bookId) ? "♥ Saved" : "♡ Save";
      renderFavourites();
    });

    buttonGroup.appendChild(detailsBtn);
    buttonGroup.appendChild(favouriteBtn);

    cardBody.appendChild(titleEl);
    cardBody.appendChild(authorEl);
    cardBody.appendChild(buttonGroup);

    card.appendChild(img);
    card.appendChild(cardBody);
    col.appendChild(card);

    results.appendChild(col);
  });
}

// -------------------------
// Messages and loading
// -------------------------
function showMessage(message) {
  results.innerHTML = `<p class="text-center">${message}</p>`;
}

function showSpinner() {
  results.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border" role="status" aria-hidden="true"></div>
      <p class="mt-2">Loading books...</p>
    </div>
  `;
}

function setLoading(isLoading) {
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? "Searching..." : "Search";
}

// -------------------------
// Favourites
// -------------------------
function getFavourites() {
  return JSON.parse(localStorage.getItem(FAVOURITES_KEY)) || [];
}

function saveFavourites(favourites) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
}

function isFavourite(bookId) {
  return getFavourites().some((book) => book.id === bookId);
}

function toggleFavourite(book) {
  let favourites = getFavourites();

  if (isFavourite(book.id)) {
    favourites = favourites.filter((fav) => fav.id !== book.id);
  } else {
    favourites.push(book);
  }

  saveFavourites(favourites);
}

function renderFavourites() {
  const favouritesContainer = document.getElementById("favourites");
  if (!favouritesContainer) return;

  const favourites = getFavourites();
  favouritesContainer.innerHTML = "";

  if (!favourites.length) {
    favouritesContainer.innerHTML = "<p>No favourites saved yet.</p>";
    return;
  }

  favourites.forEach((book) => {
    const item = document.createElement("div");
    item.className = "card mb-2 p-2";

    item.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <img src="${book.image}" alt="Cover of ${book.title}" width="50" height="75" style="object-fit: cover;">
        <div>
          <strong>${book.title}</strong><br>
          <span>${book.authors}</span>
        </div>
      </div>
    `;

    favouritesContainer.appendChild(item);
  });
}

// -------------------------
// Search history
// -------------------------
function getHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function saveSearchHistory(query) {
  let history = getHistory();

  history = history.filter((item) => item.toLowerCase() !== query.toLowerCase());
  history.unshift(query);

  if (history.length > 8) {
    history = history.slice(0, 8);
  }

  saveHistory(history);
}

function renderHistory() {
  const historyContainer = document.getElementById("history");
  if (!historyContainer) return;

  const history = getHistory();
  historyContainer.innerHTML = "";

  if (!history.length) {
    historyContainer.innerHTML = "<p>No recent searches.</p>";
    return;
  }

  history.forEach((query) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-secondary me-2 mb-2";
    btn.textContent = query;
    btn.addEventListener("click", () => {
      searchInput.value = query;
      searchBooks();
    });

    historyContainer.appendChild(btn);
  });
}

// -------------------------
// Book details
// -------------------------
function showBookDetails(book) {
  let modal = document.getElementById("bookDetailsModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "bookDetailsModal";
    modal.className = "book-modal-overlay";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="book-modal-content">
      <button class="book-modal-close" aria-label="Close book details">&times;</button>
      <img src="${book.image}" alt="Cover of ${book.title}" class="img-fluid mb-3" style="max-height: 250px; object-fit: contain;">
      <h3>${book.title}</h3>
      <p><strong>Author(s):</strong> ${book.authors}</p>
      <p><strong>Publisher:</strong> ${book.publisher}</p>
      <p><strong>Published:</strong> ${book.publishedDate}</p>
      <p>${book.description}</p>
      <p>
        <a href="${book.previewLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
          Preview Book
        </a>
      </p>
    </div>
  `;

  modal.style.display = "flex";

  const closeBtn = modal.querySelector(".book-modal-close");
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}
