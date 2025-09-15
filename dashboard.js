// dashboard.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---------- CONFIG ----------
const SUPABASE_URL = 'https://izyofljxfnmcrtyhpkhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eW9mbGp4Zm5tY3J0eWhwa2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODM3MDgsImV4cCI6MjA3MzE1OTcwOH0.LgnXAHlFJ8GEZDpUMG9dXeioCd7Q25pL3hnXcTjkq4Y'; // replace with real anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- DOM ----------
const weekGrid = document.getElementById('weekGrid');
const nextCourseContainer = document.getElementById('nextCourseContainer');
const dailyPlanner = document.getElementById('dailyPlanner');
const serverStatus = document.getElementById('server-status');
const userEmailEl = document.getElementById('user-email');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const fieldDay = document.getElementById('fieldDay');
const fieldStart = document.getElementById('fieldStart');
const fieldEnd = document.getElementById('fieldEnd');
const fieldCourse = document.getElementById('fieldCourse');
const fieldProfessor = document.getElementById('fieldProfessor');
const fieldLocation = document.getElementById('fieldLocation');
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
fieldStart.addEventListener('change', onStartTimeChange);
saveBtn.addEventListener('click', onSave);
deleteBtn.addEventListener('click', onDelete);
logoutBtn.addEventListener('click', onLogout);

// ---------- INIT ----------
(async function init() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    serverStatus.textContent = 'Not logged in';
    userEmailEl.textContent = '';
    return;
  }

  currentUser = session.user;
  userEmailEl.textContent = currentUser.email ?? 'Unknown user';

  renderEmptyWeekGrid();
  await loadSchedulesAndRender();
  serverStatus.textContent = 'Connected';
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
    card.textContent = `${course.start_time}-${course.end_time} ${course.course_name}`;
    card.addEventListener('click', () => openEditModal(course));
    col.appendChild(card);
  });
}

function renderNextAndDaily(schedules) {
  const now = new Date();
  const todayDay = DAYS[now.getDay()-1]; // Monday=1
  const todayTime = now.getHours()*60+now.getMinutes();

  let upcoming = null;
  let daily = [];

  for (const course of schedules) {
    if (course.day === todayDay) {
      daily.push(course);
      if (timeToMinutes(course.start_time) >= todayTime) {
        if (!upcoming || course.start_time < upcoming.start_time) {
          upcoming = course;
        }
      }
    }
  }

  nextCourseContainer.innerHTML = '<h3>Next Course</h3>' +
    (upcoming ? `${upcoming.start_time} ${upcoming.course_name}` : 'None');

  dailyPlanner.innerHTML = '<h3>Today</h3>' +
    (daily.length ? daily.map(c=>`${c.start_time}-${c.end_time} ${c.course_name}`).join('<br>') : 'No courses');
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
  deleteBtn.style.display = 'none';
  modalError.textContent = '';
  modalBackdrop.style.display = 'flex';
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
  deleteBtn.style.display = 'inline-block';
  modalError.textContent = '';
  modalBackdrop.style.display = 'flex';
}

function closeModal() {
  modalBackdrop.style.display = 'none';
}

function onStartTimeChange() {
  if (fieldStart.value && fieldEnd.value && fieldEnd.value <= fieldStart.value) {
    fieldEnd.value = '';
  }
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
    location: fieldLocation.value.trim()
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
      const { error } = await supabase
        .from('schedules')
        .update({
          day: payload.day,
          start_time: payload.start_time,
          end_time: payload.end_time,
          course_name: payload.course_name,
          professor: payload.professor,
          location: payload.location
        })
        .eq('id', editingCourseId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('schedules').insert([payload]);
      if (error) throw error;
    }
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
    window.location.href = '/login.html'; // redirect to login
  }
}
