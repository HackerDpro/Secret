const SUPABASE_URL = 'https://izyofljxfnmcrtyhpkhp.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your key

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check for an active user session
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // No user is logged in, redirect to login page
        window.location.href = '/index.html';
    }
}

// Handle user logout
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert(error.message);
    } else {
        window.location.href = '/index.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkUser();
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
});