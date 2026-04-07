import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

// We load json files as data source
import SALES from "./sources/vinted.json" with { type: "json" };
import DEALS from "./dealabs-lego.json" with { type: "json" };

const PORT = 8092;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

app.get('/', (request, response) => {
  response.send({ ack: true });
});

app.get('/deals/search', (request, response) => {
  try {
    let results = [...DEALS];

    const limit = parseInt(request.query.limit) || 12;
    const price = request.query.price ? parseFloat(request.query.price) : null;
    const filterBy = request.query.filterBy;

    // filtre prix
    if (price !== null) {
      results = results.filter((deal) => {
        return deal.price && !isNaN(deal.price) && deal.price <= price;
      });
    }

    // tri
    if (filterBy === 'best-discount') {
      results.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    } else {
      results.sort((a, b) => (a.price || 9999) - (b.price || 9999));
    }

    return response.status(200).json({
      success: true,
      data: {
        limit,
        total: results.length,
        results: results.slice(0, limit)
      }
    });

  } catch (error) {
    console.log("ERROR deals/search:", error);

    return response.status(500).json({
      success: false,
      data: { result: null }
    });
  }
});

app.get('/deals/:id', (request, response) => {
  try {
    const { id } = request.params;

    const deal = DEALS.find((item) => item.link.includes(id));

    if (!deal) {
      return response.status(404).json({
        success: false,
        data: { result: null }
      });
    }

    return response.status(200).json({
      success: true,
      data: { result: deal }
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({
      success: false,
      data: { result: null }
    });
  }
});



app.get('/sales/search', (request, response) => {
  try {
    const { legoSetId, limit = 12 } = request.query;

    let results = [];

    if (legoSetId) {
      results = SALES[legoSetId] || [];
    } else {
      results = Object.values(SALES).flat();
    }

    results.sort((a, b) => (b.published || 0) - (a.published || 0));

    const limitedResults = results.slice(0, Number(limit));

    return response.status(200).json({
      success: true,
      data: {
        limit: Number(limit),
        total: limitedResults.length,
        results: limitedResults
      }
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({
      success: false,
      data: {
        limit: 0,
        total: 0,
        results: []
      }
    });
  }
});

app.listen(PORT);

console.log(`📡 Running on port ${PORT}`);