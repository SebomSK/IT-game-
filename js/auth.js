// ===== TICKETQUEST FIREBASE AUTHENTICATION =====

// Initialize from index.firebase config
const app = firebase.initializeApp({
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const auth = firebase.getAuth(app);
const db = firebase.getFirestore(app);

/**
 * Sign up new user with email/password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<void>}
 */
async function signup(email, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Store user metadata in admin-only Firestore collection
    await db.collection('userAccounts').add({
      uid: user.uid,
      email: user.email,
      ipAtRegistration: await getUserIP(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log('Account created:', user.uid, user.email);
    showMessage('Account created! Welcome to TicketQuest.');
    return user;
  } catch (error) {
    console.error('Signup error:', error);
    showMessage('Error creating account: ' + error.message);
    throw error;
  }
}

/**
 * Log in user with email/password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} [rememberMe=false] - Remember login across sessions
 * @returns {Promise<void>}
 */
async function login(email, password, rememberMe = false) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update last login timestamp
    await db.collection('userAccounts').doc(user.uid).update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.error('Failed to update last login:', err));

    // "Remember me" functionality
    if (rememberMe) {
      localStorage.setItem('ticketquest_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        loginTime: new Date().toISOString()
      }));
    }

    console.log('User logged in:', user.uid, user.email);
    hideIntroOverlay();
    showMessage('Welcome back, ' + (user.displayName || user.email));
    return user;
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Login failed: ' + error.message);
    throw error;
  }
}

/**
 * Log out current user
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    await auth.signOut();
    localStorage.removeItem('ticketquest_user');
    showIntroOverlay();
    showMessage('You have been logged out.');
    console.log('User logged out');
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('Logout error: ' + error.message);
  }
}

/**
 * Request password reset via email
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
async function requestPasswordReset(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    console.log('Password reset requested for:', email);
    showMessage('Password reset email sent! Check your inbox, then contact me on Discord: realbigrussian');

    // Custom: Log the reset request for Discord handler
    // Your Discord workflow: receive reset request → manually reset password → DM user
    // This keeps password control in your hands via Discord
  } catch (error) {
    console.error('Password reset error:', error);
    showMessage('Error: ' + error.message);
  }
}

/**
 * Get current user IP address
 * @returns {Promise<string>}
 */
function getUserIP() {
  return fetch('https://api.ipify.org')
    .then(response => response.text())
    .catch(() => 'unknown');
}

/**
 * Show message in toast container
 * @param {string} message - Message to display
 */
function showMessage(message) {
  const toastBox = document.getElementById('toast-box');
  if (!toastBox) return;

  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  toastBox.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

/**
 * Check if user is currently logged in
 * @returns {boolean}
 */
function isLoggedIn() {
  const user = JSON.parse(localStorage.getItem('ticketquest_user'));
  return user !== null;
}

/**
 * Get current user data from localStorage
 * @returns {object|null}
 */
function getCurrentUser() {
  const user = JSON.parse(localStorage.getItem('ticketquest_user'));
  return user || null;
}

/**
 * Hidden intro overlay - show when user is logged out
 */
function showIntroOverlay() {
  const overlay = document.getElementById('intro-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

/**
 * Hide intro overlay - start game when user is logged in
 */
function hideIntroOverlay() {
  const overlay = document.getElementById('intro-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/**
 * Parse stored "remember me" user on app start
 * @returns {object|null}
 */
function parseStoredUser() {
  const stored = localStorage.getItem('ticketquest_user');
  return stored ? JSON.parse(stored) : null;
}

// Export functions for use in main.js
if (typeof window !== 'undefined') {
  window.signup = signup;
  window.login = login;
  window.logout = logout;
  window.requestPasswordReset = requestPasswordReset;
  window.isLoggedIn = isLoggedIn;
  window.getCurrentUser = getCurrentUser;
  window.showMessage = showMessage;
  window.parseStoredUser = parseStoredUser;
  window.showIntroOverlay = showIntroOverlay;
  window.hideIntroOverlay = hideIntroOverlay;
}