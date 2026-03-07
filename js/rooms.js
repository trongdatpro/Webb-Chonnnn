const fetchJSONP = (url) => new Promise((resolve) => {
    const cbName = 'gvizCb_' + Date.now() + Math.floor(Math.random() * 10000);
    const s = document.createElement('script');
    const timeout = setTimeout(() => {
        delete window[cbName];
        resolve(null);
    }, 5000);
    window[cbName] = (res) => {
        clearTimeout(timeout);
        delete window[cbName];
        if (s.parentNode) document.head.removeChild(s);
        resolve(res);
    };
    s.src = url + (url.includes('?') ? '&' : '?') + 'tqx=out:json;responseHandler:' + cbName;
    document.head.appendChild(s);
});

// Helper functions moved to global scope for reliable access
const parseLocal = (dateStr) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d);
};

const formatDateObj = (d) => `${d.getDate()}/${d.getMonth() + 1}`;

function getStr(d) {
    const tz = d.getTimezoneOffset() * 60000;
    return (new Date(d - tz)).toISOString().split('T')[0];
}

function renderCurrency(num) {
    return new Intl.NumberFormat('vi-VN').format(num);
}

// Global variables to be filled after DOM loads
let bookingData, checkinDate, checkoutDate, adults, childrenCount, childrenAgesArr;
let galleryData = [];
let currentGallery = [];
let currentMediaIndex = 0;
let dynamicPolicyData = [];
let isCheckingPolicy = false;
let selectedRooms = [];

document.addEventListener('DOMContentLoaded', async () => {
    const debugEl = document.getElementById('debug-console');
    const logs = [];
    const uiLog = (...args) => {
        if (!debugEl) return;
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        debugEl.innerHTML = logs.slice(-10).join('<br/>');
    };
    window.uiLog = uiLog; // Export for global use if needed
    uiLog("Init Room Script...");

    const bookingDataStr = sessionStorage.getItem('chonVillageBooking');
    if (!bookingDataStr) {
        window.location.href = 'index.html';
        return;
    }
    bookingData = JSON.parse(bookingDataStr);
    checkinDate = parseLocal(bookingData.checkin);
    checkoutDate = parseLocal(bookingData.checkout);
    adults = parseInt(bookingData.adults);
    childrenCount = parseInt(bookingData.children);
    childrenAgesArr = Array.isArray(bookingData.childrenAges) ? bookingData.childrenAges.map(a => parseInt(a)) : [];

    const summaryBar = document.getElementById('summary-bar');
    const changeDateBtn = document.getElementById('change-date-btn');
    const headerTitle = document.getElementById('header-title');
    const headerChangeDateBtn = document.getElementById('header-change-date-btn');
    const editModal = document.getElementById('edit-booking-modal');
    const editContent = document.getElementById('edit-booking-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalCheckin = document.getElementById('modal-checkin');
    const modalCheckout = document.getElementById('modal-checkout');
    const modalAdultCount = document.getElementById('modal-adult-count');
    const modalChildCount = document.getElementById('modal-child-count');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalChildrenAgesContainer = document.getElementById('modal-children-ages-container');
    const warningEl = document.getElementById('modal-booking-warning');

    const updateModalChildAgeFields = (count, currentAges = []) => {
        if (!modalChildrenAgesContainer) return;
        const currentCount = modalChildrenAgesContainer.children.length;
        if (count > currentCount) {
            for (let i = currentCount; i < count; i++) {
                const select = document.createElement('select');
                select.className = "text-[10px] text-[#c8a96a] bg-transparent border-t-0 border-x-0 border-b border-[#c8a96a]/20 p-1 pr-6 focus:ring-0 uppercase cursor-pointer outline-none appearance-none";
                select.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23C8A96A'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;
                select.style.backgroundRepeat = "no-repeat";
                select.style.backgroundPosition = "right 2px center";
                select.style.backgroundSize = "12px";
                const ageToSet = currentAges[i] || "";
                select.innerHTML = `
                    <option value="" disabled selected hidden>Tuổi bé ${i + 1}</option>
                    ${Array.from({ length: 12 }, (_, k) => `<option value="${k + 1}" ${k + 1 == ageToSet ? 'selected' : ''}>${k + 1} tuổi</option>`).join('')}
                `;
                modalChildrenAgesContainer.appendChild(select);
            }
        } else {
            while (modalChildrenAgesContainer.children.length > count) {
                modalChildrenAgesContainer.removeChild(modalChildrenAgesContainer.lastChild);
            }
        }
    };

    const openEditModal = () => {
        if (!editModal || !editContent) return;
        modalCheckin.value = bookingData.checkin;
        modalCheckout.value = bookingData.checkout;
        modalAdultCount.textContent = bookingData.adults;
        modalChildCount.textContent = bookingData.children;
        updateModalChildAgeFields(bookingData.children, bookingData.childrenAges || []);
        editModal.classList.remove('hidden');
        editModal.classList.add('flex');
        document.body.classList.add('modal-open');
        setTimeout(() => {
            editModal.classList.add('opacity-100');
            editContent.classList.remove('translate-y-full');
        }, 10);
    };

    const closeEditModal = () => {
        editModal.classList.remove('opacity-100');
        editContent.classList.add('translate-y-full');
        setTimeout(() => {
            editModal.classList.add('hidden');
            editModal.classList.remove('flex');
            document.body.classList.remove('modal-open');
        }, 300);
    };

    if (changeDateBtn) changeDateBtn.onclick = openEditModal;
    if (headerChangeDateBtn) headerChangeDateBtn.onclick = openEditModal;
    if (closeModalBtn) closeModalBtn.onclick = closeEditModal;

    const updateModalGuests = (type, delta) => {
        if (type === 'adult') {
            let val = parseInt(modalAdultCount.textContent) + delta;
            if (val < 1) val = 1;
            modalAdultCount.textContent = val;
        } else {
            let val = parseInt(modalChildCount.textContent) + delta;
            if (val < 0) val = 0;
            modalChildCount.textContent = val;
            updateModalChildAgeFields(val);
        }
    };

    document.getElementById('modal-plus-adult').onclick = () => updateModalGuests('adult', 1);
    document.getElementById('modal-minus-adult').onclick = () => updateModalGuests('adult', -1);
    document.getElementById('modal-plus-child').onclick = () => updateModalGuests('child', 1);
    document.getElementById('modal-minus-child').onclick = () => updateModalGuests('child', -1);

    if (modalSaveBtn) {
        modalSaveBtn.onclick = () => {
            const newCheckin = modalCheckin.value;
            const newCheckout = modalCheckout.value;
            const d1 = new Date(newCheckin);
            const d2 = new Date(newCheckout);
            const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
            if (nights < 1) { alert("Ngày trả phòng phải sau ngày nhận phòng."); return; }
            if (nights < 2) {
                warningEl.textContent = "Chồn ưu tiên nhận đặt phòng từ 2 đêm. Với đặt phòng 1 đêm, vui lòng liên hệ Zalo.";
                warningEl.classList.add('active', 'animate-shake');
                setTimeout(() => warningEl.classList.remove('animate-shake'), 500);
                return;
            }
            let newChildrenAges = [];
            const count = parseInt(modalChildCount.textContent);
            if (count > 0) {
                const selects = modalChildrenAgesContainer.querySelectorAll('select');
                for (let s of selects) {
                    if (!s.value) { alert("Vui lòng chọn đầy đủ độ tuổi của các bé."); return; }
                    newChildrenAges.push(parseInt(s.value));
                }
            }
            const newBooking = {
                ...bookingData,
                checkin: newCheckin,
                checkout: newCheckout,
                adults: parseInt(modalAdultCount.textContent),
                children: count,
                childrenAges: newChildrenAges
            };
            sessionStorage.setItem('chonVillageBooking', JSON.stringify(newBooking));
            location.reload();
        };
    }

    if (document.getElementById('summary-dates')) {
        document.getElementById('summary-dates').textContent = `${formatDateObj(checkinDate)} - ${formatDateObj(checkoutDate)}`;
    }
    let summaryGuestsStr = `${adults} Người lớn`;
    if (childrenCount > 0) summaryGuestsStr += `, ${childrenCount} Trẻ em`;
    if (document.getElementById('summary-guests')) {
        document.getElementById('summary-guests').textContent = summaryGuestsStr;
    }

    const roomsContainer = document.getElementById('rooms-container');
    roomsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center space-y-4 my-16 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
            <span class="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></span>
            <p class="text-center text-primary font-display italic text-lg">Chồn is preparing the room...</p>
        </div>
    `;

    const localRooms = [
        { id: "Pink_Room", name: "Pink Room", area: "25m²", amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Quạt", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"], special: null, img: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=600&auto=format&fit=crop" },
        { id: "Green_Room", name: "Green Room", area: "25m²", amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Quạt", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"], special: null, img: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=600&auto=format&fit=crop" },
        { id: "White_Room", name: "White Room", area: "33m²", amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Quạt", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"], special: "Có sân vườn, bếp riêng", img: "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=600&auto=format&fit=crop" }
    ];

    const URL_PRICINGS = [
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=2054490170',
        'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=1120714568'
    ];
    const URL_SCHEDULES = [
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=1441677072',
        'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=403758369'
    ];
    const POLICY_API = "https://docs.google.com/spreadsheets/d/1jszKQ6uZOqk-MD0vy--9NqISDuUDau6-gyx-KO1wck4/gviz/tq?gid=1382126270";
    const GALLERY_API = "https://docs.google.com/spreadsheets/d/1jszKQ6uZOqk-MD0vy--9NqISDuUDau6-gyx-KO1wck4/gviz/tq?gid=932135485";

    const fixDriveUrl = (url, isVideo = false) => {
        if (!url) return "";
        if (url.includes('drive.google.com')) {
            const idMatch = url.match(/[-\w]{25,}/);
            if (idMatch) return isVideo ? `https://drive.google.com/file/d/${idMatch[0]}/preview` : `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
        }
        return url;
    };

    async function syncGallery() {
        try {
            const res = await fetchJSONP(GALLERY_API + "&t=" + Date.now());
            if (res && res.table && res.table.rows) {
                galleryData = res.table.rows.map(row => ({
                    roomId: row.c[0] ? String(row.c[0].v).trim() : "",
                    type: row.c[1] ? String(row.c[1].v).trim().toLowerCase() : "image",
                    url: row.c[2] ? row.c[2].v : "",
                    order: row.c[3] ? parseInt(row.c[3].v) : 99
                })).filter(item => item.roomId && item.url);
                galleryData.forEach(item => { item.url = fixDriveUrl(item.url, item.type === 'video'); });
                uiLog("Gallery synced:", galleryData.length);
            }
        } catch (e) { console.warn("Gallery sync failed:", e); }
    }

    async function syncPolicy() {
        try {
            const res = await fetchJSONP(POLICY_API + "&t=" + Date.now());
            if (res && res.table && res.table.rows) {
                dynamicPolicyData = res.table.rows.map(row => ({
                    Month_ID: row.c[0] ? row.c[0].v : null,
                    Min_Days_Lead: row.c[2] ? row.c[2].v : 7
                }));
            }
        } catch (e) { console.error("Policy sync failed:", e); }
    }

    try {
        await Promise.all([syncPolicy(), syncGallery()]);
        const pricingPromises = URL_PRICINGS.map(url => fetchJSONP(url));
        const schedulePromises = URL_SCHEDULES.map(url => fetchJSONP(url));
        const allResponses = await Promise.all([...pricingPromises, ...schedulePromises]);
        const pricingResponses = allResponses.slice(0, URL_PRICINGS.length);
        const scheduleResponses = allResponses.slice(URL_PRICINGS.length);
        let scheduleData = {};
        const pricingData = {};
        const getPrice = (cell) => {
            if (!cell) return 1000000;
            if (cell.v !== undefined && typeof cell.v === 'number') return cell.v;
            if (cell.f) return parseInt(cell.f.replace(/[^\d]/g, ''));
            return 1000000;
        };
        scheduleResponses.forEach((scheduleRes, index) => {
            if (!scheduleRes || !scheduleRes.table || !scheduleRes.table.rows) return;
            let monthKey = null;
            scheduleRes.table.rows.forEach(row => {
                if (!row.c || row.c.length < 3) return;
                const dateStr = row.c[0] ? row.c[0].f || row.c[0].v : null;
                const status = row.c[2] ? row.c[2].v : null;
                const rid = row.c[1] ? row.c[1].v : null;
                if (!dateStr || !rid) return;
                const cleanRid = String(rid).trim();
                if (!monthKey) monthKey = dateStr.substring(0, 7);
                if (!scheduleData[cleanRid]) scheduleData[cleanRid] = {};
                scheduleData[cleanRid][dateStr] = String(status).trim();
            });
            if (monthKey && pricingResponses[index] && pricingResponses[index].table) {
                pricingData[monthKey] = {};
                pricingResponses[index].table.rows.forEach(row => {
                    const rId = row.c[0] ? String(row.c[0].v).trim() : null;
                    if (!rId) return;
                    pricingData[monthKey][rId] = { weekday: getPrice(row.c[4]), weekend: getPrice(row.c[5]) };
                });
            }
        });
        const datesToStay = [];
        let curr = new Date(checkinDate);
        while (curr < checkoutDate) { datesToStay.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
        const isUnder6 = childrenAgesArr.some(age => age < 6);
        const allowedRooms = localRooms;
        const roomsToRender = allowedRooms.map(room => {
            const thumb = galleryData.find(m => m.roomId.toLowerCase() === room.id.toLowerCase() && m.order === 1);
            return { ...room, img: thumb ? thumb.url : room.img };
        });
        roomsContainer.innerHTML = '';
        renderRooms(roomsToRender, scheduleData, pricingData, datesToStay);
    } catch (err) {
        uiLog("Error:", err.message);
        roomsContainer.innerHTML = '<p class="text-center text-amber-600 p-3">Lỗi kết nối dữ liệu. Vui lòng tải lại trang.</p>';
    }

    const galleryModal = document.getElementById('gallery-modal');
    const galleryContent = document.getElementById('gallery-content');
    const galleryCounter = document.getElementById('gallery-counter');
    const galleryDots = document.getElementById('gallery-dots');

    function openGallery(roomId) {
        currentGallery = galleryData.filter(m => m.roomId.toLowerCase() === roomId.toLowerCase()).sort((a, b) => a.order - b.order);
        if (currentGallery.length === 0) return;
        currentMediaIndex = 0;
        if (galleryModal) {
            galleryModal.classList.remove('hidden');
            galleryModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
            showMedia(0);
        }
    }
    function closeGallery() {
        if (galleryModal) {
            galleryModal.classList.add('hidden');
            galleryModal.classList.remove('flex');
            document.body.style.overflow = '';
            if (galleryContent) galleryContent.innerHTML = '';
        }
    }
    function showMedia(index) {
        if (!galleryContent || currentGallery.length === 0) return;
        if (index < 0) index = currentGallery.length - 1;
        if (index >= currentGallery.length) index = 0;
        currentMediaIndex = index;
        galleryContent.style.opacity = '0';
        setTimeout(() => {
            const item = currentGallery[index];
            if (item.type === 'video') {
                galleryContent.innerHTML = `<iframe src="${item.url}" class="w-full h-full rounded shadow-2xl" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
            } else {
                galleryContent.innerHTML = `<img src="${item.url}" class="shadow-2xl" loading="lazy" />`;
            }
            galleryContent.style.opacity = '1';
            galleryCounter.textContent = `${index + 1} / ${currentGallery.length}`;
            if (galleryDots) galleryDots.innerHTML = currentGallery.map((_, i) => `<div class="h-1 transition-all duration-300 ${i === currentMediaIndex ? 'w-6 bg-primary' : 'w-2 bg-white/30'} rounded-full"></div>`).join('');
        }, 200);
    }

    if (galleryModal) {
        document.getElementById('close-gallery-btn').onclick = closeGallery;
        document.getElementById('prev-gallery-btn').onclick = () => showMedia(currentMediaIndex - 1);
        document.getElementById('next-gallery-btn').onclick = () => showMedia(currentMediaIndex + 1);
        let touchStartX = 0;
        galleryModal.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
        galleryModal.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) showMedia(currentMediaIndex + 1);
            if (touchEndX - touchStartX > 50) showMedia(currentMediaIndex - 1);
        });
        galleryModal.onclick = (e) => { if (e.target === galleryModal || e.target === galleryContent) closeGallery(); };
    }

    window.openGallery = openGallery;
    setTimeout(loadReviews, 500);
});


function renderWaitlist() {
    const container = document.getElementById('waitlist-items');
    const footer = document.getElementById('waitlist-footer');
    if (!container || !footer) return;
    document.querySelectorAll('button[data-room-id]').forEach(btn => {
        const isSelected = selectedRooms.some(r => r.id === btn.getAttribute('data-room-id'));
        if (isSelected) { btn.innerHTML = '<span>Đã</span><span>chọn</span>'; btn.classList.add('bg-[#C8A96A]', 'text-graphite', 'pointer-events-none'); }
        else { btn.innerHTML = '<span>Chọn</span><span>Phòng</span>'; btn.classList.remove('bg-[#C8A96A]', 'text-graphite', 'pointer-events-none'); btn.classList.add('bg-primary', 'text-white'); }
    });
    if (selectedRooms.length === 0) { footer.classList.add('translate-y-full'); return; }
    footer.classList.remove('translate-y-full');
    container.innerHTML = selectedRooms.map((room, index) => `
        <div id="waitlist-item-${room.id}" class="relative shrink-0">
            <div class="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary bg-white">
                <img src="${room.img}" class="w-full h-full object-cover">
            </div>
            <button onclick="removeFromWaitlist(${index})" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full size-5 flex items-center justify-center shadow-md active:scale-90 transition-transform z-10">
                <span class="material-symbols-outlined text-[12px] font-bold">close</span>
            </button>
        </div>
    `).join('');
}
window.removeFromWaitlist = (index) => { selectedRooms.splice(index, 1); renderWaitlist(); };
function animateFly(startEl, targetEl, imgSrc, callback) {
    const flyContainer = document.getElementById('fly-container');
    if (!flyContainer || !startEl || !targetEl) { callback(); return; }
    const startRect = startEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const flyer = document.createElement('div');
    flyer.className = "fixed z-[1000] pointer-events-none transition-all duration-700 ease-in-out";
    flyer.style.left = startRect.left + 'px';
    flyer.style.top = startRect.top + 'px';
    flyer.style.width = startRect.width + 'px';
    flyer.style.height = startRect.height + 'px';
    flyer.innerHTML = `<img src="${imgSrc}" class="w-full h-full object-cover rounded-lg shadow-2xl border-2 border-primary">`;
    flyContainer.appendChild(flyer);
    requestAnimationFrame(() => {
        flyer.style.left = targetRect.left + 'px';
        flyer.style.top = targetRect.top + 'px';
        flyer.style.width = targetRect.width + 'px';
        flyer.style.height = targetRect.height + 'px';
        flyer.style.opacity = '0.7';
    });
    setTimeout(() => { flyer.remove(); callback(); }, 750);
}
window.selectRoom = (btn, roomData) => {
    if (selectedRooms.some(r => r.id === roomData.id)) return;
    btn.innerHTML = '<span>Đã</span><span>chọn</span>';
    btn.classList.add('bg-[#C8A96A]', 'text-graphite', 'pointer-events-none');
    selectedRooms.push(roomData);
    renderWaitlist();
    const targetItem = document.getElementById(`waitlist-item-${roomData.id}`);
    const imgId = `img-${roomData.id}`;
    const imgEl = document.getElementById(imgId);
    if (imgEl && targetItem) {
        targetItem.style.opacity = '0';
        animateFly(imgEl, targetItem, roomData.img, () => {
            targetItem.style.opacity = '1';
            targetItem.classList.add('animate-pop');
        });
    }
};

const REVIEWS_API_URL = "https://script.google.com/macros/s/AKfycbyKwYdqY1Xd762VehUWY8wCKCdek6rc0lASlrUfZVh33B4X_ozjWSxqDUt3PIz27cg/exec";
const MOCK_REVIEWS = [{ name: "Linhh Trúc", info: "Local Guide", rating: "5/5", time: "3 tuần trước", content: "Tuyệt vời!" }];
async function loadReviews() {
    try {
        const res = await fetch(REVIEWS_API_URL);
        const data = await res.json();
        if (!data || data.error) renderReviews(MOCK_REVIEWS);
        else renderReviews(data.map(row => ({ name: row.name || "Khách", rating: row.rating || "5/5", content: row.content || "", time: "Gần đây" })));
    } catch (e) { renderReviews(MOCK_REVIEWS); }
}
function renderReviews(reviews) {
    const slider = document.getElementById('reviews-slider');
    if (!slider) return;
    slider.innerHTML = reviews.map(r => `<div class="snap-start shrink-0 w-[85vw] sm:w-[350px] bg-white rounded-2xl p-5 shadow-sm border border-primary/20">
        <h4 class="font-bold text-graphite">${r.name}</h4><p class="text-slate-600 italic text-sm mt-2">"${r.content}"</p>
    </div>`).join('');
}

function renderRooms(roomsList, scheduleData, pricingData, datesToStay) {
    const roomsContainer = document.getElementById('rooms-container');
    if (!roomsContainer) return;
    if (!datesToStay || datesToStay.length === 0) {
        roomsContainer.innerHTML = '<div class="text-center py-20 px-4"><p class="text-xl font-display text-primary mb-4">Dữ liệu ngày không hợp lệ. Vui lòng thử lại.</p></div>';
        return;
    }
    roomsList.forEach(room => {
        let isAvailable = true;
        let firstNightWeekday = 0;
        let firstNightWeekend = 0;
        let finalPriceToPass = 0;
        for (const date of datesToStay) {
            const dateStr = getStr(date);
            if (scheduleData[room.id] && scheduleData[room.id][dateStr] === 'Booked') isAvailable = false;
        }
        if (isAvailable && datesToStay.length === 1) {
            const checkin = datesToStay[0];
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const daysLead = Math.ceil((checkin - today) / (1000 * 60 * 60 * 24));
            const monthId = checkin.getMonth() + 1;
            const policy = dynamicPolicyData.find(p => Number(p.Month_ID) === monthId);
            const minDaysLead = policy ? Number(policy.Min_Days_Lead) : 7;
            const prevDate = new Date(checkin); prevDate.setDate(prevDate.getDate() - 1);
            const nextDate = new Date(checkin); nextDate.setDate(nextDate.getDate() + 1);
            const isGap = (scheduleData[room.id] && scheduleData[room.id][getStr(prevDate)] === 'Booked' && scheduleData[room.id][getStr(nextDate)] === 'Booked');
            if (daysLead > minDaysLead && !isGap) isAvailable = false;
        }
        if (!isAvailable) return;
        const firstDate = datesToStay[0];
        const dateStr = getStr(firstDate);
        const isWeekend = ([5, 6, 0].includes(firstDate.getDay()));
        const monthKey = dateStr.substring(0, 7);
        const currentMonthPricing = pricingData[monthKey] || {};
        if (currentMonthPricing[room.id]) {
            firstNightWeekday = currentMonthPricing[room.id].weekday;
            firstNightWeekend = currentMonthPricing[room.id].weekend;
        } else {
            firstNightWeekday = 800000; firstNightWeekend = 1000000;
        }
        finalPriceToPass = isWeekend ? firstNightWeekend : firstNightWeekday;
        const roomEl = document.createElement('div');
        roomEl.className = "room-card opacity-0 translate-y-4 animate-[fadeInUp_0.8s_ease-out_forwards]";
        roomEl.innerHTML = `
            <div class="bg-ivory/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-primary/10 group h-full flex flex-col">
                <div class="relative h-64 sm:h-72 overflow-hidden cursor-pointer" onclick="openGallery('${room.id}')">
                    <img id="img-${room.id}" src="${room.img}" alt="${room.name}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110">
                    <div class="absolute top-4 left-4 flex flex-col gap-2">
                        <span class="bg-white/90 backdrop-blur-md text-primary px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-sm border border-primary/20">${room.area}</span>
                        ${room.special ? `<span class="bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-sm">${room.special}</span>` : ''}
                    </div>
                </div>
                <div class="p-6 flex flex-col flex-grow">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-2xl font-display text-graphite">${room.name}</h3>
                        <div class="text-right">
                            <span class="text-primary font-bold text-xl">${renderCurrency(finalPriceToPass)}</span>
                            <span class="text-[10px] text-slate-400 block uppercase tracking-tighter">VNĐ / đêm</span>
                        </div>
                    </div>
                    <ul class="space-y-2 mb-8 flex-grow">
                        ${room.amenities.map(a => `<li class="flex items-center gap-2 text-slate-600 text-[13px]"><span class="material-symbols-outlined text-primary text-[16px]">check_circle</span>${a}</li>`).join('')}
                    </ul>
                    <button data-room-id="${room.id}" onclick="selectRoom(this, {id: '${room.id}', name: '${room.name}', price: ${finalPriceToPass}, img: '${room.img}'})" class="w-full bg-primary text-white font-header uppercase tracking-widest py-3 rounded-xl transition-all duration-300 hover:bg-[#C8A96A] hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-3">
                        <span>Chọn Phòng</span>
                    </button>
                </div>
            </div>
        `;
        roomsContainer.appendChild(roomEl);
    });
    if (roomsContainer.children.length === 0) {
        roomsContainer.innerHTML = '<div class="text-center py-20 px-4 opacity-0 animate-[fadeIn_1s_ease-out_forwards]"><p class="text-2xl font-display text-primary mb-4">Ngày mà bạn chọn đã hết phòng, xin hãy đổi ngày khác.</p></div>';
    }
}
