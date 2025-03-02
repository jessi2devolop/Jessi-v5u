import { bot } from '#src';
import { setAntiWordStatus, getAntiWords, addAntiWords, removeAntiWords } from '#sql';

bot(
  {
    pattern: 'antiword',
    public: true,
    isGroup: true,
    desc: 'Set Antiword Management for Group Chats',
    type: 'group',
  },
  async (message, match, { jid, prefix }) => {
    const [cmd, ...args] = match.split(' ');

    if (cmd.toLowerCase() === 'on') {
      const statusResult = await setAntiWordStatus(jid, true);
      if (statusResult.success)
        return await message.send('_Antiword has been enabled for this group._');
    }
    const antiwordStatus = await getAntiWords(jid);
    if (!antiwordStatus.status) {
      return await message.send('_Enable antiword first using "' + prefix + 'antiword on"_');
    }

    if (cmd.toLowerCase() === 'set') {
      if (!args[0])
        return await message.send(
          '_Provide words to block. Usage: ' + prefix + 'antiword set word1,word2,word3_'
        );
      const wordsToSet = args[0].split(',').map((word) => word.trim());
      const uniqueWords = [...new Set(wordsToSet)];
      const existingWords = antiwordStatus.words || [];
      const newWords = uniqueWords.filter((word) => !existingWords.includes(word));
      if (newWords.length === 0)
        return await message.send('_All provided words are already in the antiword list._');
      const setResult = await addAntiWords(jid, newWords);
      if (setResult.success)
        return await message.send(`_Added "${newWords.length}" new words to antiword list._`);
    }

    if (cmd.toLowerCase() === 'get') {
      if (antiwordStatus.success) {
        const wordsList =
          antiwordStatus.words.length > 0 ? antiwordStatus.words.join(', ') : 'No antiwords set';
        return await message.send(
          `Antiword status: ${antiwordStatus.status ? 'Enabled' : 'Disabled'}\n` +
            `Blocked words: ${wordsList}`
        );
      }
    }

    if (cmd.toLowerCase() === 'del') {
      if (!args[0])
        return await message.send(
          '_Provide words to delete. Usage: .antiword del word1,word2,word3_'
        );
      const wordsToDelete = args[0].split(',').map((word) => word.trim());
      const existingWords = antiwordStatus.words || [];
      const validWordsToDelete = wordsToDelete.filter((word) => existingWords.includes(word));
      if (validWordsToDelete.length === 0)
        return await message.send('_None of the provided words are in the antiword list._');
      const delResult = await removeAntiWords(jid, validWordsToDelete);
      if (delResult.success)
        return await message.send(
          `_Removed ${validWordsToDelete.length} words from antiword list._`
        );
    }
    await message.send(
      `Usage:\n${prefix}antiword on - Enable antiword\n${prefix}antiword set word1,word2,word3 - Set blocked words\n${prefix}antiword get - View current antiwords\n${prefix}antiword del word1,word2 - Delete specific words`
    );
  }
);
