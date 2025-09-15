import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---------- CONFIG ----------
const SUPABASE_URL = 'https://izyofljxfnmcrtyhpkhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eW9mbGp4Zm5tY3J0eWhwa2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODM3MDgsImV4cCI6MjA3MzE1OTcwOH0.LgnXAHlFJ8GEZDpUMG9dXeioCd7Q25pL3hnXcTjkq4Y';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- DOM ----------
const weekGrid = document.getElementById('weekGrid');
const nextCourseContainer = document.getElementById('nextCourseContainer');
const dailyPlanner = document.getElementById('dailyPlanner');
const userEmailEl = document.getElementById('user-email');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const fieldDay = document.getElementById('fieldDay');
const fieldStart = document.getElementById('fieldStart');
const fieldEnd = document.getElementById('fieldEnd');
const fieldCourse = document.getElementById('fieldCourse');
const fieldProfessor = document.getElementById('fieldProfessor');
const fieldLocation = document.getElementById('fieldLocation');
const fieldColor = document.getElementById('fieldColor');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const openAddBtn = document.getElementById('openAddBtn');
const deleteBtn = document.getElementById('deleteBtn');
const modalError = document.getElementById('modalError');
const logoutBtn = document.getElementById('logoutBtn');

let editingCourseId = null;
let currentUser = null;

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

// ---------- EVENTS ----------
openAddBtn.addEventListener('click', () => openAddModal());
cancelBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

fieldStart.addEventListener('input', () => {
    const startTime = fieldStart.value;
    if (startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        let endHours = hours;
        let endMinutes = minutes + 50;

        if (endMinutes >= 60) {
            endMinutes -= 60;
            endHours += 1;
        }

        const formattedEndHours = String(endHours).padStart(2, '0');
        const formattedEndMinutes = String(endMinutes).padStart(2, '0');
        fieldEnd.value = `${formattedEndHours}:${formattedEndMinutes}`;
    }
});

saveBtn.addEventListener('click', onSave);
deleteBtn.addEventListener('click', onDelete);
logoutBtn.addEventListener('click', onLogout);

// ---------- INIT ----------
(async function init() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    userEmailEl.textContent = 'Not logged in';
    return;
  }
  currentUser = session.user;
  userEmailEl.textContent = currentUser.email ?? 'Unknown user';

  renderEmptyWeekGrid();
  await loadSchedulesAndRender();
})();

// ---------- HELPERS ----------
function timeToMinutes(t) {
  const [h,m] = t.split(':').map(Number);
  return h*60+m;
}

function renderEmptyWeekGrid() {
  weekGrid.innerHTML = '';
  DAYS.forEach(day => {
    const col = document.createElement('div');
    col.className = 'day-col';
    col.dataset.day = day;
    col.innerHTML = `<h3>${day}</h3><div class="courses"></div>`;
    weekGrid.appendChild(col);
  });
}

async function loadSchedulesAndRender() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error(error);
    return;
  }
  renderWeekGrid(data);
  renderNextAndDaily(data);
}

function renderWeekGrid(schedules) {
  renderEmptyWeekGrid();
  schedules.forEach(course => {
    const col = weekGrid.querySelector(`.day-col[data-day="${course.day}"] .courses`);
    if (!col) return;
    const card = document.createElement('div');
    card.className = 'course-card';
    card.textContent = `${course.start_time} - ${course.end_time}: ${course.course_name}`;
    card.style.backgroundColor = course.color || '#64b5f6'; // Use saved color or a default
    card.addEventListener('click', () => openEditModal(course));
    col.appendChild(card);
  });
}

function renderNextAndDaily(schedules) {
  const now = new Date();
  const todayDay = DAYS[now.getDay()-1];
  const todayTime = now.getHours()*60+now.getMinutes();

  let upcoming = null;
  let daily = [];

  for (const course of schedules) {
    if (course.day === todayDay) {
      daily.push(course);
      if (timeToMinutes(course.start_time) >= todayTime) {
        if (!upcoming || timeToMinutes(course.start_time) < timeToMinutes(upcoming.start_time)) {
          upcoming = course;
        }
      }
    }
  }

  nextCourseContainer.innerHTML = '<h3>Next Course</h3>' +
    (upcoming ? `<div class="course-info-list"><p><strong>Time:</strong> ${upcoming.start_time} - ${upcoming.end_time}</p><p><strong>Course:</strong> ${upcoming.course_name}</p><p><strong>Location:</strong> ${upcoming.location || 'N/A'}</p></div>` : '<p>No upcoming courses today.</p>');

  dailyPlanner.innerHTML = '<h3>Today\'s Schedule</h3>' +
    (daily.length ? daily.map(c=>`<p>${c.start_time}-${c.end_time} ${c.course_name}</p>`).join('') : '<p>No courses scheduled for today.</p>');
}

// ---------- MODAL ----------
function openAddModal() {
  editingCourseId = null;
  modalTitle.textContent = 'Add Course';
  fieldDay.value = '';
  fieldStart.value = '';
  fieldEnd.value = '';
  fieldCourse.value = '';
  fieldProfessor.value = '';
  fieldLocation.value = '';
  fieldColor.value = '#64b5f6'; // Default color
  deleteBtn.style.display = 'none';
  modalError.textContent = '';
  modalBackdrop.classList.add('show');
}

function openEditModal(course) {
  editingCourseId = course.id;
  modalTitle.textContent = 'Edit Course';
  fieldDay.value = course.day;
  fieldStart.value = course.start_time;
  fieldEnd.value = course.end_time;
  fieldCourse.value = course.course_name;
  fieldProfessor.value = course.professor;
  fieldLocation.value = course.location;
  fieldColor.value = course.color || '#64b5f6'; // Use saved color or default
  deleteBtn.style.display = 'inline-block';
  modalError.textContent = '';
  modalBackdrop.classList.add('show');
}

function closeModal() {
  modalBackdrop.classList.remove('show');
}

// ---------- CRUD ----------
async function onSave() {
  modalError.textContent = '';
  if (!currentUser) {
    modalError.textContent = 'Not logged in';
    return;
  }

  const payload = {
    user_id: currentUser.id,
    day: fieldDay.value,
    start_time: fieldStart.value,
    end_time: fieldEnd.value,
    course_name: fieldCourse.value.trim(),
    professor: fieldProfessor.value.trim(),
    location: fieldLocation.value.trim(),
    color: fieldColor.value
  };

  if (!payload.day || !payload.start_time || !payload.end_time || !payload.course_name) {
    modalError.textContent = 'Day, start, end and course name are required.';
    return;
  }
  if (timeToMinutes(payload.end_time) <= timeToMinutes(payload.start_time)) {
    modalError.textContent = 'End time must be after start time.';
    return;
  }

  try {
    if (editingCourseId) {
      // Update the specific course
      const { error: updateError } = await supabase
        .from('schedules')
        .update(payload)
        .eq('id', editingCourseId)
        .eq('user_id', currentUser.id);
      if (updateError) throw updateError;
    } else {
      // Insert a new course
      const { error: insertError } = await supabase.from('schedules').insert([payload]);
      if (insertError) throw insertError;
    }
    
    // Update all other courses with the same name
    const { error: batchUpdateError } = await supabase
      .from('schedules')
      .update({ color: payload.color })
      .eq('user_id', currentUser.id)
      .eq('course_name', payload.course_name);

    if (batchUpdateError) throw batchUpdateError;

    closeModal();
    await loadSchedulesAndRender();
  } catch (err) {
    console.error(err);
    modalError.textContent = 'Save failed. See console.';
  }
}

async function onDelete() {
  if (!editingCourseId) return;
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', editingCourseId)
      .eq('user_id', currentUser.id);
    if (error) throw error;
    closeModal();
    await loadSchedulesAndRender();
  } catch (err) {
    console.error(err);
    modalError.textContent = 'Delete failed.';
  }
}

async function onLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert('Logout failed: ' + error.message);
  } else {
    window.location.href = '/index.html';
  }
}