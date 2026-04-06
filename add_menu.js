const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for(const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if(!content.includes('<button class="menu-toggle"')) {
    content = content.replace(/(<a class="nav-cta"[^>]*>.*?<\/a>)\s*(<\/div>\s*<\/nav>)/, '$1\n        <button class="menu-toggle" aria-label="Toggle navigation">\n          <span></span>\n          <span></span>\n          <span></span>\n        </button>\n      $2');
    fs.writeFileSync(file, content);
    console.log('updated ' + file);
  }
}
