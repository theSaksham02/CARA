const fs = require('fs');
const path = require('path');

function loadProtocols() {
  const imciPath = path.join(__dirname, '../../ml/protocols/imci.json');
  try {
    const data = fs.readFileSync(imciPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading IMCI protocols:", error);
    return [];
  }
}

module.exports = { loadProtocols };
