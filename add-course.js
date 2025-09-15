const SUPABASE_URL = "https://izyofljxfnmcrtyhpkhp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eW9mbGp4Zm5tY3J0eWhwa2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODM3MDgsImV4cCI6MjA3MzE1OTcwOH0.LgnXAHlFJ8GEZDpUMG9dXeioCd7Q25pL3hnXcTjkq4Y";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  // Redirect to login if not authenticated
  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "index.html";
    }
  }
  checkUser();

  // Auto-fill end time
  const startTimeInput = document.getElementById("start_time");
  const endTimeInput = document.getElementById("end_time");

  startTimeInput.addEventListener("change", () => {
    if (startTimeInput.value) {
      const [hours, minutes] = startTimeInput.value.split(":").map(Number);
      let newMinutes = minutes + 50;
      let newHours = hours;

      if (newMinutes >= 60) {
        newMinutes -= 60;
        newHours += 1;
      }

      // Format to HH:MM string
      const endHours = String(newHours).padStart(2, "0");
      const endMinutes = String(newMinutes).padStart(2, "0");
      endTimeInput.value = `${endHours}:${endMinutes}`;
    }
  });

  // Handle form submission
  document
    .getElementById("add-course-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("User not authenticated. Please log in.");
        return;
      }

      const newCourse = {
        user_id: user.id,
        day: document.getElementById("day").value,
        start_time: document.getElementById("start_time").value,
        end_time: document.getElementById("end_time").value,
        course_name: document.getElementById("course_name").value,
        professor: document.getElementById("professor").value,
        location: document.getElementById("location").value,
      };

      const { error } = await supabase.from("schedules").insert([newCourse]);

      if (error) {
        alert("Error saving course: " + error.message);
      } else {
        alert("Course saved successfully!");
        window.location.href = "dashboard.html"; // Redirect back to dashboard
      }
    });

  // Go back button functionality
  document.getElementById("back-btn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
});