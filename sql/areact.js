import fs from 'fs';
import path from 'path';

const store = path.join('store', 'areact.json');

if (!fs.existsSync(store)) {
  fs.writeFileSync(store, JSON.stringify({ status: false }));
}

const readDB = () => JSON.parse(fs.readFileSync(store, 'utf8'));
const writeDB = (data) => fs.writeFileSync(store, JSON.stringify(data, null, 2));

async function setAutoReactStatus(status) {
  const db = readDB();
  db.status = status;
  writeDB(db);
  return {
    success: true,
    message: `Auto-react is now ${status ? 'enabled' : 'disabled'}`,
  };
}

async function getAutoReactStatus() {
  const db = readDB();
  return db.status;
}

export { setAutoReactStatus, getAutoReactStatus };
