const axios = require('axios');

async function testUpdate() {
  const materialId = 'MAT1773090770066'; // One of the pending ones from previous diagnosis
  try {
    console.log(`Testing update for material: ${materialId}`);
    const res = await axios.put(`http://localhost:5000/api/materials/${materialId}`, {
      approved: true
    });
    console.log('Response:', res.data);
  } catch (error) {
    console.error('Update Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testUpdate();
