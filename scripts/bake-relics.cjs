/* Small, original woodcut objects for the six starting relics.
   Build: node scripts/bake-relics.cjs (sharp must be available).
   No shadows or backgrounds: the menu supplies the contrasting ground. */
const path=require('node:path'), sharp=require('sharp');
const dest=path.join(__dirname,'../public/art');
const ink='#2a302b', brass='#c29658', pale='#f1d398', patina='#718576', dark='#534b3b';
const cut=(d,fill,width=2.5)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+(width?ink:'none')+'" stroke-width="'+width+'" stroke-linejoin="round" stroke-linecap="round"/>';
const line=(d,color,width=1.9)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
const dot=(x,y,r,c)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'"/>';
const group=(t,s)=>'<g transform="'+t+'">'+s+'</g>';
const body=(s)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 128 128">'+s+'</svg>');
const stillglass=group('rotate(-18 64 64)',
  cut('M57 24Q55 15 61 12Q69 9 73 16Q75 22 70 26L66 23Q71 18 67 16Q61 14 62 22Z',brass)+
  cut('M62 22Q79 23 95 37L104 56 101 78 88 96 70 103 65 113 60 110 56 102Q33 98 22 76L22 54 31 36 46 26Z',brass)+
  cut('M64 31Q82 31 92 47Q103 64 92 81Q81 100 61 97Q41 95 31 77Q22 57 37 41Q47 30 64 31Z','#6d5640')+
  cut('M65 35Q80 34 89 48L94 63 88 78 71 91 55 91 40 81 33 65 39 48 50 39Z','#be7a40')+
  cut('M38 59L52 42 65 37 82 42 86 49 59 68 44 83 37 73Z','#e5a955',0)+
  cut('M44 77Q55 61 77 47L82 48Q62 64 49 83Z','#f6cf7c',0)+
  cut('M48 51Q59 38 72 40L62 44 52 55Z','#fff1b0',0)+
  line('M26 65Q25 52 34 42M30 78Q38 93 50 96M76 96L86 91M86 88l7 -7',pale)+
  cut('M64 52l4 5 8 2 -6 3 1 7 -5 -4 -5 5 1 -8 -5 -3 7 -1Z','#875e36',1)+
  line('M96 51l3 7m-4 -2l3 7M36 33l5 -3M38 36l6 -4','#6f6748',1.3)+dot(32,62,2,pale)+dot(91,64,1.8,pale));
const waywick=
  cut('M33 77Q26 66 30 52Q34 58 39 59Q32 42 44 30Q42 43 50 45Q49 31 61 26Q66 20 63 12Q81 21 72 39Q80 37 87 25Q91 38 82 51Q90 47 94 40Q98 57 84 70L74 80Z','#d57d43')+
  cut('M44 71Q39 58 44 52Q48 58 52 58Q50 47 62 40Q74 32 70 26Q78 38 67 51Q77 52 83 44Q84 63 67 73Z','#f0ad59',0)+
  cut('M52 73Q48 64 57 57Q66 53 66 47Q71 55 64 62Q71 63 73 59Q72 69 62 76Z','#ffe0a0',0)+
  cut('M53 80L52 69 54 62 58 63 59 72 64 79Z','#5a4938')+
  cut('M26 75Q39 68 62 72Q82 77 98 65L103 68Q98 83 79 89Q60 95 40 87Q31 83 26 75Z',brass)+
  cut('M33 80Q57 91 76 85Q88 83 96 76Q90 94 73 99Q51 104 38 90Z','#876846')+
  cut('M55 96Q60 99 69 98L73 106 82 111Q70 117 48 111L54 107Z',brass)+
  line('M33 76Q49 74 57 77M41 84Q57 91 70 87M52 109q10 2 18 0',pale)+line('M44 88l4 7m1 -6l3 7m3 -6l2 6',dark,1.3)+
  cut('M93 22q-1 -6 4 -11q2 7 -4 11Z','#eaa45c',0)+cut('M36 40q-6 -4 -4 -10q5 3 4 10Z','#df9961',0);
const briar=group('rotate(8 64 64)',
  cut('M12 51L40 47 89 48 114 55 112 75 83 70 38 73 13 71Z','#895d45')+
  line('M15 55l16 -1m68 1l11 3M17 68l11 -1m70 0l11 2','#bea073',1.5)+dot(22,61,2.4,ink)+dot(105,63,2,ink)+
  cut('M32 43L45 40 57 28 64 19 71 31 89 40 95 46 94 68Q86 89 63 105Q41 96 31 76L28 63Z','#91a082')+
  cut('M38 49L50 45 64 34 83 45 87 51 85 69Q78 84 64 94Q48 87 38 71L35 61Z','#364f46')+
  cut('M61 91Q49 79 49 66L42 63 34 52 47 57 46 45 52 54 53 61Q63 60 67 49L66 42 73 35 72 48 83 42 78 52 69 56Q62 62 58 70L61 80 71 72 77 61 76 72 87 66 80 76 66 83Z',brass,1.7)+
  line('M36 46l11 -4 13 -12M90 52l-1 15M47 86l9 7',pale,2.2)+dot(63,27,1.8,pale)+
  cut('M25 78L20 83 24 73 29 69Z','#92a383')+cut('M95 43l6 -7 -1 8 -5 5Z','#92a383'));
const whetstone=
  cut('M18 72L75 21 100 21 111 38 109 55 53 108 27 106 16 91Z','#61787a')+
  cut('M20 71L75 23 98 22 108 37 53 90 30 89Z','#a4b0a0')+
  cut('M30 89L53 90 108 37 107 52 52 104 30 102Z','#748b88')+
  cut('M23 72L31 84 51 84 101 37 95 29 78 28Z','#889b92',0)+
  line('M32 84l18 1 52 -48M54 96l39 -37','#d6d4b6',2.2)+
  line('M66 42l12 -10M70 44l7 -6M44 72l21 -18M47 75l13 -12M56 73l18 -16M87 48l7 -6','#566d69',1.5)+
  cut('M25 65l8 -7 17 14 12 1 6 -5 3 5 -10 12 -14 -2Z','#946c4c')+
  line('M29 66l19 13 11 2m-25 -19l17 12 8 1','#d2aa72',2)+
  cut('M20 80Q8 84 12 94Q14 102 23 103L33 99 31 94 23 98Q17 98 17 92Q17 87 23 86Z','#bd925e')+
  line('M19 83q-6 2 -5 8M20 100l6 -.5',pale,1.4);
const longfeather=
  cut('M23 108Q31 96 34 82Q31 60 49 43L47 51Q67 25 86 20Q97 15 107 13Q108 23 100 38L94 45 98 45Q86 63 75 70L65 73 70 75Q52 88 37 87L28 110Z','#c8c6a2')+
  cut('M35 84Q38 61 54 48Q53 53 52 57Q70 34 92 25L104 16Q88 39 72 52L53 72Z','#ede2ba',0)+
  cut('M38 84Q56 75 68 65L61 71 79 62Q66 77 44 84Z','#809780',0)+
  cut('M50 60L57 47 73 35 68 40 63 52Z','#667c69',0)+
  cut('M69 45L77 31 90 24 87 28 82 35Z','#819381',0)+
  cut('M57 75L69 62 88 53 81 61 72 66 75 65Z','#758875',0)+
  line('M27 105Q40 79 60 58Q77 42 97 25','#96764b',2.7)+line('M30 99Q48 68 75 46','#e1c48e',1.3)+
  cut('M25 94l10 -7 6 3 -4 7 -9 5Z',brass,1.6)+line('M27 95l9 -6M29 98l9 -6',pale,1.5)+
  cut('M26 98Q18 102 17 113Q21 111 25 110L23 107 30 100Z','#6d826d',1.4);
const quicknock=
  cut('M39 98Q52 82 52 69Q54 54 47 41L34 30 28 18Q26 15 25 23Q24 33 30 41L36 48Q26 47 18 39Q14 33 15 41Q18 54 32 59L41 64Q43 72 34 86L29 94Q25 102 32 106Z','#c3ab80')+
  cut('M48 90Q62 77 66 63L64 42 53 23Q51 16 53 13Q63 18 69 32L71 37Q75 30 72 17Q71 13 74 12Q83 17 83 30Q84 48 76 64L73 72Q87 66 92 49L91 36Q92 27 95 26Q101 34 99 48Q105 44 109 35Q112 31 112 39Q110 52 101 60L94 65Q83 81 65 86L56 101Z','#e1cda1')+
  line('M32 99Q46 80 46 66M43 60l-10 -6M57 88Q73 70 74 55M76 48q6 -11 4 -21M82 77l12 -10','#927957',2.1)+
  line('M63 77l5 -13M68 45l-2 -6M96 51l-4 9M29 30l4 7','#fff1c7',2)+
  cut('M28 88Q44 89 53 101L48 112Q35 105 22 100Z','#976a4d')+line('M27 92l22 12M25 96l23 12','#e3bb7f',2.2)+
  cut('M49 84Q58 80 64 78L70 84 68 89Q58 90 56 96L48 93Z',brass)+line('M52 85l6 4m1 -7l5 5',pale,1.8)+
  cut('M41 102q14 2 22 -2l6 2 -6 7 -2 -4q-9 3 -19 1Z','#7d8c72',1.4);
(async()=>{for(const [id,design] of Object.entries({stillglass,waywick,briar,whetstone,longfeather,quicknock})){
 await sharp(body(design)).resize(128,128).png({palette:true,colours:160,effort:9}).toFile(path.join(dest,'relic-'+id+'.png'));
}})().catch(e=>{console.error(e);process.exitCode=1});
