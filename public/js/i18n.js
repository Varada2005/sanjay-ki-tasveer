// App interface text. English and Hindi are final; Marathi and Gujarati are drafts to be checked.
// Spoken lines and riddles live in data/game.json, not here.
export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'mr', label: 'मराठी' },
  { id: 'gu', label: 'ગુજરાતી' }
];

const T = {
  en: {
    bookOfMonth: 'Book of the month', player: 'Reader', statRiddles: 'Riddles solved', statPieces: 'Photo pieces', statFound: 'Sanjay found', yes: 'Yes', no: 'Not yet',
    pagePreview: 'Page Preview',
    resumeBook: 'Resume Book', resumeBtn: 'Resume book', startBtn: 'Start book', previouslyPlayed: 'Previously played books', home: 'Home', search: 'Search', profile: 'Profile', nPuzzles: '{n} puzzles', nSolved: '{a} of {b} puzzles solved', scanPage: 'Scan the page', pointAtClue: 'Point at a glowing santra goli', tapClue: 'Press and hold a glowing santra goli', page: 'Page', notAvailable: 'Not available in this prototype', comingSoonShort: 'Coming soon',
    welcome: 'Welcome', chooseLang: 'Choose your language', continue: 'Continue', skip: 'Later', back: 'Back',
    tableTitle: 'Pair the two phones', tableBody: 'Do this once. Both phones at the same stand share one table code.',
    tableStart: 'This is the first phone', tableJoin: 'I have a code', tableCodeIs: 'Table code', tableScan: 'On the second phone, scan this or type the code.',
    tableEnter: 'Type the 4-letter code', tablePaired: 'Paired with table', join: 'Join',
    thisMonth: "This month's book", previous: 'Previous books', open: 'Open', spreads: 'Spreads', spread: 'Spread',
    comingSoon: 'Coming soon', notInPrototype: 'Not in this prototype', concluding: 'Concluding spread', play: 'Play',
    chooseSide: 'Which side of the stand are you sitting at?', chooseSideBody: 'Look for the coloured dot on your page.',
    partner: 'Partner', partnerWaiting: 'waiting for partner', partnerOn: 'connected', taken: 'taken', watch: 'Watch only',
    placeTitle: 'Turn your phone sideways', placeBody: 'Hold the phone in landscape, like the page. Point the centre circle at a glowing santra goli to open its riddle.',
    start: 'Start', rotate: 'Turn your phone sideways',
    settings: 'Settings', language: 'Language', table: 'Table', newTable: 'New table', changeTable: 'Change table',
    camera: 'Camera', tapMode: 'Tap mode (no camera)', switchCamera: 'Switch camera', subtitles: 'Subtitles for voices',
    outlines: 'Show hidden areas (presenter)', resetGame: 'Restart this spread', exitGame: 'Leave the game', close: 'Close',
    confirmReset: 'Tap again to restart', on: 'On', off: 'Off', solvedOf: 'pieces', about: 'Prototype'
  },
  hi: {
    bookOfMonth: 'इस महीने की किताब', player: 'पाठक', statRiddles: 'पहेलियाँ हल', statPieces: 'फ़ोटो के टुकड़े', statFound: 'संजय मिले', yes: 'हाँ', no: 'अभी नहीं',
    pagePreview: 'पन्ना देखें',
    resumeBook: 'किताब जारी रखें', resumeBtn: 'किताब जारी रखें', startBtn: 'किताब शुरू करें', previouslyPlayed: 'पहले खेली गई किताबें', home: 'होम', search: 'खोजें', profile: 'प्रोफ़ाइल', nPuzzles: '{n} पहेलियाँ', nSolved: '{b} में से {a} पहेलियाँ हल', scanPage: 'पन्ना स्कैन कीजिए', pointAtClue: 'चमकती संतरा गोली पर फ़ोन रखिए', tapClue: 'चमकती संतरा गोली को दबाकर रखिए', page: 'पन्ना', notAvailable: 'इस प्रोटोटाइप में उपलब्ध नहीं', comingSoonShort: 'जल्द',
    welcome: 'नमस्ते', chooseLang: 'अपनी भाषा चुनिए', continue: 'आगे', skip: 'बाद में', back: 'वापस',
    tableTitle: 'दोनों फ़ोन जोड़िए', tableBody: 'यह एक ही बार करना है। एक स्टैंड के दोनों फ़ोन एक ही टेबल कोड रखते हैं।',
    tableStart: 'यह पहला फ़ोन है', tableJoin: 'मेरे पास कोड है', tableCodeIs: 'टेबल कोड', tableScan: 'दूसरे फ़ोन से यह स्कैन करें या कोड लिखें।',
    tableEnter: '4 अक्षरों का कोड लिखिए', tablePaired: 'टेबल से जुड़ा', join: 'जुड़ें',
    thisMonth: 'इस महीने की किताब', previous: 'पिछली किताबें', open: 'खोलें', spreads: 'पन्ने', spread: 'पन्ना',
    comingSoon: 'जल्द आ रहा है', notInPrototype: 'इस प्रोटोटाइप में नहीं', concluding: 'आख़िरी पन्ना', play: 'खेलें',
    chooseSide: 'आप स्टैंड की किस तरफ़ बैठे हैं?', chooseSideBody: 'अपने पन्ने पर रंगीन बिंदु देखिए।',
    partner: 'साथी', partnerWaiting: 'साथी का इंतज़ार', partnerOn: 'जुड़ा हुआ', taken: 'लिया जा चुका', watch: 'सिर्फ़ देखें',
    placeTitle: 'फ़ोन को आड़ा कीजिए', placeBody: 'फ़ोन को पन्ने की तरह आड़ा पकड़िए। बीच के गोले को चमकती संतरा गोली पर रखिए, पहेली खुल जाएगी।',
    start: 'शुरू करें', rotate: 'फ़ोन को आड़ा कीजिए',
    settings: 'सेटिंग्स', language: 'भाषा', table: 'टेबल', newTable: 'नई टेबल', changeTable: 'टेबल बदलें',
    camera: 'कैमरा', tapMode: 'टैप मोड (बिना कैमरा)', switchCamera: 'कैमरा बदलें', subtitles: 'आवाज़ों के सबटाइटल',
    outlines: 'छिपे हिस्से दिखाएँ (प्रस्तुतकर्ता)', resetGame: 'यह पन्ना फिर से शुरू करें', exitGame: 'खेल से बाहर', close: 'बंद करें',
    confirmReset: 'पक्का करने के लिए फिर दबाएँ', on: 'चालू', off: 'बंद', solvedOf: 'टुकड़े', about: 'प्रोटोटाइप'
  },
  mr: {
    bookOfMonth: 'या महिन्याचे पुस्तक', player: 'वाचक', statRiddles: 'सुटलेली कोडी', statPieces: 'फोटोचे तुकडे', statFound: 'संजय सापडला', yes: 'हो', no: 'अजून नाही',
    pagePreview: 'पान पाहा',
    resumeBook: 'पुस्तक पुढे सुरू ठेवा', resumeBtn: 'पुढे सुरू ठेवा', startBtn: 'पुस्तक सुरू करा', previouslyPlayed: 'आधी खेळलेली पुस्तके', home: 'होम', search: 'शोधा', profile: 'प्रोफाइल', nPuzzles: '{n} कोडी', nSolved: '{b} पैकी {a} कोडी सुटली', scanPage: 'पान स्कॅन करा', pointAtClue: 'चमकणाऱ्या संत्र्याच्या गोळीकडे फोन धरा', tapClue: 'चमकणारी संत्र्याची गोळी दाबून ठेवा', page: 'पान', notAvailable: 'या प्रोटोटाइपमध्ये उपलब्ध नाही', comingSoonShort: 'लवकरच',
    welcome: 'नमस्कार', chooseLang: 'तुमची भाषा निवडा', continue: 'पुढे', skip: 'नंतर', back: 'मागे',
    tableTitle: 'दोन्ही फोन जोडा', tableBody: 'हे एकदाच करायचे आहे. एका स्टँडवरचे दोन्ही फोन एकच टेबल कोड वापरतात.',
    tableStart: 'हा पहिला फोन आहे', tableJoin: 'माझ्याकडे कोड आहे', tableCodeIs: 'टेबल कोड', tableScan: 'दुसऱ्या फोनने हे स्कॅन करा किंवा कोड लिहा.',
    tableEnter: '4 अक्षरी कोड लिहा', tablePaired: 'टेबलशी जोडले', join: 'जोडा',
    thisMonth: 'या महिन्याचे पुस्तक', previous: 'मागील पुस्तके', open: 'उघडा', spreads: 'पाने', spread: 'पान',
    comingSoon: 'लवकरच', notInPrototype: 'या प्रोटोटाइपमध्ये नाही', concluding: 'शेवटचे पान', play: 'खेळा',
    chooseSide: 'तुम्ही स्टँडच्या कोणत्या बाजूला बसला आहात?', chooseSideBody: 'तुमच्या पानावरचा रंगीत ठिपका पाहा.',
    partner: 'जोडीदार', partnerWaiting: 'जोडीदाराची वाट', partnerOn: 'जोडलेला', taken: 'घेतलेली', watch: 'फक्त पाहा',
    placeTitle: 'फोन आडवा करा', placeBody: 'फोन पानासारखा आडवा धरा. मधले वर्तुळ चमकणाऱ्या संत्र्याच्या गोळीवर ठेवा, कोडे उघडेल.',
    start: 'सुरू करा', rotate: 'फोन आडवा करा',
    settings: 'सेटिंग्ज', language: 'भाषा', table: 'टेबल', newTable: 'नवीन टेबल', changeTable: 'टेबल बदला',
    camera: 'कॅमेरा', tapMode: 'टॅप मोड (कॅमेराशिवाय)', switchCamera: 'कॅमेरा बदला', subtitles: 'आवाजांचे सबटायटल',
    outlines: 'लपलेले भाग दाखवा (सादरकर्ता)', resetGame: 'हे पान पुन्हा सुरू करा', exitGame: 'खेळातून बाहेर', close: 'बंद करा',
    confirmReset: 'खात्रीसाठी पुन्हा दाबा', on: 'चालू', off: 'बंद', solvedOf: 'तुकडे', about: 'प्रोटोटाइप'
  },
  gu: {
    bookOfMonth: 'આ મહિનાની ચોપડી', player: 'વાચક', statRiddles: 'ઉકેલેલાં ઉખાણાં', statPieces: 'ફોટાના ટુકડા', statFound: 'સંજય મળ્યા', yes: 'હા', no: 'હજી નહીં',
    pagePreview: 'પાનું જુઓ',
    resumeBook: 'ચોપડી ચાલુ રાખો', resumeBtn: 'ચાલુ રાખો', startBtn: 'ચોપડી શરૂ કરો', previouslyPlayed: 'પહેલાં રમેલી ચોપડીઓ', home: 'હોમ', search: 'શોધો', profile: 'પ્રોફાઇલ', nPuzzles: '{n} ઉખાણાં', nSolved: '{b} માંથી {a} ઉખાણાં ઉકેલ્યાં', scanPage: 'પાનું સ્કેન કરો', pointAtClue: 'ચમકતી સંતરાની ગોળી તરફ ફોન રાખો', tapClue: 'ચમકતી સંતરાની ગોળી દબાવી રાખો', page: 'પાનું', notAvailable: 'આ પ્રોટોટાઇપમાં ઉપલબ્ધ નથી', comingSoonShort: 'જલ્દી',
    welcome: 'નમસ્તે', chooseLang: 'તમારી ભાષા પસંદ કરો', continue: 'આગળ', skip: 'પછી', back: 'પાછા',
    tableTitle: 'બંને ફોન જોડો', tableBody: 'આ એક જ વાર કરવાનું છે. એક સ્ટેન્ડના બંને ફોન એક જ ટેબલ કોડ વાપરે છે.',
    tableStart: 'આ પહેલો ફોન છે', tableJoin: 'મારી પાસે કોડ છે', tableCodeIs: 'ટેબલ કોડ', tableScan: 'બીજા ફોનથી આ સ્કેન કરો અથવા કોડ લખો.',
    tableEnter: '4 અક્ષરનો કોડ લખો', tablePaired: 'ટેબલ સાથે જોડાયું', join: 'જોડાઓ',
    thisMonth: 'આ મહિનાની ચોપડી', previous: 'જૂની ચોપડીઓ', open: 'ખોલો', spreads: 'પાનાં', spread: 'પાનું',
    comingSoon: 'જલ્દી આવશે', notInPrototype: 'આ પ્રોટોટાઇપમાં નથી', concluding: 'છેલ્લું પાનું', play: 'રમો',
    chooseSide: 'તમે સ્ટેન્ડની કઈ બાજુ બેઠા છો?', chooseSideBody: 'તમારા પાના પરનું રંગીન ટપકું જુઓ.',
    partner: 'સાથી', partnerWaiting: 'સાથીની રાહ', partnerOn: 'જોડાયેલ', taken: 'લેવાઈ ગઈ', watch: 'ફક્ત જુઓ',
    placeTitle: 'ફોન આડો કરો', placeBody: 'ફોનને પાનાની જેમ આડો પકડો. વચ્ચેનું વર્તુળ ચમકતી સંતરાની ગોળી પર રાખો, ઉખાણું ખુલશે.',
    start: 'શરૂ કરો', rotate: 'ફોન આડો કરો',
    settings: 'સેટિંગ્સ', language: 'ભાષા', table: 'ટેબલ', newTable: 'નવું ટેબલ', changeTable: 'ટેબલ બદલો',
    camera: 'કેમેરા', tapMode: 'ટેપ મોડ (કેમેરા વગર)', switchCamera: 'કેમેરા બદલો', subtitles: 'અવાજના સબટાઇટલ',
    outlines: 'છુપા ભાગ બતાવો (પ્રસ્તુતકર્તા)', resetGame: 'આ પાનું ફરી શરૂ કરો', exitGame: 'રમતમાંથી બહાર', close: 'બંધ કરો',
    confirmReset: 'ખાતરી માટે ફરી દબાવો', on: 'ચાલુ', off: 'બંધ', solvedOf: 'ટુકડા', about: 'પ્રોટોટાઇપ'
  }
};

let current = 'hi';
export const setUiLang = (l) => { current = T[l] ? l : 'en'; };
export const t = (key, vars) => {
  let s = (T[current] && T[current][key]) || T.en[key] || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
};
// Pick a language from a {en, hi, mr, gu} object.
export const pick = (obj) => (obj && (obj[current] || obj.en || obj.hi)) || '';
