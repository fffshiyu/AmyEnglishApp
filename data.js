const HOMEWORK_DATA = [
  {
    "day_cn": "周一",
    "day_en": "Monday",
    "is_speaking_day": true,
    "total_duration": 40,
    "theme_cn": "AI口语 + 高频词汇 + 阅读理解",
    "modules": [
      {
        "id": "mon-speaking",
        "name_cn": "AI口语练习",
        "type": "speaking",
        "duration": 30,
        "questions": [
          {
            "id": "mon-sp1",
            "sentence": "What's your favorite subject at school?",
            "sentence_cn": "你在学校最喜欢的科目是什么？",
            "options": [
              "My favorite subject is English.",
              "I like playing football.",
              "I have lunch at noon.",
              "I go to school by bus."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 favorite 的发音，美音重音在第一音节 fa-vo-rite，/ˈfeɪvərɪt/",
            "explanation_cn": "这是一道日常对话题，询问最喜欢的科目。回答时应直接说出科目名称，使用 My favorite subject is... 的句型。注意 subject 的发音，/ˈsʌbdʒekt/，重音在第一音节。",
            "explanation_en": "This is a daily conversation question asking about your favorite subject. You should directly state the subject using 'My favorite subject is...'. Note the pronunciation of 'subject' with stress on the first syllable /ˈsʌbdʒekt/."
          },
          {
            "id": "mon-sp2",
            "sentence": "How do you go to school every day?",
            "sentence_cn": "你每天怎么去上学？",
            "options": [
              "I go to school by bus.",
              "I like reading books.",
              "My school is big.",
              "I have five classes."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 school 中 sch 的发音 /sk/，不要读成 /ʃ/；by bus 连读时注意过渡自然",
            "explanation_cn": "这题询问出行方式。常用回答：by bus/car/bike/subway 或 on foot。注意 means of transportation 前面用 by，不用 by a。school 的 sch 发 /sk/ 音，不是 /ʃ/。",
            "explanation_en": "This question asks about transportation. Common answers: by bus/car/bike/subway or on foot. Note that we use 'by' without 'a' before the transport. The 'sch' in 'school' is pronounced /sk/, not /ʃ/."
          },
          {
            "id": "mon-sp3",
            "sentence": "What did you do last weekend?",
            "sentence_cn": "你上周末做了什么？",
            "options": [
              "I went to the park with my family.",
              "I am doing my homework.",
              "I will visit my grandma.",
              "I like swimming."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 last weekend 中 last 的 /æ/ 音要发饱满，went 是 go 的过去式 /went/",
            "explanation_cn": "这题用一般过去时询问上周末活动。注意问题用 did，回答动词要用过去式（went, played, visited 等）。不能回答现在进行时或将来时，时态必须一致。",
            "explanation_en": "This question uses the simple past tense to ask about last weekend. Since the question uses 'did', the answer must use past tense verbs (went, played, visited). The tense must be consistent."
          },
          {
            "id": "mon-sp4",
            "sentence": "Can you tell me about your family?",
            "sentence_cn": "你能告诉我你的家庭情况吗？",
            "options": [
              "Sure! There are four people in my family: my parents, my sister and me.",
              "I have a pet dog.",
              "My school is far away.",
              "I don't like vegetables."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 family 的发音 /ˈfæməli/，美音常弱化为 /ˈfæmli/；parents 注意 /peərənts/ 的双元音",
            "explanation_cn": "这是开放式家庭介绍题。回答时应包括家庭人数和成员。常用句型：There are... people in my family. 注意介绍自己时放在最后：my parents, my sister and me（不是 I）。",
            "explanation_en": "This is an open-ended question about family. Your answer should include the number of family members and who they are. Common pattern: 'There are... people in my family.' Note: when listing family members, put yourself last using 'me' not 'I'."
          },
          {
            "id": "mon-sp5",
            "sentence": "What do you want to be when you grow up?",
            "sentence_cn": "你长大后想成为什么？",
            "options": [
              "I want to be a doctor because I want to help sick people.",
              "I am ten years old.",
              "I like playing games.",
              "My mother is a teacher."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 grow up 连读，grow 的 /gr/ 和 up 的 /ʌ/ 要自然过渡；because 重音在第二音节 /bɪˈkɒz/",
            "explanation_cn": "这题询问未来理想职业。回答格式：I want to be a/an + 职业名词 + because + 原因。注意职业前用 a 或 an（元音前用 an，如 an engineer）。grow up 是固定短语，意思是长大。",
            "explanation_en": "This question asks about future career aspirations. Answer format: I want to be a/an + job + because + reason. Note: use 'an' before vowels (e.g., an engineer). 'Grow up' is a fixed phrase meaning to become an adult."
          }
        ]
      },
      {
        "id": "mon-vocab",
        "name_cn": "高频词汇",
        "type": "vocabulary_game",
        "duration": 5,
        "words": [
          {
            "word": "beautiful",
            "phonetic": "/ˈbjuːtɪfəl/",
            "meaning": "美丽的，漂亮的",
            "emoji": "🌸",
            "example_en": "The sunset is beautiful.",
            "example_cn": "日落很美丽。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🪨",
                  "⚽",
                  "🏃",
                  "🌸"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🔍",
                  "😈",
                  "🌸",
                  "🐛"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "beautiful 是什么意思？（1/2）",
                "options": [
                  "庆祝",
                  "图书馆",
                  "美丽的，漂亮的",
                  "诚实的"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "beautiful 是什么意思？（2/2）",
                "options": [
                  "图书馆",
                  "诚实的",
                  "发现",
                  "美丽的，漂亮的"
                ],
                "answer": 3
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: bea__ti__ul",
                "answer": "uf"
              }
            ],
            "letters": [
              "b",
              "e",
              "a",
              "u",
              "t",
              "i",
              "f",
              "u",
              "l"
            ],
            "syllables": [
              "beau",
              "ti",
              "ful"
            ]
          },
          {
            "word": "library",
            "phonetic": "/ˈlaɪbrəri/",
            "meaning": "图书馆",
            "emoji": "📖",
            "example_en": "I read books in the library.",
            "example_cn": "我在图书馆看书。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "📖",
                  "🍰",
                  "🏀",
                  "🌧️"
                ],
                "answer": 0
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🐰",
                  "📖",
                  "🪨",
                  "🌧️"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "library 是什么意思？（1/2）",
                "options": [
                  "庆祝",
                  "诚实的",
                  "图书馆",
                  "美丽的，漂亮的"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "library 是什么意思？（2/2）",
                "options": [
                  "图书馆",
                  "庆祝",
                  "诚实的",
                  "发现"
                ],
                "answer": 0
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: li__r__ry",
                "answer": "ba"
              }
            ],
            "letters": [
              "l",
              "i",
              "b",
              "r",
              "a",
              "r",
              "y"
            ],
            "syllables": [
              "li",
              "bra",
              "ry"
            ]
          },
          {
            "word": "honest",
            "phonetic": "/ˈɒnɪst/",
            "meaning": "诚实的",
            "emoji": "🤝",
            "example_en": "He is an honest boy.",
            "example_cn": "他是一个诚实的男孩。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "⚽",
                  "🏀",
                  "🐌",
                  "🤝"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🌧️",
                  "🔍",
                  "🐛",
                  "🤝"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "honest 是什么意思？（1/2）",
                "options": [
                  "发现",
                  "美丽的，漂亮的",
                  "诚实的",
                  "图书馆"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "honest 是什么意思？（2/2）",
                "options": [
                  "美丽的，漂亮的",
                  "图书馆",
                  "发现",
                  "诚实的"
                ],
                "answer": 3
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: ho__e__t",
                "answer": "ns"
              }
            ],
            "letters": [
              "h",
              "o",
              "n",
              "e",
              "s",
              "t"
            ],
            "syllables": [
              "ho",
              "nest"
            ]
          },
          {
            "word": "celebrate",
            "phonetic": "/ˈselɪbreɪt/",
            "meaning": "庆祝",
            "emoji": "🎉",
            "example_en": "We celebrate Christmas together.",
            "example_cn": "我们一起庆祝圣诞节。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🤝",
                  "🍔",
                  "🎉",
                  "📚"
                ],
                "answer": 2
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🐌",
                  "😈",
                  "🎉",
                  "🌧️"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "celebrate 是什么意思？（1/2）",
                "options": [
                  "美丽的，漂亮的",
                  "诚实的",
                  "庆祝",
                  "图书馆"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "celebrate 是什么意思？（2/2）",
                "options": [
                  "诚实的",
                  "图书馆",
                  "庆祝",
                  "发现"
                ],
                "answer": 2
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: cel__br__te",
                "answer": "ea"
              }
            ],
            "letters": [
              "c",
              "e",
              "l",
              "e",
              "b",
              "r",
              "a",
              "t",
              "e"
            ],
            "syllables": [
              "ce",
              "le",
              "brate"
            ]
          },
          {
            "word": "discover",
            "phonetic": "/dɪˈskʌvə/",
            "meaning": "发现",
            "emoji": "🔍",
            "example_en": "Scientists discover new things.",
            "example_cn": "科学家发现新事物。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🌧️",
                  "😴",
                  "🔍",
                  "😴"
                ],
                "answer": 2
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🔍",
                  "📚",
                  "🍔",
                  "⚽"
                ],
                "answer": 0
              },
              {
                "type": "meaning_choice",
                "prompt": "discover 是什么意思？（1/2）",
                "options": [
                  "发现",
                  "图书馆",
                  "庆祝",
                  "诚实的"
                ],
                "answer": 0
              },
              {
                "type": "meaning_choice",
                "prompt": "discover 是什么意思？（2/2）",
                "options": [
                  "发现",
                  "庆祝",
                  "图书馆",
                  "美丽的，漂亮的"
                ],
                "answer": 0
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: di__co__er",
                "answer": "sv"
              }
            ],
            "letters": [
              "d",
              "i",
              "s",
              "c",
              "o",
              "v",
              "e",
              "r"
            ],
            "syllables": [
              "dis",
              "co",
              "ver"
            ]
          }
        ]
      },
      {
        "id": "mon-reading",
        "name_cn": "阅读理解",
        "type": "reading",
        "duration": 5,
        "passage": "Tom is a 10-year-old boy from England. He loves sports, especially football. Every Saturday, he plays football with his friends in the park. His dream is to become a professional football player one day. His father is a PE teacher and always helps him practice. Tom also likes reading books about famous football players.",
        "passage_cn": "汤姆是一个来自英国的10岁男孩。他热爱运动，尤其是足球。每个星期六，他和朋友们在公园里踢足球。他的梦想是有一天成为一名职业足球运动员。他的父亲是一名体育老师，总是帮助他练习。汤姆也喜欢阅读关于著名足球运动员的书籍。",
        "questions": [
          {
            "id": "mon-rd1",
            "type": "choice",
            "question": "How old is Tom?",
            "options": [
              "8 years old",
              "10 years old",
              "12 years old",
              "14 years old"
            ],
            "answer": 1,
            "explanation_cn": "文章第一句明确说 Tom is a 10-year-old boy，所以汤姆10岁。注意 10-year-old 作形容词时，year 不加 s，中间用连字符连接。",
            "explanation_en": "The first sentence states 'Tom is a 10-year-old boy', so Tom is 10 years old. Note: when used as an adjective before a noun, 'year' doesn't take 's' and hyphens are used: 10-year-old boy."
          },
          {
            "id": "mon-rd2",
            "type": "choice",
            "question": "What does Tom do every Saturday?",
            "options": [
              "Reads books",
              "Plays football",
              "Watches TV",
              "Goes swimming"
            ],
            "answer": 1,
            "explanation_cn": "文章说 Every Saturday, he plays football with his friends in the park。每个星期六他和朋友在公园踢足球。注意 every Saturday 表示每周六，用一般现在时。",
            "explanation_en": "The text says 'Every Saturday, he plays football with his friends in the park.' Note: 'every Saturday' indicates a regular habit, so the simple present tense is used."
          },
          {
            "id": "mon-rd3",
            "type": "choice",
            "question": "What is Tom's dream?",
            "options": [
              "To be a teacher",
              "To be a football player",
              "To be a writer",
              "To be a doctor"
            ],
            "answer": 1,
            "explanation_cn": "文章说 His dream is to become a professional football player one day。他的梦想是有一天成为职业足球运动员。注意 professional 意为职业的，one day 意为有一天（指未来）。",
            "explanation_en": "The text says 'His dream is to become a professional football player one day.' Note: 'professional' means doing something as a paid job, and 'one day' refers to a future time."
          }
        ]
      }
    ]
  },
  {
    "day_cn": "周二",
    "day_en": "Tuesday",
    "is_speaking_day": false,
    "total_duration": 30,
    "theme_cn": "阅读理解 + 语法练习 + 单项选择",
    "modules": [
      {
        "id": "tue-reading",
        "name_cn": "阅读理解",
        "type": "reading",
        "duration": 10,
        "passage": "Emma lives in a small town near the sea. Every morning, she walks to school with her best friend Lily. They have known each other since kindergarten. Emma's favorite class is Art because she loves drawing pictures of the ocean. After school, she often goes to the beach to collect seashells. She has a big collection of beautiful shells in her room.",
        "passage_cn": "艾玛住在海边的一个小镇上。每天早上，她和最好的朋友莉莉一起走路上学。她们从幼儿园就认识了。艾玛最喜欢的课是美术，因为她喜欢画大海的画。放学后，她经常去海滩收集贝壳。她的房间里有一大堆美丽的贝壳收藏。",
        "questions": [
          {
            "id": "tue-rd1",
            "type": "choice",
            "question": "Where does Emma live?",
            "options": [
              "In a big city",
              "Near the sea",
              "In the mountains",
              "Near a forest"
            ],
            "answer": 1,
            "explanation_cn": "文章第一句说 Emma lives in a small town near the sea。艾玛住在海边的一个小镇上。near the sea 意为靠近海边，注意区分 near（靠近）和 next to（紧挨着）的用法。",
            "explanation_en": "The first sentence says 'Emma lives in a small town near the sea.' 'Near the sea' means close to the sea. Note the difference between 'near' (close to) and 'next to' (immediately beside)."
          },
          {
            "id": "tue-rd2",
            "type": "choice",
            "question": "Who is Lily?",
            "options": [
              "Emma's sister",
              "Emma's teacher",
              "Emma's best friend",
              "Emma's neighbor"
            ],
            "answer": 2,
            "explanation_cn": "文章说 she walks to school with her best friend Lily。莉莉是艾玛最好的朋友。best friend 意为最好的朋友，注意 friend 是可数名词，前面有形容词修饰时可以加冠词或代词。",
            "explanation_en": "The text says 'she walks to school with her best friend Lily.' Lily is Emma's best friend. 'Best friend' means the closest friend. Note: 'friend' is a countable noun."
          },
          {
            "id": "tue-rd3",
            "type": "choice",
            "question": "Why does Emma like Art class?",
            "options": [
              "Because she likes the teacher",
              "Because she loves drawing",
              "Because it's easy",
              "Because her friend is there"
            ],
            "answer": 1,
            "explanation_cn": "文章说 Emma's favorite class is Art because she loves drawing pictures of the ocean。艾玛最喜欢美术课因为她喜欢画大海。because 引导原因状语从句，解释为什么喜欢美术课。",
            "explanation_en": "The text says 'Emma's favorite class is Art because she loves drawing pictures of the ocean.' The 'because' clause explains the reason. 'Drawing pictures of the ocean' means making pictures about the sea."
          }
        ]
      },
      {
        "id": "tue-grammar",
        "name_cn": "语法练习",
        "type": "grammar",
        "duration": 10,
        "questions": [
          {
            "id": "tue-gr1",
            "type": "choice",
            "question": "She ___ to school every day.",
            "options": [
              "go",
              "goes",
              "going",
              "went"
            ],
            "answer": 1,
            "explanation_cn": "主语 She 是第三人称单数，every day 表示经常性动作，用一般现在时。第三人称单数动词加 -es：go → goes。注意 do → does, watch → watches, study → studies 等变化规则。",
            "explanation_en": "The subject 'She' is third person singular, and 'every day' indicates a habitual action, so we use the simple present tense. Third person singular verbs add -s or -es: go → goes. Note other patterns: do → does, watch → watches, study → studies."
          },
          {
            "id": "tue-gr2",
            "type": "choice",
            "question": "I ___ my homework when he called me.",
            "options": [
              "do",
              "did",
              "was doing",
              "am doing"
            ],
            "answer": 2,
            "explanation_cn": "这句话表示当过去某个动作发生时，另一个动作正在进行。called 是过去时，所以正在进行的动作用过去进行时 was doing。注意过去进行时结构：was/were + doing。",
            "explanation_en": "This sentence describes an action in progress when another past action occurred. 'Called' is past tense, so the ongoing action uses the past continuous: was doing. Structure: was/were + verb-ing."
          },
          {
            "id": "tue-gr3",
            "type": "fill",
            "question": "There ___ (be) many books on the shelf. [填入正确形式]",
            "answer": "are",
            "explanation_cn": "There be 句型遵循就近原则。books 是复数，且在 shelf 上，离动词最近的是 many books，所以用 are。注意 There is a book and two pens 中，离动词最近的是 a book（单数），用 is。",
            "explanation_en": "The 'There be' pattern follows the principle of proximity - the verb agrees with the nearest noun. Since 'books' is plural and nearest to the verb, we use 'are'. Note: 'There is a book and two pens' uses 'is' because 'a book' (singular) is nearest."
          },
          {
            "id": "tue-gr4",
            "type": "choice",
            "question": "He has ___ eaten his breakfast.",
            "options": [
              "yet",
              "already",
              "never",
              "just now"
            ],
            "answer": 1,
            "explanation_cn": "现在完成时 has eaten 中，already 用于肯定句表示已经。yet 用于否定句和疑问句。never 表示从不。just now 一般与过去时连用。注意 already 常放在 have/has 和过去分词之间。",
            "explanation_en": "In the present perfect 'has eaten', 'already' is used in affirmative sentences meaning something has happened. 'Yet' is for negatives and questions. 'Never' means not at any time. 'Just now' is usually used with past tense. 'Already' goes between have/has and the past participle."
          },
          {
            "id": "tue-gr5",
            "type": "fill",
            "question": "The boy ___ (talk) to his teacher now is my brother. [填入正确形式]",
            "answer": "talking",
            "explanation_cn": "这句话中 The boy is my brother 是主句，talking to his teacher now 是现在分词短语作后置定语修饰 The boy。boy 和 talk 是主动关系，所以用现在分词 talking。相当于 who is talking 的省略。",
            "explanation_en": "In this sentence, 'The boy is my brother' is the main clause. 'Talking to his teacher now' is a present participle phrase used as a post-modifier describing 'The boy'. Since the boy and talk have an active relationship, we use the present participle 'talking'. It's a shortened form of 'who is talking'."
          }
        ]
      },
      {
        "id": "tue-choice",
        "name_cn": "单项选择",
        "type": "multiple_choice",
        "duration": 10,
        "questions": [
          {
            "id": "tue-mc1",
            "type": "choice",
            "question": "___ interesting book it is!",
            "options": [
              "What",
              "What an",
              "How",
              "How an"
            ],
            "answer": 1,
            "explanation_cn": "感叹句结构：What (a/an) + 形容词 + 名词 + 主语 + 谓语！book 是可数名词单数，interesting 元音音素开头用 an。所以是 What an interesting book it is! 注意 How 引导的感叹句结构：How + 形容词/副词 + 主语 + 谓语！",
            "explanation_en": "Exclamatory sentence structure: What (a/an) + adjective + noun + subject + verb! 'Book' is a singular countable noun, and 'interesting' starts with a vowel sound, so we use 'an'. Answer: What an interesting book it is! Note: 'How' structure is: How + adj/adv + subject + verb!"
          },
          {
            "id": "tue-mc2",
            "type": "choice",
            "question": "My father will come back ___ next week.",
            "options": [
              "sometime",
              "some time",
              "sometimes",
              "some times"
            ],
            "answer": 0,
            "explanation_cn": "这四个词容易混淆：sometime 某个时候（未来或过去）；some time 一段时间；sometimes 有时（频度副词）；some times 几次。句意是下周某个时候回来，选 sometime。",
            "explanation_en": "These four are easily confused: 'sometime' = at some unspecified time; 'some time' = a period of time; 'sometimes' = occasionally (adverb of frequency); 'some times' = several occasions. The sentence means 'at some time next week', so 'sometime' is correct."
          },
          {
            "id": "tue-mc3",
            "type": "choice",
            "question": "The teacher asked us ___ noise in class.",
            "options": [
              "don't make",
              "not make",
              "to not make",
              "not to make"
            ],
            "answer": 3,
            "explanation_cn": "ask sb to do sth 是固定结构，否定形式是 ask sb not to do sth。注意 not 要放在 to do 前面，不是 to not do。类似的还有 tell sb not to do, want sb not to do 等。",
            "explanation_en": "'Ask sb to do sth' is a fixed pattern, and its negative form is 'ask sb not to do sth'. Note: 'not' comes before 'to do', not 'to not do'. Similar patterns: tell sb not to do, want sb not to do."
          },
          {
            "id": "tue-mc4",
            "type": "choice",
            "question": "___ of the students in our class ___ girls.",
            "options": [
              "Two-third; are",
              "Two-thirds; are",
              "Two-thirds; is",
              "Two-third; is"
            ],
            "answer": 1,
            "explanation_cn": "分数表达：分子用基数词，分母用序数词，分子大于1时分母加 s。2/3 = two-thirds。主语 students 是复数，谓语用 are。注意 population 做主语时用单数，但分数+population 时谓语取决于上下文。",
            "explanation_en": "Fraction expression: numerator uses cardinal number, denominator uses ordinal number, and when the numerator is greater than 1, the denominator takes 's'. 2/3 = two-thirds. The subject 'students' is plural, so the verb is 'are'."
          },
          {
            "id": "tue-mc5",
            "type": "choice",
            "question": "I don't know ___ tomorrow.",
            "options": [
              "if will it rain",
              "if it will rain",
              "whether it rains",
              "whether does it rain"
            ],
            "answer": 1,
            "explanation_cn": "宾语从句用陈述语序（主语+谓语），排除 A 和 D。tomorrow 表示将来时，用 will rain。if 和 whether 都可以引导宾语从句表示是否，但 if 更口语化。注意从句时态：主句现在时，从句可以用将来时。",
            "explanation_en": "Object clauses use statement word order (subject + verb), eliminating A and D. 'Tomorrow' indicates future tense, so 'will rain' is used. Both 'if' and 'whether' can introduce object clauses meaning 'whether', but 'if' is more colloquial."
          }
        ]
      }
    ]
  },
  {
    "day_cn": "周三",
    "day_en": "Wednesday",
    "is_speaking_day": true,
    "total_duration": 40,
    "theme_cn": "AI口语 + 高频词汇 + 阅读理解",
    "modules": [
      {
        "id": "wed-speaking",
        "name_cn": "AI口语练习",
        "type": "speaking",
        "duration": 30,
        "questions": [
          {
            "id": "wed-sp1",
            "sentence": "What time do you usually get up in the morning?",
            "sentence_cn": "你通常早上几点起床？",
            "options": [
              "I usually get up at 6:30 in the morning.",
              "I am eating breakfast.",
              "I like sleeping.",
              "It is morning."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 usually 的发音 /ˈjuːʒuəli/，中间的 s 发 /ʒ/ 音；get up 连读时 t 弱化",
            "explanation_cn": "这题询问日常作息时间。回答用 I usually + 动词 + at + 时间。usually 是频度副词，放在实义动词前。注意时间表达：6:30 读作 six thirty 或 half past six。",
            "explanation_en": "This question asks about daily routine time. Answer: I usually + verb + at + time. 'Usually' is an adverb of frequency placed before the main verb. Time expression: 6:30 can be read as 'six thirty' or 'half past six'."
          },
          {
            "id": "wed-sp2",
            "sentence": "What's the weather like today?",
            "sentence_cn": "今天天气怎么样？",
            "options": [
              "It's sunny and warm today.",
              "I like summer.",
              "My favorite color is blue.",
              "I don't know."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 weather 的 th 发 /ð/（浊音），不要发成 /θ/；sunny 和 warm 之间停顿一下",
            "explanation_cn": "What's the weather like? 是询问天气的常用句型。回答用 It's + 天气形容词。常用天气词：sunny, cloudy, rainy, windy, snowy, foggy。注意 weather 不可数名词，不能用 a/an。",
            "explanation_en": "'What's the weather like?' is a common pattern for asking about weather. Answer: It's + weather adjective. Common weather words: sunny, cloudy, rainy, windy, snowy, foggy. Note: 'weather' is an uncountable noun."
          },
          {
            "id": "wed-sp3",
            "sentence": "What are you going to do this summer vacation?",
            "sentence_cn": "今年暑假你打算做什么？",
            "options": [
              "I'm going to visit my grandparents in Beijing.",
              "I went to the park.",
              "I am a student.",
              "I have a book."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 going to 的连读 /ɡənə/，vacation 美音 /veɪˈkeɪʃn/，英音 /vəˈkeɪʃn/",
            "explanation_cn": "这题用 be going to 结构询问暑假计划。be going to + 动词原形表示打算做某事。注意 this summer vacation 前面不用介词 in。回答时态要对应，用 be going to 结构。",
            "explanation_en": "This question uses 'be going to' to ask about summer vacation plans. Structure: be going to + base verb means 'plan to do something'. Note: no preposition before 'this summer vacation'. The answer should match with 'be going to' structure."
          },
          {
            "id": "wed-sp4",
            "sentence": "Can you describe your best friend?",
            "sentence_cn": "你能描述一下你最好的朋友吗？",
            "options": [
              "Sure! She is tall and kind. She has long hair and always helps others.",
              "I have a dog.",
              "My friend is at home.",
              "I don't like her."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 describe 的重音在第二音节 /dɪˈskraɪb/；tall 和 kind 之间稍作停顿",
            "explanation_cn": "这是描述人物的题。回答应包括外貌特征（tall, short, thin 等）和性格特点（kind, funny, smart 等）。常用句型：She/He is + 形容词. She/He has + 特征. describe 是动词，名词形式是 description。",
            "explanation_en": "This is a person description question. Your answer should include physical appearance (tall, short, thin, etc.) and personality traits (kind, funny, smart, etc.). Common patterns: She/He is + adjective. She/He has + feature. 'Describe' is a verb; its noun form is 'description'."
          },
          {
            "id": "wed-sp5",
            "sentence": "What's your favorite food? Why?",
            "sentence_cn": "你最喜欢的食物是什么？为什么？",
            "options": [
              "My favorite food is dumplings because they are delicious.",
              "I am hungry.",
              "I eat lunch at school.",
              "Food is important."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 dumplings 的 /dʌm/ 音，delicious 重音在第二音节 /dɪˈlɪʃəs/，注意 ci 发 /ʃ/",
            "explanation_cn": "这题询问喜欢的食物及原因。回答格式：My favorite food is + 食物 + because + 原因。常用原因词：delicious（美味的）, healthy（健康的）, sweet（甜的）。注意 food 不可数，但具体食物名称如 dumplings 可数。",
            "explanation_en": "This question asks about favorite food and the reason. Answer format: My favorite food is + food + because + reason. Common reason words: delicious, healthy, sweet. Note: 'food' is uncountable, but specific food names like 'dumplings' are countable."
          }
        ]
      },
      {
        "id": "wed-vocab",
        "name_cn": "高频词汇",
        "type": "vocabulary_game",
        "duration": 5,
        "words": [
          {
            "word": "adventure",
            "phonetic": "/ədˈventʃə/",
            "meaning": "冒险，奇遇",
            "emoji": "🗺️",
            "example_en": "The trip was a great adventure.",
            "example_cn": "这次旅行是一次大冒险。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🐌",
                  "🎉",
                  "🗺️",
                  "🔥"
                ],
                "answer": 2
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🐰",
                  "😭",
                  "🗺️",
                  "📚"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "adventure 是什么意思？（1/2）",
                "options": [
                  "冒险，奇遇",
                  "保护",
                  "探索",
                  "成功"
                ],
                "answer": 0
              },
              {
                "type": "meaning_choice",
                "prompt": "adventure 是什么意思？（2/2）",
                "options": [
                  "成功",
                  "冒险，奇遇",
                  "探索",
                  "保护"
                ],
                "answer": 1
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: adv__nt__re",
                "answer": "eu"
              }
            ],
            "letters": [
              "a",
              "d",
              "v",
              "e",
              "n",
              "t",
              "u",
              "r",
              "e"
            ],
            "syllables": [
              "ad",
              "ven",
              "ture"
            ]
          },
          {
            "word": "imagine",
            "phonetic": "/ɪˈmædʒɪn/",
            "meaning": "想象",
            "emoji": "💭",
            "example_en": "I imagine flying in the sky.",
            "example_cn": "我想象在天空中飞翔。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🏃",
                  "🐌",
                  "🛋️",
                  "💭"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🐌",
                  "🍔",
                  "🎉",
                  "💭"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "imagine 是什么意思？（1/2）",
                "options": [
                  "成功",
                  "想象",
                  "探索",
                  "冒险，奇遇"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "imagine 是什么意思？（2/2）",
                "options": [
                  "冒险，奇遇",
                  "探索",
                  "保护",
                  "想象"
                ],
                "answer": 3
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: im__g__ne",
                "answer": "ai"
              }
            ],
            "letters": [
              "i",
              "m",
              "a",
              "g",
              "i",
              "n",
              "e"
            ],
            "syllables": [
              "i",
              "ma",
              "gine"
            ]
          },
          {
            "word": "protect",
            "phonetic": "/prəˈtekt/",
            "meaning": "保护",
            "emoji": "🛡️",
            "example_en": "We should protect the environment.",
            "example_cn": "我们应该保护环境。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "⚽",
                  "🛋️",
                  "😭",
                  "🛡️"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "📉",
                  "🎸",
                  "🛡️",
                  "📈"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "protect 是什么意思？（1/2）",
                "options": [
                  "成功",
                  "想象",
                  "冒险，奇遇",
                  "保护"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "protect 是什么意思？（2/2）",
                "options": [
                  "保护",
                  "冒险，奇遇",
                  "探索",
                  "想象"
                ],
                "answer": 0
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: pr__t__ct",
                "answer": "oe"
              }
            ],
            "letters": [
              "p",
              "r",
              "o",
              "t",
              "e",
              "c",
              "t"
            ],
            "syllables": [
              "pro",
              "tect"
            ]
          },
          {
            "word": "success",
            "phonetic": "/səkˈses/",
            "meaning": "成功",
            "emoji": "🏆",
            "example_en": "Hard work leads to success.",
            "example_cn": "努力工作带来成功。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🏆",
                  "🌧️",
                  "🌸",
                  "🔥"
                ],
                "answer": 0
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "😈",
                  "🤝",
                  "🏃",
                  "🏆"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "success 是什么意思？（1/2）",
                "options": [
                  "成功",
                  "探索",
                  "冒险，奇遇",
                  "想象"
                ],
                "answer": 0
              },
              {
                "type": "meaning_choice",
                "prompt": "success 是什么意思？（2/2）",
                "options": [
                  "想象",
                  "探索",
                  "保护",
                  "成功"
                ],
                "answer": 3
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: su__c__ss",
                "answer": "ce"
              }
            ],
            "letters": [
              "s",
              "u",
              "c",
              "c",
              "e",
              "s",
              "s"
            ],
            "syllables": [
              "suc",
              "cess"
            ]
          },
          {
            "word": "explore",
            "phonetic": "/ɪkˈsplɔː/",
            "meaning": "探索",
            "emoji": "🧭",
            "example_en": "Let's explore the forest.",
            "example_cn": "让我们探索森林。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🛋️",
                  "🔥",
                  "🤝",
                  "🧭"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "😈",
                  "🐰",
                  "🐌",
                  "🧭"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "explore 是什么意思？（1/2）",
                "options": [
                  "保护",
                  "成功",
                  "想象",
                  "探索"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "explore 是什么意思？（2/2）",
                "options": [
                  "保护",
                  "冒险，奇遇",
                  "探索",
                  "成功"
                ],
                "answer": 2
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: ex__l__re",
                "answer": "po"
              }
            ],
            "letters": [
              "e",
              "x",
              "p",
              "l",
              "o",
              "r",
              "e"
            ],
            "syllables": [
              "ex",
              "plore"
            ]
          }
        ]
      },
      {
        "id": "wed-reading",
        "name_cn": "阅读理解",
        "type": "reading",
        "duration": 5,
        "passage": "David is a 12-year-old boy who loves science. His dream is to become an astronaut and travel to space. Every week, he reads books about planets and stars. His science teacher, Mr. Brown, encourages him to study hard. Last summer, David visited a space museum with his class. He saw real rockets and spacesuits there. It was the most exciting day of his life.",
        "passage_cn": "大卫是一个12岁的男孩，热爱科学。他的梦想是成为一名宇航员去太空旅行。每周他都读关于行星和恒星的书。他的科学老师布朗先生鼓励他努力学习。去年夏天，大卫和全班同学参观了太空博物馆。他在那里看到了真正的火箭和宇航服。那是他一生中最激动人心的一天。",
        "questions": [
          {
            "id": "wed-rd1",
            "type": "choice",
            "question": "What does David want to be?",
            "options": [
              "A teacher",
              "An astronaut",
              "A doctor",
              "A football player"
            ],
            "answer": 1,
            "explanation_cn": "文章说 His dream is to become an astronaut and travel to space。大卫的梦想是成为宇航员。astronaut 意为宇航员，注意该词的拼写和发音 /ˈæstrənɔːt/。",
            "explanation_en": "The text says 'His dream is to become an astronaut and travel to space.' 'Astronaut' means a person who travels in space. Note the pronunciation /ˈæstrənɔːt/."
          },
          {
            "id": "wed-rd2",
            "type": "choice",
            "question": "What did David see at the space museum?",
            "options": [
              "Books and pencils",
              "Rockets and spacesuits",
              "Animals and plants",
              "Movies and games"
            ],
            "answer": 1,
            "explanation_cn": "文章说 He saw real rockets and spacesuits there。他在太空博物馆看到了真正的火箭和宇航服。real 意为真正的，rockets 意为火箭，spacesuits 意为宇航服。",
            "explanation_en": "The text says 'He saw real rockets and spacesuits there.' 'Real' means actual, not fake. 'Rockets' are space vehicles, and 'spacesuits' are special suits for astronauts."
          },
          {
            "id": "wed-rd3",
            "type": "choice",
            "question": "How did David feel about the museum visit?",
            "options": [
              "Bored",
              "Excited",
              "Scared",
              "Tired"
            ],
            "answer": 1,
            "explanation_cn": "文章最后一句说 It was the most exciting day of his life。这是他一生中最激动人心的一天。exciting 意为令人激动的，注意 exciting（令人激动的）和 excited（感到激动的）的区别。",
            "explanation_en": "The last sentence says 'It was the most exciting day of his life.' 'Exciting' means causing excitement. Note the difference: 'exciting' describes something that causes excitement, while 'excited' describes how someone feels."
          }
        ]
      }
    ]
  },
  {
    "day_cn": "周四",
    "day_en": "Thursday",
    "is_speaking_day": false,
    "total_duration": 30,
    "theme_cn": "听力练习 + 完形填空 + 时态练习",
    "modules": [
      {
        "id": "thu-listening",
        "name_cn": "听力练习",
        "type": "listening",
        "duration": 10,
        "questions": [
          {
            "id": "thu-ls1",
            "type": "choice",
            "question": "听到的句子是什么？",
            "audio_text": "I usually have breakfast at seven o'clock.",
            "options": [
              "I usually have breakfast at seven o'clock.",
              "I usually have lunch at seven o'clock.",
              "I usually have dinner at seven o'clock.",
              "I usually have breakfast at six o'clock."
            ],
            "answer": 0,
            "explanation_cn": "听力关键词：breakfast（早餐）和 seven o'clock（七点）。注意区分 breakfast/lunch/dinner 的发音。breakfast /ˈbrekfəst/，lunch /lʌntʃ/，dinner /ˈdɪnə/。听的时候要抓住关键信息。",
            "explanation_en": "Key listening words: 'breakfast' and 'seven o\\'clock'. Note the difference in pronunciation: breakfast /ˈbrekfəst/, lunch /lʌntʃ/, dinner /ˈdɪnə/. Focus on key information when listening."
          },
          {
            "id": "thu-ls2",
            "type": "choice",
            "question": "听到的句子是什么？",
            "audio_text": "She is wearing a red dress today.",
            "options": [
              "She is wearing a red dress today.",
              "She is wearing a red skirt today.",
              "She is wearing a blue dress today.",
              "She is wearing a red hat today."
            ],
            "answer": 0,
            "explanation_cn": "听力关键词：wearing（穿着），red（红色），dress（裙子）。注意 dress 和 skirt 的区别：dress 是连衣裙，skirt 是半身裙。wearing 的发音 /ˈweərɪŋ/，注意 ing 的鼻音。",
            "explanation_en": "Key words: 'wearing', 'red', 'dress'. Note the difference: 'dress' is a one-piece garment, 'skirt' is a separate bottom. 'Wearing' is pronounced /ˈweərɪŋ/ with a nasal ending."
          },
          {
            "id": "thu-ls3",
            "type": "choice",
            "question": "听到的句子是什么？",
            "audio_text": "The library is next to the post office.",
            "options": [
              "The library is next to the post office.",
              "The library is behind the post office.",
              "The bank is next to the post office.",
              "The library is next to the school."
            ],
            "answer": 0,
            "explanation_cn": "听力关键词：library（图书馆），next to（紧挨着），post office（邮局）。注意 next to 和 behind 的区别：next to 是旁边，behind 是后面。library 的发音注意 /ˈlaɪbrəri/。",
            "explanation_en": "Key words: 'library', 'next to', 'post office'. Note: 'next to' means beside, 'behind' means at the back. Library pronunciation: /ˈlaɪbrəri/."
          },
          {
            "id": "thu-ls4",
            "type": "fill",
            "question": "听到的数字是什么？",
            "audio_text": "There are forty-eight students in our class.",
            "answer": "48",
            "explanation_cn": "听力数字：forty-eight (48)。注意英语数字的构成：40 是 forty（不是 fourty），8 是 eight。连读时 forty-eight 中 y 和 e 之间有轻微过渡音。注意区分 fourteen (14) 和 forty (40) 的发音。",
            "explanation_en": "Number: forty-eight (48). Note: 40 is spelled 'forty' (not 'fourty'), 8 is 'eight'. Distinguish between 'fourteen' (14) /ˌfɔːˈtiːn/ and 'forty' (40) /ˈfɔːti/ by stress and vowel length."
          },
          {
            "id": "thu-ls5",
            "type": "choice",
            "question": "听到的句子是什么？",
            "audio_text": "Would you like something to drink?",
            "options": [
              "Would you like something to drink?",
              "Would you like something to eat?",
              "Do you want something to drink?",
              "Could you give me something to drink?"
            ],
            "answer": 0,
            "explanation_cn": "听力关键句型：Would you like something to drink? 这是一句礼貌的询问。Would you like 比 Do you want 更客气。something to drink 意为喝的东西。注意 something 的发音 /ˈsʌmθɪŋ/，th 发 /θ/。",
            "explanation_en": "Key pattern: 'Would you like something to drink?' This is a polite offer. 'Would you like' is more polite than 'Do you want'. 'Something to drink' means a beverage. 'Something' is pronounced /ˈsʌmθɪŋ/ with /θ/."
          }
        ]
      },
      {
        "id": "thu-cloze",
        "name_cn": "完形填空",
        "type": "cloze",
        "duration": 10,
        "passage": "Last Sunday, Lisa went to the zoo with her family. She saw many 1___ there. First, they visited the monkeys. The monkeys were 2___ from tree to tree. Then they went to see the 3___. The elephants were very big and strong. Lisa's favorite animal is the 4___ because it has a long neck. At noon, they had a picnic 5___ a big tree. It was a wonderful day.",
        "questions": [
          {
            "id": "thu-cz1",
            "type": "choice",
            "question": "1___",
            "options": [
              "animals",
              "books",
              "friends",
              "teachers"
            ],
            "answer": 0,
            "explanation_cn": "上下文是去动物园（zoo），所以看到的是动物（animals）。注意 zoo 意为动物园，animal 意为动物。many 后面接可数名词复数，所以用 animals。",
            "explanation_en": "The context is visiting a zoo, so they saw 'animals'. 'Zoo' means a place where animals are kept. 'Many' is followed by plural countable nouns, so 'animals'."
          },
          {
            "id": "thu-cz2",
            "type": "choice",
            "question": "2___",
            "options": [
              "jumping",
              "reading",
              "sleeping",
              "writing"
            ],
            "answer": 0,
            "explanation_cn": "猴子在树间跳跃，用 jumping。from tree to tree 意为从一棵树到另一棵树。jump 意为跳跃，jumping 是现在分词表示正在进行的动作。注意猴子（monkey）的天性是跳跃。",
            "explanation_en": "Monkeys jump from tree to tree, so 'jumping' is correct. 'From tree to tree' means between trees. 'Jumping' is the present participle showing ongoing action. Monkeys are naturally active and jump around."
          },
          {
            "id": "thu-cz3",
            "type": "choice",
            "question": "3___",
            "options": [
              "elephants",
              "pencils",
              "computers",
              "desks"
            ],
            "answer": 0,
            "explanation_cn": "后一句说 The elephants were very big and strong，所以这里填 elephants。elephant 意为大象，注意拼写 e-l-e-p-h-a-n-t。big and strong 意为大而强壮。",
            "explanation_en": "The next sentence says 'The elephants were very big and strong', so the answer is 'elephants'. Note the spelling: e-l-e-p-h-a-n-t. 'Big and strong' means large in size and powerful."
          },
          {
            "id": "thu-cz4",
            "type": "choice",
            "question": "4___",
            "options": [
              "giraffe",
              "tiger",
              "fish",
              "bird"
            ],
            "answer": 0,
            "explanation_cn": "有长脖子（long neck）的动物是长颈鹿（giraffe）。giraffe 意为长颈鹿，注意拼写和发音 /dʒəˈrɑːf/。a long neck 意为长脖子。",
            "explanation_en": "The animal with a long neck is the 'giraffe'. Note the spelling and pronunciation /dʒəˈrɑːf/. 'A long neck' means a lengthy neck, which is the giraffe's most distinctive feature."
          },
          {
            "id": "thu-cz5",
            "type": "choice",
            "question": "5___",
            "options": [
              "under",
              "on",
              "in",
              "above"
            ],
            "answer": 0,
            "explanation_cn": "在大树下野餐用 under a big tree。under 意为在...下面。注意区分：on 在...上面，in 在...里面，above 在...上方（不接触），under 在...正下方。picnic 意为野餐。",
            "explanation_en": "Having a picnic under a tree uses 'under'. 'Under' means directly below something. Note: 'on' = on top of, 'in' = inside, 'above' = higher than (not touching), 'under' = directly below. 'Picnic' means an outdoor meal."
          }
        ]
      },
      {
        "id": "thu-tense",
        "name_cn": "时态练习",
        "type": "tense",
        "duration": 10,
        "questions": [
          {
            "id": "thu-tn1",
            "type": "fill",
            "question": "I ___ (visit) my grandmother last Sunday. [填入正确形式]",
            "answer": "visited",
            "explanation_cn": "last Sunday 是过去时间标志词，用一般过去时。visit 的过去式是 visited（直接加 ed）。注意规则动词过去式变化：一般加 ed，以 e 结尾加 d，辅音+y 变 y 为 i 加 ed，重读闭音节双写末尾辅音加 ed。",
            "explanation_en": "'Last Sunday' is a past time marker, so we use the simple past tense. The past form of 'visit' is 'visited' (add -ed). Regular verb past tense rules: add -ed; if ending in 'e', add -d; consonant+y changes to -ied; double the final consonant for stressed closed syllables."
          },
          {
            "id": "thu-tn2",
            "type": "fill",
            "question": "Look! The children ___ (play) football on the playground. [填入正确形式]",
            "answer": "are playing",
            "explanation_cn": "Look! 是现在进行时标志词，表示正在发生的动作。结构：be + doing。children 是复数，用 are playing。注意 Look! / Listen! / now / at the moment 等都是现在进行时标志词。",
            "explanation_en": "'Look!' is a present continuous tense marker, indicating an action happening now. Structure: be + verb-ing. 'Children' is plural, so 'are playing'. Markers: Look!, Listen!, now, at the moment all indicate present continuous."
          },
          {
            "id": "thu-tn3",
            "type": "fill",
            "question": "My father ___ (work) in this factory since 2010. [填入正确形式]",
            "answer": "has worked",
            "explanation_cn": "since 2010 是现在完成时标志词，表示从过去持续到现在。结构：have/has + 过去分词。主语 My father 是第三人称单数，用 has worked。注意 since + 时间点，for + 时间段。",
            "explanation_en": "'Since 2010' is a present perfect tense marker, indicating an action from the past continuing to now. Structure: have/has + past participle. 'My father' is third person singular, so 'has worked'. Note: 'since' + point in time, 'for' + period of time."
          },
          {
            "id": "thu-tn4",
            "type": "fill",
            "question": "We ___ (have) an English test tomorrow. [填入正确形式]",
            "answer": "will have",
            "explanation_cn": "tomorrow 是将来时间标志词，用一般将来时 will + 动词原形。也可以用 be going to have。注意 will 后面接动词原形，不要写成 will to have。will 可以缩写为 'll。",
            "explanation_en": "'Tomorrow' is a future time marker, using the simple future tense: will + base verb. 'Be going to have' is also acceptable. Note: 'will' is followed by the base form of the verb, not 'to + verb'. 'Will' can be contracted to ''ll'."
          },
          {
            "id": "thu-tn5",
            "type": "choice",
            "question": "By the time he arrived, the train ___.",
            "options": [
              "left",
              "has left",
              "had left",
              "was leaving"
            ],
            "answer": 2,
            "explanation_cn": "By the time + 过去时，主句用过去完成时 had + 过去分词。表示在过去的某个时间点之前已经完成的动作。arrived 是过去时，火车离开发生在到达之前，所以用 had left。过去完成时表示过去的过去。",
            "explanation_en": "With 'By the time' + past tense, the main clause uses the past perfect: had + past participle. It shows an action completed before a past time. 'Arrived' is past tense; the train leaving happened before arriving, so 'had left'. Past perfect = the past of the past."
          }
        ]
      }
    ]
  },
  {
    "day_cn": "周五",
    "day_en": "Friday",
    "is_speaking_day": false,
    "total_duration": 30,
    "theme_cn": "模板写作 + KET/PET题型 + 语法复习",
    "modules": [
      {
        "id": "fri-writing",
        "name_cn": "写作练习",
        "type": "writing_template",
        "duration": 15,
        "title": "My Best Friend",
        "requirement_cn": "请根据关键词提示完成作文，完成后请背诵全文。明天将进行挖空默写测试！",
        "keywords": [
          "best friend",
          "tall and kind",
          "play together",
          "help each other",
          "happy"
        ],
        "template": "My {{1}} is Tom. He is very {{2}}. We often {{3}} after school. We always {{4}} with our homework. I feel very {{5}} when I am with him.",
        "blanks": [
          {
            "id": 1,
            "hint_cn": "最好的朋友",
            "hint_en": "best friend",
            "answer": "best friend"
          },
          {
            "id": 2,
            "hint_cn": "又高又善良",
            "hint_en": "tall and kind",
            "answer": "tall and kind"
          },
          {
            "id": 3,
            "hint_cn": "一起玩",
            "hint_en": "play together",
            "answer": "play together"
          },
          {
            "id": 4,
            "hint_cn": "互相帮助",
            "hint_en": "help each other",
            "answer": "help each other"
          },
          {
            "id": 5,
            "hint_cn": "开心的",
            "hint_en": "happy",
            "answer": "happy"
          }
        ],
        "full_text": "My best friend is Tom. He is very tall and kind. We often play together after school. We always help each other with our homework. I feel very happy when I am with him.",
        "explanation_cn": "这篇作文围绕最好的朋友展开，使用了5个关键词。注意：1) best friend 是固定搭配；2) tall and kind 用 and 连接两个形容词；3) play together 中 together 是副词；4) help each other 是互帮互助的意思；5) when 引导时间状语从句。整篇作文使用一般现在时，表达日常状态。",
        "explanation_en": "This essay is about a best friend, using 5 keywords. Notes: 1) 'best friend' is a fixed collocation; 2) 'tall and kind' uses 'and' to connect two adjectives; 3) 'together' is an adverb in 'play together'; 4) 'help each other' means mutual assistance; 5) 'when' introduces a time clause. The entire essay uses the simple present tense to express a routine state."
      },
      {
        "id": "fri-ket",
        "name_cn": "KET/PET题型",
        "type": "ket_pet",
        "duration": 10,
        "questions": [
          {
            "id": "fri-kp1",
            "type": "choice",
            "question": "KET: Choose the correct answer. — Where ___ you go yesterday? — I went to the cinema.",
            "options": [
              "do",
              "did",
              "were",
              "was"
            ],
            "answer": 1,
            "explanation_cn": "KET考试常见题型。yesterday 是过去时间标志词，疑问句用 did 提问，后面动词用原形 go。回答用过去式 went。注意一般过去时的疑问句结构：Did + 主语 + 动词原形?",
            "explanation_en": "This is a common KET exam question type. 'Yesterday' is a past time marker; questions use 'did' and the main verb stays in base form. The answer uses past tense 'went'. Structure: Did + subject + base verb?"
          },
          {
            "id": "fri-kp2",
            "type": "choice",
            "question": "KET: Choose the correct answer. There isn't ___ milk in the fridge.",
            "options": [
              "some",
              "any",
              "much",
              "many"
            ],
            "answer": 1,
            "explanation_cn": "KET语法题。否定句中用 any，不用 some。milk 是不可数名词，不能用 many。some 用于肯定句和礼貌请求（Would you like some...?）。any 用于否定句和疑问句。",
            "explanation_en": "KET grammar question. In negative sentences, we use 'any', not 'some'. 'Milk' is uncountable, so 'many' cannot be used. 'Some' is for affirmative sentences and polite requests (Would you like some...?). 'Any' is for negatives and questions."
          },
          {
            "id": "fri-kp3",
            "type": "choice",
            "question": "PET: Choose the correct answer. The book ___ by millions of readers since it was published.",
            "options": [
              "has read",
              "has been read",
              "read",
              "is reading"
            ],
            "answer": 1,
            "explanation_cn": "PET考试题型。主语 The book 和 read 是被动关系（书被读），用被动语态。since 引导的时间状语要求用现在完成时。所以用现在完成时的被动语态 has been read。结构：has/have been + 过去分词。",
            "explanation_en": "PET exam type. The subject 'The book' and 'read' have a passive relationship (the book is read), so passive voice is used. 'Since' requires the present perfect tense. So we use the present perfect passive: has been read. Structure: has/have been + past participle."
          },
          {
            "id": "fri-kp4",
            "type": "fill",
            "question": "PET: Complete the second sentence so that it means the same as the first. 'The room is too small for us to sit in.' = The room isn't ___ for us to sit in.",
            "answer": "big enough",
            "explanation_cn": "PET句型转换题。too...to...（太...而不能...）可以转换为 not...enough to...（不够...而不能...）。too small = not big enough。注意 enough 放在形容词后面：big enough，不是 enough big。",
            "explanation_en": "PET sentence transformation. 'Too...to...' (so...that...cannot) can be transformed to 'not...enough to...' (not sufficiently...to). too small = not big enough. Note: 'enough' comes after the adjective: 'big enough', not 'enough big'."
          },
          {
            "id": "fri-kp5",
            "type": "choice",
            "question": "KET: Choose the correct answer. — Would you like ___ tea? — Yes, please.",
            "options": [
              "any",
              "some",
              "a",
              "many"
            ],
            "answer": 1,
            "explanation_cn": "KET题型。Would you like...? 是礼貌邀请/提议，虽然形式上是疑问句，但用 some 不用 any。tea 是不可数名词，不能用 a。many 用于可数名词复数。这是 KET 常考考点。",
            "explanation_en": "KET question type. 'Would you like...?' is a polite offer. Although it's a question form, we use 'some', not 'any'. 'Tea' is uncountable, so 'a' is wrong. 'Many' is for plural countable nouns. This is a frequently tested KET point."
          }
        ]
      },
      {
        "id": "fri-grammar",
        "name_cn": "语法复习",
        "type": "grammar",
        "duration": 5,
        "questions": [
          {
            "id": "fri-gr1",
            "type": "choice",
            "question": "Neither Tom nor I ___ a student.",
            "options": [
              "am",
              "is",
              "are",
              "be"
            ],
            "answer": 0,
            "explanation_cn": "Neither...nor... 结构遵循就近原则，谓语动词与最近的主语一致。最近的主语是 I，所以用 am。注意区分 Either...or... 和 Neither...nor... 的用法，都遵循就近原则。",
            "explanation_en": "'Neither...nor...' follows the principle of proximity - the verb agrees with the nearest subject. The nearest subject is 'I', so 'am' is used. Note: both 'Either...or...' and 'Neither...nor...' follow this principle."
          },
          {
            "id": "fri-gr2",
            "type": "choice",
            "question": "The number of students in our class ___ 45.",
            "options": [
              "are",
              "is",
              "have",
              "has"
            ],
            "answer": 1,
            "explanation_cn": "The number of + 名词复数 + 单数谓语动词，表示...的数量是。注意区分 a number of + 复数名词 + 复数谓语（许多...）。这是常考易混点。The number of students is 45. A number of students are playing.",
            "explanation_en": "'The number of + plural noun + singular verb' means 'the quantity of... is'. Note the difference: 'a number of + plural noun + plural verb' means 'many...'. Example: The number of students is 45. A number of students are playing."
          },
          {
            "id": "fri-gr3",
            "type": "fill",
            "question": "If it ___ (not rain) tomorrow, we will go camping. [填入正确形式]",
            "answer": "doesn't rain",
            "explanation_cn": "这是条件状语从句，主将从现原则：主句用将来时 will go，从句用一般现在时。it 是第三人称单数，否定用 doesn't + 动词原形。所以是 doesn't rain。注意主将从现：主句将来时，if/when 引导的从句用现在时表将来。",
            "explanation_en": "This is a conditional clause with the 'main future, subordinate present' rule: the main clause uses future tense 'will go', and the subordinate clause uses present tense. 'It' is third person singular, negative form: doesn't + base verb. So: doesn't rain. Rule: main clause future, if/when clause uses present for future meaning."
          }
        ]
      }
    ]
  },
  {
    "day_cn": "周六",
    "day_en": "Saturday",
    "is_speaking_day": true,
    "total_duration": 40,
    "theme_cn": "AI口语 + 高频词汇 + 阅读理解",
    "modules": [
      {
        "id": "sat-speaking",
        "name_cn": "AI口语练习",
        "type": "speaking",
        "duration": 30,
        "questions": [
          {
            "id": "sat-sp1",
            "sentence": "What do you usually do on weekends?",
            "sentence_cn": "你周末通常做什么？",
            "options": [
              "I usually play basketball with my friends on weekends.",
              "I am a student.",
              "I have a cat.",
              "It is Sunday."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 weekend 的重音在第一音节 /ˈwiːkend/，usually 的 s 发 /ʒ/ 音",
            "explanation_cn": "这题询问周末活动。on weekends 意为在周末（美式），英式常用 at weekends。回答用一般现在时表示经常性活动。注意 weekend 是复合词：week + end。",
            "explanation_en": "This question asks about weekend activities. 'On weekends' is American English; British English uses 'at weekends'. Use the simple present tense for habitual activities. Note: 'weekend' is a compound word: week + end."
          },
          {
            "id": "sat-sp2",
            "sentence": "What's your favorite holiday? Why?",
            "sentence_cn": "你最喜欢的节日是什么？为什么？",
            "options": [
              "My favorite holiday is Spring Festival because I can get red envelopes.",
              "I like eating.",
              "Today is a holiday.",
              "I don't know."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 holiday 的发音 /ˈhɒlədeɪ/，festival 重音在第一音节 /ˈfestɪvl/",
            "explanation_cn": "这题询问最喜欢的节日。Spring Festival 是春节。red envelopes 是红包。回答格式：My favorite holiday is + 节日 + because + 原因。常见节日：Christmas, Thanksgiving, Mid-Autumn Festival。",
            "explanation_en": "This question asks about favorite holidays. 'Spring Festival' is Chinese New Year. 'Red envelopes' are monetary gifts. Answer format: My favorite holiday is + holiday + because + reason. Common holidays: Christmas, Thanksgiving, Mid-Autumn Festival."
          },
          {
            "id": "sat-sp3",
            "sentence": "How do you celebrate your birthday?",
            "sentence_cn": "你怎么庆祝生日？",
            "options": [
              "I usually have a birthday party with my family and friends.",
              "I am happy.",
              "My birthday is in May.",
              "I like cake."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 celebrate 的重音在第一音节 /ˈselɪbreɪt/，birthday 中 th 发 /θ/",
            "explanation_cn": "这题询问生日庆祝方式。celebrate 意为庆祝。回答可以包括：have a party（开派对），eat birthday cake（吃蛋糕），invite friends（邀请朋友）。注意 celebrate 的拼写和重音。",
            "explanation_en": "This question asks about birthday celebration. 'Celebrate' means to mark a special occasion. Answers can include: have a party, eat birthday cake, invite friends. Note the spelling and stress of 'celebrate'."
          },
          {
            "id": "sat-sp4",
            "sentence": "What would you do if you had a million dollars?",
            "sentence_cn": "如果你有一百万美元你会做什么？",
            "options": [
              "If I had a million dollars, I would travel around the world.",
              "I have money.",
              "I like dollars.",
              "Money is important."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 million 的发音 /ˈmɪljən/，would 和 I 连读 /wʊdaɪ/，dollars 注意 /ˈdɒləz/",
            "explanation_cn": "这是虚拟语气题。If + 过去时, would + 动词原形，表示对现在的虚拟假设。注意这里 had 不是过去时而是虚拟语气用法。travel around the world 意为环游世界。",
            "explanation_en": "This is a subjunctive mood question. 'If + past tense, would + base verb' expresses a hypothetical situation about the present. Note: 'had' here is subjunctive, not past tense. 'Travel around the world' means to visit many countries globally."
          },
          {
            "id": "sat-sp5",
            "sentence": "Describe a book you recently read.",
            "sentence_cn": "描述一本你最近读过的书。",
            "options": [
              "I recently read 'Harry Potter'. It's about a young wizard who goes to a magic school.",
              "I don't like reading.",
              "Books are expensive.",
              "I read every day."
            ],
            "answer": 0,
            "pronunciation_tips": "注意 recently 的发音 /ˈriːsəntli/，wizard 的 /wɪzəd/，magic 重音在第一音节",
            "explanation_cn": "这题要求描述一本书。回答应包括：书名、内容简述、个人感受。recently 意为最近，常与现在完成时或过去时搭配。wizard 意为巫师，magic school 意为魔法学校。",
            "explanation_en": "This question requires describing a book. Your answer should include: title, brief content summary, personal feelings. 'Recently' means lately and is often used with present perfect or past tense. 'Wizard' means a male magic user, 'magic school' means a school for learning magic."
          }
        ]
      },
      {
        "id": "sat-vocab",
        "name_cn": "高频词汇",
        "type": "vocabulary_game",
        "duration": 5,
        "words": [
          {
            "word": "curious",
            "phonetic": "/ˈkjʊəriəs/",
            "meaning": "好奇的",
            "emoji": "🤔",
            "example_en": "Children are curious about everything.",
            "example_cn": "孩子们对一切都很好奇。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🧳",
                  "🪨",
                  "🤔",
                  "⛰️"
                ],
                "answer": 2
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🪨",
                  "🤔",
                  "😴",
                  "📚"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "curious 是什么意思？（1/2）",
                "options": [
                  "邻居",
                  "危险的",
                  "好奇的",
                  "古老的"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "curious 是什么意思？（2/2）",
                "options": [
                  "危险的",
                  "邻居",
                  "好奇的",
                  "志愿者"
                ],
                "answer": 2
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: cu__i__us",
                "answer": "ro"
              }
            ],
            "letters": [
              "c",
              "u",
              "r",
              "i",
              "o",
              "u",
              "s"
            ],
            "syllables": [
              "cu",
              "rious"
            ]
          },
          {
            "word": "ancient",
            "phonetic": "/ˈeɪnʃənt/",
            "meaning": "古老的",
            "emoji": "🏛️",
            "example_en": "We visited an ancient temple.",
            "example_cn": "我们参观了一座古老的寺庙。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🛋️",
                  "🍔",
                  "🏛️",
                  "📈"
                ],
                "answer": 2
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "📈",
                  "🏛️",
                  "🎸",
                  "🌸"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "ancient 是什么意思？（1/2）",
                "options": [
                  "志愿者",
                  "危险的",
                  "好奇的",
                  "古老的"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "ancient 是什么意思？（2/2）",
                "options": [
                  "古老的",
                  "危险的",
                  "邻居",
                  "志愿者"
                ],
                "answer": 0
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: an__i__nt",
                "answer": "ce"
              }
            ],
            "letters": [
              "a",
              "n",
              "c",
              "i",
              "e",
              "n",
              "t"
            ],
            "syllables": [
              "an",
              "cient"
            ]
          },
          {
            "word": "neighbor",
            "phonetic": "/ˈneɪbə/",
            "meaning": "邻居",
            "emoji": "🏘️",
            "example_en": "My neighbor is very friendly.",
            "example_cn": "我的邻居很友好。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🔍",
                  "⛰️",
                  "🎸",
                  "🏘️"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🚗",
                  "🏘️",
                  "📚",
                  "📉"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "neighbor 是什么意思？（1/2）",
                "options": [
                  "危险的",
                  "好奇的",
                  "古老的",
                  "邻居"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "neighbor 是什么意思？（2/2）",
                "options": [
                  "古老的",
                  "邻居",
                  "志愿者",
                  "危险的"
                ],
                "answer": 1
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: ne__gh__or",
                "answer": "ib"
              }
            ],
            "letters": [
              "n",
              "e",
              "i",
              "g",
              "h",
              "b",
              "o",
              "r"
            ],
            "syllables": [
              "nei",
              "ghbor"
            ]
          },
          {
            "word": "dangerous",
            "phonetic": "/ˈdeɪndʒərəs/",
            "meaning": "危险的",
            "emoji": "⚠️",
            "example_en": "It's dangerous to play on the road.",
            "example_cn": "在马路上玩很危险。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🌧️",
                  "🎉",
                  "⚠️",
                  "😴"
                ],
                "answer": 2
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🏀",
                  "🔥",
                  "⚠️",
                  "😴"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "dangerous 是什么意思？（1/2）",
                "options": [
                  "古老的",
                  "危险的",
                  "志愿者",
                  "好奇的"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "dangerous 是什么意思？（2/2）",
                "options": [
                  "危险的",
                  "好奇的",
                  "志愿者",
                  "邻居"
                ],
                "answer": 0
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: dan__er__us",
                "answer": "go"
              }
            ],
            "letters": [
              "d",
              "a",
              "n",
              "g",
              "e",
              "r",
              "o",
              "u",
              "s"
            ],
            "syllables": [
              "dan",
              "ge",
              "rous"
            ]
          },
          {
            "word": "volunteer",
            "phonetic": "/ˌvɒlənˈtɪə/",
            "meaning": "志愿者",
            "emoji": "🤲",
            "example_en": "She works as a volunteer at the hospital.",
            "example_cn": "她在医院做志愿者。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🌸",
                  "🧳",
                  "📉",
                  "🤲"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🔍",
                  "🤲",
                  "🚗",
                  "😈"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "volunteer 是什么意思？（1/2）",
                "options": [
                  "好奇的",
                  "邻居",
                  "志愿者",
                  "古老的"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "volunteer 是什么意思？（2/2）",
                "options": [
                  "好奇的",
                  "志愿者",
                  "危险的",
                  "邻居"
                ],
                "answer": 1
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: vol__nt__er",
                "answer": "ue"
              }
            ],
            "letters": [
              "v",
              "o",
              "l",
              "u",
              "n",
              "t",
              "e",
              "e",
              "r"
            ],
            "syllables": [
              "vol",
              "un",
              "teer"
            ]
          }
        ]
      },
      {
        "id": "sat-reading",
        "name_cn": "阅读理解",
        "type": "reading",
        "duration": 5,
        "passage": "Mike has a pet dog named Buddy. Buddy is a golden retriever with soft, shiny fur. Every morning, Mike takes Buddy for a walk in the park. Buddy loves running and chasing balls. Last week, Buddy saved a little boy who fell into the river. Everyone in the neighborhood thinks Buddy is a hero. Mike is very proud of his brave dog.",
        "passage_cn": "迈克有一只叫巴迪的宠物狗。巴迪是一只金毛寻回犬，有柔软闪亮的毛。每天早上，迈克带巴迪去公园散步。巴迪喜欢跑步和追球。上周，巴迪救了一个掉进河里的小男孩。社区里每个人都认为巴迪是个英雄。迈克为他勇敢的狗感到非常自豪。",
        "questions": [
          {
            "id": "sat-rd1",
            "type": "choice",
            "question": "What kind of dog is Buddy?",
            "options": [
              "A small dog",
              "A golden retriever",
              "A police dog",
              "A puppy"
            ],
            "answer": 1,
            "explanation_cn": "文章说 Buddy is a golden retriever。golden retriever 意为金毛寻回犬，是一种大型犬。注意 retriever /rɪˈtriːvə/ 的发音。soft, shiny fur 意为柔软闪亮的毛。",
            "explanation_en": "The text says 'Buddy is a golden retriever.' A golden retriever is a large breed of dog. Note the pronunciation of 'retriever' /rɪˈtriːvə/. 'Soft, shiny fur' means the dog's coat is smooth and glossy."
          },
          {
            "id": "sat-rd2",
            "type": "choice",
            "question": "What did Buddy do last week?",
            "options": [
              "He got lost",
              "He saved a boy",
              "He won a prize",
              "He was sick"
            ],
            "answer": 1,
            "explanation_cn": "文章说 Buddy saved a little boy who fell into the river。巴迪救了一个掉进河里的小男孩。saved 意为救了，fell into the river 意为掉进河里。注意 save 的过去式是 saved。",
            "explanation_en": "The text says 'Buddy saved a little boy who fell into the river.' 'Saved' means rescued. 'Fell into the river' means dropped into the water. Note: the past form of 'save' is 'saved'."
          },
          {
            "id": "sat-rd3",
            "type": "choice",
            "question": "How does Mike feel about Buddy?",
            "options": [
              "Sad",
              "Proud",
              "Angry",
              "Worried"
            ],
            "answer": 1,
            "explanation_cn": "文章最后一句说 Mike is very proud of his brave dog。迈克为他勇敢的狗感到自豪。proud 意为自豪的，be proud of 意为以...为豪。brave 意为勇敢的。",
            "explanation_en": "The last sentence says 'Mike is very proud of his brave dog.' 'Proud' means feeling satisfaction. 'Be proud of' means to take pride in someone/something. 'Brave' means showing courage."
          }
        ]
      }
    ]
  },
  {
    "day_cn": "周日",
    "day_en": "Sunday",
    "is_speaking_day": false,
    "total_duration": 30,
    "theme_cn": "阅读理解 + 高频词汇 + 完形填空",
    "modules": [
      {
        "id": "sun-reading",
        "name_cn": "阅读理解",
        "type": "reading",
        "duration": 10,
        "passage": "Sarah is a 11-year-old girl who loves music. She started playing the piano when she was five years old. Now she can play many beautiful songs. Her music teacher says she has a great talent. Every day, she practices for one hour after finishing her homework. Her dream is to become a famous pianist and perform in concerts around the world.",
        "passage_cn": "莎拉是一个11岁的女孩，热爱音乐。她从五岁开始弹钢琴。现在她能弹奏许多优美的曲子。她的音乐老师说她很有天赋。每天，她做完作业后练习一小时。她的梦想是成为一名著名的钢琴家，在世界各地的音乐会上演出。",
        "questions": [
          {
            "id": "sun-rd1",
            "type": "choice",
            "question": "When did Sarah start playing the piano?",
            "options": [
              "At age 3",
              "At age 5",
              "At age 7",
              "At age 11"
            ],
            "answer": 1,
            "explanation_cn": "文章说 She started playing the piano when she was five years old。莎拉五岁开始弹钢琴。start doing sth 意为开始做某事。when 引导时间状语从句。",
            "explanation_en": "The text says 'She started playing the piano when she was five years old.' 'Start doing sth' means to begin an activity. 'When' introduces a time clause."
          },
          {
            "id": "sun-rd2",
            "type": "choice",
            "question": "How long does Sarah practice every day?",
            "options": [
              "30 minutes",
              "1 hour",
              "2 hours",
              "3 hours"
            ],
            "answer": 1,
            "explanation_cn": "文章说 she practices for one hour after finishing her homework。莎拉每天练习一小时。for one hour 意为一小时。after finishing her homework 意为做完作业后。注意 after + doing sth。",
            "explanation_en": "The text says 'she practices for one hour after finishing her homework.' 'For one hour' indicates duration. 'After finishing her homework' means completing homework first. Note: 'after + doing sth' structure."
          },
          {
            "id": "sun-rd3",
            "type": "choice",
            "question": "What is Sarah's dream?",
            "options": [
              "To be a singer",
              "To be a pianist",
              "To be a teacher",
              "To be a dancer"
            ],
            "answer": 1,
            "explanation_cn": "文章说 Her dream is to become a famous pianist and perform in concerts around the world。她的梦想是成为著名钢琴家并在世界各地的音乐会上演出。pianist 意为钢琴家，concert 意为音乐会。",
            "explanation_en": "The text says 'Her dream is to become a famous pianist and perform in concerts around the world.' A 'pianist' is someone who plays the piano professionally. A 'concert' is a live music performance."
          }
        ]
      },
      {
        "id": "sun-vocab",
        "name_cn": "高频词汇",
        "type": "vocabulary_game",
        "duration": 10,
        "words": [
          {
            "word": "knowledge",
            "phonetic": "/ˈnɒlɪdʒ/",
            "meaning": "知识",
            "emoji": "🎓",
            "example_en": "Knowledge is power.",
            "example_cn": "知识就是力量。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🎓",
                  "🚗",
                  "🎉",
                  "⛰️"
                ],
                "answer": 0
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "📝",
                  "😈",
                  "🎓",
                  "🦁"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "knowledge 是什么意思？（1/2）",
                "options": [
                  "天气",
                  "健康的",
                  "知识",
                  "惊讶，惊喜"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "knowledge 是什么意思？（2/2）",
                "options": [
                  "天气",
                  "机器",
                  "惊讶，惊喜",
                  "知识"
                ],
                "answer": 3
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: kno__le__ge",
                "answer": "wd"
              }
            ],
            "letters": [
              "k",
              "n",
              "o",
              "w",
              "l",
              "e",
              "d",
              "g",
              "e"
            ],
            "syllables": [
              "know",
              "ledge"
            ]
          },
          {
            "word": "healthy",
            "phonetic": "/ˈhelθi/",
            "meaning": "健康的",
            "emoji": "🥗",
            "example_en": "Eating vegetables keeps you healthy.",
            "example_cn": "吃蔬菜让你保持健康。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "😴",
                  "⛰️",
                  "😴",
                  "🥗"
                ],
                "answer": 3
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🌸",
                  "📉",
                  "🛋️",
                  "🥗"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "healthy 是什么意思？（1/2）",
                "options": [
                  "知识",
                  "健康的",
                  "天气",
                  "机器"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "healthy 是什么意思？（2/2）",
                "options": [
                  "机器",
                  "天气",
                  "惊讶，惊喜",
                  "健康的"
                ],
                "answer": 3
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: he__l__hy",
                "answer": "at"
              }
            ],
            "letters": [
              "h",
              "e",
              "a",
              "l",
              "t",
              "h",
              "y"
            ],
            "syllables": [
              "heal",
              "thy"
            ]
          },
          {
            "word": "machine",
            "phonetic": "/məˈʃiːn/",
            "meaning": "机器",
            "emoji": "⚙️",
            "example_en": "This machine makes coffee.",
            "example_cn": "这台机器可以做咖啡。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "🏀",
                  "🐰",
                  "⚙️",
                  "🤝"
                ],
                "answer": 2
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "⚙️",
                  "😈",
                  "🛋️",
                  "🍔"
                ],
                "answer": 0
              },
              {
                "type": "meaning_choice",
                "prompt": "machine 是什么意思？（1/2）",
                "options": [
                  "天气",
                  "知识",
                  "惊讶，惊喜",
                  "机器"
                ],
                "answer": 3
              },
              {
                "type": "meaning_choice",
                "prompt": "machine 是什么意思？（2/2）",
                "options": [
                  "天气",
                  "惊讶，惊喜",
                  "知识",
                  "机器"
                ],
                "answer": 3
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: ma__h__ne",
                "answer": "ci"
              }
            ],
            "letters": [
              "m",
              "a",
              "c",
              "h",
              "i",
              "n",
              "e"
            ],
            "syllables": [
              "ma",
              "chine"
            ]
          },
          {
            "word": "weather",
            "phonetic": "/ˈweðə/",
            "meaning": "天气",
            "emoji": "🌤️",
            "example_en": "The weather is nice today.",
            "example_cn": "今天天气很好。",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "😴",
                  "🌤️",
                  "🎸",
                  "🐛"
                ],
                "answer": 1
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🌤️",
                  "🏀",
                  "⛰️",
                  "😭"
                ],
                "answer": 0
              },
              {
                "type": "meaning_choice",
                "prompt": "weather 是什么意思？（1/2）",
                "options": [
                  "天气",
                  "健康的",
                  "知识",
                  "惊讶，惊喜"
                ],
                "answer": 0
              },
              {
                "type": "meaning_choice",
                "prompt": "weather 是什么意思？（2/2）",
                "options": [
                  "惊讶，惊喜",
                  "天气",
                  "知识",
                  "健康的"
                ],
                "answer": 1
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: we__t__er",
                "answer": "ah"
              }
            ],
            "letters": [
              "w",
              "e",
              "a",
              "t",
              "h",
              "e",
              "r"
            ],
            "syllables": [
              "wea",
              "ther"
            ]
          },
          {
            "word": "surprise",
            "phonetic": "/səˈpraɪz/",
            "meaning": "惊讶，惊喜",
            "emoji": "😲",
            "example_en": "What a surprise!",
            "example_cn": "真是一个惊喜！",
            "stages": [
              {
                "type": "learn",
                "instruction": "看图学单词"
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（1/2）",
                "options": [
                  "😈",
                  "😲",
                  "🍰",
                  "🎸"
                ],
                "answer": 1
              },
              {
                "type": "image_choice",
                "prompt": "听发音，选图片（2/2）",
                "options": [
                  "🤝",
                  "🐌",
                  "😲",
                  "🎉"
                ],
                "answer": 2
              },
              {
                "type": "meaning_choice",
                "prompt": "surprise 是什么意思？（1/2）",
                "options": [
                  "知识",
                  "惊讶，惊喜",
                  "健康的",
                  "机器"
                ],
                "answer": 1
              },
              {
                "type": "meaning_choice",
                "prompt": "surprise 是什么意思？（2/2）",
                "options": [
                  "机器",
                  "惊讶，惊喜",
                  "健康的",
                  "天气"
                ],
                "answer": 1
              },
              {
                "type": "letter_read",
                "prompt": "跟读字母（每个字母读两遍）"
              },
              {
                "type": "syllable_blend",
                "prompt": "拼合音标（每个音节读两遍）"
              },
              {
                "type": "spell_fill",
                "prompt": "补全拼写: su__pr__se",
                "answer": "ri"
              }
            ],
            "letters": [
              "s",
              "u",
              "r",
              "p",
              "r",
              "i",
              "s",
              "e"
            ],
            "syllables": [
              "sur",
              "prise"
            ]
          }
        ]
      },
      {
        "id": "sun-cloze",
        "name_cn": "完形填空",
        "type": "cloze",
        "duration": 10,
        "passage": "Peter is a 10-year-old boy. He 1___ in Shanghai with his parents. Every morning, he 2___ up at 6:30 and has breakfast at 7:00. His school is not far from his home, so he 3___ to school. His favorite 4___ is English because he likes reading English stories. After school, he often plays 5___ with his classmates. He is a happy boy.",
        "questions": [
          {
            "id": "sun-cz1",
            "type": "choice",
            "question": "1___",
            "options": [
              "lives",
              "live",
              "living",
              "to live"
            ],
            "answer": 0,
            "explanation_cn": "主语 He 是第三人称单数，一般现在时动词加 s：live → lives。live in 意为住在某地。注意第三人称单数变化规则：一般加 s，以 s/x/sh/ch/o 结尾加 es，辅音+y 变 ies。",
            "explanation_en": "The subject 'He' is third person singular; present tense verbs add -s: live → lives. 'Live in' means to reside in a place. Rules: generally add -s; add -es after s/x/sh/ch/o; change y to ies after consonant+y."
          },
          {
            "id": "sun-cz2",
            "type": "choice",
            "question": "2___",
            "options": [
              "get",
              "gets",
              "getting",
              "got"
            ],
            "answer": 1,
            "explanation_cn": "Every morning 表示经常性动作，用一般现在时。He 是第三人称单数，get → gets。get up 意为起床。注意区分 get up（起床）和 wake up（醒来）。",
            "explanation_en": "'Every morning' indicates habitual action, using the simple present tense. 'He' is third person singular: get → gets. 'Get up' means to rise from bed. Note: 'get up' (rise from bed) vs 'wake up' (become conscious)."
          },
          {
            "id": "sun-cz3",
            "type": "choice",
            "question": "3___",
            "options": [
              "walks",
              "drives",
              "flies",
              "swims"
            ],
            "answer": 0,
            "explanation_cn": "学校不远所以他走路去，用 walks。注意题目说 school is not far（学校不远），所以步行 walks。walk to school 意为步行去学校。注意区分 walk（步行）和 drive（开车）。",
            "explanation_en": "The school is not far, so he walks: 'walks'. The text says 'school is not far from his home, so he walks to school.' 'Walk to school' means to go on foot. Note: walk (on foot) vs drive (by car)."
          },
          {
            "id": "sun-cz4",
            "type": "choice",
            "question": "4___",
            "options": [
              "subject",
              "color",
              "food",
              "sport"
            ],
            "answer": 0,
            "explanation_cn": "后文说 because he likes reading English stories，所以 favorite subject 是 English。subject 意为科目。常用科目：English, Math, Science, Art, Music, PE。",
            "explanation_en": "The following text says 'because he likes reading English stories', so his favorite 'subject' is English. 'Subject' means a school course. Common subjects: English, Math, Science, Art, Music, PE."
          },
          {
            "id": "sun-cz5",
            "type": "choice",
            "question": "5___",
            "options": [
              "basketball",
              "breakfast",
              "homework",
              "piano"
            ],
            "answer": 0,
            "explanation_cn": "plays 后面接运动或乐器。plays basketball 打篮球，plays piano 弹钢琴。但 with his classmates 暗示是集体运动，选 basketball。注意 play + 运动（不加 the），play + 乐器（加 the）。",
            "explanation_en": "After 'plays', we need a sport or instrument. 'Plays basketball' (sport) or 'plays the piano' (instrument). 'With his classmates' suggests a team sport, so 'basketball'. Note: play + sport (no 'the'), play + instrument (with 'the')."
          }
        ]
      }
    ]
  }
];
