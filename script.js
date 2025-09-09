const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => parent.querySelectorAll(selector);
const $createEl = (tag) => document.createElement(tag);

$('#openInventoryModal').addEventListener('click', e => {
    e.preventDefault();
    $$(".overlay")[0].classList.remove("hidden");
    $$('.add-inventory-form')[0].classList.remove('hide-form');
});
$$('.closeInventoryModal')[0].addEventListener('click', e => {
    e.preventDefault();
    $$(".overlay")[0].classList.add("hidden");
    $$('.add-inventory-form')[0].classList.add('hide-form');
});
$$('.closeInventoryModal')[1].addEventListener('click', e => {
    e.preventDefault();
    $$(".overlay")[1].classList.add("hidden");
    $$('.add-inventory-form')[1].classList.add('hide-form');
});

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD0avl2P21_y-ZDfk0llXnd0UjT1Pbfkdw",
    authDomain: "inventory-web-page-2025.firebaseapp.com",
    projectId: "inventory-web-page-2025",
    storageBucket: "inventory-web-page-2025.firebasestorage.app",
    messagingSenderId: "843670124426",
    appId: "1:843670124426:web:4f5abe8afa692eb17afa73"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// State Management
let currentEditId = null;
let inventoryData = [];

// Initialize app
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is authenticated, showing inventory page');
        showInventoryPage();
    } else {
        console.log('No user authenticated, showing login page');
        showLoginPage();
    }
});

$('#inventoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailGroups = [];
    ['accounting', 'operations', 'it', 'rfp', 'security', 'hr', 'info', 'concierge'].forEach(group => {
        if (document.getElementById(group).checked) {
            emailGroups.push(group);
        }
    });
    const formData = {
        requestor: $('#requestor').value,
        process: $('#process').value,
        employee: $('#employee').value,
        hired: $('#hired').value,
        terminated: $('#terminated').value,
        name: $('#name').value,
        email: $('#email').value,
        position: $('#position').value,
        contact: $('#contact').value,
        notes: $('#notes').value, // Fixed: removed duplicate
        emailGroups: emailGroups,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if(currentEditId) {
            if(!currentEditId) {
                throw new Error('No valid entry ID for update');
            }
            console.log('Updating entry with ID:', currentEditId);
            await db.collection('inventory').doc(currentEditId).update(formData);
            currentEditId = null;
        } else {
            console.log('Adding new entry:', formData);
            await db.collection('inventory').add(formData);
        }
        
        $('#inventoryForm').reset(); // Fixed: use $ helper
        $('.add-inventory-form').classList.add('hide-form'); // Fixed: hide modal after submission
        loadInventoryData(); // Refresh the data
    } catch (error) {
        console.error('Error saving entry:', error.message);
    }
});

// Authentication -> Login Form
$('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#username').value;
    const password = $('#password').value;
    try {
        const email = `${username}@inventory.local`;
        await auth.signInWithEmailAndPassword(email, password);
        showInventoryPage();
    } catch (error) {
        console.error('Login error:', error.message);
    }
});

// Logout
$('#logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        console.log('Logged out, showing login page');
        showLoginPage();
    } catch (error) {
        console.error('Logout error:', error.message);
    }
});

function showLoginPage() {
    $('#loginPage').classList.remove('hidden');
    $('.inventory-page').classList.add('hidden');
    $('#username').value = '';
    $('#password').value = '';

    setTimeout(()=> { $('.message-prompt').style.display = 'none'; }, 1000)
}

function showInventoryPage() {
    $('#loginPage').classList.add('hidden');
    $('.inventory-page').classList.remove('hidden');
    loadInventoryData();
    
    // Set username in UI
    const user = auth.currentUser;
    if (user) {
        const username = user.email.split("@")[0];
        $('#user').innerText = username.charAt(0).toUpperCase() + username.slice(1);
    }
}

async function loadInventoryData() {
    try {
        // const snapshot = await db.collection('inventory').orderBy('createdAt', 'desc').get(); // sorted accdng to created
        const snapshot = await db.collection('inventory').orderBy('hired', 'desc').get(); // accdng to HIRED!!
        console.log('Snapshot size:', snapshot.size);
        inventoryData = [];
        $('.message-prompt').style.display = 'none';
        
        if (snapshot.empty) {
            // Fixed: use $ helper consistently
            const tableBody = $('#inventoryTableBody');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="11">No inventory data available</td></tr>';
            }
        } else {
            snapshot.forEach((doc) => {
                console.log('Document loaded:', doc.id, doc.data());
                inventoryData.push({ id: doc.id, ...doc.data() });
            });
        }

        renderInventoryData();
    } catch (error) {
        console.error('Error loading inventory data:', error);
    }
}

function renderInventoryData() {
    if (inventoryData.length === 0) {
        console.log("No inventory data available");
        return;
    }
    
    let parentEl = $('.display-section');
    if(!parentEl) return;

    for(let item in inventoryData) {
        let childEl = $createEl('div');
        console.log(inventoryData[item]['name']);
        childEl.classList.add(`sec-${item}`, `section-items`);
        childEl.innerHTML = `
            <details>
            <summary><h5>
                ${inventoryData[item]['name']}</h5><h6>${inventoryData[item]['process'] == "On-boarding" ? "Active" : "Inactive"}
            </h6></summary>

            <div><strong>Type of Employee: </strong><span>${inventoryData[item]['employee'] || ""}</span></div>
            <div><strong>Email: </strong><a href="#">${inventoryData[item]['email']}.ph</a></div>
            <div><strong>Date of Hired: </strong><span>${inventoryData[item]['hired']}</span></div>
            <div><strong>Position: </strong><span>${inventoryData[item]['position']}</span></div>
            <div><strong>Notes: </strong>
                <textarea rows='3' readonly>${inventoryData[item]['notes']}</textarea></div>
            <div class='det-btns'>
                <button class='btn-primary' onclick="editEntry('${inventoryData[item].id}')">Edit</button>
                <button class='btn-danger' onclick="deleteEntry('${inventoryData[item].id}')">Delete</button>
            </div>
            </details>
        `
        parentEl.append(childEl);
    }

}

// Custom confirm using <dialog>
function customConfirm(message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("confirmDialog");
    const text = document.getElementById("confirmText");

    text.textContent = message;
    dialog.showModal();

    dialog.onclose = () => {
      resolve(dialog.returnValue === "ok");
    };
  });
}

// DELETE ENTRY
window.deleteEntry = async function (id) {
  const confirmed = await customConfirm("Are you sure you want to delete this entry?");
  if (confirmed) {
    try {
      if (!id) throw new Error("Invalid entry ID for deletion");

      console.log("Deleting entry with ID:", id);
      await db.collection("inventory").doc(id).delete();
      loadInventoryData();
    } catch (error) {
      console.error("Error deleting entry:", error.message);
      alert("Error deleting entry: " + error.message);
    }
  }
};

// EDIT POPULATE
window.editEntry = function(id) {
    console.log('Attempting to edit entry with ID:', id);
    if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error('Invalid entry ID:', id);
        alert('Invalid entry ID. Please contact support.');
        return;
    }
    
    $$('.add-inventory-form')[1].classList.remove('hide-form');  
    $$(".overlay")[1].classList.remove("hidden");  
    const entry = inventoryData.find(item => item.id === id);
    if (!entry) {
        console.error('Entry not found for ID:', id, 'Inventory Data:', inventoryData);
        alert('Entry not found. Ensure data is loaded or contact support.');
        return;
    }
    
    $('#edit_requestor').value = entry.requestor || '';
    $('#edit_process').value = entry.process || '';
    $('#edit_employee').value = entry.employee || '';
    $('#edit_hired').value = entry.hired || '';
    $('#edit_terminated').value = entry.terminated || '';
    $('#edit_name').value = entry.name || '';
    $('#edit_email').value = entry.email || '';
    $('#edit_position').value = entry.position || '';
    $('#edit_contact').value = entry.contact || '';
    $('#edit_notes').value = entry.notes || '';
    ['edit_accounting', 'edit_operations', 'edit_it', 'edit_rfp', 'edit_security', 'edit_hr', 'edit_info', 'edit_concierge'].forEach(group => {document.getElementById(group).checked = entry.emailGroups && entry.emailGroups.includes(group.replace('edit_', '').toLowerCase()); });
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Submitting edit form, currentEditId is:', currentEditId);
    if (!currentEditId || typeof currentEditId !== 'string' || currentEditId.trim() === '') {
        console.error('No entry selected for update, currentEditId is:', currentEditId, 'Inventory Data:', inventoryData);
        alert('Error: No entry selected for update. Please select an entry to edit first.');
        return;
    }
    const emailGroups = [];
        ['edit_accounting', 'edit_operations', 'edit_it', 'edit_rfp', 'edit_security', 'edit_hr', 'edit_info', 'edit_concierge'].forEach(group => {
        if (document.getElementById(group).checked) {
            emailGroups.push(group.replace('edit_', '').toLowerCase());
        }
    });
    const formData = {
        requestor: $('#edit_requestor').value,
        process: $('#edit_process').value,
        employee: $('#edit_employee').value,
        hired: $('#edit_hired').value,
        terminated: $('#edit_terminated').value,
        name: $('#edit_name').value,
        email: $('#edit_email').value,
        position: $('#edit_position').value,
        contact: $('#edit_contact').value,
        notes: $('#edit_notes').value, // Fixed: removed duplicate
        emailGroups: emailGroups,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        console.log('Attempting to update entry with ID:', currentEditId, 'Data:', formData);
        await db.collection('inventory').doc(currentEditId).update(formData);
        console.log('Update successful for ID:', currentEditId);
        currentEditId = null;
        loadInventoryData();
    } catch (error) {
        console.error('Error updating entry:', error.message);
        alert('Error updating entry: ' + error.message);
    }
});

