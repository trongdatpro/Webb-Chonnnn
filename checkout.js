document.addEventListener('DOMContentLoaded', () => {
    // 0. Configuration
    const API_BASE = window.location.origin; // Use the same host the site is on
    console.log(">>> [DIAG] API_BASE:", API_BASE);

    // 1. Helper Functions
    const renderCurrency = (num) => new Intl.NumberFormat('vi-VN').format(num) + 'đ';
    const setSafeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    console.log(">>> [DIAG] Checkout Script Started");

    // 2. Retrieve URL Params First
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');
    const isPaidOnLoad = paymentStatus && paymentStatus.toUpperCase() === 'PAID';
    console.log(">>> [DIAG] isPaidOnLoad:", isPaidOnLoad);
    
    // 3. Retrieve Data From Session
    const bookingDataStr = sessionStorage.getItem('chonVillageBooking');
    const selectedRoomsStr = sessionStorage.getItem('chonVillageSelectedRooms');
    const selectedRoomStr = sessionStorage.getItem('chonVillageSelectedRoom'); 

    if (!isPaidOnLoad && (!bookingDataStr || (!selectedRoomsStr && !selectedRoomStr))) {
        console.warn(">>> [DIAG] No booking data found. Redirecting to home...");
        window.location.href = 'index.html';
        return;
    }

    const bookingData = JSON.parse(bookingDataStr || '{}');
    const roomsData = selectedRoomsStr ? JSON.parse(selectedRoomsStr) : [JSON.parse(selectedRoomStr || '{}')];
    const adultsCount = parseInt(bookingData.adults) || 2;

    // 4. Shared Calculations
    const parseLocal = (dateStr) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d);
    };

    const checkinDate = parseLocal(bookingData.checkin);
    const checkoutDate = parseLocal(bookingData.checkout);
    const nights = Math.ceil(Math.abs(checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)) || 1;
    const formatDateObj = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    let baseRoomTotal = 0;
    const surchargeRates = [];
    roomsData.forEach(room => {
        baseRoomTotal += (parseInt(room.baseRoomTotal) || 0);
        surchargeRates.push(parseInt(room.surcharge) || 450000);
    });

    const extraGuestsCount = Math.max(0, adultsCount - (roomsData.length * 2));
    const sortedRates = [...surchargeRates].sort((a, b) => a - b);
    let totalSurchargePerNight = 0;
    if (roomsData.length === 3) {
        if (extraGuestsCount === 1) totalSurchargePerNight = (new Set(sortedRates).size === 3) ? sortedRates[1] : sortedRates[0];
        else if (extraGuestsCount === 2) totalSurchargePerNight = sortedRates[0] + sortedRates[1];
        else for (let i = 0; i < extraGuestsCount; i++) totalSurchargePerNight += sortedRates[i] || sortedRates[0];
    } else {
        for (let i = 0; i < extraGuestsCount; i++) totalSurchargePerNight += sortedRates[i] || sortedRates[0];
    }

    const grandTotalAmount = baseRoomTotal + (totalSurchargePerNight * nights);
    const depositAmount = Math.floor(grandTotalAmount / 2);

    const roomsWithTotals = roomsData.map(room => ({
        ...room,
        total: (parseInt(room.baseRoomTotal) || 0) + ((totalSurchargePerNight * nights) / roomsData.length)
    }));

    // 5. SUCCESS UI TRIGGER FUNCTION
    const triggerSuccessUI = () => {
        console.log(">>> [DIAG] TRIGGERING SUCCESS UI");
        document.querySelectorAll('.molding-border > div, .mb-8, #summary-section, #payment-section, #confirm-btn, .mt-4.text-\\[10px\\]').forEach(el => {
            if (el && !el.id?.includes('success')) el.classList.add('hidden');
        });

        const successSection = document.getElementById('payment-success-section');
        if (successSection) {
            successSection.classList.remove('hidden');
            setTimeout(() => {
                successSection.classList.remove('opacity-0');
                successSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    // 6. Handle Initial State
    if (isPaidOnLoad) {
        triggerSuccessUI();
    } else {
        // Render Normal Checkout List
        const roomsListContainer = document.getElementById('checkout-rooms-list');
        if (roomsListContainer) {
            roomsListContainer.innerHTML = roomsWithTotals.map(room => `
                <div class="border border-primary/40 p-6 rounded-xl bg-background-light/80 shadow-md relative overflow-hidden text-black">
                    <div class="w-full h-56 bg-center bg-cover rounded-lg mb-6 border-2 border-primary/20" style="background-image: url('${room.img}');"></div>
                    <h3 class="text-2xl font-serif font-bold mb-4 border-b-2 border-primary/30 pb-3">${room.name}</h3>
                    <div class="space-y-4">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium italic">Thời gian:</span>
                            <span class="text-sm font-bold leading-tight">Ngày Nhận ${formatDateObj(checkinDate)} - Ngày Trả ${formatDateObj(checkoutDate)} - ${nights} đêm</span>
                        </div>
                        <div class="flex justify-between items-center pt-2 text-primary font-bold">
                            <span>Tổng phòng:</span><span>${renderCurrency(room.total)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        setSafeText('checkout-total', renderCurrency(grandTotalAmount));
        setSafeText('checkout-deposit', renderCurrency(depositAmount));

        // Create Payment Link & Start Polling
        const qrImg = document.getElementById('checkout-qr');
        const qrLoading = document.getElementById('qr-loading');
        const phone = (bookingData.phone || '000').replace(/\s+/g, '');

        console.log(">>> [DIAG] Fetching payment link...");
        fetch(`${API_BASE}/create-payment-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: depositAmount, description: `COC CHON ${phone}` })
        })
        .then(res => res.json())
        .then(data => {
            console.log(">>> [DIAG] Payment Data Received:", data);
            if (data.qrCode) {
                if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrCode)}`;
                if (qrLoading) qrLoading.classList.add('hidden');
                
                console.log(">>> [DIAG] Starting Polling for Order:", data.orderCode);
                const pollInterval = setInterval(async () => {
                    try {
                        const checkRes = await fetch(`${API_BASE}/check-payment/${data.orderCode}`);
                        const checkData = await checkRes.json();
                        console.log(`>>> [POLL] Status for ${data.orderCode}:`, checkData.status);
                        
                        if (checkData.status === 'PAID') {
                            console.log(">>> [DIAG] STATUS PAID DETECTED!");
                            clearInterval(pollInterval);
                            triggerSuccessUI();
                        }
                    } catch (e) { console.error(">>> [DIAG] Polling error:", e); }
                }, 3000);
            } else {
                console.error(">>> [DIAG] No QR code in response:", data);
            }
        }).catch(err => {
            console.error(">>> [DIAG] Fetch payment link error:", err);
            if (qrLoading) qrLoading.classList.add('hidden'); 
        });

        // Agreement Logic
        const agreeCheckbox = document.getElementById('agree-checkbox');
        const summarySection = document.getElementById('summary-section');
        const paymentSection = document.getElementById('payment-section');
        const confirmBtn = document.getElementById('confirm-btn');

        if (agreeCheckbox) {
            agreeCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                [summarySection, paymentSection].forEach(s => {
                    if (s) {
                        s.classList.toggle('hidden', !isChecked);
                        setTimeout(() => s.classList.toggle('opacity-0', !isChecked), 10);
                    }
                });
                if (confirmBtn) {
                    confirmBtn.disabled = !isChecked;
                    confirmBtn.classList.toggle('opacity-50', !isChecked);
                    confirmBtn.classList.toggle('cursor-not-allowed', !isChecked);
                    confirmBtn.classList.toggle('pointer-events-none', !isChecked);
                }
            });
        }
    }

    // 7. Bill Generation & UI Logic
    const generateBtn = document.getElementById('generate-bill-btn');
    if (generateBtn) {
        generateBtn.onclick = () => {
            const name = document.getElementById('success-guest-name')?.value.trim();
            const zalo = document.getElementById('success-guest-zalo')?.value.trim();
            if (!name || !zalo) { alert("Vui lòng điền đầy đủ Họ tên và Zalo."); return; }

            const roomNames = roomsWithTotals.map(r => r.name).join(', ');
            const people = (parseInt(bookingData.adults) || 2) + (parseInt(bookingData.children) || 0);
            const remaining = grandTotalAmount - depositAmount;

            const billHtml = `
                <div class="space-y-6 text-black" style="font-family: sans-serif; line-height: 1.6;">
                    <div class="text-center font-bold text-xl mb-4">𝐗𝐀́𝐂 𝐍𝐇𝐀̣̂𝐍 𝐓𝐇𝐎̂𝐍𝐆 𝐓𝐈𝐍 𝐓𝐇𝐔𝐄̂ 𝐇𝐎𝐌𝐄</div>
                    <div>
                        <div class="font-bold underline mb-1">➖𝐓𝐇𝐎̂𝐍𝐆 𝐓𝐈𝐍</div>
                        <div>- Địa chỉ: 07 Thánh Tâm - Phường 5, TP. Đà Lạt</div>
                        <div class="text-blue-600 text-xs">https://maps.app.goo.gl/aW824oYN5dznY7JX9</div>
                        <div>- Liên hệ nhận phòng: 0889717713 (Mr. Trọng Đạt)</div>
                        <div>- Hình thức thuê: <span class="font-bold">${roomNames}</span></div>
                    </div>
                    <div>
                        <div class="font-bold underline mb-1">➖𝐓𝐇𝐎̂𝐍𝐆 𝐓𝐈𝐍 𝐊𝐇𝐀́𝐂𝐇</div>
                        <div>- Tên khách hàng: <span class="font-bold uppercase">${name}</span></div>
                        <div>- Số điện thoại: <span class="font-bold">${zalo}</span></div>
                        <div>- Số người: ${people} khách</div>
                        <div>- Số ngày thuê: ${nights} đêm</div>
                        <div>* Ngày nhận nhà: 14h00 ngày ${formatDateObj(checkinDate)}</div>
                        <div>* Ngày trả nhà: 12h00 ngày ${formatDateObj(checkoutDate)}</div>
                    </div>
                    <div>
                        <div class="font-bold underline mb-1">✅ 𝐓𝐇𝐀𝐍𝐇 𝐓𝐎𝐀́𝐍</div>
                        <div>- Thuê nhà: ${renderCurrency(grandTotalAmount)}</div>
                        <div>- Đã cọc: ${renderCurrency(depositAmount)} ( Xác nhận đã nhận )</div>
                        <div>- Còn lại: <span class="text-red-600 font-bold">${renderCurrency(remaining)}</span></div>
                        <div class="mt-2 text-sm italic">Vui lòng thanh toán phần còn lại khi nhận nhà.</div>
                    </div>
                    <div class="pt-4 border-t border-dashed border-gray-400">
                        <div class="font-bold underline mb-1">➖ 𝐆𝐇𝐈 𝐂𝐇𝐔́</div>
                        <div class="text-xs text-gray-600 italic">
                            - Không hoàn, hủy, đổi dưới mọi hình thức.<br/>- Vui lòng mang theo CMND/Passport để đăng ký.<br/>- Vui lòng đi đúng số lượng người đã đăng ký.
                        </div>
                    </div>
                </div>`;

            const content = document.getElementById('bill-content');
            if (content) content.innerHTML = billHtml;

            const container = document.getElementById('final-bill-container');
            if (container) {
                container.classList.remove('hidden');
                setTimeout(() => {
                    container.classList.remove('opacity-0');
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        };
    }

    const copyBtn = document.getElementById('copy-bill-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const content = document.getElementById('bill-content');
            if (content) {
                navigator.clipboard.writeText(content.innerText).then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<span class="material-symbols-outlined">done</span> Đã sao chép!';
                    setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
                });
            }
        };
    }
});
