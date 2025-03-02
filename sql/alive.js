import fs from 'fs';
import path from 'path';
import { config } from '#config';
import { runtime, XSTRO } from '#utils';

const store = path.join('store', 'alive.json');

const readDB = () => JSON.parse(fs.readFileSync(store, 'utf8'));
const writeDB = (data) => fs.writeFileSync(store, JSON.stringify(data, null, 2));

const getAliveMsg = async () => {
  if (!fs.existsSync(store)) fs.writeFileSync(store, JSON.stringify({ message: null }));
  const data = readDB();
  return (
    data.message ||
    `Hey @user \n\nI'm Alive\nRuntime: &runtime`
  );
};

const setAliveMsg = async (text) => {
  if (!fs.existsSync(store)) fs.writeFileSync(store, JSON.stringify({ message: null }));
  writeDB({ message: text });
  return true;
};

const aliveMessage = async (message) => {
  if (!fs.existsSync(store)) fs.writeFileSync(store, JSON.stringify({ message: null }));
  const msg = await getAliveMsg();
  return msg
    .replace(/&runtime/g, runtime(process.uptime()))
    .replace(/&user/g, message.pushName || 'user')
    .replace(/@user/g, `@${message.sender.split('@')[0]}`)
    .replace(/&owner/g, config.BOT_INFO.split(';')[0])
    .replace(/&botname/g, config.BOT_INFO.split(';')[1])
    .replace(/&facts/g, await XSTRO.facts())
    .replace(/&quotes/g, await XSTRO.quotes())
    .replace(/&rizz/g, await XSTRO.rizz());
};

export { getAliveMsg, setAliveMsg, aliveMessage };
