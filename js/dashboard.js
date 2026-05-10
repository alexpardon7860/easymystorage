/**
 * dashboard.js — Premium Dashboard Logic
 *
 * Handles split-pane layout, new stats grid, and dark theme UI interactions.
 */

'use strict';

// ── Auth Guard ───────────────────────────────────────────────────
function checkAuth() {
  const rawData = sessionStorage.getItem('uf_user');
  if (!rawData) {
    window.location.replace('index.html');
    return null;
  }
  return JSON.parse(rawData);
}

const currentUser = checkAuth();

// Prevent browser back-button caching (Bfcache) issues
window.addEventListener('pageshow', function(event) {
  if (event.persisted || !sessionStorage.getItem('uf_user')) {
    checkAuth();
  }
});

// ── Toast & Helpers ──────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

function getInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function getAvatarUrl(user) {
  if (user && user.avatar) return user.avatar;
  const seed = encodeURIComponent(user ? user.name : 'User');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=112240`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Navbar & Navigation ───────────────────────────────────────────
function populateNavbar() {
  const avatarEl = document.getElementById('nav-avatar');
  if (!avatarEl) return;

  const avatarUrl = getAvatarUrl(currentUser);
  const initials  = getInitials(currentUser?.name || '?');

  avatarEl.innerHTML = `
    <img
      src="${avatarUrl}"
      alt="Avatar"
      style="width:100%;height:100%;object-fit:cover;display:block;"
      onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${initials}',style:'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:0.85rem;font-weight:700;color:#fff;'}))"
    />`;
}

// Handle tab switching
document.querySelectorAll('.nav-pill').forEach(btn => {
  btn.addEventListener('click', function() {
    // Update active pill
    document.querySelectorAll('.nav-pill').forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    // Hide all views
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active-view'));

    // Show target view
    const targetId = this.dataset.target;
    document.getElementById(targetId).classList.add('active-view');
    
    // Update header title based on view
    const titles = {
      'view-overview': 'System Overview',
      'view-users': 'User Management',
      'view-settings': 'Profile Settings',
      'view-security': 'Security Center'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[targetId] || 'EasyMyStorage Dashboard';

    // Auto-populate Settings view
    if (targetId === 'view-settings') {
      document.getElementById('setting-name').value = currentUser.name;
      document.getElementById('setting-email').value = currentUser.email;
      document.getElementById('setting-role').value = currentUser.role.toUpperCase() + ' ACCOUNT';
      
      const preview = document.getElementById('settings-avatar-preview');
      if (preview) {
        const avatarUrl = getAvatarUrl(currentUser);
        preview.innerHTML = `<img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover;" alt="Avatar">`;
      }
    }
  });
});

// ── State ─────────────────────────────────────────────────────────
let allUsers       = [];
let activeFilter   = 'all';     // Top bar filter
let subFilter      = 'all';     // List sub-filter (google/manual)
let searchQuery    = '';
let selectedUserId = null;

// ── Update Stats ──────────────────────────────────────────────────
function updateStats(users) {
  document.getElementById('stat-total').textContent  = users.length;
  document.getElementById('stat-admins').textContent = users.filter(u => u.role === 'admin').length;
  document.getElementById('stat-google').textContent = users.filter(u => u.auth_provider === 'google').length;
  document.getElementById('stat-manual').textContent = users.filter(u => u.auth_provider === 'manual').length;
}

// ── Filtering Logic ───────────────────────────────────────────────
function getFilteredUsers() {
  return allUsers.filter(u => {
    let pass = true;
    
    // Main Role Filter
    if (activeFilter === 'admin') pass = u.role === 'admin';
    if (activeFilter === 'user')  pass = u.role === 'user';
    if (activeFilter === 'google') pass = u.auth_provider === 'google';
    
    // Sub Provider Filter
    if (pass && subFilter === 'google') pass = u.auth_provider === 'google';
    if (pass && subFilter === 'manual') pass = u.auth_provider === 'manual';

    // Search
    if (pass && searchQuery) {
      const q = searchQuery.toLowerCase();
      pass = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return pass;
  });
}

// ── Render Details Pane (Right Side) ─────────────────────────────
function renderDetails(user) {
  const pane = document.getElementById('details-pane');
  if (!user) {
    pane.innerHTML = `
      <div class="empty-details">
        <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;">✦</div>
        <p>Select a user from the directory to view details</p>
      </div>`;
    return;
  }

  const roleBadge = user.role === 'admin' 
    ? `<span style="background:var(--clr-warning); color:#000; padding:2px 8px; border-radius:50px; font-size:0.7rem; font-weight:700;">ADMINISTRATOR</span>`
    : `<span style="background:rgba(255,255,255,0.1); color:var(--clr-text); padding:2px 8px; border-radius:50px; font-size:0.7rem; font-weight:700;">STANDARD USER</span>`;

  const providerBadge = user.auth_provider === 'google'
    ? `<span style="color:#60a5fa;">🔵 Google Auth</span>`
    : `<span style="color:#4ade80;">✅ Manual Auth</span>`;

  pane.innerHTML = `
    <div class="dp-header">
      <div class="dp-title-area">
        <div class="dp-label">USER PROFILE</div>
        <div class="dp-title">#${user.id} <span>Profile</span></div>
        <div style="margin-top:8px">${roleBadge}</div>
      </div>
      <div class="dp-company">
        <div class="dp-label">ACCOUNT DETAILS</div>
        <div class="dp-company-name" style="display:flex; align-items:center; gap:8px;">
          <img src="${getAvatarUrl(user)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
          ${user.name}
        </div>
        <div class="dp-company-sub">${user.email}</div>
      </div>
    </div>

    <div class="dp-grid">
      <div class="dp-box">
        <div class="dp-box-sub" style="margin-bottom:8px">Authentication</div>
        <div class="dp-box-val" style="font-size:1rem">${providerBadge}</div>
      </div>
      <div class="dp-box">
        <div class="dp-box-sub" style="margin-bottom:8px">Account Created</div>
        <div class="dp-box-val" style="font-size:1rem">${formatDate(user.created_at)}</div>
      </div>
      <div class="dp-box">
        <div class="dp-box-sub" style="margin-bottom:8px">Last Updated</div>
        <div class="dp-box-val" style="font-size:1rem">${formatDate(user.updated_at)}</div>
      </div>
    </div>

    <div class="dp-footer">
      <div>
        <div class="dp-total-label">System Access Level</div>
        <div class="dp-total-val" style="font-size:1rem">${user.role === 'admin' ? 'Full Read/Write Access' : 'Restricted User Access'}</div>
      </div>
      ${currentUser.role === 'admin' && user.id !== currentUser.id ? `
        <div id="manage-actions" style="display:none; flex-direction:column; gap:8px; margin-top: 16px; background: var(--clr-surface-2); padding: 16px; border-radius: var(--r-md); border: 1px solid var(--clr-border);">
           <p style="font-size:0.8rem; color:var(--clr-muted); margin-bottom:8px; line-height: 1.4;">Only one Admin is allowed. Promoting this user will transfer your Admin rights to them.</p>
           <button class="btn btn-primary" onclick="manageUser(${user.id}, 'transfer_admin')" style="width:100%; padding: 10px; background:#fbbf24; color:#000;">Transfer Admin Rights</button>
           <button class="btn btn-primary" onclick="manageUser(${user.id}, 'delete')" style="width:100%; padding: 10px; background:#ef4444; color:#fff;">Delete User</button>
           <button class="btn" onclick="document.getElementById('manage-actions').style.display='none'; document.getElementById('manage-btn').style.display='block';" style="width:100%; padding: 10px; background:transparent; border:1px solid var(--clr-border); color:var(--clr-text);">Cancel</button>
        </div>
        <button id="manage-btn" class="btn btn-primary" onclick="document.getElementById('manage-btn').style.display='none'; document.getElementById('manage-actions').style.display='flex';" style="padding: 10px 24px; border-radius: 50px;">Manage User</button>
      ` : ''}
    </div>
  `;
}

// ── Render List Pane (Left Side) ─────────────────────────────────
function renderList(users) {
  const container = document.getElementById('users-list-container');
  
  if (users.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 0.85rem;">No users found.</div>`;
    return;
  }

  container.innerHTML = users.map(u => {
    const isActive = u.id === selectedUserId ? 'active' : '';
    const avatarUrl = getAvatarUrl(u);
    const avatarHtml = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
      
    const displayRole = u.role === 'admin' ? '🛡️ Admin' : '👤 User';

    return `
      <div class="user-item ${isActive}" data-id="${u.id}">
        <div class="ui-avatar">${avatarHtml}</div>
        <div class="ui-info">
          <div class="ui-name">${u.name}</div>
          <div class="ui-sub">Joined ${formatDate(u.created_at)}</div>
        </div>
        <div class="ui-role">${displayRole}</div>
      </div>
    `;
  }).join('');

  // Attach click events
  document.querySelectorAll('.user-item').forEach(item => {
    item.addEventListener('click', function() {
      const id = parseInt(this.dataset.id);
      selectedUserId = id;
      const user = allUsers.find(u => u.id === id);
      
      // Update active class
      document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
      this.classList.add('active');
      
      // Render right pane
      renderDetails(user);
    });
  });
}

// ── Manage User Logic (Admin Only) ────────────────────────────────
window.manageUser = async function(targetId, action) {
  const confirmMsg = action === 'delete' 
    ? 'Are you sure you want to permanently DELETE this user?'
    : 'Are you sure? You will lose your Admin rights and become a Standard User.';
    
  if (!confirm(confirmMsg)) return;
  
  try {
    const res = await fetch('api/manage-user.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, target_id: targetId }),
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      
      if (action === 'transfer_admin') {
         // Demote self in local storage and reload page
         currentUser.role = 'user';
         sessionStorage.setItem('uf_user', JSON.stringify(currentUser));
         setTimeout(() => window.location.reload(), 1500);
      } else {
         // Deleted user: refresh list and clear details
         selectedUserId = null;
         renderDetails(null);
         fetchUsers();
      }
    } else {
      showToast(data.message, 'error');
    }
  } catch (e) {
    showToast('Network error while managing user.', 'error');
  }
};

// ── Main Data Fetch ──────────────────────────────────────────────
async function fetchUsers() {
  try {
    const res  = await fetch('api/users.php', { credentials: 'include' });
    const data = await res.json();

    if (data.success) {
      allUsers = data.users;
      updateStats(allUsers);
      renderList(getFilteredUsers());
    } else {
      showToast(data.message || 'Failed to load users.', 'error');
    }
  } catch (err) {
    showToast('Network error while fetching users.', 'error');
  }
}

// ── Event Listeners for Filters & Search ─────────────────────────
document.getElementById('search-input')?.addEventListener('input', function () {
  searchQuery = this.value.trim();
  renderList(getFilteredUsers());
});

// Top dark filter buttons
document.querySelectorAll('.filter-btn-dark').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.filter-btn-dark').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    activeFilter = this.dataset.filter;
    selectedUserId = null; // reset selection
    renderDetails(null);
    renderList(getFilteredUsers());
  });
});

// Left list filter pills
document.querySelectorAll('.lf-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.lf-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    subFilter = this.id.replace('sub-filter-', '');
    selectedUserId = null;
    renderDetails(null);
    renderList(getFilteredUsers());
  });
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try { await fetch('api/logout.php', { method: 'POST', credentials: 'include' }); } catch (_) {}
  sessionStorage.removeItem('uf_user');
  window.location.replace('index.html');
});

// ── Create User Modal Logic ───────────────────────────────────────
window.openCreateModal = function() {
  document.getElementById('modal-create-user').classList.add('show');
};

window.closeCreateModal = function() {
  document.getElementById('modal-create-user').classList.remove('show');
  document.getElementById('dash-create-form').reset();
};

document.getElementById('dash-create-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name     = document.getElementById('c-name').value.trim();
  const email    = document.getElementById('c-email').value.trim();
  const password = document.getElementById('c-password').value;
  const confirm  = document.getElementById('c-confirm').value;
  const role     = 'user'; // Hardcoded as only one admin exists
  
  const submitBtn = document.getElementById('c-submit');
  
  if (password !== confirm) {
    showToast('Passwords do not match.', 'error');
    return;
  }
  
  submitBtn.textContent = 'Creating...';
  submitBtn.disabled = true;
  
  try {
    const res = await fetch('api/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirm_password: confirm, role })
    });
    const data = await res.json();
    
    if (data.success) {
      showToast('User created successfully!', 'success');
      closeCreateModal();
      fetchUsers(); // Refresh the list
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Network error while creating user.', 'error');
  } finally {
    submitBtn.textContent = 'Create User';
    submitBtn.disabled = false;
  }
});

// ── Avatar Upload Logic ───────────────────────────────────────────
document.getElementById('avatar-upload')?.addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    showToast('Uploading avatar...', 'info', 2000);
    const res = await fetch('api/upload-avatar.php', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      currentUser.avatar = data.avatar;
      sessionStorage.setItem('uf_user', JSON.stringify(currentUser));
      populateNavbar();
      const preview = document.getElementById('settings-avatar-preview');
      if (preview) {
        preview.innerHTML = `<img src="${data.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
      }
      fetchUsers();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Upload failed due to network error.', 'error');
  }
});

// Randomize Avatar using DiceBear
document.getElementById('btn-random-avatar')?.addEventListener('click', async function() {
  const styles = ['avataaars', 'bottts', 'adventurer', 'micah', 'lorelei', 'notionists'];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const randomSeed = Math.random().toString(36).substring(2, 10);
  const newAvatarUrl = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}&backgroundColor=112240`;
  
  try {
    showToast('Generating new avatar...', 'info', 1000);
    const res = await fetch('api/update-avatar-url.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newAvatarUrl }),
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      currentUser.avatar = data.avatar;
      sessionStorage.setItem('uf_user', JSON.stringify(currentUser));
      populateNavbar();
      const preview = document.getElementById('settings-avatar-preview');
      if (preview) {
        preview.innerHTML = `<img src="${data.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
      }
      fetchUsers();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Network error while updating avatar.', 'error');
  }
});

// ── Init ─────────────────────────────────────────────────────────
populateNavbar();
fetchUsers();

// ── Role-based UI enforcement ─────────────────────────────────────
// Default to 'user' if role is missing — never accidentally grant admin UI
const userRole = currentUser?.role?.toLowerCase() || 'user';

if (userRole !== 'admin') {
  // Hide "Create new user" button — standard users cannot create accounts
  const createBtn = document.getElementById('create-user-btn');
  if (createBtn) createBtn.style.display = 'none';
}
