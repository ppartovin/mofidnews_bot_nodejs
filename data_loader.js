const fs = require('node:fs');
const path = require('node:path');

function loadData() {
  const read = (name) => {
    const file = path.join(__dirname, name);
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { throw new Error(`Could not load ${name}: ${error.message}`, { cause: error }); }
  };
  return { application_data: read('datas.json'), classes_table: read('classes_table.json') };
}

module.exports = { loadData };
