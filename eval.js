
const fs = require("fs");

const csv = fs.readFileSync("test-set.csv", "utf8");
const searchResults = JSON.parse(
  fs.readFileSync("search-results.json", "utf8")
);

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim());

  return lines.map(line => {
    const values = line.split(",");
    return Object.fromEntries(
      headers.map((header, i) => [
        header,
        (values[i] || "").trim()
      ])
    );
  });
}

function reciprocalRank(results, correctIds) {
  for (let i = 0; i < results.length; i++) {
    const id = typeof results[i] === "object"
      ? results[i].post_id
      : results[i];

    if (correctIds.includes(String(id))) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) /
    values.length;
}

function displayRank(rr) {
  return rr === 0 ? "miss" : String(Math.round(1 / rr));
}

const testSet = parseCSV(csv);
const keywordRRs = [];
const semanticRRs = [];
let keywordHits = 0;
let semanticHits = 0;

const table = [
  "| Query | Keyword rank | Semantic rank |",
  "|---|---|---|"
];

for (const item of testSet) {
  const query = item.query;
  const correctIds = item.correct_post_ids
    .split(";")
    .map(id => id.trim());

  const ranked = searchResults[query];

  if (!ranked) {
    throw new Error("Missing search results for: " + query);
  }

  const keywordRR = reciprocalRank(ranked.keyword, correctIds);
  const semanticRR = reciprocalRank(ranked.semantic, correctIds);

  keywordRRs.push(keywordRR);
  semanticRRs.push(semanticRR);

  if (keywordRR > 0) keywordHits++;
  if (semanticRR > 0) semanticHits++;

  table.push(
    `| ${query} | ${displayRank(keywordRR)} | ${displayRank(semanticRR)} |`
  );
}

const keywordMRR = mean(keywordRRs);
const semanticMRR = mean(semanticRRs);
const keywordRecall = keywordHits / testSet.length;
const semanticRecall = semanticHits / testSet.length;

table.push(
  `| **Summary** | **MRR ${keywordMRR.toFixed(2)} · Recall@10 ${keywordRecall.toFixed(2)}** | **MRR ${semanticMRR.toFixed(2)} · Recall@10 ${semanticRecall.toFixed(2)}** |`
);

console.log(table.join("\n"));

