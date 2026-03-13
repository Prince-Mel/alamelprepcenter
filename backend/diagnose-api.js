async function diagnose() {
  const studentId = 'STU7312';
  console.log(`--- Testing API for Student: ${studentId} ---`);
  
  try {
    const res = await fetch(`http://localhost:5000/api/enrollments/${studentId}`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    const data = await res.json();
    console.log('Enrollments Response:', JSON.stringify(data, null, 2));
    
    const coursesRes = await fetch('http://localhost:5000/api/courses');
    const allCourses = await coursesRes.json();
    
    const enrolledIds = data.map(e => e.course_id);
    console.log('Enrolled IDs extracted:', enrolledIds);
    
    const userCourses = allCourses.filter(c => enrolledIds.includes(c.id));
    console.log('Final Result (Courses the student should see):', JSON.stringify(userCourses, null, 2));
    
  } catch (err) {
    console.error('DIAGNOSIS FAILED:', err.message);
  }
}

diagnose();
