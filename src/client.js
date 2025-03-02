import {
  makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  useMultiFileAuthState,
  isJidBroadcast,
} from 'baileys';
import {
  AntiCall,
  Greetings,
  GroupEventPartial,
  GroupEvents,
  Antilink,
  AntiSpammer,
  AntiWord,
  AutoKick,
  schedules,
  AntiDelete,
} from '#lib';
import Message from './message.js';
import { EventEmitter } from 'events';
import { manageProcess, deepClone, toJid, devs } from '#utils';
import { loadMessage, saveMessages, getName, getConfig, addSudo } from '#sql';
import { Plugins, logger, serialize, listenersPlugins, commands } from '#src';
import { LANG } from '#theme';
import { config } from '#config';
import NodeCache from 'node-cache';

EventEmitter.defaultMaxListeners = 10000;
process.setMaxListeners(10000);

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

export const client = async () => {
  const session = await useMultiFileAuthState('session');
  const { state, saveCreds } = session;
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: true,
    logger,
    browser: Browsers.windows('chrome'),
    version,
    emitOwnEvents: true,
    generateHighQualityLinkPreview: true,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    getMessage: async (key) => {
      const store = await loadMessage(key.id);
      return store ? store : { conversation: null };
    },
  });

  conn.loadMessage = loadMessage.bind(conn);
  conn.getName = getName.bind(conn);

  conn.ev.process(async (events) => {
    if (events.call) await AntiCall(events.call, conn);

    if (events['connection.update']) {
      const { connection, lastDisconnect } = events['connection.update'];
      switch (connection) {
        case 'connecting':
          console.log(LANG.START_BOOT);
          break;

        case 'close':
          lastDisconnect.error?.output?.statusCode === DisconnectReason.loggedOut
            ? manageProcess()
            : client();
          break;

        case 'open':
          addSudo((await devs()).map((dev) => toJid(dev)));
          addSudo(toJid(conn.user.id));
          const cmds = commands.filter(
            (cmd) =>
              cmd.pattern &&
              !cmd.dontAddCommandList &&
              !cmd.pattern.toString().includes('undefined')
          ).length;
          await conn.sendMessage(conn.user.id, {
            text: `\`\`\`${LANG.CONNECTED}\n\nVersion: ${config.VERSION}\n\nPlugins: ${cmds}\`\`\``,
          });
          console.log(LANG.PROCESS_STARTED);
          break;
      }
    }

    if (events['creds.update']) await saveCreds();

    if (events['messages.upsert']) {
      const { messages } = events['messages.upsert'];
      const { autoRead, autoStatusRead, autolikestatus } = await getConfig();

      for (const message of messages) {
        const msg = await serialize(deepClone(JSON.parse(JSON.stringify(message))), conn);
        const data = new Message(conn, msg);
        if (autoRead) await conn.readMessages([msg.key]);
        if (autoStatusRead && isJidBroadcast(msg.from)) await conn.readMessages([msg.key]);
        if (autolikestatus && isJidBroadcast(msg.from)) {
          await conn.sendMessage(
            msg.from,
            { react: { key: msg.key, text: '💚' } },
            { statusJidList: [message.key.participant, conn.user.id] }
          );
        }
        await Promise.all([
          listenersPlugins(data, msg, conn),
          Plugins(data, msg, conn),
          saveMessages(msg),
          AntiDelete(msg),
          AntiSpammer(msg),
          Antilink(msg),
          schedules(msg),
          AntiWord(msg),
          AutoKick(msg),
        ]);
      }
    }

    if (events['group-participants.update'] || events['groups.update']) {
      if ((await getConfig()).disablegc) return;

      if (events['group-participants.update']) {
        const { id, participants, action, author } = events['group-participants.update'];
        const metadata = await conn.groupMetadata(id);
        groupCache.set(event.id, metadata);
        const event = { Group: id, participants, action, by: author };
        await Promise.all([Greetings(event, conn), GroupEvents(event, conn)]);
      }

      if (events['groups.update']) {
        for (const update of events['groups.update']) {
          const metadata = await conn.groupMetadata(update.id);
          groupCache.set(update.id, metadata);
          await GroupEventPartial(update, conn);
        }
      }
    }
  });

  return conn;
};
