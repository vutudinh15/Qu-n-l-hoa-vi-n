import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, where, 
    updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ DÁN MÃ FIREBASECONFIG CỦA BẠN VÀO ĐÂY:
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

let membersList = [];
let flowersData = [];
const defaultImg = "https://cdn-icons-png.flaticon.com/512/346/346195.png";

// Biến lưu trữ tạm thời ảnh đang chọn/paste/tải lên trong modal đổi ảnh hoa
let currentEditingFlowerImageBase64 = "";

const defaultFlowersSeed = [
    { name: "Chép Vàng Vượt Sóng", color: "Đỏ", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=100&auto=format&fit=crop&q=60" },
    { name: "Cỏ Rồng Ắt Linh", color: "Đỏ", image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=100&auto=format&fit=crop&q=60" },
    { name: "Bóng Quế Cành Ngọc", color: "Cam", image: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=100&auto=format&fit=crop&q=60" },
    { name: "Cá Heo Hồng", color: "Cam", image: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=100&auto=format&fit=crop&q=60" },
    { name: "Đinh Hoa Đêm Mộng", color: "Tím", image: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=100&auto=format&fit=crop&q=60" },
    { name: "Tử Vi Tinh Tinh", color: "Tím", image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=100&auto=format&fit=crop&q=60" },
    { name: "Thanh Loan Bích Vũ", color: "Xanh dương", image: "https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=100&auto=format&fit=crop&q=60" },
    { name: "Cá Heo Trắng", color: "Xanh dương", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=100&auto=format&fit=crop&q=60" },
    { name: "Mộc Mạc Chi Lăng", color: "Xanh lá", image: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=100&auto=format&fit=crop&q=60" },
    { name: "Ngân Hà Chiếu Nhụy", color: "Xanh lá", image: "https://images.unsplash.com/photo-1468327768560-75b778885529?w=100&auto=format&fit=crop&q=60" }
];

/* ==========================================================================
   1. QUẢN LÝ XÁC THỰC (AUTH) & TÀI KHOẢN & AVATAR
   ========================================================================== */

function getAccounts() {
    const stored = localStorage.getItem('appAccounts');
    if (stored) return JSON.parse(stored);
    
    const defaultAccounts = [
        { username: 'admin', password: '123', role: 'admin', name: 'Quản trị viên', avatar: 'https://ui-avatars.com/api/?name=Admin&background=facc15&color=000' },
        { username: 'user', password: '123', role: 'user', name: 'Thành viên', avatar: 'https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff' }
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

    if (currentUser) {
        if (authModal) authModal.classList.add('hidden');
        if (userBadge) {
            userBadge.classList.remove('hidden');
            document.getElementById('headerUserName').innerText = currentUser.name || currentUser.username;
            document.getElementById('headerUserRole').innerText = currentUser.role;
            document.getElementById('headerAvatarImg').src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || currentUser.username)}&background=facc15&color=000`;
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
        if (tabLoginBtn) tabLoginBtn.className = "w-1/2 py-2 font-bold border-b-2 border-emerald-600 text-emerald-600";
        if (tabRegisterBtn) tabRegisterBtn.className = "w-1/2 py-2 font-bold border-b-2 border-transparent text-gray-400";
    } else {
        loginForm?.classList.add('hidden');
        regForm?.classList.remove('hidden');
        if (tabRegisterBtn) tabRegisterBtn.className = "w-1/2 py-2 font-bold border-b-2 border-emerald-600 text-emerald-600";
        if (tabLoginBtn) tabLoginBtn.className = "w-1/2 py-2 font-bold border-b-2 border-transparent text-gray-400";
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
        renderMemberDropdowns();
        renderFlowers();
    } else {
        alert('❌ Tên đăng nhập hoặc mật khẩu không chính xác!');
    }
};

window.handleRegister = function() {
    const name = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUser').value.trim().toLowerCase();
    const password = document.getElementById('regPass').value;
    const confirmPass = document.getElementById('regPassConfirm').value;
    const role = document.getElementById('regRole').value;

    if (password !== confirmPass) {
        alert('❌ Mật khẩu xác nhận không trùng khớp!');
        return;
    }

    const accounts = getAccounts();
    if (accounts.some(acc => acc.username === username)) {
        alert('❌ Tên đăng nhập này đã tồn tại!');
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

    alert('🎉 Tạo tài khoản thành công! Vui lòng đăng nhập.');
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
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.toggle('hidden');
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
        alert('❌ Mật khẩu hiện tại không chính xác!');
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
   2. QUẢN LÝ THÀNH VIÊN & CÁC LOẠI HOA TRÊN FIREBASE
   ========================================================================== */

function initMembersFromFirebase() {
    const membersRef = collection(db, "ThanhVien");

    onSnapshot(membersRef, async (snapshot) => {
        if (snapshot.empty) {
            const defaultMembers = ["ACC 01", "ACC 02", "ACC 03", "Nguyễn Văn A", "Trần Thị B"];
            for (let mName of defaultMembers) {
                await addDoc(membersRef, { ten: mName, thoiGian: serverTimestamp() });
            }
            return;
        }

        membersList = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.ten) {
                membersList.push({ id: docSnap.id, ten: data.ten });
            }
        });

        membersList.sort((a, b) => a.ten.localeCompare(b.ten));
        renderMemberDropdowns();
    });
}

function initFlowersFromFirebase() {
    const flowersRef = collection(db, "LoaiHoa");

    onSnapshot(flowersRef, async (snapshot) => {
        if (snapshot.empty) {
            for (let flower of defaultFlowersSeed) {
                await addDoc(flowersRef, {
                    name: flower.name,
                    color: flower.color,
                    image: flower.image,
                    thoiGian: serverTimestamp()
                });
            }
            return;
        }

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
    });
}

function renderMemberDropdowns() {
    const selectACC = document.getElementById('selectACC');
    const selectMemberToView = document.getElementById('selectMemberToView');
    const memberListManager = document.getElementById('memberListManager');
    const currentUser = getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (selectACC) selectACC.innerHTML = '';
    if (selectMemberToView) selectMemberToView.innerHTML = '<option value="">-- Chọn thành viên --</option>';
    if (memberListManager) memberListManager.innerHTML = '';

    membersList.forEach(m => {
        if (selectACC) selectACC.innerHTML += `<option value="${m.ten}">${m.ten}</option>`;
        if (selectMemberToView) selectMemberToView.innerHTML += `<option value="${m.ten}">${m.ten}</option>`;
        
        if (memberListManager) {
            const deleteBtn = isAdmin 
                ? `<button onclick="deleteMember('${m.id}', '${m.ten}')" title="Xóa thành viên" class="text-red-500 hover:text-red-700 font-bold ml-1">✕</button>` 
                : '';

            memberListManager.innerHTML += `
                <span class="inline-flex items-center gap-1.5 bg-pink-100 text-pink-900 border border-pink-200 text-xs font-semibold px-2.5 py-1 rounded-xl">
                    <span class="cursor-pointer hover:underline" onclick="showMemberFlowersByName('${m.ten}')">${m.ten}</span>
                    ${deleteBtn}
                </span>
            `;
        }
    });
}

window.handleAddMember = async function() {
    const inputNewMember = document.getElementById('newMemberName');
    if (!inputNewMember) return;

    const newMemberName = inputNewMember.value.trim();

    if (!newMemberName) {
        alert("Vui lòng nhập tên thành viên!");
        return;
    }

    if (membersList.some(m => m.ten.toLowerCase() === newMemberName.toLowerCase())) {
        alert(`Thành viên "${newMemberName}" đã tồn tại!`);
        return;
    }

    try {
        await addDoc(collection(db, "ThanhVien"), {
            ten: newMemberName,
            thoiGian: serverTimestamp()
        });

        inputNewMember.value = '';
        alert(`✅ Đã thêm thành viên "${newMemberName}" thành công!`);
    } catch (e) {
        alert("Lỗi khi thêm thành viên: " + e.message);
    }
};

window.deleteMember = async function(memberId, memberName) {
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên "${memberName}" vĩnh viễn khỏi Firebase không?`)) {
        try {
            await deleteDoc(doc(db, "ThanhVien", memberId));
            alert(`✅ Đã xóa thành viên "${memberName}" thành công!`);
        } catch (e) {
            alert("Lỗi khi xóa thành viên: " + e.message);
        }
    }
};

window.handleAddFlower = async function() {
    const nameInput = document.getElementById('newFlowerName');
    const colorSelect = document.getElementById('newFlowerColor');
    
    const name = nameInput.value.trim();
    const color = colorSelect.value;
    const img = currentEditingFlowerImageBase64 || defaultImg;

    if (!name) { 
        alert('Vui lòng nhập tên hoa!'); 
        return; 
    }

    if (flowersData.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        alert(`Loại hoa "${name}" đã tồn tại trong hệ thống!`);
        return;
    }

    try {
        await addDoc(collection(db, "LoaiHoa"), {
            name: name,
            color: color,
            image: img,
            thoiGian: serverTimestamp()
        });

        alert(`🎉 Đã thêm hoa "${name}" thành công lên Firebase!`);
        nameInput.value = '';
        currentEditingFlowerImageBase64 = "";
        
        // Reset preview ảnh về mặc định nếu có
        const previewImg = document.getElementById('previewFlowerImg');
        if(previewImg) previewImg.src = defaultImg;

    } catch (e) {
        alert("Lỗi khi thêm hoa: " + e.message);
    }
};

window.deleteFlower = async function(flowerId, flowerName) {
    if(confirm(`Bạn có chắc muốn xóa loại hoa "${flowerName}" khỏi danh sách mẫu trên Firebase không?`)) {
        try {
            await deleteDoc(doc(db, "LoaiHoa", flowerId));
            alert(`✅ Đã xóa hoa "${flowerName}" thành công!`);
        } catch (e) {
            alert("Lỗi khi xóa loại hoa: " + e.message);
        }
    }
};

window.deleteUserFlower = async function(flowerName, memberName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa hoa "${flowerName}" khỏi tài khoản [${memberName}] không?`)) {
        return;
    }

    try {
        const q = query(collection(db, "NhatKyHoa"), where("tenACC", "==", memberName));
        const querySnapshot = await getDocs(q);

        let isUpdated = false;

        for (let docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            if (data.danhSachHoa && data.danhSachHoa.includes(flowerName)) {
                const updatedList = data.danhSachHoa.filter(name => name !== flowerName);

                if (updatedList.length === 0) {
                    await deleteDoc(doc(db, "NhatKyHoa", docSnap.id));
                } else {
                    await updateDoc(doc(db, "NhatKyHoa", docSnap.id), {
                        danhSachHoa: updatedList
                    });
                }
                isUpdated = true;
            }
        }

        if (isUpdated) {
            alert(`Đã xóa hoa "${flowerName}" khỏi tài khoản [${memberName}] thành công!`);
            document.getElementById('selectMemberToView').dispatchEvent(new Event('change'));
        }
    } catch (e) {
        alert("Lỗi khi xóa hoa: " + e.message);
    }
};

window.moveToHarvest = async function(flowerName, memberName) {
    if (!confirm(`Bạn có chắc muốn chuyển hoa "${flowerName}" của [${memberName}] sang danh sách ĐÃ THU HOẠCH?`)) {
        return;
    }

    try {
        await addDoc(collection(db, "NhatKyHoa"), {
            tenACC: memberName,
            danhSachHoa: [flowerName],
            trangThai: "Đã thu hoạch",
            thoiGian: serverTimestamp()
        });

        const q = query(collection(db, "NhatKyHoa"), where("tenACC", "==", memberName), where("trangThai", "==", "Chờ bồi dưỡng"));
        const querySnapshot = await getDocs(q);

        for (let docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            if (data.danhSachHoa && data.danhSachHoa.includes(flowerName)) {
                const updatedList = data.danhSachHoa.filter(name => name !== flowerName);

                if (updatedList.length === 0) {
                    await deleteDoc(doc(db, "NhatKyHoa", docSnap.id));
                } else {
                    await updateDoc(doc(db, "NhatKyHoa", docSnap.id), {
                        danhSachHoa: updatedList
                    });
                }
            }
        }

        alert(`✅ Đã chuyển "${flowerName}" sang Đã thu hoạch thành công!`);
        document.getElementById('selectMemberToView').dispatchEvent(new Event('change'));

    } catch (e) {
        alert("Lỗi khi chuyển trạng thái: " + e.message);
    }
};

/* ==========================================================================
   ✨ TÍNH NĂNG MỞ MODAL ĐỔI ẢNH & HỖ TRỢ PASTE ẢNH (CTRL + V)
   ========================================================================== */

window.openChangeFlowerImgModal = function(flowerId, flowerName) {
    const modal = document.getElementById('changeFlowerImgModal');
    const title = document.getElementById('changeFlowerTitle');
    const idInput = document.getElementById('editingFlowerId');
    const urlInput = document.getElementById('flowerUrlInput');
    const fileInput = document.getElementById('flowerFileInput');

    if (idInput) idInput.value = flowerId;
    if (title) title.innerText = `🌸 Đổi ảnh cho hoa: ${flowerName}`;
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';

    modal?.classList.remove('hidden');
};

window.saveFlowerImage = async function() {
    const flowerId = document.getElementById('editingFlowerId')?.value;
    const urlInput = document.getElementById('flowerUrlInput')?.value.trim();
    const fileInput = document.getElementById('flowerFileInput')?.files[0];

    if (!flowerId) return;

    const applyNewImage = async (newImgUrl) => {
        try {
            await updateDoc(doc(db, "LoaiHoa", flowerId), {
                image: newImgUrl
            });
            closeModal('changeFlowerImgModal');
            alert('✅ Cập nhật ảnh hoa thành công!');
        } catch (e) {
            alert('Lỗi khi cập nhật ảnh hoa: ' + e.message);
        }
    };

    if (fileInput) {
        const reader = new FileReader();
        reader.onload = (e) => applyNewImage(e.target.result);
        reader.readAsDataURL(fileInput);
    } else if (urlInput) {
        applyNewImage(urlInput);
    } else {
        alert('Vui lòng chọn tệp ảnh hoặc dán ảnh (Ctrl+V)!');
    }
};

// Lắng nghe sự kiện paste (Ctrl + V) trên toàn bộ tài liệu hoặc các vùng chọn ảnh
document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image')) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Result = e.target.result;
                currentEditingFlowerImageBase64 = base64Result;
                
                // Hiển thị preview nếu có ô xem trước
                const previewImg = document.getElementById('previewFlowerImg');
                if (previewImg) previewImg.src = base64Result;

                alert("✅ Đã nhận ảnh chụp màn hình (Snipping Tool) thành công!");
            };
            reader.readAsDataURL(blob);
        }
    }
});

function renderFlowers() {
    const flowerContainer = document.getElementById('flowerContainer');
    if (!flowerContainer) return;

    const selectedColor = document.getElementById('selectColor')?.value || 'All';
    const searchText = (document.getElementById('inputSearch')?.value || '').toLowerCase();
    const currentUser = getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    flowerContainer.innerHTML = '';
    const allColors = ['Đỏ', 'Cam', 'Tím', 'Xanh dương', 'Xanh lá'];
    const colors = selectedColor === 'All' ? allColors : [selectedColor];

    colors.forEach(color => {
        const filtered = flowersData.filter(f => f.color === color && f.name.toLowerCase().includes(searchText));
        if(filtered.length === 0) return;

        let groupBg = 'bg-red-200/90 border-red-300';
        let cardBg = 'bg-red-100/80 border-red-200';

        if (color === 'Cam') { 
            groupBg = 'bg-orange-200/90 border-orange-300'; 
            cardBg = 'bg-orange-100/80 border-orange-200'; 
        } else if (color === 'Tím') { 
            groupBg = 'bg-purple-200/90 border-purple-300'; 
            cardBg = 'bg-purple-100/80 border-purple-200'; 
        } else if (color === 'Xanh dương') { 
            groupBg = 'bg-sky-200/90 border-sky-300'; 
            cardBg = 'bg-sky-100/80 border-sky-200'; 
        } else if (color === 'Xanh lá') { 
            groupBg = 'bg-emerald-200/90 border-emerald-300'; 
            cardBg = 'bg-emerald-100/80 border-emerald-200'; 
        }

        let html = `
            <div class="${groupBg} p-4 rounded-2xl border shadow-sm mb-4">
                <div class="flex justify-between items-center mb-3">
                    <span class="font-bold text-gray-900 text-sm">Hoa nền ${color.toLowerCase()}</span>
                    <span class="text-xs text-gray-700 font-semibold">${filtered.length} hoa</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        `;

        filtered.forEach(flower => {
            const imgUrl = flower.image || defaultImg;
            const deleteBtn = isAdmin 
                ? `<button onclick="deleteFlower('${flower.id}', '${flower.name}')" title="Xóa hoa này khỏi mẫu" class="text-gray-400 hover:text-red-600 p-1 rounded-lg transition text-xs">🗑️</button>` 
                : '';

            html += `
                <div class="${cardBg} border p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-sm hover:shadow-md transition">
                    <div class="flex items-center gap-2.5 flex-1 overflow-hidden">
                        <input type="checkbox" value="${flower.name}" class="flower-checkbox w-4 h-4 accent-emerald-600 rounded cursor-pointer">
                        <img src="${imgUrl}" alt="${flower.name}" 
                            onclick="openChangeFlowerImgModal('${flower.id}', '${flower.name}')"
                            title="Click để đổi ảnh hoa"
                            class="w-11 h-11 object-cover rounded-xl border border-white/80 shadow-xs flex-shrink-0 cursor-pointer hover:scale-110 hover:opacity-90 transition transform">
                        <span class="text-xs font-bold text-gray-800 truncate">${flower.name}</span>
                    </div>
                    ${deleteBtn}
                </div>
            `;
        });

        html += `</div></div>`;
        flowerContainer.innerHTML += html;
    });
}

/* ==========================================================================
   3. TRA CỨU & HIỂN THỊ CHI TIẾT HOA CỦA THÀNH VIÊN
   ========================================================================== */

document.getElementById('selectMemberToView')?.addEventListener('change', async (e) => {
    const memberName = e.target.value;
    const resultDiv = document.getElementById('memberFlowersResult');

    if(!memberName) {
        resultDiv.innerHTML = '<p class="text-sm text-gray-500 italic">Vui lòng chọn thành viên...</p>';
        return;
    }

    resultDiv.innerHTML = '<p class="text-sm text-emerald-600 font-bold animate-pulse">⏳ Đang tải dữ liệu từ Firebase...</p>';

    try {
        const q = query(collection(db, "NhatKyHoa"), where("tenACC", "==", memberName));
        const querySnapshot = await getDocs(q);

        if(querySnapshot.empty) {
            resultDiv.innerHTML = `<p class="text-sm text-gray-500">Thành viên <b>${memberName}</b> chưa có hoa nào trong hệ thống.</p>`;
            return;
        }

        let setThuHoach = new Set();
        let setBoiDuong = new Set();

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.danhSachHoa && Array.isArray(data.danhSachHoa)) {
                data.danhSachHoa.forEach(f => {
                    if (data.trangThai === 'Đã thu hoạch') {
                        setThuHoach.add(f);
                    } else if (data.trangThai === 'Chờ bồi dưỡng') {
                        setBoiDuong.add(f);
                    }
                });
            }
        });

        setThuHoach.forEach(f => setBoiDuong.delete(f));

        const currentUser = getCurrentUser();
        const isAdmin = currentUser && currentUser.role === 'admin';

        function createColumnHtml(title, hoaSet, isThuHoach) {
            const badgeBg = isThuHoach ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white';
            const cardBg = isThuHoach ? 'bg-indigo-50/40 border-indigo-200' : 'bg-amber-50/40 border-amber-200';
            const emptyText = isThuHoach ? 'Chưa có hoa thu hoạch' : 'Chưa có hoa chờ bồi dưỡng';

            if (hoaSet.size === 0) {
                return `
                    <div class="p-4 rounded-2xl border ${cardBg} h-full shadow-sm">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="text-xs font-bold ${badgeBg} px-3 py-1 rounded-full shadow-xs">${title}</span>
                            <span class="text-xs text-gray-500 font-semibold">(0 loại hoa)</span>
                        </div>
                        <p class="text-xs text-gray-400 italic">${emptyText}</p>
                    </div>
                `;
            }

            const allColors = ['Đỏ', 'Cam', 'Tím', 'Xanh dương', 'Xanh lá'];
            const grouped = {};
            hoaSet.forEach(flowerName => {
                const info = flowersData.find(f => f.name === flowerName) || { color: 'Khác', image: defaultImg };
                if (!grouped[info.color]) grouped[info.color] = [];
                grouped[info.color].push({ name: flowerName, image: info.image || defaultImg });
            });

            let columnHtml = `
                <div class="p-4 rounded-2xl border ${cardBg} space-y-4 shadow-sm h-full">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold ${badgeBg} px-3 py-1 rounded-full shadow-xs">${title}</span>
                        <span class="text-xs text-gray-600 font-semibold">(${hoaSet.size} loại hoa)</span>
                    </div>
            `;

            allColors.concat(['Khác']).forEach(color => {
                if (grouped[color] && grouped[color].length > 0) {
                    let colorTag = 'bg-red-200 text-red-950 border-red-300';
                    if (color === 'Cam') colorTag = 'bg-orange-200 text-orange-950 border-orange-300';
                    else if (color === 'Tím') colorTag = 'bg-purple-200 text-purple-950 border-purple-300';
                    else if (color === 'Xanh dương') colorTag = 'bg-sky-200 text-sky-950 border-sky-300';
                    else if (color === 'Xanh lá') colorTag = 'bg-emerald-200 text-emerald-950 border-emerald-300';
                    else if (color === 'Khác') colorTag = 'bg-gray-200 text-gray-900 border-gray-300';

                    columnHtml += `
                        <div class="space-y-1.5">
                            <div class="text-[11px] font-bold ${colorTag} inline-block px-2.5 py-0.5 rounded-lg border">
                                Phẩm nền ${color.toLowerCase()} (${grouped[color].length})
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    `;

                    grouped[color].forEach(flower => {
                        const deleteBtn = isAdmin 
                            ? `<button onclick="deleteUserFlower('${flower.name}', '${memberName}')" title="Xóa hoa này" class="text-gray-300 hover:text-red-500 p-1 rounded-lg transition text-xs flex-shrink-0">🗑️</button>` 
                            : '';

                        const moveBtn = !isThuHoach 
                            ? `<button onclick="moveToHarvest('${flower.name}', '${memberName}')" title="Chuyển sang Đã thu hoạch" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg transition text-[10px] font-bold flex-shrink-0 flex items-center gap-0.5 shadow-xs">✨ Thu hoạch</button>` 
                            : '';

                        columnHtml += `
                            <div class="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-pink-300 transition">
                                <div class="flex items-center gap-2 min-w-0">
                                    <img src="${flower.image}" class="w-9 h-9 object-cover rounded-lg border border-gray-100 shadow-xs flex-shrink-0">
                                    <span class="text-xs font-bold text-gray-800 truncate">${flower.name}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    ${moveBtn}
                                    ${deleteBtn}
                                </div>
                            </div>
                        `;
                    });

                    columnHtml += `</div></div>`;
                }
            });

            columnHtml += `</div>`;
            return columnHtml;
        }

        resultDiv.innerHTML = `
            <h4 class="font-bold text-emerald-900 mb-4 text-sm">🌸 Tổng hợp hoa sở hữu của [${memberName}]:</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>${createColumnHtml('💼 Đã thu hoạch', setThuHoach, true)}</div>
                <div>${createColumnHtml('🌱 Chờ bồi dưỡng', setBoiDuong, false)}</div>
            </div>
        `;

    } catch (error) {
        resultDiv.innerHTML = `<p class="text-sm text-red-500">Lỗi khi tải dữ liệu: ${error.message}</p>`;
    }
});

window.showMemberFlowersByName = async function(memberName) {
    const titleElem = document.getElementById('modalMemberName');
    const container = document.getElementById('modalFlowerList');
    
    if (titleElem) titleElem.innerText = `🌸 Hoa sở hữu của: ${memberName}`;
    if (container) container.innerHTML = `<p class="text-xs text-gray-500 animate-pulse">⏳ Đang tải dữ liệu...</p>`;
    
    document.getElementById('flowerDetailModal')?.classList.remove('hidden');

    try {
        const q = query(collection(db, "NhatKyHoa"), where("tenACC", "==", memberName));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-400 italic">Thành viên này chưa có hoa nào.</p>`;
            return;
        }

        let flowersMap = new Map();

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.danhSachHoa && Array.isArray(data.danhSachHoa)) {
                data.danhSachHoa.forEach(fName => {
                    const status = data.trangThai || 'Khác';
                    flowersMap.set(fName, status);
                });
            }
        });

        if (flowersMap.size === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 italic">Thành viên này chưa có hoa nào.</p>`;
            return;
        }

        let html = '';
        flowersMap.forEach((status, flowerName) => {
            const flowerInfo = flowersData.find(f => f.name === flowerName) || { image: defaultImg };
            const badgeBg = status === 'Đã thu hoạch' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800';

            html += `
                <div class="flex items-center justify-between bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                    <div class="flex items-center gap-2">
                        <img src="${flowerInfo.image}" class="w-8 h-8 rounded-lg object-cover">
                        <span class="text-xs font-bold text-gray-800">${flowerName}</span>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg}">${status}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<p class="text-xs text-red-500">Lỗi: ${e.message}</p>`;
    }
};

/* ==========================================================================
   4. TÍNH NĂNG THÊM HOA VÀO NHẬT KÝ FIREBASE & KHỞI TẠO
   ========================================================================== */

window.saveSelectedFlowers = async function() {
    const selectACC = document.getElementById('selectACC');
    const selectStatus = document.getElementById('selectStatus');
    const checkboxes = document.querySelectorAll('.flower-checkbox:checked');

    if (!selectACC || !selectStatus) return;

    const tenACC = selectACC.value;
    const trangThai = selectStatus.value;
    const danhSachHoa = Array.from(checkboxes).map(cb => cb.value);

    if (!tenACC) {
        alert("Vui lòng chọn tài khoản!");
        return;
    }

    if (danhSachHoa.length === 0) {
        alert("Vui lòng tích chọn ít nhất 1 loại hoa!");
        return;
    }

    try {
        await addDoc(collection(db, "NhatKyHoa"), {
            tenACC: tenACC,
            trangThai: trangThai,
            danhSachHoa: danhSachHoa,
            thoiGian: serverTimestamp()
        });

        alert(`🎉 Đã lưu ${danhSachHoa.length} hoa cho tài khoản [${tenACC}] thành công!`);
        
        checkboxes.forEach(cb => cb.checked = false);

        const selectMemberToView = document.getElementById('selectMemberToView');
        if (selectMemberToView && selectMemberToView.value === tenACC) {
            selectMemberToView.dispatchEvent(new Event('change'));
        }
    } catch (e) {
        alert("Lỗi khi lưu nhật ký hoa: " + e.message);
    }
};

document.getElementById('selectColor')?.addEventListener('change', renderFlowers);
document.getElementById('inputSearch')?.addEventListener('input', renderFlowers);

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initMembersFromFirebase();
    initFlowersFromFirebase();
});
