'use strict';

// =========================
// STATE
// =========================
let currentDeals = [];
let currentPagination = {};
let currentSales = [];
let activeFilter = 'all'; // all | discount | comments | hot | favorites
let favorites = JSON.parse(localStorage.getItem('favoriteDeals') || '[]');

// =========================
// SELECTORS
// =========================
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectSort = document.querySelector('#sort-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');

const sectionDeals = document.querySelector('#deals');
const filtersContainer = document.querySelector('#filters');

const spanNbDeals = document.querySelector('#nbDeals');
const spanNbSales = document.querySelector('#nbSales');

// spans des autres indicateurs
const indicatorRows = document.querySelectorAll('#indicators > div');
const spanAvg = document.querySelector('#avgSalesPrice');
const spanP5 = indicatorRows[3].querySelectorAll('span')[1];
const spanP25 = indicatorRows[4].querySelectorAll('span')[1];
const spanP50 = indicatorRows[5].querySelectorAll('span')[1];
const spanLifetime = indicatorRows[6].querySelectorAll('span')[1];

// =========================
// HELPERS
// =========================
const saveFavorites = () => {
  localStorage.setItem('favoriteDeals', JSON.stringify(favorites));
};

const isFavorite = uuid => favorites.includes(uuid);

const toggleFavorite = uuid => {
  if (isFavorite(uuid)) {
    favorites = favorites.filter(id => id !== uuid);
  } else {
    favorites.push(uuid);
  }
  saveFavorites();
  render(currentDeals, currentPagination, currentSales);
};

const unique = array => [...new Set(array)];

const extractSetIds = deals => {
  return unique(
    deals
      .map(deal => deal.id)
      .filter(Boolean)
  );
};

const formatPrice = value => {
  const number = Number(value);
  return Number.isNaN(number) ? '0' : number.toFixed(2);
};

const percentile = (values, p) => {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const average = values => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const daysBetween = timestamps => {
  if (!timestamps.length) return 0;

  const validTimestamps = timestamps
    .map(value => Number(value))
    .filter(value => !Number.isNaN(value));

  if (!validTimestamps.length) return 0;

  const min = Math.min(...validTimestamps);
  const max = Math.max(...validTimestamps);

  return Math.round((max - min) / (60 * 60 * 24));
};

// sécurise l’accès aux champs selon l’API
const getDealDiscount = deal => Number(deal.discount ?? 0);
const getDealComments = deal => Number(deal.commentsCount ?? deal.comments ?? 0);
const getDealTemperature = deal => Number(deal.temperature ?? 0);
const getDealPrice = deal => Number(deal.price ?? 0);
const getDealDate = deal => Number(
  deal.published ?? deal.publishedAt ?? deal.date ?? deal.createdAt ?? 0
);

// pour les ventes
const getSalePrice = sale => Number(sale.price?.amount ?? 0);
const getSaleDate = sale => sale.published ?? null;
const getSaleLink = sale => sale.link ?? sale.url ?? '#';
const getSaleTitle = sale => sale.title ?? sale.name ?? 'Sold item';

// =========================
// API
// =========================
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return { result: currentDeals, meta: currentPagination };
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return { result: currentDeals, meta: currentPagination };
  }
};

const fetchSales = async id => {
  if (!id) return [];

  try {
    const response = await fetch(`https://lego-api-blue.vercel.app/sales?id=${id}`);
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return [];
    }

    // selon l’API : body.data ou body.data.result ou tableau direct
    if (Array.isArray(body.data)) return body.data;
    if (Array.isArray(body.data?.result)) return body.data.result;
    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

// =========================
// STATE SETTERS
// =========================
const setCurrentDeals = ({ result, meta }) => {
  currentDeals = result;
  currentPagination = meta;
};

const setCurrentSales = sales => {
  currentSales = sales;
};

// =========================
// FILTER / SORT
// =========================
const applyFilter = deals => {
  switch (activeFilter) {
    case 'discount':
      return deals.filter(deal => getDealDiscount(deal) > 50);

    case 'comments':
      return deals.filter(deal => getDealComments(deal) > 15);

    case 'hot':
      return deals.filter(deal => getDealTemperature(deal) > 100);

    case 'favorites':
      return deals.filter(deal => isFavorite(deal.uuid));

    default:
      return deals;
  }
};

const applySort = deals => {
  const sorted = [...deals];
  const value = selectSort.value;

  switch (value) {
    case 'price-asc':
      return sorted.sort((a, b) => getDealPrice(a) - getDealPrice(b));

    case 'price-desc':
      return sorted.sort((a, b) => getDealPrice(b) - getDealPrice(a));

    case 'date-asc':
      return sorted.sort((a, b) => getDealDate(a) - getDealDate(b));

    case 'date-desc':
      return sorted.sort((a, b) => getDealDate(b) - getDealDate(a));

    default:
      return sorted;
  }
};

// =========================
// RENDER
// =========================
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const container = document.createElement('div');

  const template = deals.length
    ? deals.map(deal => {
        return `
          <article class="deal" id="${deal.uuid}">
            <div>
              <strong>${deal.id}</strong>
              <a href="${deal.link}" target="_blank" rel="noopener noreferrer">${deal.title}</a>
              <span>${formatPrice(deal.price)} €</span>
              <button class="favorite-btn" data-uuid="${deal.uuid}">
                ${isFavorite(deal.uuid) ? '★ Favori' : '☆ Favori'}
              </button>
            </div>
            <div>
              <small>
                Remise: ${getDealDiscount(deal)}% |
                Commentaires: ${getDealComments(deal)} |
                Température: ${getDealTemperature(deal)}
              </small>
            </div>
          </article>
        `;
      }).join('')
    : '<p>Aucune offre trouvée.</p>';

  container.innerHTML = template;
  fragment.appendChild(container);

  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);

  document.querySelectorAll('.favorite-btn').forEach(button => {
    button.addEventListener('click', () => {
      toggleFavorite(button.dataset.uuid);
    });
  });
};

const renderPagination = pagination => {
  const { currentPage = 1, pageCount = 1 } = pagination;

  const options = Array.from(
    { length: pageCount },
    (_, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.value = String(currentPage);
};

const renderLegoSetIds = deals => {
  const ids = extractSetIds(deals);
  const options = ids.map(id => `<option value="${id}">${id}</option>`).join('');
  selectLegoSetIds.innerHTML = options;
};

const renderIndicators = (deals, sales) => {
  spanNbDeals.textContent = deals.length;
  spanNbSales.textContent = sales.length;

  const salePrices = sales
    .map(getSalePrice)
    .filter(value => !Number.isNaN(value) && value > 0);

  spanAvg.textContent = `${formatPrice(average(salePrices))} €`; 
  spanP5.textContent = `${formatPrice(percentile(salePrices, 5))} €`;
  spanP25.textContent = `${formatPrice(percentile(salePrices, 25))} €`;
  spanP50.textContent = `${formatPrice(percentile(salePrices, 50))} €`;

  const dates = sales.map(getSaleDate).filter(Boolean);
  spanLifetime.textContent = `${daysBetween(dates)} jours`;
};

const renderSales = sales => {
  const existing = document.querySelector('#sales');

  if (existing) existing.remove();

  const section = document.createElement('section');
  section.id = 'sales';

  const html = sales.length
    ? sales.map(sale => `
        <article class="sale">
          <a href="${getSaleLink(sale)}" target="_blank" rel="noopener noreferrer">
            ${getSaleTitle(sale)}
          </a>
          <span>${formatPrice(getSalePrice(sale))} €</span>
        </article>
      `).join('')
    : '<p>Aucune vente Vinted pour ce set.</p>';

  section.innerHTML = `
    <h2>Vinted sales</h2>
    ${html}
  `;

  sectionDeals.parentNode.insertBefore(section, sectionDeals);
};

const renderFilterButtons = () => {
  filtersContainer.innerHTML = `
    <button data-filter="discount">By best discount</button>
    <button data-filter="comments">By most commented</button>
    <button data-filter="hot">By hot deals</button>
    <button data-filter="favorites">By favorites</button>
    <button data-filter="all">Reset</button>
  `;

  filtersContainer.querySelectorAll('button').forEach(button => {
    if (button.dataset.filter === activeFilter) {
      button.style.fontWeight = 'bold';
    }

    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      render(currentDeals, currentPagination, currentSales);
    });
  });
};

const render = (deals, pagination, sales = []) => {
  const filteredDeals = applyFilter(deals);
  const sortedDeals = applySort(filteredDeals);

  renderFilterButtons();
  renderDeals(sortedDeals);
  renderPagination(pagination);
  renderLegoSetIds(deals);
  renderIndicators(sortedDeals, sales);
  renderSales(sales);
};

// =========================
// LISTENERS
// =========================
selectShow.addEventListener('change', async event => {
  const size = parseInt(event.target.value, 10);
  const deals = await fetchDeals(1, size);

  setCurrentDeals(deals);

  const selectedId = selectLegoSetIds.value || extractSetIds(currentDeals)[0];
  const sales = await fetchSales(selectedId);
  setCurrentSales(sales);

  render(currentDeals, currentPagination, currentSales);
});

selectPage.addEventListener('change', async event => {
  const page = parseInt(event.target.value, 10);
  const size = parseInt(selectShow.value, 10);

  const deals = await fetchDeals(page, size);
  setCurrentDeals(deals);

  const firstId = extractSetIds(currentDeals)[0];
  const sales = await fetchSales(firstId);
  setCurrentSales(sales);

  render(currentDeals, currentPagination, currentSales);
});

selectSort.addEventListener('change', () => {
  render(currentDeals, currentPagination, currentSales);
});

selectLegoSetIds.addEventListener('change', async event => {
  const id = event.target.value;
  const sales = await fetchSales(id);
  setCurrentSales(sales);
  render(currentDeals, currentPagination, currentSales);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals(1, parseInt(selectShow.value, 10));
  setCurrentDeals(deals);

  const ids = extractSetIds(currentDeals);
  const firstId = ids[0];
  const sales = await fetchSales(firstId);
  setCurrentSales(sales);

  render(currentDeals, currentPagination, currentSales);
});