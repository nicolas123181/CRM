const fs = require('fs');

async function testUpload() {
    const fileContent = fs.readFileSync('package.json'); // Just use a dummy file
    const blob = new Blob([fileContent], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, 'test.json');
    formData.append('bucket', 'Monumentos');

    // Need to provide auth cookies, but we have the admin token from ENV in .env

    try {
        const response = await fetch('http://localhost:4321/api/upload', {
            method: 'POST',
            body: formData,
        });

        const text = await response.text();
        console.log('Upload response status:', response.status);
        console.log('Upload response text:', text);
    } catch (error) {
        console.error('Test upload error:', error);
    }
}

testUpload();
