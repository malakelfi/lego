// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');

// --- Filter button: By best discount (> 50%) ---
const btnBestDiscount = document.createElement('button');
btnBestDiscount.textContent = 'By best discount';

// On l'ajoute près du select "Show"
selectShow.parentElement.appendChild(btnBestDiscount);

// (optionnel) bouton pour revenir à l'affichage normal
const btnReset = document.createElement('button');
btnReset.textContent = 'Reset';
selectShow.parentElement.appendChild(btnReset);


const btnMostCommented = document.createElement('button');
btnMostCommented.textContent = 'By most commented';
selectShow.parentElement.appendChild(btnMostCommented);


const btnMosthot = document.createElement('button');
btnMosthot.textContent = 'By hot deals';
selectShow.parentElement.appendChild(btnMosthot);


const selectSort = document.querySelector('#sort-select');


/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      console.log(deal);
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}">${deal.title}</a>
        <span>${deal.price}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});



btnBestDiscount.addEventListener('click', async () => {
  // récupère tous les deals d'un coup
  const allData = await fetchDeals(1, currentPagination.count);
  const allDeals = allData.result;

  // filtre discount > 50 (null devient 0 avec Number())
  const filtered = allDeals.filter(deal => Number(deal.discount) > 50);

  render(filtered, { currentPage: 1, pageCount: 1, count: filtered.length });
});

btnReset.addEventListener('click', async () => {
  const deals = await fetchDeals(1, Number(selectShow.value));
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});




btnMostCommented.addEventListener('click', async () => {
  // récupérer tous les deals
  const allData = await fetchDeals(1, currentPagination.count);
  const allDeals = allData.result;

  // filtrer ceux avec > 15 commentaires
  const filtered = allDeals.filter(deal => Number(deal.comments) > 15);

  // afficher
  render(filtered, { currentPage: 1, pageCount: 1, count: filtered.length });
});



btnMosthot.addEventListener('click', async () => {
  // récupérer tous les deals
  const allData = await fetchDeals(1, currentPagination.count);
  const allDeals = allData.result;

  // filtrer ceux avec > 100 temperature
  const filtered = allDeals.filter(deal => Number(deal.temperature) > 100);

  // afficher
  render(filtered, { currentPage: 1, pageCount: 1, count: filtered.length });
});



selectSort.addEventListener('change', () => {
  // on récupère ce que l'utilisateur a choisi (ex: "Cheaper" ou "cheaper")
  const choice = String(selectSort.value).toLowerCase();

  // copie des deals actuels
  const sortedDeals = [...currentDeals];

  if (choice.includes('cheap')) {
    sortedDeals.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (choice.includes('expens')) {
    sortedDeals.sort((a, b) => Number(b.price) - Number(a.price));
  } else {
    // si c'est "recently published" ou autre, on ne fait rien ici (pour l'instant)
    return;
  }

  render(sortedDeals, currentPagination);
});
