/* ================= MAKER: LifeWeaver's person maker, inside Town Chronicle =================
   LifeWeaver's own generator (its lists, the generator and the life story) is copied in below unchanged,
   inside LW, so that its names don't clash with Town Chronicle's (both have R, num, cap, ERAS and fill).
   The one change: its random numbers can be swapped (LW.setRandom), so checks can repeat a run.
   Copied from Guyanonymous_lifeweaver / Guyanonymous_Lifeweaver_v1.html, the "core" script. */
const LW = (function () {
/* ================= CORE: data + generator + story (no page access) ================= */
let rnd = Math.random; // Town Chronicle: was "const", so checks can swap it (LW.setRandom)
const R = {
  int:(a,b)=>Math.floor(rnd()*(b-a+1))+a,
  pick:a=>a[Math.floor(rnd()*a.length)],
  chance:p=>rnd()<p,
  sample:(a,n)=>{const c=a.slice(),o=[];while(o.length<n&&c.length)o.push(c.splice(Math.floor(rnd()*c.length),1)[0]);return o;},
  wpick:arr=>{let t=arr.reduce((s,x)=>s+x.w,0),r=rnd()*t;for(const x of arr){if((r-=x.w)<0)return x;}return arr[arr.length-1];}
};
const tri=r=>Math.round((R.int(r[0],r[1])+R.int(r[0],r[1]))/2);
const num=v=>{if(v==null)return null;const m=String(v).match(/-?\d+/);return m?parseInt(m[0],10):null;};
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const lcSoft=s=>(s&&(/^[A-Z][a-z]/.test(s)||/^(A|An|The)\s/.test(s)))?s.charAt(0).toLowerCase()+s.slice(1):s;
const firstWord=s=>String(s||'').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z']/g,'');
function atPhrase(where){const w=(where||'').trim();if(!w)return '';if(/^(at|with|by|in)\s/i.test(w))return ' '+lcSoft(w);return ' at '+w;}
function workAt(where,pr){const w=(where||'').trim();if(!w)return '';if(/^own\s/i.test(w))return ` running ${pr?pr.P:'their'} ${lcSoft(w)}`;if(/^(freelance|self)/i.test(w))return ` doing ${lcSoft(w)}`;if(/^the open road/i.test(w))return ' on the open road';return ' at '+w;}
const article=w=>(/^[aeiou]/i.test(w)&&!/^(uni|eu|one|use)/i.test(w))?'an':'a';
const aN=w=>article(w)+' '+w;
const joinAnd=a=>{a=a.filter(Boolean);return a.length<2?(a[0]||''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];};
const splitList=s=>String(s||'').split(/\s*(?:,|;|\band\b)\s*/).map(x=>x.trim()).filter(Boolean);
let _uid=0; const uid=()=>Date.now().toString(36)+(++_uid).toString(36)+Math.floor(rnd()*1e4).toString(36);
const SAINTS=['Mary','John','Peter','Andrew','Margaret','Catherine','George','Michael','Anne','Luke','Paul','Bride'];

const COMMON={
  traits:['brave','cautious','curious','stubborn','kind','sharp-tongued','patient','restless','loyal','ambitious','shy','charming','practical','dreamy','generous','proud','funny','anxious','honest','secretive','hard-working','easy-going','hot-tempered','thoughtful','optimistic','cynical','gentle','bold','meticulous','impulsive'],
  likes:['long walks','music','good food','books','animals','gardening','quiet mornings','storms','dancing','games of chance','the sea','old stories','making things by hand','the company of children','hot drinks','travelling','puzzles','singing','fine clothes','the countryside'],
  fears:['deep water','being forgotten','poverty','illness','heights','being alone','failure','the dark','fire','losing family','crowds','change','being found out','growing old','debt'],
  quirks:['humming while working','collecting small stones','always arriving early','talking to animals','never sitting with {P} back to a door','keeping lists of everything','laughing at the wrong moments','fixing things that are not broken','quoting old sayings','sleeping very little','remembering every birthday','tapping {P} fingers when thinking','carrying a lucky charm','refusing to throw anything away','naming {P} tools'],
  values:['family','honesty','freedom','security','faith','knowledge','loyalty','justice','beauty','independence','tradition','adventure','kindness','success','community'],
  regrets:['words left unsaid to a parent','a friendship allowed to fade','not taking a chance when it came','working too much','a quarrel never mended','not standing up for someone who needed it','letting fear decide too often','staying too long in the wrong place'],
  hopes:['to see {P} children settled','to be remembered kindly','to find peace','to make {P} parents proud','to have a home of {P} own','to repay an old debt','to be truly understood by someone'],
  dreams:['to see the world','to write a book','to own land','to be famous','to build something that lasts','to fall deeply in love','to start again somewhere new'],
  builds:['slight','slim','wiry','average','sturdy','broad-shouldered','stocky','tall and lean','soft and round','athletic'],
  hairC:['black','dark brown','brown','chestnut','auburn','red','sandy','blond','fair','grey-streaked'],
  hairS:['short','cropped','long','curly','wavy','straight','braided','tied-back','thick','thinning'],
  eyes:['Brown','Dark brown','Hazel','Green','Grey','Blue','Pale blue','Amber'],
  features:['a crooked smile','a scar across one eyebrow','freckles','a deep laugh','a nose broken once and healed crooked','strong, work-worn hands','a quiet, steady voice','dimples','a habit of squinting','a gap between the front teeth','ink-stained fingers','a birthmark on the neck','very expressive eyebrows','a slight limp','an upright, careful posture'],
  turns:[
    {a:[13,25],w:'{S} fell deeply in love for the first time',c:'{S} became softer and more hopeful'},
    {w:'{S} made a mistake that badly hurt someone close',c:'{S} became much more careful with other people\'s feelings'},
    {a:[8,17],w:'{S} {was} given a great responsibility far too young',c:'{S} grew up quickly and learned to lead'},
    {w:'{S} {was} publicly humiliated in front of {P} whole community',c:'{S} became determined to prove everyone wrong'},
    {w:'{S} found a faith that gave {O} comfort',c:'{S} saw the world, and {P} place in it, in a new way'},
    {w:'{S} {was} badly let down by a close friend',c:'{S} became slower to trust people'},
    {w:'{S} survived a serious illness',c:'{S} became more grateful, and more willing to take chances'},
    {w:'A stranger showed {O} unexpected kindness at {P} lowest moment',c:'{S} spent years trying to pass that kindness on'}
  ],
  grief:['{S} grew up fast and became fiercely independent','{S} grew much closer to the rest of the family','{S} carried the loss quietly for many years','{S} resolved to live life more fully','{S} became deeply protective of the people {S} loved'],
  parted:['{S} learned to stand on {P} own two feet','{S} became wary of giving {P} heart away again','{S} felt freer than {S} had in years','{S} threw {X} into work'],
  switchWhy:['{S} grew tired of the old work','A chance conversation opened a new door for {O}','The family needed more money','{S} wanted work that meant something','{S} {was} pushed out of {P} old job','{S} finally chose to follow a long-held dream'],
  workNotes:['Learned a great deal','Became well liked there','Worked long hours for little pay','Hated almost every minute','Made lifelong friends there','','',''],
  mentorNotes:['Taught {O} more than any school did','Saw {P} talent early','Took {O} under their wing','Gave {O} a first real chance']
};

const PACKS={
modern:{
  label:'Modern day', wed:[20,35], years:[1930,2008], now:2026, life:[55,98], retire:[58,70], workAge:[16,18], jobLen:[2,12], divorce:0.35, marry:0.7, kids:[0,3], childDeath:0.01, sibs:3, heightAdj:0,
  names:{m:['James','Mohammed','Luca','Daniel','Arjun','Kwame','Mateo','Liam','Hiroshi','Oliver','Samuel','David','Noah','Carlos','Ethan','Ivan','Omar','Thomas','Michael','Peter','Ravi','Tomasz','Femi','Leo'],
         f:['Emma','Aisha','Sofia','Olivia','Priya','Grace','Mei','Isabella','Chloe','Fatima','Hannah','Maria','Amelia','Zara','Lucy','Ana','Nadia','Ruth','Sarah','Yasmin','Ingrid','Chiara','Ngozi','Rosa']},
  sur:['Smith','Garcia','Patel','Nguyen','Okafor','Müller','Rossi','Kim','Johnson','Brown','Silva','Kowalski','Haddad','Tanaka','O\'Brien','Jones','Martin','Novak','Andersson','Mensah','Campbell','Reyes','Fischer','Khan'],
  places:['London','Manchester','Glasgow','Dublin','New York','Chicago','Toronto','Sydney','Auckland','Cape Town','Lagos','Mumbai','Berlin','Lisbon','Madrid','Rome','Paris','Stockholm','Tokyo','Melbourne','Edinburgh','Leeds','Boston','Vancouver','Cardiff','Bristol'],
  subjects:['Medicine','Law','Engineering','Computing','Business','Education','Nursing','Arts','Sciences','History','Psychology','Architecture'],
  trades:['electrical work','plumbing','carpentry','cooking','mechanics','hairdressing'],
  edu:[
    {key:'primary',name:'Primary school',age:[5,5],len:[6,6],lvl:'basic',where:['{place} Primary School','St {saint}\'s Primary School','Park Road School, {place}']},
    {key:'secondary',name:'Secondary school',age:[11,11],len:[5,7],lvl:'secondary',where:['{place} High School','{place} Academy','St {saint}\'s College, {place}'],notes:['Left with good grades','Captained the debating team','Struggled with exams but loved art','Earned top marks in maths','Played in the school band','','']},
    {key:'apprentice',name:'Apprenticeship',age:[16,18],len:[3,4],lvl:'trade',subj:'trade',where:['{surname} & Sons, {place}','{place} Technical College','{place} City Works'],notes:['Qualified in {sub}','Learned the trade from an old master','']},
    {key:'uni',name:'University',age:[18,19],len:[3,4],lvl:'degree',subj:'degree',where:['the University of {place}','{place} University','{place} Metropolitan University'],notes:['Graduated with honours','Graduated after nearly dropping out','Graduated','']},
    {key:'post',name:'Postgraduate study',age:[21,24],len:[2,5],lvl:'advanced',subj:'degree',where:['the University of {place}','the {place} Institute'],notes:['Earned a master\'s degree','Earned a doctorate','Gained a professional qualification']}
  ],
  paths:[{k:['primary','secondary'],w:25},{k:['primary','secondary','apprentice'],w:20},{k:['primary','secondary','uni'],w:35},{k:['primary','secondary','uni','post'],w:15}],
  jobs:[
    {t:'Care worker',r:'none',c:'health',k:1},{t:'Nurse',r:'degree',s:'Nursing',c:'health',k:1},{t:'Senior nurse',r:'degree',s:'Nursing',c:'health',k:2},{t:'Doctor',r:'degree',s:'Medicine',c:'health',k:2},{t:'Consultant surgeon',r:'advanced',s:'Medicine',c:'health',k:3},
    {t:'Teaching assistant',r:'secondary',c:'education',k:1},{t:'Teacher',r:'degree',s:'Education',c:'education',k:2},{t:'Head teacher',r:'degree',s:'Education',c:'education',k:3},
    {t:'IT support technician',r:'secondary',c:'tech',k:1},{t:'Software developer',r:'degree',s:'Computing',c:'tech',k:2},{t:'Technology director',r:'degree',s:'Computing',c:'tech',k:3},
    {t:'Engineer',r:'degree',s:'Engineering',c:'engineering',k:2},{t:'Chief engineer',r:'degree',s:'Engineering',c:'engineering',k:3},
    {t:'Labourer',r:'none',c:'trades',k:1},{t:'Electrician',r:'trade',s:'electrical work',c:'trades',k:2},{t:'Plumber',r:'trade',s:'plumbing',c:'trades',k:2},{t:'Carpenter',r:'trade',s:'carpentry',c:'trades',k:2},{t:'Mechanic',r:'trade',s:'mechanics',c:'trades',k:2},{t:'Site manager',r:'trade',c:'trades',k:3},
    {t:'Shop assistant',r:'none',c:'business',k:1},{t:'Office administrator',r:'secondary',c:'business',k:1},{t:'Accountant',r:'degree',s:'Business',c:'business',k:2},{t:'Manager',r:'secondary',c:'business',k:2},{t:'Company director',r:'secondary',c:'business',k:3},
    {t:'Photographer',r:'none',c:'creative',k:1},{t:'Musician',r:'none',c:'creative',k:1},{t:'Graphic designer',r:'degree',s:'Arts',c:'creative',k:2},{t:'Journalist',r:'degree',s:'Arts',c:'creative',k:2},{t:'Novelist',r:'none',c:'creative',k:3},
    {t:'Waiter',r:'none',c:'food',k:1},{t:'Chef',r:'trade',s:'cooking',c:'food',k:2},{t:'Restaurant owner',r:'none',c:'food',k:3},
    {t:'Legal secretary',r:'secondary',c:'law',k:1},{t:'Lawyer',r:'degree',s:'Law',c:'law',k:2},{t:'Judge',r:'advanced',s:'Law',c:'law',k:3},
    {t:'Lab technician',r:'secondary',c:'science',k:1},{t:'Research scientist',r:'advanced',s:'Sciences',c:'science',k:2},{t:'Professor',r:'advanced',c:'science',k:3},
    {t:'Police officer',r:'secondary',c:'public',k:1},{t:'Firefighter',r:'secondary',c:'public',k:1},{t:'Civil servant',r:'secondary',c:'public',k:1},{t:'Police inspector',r:'secondary',c:'public',k:2},
    {t:'Delivery driver',r:'none',c:'transport',k:1},{t:'Bus driver',r:'none',c:'transport',k:1},{t:'Airline pilot',r:'secondary',c:'transport',k:2},
    {t:'Hairdresser',r:'trade',s:'hairdressing',c:'beauty',k:2},{t:'Salon owner',r:'trade',s:'hairdressing',c:'beauty',k:3},
    {t:'Architect',r:'advanced',s:'Architecture',c:'design',k:2},{t:'Psychologist',r:'advanced',s:'Psychology',c:'care',k:2},
    {t:'Archivist',r:'degree',s:'History',c:'heritage',k:1},{t:'Museum curator',r:'degree',s:'History',c:'heritage',k:2}
  ],
  employers:{health:['{place} General Hospital','St {saint}\'s Hospital','a care home in {place}','a GP practice in {place}'],education:['{place} Primary School','{place} High School','St {saint}\'s College'],tech:['{surname} Systems','a start-up in {place}','{place} Digital','a global software firm'],engineering:['{surname} Engineering','{place} Rail','a car maker in {place}'],trades:['{surname} Building Ltd','own business','{place} Council'],business:['{surname} & Co.','a bank in {place}','a supermarket in {place}','{surname} Holdings'],creative:['the {place} Herald','{surname} Studio','freelance work'],food:['a café in {place}','The {surname} Arms','{place} Bistro','a hotel kitchen in {place}'],law:['{surname} & Partners','the {place} courts','{place} Legal Aid'],science:['the University of {place}','the {place} Research Institute','a drug company'],public:['{place} Police','{place} Fire Service','the civil service','{place} Council'],transport:['{place} Buses','a courier firm','an international airline'],beauty:['a salon in {place}','own salon in {place}'],_:['{surname} & Associates','an organisation in {place}']},
  social:['Moved to {place}','Joined the {place} {club}','Took up {hobby}','Backpacked around {region}','Volunteered at a {charity}','Ran a marathon','Became a school governor','Started a book club','Joined a band','Became active in local politics','Moved to {place} for a fresh start'],
  lists:{club:['running club','choir','chess club','football club','amateur theatre group','rowing club','camera club'],hobby:['photography','gardening','the guitar','painting','rock climbing','cooking','birdwatching','pottery','cycling','knitting'],region:['South America','South-East Asia','Europe','Africa','Australia'],charity:['food bank','animal shelter','hospice','youth centre']},
  turns:[
    {w:'A serious car accident left {O} in hospital for months',c:'{S} learned not to waste time on things that did not matter'},
    {w:'{S} lost {P} job in an economic downturn',c:'{S} became careful with money for the rest of {P} life'},
    {a:[8,18],w:'A teacher saw promise in {O} and pushed {O} hard',c:'{S} started to believe {S} could achieve something'},
    {a:[18,35],w:'{S} spent a year travelling alone',c:'{S} came home more confident and open-minded'},
    {w:'{S} won a small fortune in a prize draw',c:'{S} found that money changed how others treated {O}'},
    {w:'A fire swept through {P} street',c:'{S} felt a strong urge to help others'},
    {w:'{S} moved abroad on impulse',c:'{S} discovered {S} could make a home anywhere'}
  ],
  deaths:['heart disease','cancer','a stroke','old age','pneumonia','a road accident','complications after surgery','dementia'],
  hopes:['to retire somewhere by the sea','to pay off the mortgage'], dreams:['to run a business of {P} own','to see {P} name in print'],
  features:[]
},
pre:{
  wed:[16,26], life:[28,78], retire:null, workAge:[10,14], jobLen:[8,40], divorce:0.02, marry:0.9, kids:[1,6], childDeath:0.25, sibs:5, heightAdj:-6,
  names:{m:['John','William','Thomas','Richard','Robert','Henry','Walter','Geoffrey','Hugh','Roger','Ralph','Simon','Edmund','Gilbert','Nicholas','Adam'],
         f:['Alice','Agnes','Joan','Margaret','Isabel','Matilda','Emma','Cecily','Beatrice','Eleanor','Juliana','Edith','Maud','Katherine','Rose','Avice']},
  sur:['Baker','Carter','Fletcher','Miller','Smith','Thatcher','Cooper','Ward','Atwood','Fuller','Mason','Shepherd','Webb','Draper','Hale','Turner','Wright','Brewer'],
  places:['York','Norwich','Bristol','Winchester','Canterbury','Lincoln','Chester','Oxford','Exeter','Coventry','Salisbury','Durham'],
  subjects:['Theology','Law','Medicine','the Liberal Arts'], trades:['smithing','weaving','masonry','baking','carpentry','tanning','brewing'],
  edu:[
    {key:'home',name:'Lessons at home',age:[5,6],len:[3,6],lvl:'basic',where:['At home','With the village priest','With a local widow'],notes:['Learned letters and prayers','Learned to count and reckon','']},
    {key:'school',name:'Grammar school',age:[7,8],len:[4,6],lvl:'secondary',where:['The parish school at {place}','The cathedral school at {place}','The grammar school at {place}'],notes:['Learned Latin','']},
    {key:'apprentice',name:'Apprenticeship',age:[11,14],len:[5,7],lvl:'trade',subj:'trade',where:['Master {surname} of {place}','The {sub} guild of {place}'],notes:['Became a journeyman in {sub}','Learned {sub} under a hard master','']},
    {key:'uni',name:'University',age:[14,16],len:[4,7],lvl:'degree',subj:'degree',where:['the University of Oxford','the University of Paris','the University of Bologna','the University of Cambridge','the University of Padua'],notes:['Took a degree in {sub}','Studied {sub} with great promise']}
  ],
  paths:[{k:[],w:35},{k:['home'],w:25},{k:['home','apprentice'],w:20},{k:['home','school'],w:8},{k:['home','school','uni'],w:7},{k:['apprentice'],w:5}],
  jobs:[
    {t:'Farmhand',r:'none',c:'land',k:1},{t:'Shepherd',r:'none',c:'land',k:1},{t:'Tenant farmer',r:'none',c:'land',k:2},{t:'Yeoman farmer',r:'none',c:'land',k:3},
    {t:'Blacksmith',r:'trade',s:'smithing',c:'craft',k:2},{t:'Master smith',r:'trade',s:'smithing',c:'craft',k:3},{t:'Weaver',r:'trade',s:'weaving',c:'craft',k:2},{t:'Mason',r:'trade',s:'masonry',c:'craft',k:2},{t:'Master mason',r:'trade',s:'masonry',c:'craft',k:3},{t:'Baker',r:'trade',s:'baking',c:'craft',k:2},{t:'Carpenter',r:'trade',s:'carpentry',c:'craft',k:2},{t:'Tanner',r:'trade',s:'tanning',c:'craft',k:2},{t:'Brewer',r:'trade',s:'brewing',c:'craft',k:2},
    {t:'Servant',r:'none',c:'service',k:1},{t:'Innkeeper',r:'none',c:'service',k:2},{t:'Steward',r:'basic',c:'service',k:3},
    {t:'Monk',tf:'Nun',r:'basic',c:'church',k:1},{t:'Priest',tf:'Prioress',r:'degree',s:'Theology',c:'church',k:2},{t:'Abbot',tf:'Abbess',r:'degree',s:'Theology',c:'church',k:3},
    {t:'Peddler',r:'none',c:'merchant',k:1},{t:'Merchant',r:'basic',c:'merchant',k:2},{t:'Wealthy merchant',r:'basic',c:'merchant',k:3},
    {t:'Scribe',r:'secondary',c:'learned',k:1},{t:'Notary',r:'degree',s:'Law',c:'learned',k:2},{t:'Physician',r:'degree',s:'Medicine',c:'learned',k:2},{t:'Royal councillor',r:'degree',c:'learned',k:3},
    {t:'Soldier',r:'none',c:'arms',k:1},{t:'Man-at-arms',r:'none',c:'arms',k:2},{t:'Captain of the guard',r:'none',c:'arms',k:3},
    {t:'Minstrel',r:'none',c:'arts',k:1},{t:'Painter',r:'none',c:'arts',k:2}
  ],
  employers:{land:['the manor of {place}','{surname}\'s farm','own land near {place}'],craft:['own workshop in {place}','the workshop of Master {surname}'],service:['the household of Lord {surname}','the {inn} at {place}'],church:['{place} Abbey','the church of St {saint}, {place}','{place} Priory'],merchant:['the {place} market','own trading house in {place}'],learned:['the court at {place}','the household of the Bishop of {place}'],arms:['the garrison at {place}','the household of Lord {surname}'],arts:['the open road','the court at {place}'],_:['{place}']},
  social:['Moved to {place}','Made a pilgrimage to {shrine}','Became a churchwarden','Took part in the great fair at {place}','Learned to play the {instrument}','Became godparent to a neighbour\'s child','Travelled to {place} for the great market','Joined a religious brotherhood'],
  lists:{shrine:['Canterbury','Walsingham','Santiago de Compostela','Rome'],instrument:['lute','pipe','fiddle'],inn:['Red Lion','White Hart','Bell','Swan']},
  turns:[
    {w:'Plague came to {place}',c:'{S} never again took a single day for granted'},
    {w:'The harvest failed and the family went hungry',c:'{S} became thrifty and hard-headed about money'},
    {w:'{S} {was} caught up in a war between great lords',c:'{S} learned to keep {P} head down and trust few'},
    {w:'{S} {was} accused of a crime {S} did not commit',c:'{S} became fiercely devoted to justice'},
    {w:'A fire destroyed the family home',c:'{S} learned to rebuild without complaint'},
    {w:'A wealthy patron took an interest in {O}',c:'{S} gained confidence and ambition'},
    {w:'{S} had a vision during a fever',c:'{S} became deeply religious'}
  ],
  deaths:['plague','a fever','old age','a winter sickness','an injury that turned bad','consumption','a fall','wounds taken in war'],
  hopes:['to own a plot of land','to see the new church finished'], dreams:['to become a master of {P} trade','to go on pilgrimage to Rome','to marry above {P} station'],
  features:[]
},
ind:{
  wed:[18,30], life:[35,85], retire:[60,72], workAge:[10,14], jobLen:[5,25], divorce:0.04, marry:0.85, kids:[1,7], childDeath:0.15, sibs:6, heightAdj:-4,
  names:{m:['George','Albert','Arthur','Frederick','Charles','Edward','Harry','Alfred','Joseph','Walter','Samuel','Ernest','William','James','John','Henry'],
         f:['Mary','Elizabeth','Sarah','Ann','Emily','Florence','Ada','Harriet','Charlotte','Martha','Eliza','Victoria','Jane','Alice','Edith','Clara']},
  sur:['Smith','Jones','Taylor','Brown','Wilson','Robinson','Wood','Thompson','Wright','Walker','White','Hughes','Holt','Barlow','Ashworth','Pickering','Dawson','Marsh'],
  places:['London','Manchester','Liverpool','Birmingham','Leeds','Sheffield','Bristol','Edinburgh','Glasgow','Newcastle','Bath','Dublin','Bradford','Halifax'],
  subjects:['Medicine','Law','Divinity','Engineering','Classics','Natural Sciences'], trades:['printing','smithing','carpentry','engineering','dressmaking','baking','shoemaking'],
  edu:[
    {key:'dame',name:'Dame school',age:[4,6],len:[2,4],lvl:'basic',where:['Mrs {surname}\'s dame school, {place}','The village school, near {place}'],notes:['Learned to read and write','']},
    {key:'board',name:'Elementary school',age:[5,7],len:[5,7],lvl:'basic',where:['{place} Board School','St {saint}\'s National School, {place}','{place} Ragged School'],notes:['Learned the three Rs','Won a prize for good attendance','']},
    {key:'grammar',name:'Grammar school',age:[10,12],len:[5,7],lvl:'secondary',where:['{place} Grammar School','St {saint}\'s College, {place}'],notes:['Learned Latin and Greek','Was head of the school','']},
    {key:'apprentice',name:'Apprenticeship',age:[13,15],len:[5,7],lvl:'trade',subj:'trade',where:['{surname}\'s works, {place}','Master {surname} of {place}'],notes:['Qualified in {sub}','Was bound to a strict master','']},
    {key:'uni',name:'University',age:[17,19],len:[3,4],lvl:'degree',subj:'degree',where:['Oxford University','Cambridge University','the University of Edinburgh','the University of London','Trinity College Dublin','the University of Glasgow'],notes:['Took a degree in {sub}','Graduated with honours','']},
    {key:'prof',name:'Professional training',age:[21,23],len:[2,4],lvl:'advanced',subj:'degree',where:['the Inns of Court','a London hospital medical school','{place} Theological College'],notes:['Qualified to practise','']}
  ],
  paths:[{k:[],w:15},{k:['dame'],w:25},{k:['board'],w:20},{k:['dame','apprentice'],w:15},{k:['board','apprentice'],w:10},{k:['dame','grammar'],w:6},{k:['dame','grammar','uni'],w:6},{k:['dame','grammar','uni','prof'],w:3}],
  jobs:[
    {t:'Farm labourer',r:'none',c:'labour',k:1},{t:'Mill hand',r:'none',c:'labour',k:1},{t:'Coal miner',r:'none',c:'labour',k:1},{t:'Mill overseer',r:'basic',c:'labour',k:2},{t:'Factory foreman',r:'basic',c:'labour',k:3},
    {t:'Kitchen servant',r:'none',c:'domestic',k:1},{t:'Footman',tf:'Housemaid',r:'none',c:'domestic',k:1},{t:'Cook',r:'none',c:'domestic',k:2},{t:'Butler',tf:'Housekeeper',r:'basic',c:'domestic',k:3},
    {t:'Junior clerk',r:'basic',c:'clerical',k:1},{t:'Clerk',r:'basic',c:'clerical',k:2},{t:'Chief clerk',r:'secondary',c:'clerical',k:3},
    {t:'Printer',r:'trade',s:'printing',c:'trades',k:2},{t:'Blacksmith',r:'trade',s:'smithing',c:'trades',k:2},{t:'Carpenter',r:'trade',s:'carpentry',c:'trades',k:2},{t:'Engine fitter',r:'trade',s:'engineering',c:'trades',k:2},{t:'Dressmaker',r:'trade',s:'dressmaking',c:'trades',k:2},{t:'Baker',r:'trade',s:'baking',c:'trades',k:2},{t:'Shoemaker',r:'trade',s:'shoemaking',c:'trades',k:2},{t:'Master craftsman',r:'trade',c:'trades',k:3},
    {t:'Shop assistant',r:'none',c:'shop',k:1},{t:'Shopkeeper',r:'basic',c:'shop',k:2},{t:'Department store manager',r:'basic',c:'shop',k:3},
    {t:'Tutor',tf:'Governess',r:'secondary',c:'professions',k:1},{t:'Schoolteacher',r:'secondary',c:'professions',k:2},{t:'Clergyman',r:'degree',s:'Divinity',c:'professions',k:2},{t:'Doctor',r:'degree',s:'Medicine',c:'professions',k:2},{t:'Surgeon',r:'advanced',s:'Medicine',c:'professions',k:3},{t:'Solicitor',r:'degree',s:'Law',c:'professions',k:2},{t:'Barrister',r:'advanced',s:'Law',c:'professions',k:3},{t:'Civil engineer',r:'degree',s:'Engineering',c:'professions',k:2},
    {t:'Soldier',r:'none',c:'military',k:1},{t:'Sailor',r:'none',c:'military',k:1},{t:'Sergeant',r:'none',c:'military',k:2},{t:'Ship\'s captain',r:'basic',c:'military',k:3},
    {t:'Music-hall performer',r:'none',c:'arts',k:1},{t:'Journalist',r:'secondary',c:'arts',k:2},{t:'Photographer',r:'basic',c:'arts',k:2},{t:'Novelist',r:'basic',c:'arts',k:3}
  ],
  employers:{labour:['{place} Cotton Mill','the {surname} Colliery','{surname}\'s farm, near {place}','the {place} Ironworks'],domestic:['the household at {surname} Hall','a townhouse in {place}'],clerical:['{surname} & Co., {place}','the {place} Railway Company','the Bank of {place}'],trades:['own workshop in {place}','{surname}\'s works, {place}'],shop:['{surname}\'s Drapery, {place}','a grocer\'s in {place}'],professions:['the parish of {place}','the {place} Infirmary','chambers in {place}','{place} Grammar School'],military:['the Army','the Navy','a merchant ship out of {place}'],arts:['the {place} Gazette','the {place} Empire Theatre','own studio in {place}'],_:['{place}']},
  social:['Moved to {place} in search of work','Joined the {place} {club}','Signed the temperance pledge','Took up {hobby}','Joined the chapel choir','Emigrated to {colony}','Joined a friendly society','Took a seaside holiday at {seaside}','Joined a trade union','Became a Sunday school teacher'],
  lists:{club:['brass band','cricket club','debating society','reading room','mechanics\' institute'],hobby:['botany','embroidery','the piano','fishing','pigeon-keeping','watercolour painting'],colony:['Canada','Australia','New Zealand','America'],seaside:['Brighton','Scarborough','Blackpool','Margate']},
  turns:[
    {w:'A cholera outbreak swept through {place}',c:'{S} became obsessed with cleanliness and order'},
    {w:'The mill where the family worked closed suddenly',c:'{S} vowed never to depend on one employer again'},
    {w:'{S} {was} injured in a works accident',c:'{S} turned to quieter work and to books'},
    {w:'{S} heard a reformer speak at a public meeting',c:'{S} became involved in campaigns for working people'},
    {w:'{S} spent a winter in the workhouse',c:'{S} never forgot what poverty felt like'},
    {w:'{S} inherited a small sum from a distant relative',c:'{S} gained a taste for independence'},
    {w:'War took many of {P} friends',c:'{S} became quieter and more thoughtful'}
  ],
  deaths:['consumption','cholera','old age','pneumonia','heart failure','a fever','a mining accident','influenza','a stroke'],
  hopes:['to keep the family out of the workhouse','to give {P} children an education'], dreams:['to open a shop of {P} own','to emigrate and start afresh'],
  features:['a pocket watch always on a chain','soot-darkened fingernails']
},
fantasy:{
  label:'Fantasy', wed:[17,30], years:[600,960], now:1000, life:[35,90], retire:[55,75], workAge:[12,16], jobLen:[4,25], divorce:0.12, marry:0.75, kids:[0,5], childDeath:0.1, sibs:4, heightAdj:-2,
  fmt:y=>'Year '+y,
  names:{m:['Aldric','Bran','Cedric','Doran','Eamon','Faelan','Garrick','Hadrian','Ivo','Joren','Kael','Lorcan','Marek','Orin','Perrin','Roderic','Soren','Tobin','Varian','Wystan'],
         f:['Aeris','Brynna','Calla','Delphine','Elowen','Fenna','Gwyneth','Halia','Isolde','Jessamy','Kestrel','Liora','Maren','Nerys','Orla','Rhosyn','Seren','Talia','Vela','Wren']},
  sur:['Ashdown','Blackwood','Brightwater','Coldbrook','Dunmere','Emberly','Fairwind','Greyhallow','Hollowmere','Ironwood','Larkspur','Mossgrove','Ravenmoor','Stonebridge','Thornfield','Whitlock','Wyndham','Copperkettle'],
  places:['Eldermoor','Port Caldris','Highfen','Varrowdale','Thornwick','Saltmere','Vessaly','Kingsreach','Mirefall','Duskhollow','Amberleigh','Stormhold'],
  subjects:['Arcane Arts','Faith','Healing','Lore','Law'], trades:['smithing','herbcraft','woodcraft','brewing','seafaring'],
  edu:[
    {key:'hearth',name:'Hearth-schooling',age:[5,6],len:[4,6],lvl:'basic',where:['the village of {place}','the temple school of {place}'],notes:['Learned letters and the old songs','']},
    {key:'apprentice',name:'Apprenticeship',age:[11,14],len:[4,7],lvl:'trade',subj:'trade',where:['Master {surname} of {place}','the {sub} hall of {place}'],notes:['Earned the mark of a journeyman','Learned {sub} under a hard master','']},
    {key:'squire',name:'Squire training',age:[12,14],len:[5,7],lvl:'trade',subj:'fixed:arms',where:['the household of Sir {surname}','the keep at {place}'],notes:['Was knighted on the field','Earned {P} spurs','']},
    {key:'academy',name:'Academy',age:[14,17],len:[4,7],lvl:'degree',subj:'degree',where:['the Academy of {place}','the Grand College of {place}','the Royal Collegium of {place}'],notes:['Passed the Trials with distinction','Graduated, though not without scandal','']},
    {key:'tower',name:'Mastery studies',age:[20,24],len:[3,10],lvl:'advanced',subj:'degree',where:['the Tower of {surname}','the Inner Circle of {place}'],notes:['Was named a master','']}
  ],
  paths:[{k:[],w:15},{k:['hearth'],w:25},{k:['hearth','apprentice'],w:25},{k:['squire'],w:10},{k:['hearth','academy'],w:15},{k:['hearth','academy','tower'],w:10}],
  jobs:[
    {t:'Farmer',r:'none',c:'land',k:1},{t:'Herder',r:'none',c:'land',k:1},{t:'Landholder',r:'none',c:'land',k:3},
    {t:'Smith',r:'trade',s:'smithing',c:'craft',k:2},{t:'Master smith',r:'trade',s:'smithing',c:'craft',k:3},{t:'Herbalist',r:'trade',s:'herbcraft',c:'craft',k:2},{t:'Woodcarver',r:'trade',s:'woodcraft',c:'craft',k:2},{t:'Brewer',r:'trade',s:'brewing',c:'craft',k:2},
    {t:'Town guard',r:'none',c:'arms',k:1,e:['the {place} watch']},{t:'Mercenary',r:'none',c:'arms',k:2,e:['the Company of the {beast}']},{t:'Knight',r:'trade',s:'arms',c:'arms',k:2,e:['the knights of {place}','the household of Lord {surname}']},{t:'Knight-commander',r:'trade',s:'arms',c:'arms',k:3,e:['the knights of {place}']},
    {t:'Hedge-mage',r:'degree',s:'Arcane Arts',c:'magic',k:1},{t:'Court wizard',r:'degree',s:'Arcane Arts',c:'magic',k:2},{t:'Archmage',r:'advanced',s:'Arcane Arts',c:'magic',k:3},
    {t:'Acolyte',r:'basic',c:'faith',k:1},{t:'Priest',tf:'Priestess',r:'degree',s:'Faith',c:'faith',k:2},{t:'High priest',tf:'High priestess',r:'advanced',s:'Faith',c:'faith',k:3},
    {t:'Healer',r:'degree',s:'Healing',c:'healing',k:2},{t:'Master healer',r:'advanced',s:'Healing',c:'healing',k:3},
    {t:'Scribe',r:'basic',c:'lore',k:1},{t:'Loremaster',r:'degree',s:'Lore',c:'lore',k:2},{t:'Royal archivist',r:'advanced',s:'Lore',c:'lore',k:3},
    {t:'Peddler',r:'none',c:'trade',k:1},{t:'Merchant',r:'basic',c:'trade',k:2},{t:'Guildmaster',r:'basic',c:'trade',k:3},
    {t:'Deckhand',r:'none',c:'sea',k:1},{t:'Ship\'s navigator',r:'trade',s:'seafaring',c:'sea',k:2},{t:'Sea captain',r:'trade',s:'seafaring',c:'sea',k:3},
    {t:'Bard',r:'none',c:'road',k:1},{t:'Ranger',r:'none',c:'road',k:2},{t:'Monster hunter',r:'none',c:'road',k:3},
    {t:'Smuggler',r:'none',c:'shadow',k:2},{t:'Magistrate',r:'degree',s:'Law',c:'law',k:2},{t:'High justice',r:'advanced',s:'Law',c:'law',k:3},
    {t:'Stablehand',r:'none',c:'service',k:1},{t:'Innkeeper',r:'none',c:'service',k:2}
  ],
  employers:{land:['own fields near {place}','the estates of Lord {surname}'],craft:['own forge in {place}','a workshop in {place}'],arms:['the household of Lord {surname}','the garrison at {place}'],magic:['the court of {place}','the Arcane College of {place}','the Mages\' Guild of {place}'],faith:['the Temple of the {god} in {place}'],healing:['the Healers\' House of {place}'],lore:['the Grand Library of {place}'],trade:['the {place} market','own trading company in {place}'],sea:['the ship {ship}','the port of {place}'],road:['the open road'],shadow:['the docks of {place}'],law:['the courts of {place}'],service:['the {inn} in {place}'],_:['{place}']},
  social:['Moved to {place}','Joined a travelling company of players','Took up {hobby}','Swore an oath of friendship at the {place} festival','Fought in the {place} tourney','Joined the {guild} Guild','Went on a pilgrimage to {shrine}','Became keeper of a village shrine','Travelled beyond the {region}'],
  lists:{hobby:['the harp','falconry','chess','swordplay','star-gazing','wood carving'],guild:['Merchants\'','Lantern-makers\'','Cartographers\'','Brewers\''],shrine:['the Weeping Falls','the Moon Temple','the Old Oak'],region:['Northern Wastes','Ashen Mountains','Sunken Sea','Eastern Steppe'],beast:['Grey Wolf','Iron Stag','Black Raven','Silver Hart'],god:['Dawn','Seven Stars','Quiet Mother','Eternal Flame'],ship:['Wavecutter','Morning Star','Lady Mira','Saltwind'],inn:['Drowsy Dragon','Golden Goose','Three Lanterns','Wandering Harp','Crooked Crown']},
  turns:[
    {w:'Dragon fire burned {P} home village',c:'{S} swore never to feel helpless again'},
    {a:[6,20],w:'{S} discovered a hidden talent for magic',c:'{S} felt both gifted and set apart from others'},
    {w:'A stranger saved {O} from bandits on the road',c:'{S} spent years trying to repay the debt'},
    {a:[5,18],w:'A prophecy was spoken over {O} at a festival',c:'{S} never quite escaped the feeling of being watched by fate'},
    {w:'{S} {was} lost for days in the Old Forest',c:'{S} came back quieter, with a deep respect for wild places'},
    {w:'{S} betrayed a friend to save {X}',c:'{S} carried the guilt for the rest of {P} life'},
    {w:'The old king died and war followed',c:'{S} learned that the world could change overnight'}
  ],
  deaths:['old age','a fever','a wound from a beast','a fall while climbing','a magical accident','wounds taken in battle','a winter sickness','poison, though it was never proven'],
  hopes:['to see peace return to the realm','to be granted land of {P} own'], dreams:['to slay a dragon','to have {P} deeds sung in the great halls','to find the lost city of {place}'],
  features:['a tattoo of a guild sigil','eyes that seem to catch the light','a silver streak in the hair']
},
scifi:{
  label:'Science fiction', wed:[22,40], years:[2160,2330], now:2400, life:[70,130], retire:[75,100], workAge:[18,20], jobLen:[3,15], divorce:0.35, marry:0.6, kids:[0,3], childDeath:0.01, sibs:2, heightAdj:3,
  names:{m:['Ari','Kenji','Orion','Mateo','Soren','Kai','Idris','Tomas','Ezra','Cassius','Ravi','Theo','Dax','Femi','Luca','Jun'],
         f:['Zara','Nova','Lyra','Amara','Juno','Rhea','Leilani','Yuki','Nia','Mira','Sela','Vega','Ines','Tova','Ama','Kira']},
  sur:['Okafor','Nakamura','Vasquez','Lindqvist','Chen-Abara','Moreau','Patel','Kowalczyk','Adeyemi','Sato-Reyes','Ivanova','Haddad','Osei','Brennan','Takahashi','Nguyen','Mbeki','Rossi'],
  places:['New Lagos','Luna City','Tharsis Dome','Ceres Station','Europa Deep','Kepler Ring','Titan Harbour','Neo Singapore','Olympus Heights','Ganymede Port','Vesta Outpost'],
  subjects:['Xenobiology','Astrophysics','Medicine','AI Ethics','Engineering','Planetary Law','Terraforming'], trades:['hydroponics','drone mechanics','orbital construction','fusion maintenance','piloting'],
  edu:[
    {key:'pod',name:'Primary learning pod',age:[4,5],len:[7,7],lvl:'basic',where:['{place} learning commons','Home-tutor AI “{ai}”'],notes:['Was flagged as gifted in maths','']},
    {key:'sec',name:'Secondary academy',age:[11,12],len:[6,7],lvl:'secondary',where:['{place} Academy','the {place} Open School'],notes:['Captained the zero-g team','Spent more time in simulations than lessons','']},
    {key:'cert',name:'Technical certification',age:[18,19],len:[2,3],lvl:'trade',subj:'trade',where:['{place} Technical Institute','the {place} shipyards training school'],notes:['Earned a certificate in {sub}','']},
    {key:'uni',name:'University',age:[18,19],len:[3,5],lvl:'degree',subj:'degree',where:['the University of {place}','the Lunar Polytechnic','the Interplanetary University'],notes:['Graduated with honours','Graduated','']},
    {key:'post',name:'Advanced research',age:[22,24],len:[3,6],lvl:'advanced',subj:'degree',where:['the {place} Institute of Advanced Study','the Deep Space Research Station'],notes:['Earned a doctorate','']}
  ],
  paths:[{k:['pod','sec'],w:20},{k:['pod','sec','cert'],w:30},{k:['pod','sec','uni'],w:30},{k:['pod','sec','uni','post'],w:20}],
  jobs:[
    {t:'Nutrient vat operator',r:'none',c:'agri',k:1},{t:'Hydroponics technician',r:'trade',s:'hydroponics',c:'agri',k:2},{t:'Farm-ring supervisor',r:'trade',s:'hydroponics',c:'agri',k:3},
    {t:'Ship crew',r:'none',c:'space',k:1},{t:'Cargo pilot',r:'trade',s:'piloting',c:'space',k:2},{t:'Starship captain',r:'trade',s:'piloting',c:'space',k:3},
    {t:'Drone mechanic',r:'trade',s:'drone mechanics',c:'build',k:2},{t:'Orbital construction worker',r:'trade',s:'orbital construction',c:'build',k:2},{t:'Construction chief',r:'trade',s:'orbital construction',c:'build',k:3},{t:'Fusion technician',r:'trade',s:'fusion maintenance',c:'build',k:2},
    {t:'Lab assistant',r:'secondary',c:'science',k:1},{t:'Xenobiologist',r:'degree',s:'Xenobiology',c:'science',k:2},{t:'Astrophysicist',r:'advanced',s:'Astrophysics',c:'science',k:2},{t:'Chief scientist',r:'advanced',c:'science',k:3},
    {t:'Med-tech',r:'secondary',c:'health',k:1},{t:'Physician',r:'degree',s:'Medicine',c:'health',k:2},{t:'Chief of medicine',r:'advanced',s:'Medicine',c:'health',k:3},
    {t:'AI ethicist',r:'degree',s:'AI Ethics',c:'ai',k:2},{t:'Synthetic-minds advocate',r:'advanced',s:'AI Ethics',c:'ai',k:3},
    {t:'Records officer',r:'secondary',c:'gov',k:1},{t:'Colonial lawyer',r:'degree',s:'Planetary Law',c:'gov',k:2},{t:'Colony administrator',r:'degree',c:'gov',k:3},
    {t:'Terraforming engineer',r:'degree',s:'Terraforming',c:'terra',k:2},{t:'Terraforming director',r:'advanced',s:'Terraforming',c:'terra',k:3},{t:'Systems engineer',r:'degree',s:'Engineering',c:'terra',k:2},
    {t:'Habitat steward',r:'none',c:'service',k:1},{t:'Café owner',r:'none',c:'service',k:2},
    {t:'Holo-artist',r:'none',c:'media',k:2},{t:'Feed journalist',r:'secondary',c:'media',k:2},
    {t:'Security officer',r:'secondary',c:'security',k:1},{t:'Security chief',r:'secondary',c:'security',k:3},
    {t:'Asteroid miner',r:'none',c:'mining',k:1},{t:'Mining foreman',r:'none',c:'mining',k:2}
  ],
  employers:{_:['{corp} Corporation','the {place} Colony Authority','the Solar Commonwealth','the research vessel {ship}','{place} Habitat','freelance work']},
  social:['Moved to {place}','Joined the {place} zero-g {club}','Took up {hobby}','Spent a year on a generation-ship exchange','Volunteered for a colony rescue mission','Became a habitat council delegate','Joined a virtual-reality art collective','Visited the drowned cities of Old Earth'],
  lists:{club:['football league','choir','dance troupe','racing team'],hobby:['low-gravity bonsai','vintage 21st-century films','holo-painting','asteroid prospecting','cooking real food'],corp:['Helix','Aurora','Kessler-Abara','Ironsun','Meridian','NovaCore','Tycho'],ship:['Perseverance','Long Patience','Anansi','Hope of Ceres'],ai:['Sage','Pip','Odin-7','Mother Hen']},
  turns:[
    {w:'A hull breach on {P} habitat killed dozens',c:'{S} became obsessive about safety and preparedness'},
    {w:'News broke of microbial life found beneath the ice of Europa',c:'{S} felt the universe suddenly become much bigger'},
    {w:'{S} had {P} memories partly restored from backup after an accident',c:'{S} was never quite sure which feelings were truly {P} own'},
    {w:'{S} lost {P} citizenship in a colony dispute',c:'{S} learned to live between worlds'},
    {w:'An AI companion of many years was shut down',c:'{S} became an advocate for synthetic minds'},
    {w:'{S} won a lottery berth on an outbound colony ship, and turned it down',c:'{S} committed to building a life where {S} stood'},
    {w:'{S} spent eighteen months in cryo-sleep',c:'{S} woke to find the world had moved on without {O}'}
  ],
  deaths:['old age','a radiation illness','a shuttle accident','a rare neural disorder','decompression in an accident','heart failure','a fever picked up on a frontier world'],
  hopes:['to see Mars breathable in {P} lifetime','to earn full citizenship'], dreams:['to travel beyond the solar system','to be the first to set foot on a new world'],
  features:['a cybernetic left eye','faint glowing implant lines behind one ear','a prosthetic arm','a tall, low-gravity frame']
}};
PACKS.pre.label='Historical'; PACKS.ind.label='Historical';

const ERAS={
  medieval:{label:'Medieval (1150–1450)',pack:'pre',years:[1150,1420]},
  renaissance:{label:'Renaissance & Tudor (1450–1650)',pack:'pre',years:[1450,1620]},
  georgian:{label:'Georgian (1700–1830)',pack:'ind',years:[1700,1790],exStages:['board'],exJobs:['Photographer','Music-hall performer','Department store manager']},
  victorian:{label:'Victorian (1837–1901)',pack:'ind',years:[1810,1875]},
  edwardian:{label:'Early 1900s (1890–1950)',pack:'ind',years:[1870,1920],exStages:['dame']}
};
const SETTING_LABELS={modern:'Modern day',historical:'Historical',fantasy:'Fantasy',scifi:'Science fiction'};

function settingData(setting,era){
  let d;
  if(setting==='historical'){
    const E=ERAS[era]||ERAS.victorian, pk=PACKS[E.pack];
    d=Object.assign({},pk,E);
    d.alwaysDead=true; d.now=2026;
    d.edu=pk.edu.filter(s=>!(E.exStages||[]).includes(s.key));
    d.jobs=pk.jobs.filter(j=>!(E.exJobs||[]).includes(j.t));
    d.paths=pk.paths.filter(p=>p.k.every(k=>d.edu.some(s=>s.key===k)));
    d.label='Historical — '+E.label;
  } else d=Object.assign({},PACKS[setting]||PACKS.modern);
  d.fmt=d.fmt||(y=>String(y));
  return d;
}

function pronouns(g){
  if(g==='Man')return{S:'he',O:'him',P:'his',X:'himself',was:'was',has:'has',is:'is',pl:false};
  if(g==='Woman')return{S:'she',O:'her',P:'her',X:'herself',was:'was',has:'has',is:'is',pl:false};
  return{S:'they',O:'them',P:'their',X:'themself',was:'were',has:'have',is:'are',pl:true};
}
const PRON_KEYS=['S','O','P','X','was','has','is'];
function fill(str,S,pr,ctx){
  return String(str).replace(/\{(\w+)\}/g,(m,k)=>{
    if(ctx&&ctx[k]!=null)return ctx[k];
    if(pr&&PRON_KEYS.includes(k))return pr[k];
    if(k==='place')return R.pick(S.places);
    if(k==='surname')return R.pick(S.sur);
    if(k==='saint')return R.pick(SAINTS);
    if(S.lists&&S.lists[k])return R.pick(S.lists[k]);
    return m;
  });
}

/* ---------- person model ---------- */
const FIELDS=[
  {key:'firstName',label:'First name',g:'basics'},{key:'lastName',label:'Last name',g:'basics'},
  {key:'gender',label:'Gender',g:'basics',type:'select',options:['Man','Woman','Non-binary']},
  {key:'birthYear',label:'Year born',g:'basics',num:true},{key:'birthPlace',label:'Birthplace',g:'basics'},
  {key:'home',label:'Lives in / last lived in',g:'basics'},
  {key:'deathYear',label:'Year died',g:'basics',num:true,hint:'Blank means still alive. Lock it blank to keep them alive.'},
  {key:'deathCause',label:'Cause of death',g:'basics'},
  {key:'height',label:'Height',g:'looks'},{key:'build',label:'Build',g:'looks'},{key:'hair',label:'Hair',g:'looks'},{key:'eyes',label:'Eyes',g:'looks'},
  {key:'features',label:'Notable features',g:'looks',type:'area'},
  {key:'traits',label:'Personality traits',g:'personality'},{key:'likes',label:'Likes',g:'personality'},{key:'fears',label:'Fears',g:'personality'},
  {key:'quirk',label:'Habits & quirks',g:'personality'},{key:'values',label:'What matters most',g:'personality'},
  {key:'hopes',label:'Hopes',g:'personality',type:'area'},{key:'dreams',label:'Dreams',g:'personality',type:'area'},{key:'regret',label:'Biggest regret',g:'personality',type:'area'}
];
const LISTNAMES=['family','edu','work','social','turning','custom'];
const LISTS={
  family:{title:'Family & people in their life',one:'person',hint:'Parents, brothers and sisters, partners, children, friends, mentors. “Met / married” is the year they came into the person’s life; “Until” is when a relationship ended.',
    cols:[{k:'relation',label:'Relation',w:'9rem',dl:'relOptions'},{k:'name',label:'Name'},{k:'born',label:'Born',w:'5.5rem'},{k:'died',label:'Died',w:'5.5rem'},{k:'joined',label:'Met / married',w:'6.5rem'},{k:'until',label:'Until',w:'5.5rem'},{k:'notes',label:'Notes'}]},
  edu:{title:'Education record',one:'school or course',hint:'Schools, apprenticeships, universities and other training.',
    cols:[{k:'start',label:'From',w:'5.5rem'},{k:'end',label:'To',w:'5.5rem'},{k:'what',label:'Stage / course'},{k:'where',label:'Where'},{k:'notes',label:'Notes'}]},
  work:{title:'Work record',one:'job',hint:'Every job in order. Leave “To” blank for a job they still do.',
    cols:[{k:'start',label:'From',w:'5.5rem'},{k:'end',label:'To',w:'5.5rem'},{k:'title',label:'Job'},{k:'where',label:'Employer / place'},{k:'notes',label:'Notes'}]},
  social:{title:'Social record',one:'social event',hint:'Moves, clubs, hobbies, travels, community roles. Write each as an action, e.g. “Moved to Leeds”.',
    cols:[{k:'year',label:'Year',w:'5.5rem'},{k:'what',label:'What happened'}]},
  turning:{title:'Turning points',one:'turning point',hint:'Moments that changed the course of their life, and how each one changed them.',
    cols:[{k:'year',label:'Year',w:'5.5rem'},{k:'what',label:'What happened',area:true},{k:'change',label:'How it changed them',area:true}]},
  custom:{title:'Your own timeline events',one:'event',hint:'Anything else you want on the timeline. The app never changes these.',
    cols:[{k:'year',label:'Year',w:'5.5rem'},{k:'what',label:'Event'}]}
};
const REL_OPTIONS=['Mother','Father','Stepmother','Stepfather','Sister','Brother','Half-sister','Half-brother','Spouse','Partner','Former spouse','Former partner','Daughter','Son','Child','Grandmother','Grandfather','Friend','Mentor','Rival','Guardian'];

function blankPerson(setting,era){
  const f={}; FIELDS.forEach(d=>f[d.key]={v:'',l:false});
  const lists={}; LISTNAMES.forEach(n=>lists[n]=[]);
  return {id:uid(),setting:setting||'modern',era:era||'victorian',f,lists,story:{v:'',l:false},created:Date.now(),updated:Date.now()};
}
function mk(o){const e={id:uid(),locked:false};for(const k in o)e[k]=(o[k]==null?'':String(o[k]));e.locked=false;return e;}
function relKind(rel){
  const r=String(rel||'').toLowerCase();
  if(/grand/.test(r))return 'other';
  if(/mother|father|parent|guardian/.test(r))return 'parent';
  if(/brother|sister|sibling/.test(r))return 'sibling';
  if(/spouse|partner|husband|wife/.test(r))return 'partner';
  if(/\bson\b|daughter|child/.test(r))return 'child';
  return 'other';
}
const RANK={basic:1,trade:1,secondary:2,degree:3,advanced:4};
function maxRank(levels){let m=0;levels.forEach(l=>{if(RANK[l]>m)m=RANK[l];});return m;}
function satisfies(levels,r){if(!r||r==='none')return true;if(r==='trade')return levels.has('trade');return maxRank(levels)>=RANK[r];}
function qualifies(j,q){
  if(j.r==='none')return true;
  if(!satisfies(q.levels,j.r))return false;
  if(j.s&&!q.subs.has(j.s.toLowerCase()))return false;
  return true;
}
function findJob(S,title){const t=String(title||'').trim().toLowerCase();if(!t)return null;return S.jobs.find(j=>j.t.toLowerCase()===t||(j.tf&&j.tf.toLowerCase()===t))||null;}
const jobTitle=(j,g)=>(g==='Woman'&&j.tf)?j.tf:j.t;
function guessLevel(text){
  const t=String(text||'').toLowerCase();
  if(/master'?s|phd|doctorate|postgrad|inns of court|mastery|advanced research|professional training/.test(t))return 'advanced';
  if(/universit|college of|degree|bachelor|academy|seminary|polytechnic/.test(t))return 'degree';
  if(/apprentic|journeyman|squire|certificat|technical/.test(t))return 'trade';
  if(/secondary|high school|grammar/.test(t))return 'secondary';
  if(/school|taught|pod|tutor/.test(t))return 'basic';
  return null;
}
function guessSub(S,text){
  const t=String(text||'').toLowerCase();
  for(const s of S.subjects.concat(S.trades,['arms'])) if(t.includes(s.toLowerCase()))return s;
  return null;
}
function eduWhat(st,sub){return sub?`${st.name} (${sub})`:st.name;}

/* ---------- birth year from locked things ---------- */
function chooseBirth(P,S,kept){
  const lo=S.years[0],hi=S.years[1];const cons=[];
  const add=(y,minAge,maxAge)=>{if(y!=null)cons.push([y-maxAge,y-minAge]);};
  kept.edu.forEach(e=>{const st=S.edu.find(s=>s.key===e.stage);const y=num(e.start);
    if(st&&y!=null)add(y,st.age[0]-1,st.age[1]+1);else add(y,3,70);add(num(e.end),5,95);});
  const MINAGE={none:12,basic:12,secondary:16,trade:18,degree:22,advanced:25};
  kept.work.forEach(e=>{const j=findJob(S,e.title);const m=j?(MINAGE[j.r]||12):12;add(num(e.start),m,85);add(num(e.end),m+1,105);});
  ['social','turning','custom'].forEach(n=>kept[n].forEach(e=>add(num(e.year),0,105)));
  kept.family.forEach(e=>{const k=relKind(e.relation);const b=num(e.born);
    if(k==='parent'){if(b!=null)cons.push([b+15,b+50]);}
    else if(k==='sibling'){if(b!=null)cons.push([b-15,b+15]);}
    else if(k==='child')add(b,14,60);
    else if(k==='partner')add(num(e.joined),15,95);
    else add(num(e.joined),0,100);
  });
  if(P.f.deathYear.l){const d=num(P.f.deathYear.v);if(d!=null)cons.push([d-105,d-1]);}
  if(!cons.length)return R.int(lo,hi);
  let ca=-Infinity,cb=Infinity;cons.forEach(([x,y])=>{ca=Math.max(ca,x);cb=Math.min(cb,y);});
  if(ca>cb)return Math.round((ca+cb)/2);
  let a=Math.max(lo,ca),b=Math.min(hi,cb);
  if(a>b){a=ca;b=cb;}
  return R.int(Math.round(a),Math.round(b));
}
function maxKeptYear(kept){
  let m=null;const t=y=>{if(y!=null&&(m==null||y>m))m=y;};
  kept.edu.forEach(e=>{t(num(e.start));t(num(e.end));});
  kept.work.forEach(e=>{t(num(e.start));t(num(e.end));});
  ['social','turning','custom'].forEach(n=>kept[n].forEach(e=>t(num(e.year))));
  kept.family.forEach(e=>{const k=relKind(e.relation);if(k==='partner'||k==='other')t(num(e.joined));if(k==='child')t(num(e.born));});
  return m;
}

/* ---------- main generator ---------- */
function generate(P){
  const S=settingData(P.setting,P.era);
  const F=P.f;
  const lk=k=>F[k].l;
  const set=(k,v)=>{if(!F[k].l)F[k].v=(v==null?'':String(v));};
  const gv=k=>F[k].v;
  const kept={};LISTNAMES.forEach(n=>kept[n]=P.lists[n].filter(e=>e.locked));

  set('gender',R.wpick([{v:'Man',w:48},{v:'Woman',w:48},{v:'Non-binary',w:4}]).v);
  const g=gv('gender')||'Non-binary';const pr=pronouns(g);
  const usedNames=new Set();
  const nameFor=gg=>{const l=gg==='m'?S.names.m:gg==='f'?S.names.f:S.names.m.concat(S.names.f);let n,t=0;do{n=R.pick(l);}while(usedNames.has(n)&&t++<15);usedNames.add(n);return n;};
  set('lastName',R.pick(S.sur));
  set('firstName',nameFor(g==='Man'?'m':g==='Woman'?'f':'x'));usedNames.add(String(gv('firstName')).split(' ')[0]);
  P.lists.family.filter(e=>e.locked).forEach(e=>usedNames.add(String(e.name||'').split(' ')[0]));
  const surname=gv('lastName')||R.pick(S.sur);

  let birth=num(gv('birthYear'));
  if(!lk('birthYear')||birth==null){birth=chooseBirth(P,S,kept);F.birthYear.v=String(birth);}

  // death
  let death=num(gv('deathYear'));let alive;
  const mk_=maxKeptYear(kept);
  if(lk('deathYear')){alive=(death==null);}
  else{
    death=birth+tri(S.life);
    if(mk_!=null&&death<mk_)death=mk_+R.int(0,4);
    if(S.alwaysDead&&death>=S.now)death=S.now-1;
    if(!S.alwaysDead&&death>S.now)death=null;
    F.deathYear.v=death==null?'':String(death);
    alive=(death==null);
  }
  let endYear=alive?S.now:death;
  if(alive&&S.alwaysDead)endYear=Math.min(S.now,birth+70);
  if(endYear<birth)endYear=birth;
  const life=endYear-birth;

  set('birthPlace',R.pick(S.places));
  const birthPlace=gv('birthPlace');

  // looks
  let h=g==='Man'?R.int(162,195):g==='Woman'?R.int(150,182):R.int(152,190);h+=S.heightAdj||0;
  const inch=Math.round(h/2.54);
  set('height',`${h} cm (${Math.floor(inch/12)}′${inch%12}″)`);
  set('build',cap(R.pick(COMMON.builds)));
  set('hair',cap(`${R.pick(COMMON.hairS)} ${R.pick(COMMON.hairC)}`));
  set('eyes',R.pick(COMMON.eyes));
  set('features',cap(joinAnd(R.sample(COMMON.features.concat(S.features||[],S.features||[]),2))));
  // personality
  set('traits',R.sample(COMMON.traits,3).join(', '));
  set('likes',R.sample(COMMON.likes,2).join(', '));
  set('fears',R.pick(COMMON.fears));
  set('quirk',cap(fill(R.pick(COMMON.quirks),S,pr)));
  set('values',R.sample(COMMON.values,2).join(', '));
  set('hopes',cap(fill(R.pick(COMMON.hopes.concat(S.hopes||[])),S,pr)));
  set('dreams',cap(fill(R.pick(COMMON.dreams.concat(S.dreams||[])),S,pr)));
  set('regret',cap(fill(R.pick(COMMON.regrets),S,pr)));

  // parents & siblings
  const fam=kept.family.slice();
  const has=re=>fam.some(e=>re.test(e.relation));
  const parentDeath=b=>{let d=b+tri([Math.max(S.life[0],40),S.life[1]]);if(d<birth)d=birth+R.int(0,3);if(!S.alwaysDead&&d>S.now)return '';return d;};
  const anyJob=(gg,pb)=>{const j=R.pick(S.jobs.filter(x=>x.k<=2&&!(x.c==='tech'&&pb<1950)));return jobTitle(j,gg==='f'?'Woman':'Man');};
  let fatherB=null,motherB=null;
  if(!has(/^\s*(father|stepfather)\s*$/i)){fatherB=birth-R.int(20,42);fam.push(mk({relation:'Father',name:nameFor('m')+' '+surname,born:fatherB,died:parentDeath(fatherB),notes:anyJob('m',fatherB)}));}
  if(!has(/^\s*(mother|stepmother)\s*$/i)){motherB=birth-R.int(18,38);fam.push(mk({relation:'Mother',name:nameFor('f')+' '+surname,born:motherB,died:parentDeath(motherB),notes:`Born ${R.pick(S.sur)}; ${lcSoft(anyJob('f',motherB))}`}));}
  const keptSibs=fam.filter(e=>relKind(e.relation)==='sibling').length;
  const nSib=Math.max(0,R.int(0,S.sibs)-keptSibs);
  for(let i=0;i<nSib;i++){
    let off=R.int(-10,12);if(off===0)off=1;const b=birth+off;
    if(b>endYear&&b>birth)continue;
    const gg=R.chance(.5)?'m':'f';
    let d='';
    if(R.chance(S.childDeath))d=b+R.int(0,9);else{const dd=b+tri(S.life);d=(S.alwaysDead||dd<=S.now)?dd:'';}
    if(d!==''&&b<birth&&d<birth)d=birth+R.int(0,5);
    fam.push(mk({relation:gg==='m'?'Brother':'Sister',name:nameFor(gg)+' '+surname,born:b,died:d,notes:off<0?'Older':'Younger'}));
  }

  // education
  const E=genEducation(S,birth,endYear,kept.edu,kept.work,pr,birthPlace);
  // work
  const W=genWork(S,birth,endYear,alive,kept.work,E,g,pr);

  // partners & children
  const windows=[];const turnCands=[];
  kept.family.filter(e=>relKind(e.relation)==='partner').forEach(e=>{const s=num(e.joined);if(s!=null)windows.push([s,num(e.until)??endYear]);});
  const lockedPartners=kept.family.some(e=>relKind(e.relation)==='partner');
  if(!lockedPartners&&life>=18&&R.chance(.85)){
    const wed=S.wed||[18,32];let y=birth+R.int(wed[0],wed[1]),guard=0;
    while(y<endYear&&guard++<3){
      const pgx=g==='Man'?(R.chance(.92)?'f':'m'):g==='Woman'?(R.chance(.92)?'m':'f'):(R.chance(.5)?'m':'f');
      const married=R.chance(S.marry);
      const pb=birth+R.int(-6,6);
      let pd=pb+tri(S.life);if(pd<y+1)pd=y+R.int(1,10);
      let until=null,how=null;
      if(R.chance(S.divorce)){until=y+R.int(2,18);how='parted';}
      if(!until&&pd<endYear){until=pd;how='died';}
      if(until!=null&&until>=endYear){until=null;how=null;}
      const pdShow=(S.alwaysDead||pd<=S.now)?pd:'';
      let psur;do{psur=R.pick(S.sur);}while(psur===surname);const pname=nameFor(pgx)+' '+psur;
      const rel=married?(how==='parted'?'Former spouse':'Spouse'):(how==='parted'?'Former partner':'Partner');
      fam.push(mk({relation:rel,name:pname,born:pb,died:how==='died'?pd:(how==='parted'?'':pdShow),joined:y,until:until??'',notes:married?(how==='parted'?'Divorced':'Married'):(how==='parted'?'Separated':'Lived together')}));
      windows.push([y,until??endYear]);
      if(how==='parted')turnCands.push({year:until,w:`{P} ${married?'marriage to':'relationship with'} ${pname.split(' ')[0]} ended`,c:R.pick(COMMON.parted)});
      if(how==='died')turnCands.push({year:until,w:`{P} ${married?(pgx==='m'?'husband':'wife'):'partner'}, ${pname.split(' ')[0]}, died`,c:R.pick(COMMON.grief.slice(1))});
      if(until!=null&&R.chance(.55))y=until+R.int(1,6);else break;
    }
  }
  let keptKids=kept.family.filter(e=>relKind(e.relation)==='child').length;
  windows.forEach(([a,b])=>{
    let n=R.int(S.kids[0],S.kids[1]);if(keptKids>0){const t=Math.min(n,keptKids);n-=t;keptKids-=t;}
    const last=Math.min(b,a+20,birth+46,S.now);
    let cy=a+R.int(0,2);
    for(let i=0;i<n;i++){
      cy+=R.int(1,4);if(cy>last)break;const cb=cy;
      const gg=R.chance(.5)?'m':'f';let d='';
      if(R.chance(S.childDeath)){d=cb+R.int(0,8);if(d<=endYear)turnCands.push({year:d,w:`{P} child ${'X'} died`.replace('X',''),c:R.pick(COMMON.grief),childName:true});}
      else if(S.alwaysDead){d=cb+tri(S.life);}
      const cname=nameFor(gg)+' '+surname;
      if(turnCands.length&&turnCands[turnCands.length-1].childName&&!turnCands[turnCands.length-1].done){const t=turnCands[turnCands.length-1];t.w=`{S} lost {P} ${gg==='m'?'son':'daughter'}, ${cname.split(' ')[0]}, at the age of ${d-cb}`;t.done=true;}
      fam.push(mk({relation:gg==='m'?'Son':'Daughter',name:cname,born:cb,died:d,notes:''}));
    }
  });
  // parent deaths as turning points
  fam.forEach(e=>{const k=relKind(e.relation),d=num(e.died);if(k==='parent'&&d!=null&&d>=birth&&d-birth<30&&d<=endYear)
    turnCands.push({year:d,w:`{P} ${e.relation.toLowerCase()}, ${String(e.name).split(' ')[0]}, died`,c:R.pick(d-birth<18?COMMON.grief:COMMON.grief.slice(1))});});
  W.switches.forEach(s=>turnCands.push({year:s.year,w:R.pick(COMMON.switchWhy),c:`{S} left life as ${aN(lcSoft(s.from))} and became ${aN(lcSoft(s.to))}`}));

  // friends & mentor
  const keptOthers=kept.family.filter(e=>relKind(e.relation)==='other').length;
  const nF=Math.max(0,R.int(2,4)-keptOthers);
  for(let i=0;i<nF;i++){
    if(life<6)break;
    const y=birth+R.int(6,Math.min(life,45));
    const gg=R.chance(.5)?'m':'f';
    const ed=E.entries.find(e=>num(e.start)<=y&&y<=(num(e.end)??y));
    const wk=W.entries.find(e=>num(e.start)<=y&&y<=(num(e.end)??endYear));
    const note=ed?(/^(at|with|by)\s/i.test(ed.where)?'A childhood neighbour':`Met at ${ed.where}`):wk?(/^(own|freelance|self|the open road)/i.test(wk.where)?'Met through work':`Worked together at ${wk.where}`):R.pick(['A neighbour','Met through a cousin','Met at a wedding','Met while travelling']);
    fam.push(mk({relation:'Friend',name:nameFor(gg)+' '+R.pick(S.sur),born:birth+R.int(-4,4),died:'',joined:y,until:'',notes:note}));
  }
  if(keptOthers===0&&life>20&&R.chance(.45)){
    const gg=R.chance(.5)?'m':'f';
    fam.push(mk({relation:'Mentor',name:nameFor(gg)+' '+R.pick(S.sur),born:birth-R.int(15,35),died:'',joined:birth+R.int(14,Math.min(28,life)),until:'',notes:cap(fill(R.pick(COMMON.mentorNotes),S,pr))}));
  }

  // social
  const social=kept.social.slice();
  const nS=Math.max(0,Math.min(7,Math.max(2,Math.round(life/12)))-kept.social.length);
  const spool=R.sample(S.social,S.social.length);
  for(let i=0;i<nS;i++){
    if(life<10)break;
    const y=birth+R.int(10,life);
    const place=R.pick(S.places.filter(p=>p!==birthPlace));
    social.push(mk({year:y,what:cap(fill(spool[i%spool.length],S,pr,{place}))}));
  }
  social.sort((a,b)=>(num(a.year)??0)-(num(b.year)??0));

  // turning points
  const turning=kept.turning.slice();
  let need=Math.max(0,R.int(2,4)-turning.length);
  const used=new Set(turning.map(t=>num(t.year)));
  const cands=R.sample(turnCands.filter(t=>t.year!=null&&t.year<=endYear),turnCands.length);
  for(const t of cands){if(need<=0)break;if(used.has(t.year))continue;used.add(t.year);turning.push(mk({year:t.year,what:cap(fill(t.w,S,pr)),change:cap(fill(t.c,S,pr))}));need--;}
  const pool=R.sample(COMMON.turns.concat(S.turns),99);
  for(const t of pool){if(need<=0||life<10)break;const ar=t.a||[8,60];if(life<ar[0])continue;let y=birth+R.int(ar[0],Math.min(life,ar[1]));let guard=0;while(used.has(y)&&guard++<10)y++;if(y>endYear)continue;used.add(y);
    turning.push(mk({year:y,what:cap(fill(t.w,S,pr)),change:cap(fill(t.c,S,pr))}));need--;}
  turning.sort((a,b)=>(num(a.year)??0)-(num(b.year)??0));

  // home & death cause
  set('home',homeFrom(social)||birthPlace);
  set('deathCause',alive?'':R.pick(S.deaths));

  P.lists.family=sortFamily(fam);
  P.lists.edu=E.entries;P.lists.work=W.entries;P.lists.social=social;P.lists.turning=turning;
  if(!P.story.l)P.story.v=buildStory(P);
  P.updated=Date.now();
  return P;
}
function homeFrom(social){
  let best=null;
  social.forEach(e=>{const m=String(e.what||'').match(/(?:moved|emigrated|relocated) to ([^,.;]+?)(?:\s+(?:in search|for a)\b.*)?$/i);const y=num(e.year)??0;if(m&&(!best||y>=best.y))best={y,p:m[1].trim()};});
  return best?best.p:null;
}
function sortFamily(fam){
  const ord={parent:0,sibling:1,partner:2,child:3,other:4};
  return fam.slice().sort((a,b)=>{const ka=ord[relKind(a.relation)],kb=ord[relKind(b.relation)];if(ka!==kb)return ka-kb;
    const ya=num(a.born)??num(a.joined)??0,yb=num(b.born)??num(b.joined)??0;return (ka===2||ka===4)?((num(a.joined)??0)-(num(b.joined)??0)):ya-yb;});
}

function genEducation(S,birth,endYear,keptEdu,keptWork,pr,homePlace){
  const req={levels:new Set(),sub:null,trade:null};
  keptWork.forEach(w=>{const j=findJob(S,w.title);if(j){if(j.r!=='none')req.levels.add(j.r);if(j.s){if(j.r==='trade')req.trade=j.s;else req.sub=j.s;}}});
  const lockedKeys=new Set(keptEdu.map(e=>e.stage).filter(k=>k&&S.edu.some(s=>s.key===k)));
  const typedLevels=new Set();
  keptEdu.forEach(e=>{if(!e.stage||!S.edu.some(s=>s.key===e.stage)){const l=guessLevel(e.what+' '+e.where);if(l)typedLevels.add(l);}});
  const stageLvl=k=>(S.edu.find(s=>s.key===k)||{}).lvl;
  const lvls=keys=>{const L=new Set(typedLevels);keys.forEach(k=>L.add(stageLvl(k)));return L;};
  const ok=p=>{const L=lvls(p.k);for(const r of req.levels)if(!satisfies(L,r))return false;for(const k of lockedKeys)if(!p.k.includes(k))return false;return true;};
  const cand=S.paths.filter(ok);
  let keys;
  if(cand.length)keys=new Set(R.wpick(cand).k);
  else{
    keys=new Set(R.wpick(S.paths).k);lockedKeys.forEach(k=>keys.add(k));
    for(const r of req.levels){if(!satisfies(lvls([...keys]),r)){const p=S.paths.find(pp=>satisfies(lvls(pp.k),r));if(p)p.k.forEach(k=>keys.add(k));}}
  }
  const allText=keptEdu.map(e=>e.what+' '+e.where+' '+e.notes).join(' ');
  const sub=req.sub||guessSub({subjects:S.subjects,trades:[]},allText)||R.pick(S.subjects);
  const trade=req.trade||guessSub({subjects:[],trades:S.trades},allText)||R.pick(S.trades);
  const locks=keptEdu.map(e=>({s:num(e.start),e:num(e.end)})).filter(x=>x.s!=null).map(x=>({s:x.s,e:x.e??x.s+1}));
  const out=[];let prevEnd=null;
  for(const st of S.edu){
    if(!keys.has(st.key))continue;
    if(lockedKeys.has(st.key)){const e=keptEdu.find(x=>x.stage===st.key);const en=num(e.end);if(en!=null)prevEnd=Math.max(prevEnd??en,en);continue;}
    if(typedLevels.has(st.lvl))continue;
    let start=birth+R.int(st.age[0],st.age[1]);
    if(prevEnd!=null)start=Math.max(start,prevEnd);
    for(const L of locks)if(start>=L.s&&start<L.e)start=L.e;
    let end=start+R.int(st.len[0],st.len[1]);
    for(const L of locks)if(L.s>=start&&L.s<end)end=L.s;
    if(start>=endYear)break;
    if(end>endYear)end=endYear;
    if(end-start<1)continue;
    let s2=null;
    if(st.subj==='trade')s2=trade;else if(st.subj==='degree')s2=sub;else if(st.subj&&st.subj.startsWith('fixed:'))s2=st.subj.slice(6);
    const showSub=(st.subj==='trade'||st.subj==='degree')?s2:null;
    const ctx={sub:s2||''};if(st.lvl!=='degree'&&st.lvl!=='advanced'&&homePlace)ctx.place=homePlace;
    const where=cap(fill(R.pick(st.where),S,pr,ctx)).replace(/^The /,'the ');
    out.push(Object.assign(mk({start,end,what:eduWhat(st,showSub),where:where.charAt(0)==='t'&&/^the /.test(where)?where:cap(where),notes:cap(fill(R.pick(st.notes||['']),S,pr,{sub:s2||''}))}),{stage:st.key,sub:s2||''}));
    prevEnd=end;
  }
  const entries=keptEdu.concat(out).sort((a,b)=>(num(a.start)??0)-(num(b.start)??0));
  const q={levels:new Set(),subs:new Set()};
  entries.forEach(e=>{const st=S.edu.find(s=>s.key===e.stage);const l=st?st.lvl:guessLevel(e.what+' '+e.where);if(l)q.levels.add(l);
    const sb=e.sub||guessSub(S,e.what+' '+e.where+' '+e.notes);if(sb)q.subs.add(sb.toLowerCase());});
  let end=null;entries.forEach(e=>{const x=num(e.end);if(x!=null&&(end==null||x>end))end=x;});
  return {entries,q,end};
}

function genWork(S,birth,endYear,alive,keptWork,E,g,pr){
  const q=E.q;
  let start=birth+R.int(S.workAge[0],S.workAge[1]);if(E.end!=null)start=Math.max(start,E.end);
  let stop=endYear;let retired=false;
  if(S.retire&&!(S.alwaysDead&&R.chance(.5))){const r=birth+R.int(S.retire[0],S.retire[1]);if(r<stop){stop=r;retired=true;}}
  const out=[],switches=[];
  const qual=S.jobs.filter(j=>qualifies(j,q));
  const top=maxRank(q.levels);
  const weight=j=>1+(RANK[j.r]===top?4:0)+(j.s&&q.subs.has(j.s.toLowerCase())?6:0);
  const wp=list=>R.wpick(list.map(j=>({j,w:weight(j)}))).j;
  const first=()=>{const l=qual.filter(j=>j.k<=2);return wp(l.length?l:qual);};
  const next=cur=>{const l=qual.filter(j=>j.c===cur.c&&j.k>=cur.k&&j.k<=cur.k+1);if(!l.length)return cur;const up=l.filter(j=>j.k>cur.k);if(up.length&&R.chance(.45))return R.pick(up);const same=l.filter(j=>j.k===cur.k);return R.pick(same.length?same:l);};
  const other=cur=>{const l=qual.filter(j=>j.c!==cur.c&&j.k<=Math.max(2,cur.k));return l.length?wp(l):null;};
  let switched=false;
  const employer=j=>{const t=(j.e||S.employers[j.c]||S.employers._);return fill(R.pick(t),S,pr);};
  const fillGap=(a,b,cur)=>{
    let y=a;
    while(b-y>=1){
      let j,isSwitch=false,promo=false;
      if(!cur)j=first();
      else if(!switched&&R.chance(.2)&&(j=other(cur))){isSwitch=true;switched=true;}
      else{j=next(cur);promo=j.k>cur.k;}
      let len=R.int(S.jobLen[0],S.jobLen[1]);let e=Math.min(b,y+len);if(b-e<2)e=b;
      const lastOut=out[out.length-1];
      if(cur&&j===cur&&!isSwitch&&lastOut&&num(lastOut.end)===y&&lastOut.title===jobTitle(j,g)){lastOut.end=String(e);y=e;continue;}
      const sameCat=cur&&j.c===cur.c&&!isSwitch&&lastOut&&num(lastOut.end)===y&&R.chance(.6);
      const where=sameCat?lastOut.where:employer(j);
      const notes=isSwitch?'A new direction':promo?'Promoted':R.pick(COMMON.workNotes);
      out.push(Object.assign(mk({start:y,end:e,title:jobTitle(j,g),where,notes}),{cat:j.c}));
      if(isSwitch)switches.push({year:y,from:jobTitle(cur,g),to:jobTitle(j,g)});
      cur=j;y=e;
    }
    return cur;
  };
  const locks=keptWork.map(e=>({s:num(e.start),e:num(e.end),t:e.title})).filter(x=>x.s!=null).sort((a,b)=>a.s-b.s);
  locks.forEach((L,i)=>{if(L.e==null)L.e=(locks[i+1]?locks[i+1].s:stop);});
  let cursor=start,cur=null;
  if(stop>start){
    for(const L of locks){if(L.s>cursor)cur=fillGap(cursor,Math.min(L.s,stop),cur);cursor=Math.max(cursor,L.e);cur=findJob(S,L.t)||cur;}
    if(stop>cursor)fillGap(cursor,stop,cur);
  }
  if(alive&&!retired&&out.length){const last=out[out.length-1];if(num(last.end)>=endYear)last.end='';}
  const entries=keptWork.concat(out).sort((a,b)=>(num(a.start)??0)-(num(b.start)??0));
  return {entries,switches};
}

/* ---------- timeline ---------- */
function buildTimeline(P){
  const S=settingData(P.setting,P.era);
  const v=k=>(P.f[k].v||'').trim();
  const ev=[];const add=(y,text,cat)=>{const n=num(y);if(n!=null&&text)ev.push({year:n,text,cat});};
  const birth=num(v('birthYear')),death=num(v('deathYear'));
  add(birth,'Born'+(v('birthPlace')?' in '+v('birthPlace'):''),'life');
  P.lists.family.forEach(e=>{
    const k=relKind(e.relation),rel=(e.relation||'').trim(),nm=(e.name||'').trim()||'someone';
    const born=num(e.born),died=num(e.died),joined=num(e.joined),until=num(e.until);
    if(k==='parent'){if(died!=null&&(birth==null||died>=birth))add(died,`${cap(rel.toLowerCase())} ${nm} died`,'family');}
    else if(k==='sibling'){if(born!=null&&birth!=null&&born>birth)add(born,`${cap(rel.toLowerCase())} ${nm} was born`,'family');if(died!=null&&(birth==null||died>=birth))add(died,`${cap(rel.toLowerCase())} ${nm} died`,'family');}
    else if(k==='partner'){const m=/spouse|husband|wife/i.test(rel);
      add(joined,m?`Married ${nm}`:`Began a relationship with ${nm}`,'family');
      if(until!=null&&!(died!=null&&died===until))add(until,m?`Marriage to ${nm} ended`:`Relationship with ${nm} ended`,'family');
      if(died!=null&&(death==null||died<=death))add(died,`${nm} died`,'family');}
    else if(k==='child'){add(born,`${cap(rel.toLowerCase())} ${nm} was born`,'family');if(died!=null&&(death==null||died<=death))add(died,`${cap(rel.toLowerCase())} ${nm} died`,'family');}
    else{add(joined,`Met ${nm}${rel?' ('+rel.toLowerCase()+')':''}`,'family');}
  });
  P.lists.edu.forEach(e=>{const w=(e.what||'').trim()||'school';add(e.start,`Started ${lcSoft(w)}${atPhrase(e.where)}`,'education');add(e.end,`Finished ${lcSoft(w)}`,'education');});
  const works=P.lists.work.slice().sort((a,b)=>(num(a.start)??0)-(num(b.start)??0));
  works.forEach((e,i)=>{const t=(e.title||'').trim()||'work';add(e.start,`Began work as ${aN(lcSoft(t))}${workAt(e.where,null)}`,'work');});
  if(works.length){const last=works[works.length-1];const le=num(last.end);const endY=death??S.now;
    if(le!=null&&birth!=null&&le-birth>=50&&le<endY)add(le,'Retired','work');}
  P.lists.social.forEach(e=>add(e.year,e.what,'social'));
  P.lists.turning.forEach(e=>add(e.year,'Turning point: '+(e.what||''),'turning'));
  P.lists.custom.forEach(e=>add(e.year,e.what,'custom'));
  if(death!=null)add(death,'Died'+(v('deathCause')?' of '+v('deathCause'):''),'life');
  const ord={life:0,family:1,education:2,work:3,social:4,turning:5,custom:6};
  ev.sort((a,b)=>a.year-b.year||(a.cat==='life'&&a.text==='Died'?1:0)-(b.cat==='life'&&b.text==='Died'?1:0)||ord[a.cat]-ord[b.cat]);
  // keep 'Born' first and 'Died' last within the same year
  ev.sort((a,b)=>a.year-b.year||rankEv(a)-rankEv(b));
  const evs=death!=null?ev.filter(e=>e.year<=death):ev;
  return evs.map(e=>Object.assign(e,{age:birth!=null?e.year-birth:null}));
}
function rankEv(e){if(e.cat==='life'&&/^Born/.test(e.text))return -1;if(e.cat==='life'&&/^Died/.test(e.text))return 99;return {family:1,education:2,work:3,social:4,turning:5,custom:6}[e.cat]||0;}

function checkPerson(P){
  const S=settingData(P.setting,P.era);const out=[];
  const birth=num(P.f.birthYear.v),death=num(P.f.deathYear.v);
  if(birth==null)return out;
  if(death!=null&&death<birth)out.push('The year died is before the year born.');
  buildTimeline(P).forEach(e=>{
    if(e.cat==='life')return;
    if(e.year<birth)out.push(`“${e.text}” (${S.fmt(e.year)}) is before they were born.`);
    else if(death!=null&&e.year>death&&!/died|was born/i.test(e.text))out.push(`“${e.text}” (${S.fmt(e.year)}) is after they died.`);
  });
  P.lists.work.forEach(w=>{const s=num(w.start);if(s!=null&&s-birth<10)out.push(`They start work as “${w.title}” at age ${s-birth}.`);});
  P.lists.family.forEach(f=>{const k=relKind(f.relation),b=num(f.born);
    if(k==='child'&&b!=null&&b-birth<14)out.push(`${f.name} is born when they are only ${b-birth}.`);
    if(k==='parent'&&b!=null&&birth-b<13)out.push(`${f.name} would be ${birth-b} when they were born.`);});
  return out;
}

/* ---------- life story ---------- */
const VERBS=new Set(['left','won','took','made','became','was','were','got','met','learned','studied','earned','struggled','captained','played','qualified','graduated','fell','spent','ran','built','wrote','found','lost','hated','loved','kept','gave','rose','passed','gained','worked','taught','saw']);
function noteClause(note,pr){
  note=(note||'').trim().replace(/[.]+$/,'');if(!note||/^(a new direction|promoted)$/i.test(note))return '';
  if(/^was\s/i.test(note))note=pr.was+note.slice(3);
  if(VERBS.has(firstWord(note))||/ed$/.test(firstWord(note)))return `, and ${pr.S} ${lcSoft(note)}`;
  return ` (${note})`;
}
function buildStory(P){
  const S=settingData(P.setting,P.era);
  const v=k=>(P.f[k].v||'').trim();
  const first=v('firstName')||'This person';
  const full=[v('firstName'),v('lastName')].filter(Boolean).join(' ')||first;
  const pr=pronouns(v('gender'));const CS=cap(pr.S),CP=cap(pr.P);
  const birth=num(v('birthYear')),death=num(v('deathYear'));
  const alive=death==null;
  const inY=y=>'in '+S.fmt(y);
  const ageAt=y=>(birth!=null&&y!=null)?y-birth:null;
  const conj=(base,s3,past)=>alive?(pr.pl?base:s3):past;
  const fam=P.lists.family;
  const byKind=k=>fam.filter(e=>relKind(e.relation)===k);
  const firstName=n=>String(n||'').trim().split(/\s+/)[0]||n;
  const paras=[];

  // origins
  let p=`${full} was born${birth!=null?' '+inY(birth):''}${v('birthPlace')?' in '+v('birthPlace'):''}`;
  const parents=byKind('parent');
  if(parents.length){p+=`, the child of ${joinAnd(parents.map(x=>x.name+(x.notes?` (${lcSoft(x.notes)})`:'')))}`;}
  p+='.';
  const sibs=byKind('sibling');
  if(sibs.length){
    p+=` ${first} grew up with ${sibs.length===1?'one':sibs.length} ${sibs.length===1?(/brother/i.test(sibs[0].relation)?'brother':/sister/i.test(sibs[0].relation)?'sister':'sibling'):'brothers and sisters'}: ${joinAnd(sibs.map(s=>firstName(s.name)))}.`;
    const young=sibs.filter(s=>{const d=num(s.died),b=num(s.born);return d!=null&&b!=null&&d-b<16&&(birth==null||d>=birth);});
    if(young.length)p+=` ${joinAnd(young.map(s=>firstName(s.name)))} died young, a loss the family felt deeply.`;
  } else if(parents.length) p+=` ${first} grew up as an only child.`;
  const traits=splitList(v('traits'));
  if(traits.length)p+=` Even as a child, ${first} was ${joinAnd(traits.slice(0,2))}.`;
  paras.push(p);

  // looks
  const looks=[];
  if(v('build'))looks.push(lcSoft(v('build'))+' in build');
  if(v('height'))looks.push(v('height').replace(/\s*\(.*\)/,'')+' tall');
  let lp='';
  if(looks.length||v('hair')||v('eyes')){
    lp=`As an adult, ${first} ${alive?'is':'was'} ${joinAnd(looks)||'easy to recognise'}${v('hair')?`, with ${lcSoft(v('hair'))} hair`:''}${v('eyes')?`${v('hair')?' and':', with'} ${lcSoft(v('eyes'))} eyes`:''}.`;
    if(v('features'))lp+=` People ${alive?'notice':'remembered'} ${pr.P} ${lcSoft(v('features')).replace(/^an? /,'')}.`.replace(`${pr.P} freckles`,`${pr.P} freckles`);
    paras.push(lp);
  }

  // education
  const edu=P.lists.edu.slice().sort((a,b)=>(num(a.start)??0)-(num(b.start)??0));
  if(edu.length){
    const verbs=['started','went on to','moved on to','began'];
    const parts=edu.map((e,i)=>{
      const a=ageAt(num(e.start));const st=S.edu.find(s=>s.key===e.stage);
      let what=(e.what||'').trim()||'school';
      let tail='';
      if(st&&e.sub&&what===eduWhat(st,e.sub)){what=st.name;tail=`, ${st.lvl==='trade'?'learning':'studying'} ${e.sub}`;}
      const at=atPhrase(e.where);
      const lead=a!=null?`At ${a}, `:(num(e.start)!=null?cap(inY(num(e.start)))+', ':'');
      const subj=i===0?first:pr.S;
      const vb=i===0?'started':verbs[i%verbs.length];
      return `${lead}${subj} ${vb} ${lcSoft(what)}${at}${tail}${noteClause(e.notes,pr)}.`;
    });
    paras.push(parts.map(cap).join(' '));
  } else if(birth!=null) paras.push(`${first} had little formal schooling.`);

  // work
  const work=P.lists.work.slice().sort((a,b)=>(num(a.start)??0)-(num(b.start)??0));
  if(work.length){
    const parts=[];
    work.forEach((e,i)=>{
      const t=lcSoft((e.title||'').trim()||'worker');const y=num(e.start);const a=ageAt(y);
      const where=workAt(e.where,pr);
      if(i===0)parts.push(`${first}'s working life began${y!=null?' '+inY(y):''}${a!=null?`, at ${a},`:''} as ${aN(t)}${where}${noteClause(e.notes,pr)}.`);
      else{const prev=work[i-1];const same=(prev.where||'')===(e.where||'')&&e.where&&/^promoted$/i.test((e.notes||'').trim());
        parts.push(`${y!=null?cap(inY(y))+', ':''}${pr.S} ${same?'rose to become':'became'} ${aN(t)}${same?'':where}${noteClause(e.notes,pr)}.`);}
    });
    const last=work[work.length-1];const le=num(last.end);
    if(alive&&!(last.end||'').trim())parts.push(`${CS} still ${pr.pl?'work':'works'} there today.`);
    else if(le!=null&&ageAt(le)>=50&&(death==null||le<death))parts.push(`${CS} retired ${inY(le)}, at ${ageAt(le)}.`);
    paras.push(parts.map(cap).join(' '));
  } else if(birth!=null&&((death??S.now)-birth)>=18) paras.push(`${first} never held a regular job.`);

  // love and family
  const partners=byKind('partner').slice().sort((a,b)=>(num(a.joined)??0)-(num(b.joined)??0));
  const kids=byKind('child').slice().sort((a,b)=>(num(a.born)??0)-(num(b.born)??0));
  const lf=[];
  partners.forEach((x,i)=>{
    const m=/spouse|husband|wife/i.test(x.relation);const j=num(x.joined),u=num(x.until),d=num(x.died);
    let s=`${j!=null?cap(inY(j))+', ':''}${i===0?first:pr.S} ${m?'married':'began a life with'} ${x.name}`;
    if(u!=null&&!(d!=null&&d===u))s+=`; the ${m?'marriage':'relationship'} ended ${inY(u)}`;
    if(d!=null&&(death==null||d<=death))s+=`. ${firstName(x.name)} died ${inY(d)}${(u!=null&&u===d)?`, leaving ${first} ${m?'widowed':'alone'}`:''}`;
    lf.push(s+'.');
  });
  if(kids.length){
    lf.push(`${CS} ${alive?pr.has:'had'} ${kids.length===1?'one child':kids.length+' children'}: ${joinAnd(kids.map(k=>firstName(k.name)+(num(k.born)!=null?` (born ${S.fmt(num(k.born))})`:'')))}.`);
    const lost=kids.filter(k=>{const d=num(k.died);return d!=null&&(death==null||d<=death);});
    if(lost.length)lf.push(`${joinAnd(lost.map(k=>firstName(k.name)))} died before ${pr.O}, ${num(lost[0].died)-num(lost[0].born)<12?'in childhood':inY(num(lost[0].died))}.`);
  }
  if(!partners.length&&!kids.length&&birth!=null&&((death??S.now)-birth)>=25)lf.push(`${first} never married${alive?' and lives':' and lived'} on ${pr.P} own terms.`);
  const others=byKind('other');
  if(others.length)lf.push(`Among the people who ${alive?'matter':'mattered'} most to ${pr.O} ${alive?(others.length===1?'is':'are'):(others.length===1?'was':'were')} ${joinAnd(others.map(o=>`${o.name}${o.relation&&!/friend/i.test(o.relation)?', '+aN(o.relation.toLowerCase()):''}${o.notes?` (${lcSoft(o.notes)})`:''}`))}.`);
  if(lf.length)paras.push(lf.join(' '));

  // social life
  const soc=P.lists.social.slice().sort((a,b)=>(num(a.year)??0)-(num(b.year)??0));
  if(soc.length){
    const parts=soc.map(e=>{const y=num(e.year);const w=(e.what||'').trim();const fw=firstWord(w);
      if(VERBS.has(fw)||/ed$/.test(fw))return `${y!=null?cap(inY(y))+', ':''}${pr.S} ${lcSoft(w)}.`;
      return `${y!=null?cap(inY(y))+': ':''}${w}.`;});
    paras.push(`Outside work and family, ${first}'s life had many threads. `+parts.map(cap).join(' '));
  }

  // turning points
  const tp=P.lists.turning.slice().sort((a,b)=>(num(a.year)??0)-(num(b.year)??0));
  if(tp.length){
    const lead=['The first came','The next came','Another came','Later still, another came','Then another came'];
    const parts=tp.map((t,i)=>{const y=num(t.year),a=ageAt(y);
      const when=y!=null?`${inY(y)}${a!=null?`, when ${pr.S} ${pr.was} ${a}`:''}`:'';
      let s=when?`${lead[Math.min(i,lead.length-1)]} ${when}.`:'';
      s+=` ${cap((t.what||'').trim().replace(/[.]+$/,''))}.`;
      if((t.change||'').trim())s+=` ${cap(t.change.trim().replace(/[.]+$/,''))}.`;
      return s.trim();});
    paras.push(`A few moments changed the course of ${first}'s life. `+parts.join(' '));
  }

  // custom
  const cu=P.lists.custom.filter(e=>(e.what||'').trim()).sort((a,b)=>(num(a.year)??0)-(num(b.year)??0));
  if(cu.length)paras.push('Other moments worth remembering: '+cu.map(e=>`${num(e.year)!=null?cap(inY(num(e.year)))+', ':''}${lcSoft(e.what.trim().replace(/[.]+$/,''))}.`).join(' '));

  // inner life
  const il=[];
  if(traits.length)il.push(`At heart, ${first} ${alive?'is':'was'} ${joinAnd(traits)}.`);
  const likes=splitList(v('likes')),fears=v('fears');
  if(likes.length||fears)il.push(`${CS} ${likes.length?conj('love','loves','loved')+' '+joinAnd(likes):''}${likes.length&&fears?', and ':''}${fears?conj('fear','fears','feared')+' '+fears:''}.`);
  if(v('quirk'))il.push(`${first} ${alive?'has':'had'} a habit of ${lcSoft(v('quirk')).replace(/^a habit of /,'')}.`);
  if(v('values'))il.push(`What ${alive?'matters':'mattered'} most to ${pr.O} ${alive?'is':'was'} ${joinAnd(splitList(v('values')))}.`);
  if(v('hopes'))il.push(`${CS} ${conj('hope','hopes','hoped')} ${lcSoft(v('hopes')).replace(/^to /,'to ')}.`.replace(/\.\.$/,'.'));
  if(v('dreams'))il.push(`${CP} greatest dream ${alive?'is':'was'} ${lcSoft(v('dreams'))}.`.replace(/\.\.$/,'.'));
  if(v('regret'))il.push(`${CP} biggest regret ${alive?'is':'was'} ${lcSoft(v('regret'))}.`.replace(/\.\.$/,'.'));
  if(il.length)paras.push(il.join(' '));

  // ending
  const home=v('home');
  if(!alive){
    const a=ageAt(death);const cause=v('deathCause');
    paras.push(`${first} died ${inY(death)}${a!=null?`, at the age of ${a}`:''}${cause?`, of ${lcSoft(cause)}`:''}${home?`, in ${home}`:''}.`);
  } else if(birth!=null){
    paras.push(`Now ${S.now-birth}, ${first} lives in ${home||'a place of '+pr.P+' own choosing'}.`);
  }
  return paras.join('\n\n').replace(/\.\.(?!\.)/g,'.').replace(/ {2,}/g,' ').replace(/ \./g,'.');
}

/* ---------- the parts Town Chronicle adds ---------- */
// Lets Town Chronicle fit LifeWeaver's setting to the town (its year and year labels) without changing LifeWeaver's lists.
let townFit = null;
const lifeweaverSettingData = settingData;
settingData = function (setting, era) { const d = lifeweaverSettingData(setting, era); return townFit ? townFit(d) : d; };
return {
  generate, buildStory, buildTimeline, checkPerson, blankPerson, settingData, ERAS, PACKS, FIELDS, LISTNAMES, LISTS, REL_OPTIONS,
  setRandom: f => { rnd = f || Math.random; },
  setTownFit: f => { townFit = f || null; }
};
})();

/* ---------- fitting a made person to the town ---------- */
// Town Chronicle settings the maker can use for now. Frontier and Dropped come with the later step that combines both apps' lists.
const MAKER_SETTINGS = { medieval: ['historical', 'medieval'], modern: ['modern', null], fantasy: ['fantasy', null], scifi: ['scifi', null] };
// When no birth year is locked, a made person is aged 16 to 50 on arrival: the ages Town Chronicle already uses for newcomers in plans.
const MAKER_AGES = [16, 50];
function makerAvailable(W) { return !!MAKER_SETTINGS[W.era]; }
function makerYear(W) { return W.year; } // made people arrive as a plan, which happens in the year that runs when you next advance
function makerBlank(W) { const m = MAKER_SETTINGS[W.era]; return m ? LW.blankPerson(m[0], m[1] || undefined) : null; }

// Runs fn with LifeWeaver fitted to this town: "now" is the arrival year, people may still be alive, and years use the town's labels.
function withTown(W, rand, fn) {
  const y = makerYear(W), era = ERAS[W.era];
  LW.setTownFit(d => Object.assign({}, d, { now: y, alwaysDead: false, years: [y - MAKER_AGES[1], y - MAKER_AGES[0]], fmt: era.yearLabel || d.fmt }));
  LW.setRandom(rand);
  try { return fn(); } finally { LW.setTownFit(null); LW.setRandom(null); }
}

// Makes up everything that is not locked. A locked death year after arrival is kept, but their life is written up to arrival only
// (Town Chronicle will turn that death year into a plan when they move in).
// They must be alive when they arrive, so an unlocked death year is held blank while generating (LifeWeaver's own way of
// keeping someone alive: "Lock it blank"). Relatives whose made-up death falls after arrival are left alive, for the town to decide.
function makerGenerate(W, P, rand) {
  const y = makerYear(W), d = P.f.deathYear, wasLocked = d.l, later = d.l && d.v !== '' && +d.v >= y ? d.v : null;
  if (later != null) d.v = '';
  if (!wasLocked) { d.v = ''; d.l = true; }
  try {
    withTown(W, rand, () => {
      LW.generate(P);
      let fixed = false;
      for (const row of P.lists.family) if (!row.locked && row.died !== '' && +row.died > y) { row.died = ''; fixed = true; }
      if (fixed && !P.story.l) P.story.v = LW.buildStory(P);
    });
  } finally { if (!wasLocked) d.l = false; if (later != null) d.v = later; }
  return P;
}

// Problems that would stop this person moving in. Empty means they can.
function makerProblems(W, P) {
  const y = makerYear(W), out = [], fmt = ERAS[W.era].yearLabel || String;
  const b = P.f.birthYear.v === '' ? null : +P.f.birthYear.v, dv = P.f.deathYear.v, d = dv === '' ? null : +dv;
  if (b == null) out.push('They need a year born.');
  else if (b > y) out.push(`They would not be born yet when they arrive in ${fmt(y)}.`);
  if (d != null && d < y) out.push(`They would already be dead when they arrive in ${fmt(y)}.`);
  const d2 = P.f.deathYear, later = d2.l && d != null && d >= y ? d2.v : null;
  if (later != null) d2.v = '';
  try {
    withTown(W, null, () => {
      LW.checkPerson(P).forEach(t => out.push(t));
      LW.buildTimeline(P).forEach(e => { if (e.year > y) out.push(`“${e.text}” is in ${fmt(e.year)}, after they arrive in ${fmt(y)}.`); });
    });
  } finally { if (later != null) d2.v = later; }
  return out;
}
if (typeof module !== 'undefined') Object.assign(module.exports, { LW, MAKER_SETTINGS, MAKER_AGES, makerAvailable, makerYear, makerBlank, makerGenerate, makerProblems });

/* ---------- moving a made person into the town ---------- */
// Personality words nudge Town Chronicle's five 1–99 scores by 15 points each (agreed). Words not listed here are kept as a note.
const MAKER_TRAIT_NUDGE = 15;
const MAKER_TRAIT_WORDS = {
  brave: ['N', -1], cautious: ['C', 1], curious: ['O', 1], stubborn: ['A', -1], kind: ['A', 1], 'sharp-tongued': ['A', -1], patient: ['A', 1], restless: ['C', -1],
  loyal: ['A', 1], ambitious: ['C', 1], shy: ['E', -1], charming: ['E', 1], practical: ['O', -1], dreamy: ['O', 1], generous: ['A', 1], proud: ['A', -1], funny: ['E', 1],
  anxious: ['N', 1], honest: ['A', 1], secretive: ['E', -1], 'hard-working': ['C', 1], 'easy-going': ['N', -1], 'hot-tempered': ['N', 1], thoughtful: ['O', 1],
  optimistic: ['N', -1], cynical: ['A', -1], gentle: ['A', 1], bold: ['E', 1], meticulous: ['C', 1], impulsive: ['C', -1]
};
const makerSplit = s => String(s || '').split(/,|;|\band\b/).map(x => x.trim().toLowerCase()).filter(Boolean);
const makerLc = s => { s = String(s || '').trim(); return s ? s[0].toLowerCase() + s.slice(1) : ''; };
const makerNum = v => { const n = parseInt(String(v == null ? '' : v).trim(), 10); return Number.isFinite(n) ? n : null; };
function makerPersonName(P) { return [P.f.firstName.v, P.f.lastName.v].map(x => String(x || '').trim()).filter(Boolean).join(' ') || 'someone'; }

// Who comes with them: their current partner (married or living together) and their living children.
function makerParty(W, P) {
  const y = makerYear(W), rows = P.lists.family;
  const partner = rows.find(r => /^\s*(spouse|partner|wife|husband)\s*$/i.test(r.relation || '') && !String(r.died || '').trim() && !String(r.until || '').trim()) || null;
  const kids = rows.filter(r => /\b(son|daughter|child)\b/i.test(r.relation || '') && !/grand|step|-in-law/i.test(r.relation || '') && !String(r.died || '').trim() && makerNum(r.born) != null && makerNum(r.born) <= y);
  return { partner, kids };
}
// A man or a woman? From the relation word, or else from LifeWeaver's name lists for this setting. null means we have to ask.
function makerRowSex(W, P, row) {
  const r = String(row.relation || '').toLowerCase();
  if (/\b(son|husband|brother|father)\b/.test(r)) return 'm';
  if (/\b(daughter|wife|sister|mother)\b/.test(r)) return 'f';
  const first = String(row.name || '').trim().split(/\s+/)[0];
  if (!first) return null;
  const S = withTown(W, null, () => LW.settingData(P.setting, P.era)), m = (S.names.m || []).includes(first), f = (S.names.f || []).includes(first);
  return m && !f ? 'm' : f && !m ? 'f' : null;
}
const makerSexOf = (W, P, row, chosen) => makerRowSex(W, P, row) || (chosen && chosen[row.id]) || null;

// Problems that stop the plan. Empty means they can come.
function makerMoveProblems(W, P, chosen) {
  if (!makerAvailable(W)) return ['Making a person isn’t ready yet for this setting.'];
  const out = makerProblems(W, P).slice();
  const g = P.f.gender.v;
  if (g === 'Non-binary') out.push('Town Chronicle can’t have non-binary people yet (that comes in a later step). Choose Man or Woman to move them in now.');
  else if (g !== 'Man' && g !== 'Woman') out.push('Choose whether they are a man or a woman.');
  if (!String(P.f.firstName.v || '').trim()) out.push('They need a first name.');
  const { partner, kids } = makerParty(W, P), y = makerYear(W);
  for (const r of [partner, ...kids].filter(Boolean)) {
    const nm = String(r.name || '').trim() || 'Someone in their family';
    if (!String(r.name || '').trim()) out.push(`${r.relation || 'A family member'} who would come with them needs a name.`);
    if (makerNum(r.born) == null) out.push(`${nm} needs a year born to come with them.`);
    else if (makerNum(r.born) > y) out.push(`${nm} would not be born yet.`);
    if (!makerSexOf(W, P, r, chosen)) out.push(`Choose whether ${nm} is a man or a woman.`);
  }
  return out;
}

// Plans (edit.js calls these)
function makerPlanCheck(W, pl) { if (!pl.person) return 'Nobody to move in.'; const pr = makerMoveProblems(W, pl.person, pl.sexes); return pr.length ? pr[0] : null; }
function makerPlanText(W, pl) { const { partner, kids } = makerParty(W, pl.person); const n = (partner ? 1 : 0) + kids.length; return `${makerPersonName(pl.person)}, a person you made, arrives${n ? ` with their family (up to ${n} more)` : ''}`; }

// LifeWeaver's timeline sorted into Town Chronicle's kinds of event (only for ordering and display).
function makerEventType(e) {
  const t = e.text || '';
  if (e.cat === 'education') return 'school';
  if (e.cat === 'work') return 'work';
  if (e.cat === 'turning') return 'mind';
  if (e.cat === 'social') return 'moved';
  if (e.cat === 'custom') return 'learned';
  if (e.cat === 'family') {
    if (/\bdied\b/i.test(t)) return 'loss';
    if (/^(son|daughter|child)\b.*was born/i.test(t)) return 'child_born';
    if (/was born/i.test(t)) return 'sibling_born';
    if (/^married/i.test(t)) return 'married';
    if (/moved in|lived together/i.test(t)) return 'partnered';
    if (/ended|divorc|separat/i.test(t)) return 'divorced';
    return 'friend';
  }
  return 'moved';
}

// The plan happens: make them (and their partner and children) real townspeople.
function makerMoveIn(W, rng, y, s, R, pl) {
  const P = pl.person, era = eraOf(W), S = W.settings, modernish = !!S.familySizeLimit;
  const pr = makerMoveProblems(W, P, pl.sexes); if (pr.length) return `${makerPersonName(P)} could not come: ${pr[0]}`;
  const v = k => String(P.f[k].v || '').trim();
  const culture = rng.weighted(era.cultures);
  const sex = v('gender') === 'Man' ? 'm' : 'f';
  const main = makePerson(W, rng, { born: +v('birthYear'), sex, culture, arrived: y, first: v('firstName'), last: v('lastName') || undefined });
  const { partner, kids } = makerParty(W, P);
  const split = n => { const w = String(n || '').trim().split(/\s+/); return { first: w[0], last: w.slice(1).join(' ') || main.last }; };

  // looks, likes and wants
  const ht = v('height'), cm = ht.match(/(\d{2,3})\s*cm/i), ft = ht.match(/(\d)\s*['′]\s*(\d{1,2})?/);
  if (cm) main.appearance.height = +cm[1]; else if (ft) main.appearance.height = Math.round((+ft[1] * 12 + (+ft[2] || 0)) * 2.54);
  if (v('hair')) main.appearance.hair = makerLc(v('hair'));
  if (v('eyes')) main.appearance.eyes = makerLc(v('eyes'));
  if (v('build')) main.appearance.build = makerLc(v('build'));
  // Town Chronicle writes quirks as "hums while working"; LifeWeaver as "Talking to animals", which becomes "has a habit of talking to animals"
  if (v('quirk')) { const q = makerLc(v('quirk')); main.quirk = /^\w+ing\b/.test(q) ? 'has a habit of ' + q : q; }
  if (v('fears')) main.fear = makerLc(v('fears'));
  if (v('hopes')) main.goal = makerLc(v('hopes')).replace(/\.$/, '');
  if (v('likes')) main.hobbies = makerSplit(v('likes'));
  if (v('values')) main.values = makerSplit(v('values'));
  if (v('birthPlace')) main.homeland = v('birthPlace');
  // personality words nudge the scores
  const words = makerSplit(v('traits')), other = [];
  for (const wd of words) { const m = MAKER_TRAIT_WORDS[wd]; if (m) main.traits[m[0]] = Math.round(clamp(main.traits[m[0]] + m[1] * MAKER_TRAIT_NUDGE, 1, 99)); else other.push(wd); }
  // schooling: in older settings LifeWeaver's schooling decides reading and writing (agreed); modern settings use the town's own rule
  const edu = P.lists.edu.filter(r => String(r.what || '').trim());
  if (edu.length) main.education = String(edu[edu.length - 1].what).trim();
  main.literate = modernish ? ageOf(main, y) >= 7 : edu.some(r => r.stage ? r.stage !== 'apprentice' : !/apprentic/i.test(r.what));
  // everything LifeWeaver knew that Town Chronicle has no place for yet (shown in a later step)
  const curJob = P.lists.work.filter(r => String(r.title || '').trim() && !String(r.end || '').trim()).pop();
  main.made = {
    from: 'LifeWeaver', plan: pl.id, story: P.story.v, features: v('features'), hopes: v('hopes'), dreams: v('dreams'), regret: v('regret'), likes: v('likes'),
    traitWords: words, otherTraits: other, birthPlace: v('birthPlace'), livedIn: v('home'), job: curJob ? String(curJob.title).trim() : '',
    turning: P.lists.turning.map(r => ({ year: r.year, what: r.what, change: r.change })), own: P.lists.custom.map(r => ({ year: r.year, what: r.what }))
  };

  // partner
  let mate = null;
  if (partner) {
    const nm = split(partner.name), psex = makerSexOf(W, P, partner, pl.sexes);
    mate = makePerson(W, rng, { born: makerNum(partner.born), sex: psex, culture: rng.chance(0.85) ? culture : rng.weighted(era.cultures), arrived: y, first: nm.first, last: nm.last });
    const married = !/partner/i.test(partner.relation);
    main.spouse = mate.id; mate.spouse = main.id; main.union = mate.union = married ? 'married' : 'partners';
    main.orientation = mate.orientation = psex === sex ? 'gay' : 'straight';
    if (married && psex !== sex) { const wife = sex === 'f' ? main : mate, husband = wife === main ? mate : main; if (!(wife === main && P.f.lastName.l) && rng.chance(S.wifeTakesName)) wife.last = husband.last; }
    const jy = makerNum(partner.joined) || y;
    for (const [a, b] of [[main, mate], [mate, main]]) a.events.push({ y: jy, t: married ? 'married' : 'partnered', text: `${married ? 'Married' : 'Moved in with'} @${b.id}, before coming to ${W.name}.` });
    mate.events.push({ y: mate.born, t: 'born', text: `Born elsewhere, before coming to ${W.name}.` });
  }
  // children: under 18 come with them; older ones come 15% of the time, as for other newcomer families
  const home = [main, ...(mate ? [mate] : [])];
  for (const r of kids) {
    const nm = split(r.name), b = makerNum(r.born), ks = makerSexOf(W, P, r, pl.sexes);
    const both = mate && b >= (makerNum(partner.joined) || -Infinity);
    const par = { father: null, mother: null };
    for (const q of both ? [main, mate] : [main]) { if (q.sex === 'm' && !par.father) par.father = q.id; else if (!par.mother) par.mother = q.id; else par.father = par.father || q.id; }
    // surname: the town's own rule (the father's) unless you typed and locked the child's row
    const fa = par.father ? W.people[par.father] : null;
    const c = makePerson(W, rng, { born: b, sex: ks, culture, arrived: y, first: nm.first, last: r.locked || !fa ? nm.last : fa.last, father: par.father, mother: par.mother });
    for (const q of both ? [main, mate] : [main]) { q.children.push(c.id); q.events.push({ y: b, t: 'child_born', text: `${ks === 'm' ? 'Son' : 'Daughter'} @${c.id} was born.` }); }
    if (y - b < 18 || rng.chance(0.15)) { home.push(c); c.events.push({ y: b, t: 'born', text: `Born before the family came to ${W.name}.` }); }
    else { c.status = 'departed'; c.events.push({ y: b, t: 'born', text: `Born before the family came to ${W.name}.` }); c.departedNote = 'stayed behind when the family moved'; }
  }
  for (const q of home.slice(1)) q.literate = modernish ? ageOf(q, y) >= 7 || (ageOf(q, y) >= 5 && rng.chance(0.5)) : ageOf(q, y) >= 8 && rng.chance(S.literacy);

  // their life before, from LifeWeaver's timeline. Events about the partner and children who come are replaced by linked ones above.
  const comingNames = [partner, ...kids].filter(Boolean).map(r => String(r.name || '').trim()).filter(Boolean);
  // (their life before arrival only: a locked death year is left out here, the town carries it out later)
  const dy = P.f.deathYear.v; P.f.deathYear.v = '';
  let tl; try { tl = withTown(W, null, () => LW.buildTimeline(P)).filter(e => e.year <= y); } finally { P.f.deathYear.v = dy; }
  for (const e of tl) {
    if (e.cat === 'life' && /^born/i.test(e.text)) { main.events.push({ y: e.year, t: 'born', text: `${e.text}, before coming to ${W.name}.`, lw: true }); continue; }
    if (e.cat === 'family' && comingNames.some(n => e.text.includes(n)) && !/\bdied\b/i.test(e.text)) continue;
    main.events.push({ y: e.year, t: makerEventType(e), text: e.text.replace(/\.$/, '') + '.', lw: true });
  }
  if (!main.events.some(e => e.t === 'born')) main.events.push({ y: main.born, t: 'born', text: `Born elsewhere, before coming to ${W.name}.` });

  // a home, minds, skills and work, as for other newcomers
  newHousehold(W, rng, home, y);
  for (const q of home) addEvent(W, q, y, 'arrived', `Came to ${W.name}${q === main ? '' : ' with @' + main.id}.`);
  for (const q of home) { mindOf(q); q.skills = {}; for (const k of Object.keys(q.aptitude)) q.skills[k] = Math.round(q.aptitude[k] * 0.35 + Math.min(20, ageOf(q, y) - 10)); q.hist = []; }
  assignNewcomerJobs(W, rng, home, y, R);
  // their own job, if the town has it and there is an opening (agreed)
  if (curJob) {
    const title = String(curJob.title).trim().toLowerCase(), a = ageOf(main, y);
    const o = (era.occupations || []).find(x => String(x.name).toLowerCase() === title);
    if (o && main.occId !== o.id && !o.apprentice && !o.spouseOf && !isOfficeOcc(W, o.id) && a >= o.min && !(o.max && a > o.max) && !(o.celibate && (main.spouse || main.children.length)) && !(o.sex !== 'any' && o.sex !== main.sex && S.genderRoles === 'strict')) {
      const slots = jobSlots(W, lives(W).filter(q => q.occId).length);
      if ((slots.want[o.id] || 0) - (slots.have[o.id] || 0) > 0.3) startJob(W, rng, main, o, y, 'Took up the same work they did before coming here.', R);
    }
  }
  // a locked death year stays locked: nothing in the town can kill them before it, and they die in that year (agreed)
  if (P.f.deathYear.l && v('deathYear') !== '') {
    const d = +v('deathYear');
    main.lockedDeath = { y: d, s: d === y ? rng.int(s, 3) : rng.int(0, 3), cause: v('deathCause') || null };
    W.lockedDeaths = W.lockedDeaths || []; W.lockedDeaths.push(main.id);
  }
  R.arrivals = (R.arrivals || 0) + home.length;
  W.log.push({ y, s, t: 'arrivals', text: `@${main.id} arrived${home.length > 1 ? ` with ${home.length - 1} of their family` : ''}.` });
  return `${main.first} arrived${home.length > 1 ? ` with ${home.length - 1} of their family` : ''}.`;
}

// Each season: anyone whose locked death year and season has come dies now.
function makerLockedDeaths(W, rng, y, s, R) {
  if (!W.lockedDeaths || !W.lockedDeaths.length) return;
  for (const id of W.lockedDeaths) {
    const p = W.people[id]; if (!p || !isAlive(p) || !p.lockedDeath || p.lockedDeath.y !== y || p.lockedDeath.s !== s) continue;
    const old = ageOf(p, y) >= 65, era = eraOf(W);
    die(W, rng, p, y, p.lockedDeath.cause || (old ? rng.pick(era.oldCauses) : rng.pick(era.illnesses)), old ? 'old' : 'illness', R);
  }
  W.lockedDeaths = W.lockedDeaths.filter(id => W.people[id] && isAlive(W.people[id]) && W.people[id].lockedDeath);
}
// Unlocking hands their death back to the town.
function makerUnlockDeath(W, p) {
  if (!p.lockedDeath) return 'Their death year is not locked.';
  const was = p.lockedDeath.y; delete p.lockedDeath;
  W.lockedDeaths = (W.lockedDeaths || []).filter(id => id !== p.id);
  logEdit(W, `Unlocked @${p.id}'s death year (it was ${was}). The town now decides when they die.`);
  return null;
}
if (typeof module !== 'undefined') Object.assign(module.exports, { makerParty, makerRowSex, makerMoveProblems, makerPlanCheck, makerPlanText, makerMoveIn, makerLockedDeaths, makerUnlockDeath, MAKER_TRAIT_WORDS });

/* ---------- showing what LifeWeaver knew about a made person ---------- */
// [label, text] pairs, only the ones that are filled in.
function makerDetails(W, p) {
  const m = p.made; if (!m) return [];
  const yl = y => { const n = makerNum(y); return n == null ? String(y || '').trim() : ERAS[W.era].yearLabel(n); };
  const rows = [
    ['Notable features', m.features], ['Dreams', m.dreams], ['Biggest regret', m.regret],
    ['Personality, in words', (m.traitWords || []).join(', ')], ['Words not used for the personality scores', (m.otherTraits || []).join(', ')],
    ['Born in', m.birthPlace], ['Lived in before', m.livedIn], ['Work before coming', m.job],
    ['Turning points', (m.turning || []).filter(t => String(t.what || '').trim()).map(t => `${yl(t.year)}: ${String(t.what).trim()}${String(t.change || '').trim() ? ` (how it changed them: ${String(t.change).trim()})` : ''}`).join('\n')],
    ['Their own events', (m.own || []).filter(t => String(t.what || '').trim()).map(t => `${yl(t.year)}: ${String(t.what).trim()}`).join('\n')]
  ];
  return rows.filter(([, v]) => String(v || '').trim()).map(([k, v]) => [k, String(v).trim()]);
}
// Plain text for the family-tree file's notes.
function makerDetailText(W, p) {
  if (!p.made) return '';
  const d = makerDetails(W, p).map(([k, v]) => `${k}: ${v.replace(/\n/g, '; ')}`);
  return [`Made with the person maker.`, ...d, p.made.story ? `Life story before coming to ${W.name}: ${String(p.made.story).replace(/\s*\n+\s*/g, ' ')}` : ''].filter(Boolean).join('\n');
}
// An extra Excel sheet, only when some of the people were made with the person maker.
function makerSheet(W, people) {
  const made = people.filter(p => p.made); if (!made.length) return null;
  const cols = ['Notable features', 'Dreams', 'Biggest regret', 'Personality, in words', 'Words not used for the personality scores', 'Born in', 'Lived in before', 'Work before coming', 'Turning points', 'Their own events'];
  return { name: 'Made people', rows: [['ID', 'Name', ...cols, 'Life story before coming'], ...made.map(p => { const d = Object.fromEntries(makerDetails(W, p)); return [p.id, `${p.first} ${p.last}`, ...cols.map(c => (d[c] || '').replace(/\n/g, '; ')), String(p.made.story || '')]; })] };
}
if (typeof module !== 'undefined') Object.assign(module.exports, { makerDetails, makerDetailText, makerSheet });
