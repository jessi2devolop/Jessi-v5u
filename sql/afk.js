import fs from 'fs';
import path from 'path';

const store = path.join('store', 'afk.json');

export async function getAfkMessage() {
  if (!fs.existsSync(store))
    fs.writeFileSync(store, JSON.stringify({ message: null, timestamp: null }));
  const data = JSON.parse(fs.readFileSync(store, 'utf8'));
  if (data.message && data.timestamp) {
    return { message: data.message, timestamp: data.timestamp };
  }
  return null;
}

export const setAfkMessage = async (afkMessage, timestamp) => {
  if (!fs.existsSync(store))
    fs.writeFileSync(store, JSON.stringify({ message: null, timestamp: null }));
  const data = { message: afkMessage, timestamp };
  fs.writeFileSync(store, JSON.stringify(data, null, 2));
  return data;
};

export const delAfkMessage = async () => {
  if (!fs.existsSync(store))
    fs.writeFileSync(store, JSON.stringify({ message: null, timestamp: null }));
  const data = { message: null, timestamp: null };
  fs.writeFileSync(store, JSON.stringify(data, null, 2));
};
