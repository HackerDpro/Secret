const SUPABASE_URL = 'https://izyofljxfnmcrtyhpkhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eW9mbGp4Zm5tY3J0eXdoa3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0NDcxNTcsImV4cCI6MjAzNzAyMzE1N30.2XQzE2b6W8c4-K3B3Y_0p_y-0v0s5G7f5y-8v0s5G7f5'; // Replace with your key

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');

    async function handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            alert(error.message);
        } else {
            window.location.href = '/dashboard.html';
        }
    }

    async function handleSignUp(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            alert(error.message);
        } else {
            alert('Sign up successful! Please check your email to confirm your account.');
        }
    }
    
    // Check if the buttons exist before adding listeners
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    if (signupBtn) {
        signupBtn.addEventListener('click', handleSignUp);
    }
});