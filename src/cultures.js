// ---------- Name cultures ----------
// Lists may be plain arrays, or "bands": [[bornBeforeYear, [...names]], ...] so names fit the birth year.
const CULTURES = {
  medievalEnglish: {
    label: 'English', language: 'Middle English',
    male: ['John','William','Robert','Richard','Thomas','Walter','Roger','Hugh','Henry','Adam','Geoffrey','Simon','Ralph','Nicholas','Peter','Stephen','Gilbert','Alan','Reginald','Philip','Osbert','Bartholomew','Laurence','Martin','Edmund','Godfrey','Jordan','Elias','Hamo','Matthew','Michael','Andrew','Gervase','Herbert','Warin'],
    female: ['Alice','Agnes','Joan','Matilda','Emma','Margery','Isabel','Juliana','Cecily','Edith','Christina','Beatrice','Margaret','Sybil','Avice','Lettice','Maud','Rose','Amice','Felicia','Petronilla','Eleanor','Elena','Katherine','Mabel','Lucy','Hawise','Isolde','Denise','Idonea','Basilia','Gunilda'],
    surnames: ['Atwood','Baker','Carter','Cooper','Fletcher','Miller','Smith','Taylor','Thatcher','Webb','Wright','Shepherd','Fisher','Brewer','Mason','Turner','Hayward','Reeve','Bond','Freeman','Godwin','Hobbes','Langley','Marsh','Brook','Hill','Green','Field','Bradley','Stone','Wood','Underwood','Ashby','Thorne','Fowler','Hunt','Kemp','Cole','Ward','Page','Cook','Dyer','Tanner','Skinner','Glover','Sawyer','Potter','Archer','Bowman','Chandler','Draper','Fuller','Hooper','Lister','Mercer','Parker','Pinder','Plowman','Sadler','Salter','Slater','Spicer','Tyler','Walker','Warner','Wheeler','Wells','Westbrook','Northcote','Southwell','Eastwood','Ashdown','Oakley','Rowe','Pyke','Crane','Sparrow','Fox','Wolfe','Lamb','Bull','Hart','Swan','Goodman','Little','Long','Black','White','Read','Brown','Gray','Young','Proudfoot','Lightfoot','Ayleward','Osbern','Aldred','Gamel','Thurkill','Mallory','Bysshe','Cobbe','Dunning','Elwyn','Frere','Gosse','Harding','Ingram','Jolliffe']
  },
  frontierAnglo: {
    label: 'American', language: 'English',
    male: ['John','William','James','George','Charles','Thomas','Henry','Joseph','Samuel','Robert','Edward','Frank','Daniel','Benjamin','Jacob','Isaac','Elijah','Amos','Jesse','Levi','Silas','Wyatt','Hiram','Ezra','Caleb','Abraham','Nathaniel','Walter','Albert','Andrew','Lewis','Moses','Virgil','Josiah','Augustus','Cyrus','Ephraim','Zachariah'],
    female: ['Mary','Sarah','Elizabeth','Martha','Nancy','Margaret','Catherine','Ann','Emma','Ellen','Harriet','Susan','Clara','Jane','Eliza','Rebecca','Lydia','Abigail','Lucy','Hattie','Minnie','Ida','Cora','Mattie','Louisa','Rachel','Hannah','Amelia','Josephine','Lavinia','Delia','Permelia'],
    surnames: ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Taylor','Thomas','Moore','Martin','Jackson','Thompson','White','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Hill','Green','Adams','Baker','Nelson','Carter','Mitchell','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Morris','Cook','Rogers','Morgan','Cooper','Bailey','Reed','Howard','Ward','Brooks','Wood','Bennett','Gray','Hughes','Price','Sanders','Long','Ross','Foster','Powell','Jenkins','Perry','Russell','Bell','Coleman','Butler','Barnes','Fisher','Hayes','Graham','Wallace','Hamilton','Boone','Crockett','Holloway','Pruitt','Tolliver','Whitaker','Yancey']
  },
  irish: {
    label: 'Irish', language: 'English',
    male: ['Patrick','Michael','John','James','Thomas','Daniel','Dennis','Timothy','Cornelius','Bartholomew','Owen','Hugh','Francis','Peter','Martin','Edward'],
    female: ['Mary','Bridget','Catherine','Margaret','Ellen','Honora','Johanna','Julia','Anne','Norah','Kathleen','Eileen','Rose','Delia'],
    surnames: ['Murphy','Kelly','Sullivan','Walsh','Byrne','Ryan','O\'Brien','O\'Connor','McCarthy','Doyle','Gallagher','Kennedy','Lynch','Murray','Quinn','Moore','McLaughlin','Carroll','Connolly','Daly','Flanagan','Brennan','Burke','Fitzgerald','Keane','Nolan']
  },
  german: {
    label: 'German', language: 'German',
    male: ['Johann','Heinrich','Friedrich','Wilhelm','Karl','Hans','Georg','Jakob','August','Christian','Ludwig','Hermann','Otto','Peter','Konrad','Gottlieb'],
    female: ['Anna','Maria','Katharina','Elisabeth','Margaretha','Christina','Barbara','Sophia','Wilhelmina','Louisa','Dorothea','Magdalena','Frieda','Gertrud'],
    surnames: ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hartmann','Lange','Werner','Krause','Lehmann']
  },
  mexican: {
    label: 'Mexican', language: 'Spanish',
    male: ['José','Juan','Francisco','Antonio','Manuel','Jesús','Pedro','Miguel','Ramón','Rafael','Ignacio','Santiago','Joaquín','Tomás','Vicente','Luis'],
    female: ['María','Guadalupe','Josefa','Juana','Francisca','Rosa','Carmen','Dolores','Refugio','Manuela','Teresa','Antonia','Soledad','Luz'],
    surnames: ['García','Martínez','Hernández','López','González','Pérez','Sánchez','Ramírez','Flores','Torres','Rivera','Gómez','Díaz','Cruz','Morales','Reyes','Ortiz','Gutiérrez','Chávez','Romero','Vigil','Baca','Archuleta','Trujillo']
  },
  chinese: {
    label: 'Chinese', language: 'Cantonese',
    male: ['Ah Sing','Wing','Lee','Hop','Kee','Fong','Sam','Yee','Chung','Wah','Kwong','Ming','Jun','Hao','Wei','Bo'],
    female: ['Mei','Lan','Ying','Hua','Li','Xiu','Fen','Jing','Lin','Yan','Qing','Ai'],
    surnames: ['Wong','Chan','Lee','Lum','Chin','Fong','Yee','Ng','Ho','Louie','Chew','Quan','Wu','Lau','Tam']
  },
  modernAmerican: {
    label: 'American', language: 'English',
    male: { bands: [
      [1960, ['Robert','James','John','Michael','William','David','Richard','Charles','Thomas','Gary','Larry','Ronald','Donald','Kenneth','Dennis','Jerry','Paul','Raymond','Frank','Harold','Walter','Roger']],
      [1985, ['Michael','Christopher','Jason','David','James','John','Robert','Brian','Matthew','Daniel','Joshua','Kevin','Eric','Jeffrey','Scott','Steven','Mark','Timothy','Jeremy','Travis','Chad','Derek']],
      [2005, ['Michael','Christopher','Matthew','Joshua','Andrew','Tyler','Ryan','Brandon','Jacob','Austin','Justin','Kyle','Nicholas','Zachary','Logan','Dylan','Ethan','Cody','Jordan','Hunter','Caleb','Connor']],
      [9999, ['Liam','Noah','Mason','Ethan','Jackson','Aiden','Lucas','Oliver','Elijah','Caden','Carter','Wyatt','Henry','Owen','Leo','Grayson','Hudson','Jaxon','Levi','Theodore','Asher','Silas']]
    ]},
    female: { bands: [
      [1960, ['Mary','Patricia','Linda','Barbara','Susan','Nancy','Deborah','Sandra','Carol','Sharon','Donna','Judith','Karen','Betty','Shirley','Brenda','Joyce','Diane','Janet','Kathleen','Gloria','Peggy']],
      [1985, ['Jennifer','Lisa','Michelle','Amy','Kimberly','Melissa','Heather','Angela','Stephanie','Nicole','Elizabeth','Amanda','Rebecca','Julie','Tracy','Christina','Laura','Kelly','Dawn','Wendy','Tammy','Crystal']],
      [2005, ['Jessica','Ashley','Sarah','Emily','Brittany','Samantha','Hannah','Taylor','Megan','Lauren','Kayla','Alexis','Madison','Rachel','Courtney','Morgan','Haley','Chelsea','Abigail','Brianna','Kaitlyn','Destiny']],
      [9999, ['Emma','Olivia','Ava','Sophia','Isabella','Mia','Harper','Charlotte','Amelia','Evelyn','Abigail','Ella','Avery','Lily','Nora','Scarlett','Aria','Chloe','Riley','Zoey','Hazel','Willow']]
    ]},
    surnames: ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Taylor','Thomas','Moore','Martin','Jackson','Thompson','White','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Hill','Green','Adams','Baker','Nelson','Carter','Mitchell','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Morris','Murphy','Cook','Rogers','Morgan','Cooper','Peterson','Bailey','Reed','Kelly','Howard','Cox','Ward','Richardson','Watson','Brooks','Wood','James','Bennett','Gray','Hughes','Price','Sanders','Myers','Long','Ross','Foster','Powell','Jenkins','Perry','Russell','Sullivan','Bell','Coleman','Butler','Henderson','Barnes','Fisher','Hayes','Graham','Wallace','Hamilton','Olson','Larson','Schmidt','Becker','Novak','Kowalski','Jensen','Lindqvist','Duffy','Brennan','Washington','Freeman','Banks','Hale']
  },
  hispanic: {
    label: 'Hispanic', language: 'Spanish',
    male: ['José','Luis','Carlos','Juan','Miguel','Jorge','Alejandro','Diego','Mateo','Santiago','Daniel','Antonio','Javier','Ricardo','Fernando','Eduardo','Andrés','Raúl','Sergio','Emilio'],
    female: ['María','Ana','Sofía','Valentina','Camila','Isabella','Lucía','Gabriela','Daniela','Carmen','Rosa','Elena','Ximena','Paola','Adriana','Mariana','Luz','Verónica','Alejandra','Teresa'],
    surnames: ['García','Martínez','Rodríguez','López','Hernández','González','Pérez','Sánchez','Ramírez','Torres','Flores','Rivera','Gómez','Díaz','Morales','Reyes','Cruz','Ortiz','Gutiérrez','Chávez','Mendoza','Ruiz','Vargas','Castillo','Jiménez','Herrera']
  },
  eastAsian: {
    label: 'East Asian', language: 'Mandarin',
    male: ['Wei','Jun','Hao','Ming','Jian','Lei','Tao','Yong','Bo','Chen','Zhi','Kai'],
    female: ['Mei','Lin','Xin','Yan','Hui','Jing','Li','Na','Ying','Fang','Xue','Qing'],
    surnames: ['Chen','Wang','Li','Zhang','Liu','Yang','Huang','Zhao','Wu','Zhou','Xu','Sun','Ma','Zhu','Hu','Lin']
  },
  korean: {
    label: 'Korean', language: 'Korean',
    male: ['Min-jun','Seo-jun','Ji-ho','Do-yun','Jae-won','Hyun-woo','Sung-min','Joon-ho','Tae-yang','Dong-hyun'],
    female: ['Ji-woo','Seo-yeon','Min-seo','Ha-eun','Soo-ah','Ji-min','Eun-ji','Hye-jin','Yu-na','Da-eun'],
    surnames: ['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Shin']
  },
  vietnamese: {
    label: 'Vietnamese', language: 'Vietnamese',
    male: ['Minh','Huy','Khoa','Long','Nam','Phuc','Quang','Tuan','Bao','Duc'],
    female: ['Linh','Lan','Mai','Ngoc','Thao','Trang','Hoa','Hanh','Anh','Vy'],
    surnames: ['Nguyen','Tran','Le','Pham','Hoang','Phan','Vu','Dang','Bui','Do','Ngo','Duong']
  },
  southAsian: {
    label: 'South Asian', language: 'Hindi',
    male: ['Arjun','Rohan','Vikram','Raj','Anil','Sanjay','Rahul','Amit','Dev','Karan','Nikhil','Suresh','Aarav','Vivaan'],
    female: ['Priya','Anjali','Kavya','Neha','Divya','Sunita','Pooja','Asha','Meera','Lakshmi','Ananya','Diya','Isha','Riya'],
    surnames: ['Patel','Shah','Singh','Kumar','Sharma','Gupta','Reddy','Rao','Iyer','Mehta','Joshi','Desai','Nair','Chopra','Malhotra','Kapoor']
  },
  nigerian: {
    label: 'Nigerian', language: 'Yoruba',
    male: ['Chinedu','Emeka','Oluwaseun','Tunde','Ifeanyi','Babatunde','Chukwuemeka','Femi','Kelechi','Obinna','Segun','Adewale','Uche','Kunle'],
    female: ['Ngozi','Amara','Chiamaka','Folake','Adaeze','Funmilayo','Nkechi','Yetunde','Ifeoma','Bisola','Chioma','Temitope','Zainab','Ebele'],
    surnames: ['Okafor','Adeyemi','Okonkwo','Balogun','Eze','Nwosu','Adebayo','Ogunleye','Okeke','Olawale','Chukwu','Afolabi','Ibrahim','Bello','Obi','Onyeka']
  },
  arabic: {
    label: 'Arab', language: 'Arabic',
    male: ['Omar','Ahmed','Youssef','Karim','Hassan','Ali','Khalid','Tariq','Samir','Nabil','Rami','Ziad','Faisal','Mahmoud'],
    female: ['Fatima','Layla','Amira','Noor','Yasmin','Salma','Rania','Huda','Mariam','Dina','Leila','Hana','Samira','Nadia'],
    surnames: ['Haddad','Mansour','Khalil','Nasser','Saleh','Farouk','Hamdan','Aziz','Rahman','Najjar','Darwish','Sabbagh','Khoury','Habib','Qasim']
  },
  slavic: {
    label: 'Ukrainian', language: 'Ukrainian',
    male: ['Dmytro','Ivan','Serhiy','Oleksiy','Mykola','Mykhailo','Andriy','Taras','Bohdan','Yuriy','Pavlo','Vasyl'],
    female: ['Anastasia','Olha','Natalia','Iryna','Svitlana','Olena','Oksana','Kateryna','Yulia','Tetiana','Daryna','Halyna'],
    surnames: ['Petrenko','Kovalenko','Bondarenko','Shevchenko','Tkachenko','Kravchenko','Melnyk','Boyko','Moroz','Lysenko','Savchenko','Rudenko','Marchenko','Hnatyuk']
  },
  japanese: {
    label: 'Japanese', language: 'Japanese',
    male: ['Haruto','Ren','Takeshi','Hiroshi','Sota','Kaito','Yuto','Daiki','Kenji','Riku','Takumi','Shota'],
    female: ['Yui','Aoi','Sakura','Yuna','Akiko','Haruka','Mio','Rin','Emi','Naomi','Keiko','Hina'],
    surnames: ['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Matsumoto']
  },
  brazilian: {
    label: 'Brazilian', language: 'Portuguese',
    male: ['João','Pedro','Lucas','Gabriel','Rafael','Thiago','Matheus','Gustavo','Felipe','Bruno','Rodrigo','Leonardo'],
    female: ['Ana','Beatriz','Larissa','Juliana','Fernanda','Mariana','Camila','Letícia','Bruna','Amanda','Gabriela','Luana'],
    surnames: ['Silva','Santos','Oliveira','Souza','Costa','Pereira','Rodrigues','Almeida','Nascimento','Lima','Araújo','Fernandes','Carvalho','Gomes']
  },
  modernGerman: {
    label: 'German', language: 'German',
    male: ['Lukas','Felix','Jonas','Leon','Maximilian','Paul','Tobias','Stefan','Thomas','Andreas','Jan','Florian'],
    female: ['Anna','Lena','Lea','Hannah','Marie','Sophie','Julia','Katrin','Sabine','Claudia','Laura','Mia'],
    surnames: ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Richter','Klein','Wolf']
  },
  british: {
    label: 'British', language: 'English',
    male: ['Oliver','George','Harry','Jack','James','William','Thomas','Daniel','Samuel','Joseph','Callum','Liam','Ian','Graham'],
    female: ['Olivia','Amelia','Isla','Emily','Poppy','Grace','Sophie','Charlotte','Lucy','Chloe','Fiona','Gemma','Hannah','Rosie'],
    surnames: ['Smith','Jones','Taylor','Brown','Davies','Evans','Wilson','Thomas','Roberts','Johnson','Walker','Wright','Robinson','Thompson','Hughes','Patel','Clarke','Hall']
  },
  fantasy: {
    label: 'Realm-born', language: 'the Common Tongue',
    gen: {
      start: ['Ar','Bel','Cor','Dar','El','Fen','Gar','Hal','Is','Jor','Kel','Lor','Mar','Nor','Or','Per','Quen','Ror','Sar','Tor','Ul','Var','Wyn','Yor','Zan','Bran','Cal','Ed','Gil','Ther','Al','Rho','Ser','Tam','Ey'],
      maleEnd: ['an','en','ric','dor','wyn','ar','ion','el','us','mar','rin','os','ald','eth','ick','aren','vin','orn','ias','ard'],
      femaleEnd: ['a','ia','wen','elle','ira','yn','ara','eth','wyn','ie','ora','issa','ene','aya','iel','ith','anne','ella'],
      sur1: ['Ash','Thorn','Raven','Oak','Iron','Silver','Stone','Mist','Frost','Brook','Gold','Holl','Bright','Black','Swift','Elder','Moon','Wolf','Briar','Fern','Hawk','Red','Grim','Wilde','Marsh','Copper','Ember','Storm','Hearth','Barrow'],
      sur2: ['wood','vale','ford','hollow','crest','bane','wright','mere','field','shaw','more','dale','brook','helm','well','wick','barrow','ridge','song','water']
    }
  },
  scifi: {
    label: 'Colony-born', language: 'Colony Standard',
    male: ['Orion','Kai','Atlas','Cassius','Ezra','Soren','Idris','Rhys','Jaxon','Leon','Mateo','Ravi','Kenji','Tobias','Elias','Dax','Ansel','Bram','Cyrus','Lior','Nikolai','Arlo','Zane','Theo'],
    female: ['Nova','Zara','Juno','Lyra','Vega','Rhea','Ines','Tamsin','Anya','Selene','Mira','Kira','Iris','Talia','Esme','Freya','Lumi','Noor','Sana','Yara','Aurora','Elara','Wren','Thea'],
    surnames: ['Okafor','Chen','Ivanova','Patel','Silva','Nakamura','Haddad','Kowalski','Mbeki','Lindqvist','Reyes','Kaur','Novak','Osei','Park','Moreau','Alvarez','Tanaka','Brennan','Adeyemi','Volkov','Hayashi','Sorensen','Mensah','Achterberg','Castellanos','Dubois','Farouk','Gallagher','Halvorsen','Iwu','Jansen','Kapoor','Lopes','Mwangi','Nyberg','Ortega','Quist','Rasmussen','Sato']
  }
};

// Home places for the "dropped into an empty world" scenario, by culture.
const HOMELANDS = {
  modernAmerican: ['Ohio','Texas','Oregon','Georgia','Minnesota','Arizona','Maine','Kentucky'],
  hispanic: ['Mexico City','Guadalajara','Bogotá','Lima','Madrid','Buenos Aires','Los Angeles'],
  eastAsian: ['Shanghai','Chengdu','Taipei','Guangzhou','Beijing'],
  korean: ['Seoul','Busan','Daegu'],
  vietnamese: ['Hanoi','Ho Chi Minh City','Da Nang'],
  southAsian: ['Mumbai','Delhi','Bangalore','Lahore','Dhaka'],
  nigerian: ['Lagos','Abuja','Ibadan','Enugu','Accra'],
  arabic: ['Cairo','Amman','Beirut','Casablanca','Baghdad','Dubai'],
  slavic: ['Kyiv','Lviv','Odesa','Kharkiv'],
  japanese: ['Tokyo','Osaka','Sapporo','Fukuoka'],
  brazilian: ['São Paulo','Rio de Janeiro','Salvador','Recife'],
  modernGerman: ['Berlin','Munich','Hamburg','Vienna','Zurich'],
  british: ['London','Manchester','Glasgow','Cardiff','Leeds','Dublin']
};
