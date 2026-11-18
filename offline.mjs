import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('./dist/',import.meta.url));
const read = name => fs.readFileSync(path.join(dist,name),'utf8');
let html = read('index.html');
const jsTag = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
const cssTag = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
if (!jsTag || !cssTag) throw Error('Expected one Vite entry and stylesheet');
const inline = name => fs.readFileSync(path.join(dist,'art',name)).toString('base64');
const mime = name => name.endsWith('webp') ? 'image/webp' : 'image/png';
const images = Object.fromEntries(fs.readdirSync(path.join(dist,'art'))
  .filter(n=>/^woodcut-(?:ground\.webp|props\.png|enemies\.png)$/.test(n)||/^hero-(?:head|body|left-(?:leg|upper|forearm)|right-(?:leg|upper|forearm))\.png$/.test(n))
  .map(n=>[n,[mime(n),inline(n)]]));
if (Object.keys(images).length!==11) throw Error('Incomplete runtime atlas set');
const css = read(cssTag[1]).replace(/(?:\/|\.\/)?art\/title-forest\.webp/g,()=> 'data:image/webp;base64,'+inline('title-forest.webp'));
const setup = 'window.forestArt={};for(const [key,[type,b64]] of Object.entries('+JSON.stringify(images)+')){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));window.forestArt[key]=URL.createObjectURL(new Blob([bytes],{type}));}';
const code = read(jsTag[1]).replace(/<\/script/gi,'<\\/script');
html = html.replace(jsTag[0],'').replace(cssTag[0],()=>'<style>'+css+'</style>').replace('</body>',()=>'<script>'+setup+'</script><script type="module">'+code+'</script></body>');
fs.writeFileSync(process.argv[2] || 'Forest-Nightwatch.html',html);
