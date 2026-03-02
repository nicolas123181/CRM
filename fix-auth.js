import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.astro')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(process.cwd(), 'src', 'pages'));
const injection = `
    // Autenticar la sesión para evitar que RLS bloquee la inserción/actualización
    const accessToken = Astro.cookies.get('sb-access-token')?.value;
    const refreshToken = Astro.cookies.get('sb-refresh-token')?.value;
    if (accessToken && refreshToken) {
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });
    }
`;

let patched = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('if (Astro.request.method === "POST") {') && !content.includes('sb-access-token')) {
        content = content.replace('if (Astro.request.method === "POST") {', 'if (Astro.request.method === "POST") {' + injection);
        fs.writeFileSync(f, content);
        patched++;
        console.log('Patched', f);
    }
});
console.log('Total patched:', patched);
