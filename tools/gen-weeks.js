/* eslint-disable */
// Generate week 2 & 3 question banks (public/data-weeks.js).
// All question content below is hand-authored; the script only assembles the
// structural boilerplate (vocab stages, ids, durations) to match week 1's
// shape exactly. Run: node tools/gen-weeks.js
const fs = require('fs');
const path = require('path');

// ---- shared helpers --------------------------------------------------------
const EMOJI_POOL = ['🪨','⚽','🏃','🔍','😈','🐛','🍎','🐶','🚗','📚','🌞','🌧','🎂','🚲','🐦','🍌','🏠','🎨','🍩','✏️','🐄','🦋','🌻','🚌','🧊','🎵','🐘','🐟'];

function shufflePick(arr, n, exclude) {
  const pool = arr.filter(x => x !== exclude);
  const out = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function buildWord(w, allWords) {
  const others = allWords.filter(x => x.word !== w.word);
  const emojiDistract = shufflePick(EMOJI_POOL.concat(others.map(o => o.emoji)), 3, w.emoji);
  const meanDistract = shufflePick(others.map(o => o.meaning), 3, w.meaning);

  const ic1 = [w.emoji].concat(emojiDistract.slice(0, 3));
  const ic2 = shufflePick(EMOJI_POOL.concat(others.map(o => o.emoji)), 3, w.emoji).concat([w.emoji]);
  const mc1 = [w.meaning].concat(meanDistract.slice(0, 3));
  const mc2 = meanDistract.slice(0, 3).concat([w.meaning]);
  const pos = a => a.indexOf(w.emoji);
  const posm = a => a.indexOf(w.meaning);

  return {
    word: w.word, phonetic: w.phonetic, meaning: w.meaning, emoji: w.emoji,
    example_en: w.example_en, example_cn: w.example_cn,
    stages: [
      { type: 'learn', instruction: '看图学单词' },
      { type: 'image_choice', prompt: '听发音，选图片（1/2）', options: ic1, answer: pos(ic1) },
      { type: 'image_choice', prompt: '听发音，选图片（2/2）', options: ic2, answer: pos(ic2) },
      { type: 'meaning_choice', prompt: w.word + ' 是什么意思？（1/2）', options: mc1, answer: posm(mc1) },
      { type: 'meaning_choice', prompt: w.word + ' 是什么意思？（2/2）', options: mc2, answer: posm(mc2) },
      { type: 'letter_read', prompt: '跟读字母（每个字母读两遍）' },
      { type: 'syllable_blend', prompt: '拼合音标（每个音节读两遍）' },
      { type: 'spell_fill', prompt: '补全拼写: ' + w.blank, answer: w.blankAnswer },
    ],
    letters: w.word.split(''),
    syllables: w.syllables,
  };
}

function choice(id, question, options, answer, cn, en) {
  return { id, type: 'choice', question, options, answer, explanation_cn: cn, explanation_en: en };
}
function fill(id, question, answer, cn, en) {
  return { id, type: 'fill', question, answer, explanation_cn: cn, explanation_en: en };
}
function speaking(id, sentence, sentence_cn, options, cn, en) {
  return { id, sentence, sentence_cn, options, answer: 0, pronunciation_tips: cn, explanation_cn: cn, explanation_en: en };
}
function reading(id, passage, passage_cn, questions) {
  return { id, name_cn: '阅读理解', type: 'reading', duration: 5, passage, passage_cn, questions };
}
function mcqModule(id, name, type, duration, questions) {
  return { id, name_cn: name, type, duration, questions };
}

// Build a full week from per-day raw content, cloning shape metadata (durations,
// names) from week 1's module at the same position.
function buildWeek(raw, weekPrefix) {
  const week1 = HOMEWORK_DATA_W1;
  return raw.map((day, di) => {
    const w1day = week1[di];
    const modules = day.modules.map((m, mi) => {
      const w1m = w1day.modules[mi];
      const base = { id: weekPrefix + '-' + w1m.id, name_cn: w1m.name_cn, type: w1m.type, duration: w1m.duration };
      if (w1m.type === 'vocabulary_game') {
        const words = m.words.map(x => buildWord(x, m.words));
        return Object.assign(base, { words });
      }
      if (w1m.type === 'writing_template') {
        return Object.assign(base, m); // full writing content provided
      }
      return Object.assign(base, { questions: m.questions });
    });
    return {
      day_cn: day.day_cn || w1day.day_cn,
      day_en: day.day_en || w1day.day_en,
      is_speaking_day: w1day.is_speaking_day,
      total_duration: w1day.total_duration,
      theme_cn: day.theme_cn,
      modules,
    };
  });
}

// ===========================================================================
// WEEK 2 CONTENT
// ===========================================================================
const W2 = [
  { // 周一
    theme_cn: 'AI口语 + 高频词汇 + 阅读理解',
    modules: [
      { questions: [
        speaking('w2-mon-sp1', 'What do you like to do on weekends?', '你周末喜欢做什么？',
          ['I like riding my bike in the park.', 'Bikes have two wheels.', 'The park is very big.', 'Weekends are short.'],
          '注意 like to do 的用法，like 后面接动词要用 to 加动词原形或者 doing。weekend 重音在第一个音节 /ˈwiːkend/。',
          'Use "like to do" or "like doing" for hobbies. "Weekend" is stressed on the first syllable.'),
        speaking('w2-mon-sp2', 'What is your favorite animal?', '你最喜欢的动物是什么？',
          ['My favorite animal is the panda.', 'Pandas live in the forest.', 'The panda is black and white.', 'I saw a panda on TV.'],
          'favorite /ˈfeɪvərɪt/ 是"最喜欢的"，注意重音在第一音节。回答动物类问题可以直接说 The + 动物名。',
          '"Favorite" is stressed on the first syllable. Answer directly with "My favorite animal is..."'),
        speaking('w2-mon-sp3', 'Can you swim?', '你会游泳吗？',
          ['Yes, I can. I learned to swim last summer.', 'Swimming pools have water.', 'Summer is very hot.', 'My swimsuit is blue.'],
          'can 是情态动词，后面接动词原形。肯定回答 Yes, I can. 注意 swim /swɪm/ 的短元音。',
          'After the modal verb "can", always use the base form of the verb. Answer with "Yes, I can."'),
        speaking('w2-mon-sp4', 'What did you eat for breakfast today?', '你今天早餐吃了什么？',
          ['I ate noodles and drank some milk.', 'Milk comes from cows.', 'Breakfast is important.', 'Noodles are delicious.'],
          'eat 的过去式是 ate，注意不规则动词变化。回答用了过去式说明动作已经发生。',
          'The past tense of "eat" is "ate" — an irregular verb. Use past tense for something that already happened.'),
        speaking('w2-mon-sp5', 'Do you help your parents at home?', '你在家帮爸爸妈妈做家务吗？',
          ['Yes, I often wash the dishes after dinner.', 'Dishes can be made of china.', 'Dinner is at six.', 'My parents are teachers.'],
          'help somebody do something 帮某人做某事。wash the dishes 洗碗，是固定搭配。',
          '"Help somebody do something" is the fixed pattern. "Wash the dishes" means to clean the dishes.'),
      ]},
      { words: [
        { word: 'family', phonetic: '/ˈfæməli/', meaning: '家庭，家人', emoji: '👨‍👩‍👧',
          example_en: 'I love my family.', example_cn: '我爱我的家人。',
          syllables: ['fa', 'mi', 'ly'], blank: 'fa__ly', blankAnswer: 'mi' },
        { word: 'winter', phonetic: '/ˈwɪntə/', meaning: '冬天', emoji: '❄️',
          example_en: 'Winter is very cold here.', example_cn: '这里冬天很冷。',
          syllables: ['win', 'ter'], blank: 'wi__er', blankAnswer: 'nt' },
        { word: 'happy', phonetic: '/ˈhæpi/', meaning: '开心的，快乐的', emoji: '😊',
          example_en: 'The children are happy.', example_cn: '孩子们很开心。',
          syllables: ['hap', 'py'], blank: 'ha__y', blankAnswer: 'pp' },
        { word: 'garden', phonetic: '/ˈɡɑːdn/', meaning: '花园', emoji: '🌻',
          example_en: 'There are many flowers in the garden.', example_cn: '花园里有很多花。',
          syllables: ['gar', 'den'], blank: 'gar__en', blankAnswer: 'd' },
        { word: 'library', phonetic: '/ˈlaɪbrəri/', meaning: '图书馆', emoji: '📖',
          example_en: 'We read books in the library.', example_cn: '我们在图书馆看书。',
          syllables: ['li', 'bra', 'ry'], blank: 'li__rary', blankAnswer: 'b' },
      ]},
      reading('w2-mon-reading',
        'Lily is a nine-year-old girl from Beijing. She loves drawing pictures of animals. Every Sunday morning, she goes to the zoo with her sketchbook and draws the pandas and monkeys. Her art teacher says her pictures are full of life. Lily wants to hold her own art show one day. Her mother always tells her to keep practicing.',
        '莉莉是一个来自北京的九岁女孩。她喜欢画动物。每个星期天早上，她都带着画本去动物园画熊猫和猴子。她的美术老师说她的画充满了生命力。莉莉想有一天举办自己的画展。她的妈妈总是告诉她要坚持练习。',
        [
          choice('w2-mon-rd1', 'How old is Lily?', ['7 years old', '8 years old', '9 years old', '10 years old'], 2,
            '文章第一句说 Lily is a nine-year-old girl，所以莉莉9岁。nine-year-old 作形容词用连字符连接。',
            'The first sentence says "Lily is a nine-year-old girl", so Lily is nine years old.'),
          choice('w2-mon-rd2', 'What does Lily love doing?', ['Swimming', 'Drawing animals', 'Playing football', 'Singing songs'], 1,
            '第二句 She loves drawing pictures of animals，说明她喜欢画动物。love doing 表示喜欢做某事。',
            'The second sentence says she loves drawing pictures of animals. "Love doing" means to enjoy doing something.'),
          choice('w2-mon-rd3', 'When does Lily go to the zoo?', ['Every Saturday', 'Every Sunday morning', 'Every Friday', 'Every evening'], 1,
            'Every Sunday morning, she goes to the zoo，说明是每个星期天早上去动物园。',
            'The passage says she goes to the zoo every Sunday morning.'),
        ]),
    ],
  },
  { // 周二
    theme_cn: '阅读理解 + 语法练习 + 单项选择',
    modules: [
      reading('w2-tue-reading',
        'Last weekend, Jack visited his grandparents in the countryside. They live in a small house near a river. Jack helped his grandfather feed the chickens and pick vegetables in the garden. In the evening, they sat outside and looked at the stars. The sky was very clear. Jack says it was the best weekend of his life.',
        '上周末，杰克去乡下看望了爷爷奶奶。他们住在河边的一座小房子里。杰克帮爷爷喂鸡，还帮着在花园里摘蔬菜。晚上，他们坐在外面看星星。天空非常晴朗。杰克说这是他人生中最好的一个周末。',
        [
          choice('w2-tue-rd1', 'Where do Jack\'s grandparents live?', ['In a big city', 'Near a river', 'On a mountain', 'Next to a school'], 1,
            '第一段说 They live in a small house near a river，爷爷奶奶住在河边。',
            'The passage says the grandparents live in a small house near a river.'),
          choice('w2-tue-rd2', 'What did Jack help his grandfather do?', ['Wash the car', 'Cook dinner', 'Feed the chickens', 'Clean the house'], 2,
            'Jack helped his grandfather feed the chickens，他帮爷爷喂鸡。',
            'Jack helped his grandfather feed the chickens and pick vegetables.'),
          choice('w2-tue-rd3', 'What did they do in the evening?', ['Watched TV', 'Looked at the stars', 'Played cards', 'Went to bed early'], 1,
            'In the evening, they sat outside and looked at the stars，晚上他们坐在外面看星星。',
            'In the evening they sat outside and looked at the stars.'),
        ]),
      mcqModule('w2-tue-grammar', '语法练习', 'grammar', 10, [
        choice('w2-tue-gr1', 'She ___ to school by bus every day.', ['go', 'goes', 'going', 'went'], 1,
          '主语 she 是第三人称单数，一般现在时动词要加 es，go 变 goes。',
          'With a third-person singular subject in the simple present, "go" becomes "goes".'),
        choice('w2-tue-gr2', 'Look! The children ___ football on the playground.', ['play', 'plays', 'are playing', 'played'], 2,
          'Look! 提示动作正在发生，用现在进行时 be + doing，children 是复数用 are playing。',
          '"Look!" signals an action happening now, so use the present continuous: "are playing".'),
        choice('w2-tue-gr3', 'There ___ an apple and two bananas on the table.', ['is', 'are', 'am', 'be'], 0,
          'there be 句型遵循"就近原则"，离 be 最近的 an apple 是单数，所以用 is。',
          'In "there be" sentences, the verb agrees with the nearest noun — "an apple" is singular, so use "is".'),
        choice('w2-tue-gr4', 'My brother is ___ than me.', ['tall', 'taller', 'tallest', 'more tall'], 1,
          'than 是比较级的标志，tall 的比较级是 taller（直接加 er）。',
          '"Than" signals the comparative form. "Tall" becomes "taller" by adding -er.'),
        choice('w2-tue-gr5', 'I ___ my homework yesterday evening.', ['do', 'does', 'did', 'doing'], 2,
          'yesterday evening 是过去时间，用一般过去时，do 的过去式是 did。',
          '"Yesterday evening" is a past time marker, so use the past tense "did".'),
      ]),
      mcqModule('w2-tue-choice', '单项选择', 'multiple_choice', 10, [
        choice('w2-tue-mc1', '— ___ is the weather today? — It\'s sunny.', ['What', 'How', 'Where', 'When'], 1,
          '问天气用 How is the weather? 或者 What is the weather like? 这里选项里只有 How。',
          'Ask about weather with "How is the weather?" or "What is the weather like?"'),
        choice('w2-tue-mc2', 'This is ___ interesting book.', ['a', 'an', 'the', '/'], 1,
          'interesting 以元音音素 /ɪ/ 开头，不定冠词要用 an。',
          'Use "an" before a word beginning with a vowel sound, like "interesting".'),
        choice('w2-tue-mc3', '— Whose bag is this? — It\'s ___.', ['me', 'my', 'mine', 'I'], 2,
          '空后面没有名词，要用名词性物主代词 mine，相当于 my bag。',
          'With no noun after the blank, use the possessive pronoun "mine" (= my bag).'),
        choice('w2-tue-mc4', 'We have no classes ___ Sunday.', ['in', 'on', 'at', 'for'], 1,
          '具体某一天前用介词 on，on Sunday 在星期天。',
          'Use "on" before days of the week: on Sunday.'),
        choice('w2-tue-mc5', 'The sweater looks nice. Can I ___?', ['try on it', 'try it on', 'try on them', 'try them on'], 1,
          '代词作宾语时要放在 try on 中间，it 指代单数的 sweater，所以是 try it on。',
          'With a pronoun object, put it between the verb and particle: "try it on".'),
      ]),
    ],
  },
  { // 周三
    theme_cn: 'AI口语 + 高频词汇 + 阅读理解',
    modules: [
      { questions: [
        speaking('w2-wed-sp1', 'What time do you usually get up?', '你通常几点起床？',
          ['I usually get up at half past six.', 'Six is my lucky number.', 'Getting up is not easy.', 'My clock is new.'],
          'usually 是"通常"，频率副词。get up 起床，固定搭配。时间用 at + 时间点。',
          'Use "at" before clock times. "Get up" means to leave your bed.'),
        speaking('w2-wed-sp2', 'What is the weather like today?', '今天天气怎么样？',
          ['It is sunny and warm today.', 'Sunny days make me happy.', 'Warm weather is nice.', 'Today is Monday.'],
          '问天气用 What is the weather like? 回答用 It is + 天气形容词。',
          'Answer weather questions with "It is" plus a weather adjective like "sunny" or "warm".'),
        speaking('w2-wed-sp3', 'Who is your best friend?', '谁是你最好的朋友？',
          ['My best friend is Wang Ming. We play together every day.', 'Wang Ming has a dog.', 'Every day has 24 hours.', 'We are in the same class.'],
          'best friend 最好的朋友。回答时先说名字，再补充一句你们经常做什么。',
          'Answer with your friend\'s name first, then add a sentence about what you do together.'),
        speaking('w2-wed-sp4', 'What do you want to be in the future?', '你长大想做什么？',
          ['I want to be a doctor and help sick people.', 'Doctors work in hospitals.', 'Sick people need rest.', 'The future is coming.'],
          'want to be 想成为。doctor 医生。help sick people 帮助生病的人。',
          '"Want to be" means your dream job. Give a reason after your answer.'),
        speaking('w2-wed-sp5', 'How do you spend your free time?', '你的空闲时间怎么度过？',
          ['I read storybooks and listen to music.', 'Music has many types.', 'Free time is short.', 'Storybooks are interesting.'],
          'spend time doing something 花时间做某事，注意后面动词用 doing 形式。',
          '"Spend time doing something" — the verb after it takes the -ing form.'),
      ]},
      { words: [
        { word: 'morning', phonetic: '/ˈmɔːnɪŋ/', meaning: '早晨，上午', emoji: '🌅',
          example_en: 'I read English every morning.', example_cn: '我每天早晨读英语。',
          syllables: ['mor', 'ning'], blank: 'mor__ing', blankAnswer: 'n' },
        { word: 'friend', phonetic: '/frend/', meaning: '朋友', emoji: '🤝',
          example_en: 'Tom is my good friend.', example_cn: '汤姆是我的好朋友。',
          syllables: ['friend'], blank: 'f__end', blankAnswer: 'ri' },
        { word: 'water', phonetic: '/ˈwɔːtə/', meaning: '水', emoji: '💧',
          example_en: 'Drink more water every day.', example_cn: '每天要多喝水。',
          syllables: ['wa', 'ter'], blank: 'wa__er', blankAnswer: 't' },
        { word: 'school', phonetic: '/skuːl/', meaning: '学校', emoji: '🏫',
          example_en: 'Our school is big and beautiful.', example_cn: '我们的学校又大又漂亮。',
          syllables: ['school'], blank: 's__ool', blankAnswer: 'ch' },
        { word: 'smile', phonetic: '/smaɪl/', meaning: '微笑', emoji: '😀',
          example_en: 'Her smile is very warm.', example_cn: '她的微笑很温暖。',
          syllables: ['smile'], blank: 'sm__e', blankAnswer: 'il' },
      ]},
      reading('w2-wed-reading',
        'Amy\'s family moved to a new city last month. At first, Amy felt lonely because she did not know anyone. Then her new classmate Meimei invited her to join the school choir. Now they sing together every Tuesday and Thursday. Amy has made many new friends. She says moving to a new city was not so bad after all.',
        '艾米的家上个月搬到了一座新城市。一开始，艾米觉得很孤单，因为她谁也不认识。后来她的新同桌梅梅邀请她加入学校合唱团。现在她们每周二和每周四一起唱歌。艾米交了很多新朋友。她说搬到新城市其实也没那么糟糕。',
        [
          choice('w2-wed-rd1', 'Why did Amy feel lonely at first?', ['She was sick', 'She did not know anyone', 'She missed the choir', 'She lost her book'], 1,
            'because she did not know anyone，因为她谁也不认识所以觉得孤单。',
            'Amy felt lonely because she did not know anyone in the new city.'),
          choice('w2-wed-rd2', 'Who invited Amy to join the choir?', ['Her teacher', 'Her mother', 'Meimei', 'Her sister'], 2,
            'Her new classmate Meimei invited her to join the school choir，是新同桌梅梅邀请的她。',
            'Meimei, Amy\'s new classmate, invited her to join the school choir.'),
          choice('w2-wed-rd3', 'How often do they sing together?', ['Every day', 'Twice a week', 'Once a month', 'Three times a day'], 1,
            'every Tuesday and Thursday，每周两次，所以是 twice a week。',
            'They sing every Tuesday and Thursday — twice a week.'),
        ]),
    ],
  },
  { // 周四
    theme_cn: '听力练习 + 完形填空 + 时态练习',
    modules: [
      mcqModule('w2-thu-listening', '听力练习', 'listening', 10, [
        choice('w2-thu-ls1', '听到的句子是什么？', null, 0, '', ''),
        choice('w2-thu-ls2', '听到的句子是什么？', null, 0, '', ''),
      ]),
      { passage: '', questions: [] }, // placeholder replaced below
      mcqModule('w2-thu-tense', '时态练习', 'tense', 10, [
        fill('w2-thu-tn1', 'Look! It ___ (rain) outside. [填入正确形式]', 'is raining',
          'Look! 提示动作正在进行，用现在进行时 it is raining。',
          '"Look!" signals the present continuous: "it is raining".'),
        fill('w2-thu-tn2', 'We ___ (go) to Beijing next week. [填入正确形式]', 'will go',
          'next week 是将来的时间，可以用一般将来时 will go 或者 are going。',
          '"Next week" is a future time marker, so use the future tense "will go".'),
        fill('w2-thu-tn3', 'He ___ (finish) his homework an hour ago. [填入正确形式]', 'finished',
          'an hour ago 是过去时间，用一般过去时 finished。',
          '"An hour ago" is a past time marker, so use the past tense "finished".'),
        fill('w2-thu-tn4', 'My mother ___ (cook) dinner every evening. [填入正确形式]', 'cooks',
          'every evening 表示习惯性动作，主语 my mother 是第三人称单数，用 cooks。',
          'With "every evening" use the simple present; third-person singular adds -s: "cooks".'),
        fill('w2-thu-tn5', 'They ___ (know) each other for ten years. [填入正确形式]', 'have known',
          'for ten years 表示持续到现在，用现在完成时 have known，know 的过去分词是 known。',
          '"For ten years" up to now needs the present perfect: "have known".'),
      ]),
    ],
  },
  { // 周五
    theme_cn: '模板写作 + KET/PET题型 + 语法复习',
    modules: [
      { id: 'w2-fri-writing', name_cn: '写作练习', type: 'writing_template', duration: 15,
        title: 'My Weekend',
        requirement_cn: '请根据关键词提示完成作文，完成后请背诵全文。下周将进行挖空默写测试！',
        keywords: ['last weekend', 'went to the park', 'flew a kite', 'had a picnic', 'very happy'],
        template: '{{1}} I went to the park with my family. We {{2}} on the grass. My brother and I {{3}} near the lake. At noon, we {{4}} under a big tree. We were {{5}}.',
        blanks: [
          { id: 1, hint_cn: '上周末', hint_en: 'last weekend', answer: 'last weekend' },
          { id: 2, hint_cn: '去了公园（在草地上）', hint_en: 'went to the park', answer: 'went to the park' },
          { id: 3, hint_cn: '放风筝', hint_en: 'flew a kite', answer: 'flew a kite' },
          { id: 4, hint_cn: '野餐', hint_en: 'had a picnic', answer: 'had a picnic' },
          { id: 5, hint_cn: '非常开心', hint_en: 'very happy', answer: 'very happy' },
        ],
        full_text: 'Last weekend I went to the park with my family. We went to the park on the grass. My brother and I flew a kite near the lake. At noon, we had a picnic under a big tree. We were very happy.',
        explanation_cn: '这篇作文写上周末的活动，全文用一般过去时。注意：1) go 的过去式是 went；2) fly 的过去式是 flew；3) have 的过去式是 had；4) 记住时间状语 last weekend 放在句首。',
        explanation_en: 'This essay uses the simple past tense throughout: went, flew, had. Put the time marker "last weekend" at the beginning.' },
      mcqModule('w2-fri-ket', 'KET/PET题型', 'ket_pet', 10, [
        choice('w2-fri-kp1', 'KET: Choose the correct answer. — I ___ my keys. I can\'t open the door.', ['lose', 'lost', 'have lost', 'will lose'], 2,
          '钥匙丢了直接影响现在（开不了门），用现在完成时 have lost。',
          'The past action affects the present, so use the present perfect: "have lost".'),
        choice('w2-fri-kp2', 'KET: — Would you like some tea? — ___.', ['Yes, I would. Thank you.', 'Yes, I like.', 'No, I am not.', 'Yes, I do.'], 0,
          'Would you like...? 的肯定回答是 Yes, I would. / Yes, please. 注意 would like 表示"想要"。',
          'Answer "Would you like...?" with "Yes, I would" or "Yes, please".'),
        choice('w2-fri-kp3', 'KET: The film was ___ boring that I fell asleep.', ['such', 'so', 'very', 'too'], 1,
          'so + 形容词 + that 固定句型，"如此……以至于"。boring 是形容词，前面用 so。',
          'Use "so + adjective + that" to show a result: "so boring that I fell asleep".'),
        choice('w2-fri-kp4', 'KET: You ___ be quiet in the library. It\'s the rule.', ['can', 'may', 'must', 'might'], 2,
          '图书馆必须安静是规定，用 must 表示"必须"。',
          '"Must" expresses obligation — it is the rule to be quiet in the library.'),
        choice('w2-fri-kp5', 'KET: She is good ___ playing the piano.', ['at', 'in', 'on', 'for'], 0,
          'be good at 是固定搭配，"擅长……"，后面接名词或者 doing。',
          '"Be good at" means to be skilled at something; it is followed by a noun or -ing form.'),
      ]),
      mcqModule('w2-fri-grammar', '语法复习', 'grammar', 8, [
        choice('w2-fri-gr1', '___ sunny day! Let\'s go out to play.', ['What', 'What a', 'How', 'How a'], 1,
          '感叹句结构 What a + 形容词 + 单数名词！day 是可数名词单数，所以用 What a。',
          'Exclamations with a singular countable noun use "What a + adjective + noun!".'),
        choice('w2-fri-gr2', 'Tom, ___ your hands before dinner, please.', ['washes', 'wash', 'washing', 'to wash'], 1,
          '这是祈使句，动词用原形 wash，please 放句尾。',
          'Imperative sentences use the base form of the verb: "wash your hands".'),
        choice('w2-fri-gr3', 'The moon ___ around the earth.', ['go', 'goes', 'went', 'is going'], 1,
          '表示客观事实用一般现在时，the moon 是第三人称单数，用 goes。',
          'Facts take the simple present; "the moon" is third-person singular: "goes".'),
      ]),
    ],
  },
  { // 周六
    theme_cn: 'AI口语 + 高频词汇 + 阅读理解',
    modules: [
      { questions: [
        speaking('w2-sat-sp1', 'What is your favorite season?', '你最喜欢的季节是什么？',
          ['My favorite season is autumn because it is cool.', 'Autumn leaves are yellow.', 'Cool weather is nice.', 'Seasons change every year.'],
          'season 季节。autumn 英式拼写，美式是 fall。because 后面说原因。',
          'Name the season first, then give a reason with "because".'),
        speaking('w2-sat-sp2', 'What did you do last night?', '你昨晚做了什么？',
          ['I did my homework and read a story.', 'Stories are fun.', 'Homework takes time.', 'Last night was quiet.'],
          'last night 是过去时间，回答要用一般过去时：did, read（read 过去式拼写不变）。',
          'Use the past tense for last night: "did", "read" (spelling stays the same).'),
        speaking('w2-sat-sp3', 'Do you like animals? Why?', '你喜欢动物吗？为什么？',
          ['Yes, I do. They are our friends.', 'Animals live everywhere.', 'Friends are important.', 'Zoos have many animals.'],
          '回答一般疑问句先用 Yes/No，再用 because 或 they 指代补充原因。',
          'Answer yes/no questions first, then add a reason with "because".'),
        speaking('w2-sat-sp4', 'What is your favorite food?', '你最喜欢的食物是什么？',
          ['My favorite food is dumplings.', 'Dumplings are traditional.', 'Traditional food is tasty.', 'My mother cooks well.'],
          'food 是不可数名词。dumpling 饺子，常用复数 dumplings。',
          '"Food" is uncountable. "Dumplings" is usually plural in English.'),
        speaking('w2-sat-sp5', 'Can you describe your English teacher?', '你能描述一下你的英语老师吗？',
          ['My English teacher is Miss Li. She is kind and patient.', 'English is useful.', 'Kind people smile a lot.', 'Teachers work hard.'],
          '描述人用 be + 形容词：kind（和善的）、patient（有耐心的）。',
          'Describe people with "be" plus adjectives like "kind" and "patient".'),
      ]},
      { words: [
        { word: 'orange', phonetic: '/ˈɒrɪndʒ/', meaning: '橙子，橘子', emoji: '🍊',
          example_en: 'The orange is sweet.', example_cn: '这个橙子很甜。',
          syllables: ['or', 'ange'], blank: 'or__ge', blankAnswer: 'an' },
        { word: 'river', phonetic: '/ˈrɪvə/', meaning: '河流', emoji: '🏞',
          example_en: 'The river runs through the city.', example_cn: '这条河流穿过城市。',
          syllables: ['ri', 'ver'], blank: 'ri__er', blankAnswer: 'v' },
        { word: 'cloud', phonetic: '/klaʊd/', meaning: '云', emoji: '☁️',
          example_en: 'There are many clouds in the sky.', example_cn: '天上有许多云。',
          syllables: ['cloud'], blank: 'cl__d', blankAnswer: 'ou' },
        { word: 'dance', phonetic: '/dɑːns/', meaning: '跳舞', emoji: '💃',
          example_en: 'She loves to dance.', example_cn: '她喜欢跳舞。',
          syllables: ['dance'], blank: 'da__e', blankAnswer: 'nc' },
        { word: 'tiger', phonetic: '/ˈtaɪɡə/', meaning: '老虎', emoji: '🐅',
          example_en: 'The tiger is very strong.', example_cn: '老虎非常强壮。',
          syllables: ['ti', 'ger'], blank: 'ti__er', blankAnswer: 'g' },
      ]},
      reading('w2-sat-reading',
        'Uncle Zhang is a bus driver. He has driven the same route for fifteen years. Every morning he gets to the bus station at five o\'clock and checks the bus carefully. He always waits for old people to sit down before he starts the bus. The children on his bus call him "Uncle Smiley" because he never gets angry.',
        '张叔叔是一名公交车司机。他开同一条线路已经十五年了。每天早上他五点钟就到车站，仔细检查公交车。他总是等老人坐下了才开车。坐他车上的孩子们叫他"微笑叔叔"，因为他从来不生气。',
        [
          choice('w2-sat-rd1', 'What is Uncle Zhang\'s job?', ['A teacher', 'A doctor', 'A bus driver', 'A farmer'], 2,
            '第一句 Uncle Zhang is a bus driver，张叔叔是公交车司机。',
            'The first sentence says Uncle Zhang is a bus driver.'),
          choice('w2-sat-rd2', 'How long has he driven the same route?', ['Five years', 'Ten years', 'Fifteen years', 'Fifty years'], 2,
            'for fifteen years，十五年。for + 时间段表示持续时间。',
            'The passage says fifteen years. "For" plus a time period shows duration.'),
          choice('w2-sat-rd3', 'Why do children call him "Uncle Smiley"?', ['He is young', 'He never gets angry', 'He tells jokes', 'He gives candy'], 1,
            'because he never gets angry，因为他从来不生气。',
            'Children call him "Uncle Smiley" because he never gets angry.'),
        ]),
    ],
  },
  { // 周日
    theme_cn: '阅读理解 + 高频词汇 + 完形填空',
    modules: [
      reading('w2-sun-reading',
        'Long ago, a slow tortoise and a fast rabbit argued about who could run faster. They decided to have a race. The rabbit ran far ahead, then stopped to sleep under a tree. The tortoise kept walking, step by step, and never stopped. When the rabbit woke up, the tortoise was already at the finish line. Slow but steady wins the race.',
        '很久以前，一只慢吞吞的乌龟和一只跑得快的兔子争论谁跑得更快。他们决定赛跑。兔子遥遥领先，然后停下来在树下睡觉。乌龟一步一步不停地走。当兔子醒来时，乌龟已经到达了终点。稳扎稳打才能赢得比赛。',
        [
          choice('w2-sun-rd1', 'Who argued about running faster?', ['A tortoise and a bird', 'A rabbit and a tortoise', 'A rabbit and a dog', 'A cat and a tortoise'], 1,
            'a slow tortoise and a fast rabbit argued，是乌龟和兔子在争论。',
            'The tortoise and the rabbit argued about who could run faster.'),
          choice('w2-sun-rd2', 'What did the rabbit do during the race?', ['He kept walking', 'He slept under a tree', 'He gave up', 'He helped the tortoise'], 1,
            'The rabbit ran far ahead, then stopped to sleep under a tree，兔子跑到前面就去睡觉了。',
            'The rabbit ran ahead and stopped to sleep under a tree.'),
          choice('w2-sun-rd3', 'What does the story teach us?', ['Run fast', 'Slow but steady wins', 'Never race', 'Sleep is important'], 1,
            'Slow but steady wins the race，故事告诉我们稳扎稳打才能成功。',
            'The moral is "Slow but steady wins the race".'),
        ]),
      { words: [
        { word: 'forest', phonetic: '/ˈfɒrɪst/', meaning: '森林', emoji: '🌲',
          example_en: 'Many animals live in the forest.', example_cn: '许多动物生活在森林里。',
          syllables: ['fo', 'rest'], blank: 'fo__est', blankAnswer: 'r' },
        { word: 'bridge', phonetic: '/brɪdʒ/', meaning: '桥', emoji: '🌉',
          example_en: 'We walked across the bridge.', example_cn: '我们走过那座桥。',
          syllables: ['bridge'], blank: 'b__dge', blankAnswer: 'ri' },
        { word: 'market', phonetic: '/ˈmɑːkɪt/', meaning: '市场', emoji: '🛒',
          example_en: 'Mother buys vegetables at the market.', example_cn: '妈妈在市场买菜。',
          syllables: ['mar', 'ket'], blank: 'mar__et', blankAnswer: 'k' },
        { word: 'candle', phonetic: '/ˈkændl/', meaning: '蜡烛', emoji: '🕯️',
          example_en: 'She lit a candle on the cake.', example_cn: '她在蛋糕上点了一支蜡烛。',
          syllables: ['can', 'dle'], blank: 'can__le', blankAnswer: 'd' },
        { word: 'travel', phonetic: '/ˈtrævl/', meaning: '旅行', emoji: '🧳',
          example_en: 'They travel by train every summer.', example_cn: '他们每年夏天坐火车旅行。',
          syllables: ['tra', 'vel'], blank: 'tra__el', blankAnswer: 'v' },
      ]},
      { passage: '', questions: [] }, // placeholder replaced below
    ],
  },
];

// Week 2 cloze passages + the two placeholder modules
W2[3].modules[0] = mcqModule('w2-thu-listening', '听力练习', 'listening', 10, [
  choice('w2-thu-ls1', '听到的句子是什么？',
    ['I usually have breakfast at seven o\'clock.', 'I usually have breakfast at eight o\'clock.', 'I usually have lunch at seven o\'clock.', 'I usually have dinner at eight o\'clock.'], 0,
    '听力关键词：breakfast（早餐）和 seven o\'clock（七点）。注意区分三餐词的发音。',
    'Key words: "breakfast" and "seven o\'clock". Listen for the meal and the time.'),
  choice('w2-thu-ls2', '听到的句子是什么？',
    ['My sister likes drawing pictures.', 'My sister likes dancing.', 'My brother likes drawing pictures.', 'My sister likes reading books.'], 0,
    '听力关键词：sister 和 drawing pictures。注意区分 brother/sister。',
    'Key words: "sister" and "drawing pictures". Listen for the person and the hobby.'),
  choice('w2-thu-ls3', '听到的句子是什么？',
    ['The library opens at nine in the morning.', 'The library opens at nine in the evening.', 'The library closes at nine in the morning.', 'The shop opens at nine in the morning.'], 0,
    '听力关键词：library 和 opens at nine in the morning。注意 opens 和 closes 的发音区别。',
    'Key words: "library" and "opens at nine in the morning".'),
  choice('w2-thu-ls4', '听到的句子是什么？',
    ['We are going to visit the museum tomorrow.', 'We visited the museum yesterday.', 'We are going to visit the park tomorrow.', 'We are going to the museum tonight.'], 0,
    '听力关键词：going to（将要）和 museum tomorrow。注意时态信号词。',
    'Key words: "going to" and "tomorrow" — a future plan to visit the museum.'),
  choice('w2-thu-ls5', '听到的句子是什么？',
    ['It took me half an hour to finish the work.', 'It took me two hours to finish the work.', 'It took me half an hour to find the work.', 'It took me an hour to finish the book.'], 0,
    '听力关键词：half an hour（半小时）和 finish the work。注意时间长短的区分。',
    'Key words: "half an hour" and "finish the work".'),
]);
W2[3].modules[1] = { id: 'w2-thu-cloze', name_cn: '完形填空', type: 'cloze', duration: 12,
  passage: 'Mike loves 1___ very much. Every Saturday, he plays basketball with his friends for two 2___. His mother says sport is good for his 3___. Last month, Mike joined the school basketball team. The team will have a big game next 4___, and Mike practices every day. He hopes his team can 5___ the game.',
  questions: [
    choice('w2-thu-cz1', '1___', ['sports', 'music', 'art', 'games'], 0,
      '后文说打篮球、参加篮球队，说明 Mike 热爱运动（sports）。',
      'Mike plays basketball and joined the team, so he loves sports.'),
    choice('w2-thu-cz2', '2___', ['minutes', 'hours', 'days', 'weeks'], 1,
      '打一次篮球通常两小时合理，two hours。',
      'Two hours is a sensible length for a Saturday basketball game.'),
    choice('w2-thu-cz3', '3___', ['study', 'health', 'homework', 'memory'], 1,
      '运动有益健康，sport is good for his health。',
      'Sport is good for his health.'),
    choice('w2-thu-cz4', '4___', ['year', 'month', 'week', 'minute'], 1,
      '上文说上个月加入球队，下个月有比赛，next month。',
      'He joined last month, so the big game is next month.'),
    choice('w2-thu-cz5', '5___', ['lose', 'watch', 'win', 'join'], 2,
      '他每天练习，希望球队能赢（win）比赛。',
      'He practices every day, hoping to win the game.'),
  ]};
W2[6].modules[2] = { id: 'w2-sun-cloze', name_cn: '完形填空', type: 'cloze', duration: 12,
  passage: 'Last Sunday, Ann made a big cake with her grandmother. First, they put flour, eggs and 1___ into a bowl. Then Ann 2___ the mixture well. Grandmother turned on the 3___, and the cake baked for forty minutes. The kitchen smelled wonderful. Ann shared the cake with her 4___, and everyone said it was 5___.',
  questions: [
    choice('w2-sun-cz1', '1___', ['sugar', 'paper', 'stones', 'leaves'], 0,
      '做蛋糕的原料是面粉、鸡蛋和糖（sugar）。',
      'Cakes are made with flour, eggs and sugar.'),
    choice('w2-sun-cz2', '2___', ['mixed', 'played', 'slept', 'drove'], 0,
      '把原料搅拌均匀，用 mixed（搅拌）。',
      'You mix the ingredients together.'),
    choice('w2-sun-cz3', '3___', ['oven', 'radio', 'light', 'fan'], 0,
      '烤蛋糕要用烤箱（oven）。',
      'Cakes bake in an oven.'),
    choice('w2-sun-cz4', '4___', ['family', 'teachers', 'customers', 'passengers'], 0,
      '在家和家人分享蛋糕，shared the cake with her family。',
      'She shared the cake with her family at home.'),
    choice('w2-sun-cz5', '5___', ['delicious', 'terrible', 'heavy', 'expensive'], 0,
      '厨房闻起来很香，大家都说蛋糕好吃（delicious）。',
      'The kitchen smelled wonderful, so the cake was delicious.'),
  ]};

// ===========================================================================
// WEEK 3 CONTENT
// ===========================================================================
const W3 = [
  { // 周一
    theme_cn: 'AI口语 + 高频词汇 + 阅读理解',
    modules: [
      { questions: [
        speaking('w3-mon-sp1', 'How many people are there in your family?', '你家有几口人？',
          ['There are four people in my family.', 'Families are different.', 'Four is a small number.', 'My family is at home.'],
          'There be 句型表示"有"。注意 people 是集合名词，动词用 are。',
          'Use "there are" with "people" — it is a plural noun.'),
        speaking('w3-mon-sp2', 'What do you do after school?', '你放学后做什么？',
          ['I do my homework first, then play with my friends.', 'Friends play together.', 'Homework comes first.', 'School finishes at four.'],
          'first...then... 表示"先……然后……"，是连句子的好结构。',
          '"First... then..." is a good way to connect two actions in order.'),
        speaking('w3-mon-sp3', 'Which subject do you like best?', '你最喜欢哪个学科？',
          ['I like science best because the experiments are fun.', 'Science is interesting.', 'Experiments need care.', 'We have science on Monday.'],
          'like...best 最喜欢。experiment 实验，/ɪkˈsperɪmənt/。',
          'Use "like ... best" for favorites and "because" to give the reason.'),
        speaking('w3-mon-sp4', 'What do you usually do on Children\'s Day?', '儿童节你通常做什么？',
          ['My parents take me to the amusement park.', 'The park is crowded.', 'Children\'s Day is in June.', 'Amusement parks are fun.'],
          'take somebody to someplace 带某人去某地。amusement park 游乐园。',
          '"Take somebody to a place" means to bring someone there.'),
        speaking('w3-mon-sp5', 'How do you go to school?', '你怎么去上学？',
          ['I go to school by bus with my best friend.', 'Buses are cheap.', 'My school is near.', 'Friends go together.'],
          'by bus / by bike / on foot 交通方式用 by + 交通工具，步行用 on foot。',
          'Use "by" plus a vehicle for transport ("by bus"); walking is "on foot".'),
      ]},
      { words: [
        { word: 'birthday', phonetic: '/ˈbɜːθdeɪ/', meaning: '生日', emoji: '🎂',
          example_en: 'Happy birthday to you!', example_cn: '祝你生日快乐！',
          syllables: ['birth', 'day'], blank: 'birth__ay', blankAnswer: 'd' },
        { word: 'animal', phonetic: '/ˈænɪml/', meaning: '动物', emoji: '🐾',
          example_en: 'The panda is my favorite animal.', example_cn: '熊猫是我最喜欢的动物。',
          syllables: ['a', 'ni', 'mal'], blank: 'ani__al', blankAnswer: 'm' },
        { word: 'autumn', phonetic: '/ˈɔːtəm/', meaning: '秋天', emoji: '🍂',
          example_en: 'Autumn is the best season for hiking.', example_cn: '秋天是远足最好的季节。',
          syllables: ['au', 'tumn'], blank: 'au__mn', blankAnswer: 'tu' },
        { word: 'kitchen', phonetic: '/ˈkɪtʃɪn/', meaning: '厨房', emoji: '🍳',
          example_en: 'Mother is cooking in the kitchen.', example_cn: '妈妈在厨房做饭。',
          syllables: ['kit', 'chen'], blank: 'kit__en', blankAnswer: 'ch' },
        { word: 'planet', phonetic: '/ˈplænɪt/', meaning: '行星', emoji: '🪐',
          example_en: 'The earth is a planet.', example_cn: '地球是一颗行星。',
          syllables: ['pla', 'net'], blank: 'pla__et', blankAnswer: 'n' },
      ]},
      reading('w3-mon-reading',
        'There is a small bookshop near Amy\'s school. The owner is an old man called Mr. Chen. He knows every book in his shop. Every Friday afternoon, Amy goes there and reads storybooks for an hour. Mr. Chen never asks her to buy anything. He only smiles and says, "Books are friends." This is why Amy loves the little bookshop.',
        '艾米学校附近有一家小书店。店主是一位叫陈先生的老爷爷。他熟悉店里的每一本书。每个星期五下午，艾米都去那里读一个小时的故事书。陈先生从来不要求她买任何东西。他只是微笑着说："书是朋友。"这就是艾米喜欢这家小书店的原因。',
        [
          choice('w3-mon-rd1', 'Where is the small bookshop?', ['Near Amy\'s home', 'Near Amy\'s school', 'In a mall', 'Near the park'], 1,
            '第一句 There is a small bookshop near Amy\'s school，书店在艾米学校附近。',
            'The bookshop is near Amy\'s school.'),
          choice('w3-mon-rd2', 'What does Mr. Chen say to Amy?', ['"Buy more books"', '"Books are friends"', '"Go home early"', '"Read quickly"'], 1,
            'He only smiles and says, "Books are friends."',
            'Mr. Chen only smiles and says "Books are friends."'),
          choice('w3-mon-rd3', 'How long does Amy read there every Friday?', ['Half an hour', 'One hour', 'Two hours', 'One morning'], 1,
            'reads storybooks for an hour，读一个小时。',
            'Amy reads storybooks there for an hour every Friday.'),
        ]),
    ],
  },
  { // 周二
    theme_cn: '阅读理解 + 语法练习 + 单项选择',
    modules: [
      reading('w3-tue-reading',
        'Penguins are birds, but they cannot fly. They are excellent swimmers. They spend most of their lives in the water, looking for fish. Their black and white bodies help them hide from dangerous animals in the sea. In winter, penguins stand together to keep warm. Some penguins walk a long way to find a safe place for their babies.',
        '企鹅是鸟类，但是它们不会飞。它们是出色的游泳选手。它们一生中大部分时间都在水里找鱼吃。它们黑白相间的身体帮助它们躲避海里的危险动物。冬天，企鹅们挤在一起取暖。有些企鹅要走很远的路为宝宝找一个安全的地方。',
        [
          choice('w3-tue-rd1', 'What can penguins do very well?', ['Fly', 'Swim', 'Run', 'Sing'], 1,
            'They are excellent swimmers，企鹅是出色的游泳选手。',
            'Penguins are excellent swimmers, though they cannot fly.'),
          choice('w3-tue-rd2', 'What do penguins eat?', ['Plants', 'Fish', 'Bread', 'Insects'], 1,
            'looking for fish，企鹅在水里找鱼吃。',
            'Penguins spend most of their lives in the water looking for fish.'),
          choice('w3-tue-rd3', 'How do penguins keep warm in winter?', ['They fly south', 'They stand together', 'They swim all day', 'They sleep in snow'], 1,
            'In winter, penguins stand together to keep warm，冬天企鹅挤在一起取暖。',
            'In winter, penguins stand together to keep warm.'),
        ]),
      mcqModule('w3-tue-grammar', '语法练习', 'grammar', 10, [
        choice('w3-tue-gr1', '___ he like playing basketball?', ['Is', 'Does', 'Do', 'Are'], 1,
          '主语 he 是第三人称单数，like 是实义动词，疑问句要借助于 does，后面动词用原形。',
          'With a third-person singular subject, questions use "does" plus the base verb.'),
        choice('w3-tue-gr2', 'I have two ___ in my pencil case.', ['pen', 'pens', 'penes', 'a pen'], 1,
          'two 后面接可数名词复数，pen 的复数是 pens。',
          'After "two" use the plural form: "pens".'),
        choice('w3-tue-gr3', 'The box is too heavy for me to ___.', ['carry it', 'carry', 'carrying it', 'carries'], 1,
          'too...to 结构中，me 已经是 carry 的逻辑宾语，不能再加 it。',
          'In "too...to" structures, "for me" is already the object — do not add "it".'),
        choice('w3-tue-gr4', 'Jane is one of the best ___ in our class.', ['student', 'students', "student's", 'students\''], 1,
          'one of + 最高级 + 复数名词，是固定结构，"最好的……之一"。',
          '"One of the + superlative + plural noun" is a fixed pattern.'),
        choice('w3-tue-gr5', 'Neither answer ___ right.', ['is', 'are', 'am', 'be'], 0,
          'neither 表示"两者都不"，作主语时谓语用单数，所以用 is。',
          '"Neither" takes a singular verb.'),
      ]),
      mcqModule('w3-tue-choice', '单项选择', 'multiple_choice', 10, [
        choice('w3-tue-mc1', '— ___ do you go to the library? — Twice a week.', ['How long', 'How often', 'How many', 'How much'], 1,
          '回答 Twice a week 是频率，用 How often 提问。',
          '"Twice a week" is a frequency, so ask with "How often".'),
        choice('w3-tue-mc2', 'There is ___ milk in the glass.', ['many', 'a few', 'a little', 'few'], 2,
          'milk 是不可数名词，要用 a little 修饰；many/few 修饰可数名词。',
          'Use "a little" with uncountable nouns like "milk".'),
        choice('w3-tue-mc3', 'The story happened ___ a rainy night.', ['in', 'on', 'at', 'of'], 1,
          '具体的某个晚上（有修饰词 a rainy night）用介词 on。',
          'Use "on" for a specific night: "on a rainy night".'),
        choice('w3-tue-mc4', '— Must I finish the work now? — No, you ___.', ['mustn\'t', 'needn\'t', 'can\'t', 'shouldn\'t'], 1,
          'Must 开头的一般疑问句，否定回答用 needn\'t（不必），mustn\'t 表示"禁止"。',
          'The negative answer to "Must I...?" is "No, you needn\'t."'),
        choice('w3-tue-mc5', 'Lucy runs as ___ as her sister.', ['fast', 'faster', 'fastest', 'more fast'], 0,
          'as...as 中间用原级，表示"和……一样"。',
          'Use the base form between "as ... as": "as fast as".'),
      ]),
    ],
  },
  { // 周三
    theme_cn: 'AI口语 + 高频词汇 + 阅读理解',
    modules: [
      { questions: [
        speaking('w3-wed-sp1', 'What is your hobby?', '你的爱好是什么？',
          ['My hobby is collecting stamps.', 'Stamps are small.', 'Collections take time.', 'Hobbies make life fun.'],
          'hobby 的复数是 hobbies。collecting stamps 集邮，动名词作表语。',
          'Answer with "My hobby is + -ing form", like "collecting stamps".'),
        speaking('w3-wed-sp2', 'What did you do on your last birthday?', '你上个生日做了什么？',
          ['I had a birthday cake with my family.', 'Birthdays come yearly.', 'Cakes taste sweet.', 'My family loves me.'],
          '问的是过去的事，用一般过去时回答：had。',
          'Use the past tense for a past birthday: "had a birthday cake".'),
        speaking('w3-wed-sp3', 'Do you prefer summer or winter?', '你更喜欢夏天还是冬天？',
          ['I prefer winter because I love making snowmen.', 'Snowmen melt quickly.', 'Winter is cold.', 'Summer has holidays.'],
          'prefer A to B 表示"比起B更喜欢A"。make snowmen 堆雪人。',
          '"Prefer" means to like one more than the other. Give your reason with "because".'),
        speaking('w3-wed-sp4', 'What makes a good friend?', '什么样的朋友才是好朋友？',
          ['A good friend always helps you and tells the truth.', 'Truth is important.', 'Good friends are rare.', 'Helping is kind.'],
          'tell the truth 说实话，固定搭配。always 是频率副词，放在实义动词前。',
          'A good friend helps you and "tells the truth" — always place "always" before the verb.'),
        speaking('w3-wed-sp5', 'Where would you like to travel?', '你想去哪里旅行？',
          ['I would like to travel to Yunnan to see the snow mountain.', 'Mountains are high.', 'Yunnan is far away.', 'Travel needs money.'],
          'would like to do 想做某事。travel to + 地点。',
          '"Would like to do" expresses a wish; "travel to" plus a place names the destination.'),
      ]},
      { words: [
        { word: 'weather', phonetic: '/ˈweðə/', meaning: '天气', emoji: '🌤️',
          example_en: 'The weather is nice today.', example_cn: '今天天气很好。',
          syllables: ['wea', 'ther'], blank: 'wea__er', blankAnswer: 'th' },
        { word: 'pencil', phonetic: '/ˈpensl/', meaning: '铅笔', emoji: '✏️',
          example_en: 'May I borrow your pencil?', example_cn: '我可以借用你的铅笔吗？',
          syllables: ['pen', 'cil'], blank: 'pen__il', blankAnswer: 'c' },
        { word: 'bridge', phonetic: '/brɪdʒ/', meaning: '桥', emoji: '🌉',
          example_en: 'There is a stone bridge over the river.', example_cn: '河上有一座石桥。',
          syllables: ['bridge'], blank: 'bri__e', blankAnswer: 'dg' },
        { word: 'market', phonetic: '/ˈmɑːkɪt/', meaning: '市场', emoji: '🏪',
          example_en: 'The market is busy in the morning.', example_cn: '早上的市场很热闹。',
          syllables: ['mar', 'ket'], blank: 'ma__et', blankAnswer: 'rk' },
        { word: 'gentle', phonetic: '/ˈdʒentl/', meaning: '温柔的，轻轻的', emoji: '🕊️',
          example_en: 'She spoke in a gentle voice.', example_cn: '她用温柔的声音说话。',
          syllables: ['gen', 'tle'], blank: 'gen__e', blankAnswer: 'tl' },
      ]},
      reading('w3-wed-reading',
        'Mr. Wang grows vegetables in a small greenhouse behind his house. In winter, the greenhouse keeps the plants warm, so fresh vegetables can grow even in the cold. Every morning, he opens the little windows to let fresh air in. His tomatoes are famous in the village because they are big and sweet. Neighbors often come to learn from him, and he is always happy to teach them.',
        '王先生在他家屋后的小温室里种蔬菜。冬天，温室能让植物保暖，所以即使天冷也能种出新鲜蔬菜。每天早上，他打开小窗户让新鲜空气进来。他的西红柿在村里很有名，因为又大又甜。邻居们常来向他请教，他也总是很乐意教他们。',
        [
          choice('w3-wed-rd1', 'What does Mr. Wang grow?', ['Flowers', 'Vegetables', 'Fruit trees', 'Rice'], 1,
            '第一句说他在温室里种蔬菜 grows vegetables。',
            'Mr. Wang grows vegetables in a greenhouse.'),
          choice('w3-wed-rd2', 'Why can vegetables grow in winter?', ['The weather is warm', 'The greenhouse keeps them warm', 'He waters them a lot', 'They are special plants'], 1,
            'the greenhouse keeps the plants warm，温室给蔬菜保暖。',
            'The greenhouse keeps the plants warm, so vegetables grow even in the cold.'),
          choice('w3-wed-rd3', 'Why are his tomatoes famous?', ['They are red', 'They are big and sweet', 'They are cheap', 'They are very small'], 1,
            'because they are big and sweet，因为又大又甜。',
            'His tomatoes are famous because they are big and sweet.'),
        ]),
    ],
  },
  { // 周四
    theme_cn: '听力练习 + 完形填空 + 时态练习',
    modules: [
      mcqModule('w3-thu-listening', '听力练习', 'listening', 10, [
        choice('w3-thu-ls1', '听到的句子是什么？',
          ['There are many books on the desk.', 'There are many books in the desk.', 'There are many toys on the desk.', 'There is a book on the desk.'], 0,
          '听力关键词：books 和 on the desk。注意 on 和 in 的区别，many books 是复数。',
          'Key words: "many books" and "on the desk".'),
        choice('w3-thu-ls2', '听到的句子是什么？',
          ['She gets up early and runs in the park.', 'She gets up late and walks in the park.', 'She gets up early and walks in the park.', 'He gets up early and runs in the park.'], 0,
          '听力关键词：early 和 runs。注意 runs 和 walks 的发音区别。',
          'Key words: "early" and "runs in the park".'),
        choice('w3-thu-ls3', '听到的句子是什么？',
          ['The train leaves at half past two.', 'The train leaves at two o\'clock.', 'The bus leaves at half past two.', 'The train arrives at half past two.'], 0,
          '听力关键词：train 和 half past two。注意 leaves（离开）和 arrives（到达）。',
          'Key words: "train" and "leaves at half past two".'),
        choice('w3-thu-ls4', '听到的句子是什么？',
          ['My grandmother tells me stories every night.', 'My grandmother tells me stories every morning.', 'My grandfather tells me stories every night.', 'My grandmother reads me stories every night.'], 0,
          '听力关键词：grandmother 和 every night。注意 tells 和 reads 的区别。',
          'Key words: "grandmother", "stories", "every night".'),
        choice('w3-thu-ls5', '听到的句子是什么？',
          ['Don\'t forget to close the window before you leave.', 'Don\'t forget to open the window before you leave.', 'Don\'t forget to close the door before you leave.', 'Remember to close the window when you leave.'], 0,
          '听力关键词：Don\'t forget 和 close the window。',
          'Key words: "Don\'t forget" and "close the window".'),
      ]),
      { passage: '', questions: [] }, // placeholder replaced below
      mcqModule('w3-thu-tense', '时态练习', 'tense', 10, [
        fill('w3-thu-tn1', 'Listen! Someone ___ (sing) in the next room. [填入正确形式]', 'is singing',
          'Listen! 提示动作正在进行，用现在进行时 is singing。',
          '"Listen!" signals the present continuous: "is singing".'),
        fill('w3-thu-tn2', 'She ___ (be) a teacher since 2020. [填入正确形式]', 'has been',
          'since 2020 表示从过去持续到现在，用现在完成时 has been。',
          '"Since 2020" needs the present perfect: "has been".'),
        fill('w3-thu-tn3', 'We ___ (visit) the Great Wall two years ago. [填入正确形式]', 'visited',
          'two years ago 是过去时间，用一般过去时 visited。',
          '"Two years ago" is a past time marker: use "visited".'),
        fill('w3-thu-tn4', 'If it ___ (snow) tomorrow, we will make a snowman. [填入正确形式]', 'snows',
          'if 引导的条件状语从句用一般现在时表将来，it 后动词加 s，snows。',
          'In an if-clause about the future, use the simple present: "if it snows".'),
        fill('w3-thu-tn5', 'Look at the clouds! It ___ (rain) soon. [填入正确形式]', 'is going to rain',
          '看云识天气，有迹象表明要下雨，用 be going to 表示即将发生。',
          'Evidence now shows a future event: use "is going to rain".'),
      ]),
    ],
  },
  { // 周五
    theme_cn: '模板写作 + KET/PET题型 + 语法复习',
    modules: [
      { id: 'w3-fri-writing', name_cn: '写作练习', type: 'writing_template', duration: 15,
        title: 'My School Day',
        requirement_cn: '请根据关键词提示完成作文，完成后请背诵全文。下周将进行挖空默写测试！',
        keywords: ['get up', 'have breakfast', 'go to school', 'four classes', 'play basketball'],
        template: 'I {{1}} at six thirty every morning. Then I {{2}} with my parents. I {{3}} at seven forty. We have {{4}} in the morning. After school, I {{5}} with my classmates.',
        blanks: [
          { id: 1, hint_cn: '起床', hint_en: 'get up', answer: 'get up' },
          { id: 2, hint_cn: '吃早餐', hint_en: 'have breakfast', answer: 'have breakfast' },
          { id: 3, hint_cn: '去上学', hint_en: 'go to school', answer: 'go to school' },
          { id: 4, hint_cn: '四节课', hint_en: 'four classes', answer: 'four classes' },
          { id: 5, hint_cn: '打篮球', hint_en: 'play basketball', answer: 'play basketball' },
        ],
        full_text: 'I get up at six thirty every morning. Then I have breakfast with my parents. I go to school at seven forty. We have four classes in the morning. After school, I play basketball with my classmates.',
        explanation_cn: '这篇作文描述每天的作息，全文用一般现在时。注意：1) 主语是 I，动词用原形；2) have breakfast 固定搭配；3) go to school 去上学；4) 时间用 at + 数字。',
        explanation_en: 'This essay describes a daily routine in the simple present. Fixed phrases: "have breakfast", "go to school". Times take "at".' },
      mcqModule('w3-fri-ket', 'KET/PET题型', 'ket_pet', 10, [
        choice('w3-fri-kp1', 'KET: Choose the correct answer. — How long ___ you known your best friend? — For five years.', ['do', 'did', 'have', 'will'], 2,
          'How long + have + 过去分词，现在完成时，回答 for five years。',
          '"How long" with a "for" answer uses the present perfect: "have you known".'),
        choice('w3-fri-kp2', 'KET: The movie is really ___. I want to watch it again.', ['boring', 'exciting', 'tiring', 'scary'], 1,
          '想再看一遍说明电影精彩，用 exciting（令人兴奋的）。',
          'Watching it again means the movie is "exciting".'),
        choice('w3-fri-kp3', 'KET: — What ___ your hobby? — Collecting stamps.', ['is', 'are', 'am', 'be'], 0,
          'hobby 是单数，用 What is your hobby? 提问。',
          '"Hobby" is singular, so ask "What is your hobby?"'),
        choice('w3-fri-kp4', 'KET: You look tired. You ___ go to bed early tonight.', ['should', 'shouldn\'t', 'can\'t', 'mustn\'t'], 0,
          '看起来累了，建议早点睡，用 should 表示建议。',
          '"Should" gives advice: you look tired, so you should rest.'),
        choice('w3-fri-kp5', 'KET: I don\'t like this shirt. Please show me ___.', ['other', 'the other', 'another', 'others'], 2,
          '三者以上中的另一个用 another，泛指另一件衬衫。',
          '"Another" means one more of the same kind — a different shirt.'),
      ]),
      mcqModule('w3-fri-grammar', '语法复习', 'grammar', 8, [
        choice('w3-fri-gr1', 'There ___ a football game on TV tonight.', ['is going to be', 'is going to have', 'are going to be', 'will have'], 0,
          'there be 句型的将来时是 there is going to be，不能说 there will have。',
          'The future of "there be" is "there is going to be" — never "there will have".'),
        choice('w3-fri-gr2', 'The teacher told us ___ in class.', ['not talk', 'don\'t talk', 'not to talk', 'to not talk'], 2,
          'tell somebody not to do something，不定式的否定是 not to do。',
          'The pattern is "tell somebody not to do something".'),
        choice('w3-fri-gr3', 'This is the ___ film I have ever seen.', ['better', 'best', 'good', 'well'], 1,
          'I have ever seen 表示比较范围是"所有看过的电影"，用最高级 best。',
          '"I have ever seen" sets up a superlative: "the best film".'),
      ]),
    ],
  },
  { // 周六
    theme_cn: 'AI口语 + 高频词汇 + 阅读理解',
    modules: [
      { questions: [
        speaking('w3-sat-sp1', 'What do you want to learn this year?', '你今年想学什么？',
          ['I want to learn how to swim this year.', 'Swimming is healthy.', 'This year is new.', 'Learning takes time.'],
          'learn how to do 学会怎么做。want to learn 后面接 how to + 动词原形。',
          '"Learn how to do something" — use "how to" plus the base verb.'),
        speaking('w3-sat-sp2', 'Who cooks dinner in your family?', '你家谁做晚饭？',
          ['My father often cooks dinner for us.', 'Dinner is at seven.', 'Fathers can cook.', 'Cooking is fun.'],
          'often 是频率副词，放在实义动词前面。cook dinner 做晚饭。',
          'Place "often" before the main verb. "Cook dinner" is the fixed phrase.'),
        speaking('w3-sat-sp3', 'What was the best gift you ever got?', '你收到过最好的礼物是什么？',
          ['The best gift was a bike from my grandpa.', 'Bikes need repairs.', 'Grandpa is generous.', 'Gifts make people happy.'],
          '问的是过去的经历，回答用过去时 was。ever 曾经。',
          'Answer with the past tense: "was". "Ever" means at any time in the past.'),
        speaking('w3-sat-sp4', 'How was your day today?', '你今天过得怎么样？',
          ['It was great! We had a fun science class.', 'Science classes are weekly.', 'Great days end well.', 'Fun things happen often.'],
          'How was...? 问过去的体验，回答用 was + 形容词。',
          'Answer with "It was" plus an adjective like "great" or "fun".'),
        speaking('w3-sat-sp5', 'What are you afraid of?', '你害怕什么？',
          ['I am a little afraid of the dark.', 'The dark is scary.', 'Fear is normal.', 'Little kids feel afraid.'],
          'be afraid of 后面接名词或 doing，表示"害怕……"。',
          '"Be afraid of" is followed by a noun or an -ing form.'),
      ]},
      { words: [
        { word: 'flower', phonetic: '/ˈflaʊə/', meaning: '花', emoji: '🌷',
          example_en: 'The flower smells sweet.', example_cn: '这朵花很香。',
          syllables: ['flow', 'er'], blank: 'flo__er', blankAnswer: 'w' },
        { word: 'bread', phonetic: '/bred/', meaning: '面包', emoji: '🍞',
          example_en: 'I have bread and milk for breakfast.', example_cn: '我早餐吃面包喝牛奶。',
          syllables: ['bread'], blank: 'b__ad', blankAnswer: 're' },
        { word: 'doctor', phonetic: '/ˈdɒktə/', meaning: '医生', emoji: '👨‍⚕️',
          example_en: 'The doctor helps sick people.', example_cn: '医生帮助生病的人。',
          syllables: ['doc', 'tor'], blank: 'do__or', blankAnswer: 'ct' },
        { word: 'window', phonetic: '/ˈwɪndəʊ/', meaning: '窗户', emoji: '🪟',
          example_en: 'Please open the window.', example_cn: '请打开窗户。',
          syllables: ['win', 'dow'], blank: 'win__w', blankAnswer: 'do' },
        { word: 'planet', phonetic: '/ˈplænɪt/', meaning: '行星', emoji: '🌍',
          example_en: 'We live on the planet Earth.', example_cn: '我们生活在地球这颗行星上。',
          syllables: ['pla', 'net'], blank: 'pla__t', blankAnswer: 'ne' },
      ]},
      reading('w3-sat-reading',
        'Every summer, Kate\'s family drives to the seaside for a week. Kate loves building sandcastles and collecting seashells. Last summer, she found a starfish on the beach. Her father told her to put it back into the water, because starfish cannot live outside the sea. Kate gently put it back and watched it swim away. She felt happy to help.',
        '每年夏天，凯特一家都会开车去海边住一个星期。凯特喜欢堆沙堡和捡贝壳。去年夏天，她在沙滩上发现了一只海星。爸爸告诉她把它放回海里，因为海星离开海水活不了。凯特轻轻地把它放了回去，看着它游走。她帮助了它，感到很开心。',
        [
          choice('w3-sat-rd1', 'How long do Kate\'s family stay at the seaside?', ['A weekend', 'A week', 'A month', 'Two days'], 1,
            'drives to the seaside for a week，去海边一个星期。',
            'The family drives to the seaside for a week.'),
          choice('w3-sat-rd2', 'What did Kate find on the beach last summer?', ['A seashell', 'A crab', 'A starfish', 'A pearl'], 2,
            'she found a starfish on the beach，她发现了一只海星。',
            'Kate found a starfish on the beach.'),
          choice('w3-sat-rd3', 'Why did her father tell her to put it back?', ['It was dangerous', 'Starfish cannot live outside the sea', 'It was someone else\'s', 'It was too small'], 1,
            'because starfish cannot live outside the sea，海星离开海水活不了。',
            'Starfish cannot live outside the sea.'),
        ]),
    ],
  },
  { // 周日
    theme_cn: '阅读理解 + 高频词汇 + 完形填空',
    modules: [
      reading('w3-sun-reading',
        'On a cold winter morning, a little bird fell from its nest onto the snowy ground. A boy named Dongdong saw it on his way to school. He took off his warm scarf, wrapped the bird in it, and carried it to school. His teacher helped him make a small warm box for the bird. After school, they put the bird back into its nest. The bird sang loudly, as if to say thank you.',
        '一个寒冷的冬天的早晨，一只小鸟从鸟窝里掉到了雪地上。一个叫冬冬的男孩在上学的路上看到了它。他摘下自己暖和的围巾，把小鸟裹起来，带着它去了学校。老师帮他们做了一个温暖的小盒子给小鸟住。放学后，他们把小鸟放回了鸟窝。小鸟大声地唱起歌来，好像在说谢谢。',
        [
          choice('w3-sun-rd1', 'Where was the bird when Dongdong found it?', ['In its nest', 'On the snowy ground', 'In a tree', 'At school'], 1,
            'fell from its nest onto the snowy ground，小鸟掉在了雪地上。',
            'The bird fell onto the snowy ground.'),
          choice('w3-sun-rd2', 'What did Dongdong wrap the bird in?', ['His coat', 'His scarf', 'A box', 'Paper'], 1,
            'He took off his warm scarf, wrapped the bird in it，他用自己的围巾裹住小鸟。',
            'Dongdong wrapped the bird in his warm scarf.'),
          choice('w3-sun-rd3', 'When did they put the bird back?', ['In the morning', 'At noon', 'After school', 'The next day'], 2,
            'After school, they put the bird back into its nest，放学后放回鸟窝。',
            'They put the bird back into its nest after school.'),
        ]),
      { words: [
        { word: 'spring', phonetic: '/sprɪŋ/', meaning: '春天；泉水', emoji: '🌱',
          example_en: 'Flowers come out in spring.', example_cn: '春天百花盛开。',
          syllables: ['spring'], blank: 's__ing', blankAnswer: 'pr' },
        { word: 'teacher', phonetic: '/ˈtiːtʃə/', meaning: '老师', emoji: '👩‍🏫',
          example_en: 'My teacher is very kind.', example_cn: '我的老师很和善。',
          syllables: ['tea', 'cher'], blank: 'tea__er', blankAnswer: 'ch' },
        { word: 'noodle', phonetic: '/ˈnuːdl/', meaning: '面条（常用复数 noodles）', emoji: '🍜',
          example_en: 'Let\'s have noodles for lunch.', example_cn: '我们中午吃面条吧。',
          syllables: ['noo', 'dle'], blank: 'noo__e', blankAnswer: 'dl' },
        { word: 'silver', phonetic: '/ˈsɪlvə/', meaning: '银色的；银', emoji: '🥈',
          example_en: 'The moon light was silver.', example_cn: '月光是银色的。',
          syllables: ['sil', 'ver'], blank: 'sil__r', blankAnswer: 've' },
        { word: ' pocket', phonetic: '/ˈpɒkɪt/', meaning: '口袋', emoji: '👖',
          example_en: 'He found a coin in his pocket.', example_cn: '他在口袋里发现了一枚硬币。',
          syllables: ['pock', 'et'], blank: 'po__et', blankAnswer: 'ck' },
      ]},
      { passage: '', questions: [] }, // placeholder replaced below
    ],
  },
];

W3[3].modules[1] = { id: 'w3-thu-cloze', name_cn: '完形填空', type: 'cloze', duration: 12,
  passage: 'Anna\'s school had a sports day last 1___. Anna ran in the relay race. Her team came 2___, and she was sad. Her teacher said, "Don\'t cry. Winning is not the only thing that 3___." Then her teammates came and said her running was 4___ and fast. Anna smiled. She decided to practice every week and try 5___ next year.',
  questions: [
    choice('w3-thu-cz1', '1___', ['Friday', 'book', 'game', 'food'], 0,
      'sports day 是某一天举办的活动，last Friday 合理。',
      'A sports day happens on a day: "last Friday".'),
    choice('w3-thu-cz2', '2___', ['first', 'second', 'last', 'lost'], 1,
      '她很伤心，说明没有得第一，came second 得了第二。',
      'She was sad, so her team did not come first — they came second.'),
    choice('w3-thu-cz3', '3___', ['matters', 'loses', 'runs', 'plays'], 0,
      '老师安慰她：赢不是唯一重要的事，what matters 表示"重要的事情"。',
      'The teacher means winning is not the only thing that matters.'),
    choice('w3-thu-cz4', '4___', ['slow', 'great', 'bad', 'lazy'], 1,
      '队友夸她跑得好又快，great and fast。',
      'Her teammates praised her running as great and fast.'),
    choice('w3-thu-cz5', '5___', ['again', 'never', 'hardly', 'slowly'], 0,
      '她决定每周练习，明年再试一次，try again。',
      'She will practice and try again next year.'),
  ]};
W3[6].modules[2] = { id: 'w3-sun-cloze', name_cn: '完形填空', type: 'cloze', duration: 12,
  passage: 'Ben wanted to buy a model plane, but it cost fifty yuan and he only had twenty. So he decided to 1___ money. Every morning, he helped his neighbors carry 2___ to the door. He also sold some of his old 3___ to his classmates. After three weeks, he had enough. When he bought the model plane, he felt really 4___ of himself. Working for something makes it more 5___.',
  questions: [
    choice('w3-sun-cz1', '1___', ['save', 'spend', 'borrow', 'waste'], 0,
      '钱不够，所以他决定攒钱 save money。',
      'He did not have enough money, so he decided to save money.'),
    choice('w3-sun-cz2', '2___', ['boxes', 'water', 'money', 'books'], 0,
      '帮邻居把东西搬到门口，carry boxes 合理。',
      'He helped neighbors carry boxes to the door.'),
    choice('w3-sun-cz3', '3___', ['toys', 'food', 'clothes', 'trees'], 0,
      '把旧玩具（toys）卖给同学换钱。',
      'He sold his old toys to classmates.'),
    choice('w3-sun-cz4', '4___', ['proud', 'afraid', 'tired', 'sorry'], 0,
      '靠自己努力买到，感到自豪 feel proud of himself。',
      'He felt proud of himself for earning it.'),
    choice('w3-sun-cz5', '5___', ['special', 'cheap', 'heavy', 'difficult'], 0,
      '通过努力得来的东西更珍贵 special。',
      'Things you work for feel more special.'),
  ]};

// ===========================================================================
// Assemble: clone week-1 shape metadata and emit data-weeks.js
// ===========================================================================
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'data.js'), 'utf8');
const getW1 = new Function(src + '; return HOMEWORK_DATA;');
global.HOMEWORK_DATA_W1 = getW1();

const banks = [buildWeek(W2, 'w2'), buildWeek(W3, 'w3')];

// sanity checks
banks.forEach((bank, bi) => {
  if (bank.length !== 7) throw new Error('bank ' + bi + ' must have 7 days');
  bank.forEach((day, di) => {
    const w1day = global.HOMEWORK_DATA_W1[di];
    if (day.modules.length !== w1day.modules.length) {
      throw new Error('day ' + di + ' bank ' + bi + ': module count mismatch');
    }
    day.modules.forEach((m, mi) => {
      const w1m = w1day.modules[mi];
      if (m.type !== w1m.type) throw new Error('day ' + di + ' module ' + mi + ' type mismatch');
      if (m.questions) {
        m.questions.forEach(q => {
          if (!q || !q.id) throw new Error('question without id in day ' + di + ' module ' + mi);
          if (q.type === 'choice' && (!q.options || q.options.length < 2)) throw new Error('bad options: ' + q.id);
          if (q.explanation_cn === undefined && q.explanation_en === undefined) {
            console.warn('  note: ' + q.id + ' has no explanation fields');
          }
        });
      }
      if (m.words) {
        m.words.forEach(w => {
          if (!w.word || !w.meaning || !w.emoji) throw new Error('bad word entry in day ' + di);
          if (!w.syllables || !w.syllables.length) throw new Error('word without syllables: ' + w.word);
        });
      }
    });
  });
});
console.log('sanity checks passed');

const out = '/* eslint-disable */\n'
  + '// Week 2 & 3 question banks. Generated by tools/gen-weeks.js — all question\n'
  + '// content is hand-authored there; edit that file and regenerate.\n'
  + 'var WEEK_EXTRA_BANKS = ' + JSON.stringify(banks, null, 2) + ';\n\n'
  + '// Week rotation: week 0 = original bank (epoch Monday), then cycle through\n'
  + '// the extra banks. The active bank is copied into HOMEWORK_DATA IN PLACE so\n'
  + '// every existing reference keeps working.\n'
  + '(function () {\n'
  + '  var banks = [HOMEWORK_DATA];          // week 1 is the original bank\n'
  + '  WEEK_EXTRA_BANKS.forEach(function (b) { banks.push(b); });\n'
  + '  var epoch = Date.parse(\'2026-10-26\');   // Monday of week 1\n'
  + '  var now = Date.now();\n'
  + '  var weekN = Math.floor((now - epoch) / (7 * 24 * 3600 * 1000));\n'
  + '  if (weekN < 0) weekN = 0;\n'
  + '  window.__weekNum = weekN;\n'
  + '  window.__bankId = weekN % banks.length;\n'
  + '  window.__ALL_BANKS = banks;\n'
  + '  var active = banks[window.__bankId];\n'
  + '  // Copy first, then clear: when the active bank IS the HOMEWORK_DATA\n'
  + '  // array (week 1), a naive clear-then-push would read an emptied array.\n'
  + '  var copy = active.slice();\n'
  + '  HOMEWORK_DATA.length = 0;\n'
  + '  copy.forEach(function (day) { HOMEWORK_DATA.push(day); });\n'
  + '})();\n';

fs.writeFileSync(path.join(__dirname, '..', 'public', 'data-weeks.js'), out);
console.log('written public/data-weeks.js,', (out.length / 1024).toFixed(0) + ' KB');
