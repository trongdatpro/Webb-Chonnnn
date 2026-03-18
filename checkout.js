document.addEventListener('DOMContentLoaded', () => {
    // DIAGNOSTIC VERSION: v2.3-visibility-fix
    console.log(">>> [DIAG] Checkout v2.3 started");
    
    // Server Diagnostics Check (Relative Path)
    fetch('/diagnostics').then(r => r.json()).then(d => {
        console.log(">>> [DIAG] Server Status:", d);
        if (d.keys && (!d.keys.clientId || !d.keys.apiKey || !d.keys.checksumKey)) {
            alert("⚠️ CẢNH BÁO: PayOS chưa được cấu hình trên Render (Environment Variables). Thanh toán sẽ không hoạt động!");
        }
    }).catch(e => console.warn(">>> [DIAG] Diag failed:", e));

    const renderCurrency = (num) => new Intl.NumberFormat('vi-VN').format(num) + 'đ';
    const setSafeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // 1. Retrieve State
    const urlParams = new URLSearchParams(window.location.search);
    const isPaidOnLoad = (urlParams.get('status') || '').toUpperCase() === 'PAID';
    const bookingData = JSON.parse(sessionStorage.getItem('chonVillageBooking') || '{}');
    const roomsDataRaw = JSON.parse(sessionStorage.getItem('chonVillageSelectedRooms') || sessionStorage.getItem('chonVillageSelectedRoom') || '[]');
    const roomsData = Array.isArray(roomsDataRaw) ? roomsDataRaw : [roomsDataRaw];
    const adultsCount = parseInt(bookingData.adults) || 2;

    if (!isPaidOnLoad && (!bookingData.checkin || roomsData.length === 0)) {
        console.warn(">>> [DIAG] No data, redirecting...");
        window.location.href = 'index.html';
        return;
    }

    // 2. Calculations
    const parseLocal = (s) => { if(!s) return new Date(); const [y,m,d]=s.split('-'); return new Date(y,m-1,d); };
    const checkinDate = parseLocal(bookingData.checkin);
    const checkoutDate = parseLocal(bookingData.checkout);
    const nights = Math.max(1, Math.ceil(Math.abs(checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)));
    const formatDateObj = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    let baseRoomTotal = 0;
    const surchargeRates = [];
    roomsData.forEach(r => {
        baseRoomTotal += (parseInt(r.baseRoomTotal) || 0);
        surchargeRates.push(parseInt(r.surcharge) || 450000);
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

    const totalSurcharge = totalSurchargePerNight * nights;
    const grandTotalAmount = baseRoomTotal + totalSurcharge;
    const depositAmount = Math.floor(grandTotalAmount / 2);

    // 3. UI Helpers
    const triggerSuccessUI = () => {
        document.querySelectorAll('.molding-border > div, .mb-8, #summary-section, #payment-section, #confirm-btn').forEach(el => {
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

    // 4. Initialization
    if (isPaidOnLoad) {
        triggerSuccessUI();
    } else {
        const list = document.getElementById('checkout-rooms-list');
        if (list) {
            list.innerHTML = roomsData.map(room => {
                const roomPrice = (parseInt(room.baseRoomTotal) || 0) + (totalSurcharge / roomsData.length);
                return `
                <div class="border border-primary/40 p-6 rounded-xl bg-background-light/80 shadow-md text-black mb-4">
                    <div class="w-full h-56 bg-center bg-cover rounded-lg mb-6 border-2 border-primary/20" style="background-image: url('${room.img}');"></div>
                    <h3 class="text-2xl font-serif font-bold mb-4 border-b-2 border-primary/30 pb-3">${room.name}</h3>
                    <div class="space-y-4">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium italic">Thời gian:</span>
                            <span class="text-sm font-bold">${formatDateObj(checkinDate)} - ${formatDateObj(checkoutDate)} (${nights} đêm)</span>
                        </div>
                        <div class="flex justify-between items-center pt-2 text-primary font-bold">
                            <span>Giá phòng:</span><span>${renderCurrency(roomPrice)}</span>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
        setSafeText('checkout-total', renderCurrency(grandTotalAmount));
        setSafeText('checkout-deposit', renderCurrency(depositAmount));

        // Fetch Payment Link (Relative)
        const fetchPayment = () => {
            const qrImg = document.getElementById('checkout-qr');
            const qrLoading = document.getElementById('qr-loading');
            const qrMsg = document.getElementById('qr-status-msg');
            const retryBtn = document.getElementById('qr-retry-btn');
            const phone = (bookingData.phone || '000').replace(/\s+/g, '');

            if (qrLoading) qrLoading.classList.remove('hidden');
            if (qrMsg) qrMsg.innerHTML = 'Đang khởi tạo thanh toán...<br/><span class="font-normal italic">(Render có thể mất 30s để khởi động lần đầu)</span>';
            if (retryBtn) retryBtn.classList.add('hidden');

            fetch('/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: depositAmount, description: `COC CHON ${phone}` })
            })
            .then(res => { if(!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
            .then(data => {
                if (data.status === 'ERROR') throw new Error(data.error);
                if (data.qrCode) {
                    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrCode)}`;
                    if (qrLoading) qrLoading.classList.add('hidden');
                    
                    const poll = setInterval(async () => {
                        try {
                            const ck = await fetch(`/check-payment/${data.orderCode}`);
                            const cd = await ck.json();
                            if (cd.status === 'PAID') { clearInterval(poll); triggerSuccessUI(); }
                        } catch (e) {}
                    }, 3000);
                } else { throw new Error("Server response missing QR"); }
            })
            .catch(err => {
                if (qrMsg) qrMsg.innerHTML = `<span class="text-red-500 font-bold">LỖI: ${err.message}</span><br/>Vui lòng nhấn Thử lại.`;
                if (retryBtn) { retryBtn.classList.remove('hidden'); retryBtn.onclick = fetchPayment; }
            });
        };

        const agreeBox = document.getElementById('agree-checkbox');
        if (agreeBox) {
            agreeBox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const sections = [document.getElementById('summary-section'), document.getElementById('payment-section')];
                sections.forEach(s => {
                    if (s) {
                        s.classList.toggle('hidden', !isChecked);
                        setTimeout(() => s.classList.toggle('opacity-0', !isChecked), 10);
                    }
                });
                if (isChecked && !document.getElementById('checkout-qr').src) fetchPayment();
            });
        }
    }

    // Bill & Copy
    document.getElementById('generate-bill-btn')?.addEventListener('click', () => {
        const name = document.getElementById('success-guest-name')?.value.trim();
        const zalo = document.getElementById('success-guest-zalo')?.value.trim();
        if (!name || !zalo) { alert("Vui lòng điền đủ thông tin."); return; }
        
        const roomNames = roomsData.map(r => r.name).join(', ');
        const bill = `
            <div class="space-y-6 text-black" style="font-family: sans-serif;">
                <div class="text-center font-bold text-xl mb-4">𝐗𝐀́𝐂 𝐍𝐇𝐀̣̂𝐍 𝐓𝐇𝐎̂𝐍𝐆 𝐓𝐈𝐍 𝐓𝐇𝐔𝐄̂ 𝐇𝐎𝐌𝐄</div>
                <div><b>Địa chỉ:</b> 07 Thánh Tâm, P5, Đà Lạt</div>
                <div><b>Số người:</b> ${(parseInt(bookingData.adults)||2)+(parseInt(bookingData.children)||0)} khách</div>
                <div><b>Phòng:</b> ${roomNames}</div>
                <div><b>Thời gian:</b> ${formatDateObj(checkinDate)} - ${formatDateObj(checkoutDate)} (${nights} đêm)</div>
                <div>
                    <div><b>Tổng tiền:</b> ${renderCurrency(grandTotalAmount)}</div>
                    <div><b>Đã cọc:</b> ${renderCurrency(depositAmount)}</div>
                    <div style="color:red; font-weight:bold;">Còn lại: ${renderCurrency(grandTotalAmount-depositAmount)}</div>
                </div>
            </div>`;
        const content = document.getElementById('bill-content');
        if (content) content.innerHTML = bill;
        const container = document.getElementById('final-bill-container');
        if (container) {
            container.classList.remove('hidden');
            setTimeout(() => container.classList.remove('opacity-0'), 100);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });

    document.getElementById('copy-bill-btn')?.addEventListener('click', (e) => {
        const t = document.getElementById('bill-content')?.innerText;
        if (t) navigator.clipboard.writeText(t).then(() => {
            const b = e.currentTarget; const old = b.innerHTML; b.innerHTML = "Đã chép!";
            setTimeout(() => b.innerHTML = old, 2000);
        });
    });
});
