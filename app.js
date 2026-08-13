import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, 
    updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTiBd5zhAd2niyDZLjjIZUcYLVEG-zcdc",
    authDomain: "quan-ly-hoa-vien-cua-toi.firebaseapp.com",
    databaseURL: "https://quan-ly-hoa-vien-cua-toi-default-rtdb.firebaseio.com",
    projectId: "quan-ly-hoa-vien-cua-toi",
    storageBucket: "quan-ly-hoa-vien-cua-toi.firebasestorage.app",
    messagingSenderId: "698396807560",
    appId: "1:698396807560:web:e80b3face6f7c984ad6a3d",
    measurementId: "G-JV2VDZN9XK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Khai báo thứ tự ưu tiên sắp xếp chức vụ
const roleHierarchy = {
    "Hội trưởng": 1,
    "Hội phó": 2,
    "Quản lý": 3,
    "Tinh Anh": 4,
    "Thành viên": 5
};

let membersList = [];
let flowersData = [];
const defaultImg = "https://cdn-icons-png.flaticon.com/512/346/346195.png";
let tempFlowerImageBase64 = defaultImg;

/* ==========================================================================
   1. QUẢN LÝ XÁC THỰC (AUTH)
   ========================================================================== */

function getAccounts() {
    const stored = localStorage.getItem('appAccounts');
    if (stored) return JSON.parse(stored);
    const defaultAccounts = [
        { username: 'admin', password: '123', role: 'admin', name: 'Quản trị viên', avatar: 'https://ui-avatars.com/api/?name=Admin&background=facc15&color=000' },
        { username: 'user', password: '123', role: 'user', name: 'Thành viên mẫu', avatar: 'https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff' }
    ];
    localStorage.setItem('appAccounts', JSON.stringify(defaultAccounts));
    return defaultAccounts;
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function updateAuthUI() {
    const currentUser = getCurrentUser();
    const authModal = document.getElementById('authModal');
    const userBadge = document.getElementById('userHeaderBadge');
    const tabTaiKhoan = document.getElementById('btnTabTaiKhoan');

    if (currentUser) {
        if (authModal) authModal.classList.add('hidden');
        if (userBadge) {
            userBadge.classList.remove('hidden');
            document.getElementById('headerUserName').innerText = currentUser.name || currentUser.username;
            document.getElementById('headerUserRole').innerText = currentUser.role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'THÀNH VIÊN';
            document.getElementById('headerAvatarImg').src = currentUser.avatar || defaultImg;
        }

        if (currentUser.role === 'admin') {
            tabTaiKhoan?.classList.remove('hidden');
        } else {
            tabTaiKhoan?.classList.add('hidden');
        }
    } else {
        if (authModal) authModal.classList.remove('hidden');
        if (userBadge) userBadge.classList.add('hidden');
    }
}

window.switchAuthTab = function(tab) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');

    if (tab === 'login') {
        loginForm?.classList.remove('hidden');
        regForm?.classList.add('hidden');
        if (tabLoginBtn) tabLoginBtn.className = "w-1/2 py-2 font-bold border-b-2 border-emerald-600 text-emerald-600 text-sm";
        if (tabRegisterBtn) tabRegisterBtn.className = "w-1/2 py-2 font-bold border-b-2 border-transparent text-gray-400 text-sm";
    } else {
        loginForm?.classList.add('hidden');
        regForm?.classList.remove('hidden');
        if (tabRegisterBtn) tabRegisterBtn.className = "w-1/2 py-2 font-bold border-b-2 border-emerald-600 text-emerald-600 text-sm";
        if (tabLoginBtn) tabLoginBtn.className = "w-1/2 py-2 font-bold border-b-2 border-transparent text-gray-400 text-sm";
    }
};

window.handleLogin = function() {
    const u = document.getElementById('loginUser').value.trim().toLowerCase();
    const p = document.getElementById('loginPass').value;
    const accounts = getAccounts();
    const foundUser = accounts.find(acc => acc.username === u && acc.password === p);

    if (foundUser) {
        localStorage.setItem('currentUser', JSON.stringify(foundUser));
        updateAuthUI();
        renderPublicMemberTable();
        renderAdminAccountTable();
        renderMemberDropdowns();
        renderFlowers();
        renderAssignFlowerCheckboxes();
    } else {
        alert('❌ Tên đăng nhập hoặc mật khẩu không chính xác!');
    }
};

window.handleRegister = function() {
    const name = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUser').value.trim().toLowerCase();
    const password = document.getElementById('regPass').value;
    const confirmPass = document.getElementById('regPassConfirm').value;
    const role = 'user';

    if (!name || !username || !password) {
        alert('Vui lòng điền đầy đủ thông tin đăng ký!');
        return;
    }
    if (password !== confirmPass) {
        alert('❌ Mật khẩu xác nhận không khớp!');
        return;
    }

    const accounts = getAccounts();
    if (accounts.some(acc => acc.username === username)) {
        alert('❌ Tên đăng nhập đã tồn tại!');
        return;
    }

    const newUser = {
        username,
        password,
        role,
        name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`
    };
    
    accounts.push(newUser);
    localStorage.setItem('appAccounts', JSON.stringify(accounts));
    alert('🎉 Đăng ký thành công! Vui lòng đăng nhập.');
    document.getElementById('registerForm').reset();
    switchAuthTab('login');
    document.getElementById('loginUser').value = username;
};

window.handleLogout = function() {
    localStorage.removeItem('currentUser');
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    updateAuthUI();
};

window.toggleUserMenu = function() {
    document.getElementById('userDropdownMenu')?.classList.toggle('hidden');
};

window.openChangeAvatarModal = function() {
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    document.getElementById('avatarModal')?.classList.remove('hidden');
};

window.openChangePassModal = function() {
    document.getElementById('userDropdownMenu')?.classList.add('hidden');
    document.getElementById('changePassModal')?.classList.remove('hidden');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
};

window.saveAvatar = function() {
    const urlInput = document.getElementById('avatarUrlInput').value.trim();
    const fileInput = document.getElementById('avatarFileInput').files[0];
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const applyAvatar = (newAvatar) => {
        currentUser.avatar = newAvatar;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        const accounts = getAccounts();
        const idx = accounts.findIndex(acc => acc.username === currentUser.username);
        if (idx !== -1) {
            accounts[idx].avatar = newAvatar;
            localStorage.setItem('appAccounts', JSON.stringify(accounts));
        }
        updateAuthUI();
        closeModal('avatarModal');
        alert('✅ Cập nhật ảnh đại diện thành công!');
    };

    if (fileInput) {
        const reader = new FileReader();
        reader.onload = (e) => applyAvatar(e.target.result);
        reader.readAsDataURL(fileInput);
    } else if (urlInput) {
        applyAvatar(urlInput);
    } else {
        alert('Vui lòng chọn ảnh hoặc nhập URL!');
    }
};

window.handleChangePassword = function() {
    const oldPass = document.getElementById('oldPassInput').value;
    const newPass = document.getElementById('newPassInput').value;
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    if (oldPass !== currentUser.password) {
        alert('❌ Mật khẩu hiện tại không đúng!');
        return;
    }

    currentUser.password = newPass;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    const accounts = getAccounts();
    const idx = accounts.findIndex(acc => acc.username === currentUser.username);
    if (idx !== -1) {
        accounts[idx].password = newPass;
        localStorage.setItem('appAccounts', JSON.stringify(accounts));
    }
    closeModal('changePassModal');
    alert('✅ Đổi mật khẩu thành công!');
};

/* ==========================================================================
   2. ĐIỀU HƯỚNG TAB
   ========================================================================== */

window.switchTab = function(tabId) {
    ['tab-hoa', 'tab-danhsachthanhvien', 'tab-sOHu', 'tab-taikhoan'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });

    ['btnTabHoa', 'btnTabDanhSachThanhVien', 'btnTabSoHuu', 'btnTabTaiKhoan'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.className = "px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm bg-emerald-800 text-emerald-200 hover:bg-emerald-700";
    });

    document.getElementById(tabId)?.classList.remove('hidden');

    let activeBtnId = 'btnTabHoa';
    if (tabId === 'tab-danhsachthanhvien') activeBtnId = 'btnTabDanhSachThanhVien';
    else if (tabId === 'tab-sOHu') activeBtnId = 'btnTabSoHuu';
    else if (tabId === 'tab-taikhoan') activeBtnId = 'btnTabTaiKhoan';

    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.className = "px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm bg-amber-400 text-emerald-950";

    if (tabId === 'tab-danhsachthanhvien') renderPublicMemberTable();
    if (tabId === 'tab-taikhoan') renderAdminAccountTable();
};

/* ==========================================================================
   3. QUẢN LÝ HOA
   ========================================================================== */

window.previewLocalFlowerImage = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempFlowerImageBase64 = e.target.result;
            document.getElementById('previewFlowerImg').src = tempFlowerImageBase64;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image')) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function(e) {
                tempFlowerImageBase64 = e.target.result;
                const previewImg = document.getElementById('previewFlowerImg');
                if (previewImg) previewImg.src = tempFlowerImageBase64;
                alert("✅ Đã nhận ảnh từ Snipping Tool thành công!");
            };
            reader.readAsDataURL(blob);
        }
    }
});

function initFlowersFromFirebase() {
    const flowersRef = collection(db, "LoaiHoa");
    onSnapshot(flowersRef, (snapshot) => {
        flowersData = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            flowersData.push({
                id: docSnap.id,
                name: data.name,
                color: data.color,
                image: data.image || defaultImg
            });
        });
        renderFlowers();
        renderAssignFlowerCheckboxes();
    });
}

window.handleAddFlower = async function() {
    const nameInput = document.getElementById('newFlowerName');
    const colorSelect = document.getElementById('newFlowerColor');
    const urlInput = document.getElementById('flowerUrlInput').value.trim();
    
    const name = nameInput.value.trim();
    const color = colorSelect.value;
    let img = tempFlowerImageBase64;
    if (urlInput) img = urlInput;

    if (!name) { alert('Vui lòng nhập tên hoa!'); return; }

    try {
        await addDoc(collection(db, "LoaiHoa"), {
            name: name, color: color, image: img, thoiGian: serverTimestamp()
        });
        alert(`🎉 Đã thêm hoa "${name}" thành công!`);
        nameInput.value = '';
        document.getElementById('flowerUrlInput').value = '';
        tempFlowerImageBase64 = defaultImg;
        document.getElementById('previewFlowerImg').src = defaultImg;
    } catch (e) {
        alert("Lỗi khi thêm hoa: " + e.message);
    }
};

window.deleteFlower = async function(flowerId, flowerName) {
    if (confirm(`Bạn có chắc muốn xóa loại hoa "${flowerName}" này không?`)) {
        try {
            await deleteDoc(doc(db, "LoaiHoa", flowerId));
            alert('✅ Đã xóa hoa thành công!');
        } catch (e) {
            alert('Lỗi khi xóa: ' + e.message);
        }
    }
};

window.openChangeFlowerImgModal = function(flowerId, flowerName) {
    document.getElementById('editingFlowerId').value = flowerId;
    document.getElementById('changeFlowerTitle').innerText = `🌸 Đổi ảnh cho hoa: ${flowerName}`;
    document.getElementById('flowerUrlInputModal').value = '';
    document.getElementById('flowerFileModalInput').value = '';
    document.getElementById('changeFlowerImgModal').classList.remove('hidden');
};

window.saveFlowerImage = async function() {
    const flowerId = document.getElementById('editingFlowerId').value;
    const urlInput = document.getElementById('flowerUrlInputModal').value.trim();
    const fileInput = document.getElementById('flowerFileModalInput').files[0];

    const updateImg = async (newUrl) => {
        await updateDoc(doc(db, "LoaiHoa", flowerId), { image: newUrl });
        closeModal('changeFlowerImgModal');
        alert('✅ Cập nhật ảnh hoa thành công!');
    };

    if (fileInput) {
        const reader = new FileReader();
        reader.onload = (e) => updateImg(e.target.result);
        reader.readAsDataURL(fileInput);
    } else if (urlInput) {
        updateImg(urlInput);
    } else {
        alert('Vui lòng chọn tệp hoặc nhập URL ảnh mới!');
    }
};

function renderFlowers() {
    const container = document.getElementById('flowerContainer');
    if (!container) return;

    const selectedColor = document.getElementById('selectColor')?.value || 'All';
    const searchText = (document.getElementById('inputSearch')?.value || '').toLowerCase();
    
    container.innerHTML = '';
    const allColors = ['Đỏ', 'Cam', 'Tím', 'Xanh dương', 'Xanh lá'];
    const colorsToDisplay = selectedColor === 'All' ? allColors : [selectedColor];

    colorsToDisplay.forEach(color => {
        const filtered = flowersData.filter(f => f.color === color && f.name.toLowerCase().includes(searchText));
        if (filtered.length === 0) return;

        let bgStyle = 'bg-red-200/95 border-red-300';
        let cardBg = 'bg-red-50 border-red-200';
        if (color === 'Cam') { bgStyle = 'bg-orange-200/95 border-orange-300'; cardBg = 'bg-orange-50 border-orange-200'; }
        else if (color === 'Tím') { bgStyle = 'bg-purple-200/95 border-purple-300'; cardBg = 'bg-purple-50 border-purple-200'; }
        else if (color === 'Xanh dương') { bgStyle = 'bg-sky-200/95 border-sky-300'; cardBg = 'bg-sky-50 border-sky-200'; }
        else if (color === 'Xanh lá') { bgStyle = 'bg-emerald-200/95 border-emerald-300'; cardBg = 'bg-emerald-50 border-emerald-200'; }

        let html = `
            <div class="${bgStyle} p-4 rounded-2xl border shadow-sm mb-4">
                <div class="flex justify-between items-center mb-3">
                    <span class="font-bold text-gray-900 text-sm">Hoa nền ${color.toLowerCase()} đậm</span>
                    <span class="text-xs text-gray-700 font-semibold">${filtered.length} hoa</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        `;

        filtered.forEach(flower => {
            html += `
                <div class="${cardBg} border p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                    <div class="flex items-center gap-2.5 flex-1 overflow-hidden">
                        <img src="${flower.image}" onclick="openChangeFlowerImgModal('${flower.id}', '${flower.name}')" title="Click để đổi ảnh hoa" class="w-11 h-11 object-cover rounded-xl border border-white shadow-xs cursor-pointer hover:scale-105 transition">
                        <span class="text-xs font-bold text-gray-800 truncate">${flower.name}</span>
                    </div>
                    <button onclick="deleteFlower('${flower.id}', '${flower.name}')" title="Xóa hoa" class="text-gray-400 hover:text-red-600 p-1 text-xs">🗑️</button>
                </div>
            `;
        });
        html += `</div></div>`;
        container.innerHTML += html;
    });
}

/* ==========================================================================
   4. QUẢN LÝ THÀNH VIÊN, CHỨC VỤ & PHÂN QUYỀN
   ========================================================================== */

function initMembersFromFirebase() {
    const membersRef = collection(db, "ThanhVien");
    onSnapshot(membersRef, async (snapshot) => {
        if (snapshot.empty) {
            const nowStr = new Date().toLocaleDateString('vi-VN');
            await addDoc(membersRef, { ten: "A Hạ Du", chucVu: "Hội trưởng", ngayThamGia: nowStr, thoiGian: serverTimestamp() });
            await addDoc(membersRef, { ten: "Trang Trang", chucVu: "Thành viên", ngayThamGia: nowStr, thoiGian: serverTimestamp() });
            return;
        }

        membersList = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.ten) {
                membersList.push({ 
                    id: docSnap.id, 
                    ten: data.ten, 
                    chucVu: data.chucVu || "Thành viên",
                    ngayThamGia: data.ngayThamGia || new Date().toLocaleDateString('vi-VN'),
                    avatar: data.avatar || "" // <--- Thêm dòng này để đọc ảnh avatar từ Firebase
                });
            }
        });
        // Bổ sung đoạn sắp xếp thứ bậc chức vụ vào đây
        membersList.sort((a, b) => {
            const rankA = roleHierarchy[a.chucVu] || 6;
            const rankB = roleHierarchy[b.chucVu] || 6;
            return rankA - rankB;
        });
        renderPublicMemberTable();
        renderMemberDropdowns();
    });
}

window.handleAddMember = async function() {
    const input = document.getElementById('newMemberName');
    const name = input.value.trim();
    if (!name) return;

    try {
        const currentDate = new Date().toLocaleDateString('vi-VN');
        await addDoc(collection(db, "ThanhVien"), { 
            ten: name, 
            chucVu: "Thành viên", 
            ngayThamGia: currentDate,
            thoiGian: serverTimestamp() 
        });
        input.value = '';
        alert(`✅ Đã thêm thành viên "${name}" thành công!`);
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

window.updateMemberRole = async function(memberId, newRole) {
    const currentUser = getCurrentUser();
    let isHoiTruong = false;
    membersList.forEach(m => {
        if (currentUser && m.ten.toLowerCase() === currentUser.name?.toLowerCase() && m.chucVu === 'Hội trưởng') {
            isHoiTruong = true;
        }
    });

    if (!currentUser || (currentUser.role !== 'admin' && !isHoiTruong)) {
        alert('❌ Chỉ có tài khoản Quản trị viên (Admin) hoặc Hội trưởng mới có quyền thay đổi chức vụ và quyền hạn!');
        renderPublicMemberTable(); 
        return;
    }

    // Kiểm tra giới hạn số lượng chức vụ
    const currentCounts = {
        "Hội trưởng": 0,
        "Hội phó": 0,
        "Quản lý": 0
    };

    membersList.forEach(m => {
        if (m.id !== memberId && currentCounts[m.chucVu] !== undefined) {
            currentCounts[m.chucVu]++;
        }
    });

    if (newRole === 'Hội trưởng' && currentCounts['Hội trưởng'] >= 1) {
        alert('❌ Hệ thống chỉ cho phép tối đa 1 Hội trưởng!');
        renderPublicMemberTable();
        return;
    }
    if (newRole === 'Hội phó' && currentCounts['Hội phó'] >= 3) {
        alert('❌ Hệ thống chỉ cho phép tối đa 3 Hội phó!');
        renderPublicMemberTable();
        return;
    }
    if (newRole === 'Quản lý' && currentCounts['Quản lý'] >= 5) {
        alert('❌ Hệ thống chỉ cho phép tối đa 5 Quản lý!');
        renderPublicMemberTable();
        return;
    }

    try {
        const memberRef = doc(db, "ThanhVien", memberId);
        await updateDoc(memberRef, { chucVu: newRole });

        if (newRole === 'Hội trưởng' || newRole === 'Hội phó') {
            const memberObj = membersList.find(m => m.id === memberId);
            if (memberObj) {
                let accounts = getAccounts();
                let acc = accounts.find(a => a.name?.toLowerCase() === memberObj.ten.toLowerCase() || a.username === memberObj.ten.toLowerCase());
                if (acc) {
                    acc.role = 'admin';
                    localStorage.setItem('appAccounts', JSON.stringify(accounts));
                }
            }
        }

        alert(`✅ Đã cập nhật chức vụ thành công thành: ${newRole}!`);
    } catch (e) {
        alert('Lỗi cập nhật chức vụ: ' + e.message);
    }
};

window.deleteMemberPublic = async function(memberId, memberName) {
    const currentUser = getCurrentUser();
    const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.chucVu === 'Hội trưởng');

    if (!isAuthorized) {
        alert('❌ Chỉ có tài khoản Quản trị viên (Admin) hoặc Hội trưởng mới có quyền xóa thành viên!');
        return;
    }

    if (confirm(`Bạn có chắc muốn xóa thành viên "${memberName}"?`)) {
        try {
            await deleteDoc(doc(db, "ThanhVien", memberId));
            alert('✅ Đã xóa thành viên thành công!');
        } catch (e) {
            alert('Lỗi: ' + e.message);
        }
    }
};

function renderPublicMemberTable() {
    const tbody = document.getElementById('memberTableBodyPublic');
    const totalBadge = document.getElementById('totalMemberBadge');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (totalBadge) {
        totalBadge.innerText = `📊 Tổng số thành viên: ${membersList.length}`;
    }

    const currentUser = getCurrentUser();
    const canModify = currentUser && (currentUser.role === 'admin' || currentUser.chucVu === 'Hội trưởng');

    membersList.forEach((m, index) => {
        const roleOptions = ['Hội trưởng', 'Hội phó', 'Quản lý', 'Tinh Anh', 'Thành viên'];
        let optionsHtml = '';
        roleOptions.forEach(role => {
            const selected = m.chucVu === role ? 'selected' : '';
            optionsHtml += `<option value="${role}" ${selected}>${role}</option>`;
        });

        const selectDisabled = !canModify ? 'disabled title="Chỉ Admin hoặc Hội trưởng mới đổi được chức vụ"' : '';
        
        // Mặc định nếu chưa có ảnh sẽ dùng ảnh hoa mẫu hoặc icon mặc định
        const avatarUrl = m.avatar || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=100&h=100&fit=crop';

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-3 text-center font-bold text-gray-500">${index + 1}</td>
                <td class="p-3">
                    <div class="flex items-center gap-3">
                        <div class="relative group cursor-pointer" onclick="changeMemberAvatar('${m.id}', '${m.ten}')" title="Bấm để đổi ảnh đại diện">
                            <img src="${avatarUrl}" class="w-9 h-9 rounded-full object-cover border-2 border-emerald-500 shadow-xs">
                            <div class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-[10px]">✏️</div>
                        </div>
                        <span class="font-bold text-gray-800">${m.ten}</span>
                    </div>
                </td>
                <td class="p-3 text-gray-500">${m.ngayThamGia}</td>
                <td class="p-3">
                    <select onchange="updateMemberRole('${m.id}', this.value)" ${selectDisabled} class="px-2 py-1 rounded-lg border text-xs font-semibold bg-white outline-none focus:ring-1 focus:ring-emerald-500">
                        ${optionsHtml}
                    </select>
                </td>
                <td class="p-3 text-right">
                    <button onclick="deleteMemberPublic('${m.id}', '${m.ten}')" class="text-red-500 hover:text-red-700 font-bold text-xs" title="Xóa thành viên">🗑️ Xóa</button>
                </td>
            </tr>
        `;
    });
}


function renderAdminAccountTable() {
    const tbody = document.getElementById('accountTableBodyAdmin');
    if (!tbody) return;
    tbody.innerHTML = '';

    const accounts = getAccounts();
    const currentUser = getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';

    accounts.forEach(acc => {
        const roleBadge = acc.role === 'admin' 
            ? '<span class="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">ADMIN</span>' 
            : '<span class="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">Thành viên</span>';

        const deleteBtn = isAdmin 
            ? `<button onclick="deleteAccountSystem('${acc.username}')" class="text-red-500 hover:text-red-700 font-bold text-xs">🗑️ Xóa tài khoản</button>` 
            : '';

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-3"><img src="${acc.avatar || defaultImg}" class="w-9 h-9 rounded-xl object-cover border"></td>
                <td class="p-3 font-bold text-gray-800">${acc.name || acc.username}</td>
                <td class="p-3 text-gray-500">${acc.username} <br> ${roleBadge}</td>
                <td class="p-3 text-right">${deleteBtn}</td>
            </tr>
        `;
    });
}

window.deleteAccountSystem = function(username) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        alert('❌ Chỉ Admin mới có quyền!');
        return;
    }
    if (confirm(`Xóa tài khoản đăng nhập "${username}"?`)) {
        let accounts = getAccounts();
        accounts = accounts.filter(acc => acc.username !== username);
        localStorage.setItem('appAccounts', JSON.stringify(accounts));
        renderAdminAccountTable();
        alert('✅ Đã xóa!');
    }
};

function renderMemberDropdowns() {
    const selectACC = document.getElementById('selectACC');
    const selectView = document.getElementById('selectMemberToView');
    if (selectACC) selectACC.innerHTML = '';
    if (selectView) selectView.innerHTML = '<option value="">-- Chọn thành viên để xem --</option>';

    membersList.forEach(m => {
        if (selectACC) selectACC.innerHTML += `<option value="${m.ten}">${m.ten}</option>`;
        if (selectView) selectView.innerHTML += `<option value="${m.ten}">${m.ten}</option>`;
    });
}

/* ==========================================================================
   5. HOA THÀNH VIÊN SỞ HỮU
   ========================================================================== */

window.renderAssignFlowerCheckboxes = function() {
    const container = document.getElementById('assignFlowerCheckboxContainer');
    if (!container) return;

    const filterColor = document.getElementById('selectColorFilterAssign')?.value || 'All';
    const filteredFlowers = filterColor === 'All' 
        ? flowersData 
        : flowersData.filter(f => f.color === filterColor);

    container.innerHTML = '';
    if (filteredFlowers.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 col-span-4 p-2 italic">Không có loại hoa nào phù hợp.</p>';
        return;
    }

    filteredFlowers.forEach(flower => {
        container.innerHTML += `
            <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-100/60 cursor-pointer bg-white border border-gray-100 shadow-2xs">
                <input type="checkbox" name="flowerAssignCheckbox" value="${flower.name}" class="rounded text-emerald-600 focus:ring-emerald-500">
                <img src="${flower.image}" class="w-6 h-6 rounded object-cover">
                <span class="text-xs font-bold text-gray-700 truncate">${flower.name}</span>
            </label>
        `;
    });
};

window.saveSelectedFlowers = async function() {
    const selectACC = document.getElementById('selectACC').value;
    const selectStatus = document.getElementById('selectStatus').value;

    const checkboxes = document.querySelectorAll('input[name="flowerAssignCheckbox"]:checked');
    let selectedFlowerNames = Array.from(checkboxes).map(cb => cb.value);

    if (!selectACC) {
        alert("Vui lòng chọn thành viên / ACC!");
        return;
    }
    if (selectedFlowerNames.length === 0) {
        alert("Vui lòng tích chọn ít nhất một loại hoa!");
        return;
    }

    try {
        await addDoc(collection(db, "NhatKyHoa"), {
            tenACC: selectACC,
            trangThai: selectStatus,
            danhSachHoa: selectedFlowerNames,
            thoiGian: serverTimestamp()
        });

        alert(`🎉 Lưu thành công danh sách hoa cho [${selectACC}]!`);
        checkboxes.forEach(cb => cb.checked = false);
        document.getElementById('selectMemberToView').value = selectACC;
        document.getElementById('selectMemberToView').dispatchEvent(new Event('change'));
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

document.getElementById('selectMemberToView')?.addEventListener('change', async (e) => {
    const memberName = e.target.value;
    const resultDiv = document.getElementById('memberFlowersResult');
    if (!memberName) {
        resultDiv.innerHTML = '<p class="text-sm text-gray-400 italic">Vui lòng chọn thành viên để xem chi tiết kho hoa...</p>';
        return;
    }

    resultDiv.innerHTML = '<p class="text-sm text-emerald-600 font-bold animate-pulse">⏳ Đang tải dữ liệu hoa...</p>';

    try {
        const q = query(collection(db, "NhatKyHoa"), where("tenACC", "==", memberName));
        const querySnapshot = await getDocs(q);

        let setThuHoach = new Set();
        let setBoiDuong = new Set();

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.danhSachHoa && Array.isArray(data.danhSachHoa)) {
                data.danhSachHoa.forEach(fName => {
                    if (data.trangThai === 'Đã thu hoạch') setThuHoach.add(fName);
                    else if (data.trangThai === 'Chờ bồi dưỡng') setBoiDuong.add(fName);
                });
            }
        });

        setThuHoach.forEach(f => setBoiDuong.delete(f));

        function renderColumn(title, hoaSet, isThuHoach) {
            if (hoaSet.size === 0) {
                return `<div class="p-4 rounded-2xl border bg-gray-50"><p class="text-xs text-gray-400 italic">Không có hoa nào ở mục ${title}.</p></div>`;
            }

            const allColors = ['Đỏ', 'Cam', 'Tím', 'Xanh dương', 'Xanh lá'];
            let grouped = {};
            hoaSet.forEach(fName => {
                const info = flowersData.find(f => f.name === fName) || { color: 'Khác', image: defaultImg };
                if (!grouped[info.color]) grouped[info.color] = [];
                grouped[info.color].push({ name: fName, image: info.image });
            });

            let html = `<div class="space-y-3">`;
            allColors.forEach(color => {
                if (grouped[color] && grouped[color].length > 0) {
                    html += `
                        <div class="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                            <span class="text-[11px] font-bold text-emerald-900 bg-emerald-200/60 px-2 py-0.5 rounded">Nền ${color.toLowerCase()} đậm (${grouped[color].length})</span>
                            <div class="grid grid-cols-2 gap-2 mt-2">
                    `;
                    grouped[color].forEach(item => {
                        const actionBtn = !isThuHoach 
                            ? `<button onclick="autoMoveToHarvest('${item.name}', '${memberName}')" class="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded font-bold hover:bg-emerald-700">✨ Bồi dưỡng xong</button>` 
                            : '';
                        html += `
                            <div class="flex items-center justify-between bg-white p-2 rounded-xl border shadow-2xs">
                                <div class="flex items-center gap-2">
                                    <img src="${item.image}" class="w-8 h-8 rounded-lg object-cover">
                                    <span class="text-xs font-bold text-gray-800">${item.name}</span>
                                </div>
                                ${actionBtn}
                            </div>
                        `;
                    });
                    html += `</div></div>`;
                }
            });
            html += `</div>`;
            return html;
        }

        resultDiv.innerHTML = `
            <h4 class="font-bold text-emerald-900 mb-4 text-sm">🌸 Kho hoa sở hữu của [${memberName}]:</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200">
                    <h5 class="font-bold text-indigo-900 text-xs mb-3">💼 Đã thu hoạch (${setThuHoach.size})</h5>
                    ${renderColumn('Đã thu hoạch', setThuHoach, true)}
                </div>
                <div class="bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                    <h5 class="font-bold text-amber-900 text-xs mb-3">🌱 Chờ bồi dưỡng (${setBoiDuong.size})</h5>
                    ${renderColumn('Chờ bồi dưỡng', setBoiDuong, false)}
                </div>
            </div>
        `;
    } catch (err) {
        resultDiv.innerHTML = `<p class="text-sm text-red-500">Lỗi tải dữ liệu: ${err.message}</p>`;
    }
});

window.autoMoveToHarvest = async function(flowerName, memberName) {
    try {
        await addDoc(collection(db, "NhatKyHoa"), {
            tenACC: memberName,
            danhSachHoa: [flowerName],
            trangThai: "Đã thu hoạch",
            thoiGian: serverTimestamp()
        });

        const q = query(collection(db, "NhatKyHoa"), where("tenACC", "==", memberName), where("trangThai", "==", "Chờ bồi dưỡng"));
        const snapshot = await getDocs(q);
        for (let docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.danhSachHoa && data.danhSachHoa.includes(flowerName)) {
                const updated = data.danhSachHoa.filter(n => n !== flowerName);
                if (updated.length === 0) {
                    await deleteDoc(doc(db, "NhatKyHoa", docSnap.id));
                } else {
                    await updateDoc(doc(db, "NhatKyHoa", docSnap.id), { danhSachHoa: updated });
                }
            }
        }

        alert(`✨ Đã tự động chuyển hoa "${flowerName}" sang mục ĐÃ THU HOẠCH!`);
        document.getElementById('selectMemberToView').dispatchEvent(new Event('change'));
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

let currentEditingMemberId = null;

window.changeMemberAvatar = function(memberId, memberName) {
    const currentUser = getCurrentUser();
    const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.chucVu === 'Hội trưởng');

    if (!isAuthorized) {
        alert('❌ Chỉ có tài khoản Quản trị viên (Admin) hoặc Hội trưởng mới có quyền thay đổi ảnh đại diện của thành viên!');
        return;
    }

    currentEditingMemberId = memberId;
    document.getElementById('memberAvatarModalTitle').innerText = `🌸 Đổi ảnh đại diện cho: ${memberName}`;
    document.getElementById('memberAvatarUrlInput').value = '';
    document.getElementById('memberAvatarFileInput').value = '';
    document.getElementById('memberAvatarModal').classList.remove('hidden');
};

window.closeMemberAvatarModal = function() {
    document.getElementById('memberAvatarModal').classList.add('hidden');
    currentEditingMemberId = null;
};

window.submitMemberAvatarChange = async function() {
    if (!currentEditingMemberId) return;

    const urlInput = document.getElementById('memberAvatarUrlInput').value.trim();
    const fileInput = document.getElementById('memberAvatarFileInput');

    let finalImageUrl = '';

    if (urlInput) {
        finalImageUrl = urlInput;
    } else if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Tiến hành nén ảnh trước khi chuyển sang Base64 để không bị vượt quá giới hạn 1MB của Firestore
        finalImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Giới hạn kích thước tối đa (ví dụ: 300x300 pixels là quá đủ cho avatar)
                    const MAX_SIZE = 300;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Xuất ra định dạng JPEG với chất lượng 0.7 để dung lượng rất nhẹ (chỉ vài chục KB)
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (!finalImageUrl) {
        alert('⚠️ Vui lòng nhập đường dẫn URL ảnh hoặc chọn một file ảnh từ thiết bị!');
        return;
    }

    try {
        const memberRef = doc(db, "ThanhVien", currentEditingMemberId);
        await updateDoc(memberRef, { avatar: finalImageUrl });
        
        alert('✅ Đã cập nhật ảnh đại diện thành công!');
        closeMemberAvatarModal();
    } catch (e) {
        alert('Lỗi khi cập nhật ảnh: ' + e.message);
    }
};

/* ==========================================================================
   6. KHỞI TẠO
   ========================================================================== */
document.getElementById('selectColor')?.addEventListener('change', renderFlowers);
document.getElementById('inputSearch')?.addEventListener('input', renderFlowers);

document.addEventListener('DOMContentLoaded', () => {
    getAccounts();
    updateAuthUI();
    initMembersFromFirebase();
    initFlowersFromFirebase();
});