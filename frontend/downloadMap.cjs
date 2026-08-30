const fs = require('fs');
const https = require('https');
const path = require('path');

const latMax = 12.8800; 
const latMin = 12.8000; 
const lonMin = 80.1100; 
const lonMax = 80.1900; 
const minZoom = 13; 
const maxZoom = 15; // Optimized zoom for faster download

function lon2tile(lon, zoom) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function lat2tile(lat, zoom) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)); }

const delay = ms => new Promise(res => setTimeout(res, ms));

async function downloadMap() {
    console.log("Starting stealth offline map download...");
    let count = 0;
    
    for (let z = minZoom; z <= maxZoom; z++) {
        const xMin = lon2tile(lonMin, z);
        const xMax = lon2tile(lonMax, z);
        const yMin = lat2tile(latMax, z); 
        const yMax = lat2tile(latMin, z);

        for (let x = xMin; x <= xMax; x++) {
            for (let y = yMin; y <= Math.max(yMin, yMax); y++) {
                const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
                const dir = path.join(__dirname, 'public', 'tiles', z.toString(), x.toString());
                
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const filePath = path.join(dir, `${y}.png`);
                
                if (!fs.existsSync(filePath)) {
                    await new Promise((resolve) => {
                        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, (res) => {
                            if (res.statusCode === 200) {
                                res.pipe(fs.createWriteStream(filePath)).on('finish', resolve);
                                count++;
                                process.stdout.write(`\rDownloaded ${count} valid tiles for VIT Chennai...`);
                            } else {
                                resolve();
                            }
                        }).on('error', resolve);
                    });
                    await delay(150); // Pause to avoid server block
                }
            }
        }
    }
    console.log("\nDownload complete! You can start the frontend now.");
}

downloadMap();