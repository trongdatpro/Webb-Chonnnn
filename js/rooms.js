const fetchJSONP = (url) => new Promise((resolve) => {
    const cbName = 'gvizCb_' + Date.now() + Math.floor(Math.random() * 10000);
    const s = document.createElement('script');
    const timeout = setTimeout(() => {
        delete window[cbName];
        if (s.parentNode) document.head.removeChild(s);
        console.warn("JSONP Timeout:", url);
        resolve(null);
    }, 8000);
    window[cbName] = (res) => {
        clearTimeout(timeout);
        delete window[cbName];
        if (s.parentNode) document.head.removeChild(s);
        resolve(res);
    };
    s.src = url + (url.includes('?') ? '&' : '?') + 'tqx=out:json;responseHandler:' + cbName;
    document.head.appendChild(s);
});

const parseLocal = (dateStr) => {
    if (!dateStr) return null;
    try {
        const [y, m, d] = dateStr.split('-');
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
    } catch (e) { return null; }
};

const formatDateObj = (d) => {
    if (!d || isNaN(d.getTime())) return "??/??";
    return `${d.getDate()}/${d.getMonth() + 1}`;
};

function getStr(d) {
    if (!d || isNaN(d.getTime())) return "";
    try {
        const tz = d.getTimezoneOffset() * 60000;
        const localDt = new Date(d - tz);
        return localDt.toISOString().split('T')[0];
    } catch (e) { return ""; }
}

function renderCurrency(num) {
    return new Intl.NumberFormat('vi-VN').format(num);
}

let bookingData = null;
let checkinDate = null;
let checkoutDate = null;
let adults = 2;
let childrenCount = 0;
let childrenAgesArr = [];
let galleryData = [];
let currentGallery = [];
let currentMediaIndex = 0;
let dynamicPolicyData = [];
let selectedRooms = [];

document.addEventListener('DOMContentLoaded', async () => {
    const debugEl = document.getElementById('debug-console');
    const uiLog = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        console.log("[Rooms]", msg);
        if (debugEl) {
            const p = document.createElement('div');
            p.textContent = `> ${msg}`;
            debugEl.appendChild(p);
            if (debugEl.children.length > 5) debugEl.removeChild(debugEl.firstChild);
        }
    };
    window.uiLog = uiLog;

    // Scroll Logic
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        const decorTop = document.getElementById('header-decor-top');
        const decorBottom = document.getElementById('header-decor-bottom');
        const headerBtn = document.getElementById('header-change-date-btn');
        const container = document.getElementById('header-title-container');

        if (window.scrollY > 30) {
            header.style.height = '80px';
            if (decorTop) decorTop.style.opacity = '1';
            if (decorBottom) decorBottom.style.opacity = '1';
            if (headerBtn) {
                headerBtn.style.opacity = '1';
                headerBtn.style.pointerEvents = 'auto';
                headerBtn.style.transform = 'translateY(-50%) scale(1)';
            }
            if (container) {
                container.style.left = '16px';
                container.style.transform = 'translateY(-50%) translateX(0)';
            }
        } else {
            header.style.height = '60px';
            if (decorTop) decorTop.style.opacity = '0';
            if (decorBottom) decorBottom.style.opacity = '0';
            if (headerBtn) {
                headerBtn.style.opacity = '0';
                headerBtn.style.pointerEvents = 'none';
                headerBtn.style.transform = 'translateY(-50%) scale(0.9)';
            }
            if (container) {
                container.style.left = '50%';
                container.style.transform = 'translateY(-50%) translateX(-50%)';
            }
        }
    });

    const bookingDataStr = sessionStorage.getItem('chonVillageBooking');
    if (!bookingDataStr) { window.location.href = 'index.html'; return; }

    try {
        bookingData = JSON.parse(bookingDataStr);
        checkinDate = parseLocal(bookingData.checkin);
        checkoutDate = parseLocal(bookingData.checkout);
        adults = parseInt(bookingData.adults) || 2;
        childrenCount = parseInt(bookingData.children) || 0;
        childrenAgesArr = Array.isArray(bookingData.childrenAges) ? bookingData.childrenAges.map(a => parseInt(a)) : [];
    } catch (e) { window.location.href = 'index.html'; return; }

    if (!checkinDate || !checkoutDate) { window.location.href = 'index.html'; return; }

    const summaryDates = document.getElementById('summary-dates');
    const summaryGuests = document.getElementById('summary-guests');
    const changeDateBtn = document.getElementById('change-date-btn');
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

    if (summaryDates) summaryDates.textContent = `${formatDateObj(checkinDate)} - ${formatDateObj(checkoutDate)}`;
    let gStr = `${adults} Người lớn`;
    if (childrenCount > 0) gStr += `, ${childrenCount} Trẻ em`;
    if (summaryGuests) summaryGuests.textContent = gStr;

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
        modalAdultCount.textContent = adults;
        modalChildCount.textContent = childrenCount;
        updateModalChildAgeFields(childrenCount, childrenAgesArr);
        editModal.classList.remove('hidden');
        editModal.classList.add('flex');
        document.body.classList.add('modal-open');
        setTimeout(() => { editModal.classList.add('opacity-100'); editContent.classList.remove('translate-y-full'); }, 10);
    };

    const closeEditModal = () => {
        if (!editModal || !editContent) return;
        editModal.classList.remove('opacity-100');
        editContent.classList.add('translate-y-full');
        setTimeout(() => { editModal.classList.add('hidden'); editModal.classList.remove('flex'); document.body.classList.remove('modal-open'); }, 300);
    };

    if (changeDateBtn) changeDateBtn.onclick = openEditModal;
    if (headerChangeDateBtn) headerChangeDateBtn.onclick = openEditModal;
    if (closeModalBtn) closeModalBtn.onclick = closeEditModal;

    document.getElementById('modal-plus-adult').onclick = () => {
        let val = parseInt(modalAdultCount.textContent) + 1;
        modalAdultCount.textContent = val;
    };
    document.getElementById('modal-minus-adult').onclick = () => {
        let val = parseInt(modalAdultCount.textContent) - 1;
        if (val < 1) val = 1;
        modalAdultCount.textContent = val;
    };
    document.getElementById('modal-plus-child').onclick = () => {
        let val = parseInt(modalChildCount.textContent) + 1;
        modalChildCount.textContent = val;
        updateModalChildAgeFields(val);
    };
    document.getElementById('modal-minus-child').onclick = () => {
        let val = parseInt(modalChildCount.textContent) - 1;
        if (val < 0) val = 0;
        modalChildCount.textContent = val;
        updateModalChildAgeFields(val);
    };

    if (modalSaveBtn) {
        modalSaveBtn.onclick = () => {
            const newCheckin = modalCheckin.value;
            const newCheckout = modalCheckout.value;
            const d1 = new Date(newCheckin);
            const d2 = new Date(newCheckout);
            const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
            if (nights < 1) { alert("Ngày trả phòng phải sau ngày nhận phòng."); return; }
            if (nights < 2) {
                if (warningEl) {
                    warningEl.textContent = "Chồn ưu tiên nhận đặt phòng từ 2 đêm. Với đặt phòng 1 đêm, vui lòng liên hệ Zalo.";
                    warningEl.classList.add('active', 'animate-shake');
                    setTimeout(() => warningEl.classList.remove('animate-shake'), 500);
                } else { alert("Chồn ưu tiên nhận đặt phòng từ 2 đêm."); }
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

    const roomsContainer = document.getElementById('rooms-container');
    if (roomsContainer) {
        roomsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-4 my-16">
                <span class="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></span>
                <p class="text-center text-primary font-display italic text-lg">Chồn is preparing the room...</p>
            </div>
        `;
    }

    const localRooms = [
        { id: "Pink_Room", name: "Pink Room", area: "25m²", amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Máy lạnh", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"], special: null, img: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=600&auto=format&fit=crop" },
        { id: "Green_Room", name: "Green Room", area: "25m²", amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Máy lạnh", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"], special: null, img: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=600&auto=format&fit=crop" },
        { id: "White_Room", name: "White Room", area: "33m²", amenities: ["TV 55 inch kết nối Netflix, YouTube,...", "Máy lạnh", "Máy sấy", "Bàn trang điểm", "Giường 1m8", "Toilet riêng có bồn tắm", "Nước suối miễn phí", "Đồ dùng vệ sinh cá nhân", "Bàn ủi hơi nước"], special: "Có sân vườn, bếp riêng", img: "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=600&auto=format&fit=crop" }
    ];

    const POLICY_API = "https://docs.google.com/spreadsheets/d/1jszKQ6uZOqk-MD0vy--9NqISDuUDau6-gyx-KO1wck4/gviz/tq?gid=1382126270";
    const GALLERY_API = "https://docs.google.com/spreadsheets/d/1jszKQ6uZOqk-MD0vy--9NqISDuUDau6-gyx-KO1wck4/gviz/tq?gid=932135485";
    const URL_PRICINGS = ['https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=2054490170', 'https://docs.google.com/spreadsheets/d/1XluSzDsFCMCbgQHDjJTF7_mX7D4isUI9QbtwVCQXCbY/gviz/tq?gid=1120714568'];
    const URL_SCHEDULES = ['https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=1441677072', 'https://docs.google.com/spreadsheets/d/1A-DGSU4oPx74xdzloBQW4ekyhcjATwgh6dKf0Ky0XKg/gviz/tq?gid=403758369'];

    const fixDriveUrl = (url, isVideo = false) => {
        if (url && url.includes('drive.google.com')) {
            const id = url.match(/[-\w]{25,}/);
            if (id) return isVideo ? `https://drive.google.com/file/d/${id[0]}/preview` : `https://lh3.googleusercontent.com/d/${id[0]}`;
        }
        return url;
    };

    try {
        const [pRes, gRes] = await Promise.all([fetchJSONP(POLICY_API), fetchJSONP(GALLERY_API)]);
        if (pRes) dynamicPolicyData = pRes.table.rows.map(r => ({ Month_ID: r.c[0]?.v, Min_Days_Lead: r.c[2]?.v || 7 }));
        if (gRes) {
            galleryData = gRes.table.rows.map(r => ({ roomId: String(r.c[0]?.v).trim(), type: String(r.c[1]?.v).toLowerCase(), url: fixDriveUrl(r.c[2]?.v, String(r.c[1]?.v).toLowerCase() === 'video'), order: parseInt(r.c[3]?.v) || 99 })).filter(i => i.roomId && i.url);
        }

        const pricingRes = await Promise.all(URL_PRICINGS.map(u => fetchJSONP(u)));
        const scheduleRes = await Promise.all(URL_SCHEDULES.map(u => fetchJSONP(u)));

        let scheduleData = {}, pricingData = {};
        const getPrice = (cell) => cell?.v || parseInt(cell?.f?.replace(/[^\d]/g, '')) || 1000000;

        scheduleRes.forEach((res, i) => {
            if (!res?.table?.rows) return;
            let mK = null;
            res.table.rows.forEach(r => {
                const dv = r.c[0]?.f || r.c[0]?.v, rid = String(r.c[1]?.v).trim(), st = String(r.c[2]?.v).trim();
                if (!dv || !rid) return;
                if (!mK) mK = String(dv).substring(0, 7);
                if (!scheduleData[rid]) scheduleData[rid] = {};
                scheduleData[rid][dv] = st;
            });
            if (mK && pricingRes[i]?.table?.rows) {
                pricingData[mK] = {};
                pricingRes[i].table.rows.forEach(pr => {
                    const rid = String(pr.c[0]?.v).trim();
                    if (rid) pricingData[mK][rid] = { weekday: getPrice(pr.c[4]), weekend: getPrice(pr.c[5]) };
                });
            }
        });

        const datesToStay = [];
        let curr = new Date(checkinDate);
        while (curr < checkoutDate) { datesToStay.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }

        const roomsToRender = localRooms.map(r => {
            const thumb = galleryData.find(m => m.roomId.toLowerCase() === r.id.toLowerCase() && m.order === 1);
            return { ...r, img: thumb ? thumb.url : r.img };
        });

        if (roomsContainer) roomsContainer.innerHTML = '';
        renderRooms(roomsToRender, scheduleData, pricingData, datesToStay);

        // Intersection Observer
        const ob = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); ob.unobserve(e.target); } }), { threshold: 0.1 });
        document.querySelectorAll('.scroll-animate-card').forEach(c => ob.observe(c));

    } catch (err) {
        uiLog("Fatal Error:", err.message);
        if (roomsContainer) roomsContainer.innerHTML = `<p class='text-center text-amber-600 my-10'>Lỗi dữ liệu. Vui lòng thử lại.</p>`;
    }

    const galleryModal = document.getElementById('gallery-modal');
    const galleryContent = document.getElementById('gallery-content');
    const galleryCounter = document.getElementById('gallery-counter');
    const galleryDots = document.getElementById('gallery-dots');

    window.openGallery = (roomId) => {
        currentGallery = galleryData.filter(m => m.roomId.toLowerCase() === roomId.toLowerCase()).sort((a, b) => a.order - b.order);
        if (currentGallery.length === 0) return;
        currentMediaIndex = 0;
        galleryModal.classList.remove('hidden');
        galleryModal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        setTimeout(() => { galleryModal.classList.add('gallery-active'); showMedia(0); }, 10);
    };

    window.closeGallery = () => {
        if (window.galleryTimeout) clearTimeout(window.galleryTimeout);
        galleryModal.classList.remove('gallery-active');
        document.body.style.overflow = '';
        setTimeout(() => { galleryModal.classList.add('hidden'); galleryModal.classList.remove('flex'); galleryContent.innerHTML = ''; }, 300);
    };

    function showMedia(idx) {
        if (idx < 0) idx = currentGallery.length - 1;
        if (idx >= currentGallery.length) idx = 0;
        currentMediaIndex = idx;

        if (window.galleryTimeout) clearTimeout(window.galleryTimeout);
        galleryContent.classList.remove('gallery-content-show');

        window.galleryTimeout = setTimeout(() => {
            const it = currentGallery[idx];
            // Add a transparent overlay to catch swipes on videos
            const overlay = `<div class="absolute inset-0 z-10 pointer-events-auto sm:pointer-events-none"></div>`;
            const content = it.type === 'video'
                ? `<iframe src="${it.url}" class="w-full h-full rounded" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                : `<img src="${it.url}" class="max-h-[80vh] object-contain shadow-2xl" />`;

            galleryContent.innerHTML = `<div class="relative w-full h-full flex items-center justify-center">${content}${overlay}</div>`;
            galleryContent.classList.add('gallery-content-show');

            if (galleryCounter) galleryCounter.textContent = `${idx + 1}/${currentGallery.length}`;
            if (galleryDots) galleryDots.innerHTML = currentGallery.map((_, i) => `<div class="h-1 transition-all ${i === idx ? 'w-6 bg-primary' : 'w-2 bg-white/30'} rounded-full"></div>`).join('');
        }, 300);
    }
    if (galleryModal) {
        document.getElementById('close-gallery-btn').onclick = closeGallery;
        document.getElementById('prev-gallery-btn').onclick = () => showMedia(currentMediaIndex - 1);
        document.getElementById('next-gallery-btn').onclick = () => showMedia(currentMediaIndex + 1);

        // Mobile Swipe Support
        let touchStartX = 0;
        let touchEndX = 0;

        galleryModal.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        galleryModal.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) { // Threshold for swipe
                if (diff > 0) showMedia(currentMediaIndex + 1); // Swipe Left -> Next
                else showMedia(currentMediaIndex - 1); // Swipe Right -> Prev
            }
        }, { passive: true });
    }

    setTimeout(loadReviews, 300);
});

function renderRooms(list, schedule, pricing, dates) {
    const container = document.getElementById('rooms-container');
    if (!container || !dates.length) return;
    uiLog("Rendering rooms...");

    list.forEach(room => {
        try {
            let available = true;
            for (const d of dates) { if (schedule[room.id]?.[getStr(d)] === 'Booked') { available = false; break; } }
            if (available && dates.length === 1) {
                const lead = Math.ceil((dates[0] - new Date().setHours(0, 0, 0, 0)) / 86400000);
                const policy = dynamicPolicyData.find(p => Number(p.Month_ID) === (dates[0].getMonth() + 1))?.Min_Days_Lead || 7;
                const pD = new Date(dates[0]); pD.setDate(pD.getDate() - 1);
                const nD = new Date(dates[0]); nD.setDate(nD.getDate() + 1);
                if (lead > policy && !(schedule[room.id]?.[getStr(pD)] === 'Booked' && schedule[room.id]?.[getStr(nD)] === 'Booked')) available = false;
            }
            if (!available) return;

            const p = pricing[getStr(dates[0]).substring(0, 7)]?.[room.id] || { weekday: 800000, weekend: 1000000 };
            const isW = [5, 6, 0].includes(dates[0].getDay());
            const finalP = isW ? p.weekend : p.weekday;

            const card = document.createElement('div');
            card.className = "scroll-animate-card p-0.5";
            card.innerHTML = `
                <div class="rococo-border bg-background-light shadow-sm hover:shadow-xl transition-all duration-500 group h-full flex flex-col relative overflow-hidden">
                    <!-- Acanthus Leaf Corners -->
                    <div class="acanthus-corner top-0 left-0">
                        <svg fill="currentColor" viewbox="0 0 100 100"><path d="M10,10 Q40,10 40,40 Q10,40 10,10 M0,0 L20,0 Q20,20 0,20 Z"></path></svg>
                    </div>
                    <div class="acanthus-corner top-0 right-0 rotate-90">
                        <svg fill="currentColor" viewbox="0 0 100 100"><path d="M10,10 Q40,10 40,40 Q10,40 10,10 M0,0 L20,0 Q20,20 0,20 Z"></path></svg>
                    </div>
                    <div class="acanthus-corner bottom-0 left-0 -rotate-90">
                        <svg fill="currentColor" viewbox="0 0 100 100"><path d="M10,10 Q40,10 40,40 Q10,40 10,10 M0,0 L20,0 Q20,20 0,20 Z"></path></svg>
                    </div>
                    <div class="acanthus-corner bottom-0 right-0 rotate-180">
                        <svg fill="currentColor" viewbox="0 0 100 100"><path d="M10,10 Q40,10 40,40 Q10,40 10,10 M0,0 L20,0 Q20,20 0,20 Z"></path></svg>
                    </div>

                    <div class="relative h-64 sm:h-72 overflow-hidden cursor-pointer" onclick="openGallery('${room.id}')">
                        <img id="img-${room.id}" src="${room.img}" alt="${room.name}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110">
                    </div>
                    
                    <div class="px-6 py-3 flex flex-col flex-grow relative z-10">
                        <h3 class="text-2xl font-display font-bold text-graphite mb-0">${room.name}</h3>
                        
                        <!-- Area Component -->
                        <div class="flex items-center gap-2 mb-2">
                             <span class="material-symbols-outlined text-primary text-[18px]">straighten</span>
                             <span class="text-slate-500 font-display text-base px-px pb-0.5">${room.area}</span>
                        </div>

                        <!-- Amenities (Wrapped Flex) -->
                        <ul class="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 flex-grow">
                            ${room.amenities.map(a => `
                                <li class="flex items-center gap-1.5 text-slate-500 text-[13px]">
                                    <span class="material-symbols-outlined text-primary text-[16px]">done</span>
                                    ${a}
                                </li>
                            `).join('')}
                        </ul>

                        <!-- Pricing Section (Exact Image Match) -->
                        <div class="border-t border-primary/10 pt-2.5 mt-auto">
                            <p class="text-[11px] font-display font-bold text-slate-400 tracking-wider mb-2">GIÁ NIÊM YẾT</p>
                            
                            <div class="flex justify-between items-center">
                                <div class="space-y-1">
                                    <div class="flex items-center gap-1.5 min-h-[1.5rem]">
                                        <span class="text-graphite font-bold text-xl leading-none">${renderCurrency(p.weekday)}</span>
                                        <span class="text-[11px] text-[#788896] font-display">/ Đêm Trong Tuần (T2 Đến T5)</span>
                                    </div>
                                    <div class="flex items-center gap-1.5 min-h-[1.5rem]">
                                        <span class="text-graphite font-bold text-xl leading-none">${renderCurrency(p.weekend)}</span>
                                        <span class="text-[11px] text-[#788896] font-display">/ Đêm Cuối Tuần (T6 Đến CN)</span>
                                    </div>
                                </div>
                                
                                <button data-room-id="${room.id}" 
                                    onclick="selectRoom(this, {id:'${room.id}',name:'${room.name}',price:${finalP},img:'${room.img}'})" 
                                    class="bg-[#C8A96A] text-white font-display italic font-bold text-lg px-4 py-3 rounded-[18px] shadow-sm hover:brightness-110 transition-all duration-300 active:scale-95 leading-tight flex flex-col items-center justify-center min-w-[100px]">
                                    <span>Thêm</span>
                                    <span>Phòng</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        } catch (e) { console.error(e); }
    });

    if (!container.children.length) {
        container.innerHTML = `<div class="text-center py-20 px-4"><p class="text-2xl font-display text-primary">Ngày mà bạn chọn đã hết phòng, xin hãy đổi ngày khác.</p></div>`;
    } else {
        document.getElementById('available-rooms-message')?.classList.remove('hidden');
    }
}

function renderWaitlist() {
    const container = document.getElementById('waitlist-items'), footer = document.getElementById('waitlist-footer');
    if (!container || !footer) return;
    document.querySelectorAll('button[data-room-id]').forEach(btn => {
        if (selectedRooms.some(r => r.id === btn.getAttribute('data-room-id'))) {
            btn.innerHTML = '<span>Đã</span><span>chọn</span>';
            btn.classList.add('bg-[#C8A96A]', 'text-graphite', 'pointer-events-none');
        } else {
            btn.innerHTML = '<span>Chọn</span><span>Phòng</span>';
            btn.classList.remove('bg-[#C8A96A]', 'text-graphite', 'pointer-events-none');
            btn.classList.add('bg-primary', 'text-white');
        }
    });
    if (!selectedRooms.length) { footer.classList.add('translate-y-full'); return; }
    footer.classList.remove('translate-y-full');
    container.innerHTML = selectedRooms.map((r, i) => `<div class="relative shrink-0"><div class="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary bg-white"><img src="${r.img}" class="w-full h-full object-cover"></div><button onclick="removeFromWaitlist(${i})" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full size-5 flex items-center justify-center shadow-md z-10"><span class="material-symbols-outlined text-[12px] font-bold">close</span></button></div>`).join('');
}
window.selectRoom = (btn, data) => { if (!selectedRooms.find(r => r.id === data.id)) { selectedRooms.push(data); renderWaitlist(); animateFly(document.getElementById(`img-${data.id}`), document.querySelector('.w-12'), data.img); } };
window.removeFromWaitlist = (i) => { selectedRooms.splice(i, 1); renderWaitlist(); };

function animateFly(s, e, src) {
    if (!s || !e) return;
    const sR = s.getBoundingClientRect(), eR = e.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = "fixed z-[1000] pointer-events-none transition-all duration-700 ease-in-out";
    f.style.left = sR.left + 'px'; f.style.top = sR.top + 'px'; f.style.width = sR.width + 'px'; f.style.height = sR.height + 'px';
    f.innerHTML = `<img src="${src}" class="w-full h-full object-cover rounded-lg border-2 border-primary shadow-2xl">`;
    document.body.appendChild(f);
    requestAnimationFrame(() => { f.style.left = eR.left + 'px'; f.style.top = eR.top + 'px'; f.style.width = '48px'; f.style.height = '48px'; f.style.opacity = '0.5'; });
    setTimeout(() => f.remove(), 750);
}

async function loadReviews() {
    try {
        const r = await fetch("https://script.google.com/macros/s/AKfycbyKwYdqY1Xd762VehUWY8wCKCdek6rc0lASlrUfZVh33B4X_ozjWSxqDUt3PIz27cg/exec");
        const d = await r.json();
        renderReviews(d.error ? [{ name: "Khách", content: "Tuyệt vời!" }] : d);
    } catch (e) { renderReviews([{ name: "Khách", content: "Tuyệt vời!" }]); }
}
function renderReviews(list) {
    const s = document.getElementById('reviews-slider');
    if (!s) return;
    s.innerHTML = list.map(r => `<div class="snap-start shrink-0 w-[85vw] sm:w-[350px] bg-white rounded-2xl p-5 shadow-sm border border-primary/20"><h4 class="font-bold text-graphite">${r.name || "Khách"}</h4><p class="text-slate-600 italic text-sm mt-2">"${r.content}"</p></div>`).join('');
}
