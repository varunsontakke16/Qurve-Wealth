const fs = require('fs');
const path = require('path');

const dir = './';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (file === 'index.html') {
        content = content.replace(/<link rel="icon" type="image\/png" href="[^"]*favicon\.png" \/>/g, '');
    }

    if (!content.includes('favicon.png')) {
        content = content.replace('</head>', '  <link rel="icon" type="image/png" href="/favicon.png" />\n  </head>');
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    } else if (file === 'index.html') {
        content = content.replace('</head>', '  <link rel="icon" type="image/png" href="/favicon.png" />\n  </head>');
        fs.writeFileSync(filePath, content);
        console.log(`Updated index.html`);
    } else {
        console.log(`Skipped ${file} (already contains favicon)`);
    }
});
