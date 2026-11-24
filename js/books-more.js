/* More Library books, one per JLPT N3 question type that the first shelf lacked,
   plus extra reading passages. Books are grouped onto three shelves by `shelf`. */
window.N3 = window.N3 || {};

(function () {
  const SHELF = { kanjiwords: 'words', context: 'words', grammar: 'grammar', connect: 'grammar', reading: 'reading', guide: 'reading' };
  N3.BOOKS.forEach(b => { b.shelf = SHELF[b.id]; });

  const more = [
    {
      id: 'grammar2', area: 'Grammar', shelf: 'grammar', title: 'Twin Grammar Notebook II', jp: '文法ふたご帳・二', color: '#b55d4c', height: 88,
      type: 'More grammar contrasts', reward: '1 gem per point', inspired: 'So-Matome & Shin Kanzen Master style',
      kind: 'quiz',
      items: [
        { id: 'gb1', q: 'このパンは{焼|や}き（　）だから、まだ{温|あたた}かい。', opts: ['たて', 'かけ', 'きり', 'がち'], a: 0,
          why: '〜たて = freshly done (焼きたて, できたて). 〜かけ means half-done.' },
        { id: 'gb2', q: '{宿題|しゅくだい}をやり（　）のまま、{寝|ね}てしまった。', opts: ['たて', 'かけ', 'ぬき', 'っぽい'], a: 1,
          why: '〜かけ = started but not finished. やりかけのまま = left half-done.' },
        { id: 'gb3', q: '{雨|あめ}の{中|なか}で{遊|あそ}んで、{子供|こども}の{服|ふく}は{泥|どろ}（　）になった。', opts: ['だらけ', 'がち', 'ぎみ', 'っぽい'], a: 0,
          why: '〜だらけ = covered in / full of (something unpleasant). It attaches to nouns: 泥だらけ, 間違いだらけ.' },
        { id: 'gb4', q: '{日本|にほん}に{来|き}た（　）、{一度|いちど}は{富士山|ふじさん}に{登|のぼ}りたい。', opts: ['からには', 'ばかりに', 'かわりに', 'うちに'], a: 0,
          why: '〜からには = now that…, (so naturally) I want / should… ばかりに means “just because” with a bad result.' },
        { id: 'gb5', q: '{先生|せんせい}に{聞|き}いた（　）、テストは{来週|らいしゅう}だそうだ。', opts: ['ところ', 'ばかり', 'はず', 'わけ'], a: 0,
          why: '〜たところ = when I did X, (I found that) Y. It introduces what you discovered.' },
        { id: 'gb6', q: '{私|わたし}（　）、{家族|かぞく}が{一番|いちばん}{大切|たいせつ}だ。', opts: ['にとって', 'について', 'に対して', 'によって'], a: 0,
          why: '〜にとって = from the standpoint of / for (someone). It frames whose view the judgment is.' },
        { id: 'gb7', q: '{日本|にほん}の{歴史|れきし}（　）レポートを{書|か}いた。', opts: ['にとって', 'について', 'に対して', 'によって'], a: 1,
          why: '〜について = about / on (a topic).' },
        { id: 'gb8', q: '{天気|てんき}（　）、{試合|しあい}が{中止|ちゅうし}になることもある。', opts: ['にとって', 'について', 'に対して', 'によって'], a: 3,
          why: '〜によって = depending on. Here: depending on the weather, the match may be called off.' },
        { id: 'gb9', q: '{彼|かれ}は{寒|さむ}い（　）、{半袖|はんそで}で{出|で}かけた。', opts: ['のに', 'ので', 'ために', 'なら'], a: 0,
          why: '〜のに = even though (with surprise or criticism). ので would mean “because it’s cold”, which doesn’t fit short sleeves.' },
        { id: 'gb10', q: 'このレストランは{値段|ねだん}の（　）、{量|りょう}が{多|おお}い。', opts: ['わりに', 'くせに', 'ために', 'せいで'], a: 0,
          why: '〜わりに = considering…, (more/less than expected). Cheap, yet the portions are big.' },
        { id: 'gb11', q: 'バスが{遅|おく}れた（　）、{会議|かいぎ}に{間|ま}に{合|あ}わなかった。', opts: ['せいで', 'おかげで', 'くせに', 'わりに'], a: 0,
          why: '〜せいで = because of (a bad cause). おかげで is for good results.' },
        { id: 'gb12', q: '{先生|せんせい}の（　）、{試験|しけん}に{合格|ごうかく}できました。', opts: ['おかげで', 'せいで', 'くせに', 'わりに'], a: 0,
          why: '〜おかげで = thanks to (a good cause). Compare せいで for blame.' }
      ]
    },
    {
      id: 'spelling', area: 'Kanji', shelf: 'words', title: 'Kanji Spelling', jp: '表記のれんしゅう', color: '#c99a3c', height: 82,
      type: 'Choose the right kanji (表記)', reward: '1 gem per word', inspired: 'JLPT 表記 question style',
      kind: 'quiz',
      items: [
        { id: 'sp1', q: '{来週|らいしゅう}、テストの「じゅんび」をする。', opts: ['準備', '順備', '準美', '純備'], a: 0,
          why: '準備 (じゅんび) = preparation. 順 means order; 純 means pure.' },
        { id: 'sp2', q: 'この「せつめい」はわかりやすい。', opts: ['設明', '説明', '説名', '接明'], a: 1,
          why: '説明 (せつめい). 説 has the speech radical 言, as in 小説. 設 is “set up”.' },
        { id: 'sp3', q: '{海外|かいがい}で{働|はたら}いた「けいけん」がある。', opts: ['計験', '経検', '経験', '軽験'], a: 2,
          why: '経験 (けいけん) = experience. 検 is “inspect”, as in 検査.' },
        { id: 'sp4', q: '{毎日|まいにち}、{日本語|にほんご}を「れんしゅう」する。', opts: ['練習', '連習', '練集', '錬習'], a: 0,
          why: '練習 (れんしゅう). 練 has the thread radical 糸; 連 means “connect”.' },
        { id: 'sp5', q: '{寒|さむ}いので{窓|まど}を「しめて」ください。', opts: ['締めて', '閉めて', '占めて', '絞めて'], a: 1,
          why: '閉める = close (a door or window). 締める = tighten (a tie, a belt).' },
        { id: 'sp6', q: '{先生|せんせい}に「しつもん」があります。', opts: ['室問', '質門', '失問', '質問'], a: 3,
          why: '質問 (しつもん). 門 (gate) looks like 問 but has no 口 inside.' },
        { id: 'sp7', q: '{駅|えき}まで{友|とも}だちを「むかえ」に{行|い}く。', opts: ['迎え', '向え', '仰え', '迫え'], a: 0,
          why: '迎える = to meet, to welcome. 向かう means to head toward.' },
        { id: 'sp8', q: 'この{道|みち}は{車|くるま}が{多|おお}くて「あぶない」。', opts: ['厄ない', '危ない', '色ない', '免ない'], a: 1,
          why: '危ない (あぶない) = dangerous, as in 危険.' },
        { id: 'sp9', q: '{朝|あさ}{起|お}きたら、まず「かお」を{洗|あら}う。', opts: ['頭', '額', '顔', '類'], a: 2,
          why: '顔 (かお) = face. 頭 is head; 額 is forehead; 類 is kind/type.' },
        { id: 'sp10', q: '{来月|らいげつ}、{新|あたら}しいアパートに「ひっこす」。', opts: ['引っ超す', '引っ越す', '弘っ越す', '引っ趣す'], a: 1,
          why: '引っ越す. 越 = cross over; 超 = exceed (as in 超える).' }
      ]
    },
    {
      id: 'paraphrase', area: 'Vocabulary', shelf: 'words', title: 'Same Meaning', jp: 'いいかえ', color: '#5f8f7a', height: 86,
      type: 'Closest meaning (言い換え類義)', reward: '1 gem per pair', inspired: 'JLPT 言い換え question style',
      kind: 'quiz',
      items: [
        { id: 'pa1', q: 'この{店|みせ}はいつも「{込|こ}んでいる」。', opts: ['{人|ひと}がたくさんいる', '{人|ひと}がほとんどいない', '{値段|ねだん}が{高|たか}い', 'すぐ{閉|し}まる'], a: 0,
          why: '込んでいる = crowded, so there are lots of people.' },
        { id: 'pa2', q: '{明日|あした}までにレポートを「{提出|ていしゅつ}して」ください。', opts: ['{書|か}いて', '{出|だ}して', '{読|よ}んで', '{直|なお}して'], a: 1,
          why: '提出する = to hand in, which is 出す in everyday words.' },
        { id: 'pa3', q: '{彼|かれ}は「たまに」{遅刻|ちこく}する。', opts: ['いつも', 'よく', 'ときどき', 'ぜったいに'], a: 2,
          why: 'たまに = occasionally, closest to ときどき. よく means often.' },
        { id: 'pa4', q: 'この{料理|りょうり}の{作|つく}り{方|かた}は「{簡単|かんたん}だ」。', opts: ['{難|むずか}しくない', '{時間|じかん}がかかる', 'めずらしい', '{有名|ゆうめい}だ'], a: 0,
          why: '簡単 = easy / simple, which means 難しくない.' },
        { id: 'pa5', q: '{部屋|へや}を「{片付|かたづ}けた」。', opts: ['{飾|かざ}った', '{借|か}りた', '{整理|せいり}した', '{広|ひろ}くした'], a: 2,
          why: '片付ける = to tidy up, putting things in order, which is 整理する.' },
        { id: 'pa6', q: '{宿題|しゅくだい}を{忘|わす}れて、{先生|せんせい}に「{叱|しか}られた」。', opts: ['{怒|おこ}られた', 'ほめられた', '{教|おし}えられた', '{呼|よ}ばれた'], a: 0,
          why: '叱られる = to be scolded, closest to 怒られる.' },
        { id: 'pa7', q: 'このかばんは「{丈夫|じょうぶ}だ」。', opts: ['{軽|かる}い', 'こわれにくい', '{高|たか}い', 'おしゃれだ'], a: 1,
          why: '丈夫 (of things) = sturdy, which means it doesn’t break easily.' },
        { id: 'pa8', q: '{彼|かれ}は「さっき」{帰|かえ}りました。', opts: ['ずっと{前|まえ}に', '{少|すこ}し{後|あと}で', '{急|いそ}いで', '{少|すこ}し{前|まえ}に'], a: 3,
          why: 'さっき = a little while ago.' },
        { id: 'pa9', q: '{明日|あした}の{会議|かいぎ}は「{中止|ちゅうし}になった」。', opts: ['{行|おこな}われないことになった', '{時間|じかん}が{変|か}わった', '{場所|ばしょ}が{変|か}わった', '{長|なが}くなった'], a: 0,
          why: '中止 = called off; it won’t happen. 延期 would mean postponed.' },
        { id: 'pa10', q: '{明日|あした}は「{都合|つごう}が{悪|わる}い」。', opts: ['{体|からだ}の{調子|ちょうし}が{悪|わる}い', '{予定|よてい}があって{行|い}けない', '{天気|てんき}が{悪|わる}い', '{気分|きぶん}が{悪|わる}い'], a: 1,
          why: '都合が悪い = it’s inconvenient (because of plans), not about health or mood.' }
      ]
    },
    {
      id: 'usage', area: 'Vocabulary', shelf: 'words', title: 'Word Usage', jp: 'ことばの使い方', color: '#7a8f4f', height: 76,
      type: 'Pick the correct usage (用法)', reward: '1 gem per word', inspired: 'JLPT 用法 question style',
      kind: 'quiz',
      items: [
        { id: 'us1', q: '「なかなか」の{使|つか}い{方|かた}が{正|ただ}しいのは？', opts: ['バスがなかなか{来|こ}ない。', 'なかなか{三時|さんじ}に{会|あ}いましょう。', 'この{本|ほん}をなかなか{読|よ}んでください。', 'なかなかありがとうございます。'], a: 0,
          why: 'なかなか + negative = “not easily / taking a long time”: the bus just won’t come.' },
        { id: 'us2', q: '「{必|かなら}ず」の{使|つか}い{方|かた}が{正|ただ}しいのは？', opts: ['{明日|あした}は{必|かなら}ず{雨|あめ}が{降|ふ}るかもしれない。', '{昨日|きのう}は{必|かなら}ず{寒|さむ}かった。', '{約束|やくそく}の{時間|じかん}には{必|かなら}ず{来|き}てください。', 'このケーキは{必|かなら}ずおいしそうだ。'], a: 2,
          why: '必ず = without fail. It doesn’t mix with guesses like かもしれない or そうだ.' },
        { id: 'us3', q: '「{似合|にあ}う」の{使|つか}い{方|かた}が{正|ただ}しいのは？', opts: ['{兄|あに}と{私|わたし}は{顔|かお}がよく{似合|にあ}っている。', 'その{帽子|ぼうし}、とても{似合|にあ}っているね。', '{二人|ふたり}の{意見|いけん}が{似合|にあ}った。', 'この{答|こた}えは{問題|もんだい}に{似合|にあ}う。'], a: 1,
          why: '似合う = to suit someone (clothes, style). Looking alike is 似ている.' },
        { id: 'us4', q: '「{片付|かたづ}ける」の{使|つか}い{方|かた}が{正|ただ}しいのは？', opts: ['{風邪|かぜ}を{早|はや}く{片付|かたづ}けたい。', '{駅|えき}までの{道|みち}を{片付|かたづ}けてください。', '{遊|あそ}んだ{後|あと}は、おもちゃを{片付|かたづ}けなさい。', '{彼|かれ}の{名前|なまえ}を{片付|かたづ}けた。'], a: 2,
          why: '片付ける = to put things away / tidy up.' },
        { id: 'us5', q: '「{夢中|むちゅう}」の{使|つか}い{方|かた}が{正|ただ}しいのは？', opts: ['{昨日|きのう}の{夜|よる}、こわい{夢中|むちゅう}を{見|み}た。', '{弟|おとうと}はゲームに{夢中|むちゅう}で、{呼|よ}んでも{返事|へんじ}をしない。', '{夢中|むちゅう}な{天気|てんき}が{続|つづ}いている。', '{夢中|むちゅう}にぐっすり{寝|ね}ていた。'], a: 1,
          why: '〜に夢中 = absorbed in something. A dream you see at night is just 夢.' },
        { id: 'us6', q: '「さっぱり」の{使|つか}い{方|かた}が{正|ただ}しいのは？', opts: ['シャワーを{浴|あ}びて、さっぱりした。', 'さっぱり{雨|あめ}が{降|ふ}っている。', 'この{店|みせ}はさっぱり{人|ひと}がたくさんいる。', 'さっぱり{彼|かれ}に{会|あ}いたい。'], a: 0,
          why: 'さっぱりする = to feel refreshed. (With a negative, さっぱりわからない means “no idea at all”.)' }
      ]
    },
    {
      id: 'star', area: 'Grammar', shelf: 'grammar', title: 'Star Puzzles', jp: 'ならべかえ★', color: '#c2794f', height: 80,
      type: 'Sentence building (文の組み立て)', reward: '1 gem per puzzle', inspired: 'JLPT ★ question style',
      kind: 'quiz',
      items: [
        { id: 'st1', q: 'あの ＿＿ ＿＿ ★ ＿＿ {田中|たなか}さんです。<br><span class="muted small">Put the four pieces in order. Which one goes in ★?</span>', opts: ['かけている', 'めがねを', '{人|ひと}が', '{赤|あか}い'], a: 0,
          why: 'あの 赤い めがねを ★かけている 人が 田中さんです。' },
        { id: 'st2', q: '{昨日|きのう} ＿＿ ＿＿ ★ ＿＿ とてもおいしかった。<br><span class="muted small">Which piece goes in ★?</span>', opts: ['ケーキは', 'くれた', '{母|はは}が', '{作|つく}って'], a: 1,
          why: '昨日 母が 作って ★くれた ケーキは とてもおいしかった。' },
        { id: 'st3', q: '{日本語|にほんご}が ＿＿ ＿＿ ★ ＿＿ ために、{毎日|まいにち}{練習|れんしゅう}しています。<br><span class="muted small">Which piece goes in ★?</span>', opts: ['なる', '{上手|じょうず}に', 'ように', '{話|はな}せる'], a: 2,
          why: '日本語が 上手に 話せる ★ように なる ために、毎日練習しています。' },
        { id: 'st4', q: 'この ＿＿ ＿＿ ★ ＿＿、いつも{人|ひと}が{並|なら}んでいる。<br><span class="muted small">Which piece goes in ★?</span>', opts: ['ので', 'おいしい', '{店|みせ}の', 'パンは'], a: 1,
          why: 'この 店の パンは ★おいしい ので、いつも人が並んでいる。' },
        { id: 'st5', q: '{雨|あめ}が ＿＿ ＿＿ ★ ＿＿ {出|で}かけましょう。<br><span class="muted small">Which piece goes in ★?</span>', opts: ['から', '{待|ま}って', 'やむ', 'のを'], a: 1,
          why: '雨が やむ のを ★待って から 出かけましょう。' },
        { id: 'st6', q: '{駅|えき}に ＿＿ ＿＿ ★ ＿＿ {電車|でんしゃ}が{出|で}てしまった。<br><span class="muted small">Which piece goes in ★?</span>', opts: ['もう', '{着|つ}いた', 'には', 'とき'], a: 2,
          why: '駅に 着いた とき ★には もう 電車が出てしまった。' },
        { id: 'st7', q: '{彼女|かのじょ}は ＿＿ ＿＿ ★ ＿＿ {歌|うた}が{上手|じょうず}だ。<br><span class="muted small">Which piece goes in ★?</span>', opts: ['ように', '{歌手|かしゅ}の', 'まるで', 'プロの'], a: 1,
          why: '彼女は まるで プロの ★歌手の ように 歌が上手だ。' },
        { id: 'st8', q: '{宿題|しゅくだい}を ＿＿ ＿＿ ★ ＿＿ と、{遊|あそ}びに{行|い}ってはいけません。<br><span class="muted small">Which piece goes in ★?</span>', opts: ['ない', 'で', '{終|お}わらせて', 'から'], a: 1,
          why: '宿題を 終わらせて から ★で ない と、遊びに行ってはいけません。(〜てからでないと = not until…)' }
      ]
    }
  ];

  const passage = '{私|わたし}の{町|まち}には、{小|ちい}さなパン{屋|や}があります。{毎朝|まいあさ}{六時|ろくじ}に{店|みせ}が（１）、{焼|や}きたてのパンのにおいが{町中|まちじゅう}に{広|ひろ}がります。{私|わたし}は{学生|がくせい}のころ、（２）{毎朝|まいあさ}そこでパンを{買|か}っていました。{店主|てんしゅ}のおばあさんは、いつも{笑顔|えがお}で「いってらっしゃい」と{声|こえ}をかけて（３）。{去年|きょねん}、その{店|みせ}が{閉店|へいてん}すると{聞|き}いたとき、{私|わたし}はとても{残念|ざんねん}に{思|おも}いました。（４）、{今|いま}は{孫|まご}の{健|けん}さんが{店|みせ}を{続|つづ}けていて、あのにおいも{変|か}わっていません。';
  more.push({
    id: 'passagegrammar', area: 'Grammar', shelf: 'grammar', title: 'Grammar in a Passage', jp: '文章の文法', color: '#8f6aa0', height: 90,
    type: 'Fill gaps in a text (文章の文法)', reward: '1 gem per gap', inspired: 'JLPT 文章の文法 question style',
    kind: 'reading',
    items: [
      { id: 'pg1', passage, q: '（１）に{入|はい}るのは？', opts: ['{開|ひら}くと', '{開|ひら}いても', '{開|ひら}いたのに', '{開|ひら}くまで'], a: 0,
        clue: 'Read what follows: the smell spreads as a result of the opening.',
        why: '〜と = whenever / as soon as X happens, Y follows. Opening the shop leads to the smell spreading.' },
      { id: 'pg2', passage, q: '（２）に{入|はい}るのは？', opts: ['ぜんぜん', 'けっして', 'ほとんど', 'めったに'], a: 2,
        clue: 'Check whether the verb after it is positive or negative.',
        why: 'The verb is positive (買っていました). ぜんぜん, けっして and めったに all need a negative; ほとんど毎朝 = almost every morning.' },
      { id: 'pg3', passage, q: '（３）に{入|はい}るのは？', opts: ['あげました', 'くれました', 'もらいました', 'やりました'], a: 1,
        clue: 'Who is doing the favor for whom? The writer is the receiver.',
        why: 'The grandmother did something for the writer (the speaker’s side), so 〜てくれました.' },
      { id: 'pg4', passage, q: '（４）に{入|はい}るのは？', opts: ['それに', 'だから', 'つまり', 'しかし'], a: 3,
        clue: 'The writer was sad the shop would close. What happened next goes the other way.',
        why: 'しかし turns from the sad news to the good outcome: the grandson kept it going.' }
    ]
  });

  // Insert before the field guide so the guide stays last.
  const guideAt = N3.BOOKS.findIndex(b => b.id === 'guide');
  N3.BOOKS.splice(guideAt, 0, ...more);

  // Extra reading passages, including information search and reference words.
  N3.BOOKS.find(b => b.id === 'reading').items.push(
    { id: 'p5',
      passage: '【{市民|しみん}プールのご{案内|あんない}】<br>{営業時間|えいぎょうじかん}：{午前|ごぜん}9{時|じ}～{午後|ごご}8{時|じ}（{月曜日|げつようび}{休|やす}み）<br>{料金|りょうきん}：{大人|おとな}500{円|えん}、{中学生|ちゅうがくせい}{以下|いか}200{円|えん}<br>※ {毎週|まいしゅう}{土曜日|どようび}の{午前中|ごぜんちゅう}は、{子供|こども}{水泳|すいえい}{教室|きょうしつ}のため、{一般|いっぱん}の{方|かた}はご{利用|りよう}できません。<br>※ {水泳帽|すいえいぼう}を{必|かなら}ずかぶってください。（{受付|うけつけ}で100{円|えん}で{貸|か}し{出|だ}しています）',
      q: '{大人|おとな}{一人|ひとり}が{土曜日|どようび}の{午前|ごぜん}10{時|じ}に{泳|およ}ぎたい。どうなりますか。',
      opts: ['500{円|えん}で{泳|およ}げる', '600{円|えん}で{泳|およ}げる', '{泳|およ}げない', '200{円|えん}で{泳|およ}げる'], a: 2,
      clue: 'Information-search questions hide the answer in the ※ fine print. Check every condition: day, time, person.',
      why: 'Saturday mornings are reserved for the children’s swimming class, so adults can’t use the pool then.' },
    { id: 'p6',
      passage: '{店長|てんちょう}へ　{来週|らいしゅう}の{月曜日|げつようび}のアルバイトですが、{急|きゅう}な{用事|ようじ}ができてしまい、{行|い}けなくなりました。{本当|ほんとう}にすみません。{代|か}わりに{水曜日|すいようび}に{入|はい}ることはできますか。もし{難|むずか}しければ、{金曜日|きんようび}でも{大丈夫|だいじょうぶ}です。お{返事|へんじ}をお{待|ま}ちしています。　{山本|やまもと}',
      q: '{山本|やまもと}さんがいちばん{伝|つた}えたいことは{何|なん}ですか。',
      opts: ['{月曜日|げつようび}は{休|やす}んで、{代|か}わりに{水曜日|すいようび}に{働|はたら}きたい', '{月曜日|げつようび}と{水曜日|すいようび}の{両方|りょうほう}に{働|はたら}きたい', 'アルバイトをやめたい', '{金曜日|きんようび}だけ{働|はたら}きたい'], a: 0,
      clue: 'Find the request: the sentence after 代わりに is the main ask; 金曜日 is only a backup.',
      why: 'He can’t come Monday and asks to work Wednesday instead. Friday is a fallback, not his first wish.' },
    { id: 'p7',
      passage: 'スマートフォンで{何|なん}でもすぐ{調|しら}べられるようになった。{便利|べんり}な{一方|いっぽう}で、{自分|じぶん}で{考|かんが}える{時間|じかん}が{減|へ}ったと{感|かん}じる{人|ひと}も{多|おお}いのではないだろうか。わからないことがあったとき、すぐに{答|こた}えを{見|み}るのではなく、まず{少|すこ}し{考|かんが}えてみる。それだけで、{覚|おぼ}えたことが{長|なが}く{記憶|きおく}に{残|のこ}るそうだ。{便利|べんり}な{道具|どうぐ}は、{上手|じょうず}に{使|つか}ってこそ{役|やく}に{立|た}つのである。',
      q: '{筆者|ひっしゃ}の{考|かんが}えに{合|あ}うものはどれですか。',
      opts: ['スマートフォンは{使|つか}わないほうがいい', 'すぐ{答|こた}えを{見|み}ずに、まず{考|かんが}えてみるとよい', '{調|しら}べるのに{時間|じかん}をかけるべきではない', '{便利|べんり}な{道具|どうぐ}は{記憶|きおく}に{悪|わる}い'], a: 1,
      clue: 'The author doesn’t reject phones. Look for 〜のではなく (not X, but Y) and the final 〜てこそ sentence.',
      why: 'The author says to think a little before checking the answer, and that tools help when used well, not that they should be avoided.' },
    { id: 'p8',
      passage: '{祖母|そぼ}はいつも、{使|つか}い{終|お}わった{紙袋|かみぶくろ}をきれいにたたんで、{引|ひ}き{出|だ}しにしまっている。{私|わたし}が「それ、どうするの」と{聞|き}くと、{祖母|そぼ}は「いつか{役|やく}に{立|た}つから」と{笑|わら}った。',
      q: '「それ」は{何|なに}を{指|さ}していますか。',
      opts: ['たたんだ{紙袋|かみぶくろ}', '{引|ひ}き{出|だ}し', '{祖母|そぼ}の{笑顔|えがお}', '{新|あたら}しい{紙袋|かみぶくろ}'], a: 0,
      clue: 'それ / これ usually point back to something just mentioned. Ask what the writer is curious about.',
      why: 'The writer is asking what Grandma will do with the folded paper bags she keeps.' }
  );
})();
