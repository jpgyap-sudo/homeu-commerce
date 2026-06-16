import http from 'http';
let d = '';
http.get('http://localhost:3000/admin/login', (res) => {
  res.on('data', (c) => { d += c; });
  res.on('end', () => {
    console.log('Admin Login Page Analysis:');
    console.log('  HTML size:', d.length, 'bytes');
    console.log('  Has admin-theme.css:', d.includes('admin-theme'));
    console.log('  Has homeu CSS vars:', d.includes('--homeu-'));
    console.log('  Has DaVinciOS graphic-logo:', d.includes('graphic-logo'));
    console.log('  Has custom Logo component ref:', d.includes('DaVinciOSAdminLogo') || d.includes('Logo'));
    console.log('  Login section:', d.includes('class="login"') ? 'found' : 'missing');
    // Find the login brand section
    const brandMatch = d.match(/login__brand[^]*?<\/div>/);
    if (brandMatch) console.log('  Login brand HTML:', brandMatch[0].substring(0, 300));
  });
}).on('error', (e) => console.error('Error:', e.message));
